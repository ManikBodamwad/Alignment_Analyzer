import { h, useState } from "../lib/react-lite";
import { classificationBadge, evidenceClassBadge } from "./badges";
import { ArrowRightIcon, StructureIcon } from "./icons";

export function StructureView(props: { structureData: any | null }) {
  const { structureData } = props;
  const [selectedDimCode, setSelectedDimCode] = useState<string>("governance");

  if (!structureData) {
    return (
      <div className="p-12 text-center text-[#86868b] font-medium text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-pulse inline-block mr-2" />
        Loading 7-dimension organizational structure assessment...
      </div>
    );
  }

  const dimensions: any[] = structureData.dimensions || [];
  const units: any[] = structureData.units || [];
  const evidenceByDim: Record<string, any[]> =
    structureData.evidence_by_dimension || {};

  const activeDim =
    dimensions.find((d) => d.dimension_code === selectedDimCode) ||
    dimensions[0] ||
    null;

  return (
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Header */}
      <div className="apple-card p-6 stagger-1">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0">
            <StructureIcon className="w-4 h-4" />
          </span>
          <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
            7-Dimension Organizational Structure &amp; Governance Diagnostic
          </h2>
        </div>
        <p className="text-xs text-[#515154] mt-1.5 leading-relaxed">
          Evaluates Hierarchy, Centralization, Formalization, Specialization, Delegation &amp; Authority, Coordination &amp; Integration, and Governance. Reporting lines not supported by public filings are strictly marked as Insufficient Evidence.
        </p>
      </div>

      {/* 7 Dimensions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-2">
        {dimensions.map((d) => {
          const isSelected =
            activeDim && activeDim.dimension_code === d.dimension_code;
          return (
            <div
              key={d.id}
              onClick={() => setSelectedDimCode(d.dimension_code)}
              className={`cursor-pointer apple-card p-5 card-hover flex flex-col justify-between ${
                isSelected
                  ? "border-[#0071e3] ring-2 ring-[#0071e3]/20 bg-white"
                  : "bg-white/85"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] font-mono border border-[#b3d7ff]">
                    {d.dimension_code}
                  </span>
                  <span className="text-[11px] text-[#86868b]">
                    Conf: <strong className="text-[#1d1d1f]">{d.confidence_level}</strong>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#1d1d1f] leading-snug">
                  {d.dimension_name}
                </h3>
                <div className="mt-2.5">
                  {classificationBadge(d.suitability_classification)}
                </div>
                <p className="text-xs text-[#515154] mt-3 line-clamp-3 leading-relaxed">
                  {d.assessment_summary}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-black/8 flex items-center justify-between text-xs text-[#0071e3] font-semibold">
                <span>{d.evidence_count} Citations</span>
                <span className="inline-flex items-center gap-1">
                  <span>Inspect</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Dimension Deep-Dive */}
      {activeDim ? (
        <div className="apple-card p-6 space-y-5 stagger-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/8 pb-4">
            <div>
              <div className="text-xs font-bold text-[#0071e3] uppercase tracking-wider">
                Dimension Deep-Dive • {activeDim.dimension_code.toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-[#1d1d1f] mt-1 tracking-tight">
                {activeDim.dimension_name}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {classificationBadge(activeDim.suitability_classification)}
              <span className="text-xs text-[#86868b]">
                Confidence: <strong className="text-[#1d1d1f]">{activeDim.confidence_level}</strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-[#1d1d1f] leading-relaxed bg-[#f5f5f7] p-4 rounded-2xl border border-black/8">
            {activeDim.assessment_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#eaf8ee] border border-[#a3e4b7]">
              <div className="font-bold text-[#1d7334] mb-2 uppercase tracking-wider text-[11px]">
                Observed Structural Strengths
              </div>
              <ul className="space-y-1.5 text-[#1d1d1f] list-disc pl-4">
                {(activeDim.strengths || []).map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4]">
              <div className="font-bold text-[#c9182b] mb-2 uppercase tracking-wider text-[11px]">
                Observed Structural Weaknesses / Tensions
              </div>
              <ul className="space-y-1.5 text-[#1d1d1f] list-disc pl-4">
                {(activeDim.weaknesses || []).map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Documentary Citations for Dimension */}
          <div>
            <h4 className="text-xs font-bold text-[#86868b] uppercase tracking-wider mb-3">
              Documentary Citations for {activeDim.dimension_name}
            </h4>
            <div className="space-y-2.5">
              {(evidenceByDim[activeDim.dimension_code] || []).length === 0 ? (
                <div className="text-xs text-[#86868b] italic p-4 bg-[#f5f5f7] rounded-xl border border-black/8">
                  No direct quotations indexed for this dimension in this assessment period.
                </div>
              ) : (
                (evidenceByDim[activeDim.dimension_code] || []).map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {evidenceClassBadge(ev.evidence_classification)}
                        <span className="font-bold text-[#1d1d1f]">
                          {ev.document_name}
                        </span>
                        <span className="text-[#86868b]">
                          (p. {ev.page_number})
                        </span>
                      </div>
                      <span className="text-[11px] text-[#0066cc] font-mono font-semibold">
                        FY: {ev.financial_year || "N/A"}
                      </span>
                    </div>
                    <p className="italic text-[#1d1d1f] pl-3 border-l-2 border-[#0071e3] leading-relaxed">
                      &ldquo;{ev.exact_quotation}&rdquo;
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Disclosed Organizational Units Table */}
      <div className="apple-card overflow-hidden stagger-4">
        <div className="p-5 border-b border-black/8 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">
              Explicitly Disclosed Organizational Units ({units.length})
            </h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              Committees, divisions, functions, and oversight boards extracted directly from filings
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#86868b] border-b border-black/8">
                <th className="p-3.5 font-bold">Unit Name</th>
                <th className="p-3.5 font-bold">Type</th>
                <th className="p-3.5 font-bold">Dimension</th>
                <th className="p-3.5 font-bold">Reporting Line</th>
                <th className="p-3.5 font-bold">Core Mandate &amp; Responsibilities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {units.map((u: any) => (
                <tr key={u.id} className="hover:bg-black/[0.02] transition">
                  <td className="p-3.5 font-bold text-[#1d1d1f]">{u.name}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] border border-black/10 font-medium whitespace-nowrap">
                      {u.unit_type}
                    </span>
                  </td>
                  <td className="p-3.5 uppercase font-semibold text-[#0066cc] font-mono">
                    {u.dimension_code}
                  </td>
                  <td className="p-3.5 text-[#515154]">
                    {u.reporting_line.includes("Insufficient Evidence") ? (
                      <span className="italic text-[#b25e00] font-mono text-[11px]">
                        {u.reporting_line}
                      </span>
                    ) : (
                      <strong className="text-[#1d1d1f]">{u.reporting_line}</strong>
                    )}
                  </td>
                  <td className="p-3.5 text-[#515154] max-w-md leading-relaxed">
                    {u.responsibilities}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
