import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, Search, Filter } from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost/HackMe/server/api";

const AttemptLogsPage = ({ currentUser }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ipFromUrl = (searchParams.get("ip") || "").trim();

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
      const params = {
        current_user_id: currentUser?.user_id ?? currentUser?.id,
        action: actionFilter || undefined,
        status: statusFilter || undefined,
        limit: 200,
      };
      if (ipFromUrl) {
        params.ip = ipFromUrl;
      } else if (search.trim()) {
        params.search = search.trim();
      }
      const { data } = await axios.get(`${API_BASE}/attempt_logs.php`, {
        params,
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
  }, [actionFilter, statusFilter, ipFromUrl]);

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
    }
    if (!log?.created_at) return "-";
    return new Date(String(log.created_at).replace(" ", "T")).toLocaleString();
  };
  const getEmail = (log) => {
    const parsed = parseDetails(log?.details);
    if (typeof log?.actor_email === "string" && log.actor_email.trim() !== "") return log.actor_email.trim();
    if (typeof parsed?.email === "string" && parsed.email.trim() !== "") return parsed.email.trim();
    if (typeof log?.actor_username === "string" && log.actor_username.includes("@")) return log.actor_username;
    return "-";
  };
  const getActionLabel = (log) => {
    const parsed = parseDetails(log?.details);
    if (typeof parsed?.action_label === "string" && parsed.action_label.trim() !== "") return parsed.action_label.trim();
    const action = String(log?.action || "").trim();
    if (!action) return "-";
    return action.replaceAll("_", " ");
  };
  const getAttackType = (log) => {
    const parsed = parseDetails(log?.details);
    if (typeof parsed?.attack_type === "string" && parsed.attack_type.trim() !== "") return parsed.attack_type.trim();
    if (typeof parsed?.attackType === "string" && parsed.attackType.trim() !== "") return parsed.attackType.trim();
    const action = String(log?.action || "").trim();
    if (["brute_force_detection", "login_rate_limit", "security_block"].includes(action)) {
      return "brute_force";
    }
    return "-";
  };
  const getTarget = (log) => {
    const parsed = parseDetails(log?.details);
    if (typeof parsed?.target === "string" && parsed.target.trim() !== "") return parsed.target.trim();
    if (typeof parsed?.target_resource === "string" && parsed.target_resource.trim() !== "") return parsed.target_resource.trim();
    if (typeof log?.target_username === "string" && log.target_username.trim() !== "") return log.target_username.trim();
    if (log?.target_user_id) return `user #${log.target_user_id}`;
    if (String(log?.action || "").includes("login")) return "login";
    return "-";
  };
  const getBlocked = (log) => {
    const parsed = parseDetails(log?.details);
    if (parsed?.blocked === true) return "yes";
    if (typeof parsed?.blocked === "string" && ["true", "yes", "1"].includes(parsed.blocked.toLowerCase())) return "yes";
    if (log?.action === "security_block") return "yes";
    return "no";
  };
  const getBlockDuration = (log) => {
    const parsed = parseDetails(log?.details);
    const duration = parsed?.block_duration ?? parsed?.block_duration_minutes ?? parsed?.duration_minutes;
    if (duration !== undefined && duration !== null && String(duration).trim() !== "") {
      const n = Number(duration);
      if (!Number.isNaN(n) && Number.isFinite(n)) return `${n} min`;
      return String(duration);
    }

    // Fallback for backend payloads that store only blocked_until.
    const blockedUntilRaw = typeof parsed?.blocked_until === "string" ? parsed.blocked_until.trim() : "";
    if (blockedUntilRaw) {
      const blockedUntil = new Date(blockedUntilRaw.replace(" ", "T"));
      let from = null;

      const clientTimeUtcRaw = typeof parsed?.client_time_utc === "string" ? parsed.client_time_utc.trim() : "";
      if (clientTimeUtcRaw) {
        const clientTime = new Date(clientTimeUtcRaw);
        if (!Number.isNaN(clientTime.getTime())) {
          from = clientTime;
        }
      }

      if (!from && log?.created_at) {
        const createdAt = new Date(String(log.created_at).replace(" ", "T"));
        if (!Number.isNaN(createdAt.getTime())) {
          from = createdAt;
        }
      }

      if (!from) {
        from = new Date();
      }

      if (!Number.isNaN(blockedUntil.getTime())) {
        const diffMs = blockedUntil.getTime() - from.getTime();
        if (diffMs > 0) {
          const mins = Math.max(1, Math.ceil(diffMs / 60000));
          return `${mins} min`;
        }
      }
    }

    return "-";
  };
  const formatDetails = (log) => {
    const parsed = parseDetails(log?.details);
    if (!parsed) return log?.details || "-";
    return parsed.message || JSON.stringify(parsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 pt-24 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white font-mono mt-1">ATTEMPT_LOGS</h1>
        </div>

        {ipFromUrl ? (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-3 text-sm font-mono text-cyan-100">
            <span>
              FILTER_BY_IP=<span className="text-white">{ipFromUrl}</span>
            </span>
          </div>
        ) : null}

        <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 mb-5">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={Boolean(ipFromUrl)}
                placeholder={ipFromUrl ? "(disabled while IP filter is active)" : "Search user/details..."}
                className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm outline-none focus:border-green-500 ${
                  ipFromUrl
                    ? "cursor-not-allowed border-gray-700/50 bg-gray-900/80 text-gray-500"
                    : "border-gray-700 bg-gray-800 text-white"
                }`}
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white"
            >
              <option value="">All attempt actions</option>
              <option value="login">login</option>
              <option value="access_restricted">access_restricted</option>
              <option value="url_tamper_attempt">url_tamper_attempt</option>
              <option value="privilege_escalation_attempt">privilege_escalation_attempt</option>
              <option value="sensitive_action_attempt">sensitive_action_attempt</option>
              <option value="brute_force_detection">brute_force_detection</option>
              <option value="security_block">security_block</option>
              <option value="login_rate_limit">login_rate_limit</option>
              <option value="password_change_rate_limit">password_change_rate_limit</option>
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
            <table className="w-full min-w-[2480px] text-sm">
              <thead>
                <tr className="text-left text-gray-400 font-mono border-b border-gray-700">
                  <th className="py-2 pr-3">TIME</th>
                  <th className="py-2 pr-3">ACTOR</th>
                  <th className="py-2 pr-3">USER_ID</th>
                  <th className="py-2 pr-3">IS_AUTHENTICATED</th>
                  <th className="py-2 pr-3">EMAIL</th>
                  <th className="py-2 pr-3">ACTOR_ROLES</th>
                  <th className="py-2 pr-3">IP</th>
                  <th className="py-2 pr-3">GEO_INFO</th>
                  <th className="py-2 pr-3">CORRELATION_ID</th>
                  <th className="py-2 pr-3">ACTION</th>
                  <th className="py-2 pr-3">STATUS</th>
                  <th className="py-2 pr-3">SEVERITY</th>
                  <th className="py-2 pr-3">ATTACK_TYPE</th>
                  <th className="py-2 pr-3">TARGET</th>
                  <th className="py-2 pr-3">BLOCKED</th>
                  <th className="py-2 pr-3">BLOCK_DURATION</th>
                  <th className="py-2 pr-3">USER_AGENT</th>
                  <th className="py-2 pr-3">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.map((log) => (
                  <tr key={log.log_id} className="border-b border-gray-800 text-gray-200">
                    <td className="py-2 pr-3 font-mono text-xs">{formatEventTime(log)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{log.actor_username || "-"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{log.actor_user_id || "-"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{log.is_authenticated ? "true" : "false"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{getEmail(log)}</td>
                    <td
                      className="py-2 pr-3 max-w-[220px] truncate font-mono text-xs text-amber-200/95"
                      title={(log.actor_roles || "").trim() || "-"}
                    >
                      {(log.actor_roles || "").trim() || "-"}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{log.ip_address || "-"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{log.geo_info || "-"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{log.correlation_id || "-"}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-blue-300">
                        <Activity className="w-3 h-3" />
                        {getActionLabel(log)}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`font-mono text-xs px-2 py-1 rounded ${log.status === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{log.severity || "-"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{getAttackType(log)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{getTarget(log)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{getBlocked(log)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{getBlockDuration(log)}</td>
                    <td className="py-2 pr-3 text-xs text-gray-300 max-w-[320px] truncate" title={log.user_agent || "-"}>
                      {log.user_agent || "-"}
                    </td>
                    <td className="py-2 pr-3 text-xs">{formatDetails(log)}</td>
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

export default AttemptLogsPage;
