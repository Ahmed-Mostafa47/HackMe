/**
 * Returns real NIC MAC and primary IPv4 for this machine. Browsers cannot read MAC;
 * this service must run locally: npm run identity-server
 * Listens only on 127.0.0.1:47820 (or HACKME_IDENTITY_PORT).
 */
import http from "http";
import os from "os";

const PORT = Number.parseInt(String(process.env.HACKME_IDENTITY_PORT || "47820"), 10);

function pickIdentity() {
  const ifaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name]) {
      if (info.internal) continue;
      if (info.family !== "IPv4" && info.family !== 4) continue;
      const mac = (info.mac || "").toLowerCase();
      if (mac && mac !== "00:00:00:00:00:00") {
        candidates.push({ mac, local_ipv4: info.address, name });
      }
    }
  }
  if (candidates.length) {
    return candidates[0];
  }
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name]) {
      if (info.internal) continue;
      if (info.family === "IPv4" || info.family === 4) {
        if (info.address) {
          return { mac: (info.mac || "").toLowerCase() || "", local_ipv4: info.address, name };
        }
      }
    }
  }
  return { mac: "", local_ipv4: "" };
}

const server = http.createServer((req, res) => {
  const h = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(200, h);
    res.end();
    return;
  }
  if (req.method !== "GET" || (req.url !== "/" && !req.url.startsWith("/?"))) {
    res.writeHead(404, h);
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  const { mac, local_ipv4 } = pickIdentity();
  if (!mac || !local_ipv4) {
    res.writeHead(503, h);
    res.end(JSON.stringify({ error: "no_network_interface", message: "Could not read MAC/IPv4 on this system." }));
    return;
  }
  res.writeHead(200, h);
  res.end(JSON.stringify({ mac, local_ipv4 }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[HackMe] Identity server: http://127.0.0.1:${PORT}/  (mac + local IPv4)`);
});
