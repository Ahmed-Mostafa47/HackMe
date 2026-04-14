import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Shield, Terminal } from "lucide-react";
import { labService } from "../../services/labService";
import { WHITEBOX_SQL_LAB_ID } from "../../constants/labs";
import WhiteboxIdeLab from "./WhiteboxIdeLab";

const diffBadgeClasses = {
  easy: "bg-emerald-500/10 text-emerald-300 border-emerald-400/50",
  medium: "bg-amber-500/10 text-amber-300 border-amber-400/50",
  hard: "bg-rose-500/10 text-rose-300 border-rose-400/50",
};

/**
 * Dedicated white-box lab workspace (separate from black-box /lab-modern).
 */
const LabWhiteboxPage = ({ currentUser, onFlagSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const labId =
    Number(searchParams.get("labId") || String(WHITEBOX_SQL_LAB_ID)) || WHITEBOX_SQL_LAB_ID;
  const fromCategory = searchParams.get("fromCategory");
  const labType = searchParams.get("labType");

  useEffect(() => {
    if (labId !== WHITEBOX_SQL_LAB_ID) {
      navigate(`/lab-modern?labId=${encodeURIComponent(String(labId))}`, { replace: true });
    }
  }, [labId, navigate]);

  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [labSolved, setLabSolved] = useState(false);
  const [successPopupVisible, setSuccessPopupVisible] = useState(false);
  const [successPoints, setSuccessPoints] = useState(null);

  const API_BASE = import.meta.env.DEV ? "/api" : "http://localhost/HackMe/server/api";

  const goBack = () => {
    if (fromCategory && labType) {
      navigate(`/labs?labType=${encodeURIComponent(labType)}&category=${encodeURIComponent(fromCategory)}`);
      return;
    }
    navigate("/labs");
  };

  useEffect(() => {
    if (labId !== WHITEBOX_SQL_LAB_ID) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError("");
    labService
      .getLabDetails(labId)
      .then((res) => {
        if (!mounted) return;
        setLab(res?.data?.lab || null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || "Failed to load lab.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [labId]);

  useEffect(() => {
    const uid = currentUser?.user_id ?? currentUser?.id;
    if (!lab?.lab_id || !uid) {
      setLabSolved(false);
      return;
    }
    setLabSolved(false);
    const abort = new AbortController();
    const check = async () => {
      try {
        const url = `${API_BASE}/labs/check_lab_solved.php?lab_id=${lab.lab_id}&user_id=${uid}&scope=whitebox`;
        const r = await fetch(url, { cache: "no-store", signal: abort.signal });
        const d = await r.json().catch(() => ({}));
        if (abort.signal.aborted) return;
        setLabSolved(d?.solved === true);
      } catch (_) {
        if (!abort.signal.aborted) setLabSolved(false);
      }
    };
    check();
    return () => abort.abort();
  }, [lab?.lab_id, currentUser?.user_id, currentUser?.id]);

  useEffect(() => {
    if (!successPopupVisible) return;
    const t = setTimeout(() => setSuccessPopupVisible(false), 3000);
    return () => clearTimeout(t);
  }, [successPopupVisible]);

  const uid = currentUser?.user_id ?? currentUser?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <p className="text-slate-400 font-mono text-sm">Loading white-box lab…</p>
      </div>
    );
  }

  if (error || !lab) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-rose-300 font-mono text-sm">{error || "Lab not found."}</p>
        <button
          type="button"
          onClick={goBack}
          className="text-xs font-mono text-emerald-400 hover:underline"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-8 px-4 sm:px-6 lg:px-10">
      {successPopupVisible && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-down">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-slate-900/95 backdrop-blur-sm px-5 py-4 shadow-2xl shadow-emerald-500/20">
            <div className="rounded-full bg-emerald-500/20 p-2 flex-shrink-0">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-mono font-semibold text-emerald-200">Lab solved</h3>
              <p className="text-sm text-slate-300">
                The lab has been solved successfully.
                {successPoints != null && successPoints > 0 ? ` +${successPoints} pts` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-emerald-300"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>

        <header className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-6 shadow-lg shadow-emerald-900/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-emerald-300/90">
                <Terminal className="w-4 h-4" />
                White-box source lab
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 font-mono break-words">
                {lab.title}
              </h1>
              <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">{lab.description}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-mono",
                  diffBadgeClasses[lab.difficulty] || "border-slate-600 text-slate-300",
                ].join(" ")}
              >
                {String(lab.difficulty || "medium").toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[11px] font-mono text-sky-200">
                <Shield className="w-3.5 h-3.5" />
                WHITE_BOX
              </span>
              {labSolved && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-1 text-[11px] font-mono text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Solved
                </span>
              )}
            </div>
          </div>
          <p className="mt-4 text-[11px] font-mono text-slate-500 border-t border-slate-700/80 pt-4">
            Use the workbench below to inspect source and submit your fix. White-box completion is tracked separately
            from black-box (flags / container); solving one does not mark the other as done.
          </p>
        </header>

        {!uid ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-center">
            <p className="text-sm font-mono text-slate-400">Log in to load sources and submit your patch.</p>
          </section>
        ) : (
          <WhiteboxIdeLab
            labId={labId}
            userId={Number(uid)}
            labSolved={labSolved}
            onSolved={({ points, already }) => {
              setLabSolved(true);
              onFlagSuccess?.();
              if (!already) {
                setSuccessPoints(typeof points === "number" ? points : null);
                setSuccessPopupVisible(true);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LabWhiteboxPage;
