import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Shield,
  Layers,
  ArrowUpRight,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Plus,
} from "lucide-react";
import { labService } from "../../services/labService";
import { LAB_TYPES } from "../../data/labTypes";
import { getCategoryFromLabTitle } from "../../utils/labCategories";

const difficultyColors = {
  easy: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  hard: "bg-rose-500/10 text-rose-300 border-rose-500/40",
};

const labTypeLabel = {
  1: "WHITE_BOX",
  2: "BLACK_BOX",
  3: "ACCESS_CONTROL",
};

const LabsListModern = ({
  selectedLabType,
  isAdmin = false,
  isInstructor = false,
  onEditLab,
  onRemoveLab,
  onLabClick,
  labType,
  category,
  onBack,
  onAddLab,
}) => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    labService
      .getLabs()
      .then((res) => {
        if (!mounted) return;
        setLabs(res?.data?.labs || []);
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
  }, []);

  const labTypeId = labType === LAB_TYPES.WHITE_BOX ? 1 : labType === LAB_TYPES.BLACK_BOX ? 2 : labType === LAB_TYPES.ACCESS_CONTROL ? 3 : null;
  const filteredLabs = labs.filter((lab) => {
    if (labTypeId != null) {
      if (labTypeId === 2) {
        if (lab.labtype_id !== 2 && lab.labtype_id !== 3) return false;
      } else if (lab.labtype_id !== labTypeId) return false;
    }
    if (category) {
      const labCat = getCategoryFromLabTitle(lab.title);
      if (labCat !== category) return false;
    }
    return true;
  });
  const canAddLab =
    (labType === LAB_TYPES.WHITE_BOX || labType === LAB_TYPES.BLACK_BOX) &&
    (isAdmin || isInstructor);

  const handleOpenLab = (lab) => {
    if (onLabClick) {
      onLabClick(lab);
    } else {
      const q = new URLSearchParams({ labId: lab.lab_id });
      if (category) q.set("fromCategory", category);
      if (labType) q.set("labType", labType);
      window.location.href = `/lab-modern?${q.toString()}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-16 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="mb-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <br />
            <br />
            <p className="text-xs sm:text-sm text-emerald-400 font-mono tracking-[0.2em] uppercase">
              // LABS_SYSTEM
            </p>

            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-50 font-mono">
              Cyber Labs Hub
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl">
              Launch hands-on offensive security labs in a safe, isolated
              environment. Perfect for training operatives and students.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FlaskConical className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-xs sm:text-sm text-slate-400 font-mono">
              <p className="text-emerald-300 font-semibold">
                LIVE_EXPERIMENTS_READY
              </p>
              <p>// SELECT_TARGET_AND_DEPLOY</p>
            </div>
            {canAddLab && (
              <button
                type="button"
                onClick={() => onAddLab && onAddLab()}
                className="ml-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Lab
              </button>
            )}
          </div>
        </header>

        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-mono text-slate-400 hover:text-emerald-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO CATEGORIES
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-700 bg-rose-950/30 p-8 text-center">
            <p className="text-rose-300 font-mono">{error}</p>
          </div>
        ) : filteredLabs.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400 font-mono">No labs in this category.</p>
          </div>
        ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {(labType != null || category != null ? filteredLabs : labs).map((lab) => (
            <article
              key={lab.lab_id}
              onClick={() => handleOpenLab(lab)}
              className="group relative flex flex-col w-full rounded-2xl border border-slate-700/70 
              bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 
              p-5 sm:p-6 
              shadow-xl shadow-black/40 
              hover:border-emerald-400/70 hover:shadow-emerald-500/30 
              transition-all duration-300 cursor-pointer"
            >
              {/* HEADER ROW */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
                {/* LEFT SIDE */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-800/80 border border-slate-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-50 font-mono truncate group-hover:text-emerald-300 transition-colors">
                      {lab.title}
                    </h2>

                    <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400 uppercase tracking-[0.18em] font-mono">
                      {labTypeLabel[lab.labtype_id] ?? "LAB"}
                    </p>
                  </div>
                </div>

                {/* DIFFICULTY */}
                <span
                  className={[
                    "inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-wide",
                    difficultyColors[lab.difficulty] ||
                      "bg-slate-700/40 text-slate-200 border-slate-500/60",
                  ].join(" ")}
                >
                  {lab.difficulty?.toUpperCase()}
                </span>
              </div>

              {/* DESCRIPTION */}
              <p className="mt-4 text-sm text-slate-300 line-clamp-3">
                {lab.description}
              </p>

              {/* INFO ROW */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] sm:text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>LAB_ID::{lab.lab_id}</span>
                </div>

                <div className="flex items-center gap-1 text-emerald-300 group-hover:translate-x-1 transition-transform">
                  <span>OPEN_LAB</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              {(isAdmin || isInstructor) && (
                <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditLab && onEditLab(lab);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg 
                    border border-slate-600 bg-slate-800/80 
                    px-3 py-1.5 text-[11px] font-mono text-slate-200 
                    hover:border-emerald-400 hover:text-emerald-300 
                    transition-colors w-full sm:w-auto"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveLab && onRemoveLab(lab);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg 
                    border border-rose-500/60 bg-rose-500/10 
                    px-3 py-1.5 text-[11px] font-mono text-rose-200 
                    hover:bg-rose-500/20 transition-colors 
                    w-full sm:w-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};

export default LabsListModern;
