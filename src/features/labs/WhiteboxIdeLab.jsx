import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileCode, Folder, Play, ShieldCheck, Terminal } from "lucide-react";
import { labService } from "../../services/labService";
import { WHITEBOX_SQL_LAB_ID } from "../../constants/labs";

const splitLines = (text) => {
  if (text == null) return [""];
  const s = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return s.length ? s.split("\n") : [""];
};

const WhiteboxIdeLab = ({
  labId,
  userId,
  labSolved,
  onSolved,
}) => {
  const [payload, setPayload] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [activePath, setActivePath] = useState("");
  const [sourceFile, setSourceFile] = useState("");
  const [lineNo, setLineNo] = useState("");
  const [replacement, setReplacement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const gutterRef = useRef(null);
  const codeRef = useRef(null);

  const reload = useCallback(async () => {
    if (!labId || !userId) return;
    setLoading(true);
    setLoadError("");
    try {
      const data = await labService.getWhiteboxLab({ labId, userId });
      setPayload(data?.data ?? null);
      const files = data?.data?.files ?? [];
      const first = files[0];
      const rel = first?.relative_path ?? "";
      setActivePath(rel);
      setSourceFile(rel);
      setLineNo("");
      setFeedback(null);
    } catch (e) {
      setPayload(null);
      setLoadError(e?.message || "Could not load white-box sources.");
    } finally {
      setLoading(false);
    }
  }, [labId, userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeFile = useMemo(() => {
    const files = payload?.files ?? [];
    return files.find((f) => f.relative_path === activePath) ?? files[0] ?? null;
  }, [payload, activePath]);

  const lines = useMemo(() => splitLines(activeFile?.content ?? ""), [activeFile]);

  useEffect(() => {
    if (!activeFile) return;
    setSourceFile(activeFile.relative_path ?? "");
  }, [activeFile]);

  const syncScroll = (e) => {
    const g = gutterRef.current;
    if (g) g.scrollTop = e.target.scrollTop;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || labSolved || submitting) return;
    const line = parseInt(String(lineNo).trim(), 10);
    if (!sourceFile.trim() || !replacement.trim() || line < 1) {
      setFeedback({ ok: false, text: "Fill in file, line, and replacement code." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await labService.submitWhiteboxFix({
        labId,
        userId,
        accessToken: "",
        sourceFile: sourceFile.trim(),
        line,
        replacementCode: replacement,
      });
      const pts = Number(res?.data?.points_earned ?? 0);
      const demoOk =
        res?.success &&
        (res?.message === "LAB_VERIFIED_DEMO_MODE" || res?.data?.demo_mode === true);
      if (demoOk) {
        const detail = res?.data?.verify_detail?.trim() || "";
        setFeedback({
          ok: true,
          text: detail
            ? `Demo only (no score): ${detail}`
            : "Patch verified in demo mode only — add this lab to the database to earn points.",
        });
        return;
      }
      const already = res?.data?.already_solved || res?.message === "LAB_ALREADY_SOLVED";
      const gradedOk =
        res?.success &&
        !res?.data?.demo_mode &&
        (res?.message === "LAB_SOLVED" || res?.message === "LAB_ALREADY_SOLVED" || pts > 0);
      if (gradedOk) {
        setFeedback({
          ok: true,
          text: already
            ? "Lab was already marked solved for your account."
            : `${res?.data?.verify_detail || "Fix accepted."} Lab completed — +${already ? 0 : pts} pts.`,
        });
        onSolved?.({ points: already ? 0 : pts, already });
        return;
      }
      setFeedback({
        ok: false,
        text: res?.message || "Fix rejected.",
      });
    } catch (err) {
      setFeedback({ ok: false, text: err?.message || "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-700 bg-slate-950/80 p-6">
        <p className="text-xs font-mono text-slate-400">Loading source workbench…</p>
      </section>
    );
  }

  if (loadError) {
    const looksLikeMissingLab =
      /lab not found|missing or not published/i.test(loadError) ||
      /migrate_lab11/i.test(loadError);
    const looksLikePath =
      /LABS_BASE_PATH|sources path is not available|No readable source files/i.test(loadError);

    return (
      <section className="rounded-2xl border border-rose-700/50 bg-rose-950/20 p-6">
        <p className="text-xs font-mono text-rose-200">{loadError}</p>
        {looksLikeMissingLab ? (
          <p className="mt-2 text-[11px] text-slate-400 font-mono leading-relaxed">
            White-box SQL uses <code className="text-slate-300">lab_id={WHITEBOX_SQL_LAB_ID}</code>. Add it to the
            database with <code className="text-slate-300">is_published=1</code> and{" "}
            <code className="text-slate-300">visibility=&apos;public&apos;</code>, e.g. run{" "}
            <code className="text-slate-300">server/sql/migrate_lab11_split_whitebox.sql</code>.
          </p>
        ) : looksLikePath ? (
          <p className="mt-2 text-[11px] text-slate-500 font-mono">
            Check that <code className="text-slate-400">LABS_BASE_PATH</code> in{" "}
            <code className="text-slate-400">server/utils/labs_config.php</code> points to the folder that contains the{" "}
            <code className="text-slate-400">SQL/api/login.php</code> Training Lab tree.
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-slate-500 font-mono">
            If the message above is not about the database, verify <code className="text-slate-400">LABS_BASE_PATH</code>{" "}
            and that the SQL lab folder exists on the server.
          </p>
        )}
      </section>
    );
  }

  if (!payload?.files?.length) {
    return null;
  }

  const showProdBanner = payload?.lab_unregistered === true || payload?.setup_incomplete === true;

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/80 overflow-hidden shadow-xl shadow-black/50">
      {showProdBanner && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] font-mono text-amber-100/95 leading-relaxed">
          {payload?.lab_unregistered ? (
            <>
              <span className="text-amber-200 font-semibold">Unregistered lab (DB):</span> no row in{" "}
              <code className="text-amber-100/90">labs</code> yet — UI uses fallback metadata. Submissions still earn
              points; run your SQL migration when ready.
            </>
          ) : (
            <>
              <span className="text-amber-200 font-semibold">Incomplete setup:</span> add or fix{" "}
              <code className="text-amber-100/90">challenges.whitebox_files_ref</code> so file metadata comes from the
              database (optional; verification still works).
            </>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 bg-slate-900/90">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono text-slate-200 truncate">
            WHITEBOX_WORKBENCH / {payload?.lab?.title ?? "LAB"}
          </span>
        </div>
        {labSolved && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 border border-emerald-500/40 rounded-full px-2 py-0.5 shrink-0">
            Solved
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] min-h-[420px]">
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 flex flex-col">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5" />
            Files
          </div>
          <nav className="flex-1 overflow-y-auto py-1">
            {payload.files.map((f) => {
              const active = f.relative_path === activePath;
              return (
                <button
                  key={f.relative_path}
                  type="button"
                  onClick={() => setActivePath(f.relative_path)}
                  className={[
                    "w-full text-left px-3 py-2 text-[11px] font-mono flex items-center gap-2 border-l-2 transition-colors",
                    active
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50",
                  ].join(" ")}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span className="truncate">{f.display_name || f.relative_path}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="text-slate-500">path</span>
            <span className="text-slate-200 truncate">{activeFile?.relative_path}</span>
          </div>

          <div className="relative flex-1 min-h-[280px] max-h-[480px] flex bg-slate-950">
            <div
              ref={gutterRef}
              className="select-none w-11 shrink-0 overflow-hidden border-r border-slate-800 bg-slate-950 py-3 text-right pr-2 text-[11px] leading-5 font-mono text-slate-600"
            >
              {lines.map((_, i) => {
                const n = i + 1;
                return (
                  <div key={n}>
                    {n}
                  </div>
                );
              })}
            </div>
            <pre
              ref={codeRef}
              onScroll={syncScroll}
              className="flex-1 overflow-auto m-0 py-3 px-3 text-[11px] leading-5 font-mono text-slate-200 whitespace-pre"
            >
              {activeFile?.content ?? ""}
            </pre>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 p-4 space-y-4 bg-slate-900/40"
      >
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Fix submission
        </div>
        <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
          {payload?.verification_help ??
            "Server runs php -l on a temp copy of your patched file and checks that SQL uses bound parameters (no variable concatenation inside the query string)."}
        </p>

        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-mono text-slate-500">Source file</span>
            <select
              value={sourceFile}
              onChange={(e) => setSourceFile(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-slate-100 outline-none focus:border-emerald-500"
            >
              {payload.files.map((f) => (
                <option key={f.relative_path} value={f.relative_path}>
                  {f.relative_path}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-mono text-slate-500">Line (1-based)</span>
            <input
              type="number"
              min={1}
              value={lineNo}
              onChange={(e) => setLineNo(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-slate-100 outline-none focus:border-emerald-500"
            />
          </label>
          <div className="sm:col-span-3 space-y-1">
            <span className="text-[10px] font-mono text-slate-500">Replacement code</span>
            <textarea
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              rows={8}
              placeholder={`$stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND password = ?");\n$stmt->bind_param("ss", $username, $password);\n$stmt->execute();\n// ... then fetch and build $response from $stmt->get_result()`}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-slate-100 outline-none focus:border-emerald-500 resize-y min-h-[120px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={labSolved || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-xs font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-900/40 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5" />
            {submitting ? "Verifying…" : labSolved ? "Already solved" : "Run verification"}
          </button>
          {feedback && (
            <p
              className={`text-xs font-mono max-w-xl ${
                feedback.ok ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {feedback.text}
            </p>
          )}
        </div>
      </form>
    </section>
  );
};

export default WhiteboxIdeLab;
