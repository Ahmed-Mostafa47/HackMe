import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, X, ShieldCheck, FlaskConical, Loader2, User, Download } from "lucide-react";
import { labService } from "../../services/labService";
import { getStoredUserId } from "../../utils/storedUser";

const AdminLabsDashboard = () => {
  const location = useLocation();
  const [catalogLabs, setCatalogLabs] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState("");
  const [proposalActionId, setProposalActionId] = useState(null);
  const [proposalActionError, setProposalActionError] = useState("");
  const [zipDownloadId, setZipDownloadId] = useState(null);

  const currentUserId = getStoredUserId();

  useEffect(() => {
    let mounted = true;
    labService
      .getLabs()
      .then((res) => {
        if (!mounted) return;
        setCatalogLabs(res?.data?.labs || []);
        setCatalogError("");
      })
      .catch((err) => {
        if (!mounted) return;
        setCatalogLabs([]);
        setCatalogError(err?.message || "Failed to load labs from server.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setProposals([]);
      setProposalsLoading(false);
      setProposalsError("Not logged in.");
      return;
    }
    let mounted = true;
    setProposalsLoading(true);
    setProposalsError("");
    labService
      .getLabSubmissionRequests({ userId: currentUserId })
      .then((data) => {
        if (!mounted) return;
        setProposals(data?.data?.requests || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setProposals([]);
        setProposalsError(err?.message || "Failed to load instructor proposals.");
      })
      .finally(() => {
        if (mounted) setProposalsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (location.hash !== "#lab-proposals") return;
    const t = window.setTimeout(() => {
      document.getElementById("lab-proposals")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [location.hash, proposalsLoading]);

  const getLabTypeLabel = (labtypeId) => {
    if (labtypeId === 1) return "WHITE_BOX";
    if (labtypeId === 2) return "BLACK_BOX";
    if (labtypeId === 3) return "ACCESS_CONTROL";
    return "LAB";
  };

  const handleDownloadSubmissionZip = async (req) => {
    if (!currentUserId) return;
    setProposalActionError("");
    setZipDownloadId(req.submission_id);
    try {
      const blob = await labService.downloadLabSubmissionZip({
        userId: currentUserId,
        submissionId: req.submission_id,
      });
      const rawName = req.zip_original_name && /\.zip$/i.test(String(req.zip_original_name))
        ? String(req.zip_original_name)
        : `lab-submission-${req.submission_id}.zip`;
      const safe = rawName.replace(/[^\w.\-]/g, "_") || `lab-submission-${req.submission_id}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safe;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setProposalActionError(err?.message || "ZIP download failed.");
    } finally {
      setZipDownloadId(null);
    }
  };

  const handleApproveProposal = async (req) => {
    if (!currentUserId) return;
    const sid = req.submission_id;
    setProposalActionError("");
    setProposalActionId(sid);
    try {
      await labService.approveLabSubmission({
        userId: currentUserId,
        submissionId: sid,
      });
      setProposals((prev) => prev.filter((r) => r.submission_id !== sid));
      labService
        .getLabs()
        .then((res) => setCatalogLabs(res?.data?.labs || []))
        .catch(() => {});
    } catch (err) {
      setProposalActionError(err?.message || "Approve failed.");
    } finally {
      setProposalActionId(null);
    }
  };

  const handleRejectProposal = async (req) => {
    if (!currentUserId) return;
    const sid = req.submission_id;
    setProposalActionError("");
    setProposalActionId(sid);
    try {
      await labService.rejectLabSubmission({
        userId: currentUserId,
        submissionId: sid,
      });
      setProposals((prev) => prev.filter((r) => r.submission_id !== sid));
    } catch (err) {
      setProposalActionError(err?.message || "Reject failed.");
    } finally {
      setProposalActionId(null);
    }
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
              <span className="text-emerald-300 font-mono">/admin-labs</span> — Review instructor lab proposals
              (below), then the full labs catalog. Notification links open this page at{" "}
              <span className="text-slate-300 font-mono">#lab-proposals</span>.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-400/60 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
        </header>

        <section
          id="lab-proposals"
          className="rounded-2xl border border-cyan-700/50 bg-slate-900/80 p-5 sm:p-6 shadow-xl shadow-black/40 scroll-mt-24"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-400/50 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-mono font-semibold text-slate-50">
                Instructor lab proposals
              </h2>
              <p className="text-xs text-slate-400">
                Pending submissions from instructors (stored in{" "}
                <span className="font-mono text-slate-500">lab_submission_requests</span>).
              </p>
            </div>
          </div>

          {proposalsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : proposalsError ? (
            <div className="rounded-xl border border-rose-700 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
              {proposalsError}
            </div>
          ) : proposals.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 font-mono">
              No pending instructor proposals.
            </div>
          ) : (
            <div className="space-y-4">
              {proposalActionError ? (
                <div className="rounded-xl border border-rose-700 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
                  {proposalActionError}
                </div>
              ) : null}
              {proposals.map((req) => (
                <div
                  key={req.submission_id}
                  className="rounded-xl border border-slate-700 bg-slate-900/90 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-mono font-semibold text-slate-100">
                        {req.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Request #{req.submission_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      {req.submitter_username || `user_id:${req.submitted_by_user_id}`}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{req.description}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 font-mono">
                    <span className="rounded-full border border-slate-600 px-2 py-0.5">
                      Mode: {getLabTypeLabel(req.labtype_id)}
                    </span>
                    <span className="rounded-full border border-slate-600 px-2 py-0.5">
                      OWASP key: {req.owasp_category || "—"}
                    </span>
                    <span className="rounded-full border border-slate-600 px-2 py-0.5">
                      Difficulty: {String(req.difficulty).toUpperCase()}
                    </span>
                    <span className="rounded-full border border-slate-600 px-2 py-0.5">
                      Points: {req.points_total}
                    </span>
                    <span className="rounded-full border border-slate-600 px-2 py-0.5">
                      {req.created_at}
                    </span>
                    {req.has_zip_package ? (
                      <span className="rounded-full border border-cyan-600/50 bg-cyan-950/30 px-2 py-0.5 text-cyan-200">
                        ZIP for lab package
                      </span>
                    ) : null}
                  </div>
                  {(req.hints || req.solution) && (
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      {req.hints ? (
                        <details className="rounded-lg border border-slate-700 bg-slate-950/50 p-2">
                          <summary className="cursor-pointer font-mono text-slate-400">Hints</summary>
                          <pre className="mt-2 whitespace-pre-wrap text-slate-300 font-mono max-h-40 overflow-y-auto">
                            {req.hints}
                          </pre>
                        </details>
                      ) : null}
                      {req.solution ? (
                        <details className="rounded-lg border border-slate-700 bg-slate-950/50 p-2">
                          <summary className="cursor-pointer font-mono text-slate-400">Solution</summary>
                          <pre className="mt-2 whitespace-pre-wrap text-slate-300 font-mono max-h-40 overflow-y-auto">
                            {req.solution}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {req.has_zip_package ? (
                      <button
                        type="button"
                        disabled={zipDownloadId != null || proposalActionId != null}
                        onClick={() => handleDownloadSubmissionZip(req)}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/15 border border-cyan-400/60 px-3 py-1.5 text-[11px] font-mono text-cyan-100 hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
                      >
                        {zipDownloadId === req.submission_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Download ZIP
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={proposalActionId != null}
                      onClick={() => handleApproveProposal(req)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-400/60 px-3 py-1.5 text-[11px] font-mono text-emerald-200 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    >
                      {proposalActionId === req.submission_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={proposalActionId != null}
                      onClick={() => handleRejectProposal(req)}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 border border-rose-400/60 px-3 py-1.5 text-[11px] font-mono text-rose-200 hover:bg-rose-500/25 transition-colors disabled:opacity-50"
                    >
                      {proposalActionId === req.submission_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6 shadow-xl shadow-black/40">
          <h2 className="text-sm font-mono font-semibold text-slate-300 mb-4 uppercase tracking-wide">
            Labs catalog (database)
          </h2>
          {catalogError && (
            <div className="mb-4 rounded-xl border border-rose-700 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
              {catalogError}
            </div>
          )}
          {catalogLabs.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400 font-mono">
              No labs loaded.
            </div>
          ) : (
            <div className="space-y-4">
              {catalogLabs.map((lab) => (
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
                        Type: {getLabTypeLabel(lab.labtype_id)}
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
