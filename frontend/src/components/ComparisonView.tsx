import { api } from "../api";
import { h, useEffect, useState } from "../lib/react-lite";
import { AssessmentPeriod, Company } from "../types";
import { classificationBadge } from "./badges";
import { ArrowDownIcon, ArrowRightIcon, TrendIcon } from "./icons";

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
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Selector Bar */}
      <div className="apple-card p-6 space-y-4 stagger-1">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0">
              <TrendIcon className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              Periodic Historical &amp; Cross-Company Alignment Comparison Engine
            </h2>
          </div>
          <p className="text-xs text-[#86868b] mt-1">
            Compare historical periods for the same company (e.g., Meta FY2024 vs. FY2025) or benchmark across companies (Meta vs. Snap vs. Pinterest).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
              Baseline Assessment Period (A)
            </label>
            <select
              value={String(baseId)}
              onChange={(e: any) => setBaseId(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-semibold focus:outline-none focus:border-[#0071e3] focus:bg-white"
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
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
              Target Assessment Period (B)
            </label>
            <select
              value={String(targetId)}
              onChange={(e: any) => setTargetId(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-semibold focus:outline-none focus:border-[#0071e3] focus:bg-white"
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
              className="apple-btn-primary w-full"
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
            <div className="apple-card bg-[#fff7e6] border border-[#ffd580] p-4 space-y-1.5 text-xs text-[#1d1d1f] stagger-2">
              <div className="font-bold uppercase tracking-wider text-[#b25e00]">
                Assessment Period &amp; Document Date Advisories
              </div>
              {comparison.date_difference_warnings.map((w: string, i: number) => (
                <div key={i} className="text-[#515154]">
                  • {w}
                </div>
              ))}
            </div>
          ) : null}

          {/* Summary Delta Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-2">
            <div className="apple-card p-5">
              <div className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
                Baseline (Period A)
              </div>
              <div className="text-sm font-bold text-[#1d1d1f] mt-1">
                {comparison.baseline.company_name} — {comparison.baseline.title}
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <div>
                  <span className="text-2xl font-bold text-[#515154] font-mono tabular-nums">
                    {comparison.baseline.overall_alignment_score ?? "N/A"}%
                  </span>
                  <span className="text-xs text-[#86868b] ml-1">Alignment</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-[#0071e3] font-mono tabular-nums">
                    {comparison.baseline.evidence_coverage_pct}%
                  </span>
                  <span className="text-xs text-[#86868b] ml-1">Coverage</span>
                </div>
              </div>
            </div>

            <div className="apple-card p-5">
              <div className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
                Target (Period B)
              </div>
              <div className="text-sm font-bold text-[#1d1d1f] mt-1">
                {comparison.target.company_name} — {comparison.target.title}
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <div>
                  <span className="text-2xl font-bold text-[#0071e3] font-mono tabular-nums">
                    {comparison.target.overall_alignment_score ?? "N/A"}%
                  </span>
                  <span className="text-xs text-[#86868b] ml-1">Alignment</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-[#5856d6] font-mono tabular-nums">
                    {comparison.target.evidence_coverage_pct}%
                  </span>
                  <span className="text-xs text-[#86868b] ml-1">Coverage</span>
                </div>
              </div>
            </div>

            <div className="apple-card p-5 border-[#0071e3]/30">
              <div className="text-[11px] font-bold text-[#0071e3] uppercase tracking-wider">
                Net Alignment &amp; Coverage Shift
              </div>
              <div className="mt-3 flex items-baseline gap-6">
                <div>
                  <div
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      (comparison.overall_alignment_delta || 0) >= 0
                        ? "text-[#1d7334]"
                        : "text-[#d70015]"
                    }`}
                  >
                    {comparison.overall_alignment_delta !== null
                      ? `${
                          comparison.overall_alignment_delta >= 0 ? "+" : ""
                        }${comparison.overall_alignment_delta}%`
                      : "N/A"}
                  </div>
                  <div className="text-xs text-[#86868b]">Alignment Delta</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#0071e3] font-mono tabular-nums">
                    {comparison.overall_coverage_delta >= 0 ? "+" : ""}
                    {comparison.overall_coverage_delta}%
                  </div>
                  <div className="text-xs text-[#86868b]">Coverage Delta</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stakeholder Alignment Comparison Visual Chart */}
          <div className="apple-card p-6 space-y-4 stagger-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1d1d1f]">
                Stakeholder Alignment Score Comparison (Baseline vs. Target)
              </h3>
              <div className="flex items-center gap-4 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1.5 text-[#515154]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#aeaeb2]" />
                  Baseline
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#0071e3]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]" />
                  Target
                </span>
              </div>
            </div>
            <div className="space-y-3.5">
              {(comparison.stakeholder_comparisons || []).map((sc: any) => (
                <div key={sc.slug} className="space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#1d1d1f]">
                      {sc.stakeholder_name} ({sc.category})
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#86868b] font-mono tabular-nums">
                        Base: <strong className="text-[#1d1d1f]">{sc.base_alignment_score ?? "N/A"}%</strong>
                      </span>
                      <span className="text-[#86868b] font-mono tabular-nums">
                        Target:{" "}
                        <strong className="text-[#0071e3]">{sc.target_alignment_score ?? "N/A"}%</strong>
                      </span>
                      {sc.alignment_delta !== null ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono font-bold border tabular-nums ${
                            sc.alignment_delta > 0
                              ? "bg-[#eaf8ee] text-[#1d7334] border-[#a3e4b7]"
                              : sc.alignment_delta < 0
                              ? "bg-[#fdeef0] text-[#c9182b] border-[#f9abb4]"
                              : "bg-[#f2f2f7] text-[#636366] border-[#d1d1d6]"
                          }`}
                        >
                          {sc.alignment_delta > 0 ? "+" : ""}
                          {sc.alignment_delta}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="w-full h-2.5 bg-[#e5e5ea] rounded-full overflow-hidden">
                      <div
                        className="bg-[#aeaeb2] h-full rounded-full bar-grow"
                        style={{ width: `${sc.base_alignment_score || 0}%` }}
                      ></div>
                    </div>
                    <div className="w-full h-2.5 bg-[#e5e5ea] rounded-full overflow-hidden">
                      <div
                        className="bg-[#0071e3] h-full rounded-full bar-grow"
                        style={{ width: `${sc.target_alignment_score || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Improvements & Deteriorations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-4">
            <div className="apple-card p-6 space-y-3 text-xs">
              <h4 className="text-sm font-bold text-[#1d1d1f]">
                Alignment Improvements &amp; New Capabilities
              </h4>
              <div className="p-4 rounded-2xl bg-[#eaf8ee] border border-[#a3e4b7] space-y-1.5">
                <div className="font-bold text-[#1d7334]">
                  Improvements in Alignment:
                </div>
                {(comparison.alignment_improvements || []).length === 0 ? (
                  <div className="text-[#248a3d] italic">
                    No positive score shifts recorded.
                  </div>
                ) : (
                  comparison.alignment_improvements.map(
                    (imp: string, i: number) => (
                      <div key={i} className="text-[#1d1d1f]">
                        + {imp}
                      </div>
                    )
                  )
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#e8f2fe] border border-[#b3d7ff] space-y-1.5">
                <div className="font-bold text-[#0066cc]">
                  Newly Disclosed Capabilities &amp; Units:
                </div>
                {(comparison.new_capabilities_and_units || []).length === 0 ? (
                  <div className="text-[#0066cc] italic">
                    No new organizational units added between periods.
                  </div>
                ) : (
                  comparison.new_capabilities_and_units.map(
                    (u: string, i: number) => (
                      <div key={i} className="text-[#1d1d1f]">
                        + {u}
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            <div className="apple-card p-6 space-y-3 text-xs">
              <h4 className="text-sm font-bold text-[#1d1d1f]">
                Deteriorations &amp; Structural Dimension Changes
              </h4>
              <div className="p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4] space-y-1.5">
                <div className="font-bold text-[#c9182b]">
                  Deteriorations in Alignment:
                </div>
                {(comparison.alignment_deteriorations || []).length === 0 ? (
                  <div className="text-[#c9182b] italic">
                    No alignment score declines recorded.
                  </div>
                ) : (
                  comparison.alignment_deteriorations.map(
                    (det: string, i: number) => (
                      <div key={i} className="text-[#1d1d1f] flex items-center gap-1.5">
                        <ArrowDownIcon className="w-3.5 h-3.5 text-[#c9182b] shrink-0" />
                        <span>{det}</span>
                      </div>
                    )
                  )
                )}
              </div>

              <div className="divide-y divide-black/8">
                {(comparison.dimension_comparisons || []).map((dc: any) => (
                  <div
                    key={dc.dimension_code}
                    className="py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="font-semibold text-[#1d1d1f]">
                      {dc.dimension_name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {classificationBadge(dc.base_classification)}
                      <ArrowRightIcon className="w-3.5 h-3.5 text-[#86868b]" />
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
