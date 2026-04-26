const DEFAULT_IDENTITY = "http://127.0.0.1:47820";

/**
 * Fetches real MAC + LAN IPv4 from the local Node identity server.
 * @returns {{ mac: string, local_ipv4: string }}
 */
export async function fetchHackMeMachineIdentity() {
  const base = import.meta.env.VITE_HACKME_IDENTITY_URL || DEFAULT_IDENTITY;
  const url = base.replace(/\/$/, "") + "/";
  const r = await fetch(url, { method: "GET" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) {
    throw new Error(
      d.message ||
        "Identity service unavailable. In the HackMe project folder run: npm run identity-server (keep the window open)."
    );
  }
  if (!d.mac || !d.local_ipv4) {
    throw new Error("Invalid machine identity. Run npm run identity-server and try Start Lab again.");
  }
  return { mac: String(d.mac), local_ipv4: String(d.local_ipv4) };
}
