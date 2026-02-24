import React, { useState } from "react";
import {
  ArrowLeft,
  Shield,
  Flame,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";
import { mockLabs } from "../../data/mockData";

const diffBadgeClasses = {
  easy: "bg-emerald-500/10 text-emerald-300 border-emerald-400/50",
  medium: "bg-amber-500/10 text-amber-300 border-amber-400/50",
  hard: "bg-rose-500/10 text-rose-300 border-rose-400/50",
};

const LabDetailsModern = ({ labId, onBack }) => {
  const lab =
    mockLabs.find((l) => String(l.lab_id) === String(labId)) || mockLabs[0];

  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(true);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [solutionConfirm, setSolutionConfirm] = useState(false);

  const handleStartLab = () => {
    // Open isolated sandbox lab application in a NEW window (UI only)
    const url = `http://localhost:4000/?labId=${lab.lab_id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const derivedHints = [
    "Try enumerating input parameters first.",
    "Observe server responses for useful error messages.",
  ];

  const derivedSolution =
    "This is a placeholder solution. Replace this text with the real walkthrough for your lab scenario.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-12 px-4 sm:px-6 lg:px-10">
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
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-400/50 transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              Start Lab
            </button>
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

