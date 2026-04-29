import React, { useEffect, useMemo, useState } from "react";
import { Activity, Search, Filter } from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost/HackMe/server/api";

const AuditLogsPage = ({ currentUser }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API_BASE}/audit_logs.php`, {
        params: {
          current_user_id: currentUser?.user_id ?? currentUser?.id,
          action: actionFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
          limit: 200,
        },
      });
      if (data?.success) {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      } else {
        setError(data?.message || "Failed to load logs.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, statusFilter]);

  const displayedLogs = useMemo(() => logs, [logs]);
  const parseDetails = (raw) => {
    if (!raw || typeof raw !== "string") return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };
  const formatEventTime = (log) => {
    const parsed = parseDetails(log?.details);
    const clientTimeUtc = typeof parsed?.client_time_utc === "string" ? parsed.client_time_utc : "";
    const clientTz = typeof parsed?.client_timezone === "string" ? parsed.client_timezone : "";
    if (clientTimeUtc) {
      try {
        const d = new Date(clientTimeUtc);
        if (!Number.isNaN(d.getTime())) {
          if (clientTz) {
            return (
              new Intl.DateTimeFormat("en-GB", {
                timeZone: clientTz,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }).format(d) + ` (${clientTz})`
            );
          }
          return d.toLocaleString();
        }
      } catch {}
    }
    if (!log?.created_at) return "-";
    return new Date(String(log.created_at).replace(" ", "T")).toLocaleString();
  };
  const formatDetails = (log) => {
    const raw = log?.details;
    if (!raw) return "-";
    if (typeof raw !== "string") return String(raw);
    const parsed = parseDetails(raw);
    if (parsed) {
      const parts = [];
      if (typeof parsed.message === "string" && parsed.message.trim() !== "") {
        parts.push(parsed.message.trim());
      }
      const labId = parsed.lab_id ?? parsed.labId;
      const labTitle = parsed.lab_title ?? parsed.lab_name ?? parsed.labTitle;
      if (labId !== undefined && labId !== null && String(labId).trim() !== "") {
        parts.push(`lab_id=${labId}`);
      }
      if (typeof labTitle === "string" && labTitle.trim() !== "") {
        parts.push(`lab_name=${labTitle.trim()}`);
      }
      if (log?.action === "permissions_change") {
        const byName = parsed.changed_by_username || log?.actor_username || "";
        const byId = parsed.changed_by_user_id ?? log?.actor_user_id ?? "";
        const targetName = parsed.target_username || log?.target_username || "";
        const targetId = parsed.target_user_id ?? log?.target_user_id ?? "";
        if (byName || byId !== "") {
          parts.push(`changed_by=${byName || "-"}#${byId !== "" ? byId : "-"}`);
        }
        if (targetName || targetId !== "") {
          parts.push(`changed_for=${targetName || "-"}#${targetId !== "" ? targetId : "-"}`);
        }
      }
      if (parts.length > 0) {
        return parts.join(" | ");
      }
      return JSON.stringify(parsed);
    }
    return raw;
  };
  const actorNameCell = (log) => {
    const n = (log?.actor_username || "").trim();
    return n || "-";
  };
  const actorEmailCell = (log) => {
    const e = (log?.actor_email || "").trim();
    return e || "-";
  };
  const actorIdCell = (log) => {
    const id = log?.actor_user_id;
    if (id === null || id === undefined || id === "") return "-";
    return String(id);
  };
  const actorRolesCell = (log) => {
    const r = (log?.actor_roles || "").trim();
    return r || "-";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 pt-24 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white font-mono mt-1">AUDIT_LOGS</h1>
        </div>

        <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 mb-5">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user/details..."
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white outline-none focus:border-green-500"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white"
            >
              <option value="">All actions</option>
              <option value="login">login</option>
              <option value="logout">logout</option>
              <option value="password_change">password_change</option>
              <option value="permissions_change">permissions_change</option>
              <option value="user_delete">user_delete</option>
              <option value="lab_start">lab_start</option>
              <option value="lab_solved">lab_solved</option>
              <option value="lab_add">lab_add</option>
              <option value="lab_edit">lab_edit</option>
              <option value="lab_delete">lab_delete</option>
            </select>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white"
              >
                <option value="">All status</option>
                <option value="success">success</option>
                <option value="failed">failed</option>
              </select>
              <button
                onClick={loadLogs}
                className="px-4 py-2 rounded-lg border border-blue-500/60 text-blue-200 hover:bg-blue-500/10"
                title="Refresh"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 overflow-x-auto">
          {error && <p className="text-rose-300 text-sm font-mono mb-3">{error}</p>}
          {loading ? (
            <p className="text-gray-400 font-mono text-sm">LOADING_LOGS...</p>
          ) : displayedLogs.length === 0 ? (
            <p className="text-gray-500 font-mono text-sm">NO_LOGS_FOUND</p>
          ) : (
            <table className="table-fixed w-full min-w-[1200px] text-sm">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[6%]" />
                <col className="w-[9%]" />
                <col className="w-[12%]" />
                <col className="w-[5%]" />
                <col className="w-[11%]" />
                <col className="w-[18%]" />
                <col className="w-[108px]" />
                <col className="min-w-[140px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-gray-400 font-mono border-b border-gray-700">
                  <th className="py-2 pr-2">TIME</th>
                  <th className="py-2 pr-2">ACTION</th>
                  <th className="py-2 pr-2">STATUS</th>
                  <th className="py-2 pr-2">ACTOR_NAME</th>
                  <th className="py-2 pr-2">ACTOR_EMAIL</th>
                  <th className="py-2 pr-2 whitespace-nowrap">ACTOR_ID</th>
                  <th className="py-2 pr-2">ACTOR_ROLES</th>
                  <th className="py-2 pr-2">DETAILS</th>
                  <th className="py-2 pr-2 whitespace-nowrap">IP</th>
                  <th className="py-2 pr-1">USER_AGENT</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.map((log) => (
                  <tr key={log.log_id} className="border-b border-gray-800 text-gray-200">
                    <td className="py-2 pr-2 font-mono text-xs align-top">
                      {formatEventTime(log)}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-blue-300">
                        <Activity className="w-3 h-3 shrink-0" />
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <span
                        className={`font-mono text-xs px-2 py-1 rounded inline-block whitespace-nowrap ${
                          log.status === "success"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs align-top text-gray-300">
                      <div className="break-words leading-snug">{actorNameCell(log)}</div>
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs align-top">
                      <div className="truncate" title={actorEmailCell(log)}>
                        {actorEmailCell(log)}
                      </div>
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs align-top whitespace-nowrap text-gray-300">
                      {actorIdCell(log)}
                    </td>
                    <td className="py-2 pr-2 font-mono text-[11px] align-top text-amber-200/95">
                      <div className="break-words leading-snug line-clamp-3" title={actorRolesCell(log)}>
                        {actorRolesCell(log)}
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-xs align-top">
                      <div className="break-words line-clamp-3" title={String(formatDetails(log) || "")}>
                        {formatDetails(log)}
                      </div>
                    </td>
                    <td className="py-2 pr-2 font-mono text-[11px] align-top whitespace-nowrap">
                      {log.ip_address || "-"}
                    </td>
                    <td className="py-2 pr-1 text-xs text-gray-300 align-top truncate" title={log.user_agent || "-"}>
                      {log.user_agent || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
