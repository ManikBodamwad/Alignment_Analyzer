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
    <div className="space-y-6">
      {/* Header & Category Filter */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Stakeholder Classification & Weight Calibration Framework
          </h2>
          <p className="text-xs text-slate-500">
            Internal (4 groups) & External (6 groups). Adjust importance weights to dynamically recalculate overall alignment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["ALL", "Internal", "External"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                categoryFilter === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
              className={`cursor-pointer bg-white rounded-xl p-5 border transition shadow-sm ${
                isSelected
                  ? "border-indigo-600 ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sh.category === "Internal"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}
                  >
                    {sh.category} Stakeholder
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                    {sh.name}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900">
                    {sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Coverage: <strong>{sh.evidence_coverage_pct}%</strong>
                  </div>
                </div>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-4 gap-1.5 mt-4 text-center text-[11px]">
                <div className="p-1.5 rounded bg-emerald-50 text-emerald-800">
                  <div className="font-extrabold">{sh.strong_count}</div>
                  <div className="text-[9px]">Strong</div>
                </div>
                <div className="p-1.5 rounded bg-amber-50 text-amber-800">
                  <div className="font-extrabold">{sh.partial_count}</div>
                  <div className="text-[9px]">Partial</div>
                </div>
                <div className="p-1.5 rounded bg-rose-50 text-rose-800">
                  <div className="font-extrabold">{sh.misalignment_count}</div>
                  <div className="text-[9px]">Misaligned</div>
                </div>
                <div className="p-1.5 rounded bg-slate-100 text-slate-600">
                  <div className="font-extrabold">{sh.insufficient_count}</div>
                  <div className="text-[9px]">Insuff.</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Assessed: <strong>{assessedReq}/{totalReq}</strong> reqs
                </span>
                <span>
                  Importance Weight: <strong>{sh.importance_weight}x</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stakeholder Detailed Profile & Weight Editor */}
      {selectedSh ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-bold text-indigo-600 uppercase">
                Detailed Stakeholder Diagnostic Profile
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {selectedSh.name} ({selectedSh.category})
              </h3>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-600">
                <span>
                  Influence over Company:{" "}
                  <strong className="text-slate-900">
                    {selectedSh.influence_level}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Dependence on Company:{" "}
                  <strong className="text-slate-900">
                    {selectedSh.dependence_level}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Alignment Score:{" "}
                  <strong className="text-indigo-700">
                    {selectedSh.alignment_score !== null
                      ? `${selectedSh.alignment_score}%`
                      : "Insufficient Evidence"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Importance Weight Selector */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="text-xs">
                <div className="font-bold text-slate-800">
                  Stakeholder Importance Weight
                </div>
                <div className="text-[11px] text-slate-500">
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
                className="text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white text-indigo-700"
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
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-800 mb-2">
                Primary Interests
              </div>
              <ul className="space-y-1 text-slate-600 list-disc list-inside">
                {(selectedSh.key_interests || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-lg bg-rose-50/50 border border-rose-200">
              <div className="font-bold text-rose-900 mb-2">
                Concerns & Potential Risks
              </div>
              <ul className="space-y-1 text-rose-800 list-disc list-inside">
                {(selectedSh.concerns_and_risks || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-200">
              <div className="font-bold text-indigo-900 mb-2">
                Relevant Company Policies
              </div>
              <ul className="space-y-1 text-indigo-800 list-disc list-inside">
                {(selectedSh.relevant_policies || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-200">
              <div className="font-bold text-amber-900 mb-2">
                Potential Stakeholder Conflicts
              </div>
              <ul className="space-y-1 text-amber-800 list-disc list-inside">
                {(selectedSh.potential_conflicts || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stakeholder Expectations & Requirement Weights */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">
              Extracted & Baseline Stakeholder Expectations (
              {(selectedSh.expectations || []).length})
            </h4>
            <div className="space-y-2.5">
              {(selectedSh.expectations || []).map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {exp.title}
                      </span>
                      {exp.is_discovered_from_docs ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          AI Discovered from Uploaded Filings
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          Core Framework
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{exp.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(exp.mapped_dimension_codes || []).map((dc) => (
                        <span
                          key={dc}
                          className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold uppercase"
                        >
                          Dimension: {dc}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-500">Req. Weight:</span>
                    <select
                      disabled={savingWeight}
                      value={String(exp.requirement_weight)}
                      onChange={(e: any) =>
                        handleExpectationWeightChange(
                          exp.id,
                          parseFloat(e.target.value)
                        )
                      }
                      className="text-xs font-bold border border-slate-300 rounded p-1.5 bg-white"
                    >
                      {[0.5, 0.8, 1.0, 1.2, 1.3, 1.4, 1.5, 2.0].map((w) => (
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

