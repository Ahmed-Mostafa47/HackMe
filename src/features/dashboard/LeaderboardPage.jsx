import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Target, Award, Bug, Clock } from "lucide-react";

const API_BASE = import.meta.env.DEV ? "/api" : "http://localhost/HackMe/server/api";

function formatMissionTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

const LeaderboardPage = ({ currentUser }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [totalPoints, setTotalPoints] = useState(0);
  const [labsCompleted, setLabsCompleted] = useState(0);
  const [labsTotal, setLabsTotal] = useState(0);
  const [currentRank, setCurrentRank] = useState("—");
  const [vulnerabilities, setVulnerabilities] = useState(0);
  const [missionLog, setMissionLog] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/get_leaderboard.php?limit=20`);
      const data = await res.json();
      if (data.success) {
        const list = (data.leaderboard || []).map((p, i) => ({
          rank: p.rank ?? i + 1,
          user_id: p.user_id,
          name: p.name || p.username,
          points: p.points,
          avatar: ["👻", "👁️", "⚡", "🎯", "💀"][i % 5],
          isYou: currentUser?.user_id === p.user_id,
        }));
        setLeaderboardData(list);
      } else {
        setError(data.message || "Failed to load leaderboard");
      }
    } catch (e) {
      setError("Cannot reach server");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = useCallback(async () => {
    const uid = currentUser?.user_id ?? currentUser?.id;
    if (!uid) {
      setTotalPoints(0);
      setLabsCompleted(0);
      setLabsTotal(0);
      setCurrentRank("—");
      setVulnerabilities(0);
      setMissionLog([]);
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/get_user_dashboard_stats.php?user_id=${encodeURIComponent(uid)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success) {
        setTotalPoints(data.total_points ?? 0);
        setLabsCompleted(data.labs_completed ?? 0);
        setLabsTotal(data.labs_total ?? 0);
        setCurrentRank(data.rank != null ? `#${data.rank}` : "—");
        setVulnerabilities(data.vulnerabilities ?? 0);
        setMissionLog(Array.isArray(data.mission_log) ? data.mission_log : []);
      }
    } catch (_) {
      // keep previous values
    } finally {
      setStatsLoading(false);
    }
  }, [currentUser?.user_id, currentUser?.id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [currentUser?.user_id]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchLeaderboard();
        fetchDashboardStats();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchDashboardStats]);

  const getIcon = (iconName) => {
    const icons = { Trophy, Target, Award, Bug, Clock };
    return icons[iconName] || Trophy;
  };

  const statCards = [
    {
      label: "TOTAL_POINTS",
      value: statsLoading ? "…" : String(totalPoints),
      color: "from-green-600 to-green-700",
      icon: "Trophy",
      iconColor: "text-green-400",
    },
    {
      label: "LABS_COMPLETED",
      value: statsLoading ? "…" : `${labsCompleted}/${labsTotal || "—"}`,
      color: "from-blue-600 to-blue-700",
      icon: "Target",
      iconColor: "text-blue-400",
    },
    {
      label: "CURRENT_RANK",
      value: statsLoading ? "…" : currentRank,
      color: "from-purple-600 to-purple-700",
      icon: "Award",
      iconColor: "text-purple-400",
    },
    {
      label: "VULNERABILITIES",
      value: statsLoading ? "…" : String(vulnerabilities),
      color: "from-red-600 to-red-700",
      icon: "Bug",
      iconColor: "text-red-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-10 text-center px-2">
          <h1 className="text-4xl sm:text-5xl font-bold text-green-400 mb-3 font-mono tracking-tight leading-tight">
            LEADERBOARD
          </h1>
          <p className="text-base sm:text-xl text-gray-400 font-mono">
            // MISSION_PROGRESS_TRACKING
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {statCards.map((stat, index) => {
            const IconComponent = getIcon(stat.icon);
            return (
              <div
                key={stat.label}
                className="group relative bg-gray-800/80 backdrop-blur-lg rounded-2xl p-5 sm:p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${stat.color} rounded-xl mb-4 shadow-lg border border-gray-600`}
                  >
                    <IconComponent className={`w-7 h-7 ${stat.iconColor}`} />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2 font-mono">
                    {stat.value}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium font-mono">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-gray-800/80 backdrop-blur-lg rounded-2xl p-5 sm:p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-600 to-green-700 rounded-lg border border-green-500/30">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-mono">
                OPERATIVE_RANKING
              </h2>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-400 font-mono">Loading leaderboard...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-400 font-mono">{error}</div>
              ) : leaderboardData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-mono">No data yet</div>
              ) : (
                leaderboardData.map((player) => (
                  <div
                    key={`${player.rank}-${player.user_id}`}
                    className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 rounded-xl transition-all duration-300 ${
                      player.isYou
                        ? "bg-green-500/20 border-2 border-green-500/40 shadow-lg"
                        : "bg-gray-700/50 hover:bg-gray-700/80 border border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <span
                          className={`font-bold font-mono ${
                            player.isYou ? "text-green-400 text-lg" : "text-gray-300"
                          }`}
                        >
                          {player.name}
                        </span>
                        {player.isYou && (
                          <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-bold text-green-400 text-lg font-mono">{player.points}</div>
                      <div className="text-gray-400 text-xs font-mono tracking-wide">POINTS</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-gray-800/80 backdrop-blur-lg rounded-2xl p-5 sm:p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg border border-blue-500/30">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-mono">MISSION_LOG</h2>
            </div>
            <div className="space-y-4">
              {!currentUser?.user_id && !currentUser?.id ? (
                <div className="text-center py-8 text-gray-500 font-mono">Log in to see your mission log.</div>
              ) : statsLoading ? (
                <div className="text-center py-8 text-gray-400 font-mono">Loading missions...</div>
              ) : missionLog.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-mono">
                  No completed labs yet. Solve a lab to see it here.
                </div>
              ) : (
                missionLog.map((activity, index) => (
                  <div
                    key={`${activity.lab_id}-${index}`}
                    className="bg-gray-700/50 hover:bg-gray-700/80 border border-gray-600 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:shadow-xl group"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-green-400 transition font-mono">
                            {activity.lab_title || `LAB_${activity.lab_id}`}
                          </h3>
                          <p className="text-gray-400 text-sm font-mono">
                            {formatMissionTime(activity.submitted_at)}
                            {activity.points != null && activity.points > 0 && (
                              <span className="text-green-400/90"> · +{activity.points} pts</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded text-xs font-semibold font-mono border bg-green-500/20 text-green-400 border-green-500/30">
                        COMPLETED
                      </span>
                    </div>
                    <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 to-green-500 w-full" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
