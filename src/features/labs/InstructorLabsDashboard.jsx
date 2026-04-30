import React, { useEffect, useState } from "react";
import {
  Plus,
  Upload,
  FileArchive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { labService } from "../../services/labService";
import { LAB_TYPES } from "../../data/labTypes";
import { OWASP_TOP_10 } from "../../utils/labCategories";
import { getStoredUserId } from "../../utils/storedUser";

const buildInitialForm = () => ({
  title: "",
  description: "",
  lab_mode: LAB_TYPES.WHITE_BOX,
  difficulty: "easy",
  category: OWASP_TOP_10[0].key,
  points_total: 100,
  hints: "",
  solution: "",
});

const statusColors = {
  pending:
    "bg-amber-500/10 text-amber-300 border-amber-400/50 shadow-amber-500/20",
  approved:
    "bg-emerald-500/10 text-emerald-300 border-emerald-400/50 shadow-emerald-500/20",
  rejected:
    "bg-rose-500/10 text-rose-300 border-rose-400/50 shadow-rose-500/20",
};

const InstructorLabsDashboard = () => {
  const [labs, setLabs] = useState([]);
  const [labsError, setLabsError] = useState("");
  const [form, setForm] = useState(buildInitialForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zipFile, setZipFile] = useState(null);
  const [uploadingZip, setUploadingZip] = useState(false);
  const [finalizingZip, setFinalizingZip] = useState(false);
  const [zipResult, setZipResult] = useState(null);
  const [zipError, setZipError] = useState("");
  const [proposalZipAttached, setProposalZipAttached] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    lab_id: 0,
    title: "",
    description: "",
    labtype_id: 1,
    difficulty: "easy",
    points_total: 0,
    visibility: "public",
    is_published: true,
    icon: "",
    launch_path: "",
    port: "",
  });
  const getLabTypeLabel = (labtypeId) => {
    if (labtypeId === 1) return "WHITE_BOX";
    if (labtypeId === 2) return "BLACK_BOX";
    if (labtypeId === 3) return "ACCESS_CONTROL";
    return "LAB";
  };

  useEffect(() => {
    let mounted = true;
    labService
      .getLabs()
      .then((res) => {
        if (!mounted) return;
        setLabs(res?.data?.labs || []);
        setLabsError("");
      })
      .catch((err) => {
        if (!mounted) return;
        setLabs([]);
        setLabsError(err?.message || "Failed to load labs from server.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const currentUserId = getStoredUserId();

  const handleSubmitLab = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);
    if (!currentUserId) {
      setSubmitError("Missing logged-in user id.");
      return false;
    }
    if (!form.title.trim() || !form.description.trim()) {
      setSubmitError("Title and description are required.");
      return false;
    }
    setSubmitLoading(true);
    setProposalZipAttached(false);
    try {
      const labtype_id = form.lab_mode === LAB_TYPES.BLACK_BOX ? 2 : 1;
      const res = await labService.submitLabProposal({
        userId: currentUserId,
        title: form.title.trim(),
        description: form.description.trim(),
        labtypeId: labtype_id,
        difficulty: form.difficulty,
        pointsTotal: Number(form.points_total) || 0,
        owaspCategory: form.category,
        hints: form.hints,
        solution: form.solution,
        uploadToken: zipResult?.upload_token || "",
        zipOriginalName: zipFile?.name || "",
      });
      setProposalZipAttached(!!res?.data?.zip_packaged);
      setSubmitSuccess(true);
      setForm(buildInitialForm());
      setZipResult(null);
      setZipFile(null);
      return true;
    } catch (err) {
      setSubmitError(err?.message || "Submit failed.");
      return false;
    } finally {
      setSubmitLoading(false);
    }
  };

  const onZipPicked = (file) => {
    setZipError("");
    setZipResult(null);
    if (!file) {
      setZipFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setZipFile(null);
      setZipError("Only .zip files are accepted.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setZipFile(null);
      setZipError("ZIP exceeds 20 MB size limit.");
      return;
    }
    setZipFile(file);
  };

  const handleValidateZip = async () => {
    if (!zipFile) {
      setZipError("Please select a ZIP file first.");
      return;
    }
    if (!currentUserId) {
      setZipError("Missing logged-in user id.");
      return;
    }
    setUploadingZip(true);
    setZipError("");
    setZipResult(null);
    try {
      const res = await labService.uploadLabZip({ file: zipFile, userId: currentUserId });
      setZipResult(res?.data || null);
    } catch (err) {
      setZipError(err?.message || "ZIP validation failed.");
    } finally {
      setUploadingZip(false);
    }
  };

  const handleFinalizeZip = async () => {
    if (!zipResult?.upload_token) {
      setZipError("Validate ZIP first to get an upload token.");
      return;
    }
    if (!currentUserId) {
      setZipError("Missing logged-in user id.");
      return;
    }
    setFinalizingZip(true);
    setZipError("");
    try {
      const done = await labService.finalizeLabUpload({
        userId: currentUserId,
        uploadToken: zipResult.upload_token,
      });
      const labId = done?.data?.lab_id;
      setZipResult((prev) => ({ ...(prev || {}), finalized_lab_id: labId }));
      setZipFile(null);
      // refresh list
      const fresh = await labService.getLabs();
      setLabs(fresh?.data?.labs || []);
    } catch (err) {
      setZipError(err?.message || "Failed to save lab package.");
    } finally {
      setFinalizingZip(false);
    }
  };

  const handleOpenEdit = (lab) => {
    setEditError("");
    setEditForm({
      lab_id: Number(lab.lab_id) || 0,
      title: String(lab.title || ""),
      description: String(lab.description || ""),
      labtype_id: Number(lab.labtype_id) || 1,
      difficulty: String(lab.difficulty || "easy"),
      points_total: Number(lab.points_total || 0),
      visibility: String(lab.visibility || "public"),
      is_published: !!lab.is_published,
      icon: String(lab.icon || ""),
      launch_path: String(lab.launch_path || ""),
      port: lab.port != null ? String(lab.port) : "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!currentUserId) {
      setEditError("Missing logged-in user id.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await labService.updateLabMetadata({
        userId: currentUserId,
        labId: editForm.lab_id,
        title: editForm.title,
        description: editForm.description,
        difficulty: editForm.difficulty,
        pointsTotal: Number(editForm.points_total || 0),
        visibility: editForm.visibility,
        isPublished: !!editForm.is_published,
        icon: editForm.icon,
        launchPath: editForm.launch_path,
        port: editForm.port === "" ? null : Number(editForm.port),
        labtypeId: editForm.labtype_id,
      });
      const updated = res?.data?.lab;
      if (updated?.lab_id) {
        setLabs((prev) =>
          prev.map((l) =>
            Number(l.lab_id) === Number(updated.lab_id) ? { ...l, ...updated } : l
          )
        );
      }
      setEditOpen(false);
    } catch (err) {
      setEditError(err?.message || "Failed to update lab metadata.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleRemoveLab = async (lab) => {
    if (!currentUserId) {
      window.alert("Missing logged-in user id.");
      return;
    }
    const ok = window.confirm(
      `Delete "${lab?.title || "this lab"}"? This action cannot be undone.`
    );
    if (!ok) return;
    try {
      await labService.deleteLab({
        userId: currentUserId,
        labId: Number(lab?.lab_id) || 0,
      });
      setLabs((prev) => prev.filter((l) => Number(l.lab_id) !== Number(lab.lab_id)));
    } catch (err) {
      window.alert(err?.message || "Failed to delete lab.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-14 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
          <div className="space-y-2 pt-6">
            <p className="text-xs text-emerald-400 font-mono tracking-[0.2em] uppercase">
              // INSTRUCTOR_DASHBOARD
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 font-mono">
              Labs Management Console
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Manage DB-powered labs, review metadata, and prepare new labs for
              future create/edit APIs.
            </p>
          </div>

          <div className="w-full md:w-auto flex justify-start md:justify-end">
            <button
              type="button"
              onClick={() => {
                setSubmitError("");
                setSubmitSuccess(false);
                setIsModalOpen(true);
              }}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Lab
            </button>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)] items-start">
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6 shadow-xl shadow-black/40">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-400/50 flex items-center justify-center">
                <Plus className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-mono font-semibold text-slate-50">
                  Add New Lab (Secure ZIP Upload)
                </h2>
                <p className="text-xs text-slate-400">
                  Upload a lab package ZIP and validate it before creating the lab entry.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-4 mb-5 space-y-4">
              <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                Validate a ZIP here first; when you submit an <span className="text-slate-300">Add Lab</span> proposal
                (form below or modal), the same validated package is attached for admins to download.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <FileArchive className="w-4 h-4 text-emerald-300" />
                ZIP Package Required Structure:
                <span className="text-slate-500">lab-files/ only (metadata/PDFs optional)</span>
              </div>
              <label
                className="block rounded-xl border-2 border-dashed border-slate-600 hover:border-emerald-400/70 transition-colors p-5 cursor-pointer bg-slate-900/40"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer?.files?.[0];
                  if (dropped) onZipPicked(dropped);
                }}
              >
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(e) => onZipPicked(e.target.files?.[0] || null)}
                />
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-emerald-300" />
                  <div className="text-xs font-mono">
                    <p className="text-slate-200">Drag and drop ZIP here, or click to choose</p>
                    <p className="text-slate-500 mt-1">Max size: 20MB, extension: .zip only</p>
                    {zipFile && <p className="text-emerald-300 mt-1">Selected: {zipFile.name}</p>}
                  </div>
                </div>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!zipFile || uploadingZip}
                  onClick={handleValidateZip}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-400/60 px-3 py-1.5 text-[11px] font-mono text-emerald-200 disabled:opacity-50"
                >
                  {uploadingZip ? "Validating..." : "Validate ZIP"}
                </button>
                <button
                  type="button"
                  disabled={!zipResult?.upload_token || finalizingZip}
                  onClick={handleFinalizeZip}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 border border-sky-400/60 px-3 py-1.5 text-[11px] font-mono text-sky-200 disabled:opacity-50"
                >
                  {finalizingZip ? "Saving..." : "Save Lab Package"}
                </button>
              </div>

              {zipError && (
                <div className="rounded-lg border border-rose-600/60 bg-rose-500/10 px-3 py-2 text-[11px] font-mono text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{zipError}</span>
                </div>
              )}

              {zipResult && (
                <div className="rounded-lg border border-emerald-600/60 bg-emerald-500/10 px-3 py-3 text-[11px] font-mono text-emerald-100 space-y-2">
                  <p className="text-emerald-300">Validation passed</p>
                  <p>Title: {zipResult?.metadata?.title || "N/A"}</p>
                  <p>Difficulty: {String(zipResult?.metadata?.difficulty || "N/A").toUpperCase()}</p>
                  <p>Category: {zipResult?.metadata?.category || "N/A"}</p>
                  <p>Type: {String(zipResult?.metadata?.type || "N/A").toUpperCase()}</p>
                  {!!zipResult?.warnings?.length && (
                    <div className="text-amber-200">
                      Warnings: {zipResult.warnings.join(" | ")}
                    </div>
                  )}
                  {zipResult?.finalized_lab_id ? (
                    <p className="text-sky-200">Saved as lab ID: {zipResult.finalized_lab_id}</p>
                  ) : null}
                </div>
              )}
            </div>

            <form
              className="space-y-4 text-sm text-slate-100"
              onSubmit={handleSubmitLab}
            >
              {submitError && (
                <div className="rounded-lg border border-rose-600/60 bg-rose-500/10 px-3 py-2 text-xs font-mono text-rose-200">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="rounded-lg border border-emerald-600/60 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-200 space-y-1">
                  <p>Proposal saved. Administrators were notified (in-app).</p>
                  {proposalZipAttached ? (
                    <p className="text-emerald-300/95">
                      Validated ZIP was copied for admins — they can download it from Admin Labs.
                    </p>
                  ) : null}
                </div>
              )}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Lab Title
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Web Application SQL Injection"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[80px]"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="High-level overview of the lab and learning objectives."
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Lab mode (white box vs black box)
                </label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                  value={form.lab_mode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lab_mode: e.target.value }))
                  }
                >
                  <option value={LAB_TYPES.WHITE_BOX}>
                    White box — source / internal view (DB labtype_id: 1)
                  </option>
                  <option value={LAB_TYPES.BLACK_BOX}>
                    Black box — external only, no source (DB labtype_id: 2)
                  </option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Difficulty
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, difficulty: e.target.value }))
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Points reward
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={form.points_total}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        points_total: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  OWASP Top 10 category (vulnerability type)
                </label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  {OWASP_TOP_10.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.code}: {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Hints (one per line)
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[70px]"
                  value={form.hints}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hints: e.target.value }))
                  }
                  placeholder={"Hint 1\nHint 2\nHint 3"}
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Solution
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[90px]"
                  value={form.solution}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, solution: e.target.value }))
                  }
                  placeholder="Detailed walkthrough of the intended solution."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitLoading ? "Submitting…" : "Submit Lab for Approval"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6 shadow-xl shadow-black/40">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-slate-800/80 border border-slate-600 flex items-center justify-center">
                <Tag className="w-5 h-5 text-slate-200" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-mono font-semibold text-slate-50">
                  Labs Loaded From Database
                </h2>
                <p className="text-xs text-slate-400">
                  Published labs and metadata currently available through API.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {labsError && (
                <div className="rounded-xl border border-rose-700 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
                  {labsError}
                </div>
              )}
              {labs.map((lab) => (
                <div
                  key={lab.lab_id}
                  className="rounded-xl border border-slate-700 bg-slate-900/90 p-4 flex flex-col gap-3 sm:gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-mono font-semibold text-slate-100">
                        {lab.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {lab.description}
                      </p>
                    </div>

                    <div
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-wide shadow self-start sm:self-auto",
                        lab.is_published
                          ? statusColors["approved"]
                          : statusColors["pending"],
                      ].join(" ")}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {lab.is_published ? "Published" : "Draft"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 font-mono">
                    <span className="rounded-full border border-slate-600 px-2 py-0.5">
                      Type: {getLabTypeLabel(lab.labtype_id)}
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

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(lab)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-[11px] font-mono text-slate-200 hover:border-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLab(lab)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-[11px] font-mono text-rose-200 hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-400/60 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-mono font-semibold text-slate-50">
                      Add New Lab
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Saved to DB; admins get a notification. If you validated a ZIP on this page first, it is sent with
                      the proposal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                className="px-5 py-4 space-y-4 text-sm text-slate-100 max-h-[75vh] overflow-y-auto"
                onSubmit={async (e) => {
                  const ok = await handleSubmitLab(e);
                  if (ok) setIsModalOpen(false);
                }}
              >
                {submitError && (
                  <div className="rounded-lg border border-rose-600/60 bg-rose-500/10 px-3 py-2 text-xs font-mono text-rose-200">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="rounded-lg border border-emerald-600/60 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-200 space-y-1">
                    <p>Proposal saved. Administrators were notified.</p>
                    {proposalZipAttached ? (
                      <p className="text-emerald-300/95">
                        ZIP attached for admin download (Admin Labs → lab proposals).
                      </p>
                    ) : null}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Lab Title
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="e.g. Web Application SQL Injection"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[80px]"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="High-level overview of the lab and learning objectives."
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Lab mode (white box vs black box)
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={form.lab_mode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lab_mode: e.target.value }))
                    }
                  >
                    <option value={LAB_TYPES.WHITE_BOX}>
                      White box — source / internal view (DB labtype_id: 1)
                    </option>
                    <option value={LAB_TYPES.BLACK_BOX}>
                      Black box — external only, no source (DB labtype_id: 2)
                    </option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Difficulty
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                      value={form.difficulty}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          difficulty: e.target.value,
                        }))
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">
                      Points reward
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                      value={form.points_total}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          points_total: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      placeholder="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    OWASP Top 10 category (vulnerability type)
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  >
                    {OWASP_TOP_10.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.code}: {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Hints (one per line)
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[70px]"
                    value={form.hints}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hints: e.target.value }))
                    }
                    placeholder={"Hint 1\nHint 2\nHint 3"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Solution
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[90px]"
                    value={form.solution}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, solution: e.target.value }))
                    }
                    placeholder="Detailed walkthrough of the intended solution."
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs sm:text-sm font-mono text-slate-200 hover:border-slate-400 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {submitLoading ? "Submitting…" : "Submit Lab"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h2 className="text-sm sm:text-base font-mono font-semibold text-slate-50">
                  Edit Lab Metadata (No code/files)
                </h2>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                className="px-5 py-4 space-y-4 text-sm text-slate-100 max-h-[75vh] overflow-y-auto"
                onSubmit={handleSaveEdit}
              >
                {editError && (
                  <div className="rounded-lg border border-rose-700 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
                    {editError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">Lab Title</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">Description</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 min-h-[90px]"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Lab mode (white box vs black box)
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                    value={String(editForm.labtype_id)}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, labtype_id: Number(e.target.value) || 1 }))
                    }
                  >
                    <option value="1">White box (labtype_id: 1)</option>
                    <option value="2">Black box (labtype_id: 2)</option>
                    <option value="3">Broken access / access control (labtype_id: 3)</option>
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Difficulty</label>
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                      value={editForm.difficulty}
                      onChange={(e) => setEditForm((f) => ({ ...f, difficulty: e.target.value }))}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Points</label>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                      value={editForm.points_total}
                      onChange={(e) => setEditForm((f) => ({ ...f, points_total: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Visibility</label>
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                      value={editForm.visibility}
                      onChange={(e) => setEditForm((f) => ({ ...f, visibility: e.target.value }))}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="unlisted">Unlisted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Published</label>
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                      value={editForm.is_published ? "1" : "0"}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, is_published: e.target.value === "1" }))
                      }
                    >
                      <option value="1">Published</option>
                      <option value="0">Draft</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Port</label>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                      value={editForm.port}
                      onChange={(e) => setEditForm((f) => ({ ...f, port: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Launch Path</label>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                      value={editForm.launch_path}
                      onChange={(e) => setEditForm((f) => ({ ...f, launch_path: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs sm:text-sm font-mono text-slate-200 hover:border-slate-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {editSaving ? "Saving..." : "Save Metadata"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorLabsDashboard;

