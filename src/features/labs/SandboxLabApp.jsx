import React, { useState } from "react";
import {
  Lock,
  User,
  Shield,
  Settings,
  BarChart3,
  LogOut,
  Users,
  Trash2,
} from "lucide-react";

const fakeUsers = [
  { id: 1, username: "admin", role: "Administrator", status: "Active" },
  { id: 2, username: "analyst01", role: "Analyst", status: "Pending" },
  { id: 3, username: "intern", role: "Viewer", status: "Suspended" },
];

const SandboxLabApp = () => {
  const [view, setView] = useState("login"); // 'login' | 'dashboard' | 'admin'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // UI only – no auth, just navigate
    setView("dashboard");
  };

  const handleLogout = () => {
    setView("login");
    setUsername("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-50">
      {view === "login" && (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-400/60 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-[11px] font-mono text-emerald-400 tracking-[0.18em] uppercase">
                  // LAB_SANDBOX
                </p>
                <h1 className="text-xl font-bold font-mono text-slate-50">
                  Secure Login Portal
                </h1>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="operator"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      )}

      {view !== "login" && (
        <>
          <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-400/60 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-emerald-400 tracking-[0.18em] uppercase">
                    // SANDBOX_ENV
                  </p>
                  <p className="text-xs font-mono text-slate-200">
                    Internal Operations Console
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end text-[10px] font-mono text-slate-400">
                  <span className="text-slate-200">
                    USER::{username || "operator"}
                  </span>
                  <span>ROLE::ADMIN_SIM</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:border-rose-500 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          {view === "dashboard" && (
            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-mono font-bold text-slate-50">
                    Welcome, {username || "operator"}
                  </h2>
                  <p className="text-xs sm:text-sm font-mono text-slate-400">
                    Monitor simulated systems, review reports, and escalate to
                    admin panel.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setView("admin")}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-500 transition-all"
                  >
                    <Users className="w-4 h-4" />
                    Go to Admin Panel
                  </button>
                </div>
              </div>

              <section className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400">
                      PROFILE
                    </span>
                    <User className="w-4 h-4 text-emerald-300" />
                  </div>
                  <p className="text-sm text-slate-200">
                    View simulated operator profile and access tokens.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400">
                      SETTINGS
                    </span>
                    <Settings className="w-4 h-4 text-sky-300" />
                  </div>
                  <p className="text-sm text-slate-200">
                    Adjust simulated environment parameters and flags.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400">
                      REPORTS
                    </span>
                    <BarChart3 className="w-4 h-4 text-violet-300" />
                  </div>
                  <p className="text-sm text-slate-200">
                    Review simulated incident reports and findings.
                  </p>
                </div>
              </section>
            </main>
          )}

          {view === "admin" && (
            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-mono font-bold text-slate-50">
                    Admin Panel
                  </h2>
                  <p className="text-xs sm:text-sm font-mono text-slate-400">
                    Manage simulated users and review access levels.
                  </p>
                </div>
                <button
                  onClick={() => setView("dashboard")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:border-emerald-500 hover:text-emerald-300 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/40 overflow-x-auto">
                <table className="min-w-full text-sm text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400 font-mono">
                      <th className="py-2 pr-4 text-left">User</th>
                      <th className="py-2 px-4 text-left">Role</th>
                      <th className="py-2 px-4 text-left">Status</th>
                      <th className="py-2 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fakeUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-slate-800/60 last:border-b-0"
                      >
                        <td className="py-2 pr-4 font-mono text-xs">
                          {user.username}
                        </td>
                        <td className="py-2 px-4 text-xs text-slate-300">
                          {user.role}
                        </td>
                        <td className="py-2 px-4 text-xs">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                              user.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/50"
                                : user.status === "Pending"
                                ? "bg-amber-500/10 text-amber-300 border-amber-400/50"
                                : "bg-rose-500/10 text-rose-300 border-rose-400/50"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-2 pl-4 text-right">
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-[11px] font-mono text-rose-200 hover:bg-rose-500/20 transition-colors"
                            type="button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </main>
          )}
        </>
      )}
    </div>
  );
};

export default SandboxLabApp;

