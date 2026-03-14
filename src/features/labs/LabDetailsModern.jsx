import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Shield,
  Flame,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  PlayCircle,
  Flag,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { mockLabs } from "../../data/mockData";

// Use relative path when proxy exists (dev), else full URL (production)
const API_BASE = import.meta.env.DEV ? "/api" : "http://localhost/HackMe/server/api";

const diffBadgeClasses = {
  easy: "bg-emerald-500/10 text-emerald-300 border-emerald-400/50",
  medium: "bg-amber-500/10 text-amber-300 border-amber-400/50",
  hard: "bg-rose-500/10 text-rose-300 border-rose-400/50",
};

const LabDetailsModern = ({ labId, onBack, currentUser, onFlagSuccess }) => {
  const lab =
    mockLabs.find((l) => String(l.lab_id) === String(labId)) || mockLabs[0];

  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(true);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [solutionConfirm, setSolutionConfirm] = useState(false);

  const [flagValue, setFlagValue] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);
  const [flagResult, setFlagResult] = useState(null); // { success, message, points }
  const [successPopupVisible, setSuccessPopupVisible] = useState(false);
  const [labSolved, setLabSolved] = useState(false); // hide form after solve so user can't resubmit

  // Auto-hide success popup after 3 seconds
  useEffect(() => {
    if (!successPopupVisible) return;
    const t = setTimeout(() => setSuccessPopupVisible(false), 3000);
    return () => clearTimeout(t);
  }, [successPopupVisible]);

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!flagValue.trim() || !currentUser?.user_id) return;
    setFlagLoading(true);
    setFlagResult(null);
    try {
      const res = await fetch(`${API_BASE}/submit_flag.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lab_id: lab.lab_id,
          flag: flagValue.trim(),
          user_id: currentUser.user_id ?? currentUser.id,
        }),
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        const errPreview = (text || "empty response").slice(0, 200);
        setFlagResult({ success: false, message: `خطأ من الخادم (${res.status}): ${errPreview}` });
        return;
      }
      const errMsg = data.message || data.error || (res.status >= 400 ? `Error ${res.status}` : null);
      if (errMsg) {
        data.message = res.status === 500 ? `خطأ 500: ${errMsg}` : errMsg;
      }
      const alreadySolved = data.already_solved || data.message === "LAB_ALREADY_SOLVED";
      if (data.success || alreadySolved) setLabSolved(true);

      setFlagResult({
        ...data,
        message: data.success
          ? (data.message === "FLAG_CAPTURED" || data.message === "FLAG_ALREADY_SUBMITTED"
            ? "Lab solved successfully"
            : data.message)
          : data.message === "LAB_ALREADY_SOLVED"
            ? "Lab already solved. No need to submit again."
            : data.message,
      });
      if (data.success) {
        setFlagValue("");
        setSuccessPopupVisible(true);
        onFlagSuccess?.();
      }
    } catch (err) {
      const msg = err.message || "Network error";
      setFlagResult({ success: false, message: msg === "Failed to fetch" ? "Cannot reach server. Check XAMPP Apache and URL." : msg });
    } finally {
      setFlagLoading(false);
    }
  };

  const [startLabLoading, setStartLabLoading] = useState(false);
  const [startLabError, setStartLabError] = useState(null);

  const handleStartLab = async () => {
    setStartLabLoading(true);
    setStartLabError(null);
    try {
      const res = await fetch(`${API_BASE}/generate_lab_token.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lab_id: lab.lab_id,
          user_id: currentUser?.user_id ?? currentUser?.id ?? 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.success || !data.token) {
        setStartLabError(data.message || "Failed to generate lab access token");
        return;
      }
      let url;
      if (lab.lab_id === 8) {
        url = `http://localhost:4003/lab/1?token=${encodeURIComponent(data.token)}&labId=${lab.lab_id}`;
      } else if (lab.lab_id === 9) {
        url = `http://localhost:4003/lab/2?token=${encodeURIComponent(data.token)}&labId=${lab.lab_id}`;
      } else {
        const port = 4000;
        url = `http://localhost:${port}/?labId=${lab.lab_id}&token=${encodeURIComponent(data.token)}`;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setStartLabError(err.message || "Network error");
    } finally {
      setStartLabLoading(false);
    }
  };

  const derivedHints = [
    "Try enumerating input parameters first.",
    "Observe server responses for useful error messages.",
  ];

  const derivedSolution =
    "This is a placeholder solution. Replace this text with the real walkthrough for your lab scenario.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-12 px-4 sm:px-6 lg:px-10">
      {/* Success toast - slides down from below navbar, then fades out after 3s */}
      {successPopupVisible && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-down">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-slate-900/95 backdrop-blur-sm px-5 py-4 shadow-2xl shadow-emerald-500/20">
            <div className="rounded-full bg-emerald-500/20 p-2 flex-shrink-0">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-mono font-semibold text-emerald-200">
                Lab solved successfully
              </h3>
              <p className="text-sm text-slate-300">
                {flagResult?.points != null ? `Submission saved. +${flagResult.points} pts` : "Submission saved."}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono text-slate-400 hover:text-emerald-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                BACK_TO_LABS
              </button>
            )}

            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-400/40 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-200">
                <Shield className="w-3.5 h-3.5" />
                Active Lab
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-50 font-mono">
                {lab.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] sm:text-xs font-mono text-slate-300">
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1",
                    diffBadgeClasses[lab.difficulty] ||
                      "bg-slate-700/40 text-slate-200 border-slate-500/60",
                  ].join(" ")}
                >
                  <Flame className="w-3.5 h-3.5" />
                  {lab.difficulty === "easy" && "Easy"}
                  {lab.difficulty === "medium" && "Medium"}
                  {lab.difficulty === "hard" && "Hard"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/50 px-3 py-1 text-sky-200">
                  <BookOpen className="w-3.5 h-3.5" />
                  {lab.labtype_id === 1 ? "WHITE_BOX" : "BLACK_BOX"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3">
            <div className="relative">
              <br />
              <br /><br />
              {/* <button
                onClick={() => setResourcesOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-2 text-xs sm:text-sm font-mono text-slate-100 hover:border-emerald-400/70 hover:text-emerald-300 transition-all"
              >
                Resources
                {resourcesOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button> */}

              {resourcesOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-700 bg-slate-900/95 shadow-xl shadow-black/40 z-20">
                  <div className="py-2 text-xs text-slate-200 font-mono">
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-slate-800/80 flex items-center gap-2"
                      onClick={() => {
                        setHintsOpen(true);
                        setSolutionOpen(false);
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                      Hint
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-slate-800/80 flex items-center gap-2"
                      onClick={() => {
                        setSolutionOpen(true);
                        setSolutionConfirm(false);
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-300" />
                      Solution
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStartLab}
              disabled={startLabLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-400/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4" />
              {startLabLoading ? "Opening..." : "Start Lab"}
            </button>
            {startLabError && (
              <p className="text-xs font-mono text-rose-400">{startLabError}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-black/40">
              <h2 className="text-sm font-mono text-slate-300 mb-2">
                // DESCRIPTION
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                {lab.description}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-black/40">
              <h2 className="text-sm font-mono text-slate-300 mb-2 flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                // SUBMIT_FLAG
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-4">
                Enter the flag you captured from the lab environment (port {lab.lab_id === 8 || lab.lab_id === 9 ? 4003 : 4000}).
              </p>
              {labSolved ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm font-mono text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Lab solved. No need to submit again.</span>
                </div>
              ) : currentUser?.user_id ? (
                <>
                  <form onSubmit={handleSubmitFlag} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={flagValue}
                      onChange={(e) => setFlagValue(e.target.value)}
                      placeholder="FLAG{...}"
                      className="flex-1 rounded-lg bg-slate-900 border border-slate-600 px-4 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                      disabled={flagLoading}
                    />
                    <button
                      type="submit"
                      disabled={flagLoading || !flagValue.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Flag className="w-4 h-4" />
                      {flagLoading ? "Submitting..." : "Submit Flag"}
                    </button>
                  </form>
                  {flagResult && (
                    <div
                      className={`mt-3 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-mono ${
                        flagResult.success || flagResult.message?.includes("already solved")
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                          : "border-rose-500/50 bg-rose-500/10 text-rose-200"
                      }`}
                    >
                      {flagResult.success || flagResult.message?.includes("already solved") ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{flagResult.message}</span>
                      {flagResult.points != null && (
                        <span className="text-emerald-300">+{flagResult.points} pts</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 font-mono">Log in to submit flags.</p>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-black/40">
              <button
                className="flex w-full items-center justify-between gap-2 text-sm font-mono text-slate-100"
                onClick={() => setHintsOpen((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  Hints
                </span>
                {hintsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {hintsOpen && (
                <div className="mt-3 space-y-2 text-xs text-slate-200 font-mono">
                  {derivedHints.map((hint, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2"
                    >
                      <span className="text-amber-300 text-[11px]">
                        HINT_{idx + 1}
                      </span>
                      <p className="mt-1 text-amber-50 text-[11px]">
                        {hint}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-black/40">
              <button
                className="flex w-full items-center justify-between gap-2 text-sm font-mono text-slate-100"
                onClick={() => setSolutionOpen((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Solution
                </span>
                {solutionOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {solutionOpen && (
                <div className="mt-3 space-y-3 text-xs text-slate-200 font-mono">
                  {!solutionConfirm && (
                    <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-3">
                      <p className="text-rose-100 text-[11px]">
                        Are you sure you want to view the solution? This may
                        reduce the learning impact of this lab.
                      </p>
                      <button
                        onClick={() => setSolutionConfirm(true)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 py-1.5 text-[11px] text-rose-100 hover:bg-rose-500/30 transition-colors"
                      >
                        Reveal Solution
                      </button>
                    </div>
                  )}

                  {solutionConfirm && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-3">
                      <p className="text-emerald-50 text-[11px] whitespace-pre-wrap">
                        {derivedSolution}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LabDetailsModern;

