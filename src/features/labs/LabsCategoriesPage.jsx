import React, { useState, useMemo, useEffect } from "react";
import {
  Folder,
  ArrowLeft,
  Loader2,
  ChevronDown,
  FlaskConical,
  ArrowUpRight,
} from "lucide-react";
import { labService } from "../../services/labService";
import { LAB_TYPES } from "../../data/labTypes";
import { getCategoriesWithLabs, getCategoryKeyForLab } from "../../utils/labCategories";
import { WHITEBOX_SQL_LAB_ID } from "../../constants/labs";

const difficultyDot = {
  easy: "bg-emerald-400",
  medium: "bg-amber-400",
  hard: "bg-rose-400",
};

const LabsCategoriesPage = ({
  labType,
  onSelectCategory,
  onBack,
  /** (lab, categoryKey) — open lab route; if omitted, lab rows only highlight category */
  onOpenLab,
}) => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** category keys that are collapsed; default: none collapsed (all open) */
  const [collapsed, setCollapsed] = useState(() => new Set());

  useEffect(() => {
    let mounted = true;
    labService
      .getLabs()
      .then((res) => {
        if (!mounted) return;
        const all = res?.data?.labs || [];
        const labTypeId = labType === LAB_TYPES.WHITE_BOX ? 1 : labType === LAB_TYPES.ACCESS_CONTROL ? 3 : 2;
        const filtered = all.filter((lab) => {
          const id = Number(lab.lab_id);
          if (labType === LAB_TYPES.BLACK_BOX) {
            if (id !== 40 && id !== 41 && lab.labtype_id !== 2 && lab.labtype_id !== 3) return false;
            return true;
          }
          if (labType === LAB_TYPES.WHITE_BOX) {
            if (id === 1) return false;
            return lab.labtype_id === 1 || id === WHITEBOX_SQL_LAB_ID;
          }
          if (labType === LAB_TYPES.ACCESS_CONTROL) {
            return lab.labtype_id === 3 || id === 18 || id === 19;
          }
          return lab.labtype_id === labTypeId;
        });
        setLabs(filtered);
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;
        setLabs([]);
        setError(err?.message || "Failed to load labs from server.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [labType]);

  const categories = getCategoriesWithLabs(labs);

  const labsByCategory = useMemo(() => {
    const bucket = {};
    labs.forEach((lab) => {
      const k = getCategoryKeyForLab(lab);
      if (!bucket[k]) bucket[k] = [];
      bucket[k].push(lab);
    });
    Object.keys(bucket).forEach((k) => {
      bucket[k].sort((a, b) => Number(a.lab_id) - Number(b.lab_id));
    });
    return bucket;
  }, [labs]);

  const toggleFolder = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isExpanded = (key) => !collapsed.has(key);

  const labTypeLabel =
    labType === LAB_TYPES.WHITE_BOX
      ? "WHITE_BOX"
      : labType === LAB_TYPES.ACCESS_CONTROL
        ? "BROKEN_ACCESS"
        : "BLACK_BOX";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-16 px-4 sm:px-6 lg:px-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 pt-6">
          <p className="text-xs sm:text-sm text-emerald-400 font-mono tracking-[0.2em] uppercase">
            // LAB_FOLDERS
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-50 font-mono">
            Lab folders
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-mono max-w-2xl">
            Mode: <span className="text-emerald-300">{labTypeLabel}</span>
            <span className="text-slate-500"> · </span>
            Each folder is a vulnerability category; labs inside open on click. Use{" "}
            <span className="text-slate-300">grid view</span> for the full card layout.
          </p>
        </header>

        {onBack && (
          <div className="mb-8 flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-mono text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-700 bg-rose-950/30 p-8 text-center">
            <p className="text-rose-300 font-mono">{error}</p>
          </div>
        ) : (
          <>
            {labs.length === 0 && (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8 text-center mb-6">
                <Folder className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 font-mono">No labs loaded for this mode yet.</p>
                <p className="text-slate-500 text-sm font-mono mt-2">
                  Folders still list categories; empty folders show no inner labs.
                </p>
              </div>
            )}
            <div className="space-y-4">
              {categories.map((cat) => {
                const innerLabs = labsByCategory[cat.key] || [];
                const expanded = isExpanded(cat.key);

                return (
                  <div
                    key={cat.key}
                    className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/95 shadow-lg shadow-black/30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFolder(cat.key)}
                      className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-slate-800/40 transition-colors"
                      aria-expanded={expanded}
                    >
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-600
                        flex items-center justify-center text-2xl shadow-inner shadow-black/20"
                      >
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg font-semibold text-slate-50 font-mono truncate">
                          {cat.label}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">
                          {cat.labCount} lab{cat.labCount !== 1 ? "s" : ""} ·{" "}
                          <span className="text-slate-400">{expanded ? "collapse" : "expand"}</span>
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-200 ${
                          expanded ? "rotate-180 text-emerald-400/80" : ""
                        }`}
                      />
                    </button>

                    {expanded && (
                      <div className="border-t border-slate-800/90 bg-slate-950/50 px-3 sm:px-5 py-4">
                        {innerLabs.length === 0 ? (
                          <p className="text-xs text-slate-500 font-mono pl-2 py-2">
                            No labs in this folder yet.
                          </p>
                        ) : (
                          <ul className="space-y-1.5">
                            {innerLabs.map((lab) => {
                              const diff = String(lab.difficulty || "easy").toLowerCase();
                              const dot = difficultyDot[diff] || "bg-slate-500";
                              return (
                                <li key={lab.lab_id}>
                                  <button
                                    type="button"
                                    disabled={!onOpenLab}
                                    onClick={() => onOpenLab && onOpenLab(lab, cat.key)}
                                    className={[
                                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left font-mono text-sm",
                                      "border border-slate-800/80 bg-slate-900/60 hover:border-emerald-500/50 hover:bg-slate-800/60",
                                      "transition-colors group/lab",
                                      !onOpenLab ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                                    ].join(" ")}
                                  >
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} aria-hidden />
                                    <FlaskConical className="w-4 h-4 text-slate-500 group-hover/lab:text-emerald-400 shrink-0" />
                                    <span className="flex-1 min-w-0 truncate text-slate-200 group-hover/lab:text-emerald-200">
                                      {lab.title}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wide text-slate-500 shrink-0 hidden sm:inline">
                                      #{lab.lab_id}
                                    </span>
                                    {lab.coming_soon ? (
                                      <span className="text-[10px] text-amber-300/90 shrink-0">SOON</span>
                                    ) : (
                                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover/lab:text-emerald-400 shrink-0" />
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        <div className="mt-4 pt-3 border-t border-slate-800/70">
                          <button
                            type="button"
                            onClick={() => onSelectCategory && onSelectCategory(cat.key)}
                            className="text-xs font-mono text-emerald-400/90 hover:text-emerald-300 transition-colors inline-flex items-center gap-1.5"
                          >
                            Open grid view for this category
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LabsCategoriesPage;
