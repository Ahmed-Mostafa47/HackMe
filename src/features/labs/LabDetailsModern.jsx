import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Flame,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  Flag,
  XCircle,
} from "lucide-react";
import { labService } from "../../services/labService";
import { WHITEBOX_WORKBENCH_LAB_IDS } from "../../constants/labs";
import { WHITEBOX_WORKBENCH_LAB_IDS } from "../../constants/labs";

// Use relative path when proxy exists (dev), else full URL (production)
const API_BASE = import.meta.env.DEV ? "/api" : "http://localhost/HackMe/server/api";

const diffBadgeClasses = {
  easy: "bg-emerald-500/10 text-emerald-300 border-emerald-400/50",
  medium: "bg-amber-500/10 text-amber-300 border-amber-400/50",
  hard: "bg-rose-500/10 text-rose-300 border-rose-400/50",
};

const whiteboxRouteLabIds = new Set(WHITEBOX_WORKBENCH_LAB_IDS);
const whiteboxRouteLabIds = new Set(WHITEBOX_WORKBENCH_LAB_IDS);

const LabDetailsModern = ({ labId, onBack, currentUser, onFlagSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const id = Number(labId);
    if (!whiteboxRouteLabIds.has(id)) return;
    const q = new URLSearchParams();
    q.set("labId", String(id));
    const fc = searchParams.get("fromCategory");
    const ft = searchParams.get("labType");
    if (fc) q.set("fromCategory", fc);
    if (ft) q.set("labType", ft);
    navigate(`/lab-whitebox?${q.toString()}`, { replace: true });
  }, [labId, navigate, searchParams]);

  const [lab, setLab] = useState(null);
  const [labLoading, setLabLoading] = useState(true);
  const [labError, setLabError] = useState("");

  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [solutionConfirm, setSolutionConfirm] = useState(false);
  const [hintViewed, setHintViewed] = useState(false);
  const [solutionViewed, setSolutionViewed] = useState(false);
  const [solutionText, setSolutionText] = useState("");
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [solutionError, setSolutionError] = useState("");

  const [flagValue, setFlagValue] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);
  const [flagResult, setFlagResult] = useState(null); // { success, message, points } - for toast
  const [successPopupVisible, setSuccessPopupVisible] = useState(false);
  const [labSolved, setLabSolved] = useState(false);

  // Reset labSolved when switching to a different lab (prevents stale state from previous lab)
  useEffect(() => {
    const id = Number(labId);
    if (whiteboxRouteLabIds.has(id)) {
      setLabLoading(false);
      setLab(null);
      setLabError("");
      return;
    }
    let mounted = true;
    setLabLoading(true);
    setLabError("");
    setLab(null);
    labService
      .getLabDetails(labId)
      .then((res) => {
        if (!mounted) return;
        setLab(res?.data?.lab || null);
      })
      .catch((err) => {
        if (!mounted) return;
        setLabError(err?.message || "Failed to load lab details.");
      })
      .finally(() => {
        if (mounted) setLabLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [labId]);

  useEffect(() => {
    setLabSolved(false);
    setHintsOpen(false);
    setSolutionOpen(false);
    setSolutionConfirm(false);
    setHintViewed(false);
    setSolutionViewed(false);
    setSolutionText("");
    setSolutionError("");
  }, [labId]);

  const penaltyPercent = Math.min(
    100,
    (hintViewed ? 25 : 0) + (solutionViewed ? 75 : 0)
  );
  const maxPoints = Number(lab?.points_total ?? 0) || 0;
  const possiblePoints = Math.max(
    0,
    Math.floor(maxPoints * (1 - penaltyPercent / 100))
  );

  // Listen for lab solved from Training Labs (postMessage)
  // Only accept from lab origins (localhost:4001, 4002) to prevent false solves from extensions/other tabs.
  const labOrigins = ["http://localhost:4000", "http://localhost:4001", "http://localhost:4002", "http://localhost:4003", "http://127.0.0.1:4000", "http://127.0.0.1:4001", "http://127.0.0.1:4002", "http://127.0.0.1:4003"];
  useEffect(() => {
    const handler = (e) => {
      if (!labOrigins.includes(e?.origin ?? "")) return;
      const d = e?.data;
      if (!d || d?.type !== "HACKME_LAB_SOLVED") return;
      const msgLabId = d.labId ?? d.lab_id;
      if (String(msgLabId) !== String(labId)) return;
      const pts = d.points ?? 0;
      setLabSolved(true);
      onFlagSuccess?.();
      // Only show toast with points when first solve (pts > 0). Re-solve = 0 pts, no toast.
      if (pts > 0) {
        setFlagResult({ success: true, message: "Lab solved", points: pts });
        setSuccessPopupVisible(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [labId, onFlagSuccess]);

  // Check solved status on mount, on focus (when user returns to HackMe tab), and via manual refresh
  // Do NOT show success toast here - only show toast on first solve (postMessage with points)
  // Use AbortController so in-flight fetches are cancelled when lab changes (prevents stale result overwriting current lab)
  useEffect(() => {
    const abort = new AbortController();
    const checkSolved = async () => {
      if (!lab?.lab_id || (!currentUser?.user_id && !currentUser?.id)) return;
      try {
        const uid = currentUser?.user_id ?? currentUser?.id;
        const url = `${API_BASE}/labs/check_lab_solved.php?lab_id=${lab.lab_id}&user_id=${uid}&scope=standard`;
        const r = await fetch(url, { cache: "no-store", signal: abort.signal });
        const d = await r.json().catch(() => ({}));
        if (d?.solved) {
          setLabSolved(true);
          setFlagResult({ success: true, message: "Lab solved", points: 100 });
        }
      } catch (_) {
        // Ignore AbortError (lab switched) and network errors
      }
    };
    checkSolved();
    const onFocus = () => checkSolved();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(checkSolved, 8000);
    return () => {
      abort.abort();
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [lab?.lab_id, currentUser?.user_id, currentUser?.id]);

  // Auto-hide success popup after 3 seconds
  useEffect(() => {
    if (!successPopupVisible) return;
    const t = setTimeout(() => setSuccessPopupVisible(false), 3000);
    return () => clearTimeout(t);
  }, [successPopupVisible]);

  useEffect(() => {
    const uid = currentUser?.user_id ?? currentUser?.id;
    if (!lab?.lab_id || !uid) return;
    const url = `${API_BASE}/labs/resource_usage.php?lab_id=${lab.lab_id}&user_id=${uid}`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) return;
        setHintViewed(Boolean(d?.data?.hint_viewed));
        setSolutionViewed(Boolean(d?.data?.solution_viewed));
      })
      .catch(() => {});
  }, [lab?.lab_id, currentUser?.user_id, currentUser?.id]);

  const markResourceViewed = async (resourceType) => {
    const uid = currentUser?.user_id ?? currentUser?.id;
    if (!uid || !lab?.lab_id) return;
    try {
      await fetch(`${API_BASE}/labs/resource_usage.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: uid,
          lab_id: lab.lab_id,
          resource: resourceType,
          viewed: true,
        }),
      });
    } catch (_) {}
  };

  const [startLabLoading, setStartLabLoading] = useState(false);
  const [startLabError, setStartLabError] = useState(null);

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!flagValue.trim() || (!currentUser?.user_id && !currentUser?.id)) return;
    setFlagLoading(true);
    setFlagResult(null);
    try {
      const submitUrl = import.meta.env.DEV ? "/api/submit_flag.php" : `${API_BASE}/submit_flag.php`;
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lab_id: lab.lab_id,
          flag: flagValue.trim(),
          user_id: currentUser?.user_id ?? currentUser?.id ?? 0,
        }),
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setFlagResult({ success: false, message: `Server error (${res.status})` });
        return;
      }
      const errMsg = data.message || data.error;
      const alreadySolved = data.already_solved || data.message === "LAB_ALREADY_SOLVED";
      if (data.success || alreadySolved) setLabSolved(true);
      setFlagResult({
        ...data,
        message: data.success
          ? (data.message === "FLAG_CAPTURED" || data.message === "FLAG_ALREADY_SUBMITTED" ? "Lab solved successfully" : data.message)
          : data.message === "LAB_ALREADY_SOLVED"
            ? "Lab already solved. No need to submit again."
            : errMsg || "Invalid flag",
      });
      if (data.success) {
        setFlagValue("");
        setSuccessPopupVisible(true);
        onFlagSuccess?.();
      }
    } catch (err) {
      setFlagResult({ success: false, message: err?.message || "Network error" });
    } finally {
      setFlagLoading(false);
    }
  };

  const handleStartLab = async () => {
    setStartLabLoading(true);
    setStartLabError(null);
    try {
      // Start lab container before opening (runs docker-compose up -d)
      const startRes = await fetch(`${API_BASE}/labs/start_lab_container.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lab_id: lab.lab_id }),
      });
      const startData = await startRes.json().catch(() => ({}));
      // Continue even if container start fails (might already be running)
      if (!startData.success && startData.message) {
        console.warn("Lab container start:", startData.message);
      }

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
      const port = lab.port ?? 4000;
      const launchPath = (lab.launch_path || "/").trim();
      const normalizedPath = launchPath.startsWith("/") ? launchPath : `/${launchPath}`;
      const separator = normalizedPath.includes("?") ? "&" : "?";
      const url = `http://localhost:${port}${normalizedPath}${separator}labId=${lab.lab_id}&token=${encodeURIComponent(data.token)}`;
      // Use named window so lab tab keeps window.opener for postMessage to HackMe (lab 5)
      window.open(url, "hackme_lab_" + lab.lab_id);
    } catch (err) {
      setStartLabError(err.message || "Network error");
    } finally {
      setStartLabLoading(false);
    }
  };

  const derivedHints =
    Array.isArray(lab?.hints) && lab.hints.length > 0
      ? lab.hints
      : ["No hints available for this lab yet."];

  const handleRevealSolution = async () => {
    const uid = currentUser?.user_id ?? currentUser?.id;
    if (!uid || !lab?.lab_id) {
      setSolutionError("You must be logged in to view the solution.");
      return;
    }
    setSolutionLoading(true);
    setSolutionError("");
    try {
      const res = await labService.getLabSolution({ labId: lab.lab_id, userId: uid });
      setSolutionText(res?.data?.solution || "");
      setSolutionConfirm(true);
      if (!solutionViewed) {
        setSolutionViewed(true);
      }
    } catch (err) {
      setSolutionError(err?.message || "Failed to load solution.");
    } finally {
      setSolutionLoading(false);
    }
  };

  if (whiteboxRouteLabIds.has(Number(labId))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <p className="text-slate-400 font-mono text-sm">Opening white-box workspace…</p>
      </div>
    );
  }

  if (labLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <p className="text-slate-400 font-mono text-sm">Loading lab...</p>
      </div>
    );
  }

  if (!lab || labError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center px-6">
        <p className="text-rose-300 font-mono text-sm">
          {labError || "Lab not found."}
        </p>
      </div>
    );
  }

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
                Lab solved
              </h3>
              <p className="text-sm text-slate-300">
                The lab has been solved successfully. {flagResult?.points != null ? `+${flagResult.points} pts` : ""}
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
                {labSolved && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-3 py-1 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Solved
                  </span>
                )}
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
                  {lab.labtype_id === 1
                    ? "WHITE_BOX"
                    : lab.labtype_id === 3
                      ? "ACCESS_CONTROL"
                      : "BLACK_BOX"}
                </span>
                {labSolved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 px-3 py-1 text-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    SOLVED
                  </span>
                )}
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
              {startLabLoading ? "Opening..." : labSolved ? "Start Lab (re-solve)" : "Start Lab"}
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
              <p className="mt-3 text-xs font-mono text-slate-400">
                Current penalty:{" "}
                <span className="text-amber-300">{penaltyPercent}%</span>{" "}
                {maxPoints > 0 && (
                  <>
                    {" "}
                    | Possible score now:{" "}
                    <span className="text-emerald-300">{possiblePoints}</span> /{" "}
                    {maxPoints}
                  </>
                )}
              </p>
            </section>

            {/* Some labs are objective-based (no flag submission UI). */}
            {![1, 5, 7, 10].includes(lab.lab_id) && (
            <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-black/40">
              <h2 className="text-sm font-mono text-slate-300 mb-2 flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                // SUBMIT_FLAG
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-4">
                Enter the flag you captured from the lab environment (port {lab.port ?? 4000}).
              </p>
              {labSolved ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm font-mono text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Lab solved. No need to submit again.</span>
                </div>
              ) : (currentUser?.user_id || currentUser?.id) ? (
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
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-black/40">
              <button
                className="flex w-full items-center justify-between gap-2 text-sm font-mono text-slate-100"
                onClick={() => {
                  setHintsOpen((v) => !v);
                  if (!hintViewed) {
                    setHintViewed(true);
                    markResourceViewed("hint");
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  Hints (-25%)
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
                  Solution (-75%)
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
                        reduce your awarded score by 75%.
                      </p>
                      <button
                        onClick={handleRevealSolution}
                        disabled={solutionLoading}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 py-1.5 text-[11px] text-rose-100 hover:bg-rose-500/30 transition-colors"
                      >
                        {solutionLoading ? "Loading..." : "Reveal Solution"}
                      </button>
                      {solutionError && (
                        <p className="mt-2 text-[11px] text-rose-200">{solutionError}</p>
                      )}
                    </div>
                  )}

                  {solutionConfirm && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-3">
                      <p className="text-emerald-50 text-[11px] whitespace-pre-wrap">
                        {solutionText || "No solution text returned."}
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

