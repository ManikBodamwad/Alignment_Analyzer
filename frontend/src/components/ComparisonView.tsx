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
    <div className="space-y-6">
      {/* Selector Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Periodic Historical & Cross-Company Alignment Comparison Engine
          </h2>
          <p className="text-xs text-slate-500">
            Compare historical periods for the same company (e.g., Meta FY2024 vs. FY2025) or benchmark across companies (Meta vs. Snap vs. Pinterest).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Baseline Assessment Period (A)
            </label>
            <select
              value={String(baseId)}
              onChange={(e: any) => setBaseId(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Assessment Period (B)
            </label>
            <select
              value={String(targetId)}
              onChange={(e: any) => setTargetId(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
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
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
            >
              {loading ? "Comparing Assessments..." : "Compare Assessments"}
            </button>
          </div>
        </div>
      </div>

      {comparison ? (
        <div className="space-y-6">
          {/* Date Difference & Period Advisories (Section 11 Requirement) */}
          {(comparison.date_difference_warnings || []).length > 0 ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-1 text-xs text-amber-900">
              <div className="font-bold uppercase tracking-wider">
                Assessment Period & Document Date Advisories
              </div>
              {comparison.date_difference_warnings.map((w: string, i: number) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          ) : null}

          {/* Summary Delta Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">
                Baseline (Period A)
              </div>
              <div className="text-sm font-extrabold text-slate-900 mt-1">
                {comparison.baseline.company_name} — {comparison.baseline.title}
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <div>
                  <span className="text-2xl font-extrabold text-slate-900">
                    {comparison.baseline.overall_alignment_score ?? "N/A"}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1">Alignment</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-indigo-600">
                    {comparison.baseline.evidence_coverage_pct}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1">Coverage</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">
                Target (Period B)
              </div>
              <div className="text-sm font-extrabold text-slate-900 mt-1">
                {comparison.target.company_name} — {comparison.target.title}
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <div>
                  <span className="text-2xl font-extrabold text-slate-900">
                    {comparison.target.overall_alignment_score ?? "N/A"}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1">Alignment</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-indigo-600">
                    {comparison.target.evidence_coverage_pct}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1">Coverage</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm">
              <div className="text-xs font-bold text-indigo-300 uppercase">
                Net Alignment & Coverage Shift
              </div>
              <div className="mt-3 flex items-baseline gap-6">
                <div>
                  <div
                    className={`text-2xl font-extrabold ${
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
                  <div className="text-xl font-bold text-indigo-300">
                    {comparison.overall_coverage_delta >= 0 ? "+" : ""}
                    {comparison.overall_coverage_delta}%
                  </div>
                  <div className="text-xs text-slate-400">Coverage Delta</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stakeholder Alignment Comparison Visual Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Stakeholder Alignment Score Comparison (Baseline vs. Target)
            </h3>
            <div className="space-y-3">
              {(comparison.stakeholder_comparisons || []).map((sc: any) => (
                <div key={sc.slug} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {sc.stakeholder_name} ({sc.category})
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        Base: <strong>{sc.base_alignment_score ?? "N/A"}%</strong>
                      </span>
                      <span className="text-slate-800">
                        Target:{" "}
                        <strong>{sc.target_alignment_score ?? "N/A"}%</strong>
                      </span>
                      {sc.alignment_delta !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            sc.alignment_delta > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : sc.alignment_delta < 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {sc.alignment_delta > 0 ? "+" : ""}
                          {sc.alignment_delta}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-400 h-full"
                        style={{ width: `${sc.base_alignment_score || 0}%` }}
                      ></div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full"
                        style={{ width: `${sc.target_alignment_score || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Improvements, Deteriorations, New Capabilities & Structural Dimension Shifts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <h4 className="text-sm font-bold text-slate-900">
                Alignment Improvements & New Capabilities
              </h4>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="font-bold text-emerald-900">
                  Improvements in Alignment:
                </div>
                {(comparison.alignment_improvements || []).length === 0 ? (
                  <div className="text-emerald-700 italic">
                    No positive score shifts recorded.
                  </div>
                ) : (
                  comparison.alignment_improvements.map(
                    (imp: string, i: number) => (
                      <div key={i} className="text-emerald-800">
                        ✓ {imp}
                      </div>
                    )
                  )
                )}
              </div>

              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 space-y-1">
                <div className="font-bold text-indigo-900">
                  Newly Disclosed Capabilities & Units:
                </div>
                {(comparison.new_capabilities_and_units || []).length === 0 ? (
                  <div className="text-indigo-700 italic">
                    No new organizational units added between periods.
                  </div>
                ) : (
                  comparison.new_capabilities_and_units.map(
                    (u: string, i: number) => (
                      <div key={i} className="text-indigo-800">
                        + {u}
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <h4 className="text-sm font-bold text-slate-900">
                Deteriorations & Structural Dimension Changes
              </h4>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                <div className="font-bold text-rose-900">
                  Deteriorations in Alignment:
                </div>
                {(comparison.alignment_deteriorations || []).length === 0 ? (
                  <div className="text-rose-700 italic">
                    No alignment score declines recorded.
                  </div>
                ) : (
                  comparison.alignment_deteriorations.map(
                    (det: string, i: number) => (
                      <div key={i} className="text-rose-800">
                        ↓ {det}
                      </div>
                    )
                  )
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {(comparison.dimension_comparisons || []).map((dc: any) => (
                  <div
                    key={dc.dimension_code}
                    className="py-2 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-800">
                      {dc.dimension_name}
                    </span>
                    <div className="flex items-center gap-2">
                      {classificationBadge(dc.base_classification)}
                      <span>→</span>
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

