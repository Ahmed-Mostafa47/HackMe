import React, { useState, useEffect } from 'react';
import { Trophy, Target, Award, Bug, Clock } from 'lucide-react';
import { statsData, activityData } from '../../data/statsData';

const API_BASE = import.meta.env.DEV ? "/api" : "http://localhost/HackMe/server/api";

const LeaderboardPage = ({ currentUser }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          avatar: ['👻', '👁️', '⚡', '🎯', '💀'][i % 5],
          isYou: currentUser?.user_id === p.user_id,
        }));
        setLeaderboardData(list);
      } else {
        setError(data.message || 'Failed to load leaderboard');
      }
    } catch (e) {
      setError('Cannot reach server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchLeaderboard();
    })();
    return () => { cancelled = true; };
  }, [currentUser?.user_id]);

  // Refetch when tab becomes visible (e.g. user returns from lab tab after solving)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchLeaderboard();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [currentUser?.user_id]);
  const getIcon = (iconName) => {
    const icons = {
      Trophy: Trophy,
      Target: Target,
      Award: Award,
      Bug: Bug,
      Clock: Clock
    };
    return icons[iconName] || Trophy;
  };

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
          {statsData.map((stat, index) => {
            const IconComponent = getIcon(stat.icon);
            return (
              <div
                key={index}
                className="group relative bg-gray-800/80 backdrop-blur-lg rounded-2xl p-5 sm:p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                ></div>
                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${stat.color} rounded-xl mb-4 shadow-lg border border-gray-600`}>
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
                leaderboardData.map((player, index) => (
                  <div
                    key={player.rank}
                    className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 rounded-xl transition-all duration-300 ${
                      player.isYou
                        ? 'bg-green-500/20 border-2 border-green-500/40 shadow-lg'
                        : 'bg-gray-700/50 hover:bg-gray-700/80 border border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <span className={`font-bold font-mono ${player.isYou ? 'text-green-400 text-lg' : 'text-gray-300'}`}>
                          {player.name}
                        </span>
                        {player.isYou && (
                          <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded font-mono">YOU</span>
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
              <h2 className="text-xl sm:text-2xl font-bold text-white font-mono">
                MISSION_LOG
              </h2>
            </div>
            <div className="space-y-4">
              {activityData.map((activity, index) => (
                <div
                  key={index}
                  className="bg-gray-700/50 hover:bg-gray-700/80 border border-gray-600 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:shadow-xl group"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{activity.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-green-400 transition font-mono">{activity.lab}</h3>
                        <p className="text-gray-400 text-sm font-mono">{activity.time}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-xs font-semibold font-mono border ${
                        activity.status === 'COMPLETED'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : activity.status === 'IN_PROGRESS'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        activity.status === 'COMPLETED'
                          ? 'bg-gradient-to-r from-green-400 to-green-500 w-full'
                          : activity.status === 'IN_PROGRESS'
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 w-2/3'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500 w-1/4'
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;

