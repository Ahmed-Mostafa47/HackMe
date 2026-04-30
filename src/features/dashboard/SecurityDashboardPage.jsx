import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, BarChart3, Target, Users, Activity, RefreshCw } from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost/HackMe/server/api";

const WINDOWS = [
  { hours: 24, label: "24h" },
  { hours: 168, label: "7d" },
  { hours: 720, label: "30d" },
];

const SecurityDashboardPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hours, setHours] = useState(168);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await axios.get(`${API_BASE}/security_dashboard.php`, {
        params: {
          current_user_id: currentUser?.user_id ?? currentUser?.id,
          hours,
        },
      });
      if (res?.success) {
        setData(res);
      } else {
        setError(res?.message || "Failed to load dashboard.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, currentUser?.user_id]);

  const maxIp = useMemo(() => {
    const arr = data?.top_attacking_ips || [];
    return Math.max(1, ...arr.map((x) => x.count));
  }, [data]);

  const maxEp = useMemo(() => {
    const arr = data?.most_attacked_targets || data?.most_targeted_endpoints || [];
    return Math.max(1, ...arr.map((x) => x.count));
  }, [data]);

  const ratioTotal =
    (data?.failed_vs_success?.failed ?? 0) + (data?.failed_vs_success?.success ?? 0);
  const failedPct = ratioTotal
    ? Math.round(((data?.failed_vs_success?.failed ?? 0) / ratioTotal) * 1000) / 10
    : 0;
  const successPct = ratioTotal
    ? Math.round(((data?.failed_vs_success?.success ?? 0) / ratioTotal) * 1000) / 10
    : 0;

  const formatUpdatedAt = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return "—";
    // DB timestamp is stored without timezone; treat it as UTC then render local time.
    const isoUtc = v.includes("T") ? `${v}Z` : `${v.replace(" ", "T")}Z`;
    const d = new Date(isoUtc);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-mono text-sm">
              <Shield className="w-5 h-5" />
              SUPERADMIN
            </div>
            <h1 className="text-3xl font-bold text-white font-mono mt-1">SECURITY_DASHBOARD</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white font-mono"
            >
              {WINDOWS.map((w) => (
                <option key={w.hours} value={w.hours}>
                  Window: {w.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/50 text-amber-200 hover:bg-amber-500/10 font-mono text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              REFRESH
            </button>
          </div>
        </div>

        {error && (
          <p className="text-rose-300 text-sm font-mono mb-4 border border-rose-500/30 rounded-lg px-3 py-2 bg-rose-950/30">
            {error}
          </p>
        )}

        {loading && !data ? (
          <p className="text-gray-400 font-mono text-sm">LOADING...</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="bg-gray-900/70 border border-gray-700 rounded-2xl p-5">
              <h2 className="text-lg font-mono text-white flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-amber-400" />
                TOP_ATTACKING_IPS
              </h2>
              <ul className="space-y-3">
                {(data?.top_attacking_ips || []).length === 0 ? (
                  <li className="text-gray-500 font-mono text-sm">NO_DATA</li>
                ) : (
                  data.top_attacking_ips.map((row) => (
                    <li key={row.ip} className="flex items-center gap-3">
                      <button
                        type="button"
                        title="Open Attempt Logs for this IP"
                        disabled={row.ip === "(no-ip)"}
                        onClick={() => {
                          if (!row.ip || row.ip === "(no-ip)") return;
                          navigate(`/attempt-logs?${new URLSearchParams({ ip: row.ip }).toString()}`);
                        }}
                        className={`font-mono text-xs text-left w-36 shrink-0 truncate rounded px-1 py-0.5 transition-colors ${
                          row.ip === "(no-ip)"
                            ? "cursor-not-allowed text-gray-600"
                            : "cursor-pointer text-cyan-300 hover:text-white hover:bg-cyan-500/15"
                        }`}
                      >
                        {row.ip}
                      </button>
                      <div className="flex-1 h-7 bg-gray-800/80 rounded overflow-hidden border border-gray-700">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600/80 to-orange-600/60"
                          style={{ width: `${(row.count / maxIp) * 100}%`, minWidth: row.count ? "8px" : 0 }}
                        />
                      </div>
                      <span className="font-mono text-xs text-gray-300 w-10 text-right">{row.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="bg-gray-900/70 border border-gray-700 rounded-2xl p-5">
              <h2 className="text-lg font-mono text-white flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-amber-400" />
                MOST_ATTACKED_TARGETS
              </h2>
              <ul className="space-y-3">
                {(data?.most_attacked_targets || data?.most_targeted_endpoints || []).length === 0 ? (
                  <li className="text-gray-500 font-mono text-sm">NO_DATA</li>
                ) : (
                  (data.most_attacked_targets || data.most_targeted_endpoints || []).map((row) => (
                    <li key={row.endpoint} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-emerald-300 flex-1 min-w-0 truncate" title={row.endpoint}>
                        {row.endpoint}
                      </span>
                      <div className="flex-1 h-7 bg-gray-800/80 rounded overflow-hidden border border-gray-700 max-w-[200px]">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600/70 to-teal-600/50"
                          style={{ width: `${(row.count / maxEp) * 100}%`, minWidth: row.count ? "8px" : 0 }}
                        />
                      </div>
                      <span className="font-mono text-xs text-gray-300 w-10 text-right">{row.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="bg-gray-900/70 border border-gray-700 rounded-2xl p-5 lg:col-span-2">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-mono text-white flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-amber-400" />
                    FAILED_VS_SUCCESS
                  </h2>
                  <p className="text-xs text-gray-500 font-mono mb-3">
                    Attempt Logs actions only · total events: {ratioTotal || "0"}
                  </p>
                  <div className="flex h-10 rounded-lg overflow-hidden border border-gray-700 font-mono text-xs">
                    <div
                      className="bg-rose-600/85 flex items-center justify-center text-white"
                      style={{ width: `${failedPct}%` }}
                    >
                      {failedPct > 8 ? `failed ${failedPct}%` : ""}
                    </div>
                    <div
                      className="bg-emerald-600/85 flex items-center justify-center text-white"
                      style={{ width: `${successPct}%` }}
                    >
                      {successPct > 8 ? `success ${successPct}%` : ""}
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs font-mono text-gray-400">
                    <span>failed: {data?.failed_vs_success?.failed ?? 0}</span>
                    <span>success: {data?.failed_vs_success?.success ?? 0}</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-mono text-white flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-cyan-400" />
                    TOP_SUSPICIOUS_USERS
                  </h2>
                  <p className="text-xs text-gray-500 font-mono mb-3">
                    Live score table from <span className="text-gray-300">security_scores</span> (auto-updated).
                  </p>
                  {(data?.top_suspicious_users || []).length === 0 ? (
                    <p className="text-gray-500 font-mono text-xs mb-6">NO_SUSPICIOUS_USERS</p>
                  ) : (
                    <div className="overflow-x-auto max-h-[220px] mb-6">
                      <table className="w-full min-w-[540px] text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-gray-700 text-gray-500">
                            <th className="py-2 pr-2">USERNAME</th>
                            <th className="py-2 pr-2">USER_ID</th>
                            <th className="py-2 pr-2">IP</th>
                            <th className="py-2 pr-2 text-right">SCORE</th>
                            <th className="py-2 pr-2">UPDATED_AT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.top_suspicious_users.map((u, idx) => (
                            <tr key={`${u.user_id || "u"}-${u.ip}-${idx}`} className="border-b border-gray-800 text-gray-200">
                              <td className="py-2 pr-2 truncate max-w-[160px]" title={u.username || "—"}>
                                {u.username || "—"}
                              </td>
                              <td className="py-2 pr-2 text-amber-200/90">{u.user_id ? `#${u.user_id}` : "—"}</td>
                              <td className="py-2 pr-2 truncate max-w-[180px]" title={u.ip || "—"}>
                                {u.ip || "—"}
                              </td>
                              <td className="py-2 pr-2 text-right text-amber-300 font-semibold">{u.score ?? 0}</td>
                              <td className="py-2 pr-2 text-emerald-200/90">{formatUpdatedAt(u.updated_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <h2 className="text-lg font-mono text-white flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-amber-400" />
                    BLOCKED_USERS
                  </h2>
                  <p className="text-2xl font-mono text-white mb-1">
                    {data?.blocked_users_distinct ?? 0}{" "}
                    <span className="text-sm text-gray-500">distinct users (security_block)</span>
                  </p>
                  <p className="text-xs text-gray-500 font-mono mb-3">
                    Users with <span className="text-gray-300">security_block</span> in Attempt Logs (window).
                  </p>
                  {(data?.blocked_users_top || []).length === 0 ? (
                    <p className="text-gray-500 font-mono text-xs">NO_BLOCK_EVENTS</p>
                  ) : (
                    <div className="overflow-x-auto max-h-[min(340px,calc(100vh-12rem))]">
                      <table className="w-full min-w-[520px] text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-gray-700 text-gray-500">
                            <th className="py-2 pr-2">USERNAME</th>
                            <th className="py-2 pr-2">USER_ID</th>
                            <th className="py-2 pr-2">EMAIL</th>
                            <th className="py-2 pr-2">PRIMARY_BLOCK_DUR</th>
                            <th className="py-2 pr-2 text-right">BLOCK_EVENTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.blocked_users_top.map((u) => (
                            <tr key={u.user_id} className="border-b border-gray-800 text-gray-200">
                              <td className="py-2 pr-2 truncate max-w-[140px]" title={u.username}>
                                {u.username || "—"}
                              </td>
                              <td className="py-2 pr-2 text-amber-200/90">#{u.user_id}</td>
                              <td className="py-2 pr-2 truncate max-w-[200px]" title={u.email || "—"}>
                                {u.email || "—"}
                              </td>
                              <td className="py-2 pr-2 text-emerald-200/90">{u.block_duration_typical || "—"}</td>
                              <td className="py-2 pr-2 text-right text-amber-300/90">{u.block_events}×</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboardPage;
