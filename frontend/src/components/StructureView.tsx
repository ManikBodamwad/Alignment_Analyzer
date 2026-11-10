import { h, useState } from "../lib/react-lite";
import { classificationBadge, evidenceClassBadge } from "./badges";

export function StructureView(props: { structureData: any | null }) {
  const { structureData } = props;
  const [selectedDimCode, setSelectedDimCode] = useState<string>("governance");

  if (!structureData) {
    return (
      <div className="p-8 text-center text-slate-500">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">
          7-Dimension Organizational Structure & Governance Diagnostic
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluates Hierarchy, Centralization, Formalization, Specialization, Delegation & Authority, Coordination & Integration, and Governance. Reporting lines not supported by public filings are strictly marked as "Insufficient Evidence".
        </p>
      </div>

      {/* 7 Dimensions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dimensions.map((d) => {
          const isSelected = activeDim && activeDim.dimension_code === d.dimension_code;
          return (
            <div
              key={d.id}
              onClick={() => setSelectedDimCode(d.dimension_code)}
              className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm flex flex-col justify-between ${
                isSelected
                  ? "border-indigo-600 ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {d.dimension_code}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Confidence: <strong>{d.confidence_level}</strong>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {d.dimension_name}
                </h3>
                <div className="mt-2">
                  {classificationBadge(d.suitability_classification)}
                </div>
                <p className="text-xs text-slate-600 mt-3 line-clamp-3">
                  {d.assessment_summary}
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700 font-semibold">
                <span>{d.evidence_count} Evidence Records</span>
                <span>Inspect Dimension →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Dimension Deep-Dive */}
      {activeDim ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-bold text-indigo-600 uppercase">
                Dimension Deep-Dive • {activeDim.dimension_code.toUpperCase()}
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {activeDim.dimension_name}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {classificationBadge(activeDim.suitability_classification)}
              <span className="text-xs text-slate-500">
                Confidence: <strong>{activeDim.confidence_level}</strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            {activeDim.assessment_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <div className="font-bold text-emerald-900 mb-2">
                Identified Structural Strengths
              </div>
              <ul className="space-y-1 text-emerald-800 list-disc list-inside">
                {(activeDim.strengths || []).map((st: string, i: number) => (
                  <li key={i}>{st}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
              <div className="font-bold text-rose-900 mb-2">
                Structural Weaknesses & Evidence Gaps
              </div>
              <ul className="space-y-1 text-rose-800 list-disc list-inside">
                {(activeDim.weaknesses || []).map((wk: string, i: number) => (
                  <li key={i}>{wk}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Supporting Quotations for Active Dimension */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Supporting Documentary Evidence for {activeDim.dimension_name} (
              {(evidenceByDim[activeDim.dimension_code] || []).length})
            </h4>
            {(evidenceByDim[activeDim.dimension_code] || []).length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 text-xs text-slate-500">
                Insufficient Evidence: No direct quotations mapped to this organizational dimension yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(evidenceByDim[activeDim.dimension_code] || []).map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      {evidenceClassBadge(ev.evidence_classification)}
                      <span className="text-[11px] text-slate-500">
                        Quality: <strong>{Math.round(ev.quality_score * 100)}%</strong>
                      </span>
                    </div>
                    <blockquote className="italic text-slate-800 border-l-2 border-indigo-500 pl-2.5 py-0.5">
                      "{ev.exact_quotation}"
                    </blockquote>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Source: {ev.document_name} (Page {ev.page_number} •{" "}
                      {ev.section_heading})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Disclosed Organizational Units & Reporting Lines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Extracted Organizational Units, Committees & Reporting Lines ({units.length})
            </h3>
            <p className="text-xs text-slate-500">
              Anti-Hallucination Guardrail: Never fabricates internal reporting lines not supported by uploaded documents
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3 font-bold">Organizational Unit / Body</th>
                <th className="p-3 font-bold">Unit Type</th>
                <th className="p-3 font-bold">Disclosed Reporting Line</th>
                <th className="p-3 font-bold">Responsibilities</th>
                <th className="p-3 font-bold">Evidence Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{u.unit_name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                      {u.unit_type}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.reporting_line.includes("Insufficient Evidence") ? (
                      <span className="text-amber-700 font-semibold">
                        {u.reporting_line}
                      </span>
                    ) : (
                      <span className="text-slate-800 font-medium">
                        {u.reporting_line}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{u.responsibilities}</td>
                  <td className="p-3">
                    {evidenceClassBadge(u.evidence_classification)}
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

