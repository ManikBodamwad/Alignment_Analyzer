import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { StakeholderProfile } from "../types";
import { UsersIcon } from "./icons";

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
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Header & Category Filter */}
      <div className="apple-card p-6 stagger-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0">
              <UsersIcon className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              Stakeholder Classification &amp; Weight Calibration Framework
            </h2>
          </div>
          <p className="text-xs text-[#86868b] mt-1">
            Internal (4 groups) &amp; External (6 groups). Adjust importance weights to dynamically recalculate overall alignment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-black/8 shrink-0">
          {(["ALL", "Internal", "External"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                categoryFilter === cat
                  ? "bg-[#0071e3] text-white shadow-sm"
                  : "text-[#515154] hover:text-[#1d1d1f]"
              }`}
            >
              {cat === "ALL" ? `All (${stakeholders.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stakeholder Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-2">
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
              className={`cursor-pointer apple-card p-5 card-hover flex flex-col justify-between ${
                isSelected
                  ? "border-[#0071e3] ring-2 ring-[#0071e3]/20 bg-white"
                  : "bg-white/85"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        sh.category === "Internal"
                          ? "bg-[#f5eefb] text-[#5856d6] border-[#dfc3f3]"
                          : "bg-[#e8f2fe] text-[#0066cc] border-[#b3d7ff]"
                      }`}
                    >
                      {sh.category}
                    </span>
                    <h3 className="text-sm font-bold text-[#1d1d1f] mt-2 leading-snug">
                      {sh.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-[#0071e3] font-mono tabular-nums">
                      {sh.alignment_score !== null ? `${sh.alignment_score}%` : "N/A"}
                    </div>
                    <div className="text-[11px] text-[#86868b] font-medium tabular-nums">
                      Cov: <strong className="text-[#1d1d1f]">{sh.evidence_coverage_pct}%</strong>
                    </div>
                  </div>
                </div>

                {/* Centered Mini Counts Grid */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="py-2 px-1 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] flex flex-col items-center justify-center text-center">
                    <div className="font-bold text-sm text-[#1d7334] tabular-nums">
                      {sh.strong_count}
                    </div>
                    <div className="text-[10px] font-semibold text-[#248a3d]">
                      Strong
                    </div>
                  </div>
                  <div className="py-2 px-1 rounded-xl bg-[#fff7e6] border border-[#ffd580] flex flex-col items-center justify-center text-center">
                    <div className="font-bold text-sm text-[#b25e00] tabular-nums">
                      {sh.partial_count}
                    </div>
                    <div className="text-[10px] font-semibold text-[#c96500]">
                      Partial
                    </div>
                  </div>
                  <div className="py-2 px-1 rounded-xl bg-[#fdeef0] border border-[#f9abb4] flex flex-col items-center justify-center text-center">
                    <div className="font-bold text-sm text-[#c9182b] tabular-nums">
                      {sh.misalignment_count}
                    </div>
                    <div className="text-[10px] font-semibold text-[#d70015]">
                      Misalign
                    </div>
                  </div>
                  <div className="py-2 px-1 rounded-xl bg-[#f2f2f7] border border-[#d1d1d6] flex flex-col items-center justify-center text-center">
                    <div className="font-bold text-sm text-[#515154] tabular-nums">
                      {sh.insufficient_count}
                    </div>
                    <div className="text-[10px] font-semibold text-[#86868b]">
                      Insuff.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black/8 flex items-center justify-between text-xs text-[#86868b]">
                <span>
                  Assessed: <strong className="text-[#1d1d1f] tabular-nums">{assessedReq}/{totalReq}</strong> reqs
                </span>
                <span>
                  Weight: <strong className="text-[#0071e3] font-mono tabular-nums">{sh.importance_weight}x</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stakeholder Detailed Profile & Weight Editor */}
      {selectedSh ? (
        <div className="apple-card p-6 space-y-5 stagger-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-black/8 pb-4">
            <div>
              <div className="text-xs font-bold text-[#0071e3] uppercase tracking-wider">
                Detailed Stakeholder Diagnostic Profile
              </div>
              <h3 className="text-xl font-bold text-[#1d1d1f] mt-1 tracking-tight">
                {selectedSh.name} ({selectedSh.category})
              </h3>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-[#86868b]">
                <span>
                  Influence:{" "}
                  <strong className="text-[#1d1d1f]">
                    {selectedSh.influence_level}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Dependence:{" "}
                  <strong className="text-[#1d1d1f]">
                    {selectedSh.dependence_level}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Alignment Score:{" "}
                  <strong className="text-[#0071e3] font-mono">
                    {selectedSh.alignment_score !== null
                      ? `${selectedSh.alignment_score}%`
                      : "Insufficient Evidence"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Importance Weight Selector */}
            <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/8 flex items-center gap-3 shrink-0">
              <div className="text-xs">
                <div className="font-bold text-[#1d1d1f]">
                  Stakeholder Importance Weight
                </div>
                <div className="text-[11px] text-[#86868b]">
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
                className="text-xs font-bold border border-black/10 rounded-full px-3.5 py-2 bg-white text-[#0071e3] shadow-sm focus:outline-none focus:border-[#0071e3]"
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
            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/8">
              <div className="font-bold text-[#1d1d1f] mb-2">
                Primary Interests
              </div>
              <ul className="space-y-1.5 text-[#515154] list-disc pl-4">
                {(selectedSh.key_interests || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4]">
              <div className="font-bold text-[#c9182b] mb-2">
                Concerns &amp; Potential Risks
              </div>
              <ul className="space-y-1.5 text-[#1d1d1f] list-disc pl-4">
                {(selectedSh.concerns_and_risks || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-[#e8f2fe] border border-[#b3d7ff]">
              <div className="font-bold text-[#0066cc] mb-2">
                Relevant Corporate Policies
              </div>
              <ul className="space-y-1.5 text-[#1d1d1f] list-disc pl-4">
                {(selectedSh.relevant_policies || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-[#fff7e6] border border-[#ffd580]">
              <div className="font-bold text-[#b25e00] mb-2">
                Potential Stakeholder Tensions
              </div>
              <ul className="space-y-1.5 text-[#1d1d1f] list-disc pl-4">
                {(selectedSh.potential_conflicts || []).map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Detailed Expectations List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#86868b] uppercase tracking-wider">
                Assessed Expectations for {selectedSh.name} ({selectedSh.expectations.length})
              </h4>
              <span className="text-[11px] text-[#86868b]">
                Adjust requirement weights individually
              </span>
            </div>
            <div className="space-y-2.5">
              {selectedSh.expectations.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#1d1d1f]">{exp.title}</span>
                      {exp.is_discovered_from_docs ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff] text-[10px] font-mono font-semibold">
                          Discovered from Filings
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[#515154] text-xs leading-relaxed">
                      {exp.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(exp.mapped_dimension_codes || []).map((d) => (
                        <span
                          key={d}
                          className="px-2.5 py-0.5 rounded-full bg-white text-[#515154] text-[10px] font-mono font-medium border border-black/10"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[#86868b] text-[11px] font-medium">
                      Weight:
                    </span>
                    <select
                      disabled={savingWeight}
                      value={String(exp.requirement_weight)}
                      onChange={(e: any) =>
                        handleExpectationWeightChange(
                          exp.id,
                          parseFloat(e.target.value)
                        )
                      }
                      className="text-xs font-bold border border-black/10 rounded-full px-3 py-1.5 bg-white text-[#0071e3] shadow-sm focus:outline-none"
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
