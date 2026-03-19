import React, { useEffect, useState } from "react";
import { Check, X, ShieldCheck } from "lucide-react";
import { labService } from "../../services/labService";

const AdminLabsDashboard = () => {
  const [pendingLabs, setPendingLabs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    labService
      .getLabs()
      .then((res) => {
        if (!mounted) return;
        setPendingLabs(res?.data?.labs || []);
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;
        setPendingLabs([]);
        setError(err?.message || "Failed to load labs from server.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const getLabTypeLabel = (labtypeId) => {
    if (labtypeId === 1) return "WHITE_BOX";
    if (labtypeId === 2) return "BLACK_BOX";
    if (labtypeId === 3) return "ACCESS_CONTROL";
    return "LAB";
  };

  const handleApprove = (lab) => {
    console.log("Approve lab:", lab.lab_id);
  };

  const handleReject = (lab) => {
    console.log("Reject lab:", lab.lab_id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-14 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="pt-6">
            <p className="text-xs text-emerald-400 font-mono tracking-[0.2em] uppercase">
              // ADMIN_LABS_DASHBOARD
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-50 font-mono">
              Labs Governance
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Review DB-powered labs metadata. Approval actions are kept as UI
              placeholders until dedicated endpoints are connected.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-400/60 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6 shadow-xl shadow-black/40">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-700 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
              {error}
            </div>
          )}
          {pendingLabs.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400 font-mono">
              No pending labs. All clear.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLabs.map((lab) => (
                <div
                  key={lab.lab_id}
                  className="rounded-xl border border-slate-700 bg-slate-900/90 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h2 className="text-sm sm:text-base font-mono font-semibold text-slate-100">
                      {lab.title}
                    </h2>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {lab.description}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 font-mono mt-1.5">
                      <span className="rounded-full border border-slate-600 px-2 py-0.5">
                        Category: {getLabTypeLabel(lab.labtype_id)}
                      </span>
                      <span className="rounded-full border border-slate-600 px-2 py-0.5">
                        Difficulty: {String(lab.difficulty).toUpperCase()}
                      </span>
                      <span className="rounded-full border border-slate-600 px-2 py-0.5">
                        Points: {lab.points_total ?? 0}
                      </span>
                      <span className="rounded-full border border-slate-600 px-2 py-0.5">
                        Port: {lab.port ?? "N/A"}
                      </span>
                      <span className="rounded-full border border-slate-600 px-2 py-0.5">
                        Visibility: {String(lab.visibility || "private").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2">
                    <button
                      onClick={() => handleApprove(lab)}
                      disabled
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-400/60 px-3 py-1.5 text-[11px] font-mono text-emerald-200 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve (Soon)
                    </button>
                    <button
                      onClick={() => handleReject(lab)}
                      disabled
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 border border-rose-400/60 px-3 py-1.5 text-[11px] font-mono text-rose-200 hover:bg-rose-500/25 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject (Soon)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminLabsDashboard;

