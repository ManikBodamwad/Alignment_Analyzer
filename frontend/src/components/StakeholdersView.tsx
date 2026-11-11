import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { StakeholderProfile } from "../types";

export function StakeholdersView(props: {
  stakeholders: StakeholderProfile[];
  onRefresh: () => void;
}) {
  const { stakeholders, onRefresh } = props;
  const [categoryFilter, setCategoryFilter] = useState<
    "ALL" | "Internal" | "External"
  >("ALL");
  const [selectedShId, setSelectedShId] = useState<number | null>(
    stakeholders[0]?.id || null
  );
  const [savingWeight, setSavingWeight] = useState(false);

  const filtered = stakeholders.filter(
    (s) => categoryFilter === "ALL" || s.category === categoryFilter
  );
  const selectedSh =
    stakeholders.find((s) => s.id === selectedShId) || stakeholders[0] || null;

  const handleStakeholderWeightChange = async (
    shId: number,
    newWeight: number
  ) => {
    setSavingWeight(true);
    try {
      await api.updateStakeholderWeight(shId, newWeight);
      onRefresh();
    } finally {
      setSavingWeight(false);
    }
  };

  const handleExpectationWeightChange = async (
    expId: number,
    newWeight: number
  ) => {
    setSavingWeight(true);
    try {
      await api.updateExpectationWeight(expId, newWeight);
      onRefresh();
    } finally {
      setSavingWeight(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header & Category Filter */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">
              Stakeholder Classification & Weight Calibration Framework
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Internal (4 groups) & External (6 groups). Adjust importance weights to dynamically recalculate overall alignment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["ALL", "Internal", "External"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                categoryFilter === cat
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {cat === "ALL" ? "All Stakeholders (10)" : `${cat} Stakeholders`}
            </button>
          ))}
        </div>
      </div>

      {/* Stakeholder Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sh) => {
          const isSelected = selectedSh && selectedSh.id === sh.id;
          const totalReq =
            sh.strong_count +
            sh.partial_count +
            sh.misalignment_count +
            sh.insufficient_count;
          const assessedReq =
            sh.strong_count + sh.partial_count + sh.misalignment_count;

          return (
            <div
              key={sh.id}
              onClick={() => setSelectedShId(sh.id)}
              className={`cursor-pointer glass-card rounded-xl p-5 border transition-all duration-200 relative ${
                isSelected
                  ? "bg-slate-800/90 border-violet-500 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/20"
                  : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      sh.category === "Internal"
                        ? "bg-violet-950/70 text-violet-300 border border-violet-700/60"
                        : "bg-cyan-950/70 text-cyan-300 border border-cyan-700/60"
                    }`}
                  >
                    {sh.category}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1.5">
                    {sh.name}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-cyan-300 font-mono">
                    {sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Cov: <strong className="text-slate-200">{sh.evidence_coverage_pct}%</strong>
                  </div>
                </div>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-4 gap-1.5 mt-4 text-center text-[11px]">
                <div className="p-1.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                  <div className="font-extrabold text-emerald-400">{sh.strong_count}</div>
                  <div className="text-[9px] text-emerald-500">Strong</div>
                </div>
                <div className="p-1.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30">
                  <div className="font-extrabold text-amber-400">{sh.partial_count}</div>
                  <div className="text-[9px] text-amber-500">Partial</div>
                </div>
                <div className="p-1.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30">
                  <div className="font-extrabold text-rose-400">{sh.misalignment_count}</div>
                  <div className="text-[9px] text-rose-500">Misaligned</div>
                </div>
                <div className="p-1.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                  <div className="font-extrabold text-slate-400">{sh.insufficient_count}</div>
                  <div className="text-[9px] text-slate-500">Insuff.</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Assessed: <strong className="text-slate-200">{assessedReq}/{totalReq}</strong> reqs
                </span>
                <span>
                  Weight: <strong className="text-violet-300 font-mono">{sh.importance_weight}x</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stakeholder Detailed Profile & Weight Editor */}
      {selectedSh ? (
        <div className="glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                Detailed Stakeholder Diagnostic Profile
              </div>
              <h3 className="text-lg font-extrabold text-white mt-1">
                {selectedSh.name} ({selectedSh.category})
              </h3>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                <span>
                  Influence:{" "}
                  <strong className="text-slate-200">
                    {selectedSh.influence_level}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Dependence:{" "}
                  <strong className="text-slate-200">
                    {selectedSh.dependence_level}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Alignment Score:{" "}
                  <strong className="text-cyan-300 font-mono">
                    {selectedSh.alignment_score !== null
                      ? `${selectedSh.alignment_score}%`
                      : "Insufficient Evidence"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Importance Weight Selector */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="text-xs">
                <div className="font-bold text-slate-200">
                  Stakeholder Importance Weight
                </div>
                <div className="text-[11px] text-slate-400">
                  Recalculates Overall Alignment Score
                </div>
              </div>
              <select
                disabled={savingWeight}
                value={String(selectedSh.importance_weight)}
                onChange={(e: any) =>
                  handleStakeholderWeightChange(
                    selectedSh.id,
                    parseFloat(e.target.value)
                  )
                }
                className="text-xs font-bold border border-slate-700 rounded-lg p-2 bg-slate-900 text-violet-300 focus:outline-none"
              >
                {[0.5, 0.8, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 2.0, 2.5, 3.0].map(
                  (w) => (
                    <option key={w} value={String(w)}>
                      {w.toFixed(1)}x Weight
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Interests, Risks, Policies & Conflicts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="font-bold text-slate-200 mb-2">
                Primary Interests
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {(selectedSh.key_interests || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30">
              <div className="font-bold text-rose-300 mb-2">
                Concerns & Potential Risks
              </div>
              <ul className="space-y-1 text-rose-200 list-disc list-inside">
                {(selectedSh.concerns_and_risks || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-lg bg-violet-950/30 border border-violet-500/30">
              <div className="font-bold text-violet-300 mb-2">
                Relevant Corporate Policies
              </div>
              <ul className="space-y-1 text-violet-200 list-disc list-inside">
                {(selectedSh.relevant_policies || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-500/30">
              <div className="font-bold text-amber-300 mb-2">
                Potential Stakeholder Tensions
              </div>
              <ul className="space-y-1 text-amber-200 list-disc list-inside">
                {(selectedSh.potential_conflicts || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Detailed Expectations List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Assessed Expectations for {selectedSh.name} ({selectedSh.expectations.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Adjust requirement weights individually
              </span>
            </div>
            <div className="space-y-2">
              {selectedSh.expectations.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{exp.title}</span>
                      {exp.is_discovered_from_docs ? (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 text-[10px] font-mono">
                          Discovered from Filings
                        </span>
                      ) : null}
                    </div>
                    <p className="text-slate-400 text-[11px]">{exp.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(exp.mapped_dimension_codes || []).map((d) => (
                        <span
                          key={d}
                          className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] border border-slate-700"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 text-[11px]">Weight:</span>
                    <select
                      disabled={savingWeight}
                      value={String(exp.requirement_weight)}
                      onChange={(e: any) =>
                        handleExpectationWeightChange(
                          exp.id,
                          parseFloat(e.target.value)
                        )
                      }
                      className="text-xs font-bold border border-slate-700 rounded p-1 bg-slate-900 text-cyan-300"
                    >
                      {[0.5, 0.8, 1.0, 1.2, 1.4, 1.5, 1.8, 2.0].map((w) => (
                        <option key={w} value={String(w)}>
                          {w.toFixed(1)}x
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
