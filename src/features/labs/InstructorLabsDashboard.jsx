import React, { useState } from "react";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { mockLabs } from "../../data/mockData";

const statusColors = {
  pending:
    "bg-amber-500/10 text-amber-300 border-amber-400/50 shadow-amber-500/20",
  approved:
    "bg-emerald-500/10 text-emerald-300 border-emerald-400/50 shadow-emerald-500/20",
  rejected:
    "bg-rose-500/10 text-rose-300 border-rose-400/50 shadow-rose-500/20",
};

const InstructorLabsDashboard = () => {
  const [labs] = useState(mockLabs);
  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    category: "",
    hints: "",
    solution: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmitLab = (e) => {
    e.preventDefault();
    // UI only
    console.log("Instructor submitted lab:", form);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-14 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <p className="text-xs text-emerald-400 font-mono tracking-[0.2em] uppercase">
              // INSTRUCTOR_DASHBOARD
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 font-mono">
              Labs Authoring Console
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Design, document, and submit labs for approval. Track their
              review status in real time.
            </p>
          </div>

          <div className="w-full md:w-auto flex justify-start md:justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
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
                  Add New Lab
                </h2>
                <p className="text-xs text-slate-400">
                  Fill in the lab details and submit for admin approval.
                </p>
              </div>
            </div>

            <form
              className="space-y-4 text-sm text-slate-100"
              onSubmit={handleSubmitLab}
            >
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
                    Category
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    placeholder="e.g. Web, Binary, Cloud, Network"
                  />
                </div>
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
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Lab for Approval
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
                  My Labs & Status
                </h2>
                <p className="text-xs text-slate-400">
                  Track approval state of your submitted labs.
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
                        statusColors["pending"],
                      ].join(" ")}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Pending Approval
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-[11px] font-mono text-slate-200 hover:border-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
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
                      UI only &mdash; no data will be saved.
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
                onSubmit={(e) => {
                  handleSubmitLab(e);
                  setIsModalOpen(false);
                }}
              >
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
                      Category
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      placeholder="e.g. Web, Binary, Cloud, Network"
                    />
                  </div>
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-500 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Lab
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

