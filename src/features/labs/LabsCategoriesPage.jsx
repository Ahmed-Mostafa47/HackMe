import React, { useState, useEffect } from "react";
import {
  Folder,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Plus,
} from "lucide-react";
import { labService } from "../../services/labService";
import { LAB_TYPES } from "../../data/labTypes";
import {
  getCategoriesWithLabs,
  WHITEBOX_CATEGORY_ORDER,
} from "../../utils/labCategories";
import { WHITEBOX_SQL_LAB_ID } from "../../constants/labs";

const LabsCategoriesPage = ({
  labType,
  onSelectCategory,
  onBack,
  onAddLab,
  isAdmin = false,
  isInstructor = false,
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
        const all = res?.data?.labs || [];
        const labTypeId = labType === LAB_TYPES.WHITE_BOX ? 1 : labType === LAB_TYPES.ACCESS_CONTROL ? 3 : 2;
        const filtered = all.filter((lab) => {
          const id = Number(lab.lab_id);
          if (labType === LAB_TYPES.BLACK_BOX) {
            if (lab.labtype_id !== 2 && lab.labtype_id !== 3) return false;
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

  const rawCategories = getCategoriesWithLabs(labs, {
    includeEmptyKeys: labType === LAB_TYPES.BLACK_BOX ? ["game_labs"] : [],
  });
  const categories =
    labType === LAB_TYPES.WHITE_BOX
      ? [...rawCategories].sort((a, b) => {
          const rank = (k) => {
            const i = WHITEBOX_CATEGORY_ORDER.indexOf(k);
            return i === -1 ? 50 : i;
          };
          const d = rank(a.key) - rank(b.key);
          return d !== 0 ? d : a.label.localeCompare(b.label);
        })
      : rawCategories;
  const labTypeLabel =
    labType === LAB_TYPES.WHITE_BOX ? "WHITE_BOX" : labType === LAB_TYPES.ACCESS_CONTROL ? "BROKEN_ACCESS" : "BLACK_BOX";
  const canAddLab =
    (labType === LAB_TYPES.WHITE_BOX || labType === LAB_TYPES.BLACK_BOX) &&
    (isAdmin || isInstructor);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-16 px-4 sm:px-6 lg:px-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 pt-6">
          <p className="text-xs sm:text-sm text-emerald-400 font-mono tracking-[0.2em] uppercase">
            // VULNERABILITY_CATEGORIES
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-50 font-mono">
            Select Category
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-mono">
            {labTypeLabel} labs organized by vulnerability type
          </p>
        </header>

        {(onBack || canAddLab) && (
          <div className="mb-8 flex items-center justify-between gap-4">
            {onBack ? (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-mono text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                BACK
              </button>
            ) : (
              <span />
            )}
            {canAddLab && (
              <button
                type="button"
                onClick={() => onAddLab && onAddLab()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Lab
              </button>
            )}
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
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8 text-center">
            <Folder className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 font-mono">No labs available for this mode.</p>
            <p className="text-slate-500 text-sm font-mono mt-2">
              Try selecting a different training mode.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => onSelectCategory && onSelectCategory(cat.key)}
                className="group w-full flex items-center gap-4 p-4 sm:p-5 rounded-xl border border-slate-700/70
                  bg-gradient-to-br from-slate-900/80 to-slate-950/90
                  hover:border-emerald-400/60 hover:bg-slate-800/50
                  transition-all duration-300 cursor-pointer text-left"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-600 
                  flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-50 font-mono group-hover:text-emerald-300">
                    {cat.label}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {cat.labCount} lab{cat.labCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabsCategoriesPage;
