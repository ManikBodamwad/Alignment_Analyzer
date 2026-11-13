import { api } from "../api";
import { h, useEffect, useState } from "../lib/react-lite";
import { AssessmentPeriod, Company } from "../types";
import { classificationBadge } from "./badges";

export function ComparisonView(props: {
  companies: Company[];
  allPeriods: AssessmentPeriod[];
  currentPeriodId: number;
}) {
  const { companies, allPeriods, currentPeriodId } = props;
  const [baseId, setBaseId] = useState<number>(allPeriods[0]?.id || 1);
  const [targetId, setTargetId] = useState<number>(
    allPeriods.length > 1 ? allPeriods[1].id : currentPeriodId
  );
  const [comparison, setComparison] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const compMap = new Map<number, string>();
  for (const c of companies) compMap.set(c.id, c.name);

  const runComparison = async (bId: number, tId: number) => {
    setLoading(true);
    try {
      const data = await api.compareAssessments(bId, tId);
      setComparison(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (baseId && targetId) {
      runComparison(baseId, targetId);
    }
  }, [baseId, targetId]);

  return (
    <div className="space-y-6 text-white">
      {/* Selector Bar */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">
              Periodic Historical & Cross-Company Alignment Comparison Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Compare historical periods for the same company (e.g., Meta FY2024 vs. FY2025) or benchmark across companies (Meta vs. Snap vs. Pinterest).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Baseline Assessment Period (A)
            </label>
            <select
              value={String(baseId)}
              onChange={(e: any) => setBaseId(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white font-semibold focus:outline-none"
            >
              {allPeriods.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {compMap.get(p.company_id)} — {p.title} (
                  {p.overall_alignment_score ?? "N/A"}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Target Assessment Period (B)
            </label>
            <select
              value={String(targetId)}
              onChange={(e: any) => setTargetId(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white font-semibold focus:outline-none"
            >
              {allPeriods.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {compMap.get(p.company_id)} — {p.title} (
                  {p.overall_alignment_score ?? "N/A"}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={() => runComparison(baseId, targetId)}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition"
            >
              {loading ? "Comparing Assessments..." : "Compare Assessments"}
            </button>
          </div>
        </div>
      </div>

      {comparison ? (
        <div className="space-y-6">
          {/* Date Difference & Period Advisories */}
          {(comparison.date_difference_warnings || []).length > 0 ? (
            <div className="glass-card bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 space-y-1 text-xs text-amber-200">
              <div className="font-bold uppercase tracking-wider text-amber-300">
                Assessment Period & Document Date Advisories
              </div>
              {comparison.date_difference_warnings.map((w: string, i: number) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          ) : null}

          {/* Summary Delta Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Baseline (Period A)
              </div>
              <div className="text-sm font-extrabold text-white mt-1">
                {comparison.baseline.company_name} — {comparison.baseline.title}
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <div>
                  <span className="text-2xl font-extrabold text-cyan-300 font-mono">
                    {comparison.baseline.overall_alignment_score ?? "N/A"}%
                  </span>
                  <span className="text-xs text-slate-400 ml-1">Alignment</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-violet-400 font-mono">
                    {comparison.baseline.evidence_coverage_pct}%
                  </span>
                  <span className="text-xs text-slate-400 ml-1">Coverage</span>
                </div>
              </div>
            </div>

            <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Target (Period B)
              </div>
              <div className="text-sm font-extrabold text-white mt-1">
                {comparison.target.company_name} — {comparison.target.title}
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <div>
                  <span className="text-2xl font-extrabold text-cyan-300 font-mono">
                    {comparison.target.overall_alignment_score ?? "N/A"}%
                  </span>
                  <span className="text-xs text-slate-400 ml-1">Alignment</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-violet-400 font-mono">
                    {comparison.target.evidence_coverage_pct}%
                  </span>
                  <span className="text-xs text-slate-400 ml-1">Coverage</span>
                </div>
              </div>
            </div>

            <div className="glass-card bg-slate-950 p-5 rounded-xl border border-violet-800/80 shadow-2xl">
              <div className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                Net Alignment & Coverage Shift
              </div>
              <div className="mt-3 flex items-baseline gap-6">
                <div>
                  <div
                    className={`text-2xl font-extrabold font-mono ${
                      (comparison.overall_alignment_delta || 0) >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {comparison.overall_alignment_delta !== null
                      ? `${
                          comparison.overall_alignment_delta >= 0 ? "+" : ""
                        }${comparison.overall_alignment_delta}%`
                      : "N/A"}
                  </div>
                  <div className="text-xs text-slate-400">Alignment Delta</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-cyan-300 font-mono">
                    {comparison.overall_coverage_delta >= 0 ? "+" : ""}
                    {comparison.overall_coverage_delta}%
                  </div>
                  <div className="text-xs text-slate-400">Coverage Delta</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stakeholder Alignment Comparison Visual Chart */}
          <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white">
              Stakeholder Alignment Score Comparison (Baseline vs. Target)
            </h3>
            <div className="space-y-3">
              {(comparison.stakeholder_comparisons || []).map((sc: any) => (
                <div key={sc.slug} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {sc.stakeholder_name} ({sc.category})
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono">
                        Base: <strong className="text-slate-200">{sc.base_alignment_score ?? "N/A"}%</strong>
                      </span>
                      <span className="text-slate-400 font-mono">
                        Target:{" "}
                        <strong className="text-slate-200">{sc.target_alignment_score ?? "N/A"}%</strong>
                      </span>
                      {sc.alignment_delta !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold ${
                            sc.alignment_delta > 0
                              ? "bg-emerald-950/70 text-emerald-300 border border-emerald-600/50"
                              : sc.alignment_delta < 0
                              ? "bg-rose-950/70 text-rose-300 border border-rose-600/50"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {sc.alignment_delta > 0 ? "+" : ""}
                          {sc.alignment_delta}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-500 h-full"
                        style={{ width: `${sc.base_alignment_score || 0}%` }}
                      ></div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full"
                        style={{ width: `${sc.target_alignment_score || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Improvements & Deteriorations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-3 text-xs">
              <h4 className="text-sm font-bold text-white">
                Alignment Improvements & New Capabilities
              </h4>
              <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                <div className="font-bold text-emerald-300">
                  Improvements in Alignment:
                </div>
                {(comparison.alignment_improvements || []).length === 0 ? (
                  <div className="text-emerald-400 italic">
                    No positive score shifts recorded.
                  </div>
                ) : (
                  comparison.alignment_improvements.map(
                    (imp: string, i: number) => (
                      <div key={i} className="text-emerald-200">
                        + {imp}
                      </div>
                    )
                  )
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-violet-950/30 border border-violet-500/30 space-y-1">
                <div className="font-bold text-violet-300">
                  Newly Disclosed Capabilities & Units:
                </div>
                {(comparison.new_capabilities_and_units || []).length === 0 ? (
                  <div className="text-violet-400 italic">
                    No new organizational units added between periods.
                  </div>
                ) : (
                  comparison.new_capabilities_and_units.map(
                    (u: string, i: number) => (
                      <div key={i} className="text-violet-200">
                        + {u}
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-3 text-xs">
              <h4 className="text-sm font-bold text-white">
                Deteriorations & Structural Dimension Changes
              </h4>
              <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 space-y-1">
                <div className="font-bold text-rose-300">
                  Deteriorations in Alignment:
                </div>
                {(comparison.alignment_deteriorations || []).length === 0 ? (
                  <div className="text-rose-400 italic">
                    No alignment score declines recorded.
                  </div>
                ) : (
                  comparison.alignment_deteriorations.map(
                    (det: string, i: number) => (
                      <div key={i} className="text-rose-200">
                        ↓ {det}
                      </div>
                    )
                  )
                )}
              </div>

              <div className="divide-y divide-slate-800/80">
                {(comparison.dimension_comparisons || []).map((dc: any) => (
                  <div
                    key={dc.dimension_code}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-200">
                      {dc.dimension_name}
                    </span>
                    <div className="flex items-center gap-2">
                      {classificationBadge(dc.base_classification)}
                      <span className="text-slate-500">→</span>
                      {classificationBadge(dc.target_classification)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
