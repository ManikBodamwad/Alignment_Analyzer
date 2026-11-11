import { h, useState } from "../lib/react-lite";
import { classificationBadge, evidenceClassBadge } from "./badges";

export function StructureView(props: { structureData: any | null }) {
  const { structureData } = props;
  const [selectedDimCode, setSelectedDimCode] = useState<string>("governance");

  if (!structureData) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse inline-block mr-2" />
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
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-base font-bold text-white">
            7-Dimension Organizational Structure & Governance Diagnostic
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
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
              className={`cursor-pointer glass-card rounded-xl p-4 border transition-all duration-200 shadow-xl flex flex-col justify-between ${
                isSelected
                  ? "bg-slate-800/95 border-violet-500 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/20"
                  : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono border border-slate-800">
                    {d.dimension_code}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Conf: <strong className="text-slate-200">{d.confidence_level}</strong>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  {d.dimension_name}
                </h3>
                <div className="mt-2">
                  {classificationBadge(d.suitability_classification)}
                </div>
                <p className="text-xs text-slate-400 mt-3 line-clamp-3">
                  {d.assessment_summary}
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-violet-400 font-semibold">
                <span>{d.evidence_count} Citations</span>
                <span>Inspect →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Dimension Deep-Dive */}
      {activeDim ? (
        <div className="glass-card bg-slate-900/90 p-6 rounded-xl border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                Dimension Deep-Dive • {activeDim.dimension_code.toUpperCase()}
              </div>
              <h3 className="text-lg font-extrabold text-white mt-1">
                {activeDim.dimension_name}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {classificationBadge(activeDim.suitability_classification)}
              <span className="text-xs text-slate-400">
                Confidence: <strong className="text-slate-200">{activeDim.confidence_level}</strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
            {activeDim.assessment_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
              <div className="font-bold text-emerald-300 mb-1.5">
                Observed Structural Strengths
              </div>
              <ul className="space-y-1 text-emerald-200 list-disc list-inside">
                {(activeDim.strengths || []).map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30">
              <div className="font-bold text-rose-300 mb-1.5">
                Observed Structural Weaknesses / Tensions
              </div>
              <ul className="space-y-1 text-rose-200 list-disc list-inside">
                {(activeDim.weaknesses || []).map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Documentary Citations for Dimension */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Documentary Citations for {activeDim.dimension_name}
            </h4>
            <div className="space-y-2">
              {(evidenceByDim[activeDim.dimension_code] || []).length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  No direct quotations indexed for this dimension in this assessment period.
                </div>
              ) : (
                (evidenceByDim[activeDim.dimension_code] || []).map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {evidenceClassBadge(ev.evidence_classification)}
                        <span className="font-bold text-slate-200">
                          {ev.document_name}
                        </span>
                        <span className="text-slate-400">
                          (p. {ev.page_number})
                        </span>
                      </div>
                      <span className="text-[10px] text-cyan-300 font-mono">
                        FY: {ev.financial_year || "N/A"}
                      </span>
                    </div>
                    <p className="font-serif italic text-slate-300 pl-2 border-l-2 border-violet-500">
                      "{ev.exact_quotation}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Disclosed Organizational Units Table */}
      <div className="glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Explicitly Disclosed Organizational Units ({units.length})
            </h3>
            <p className="text-xs text-slate-400">
              Committees, divisions, functions, and oversight boards extracted directly from filings
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-3 font-bold">Unit Name</th>
                <th className="p-3 font-bold">Type</th>
                <th className="p-3 font-bold">Dimension</th>
                <th className="p-3 font-bold">Reporting Line</th>
                <th className="p-3 font-bold">Core Mandate & Responsibilities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {units.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-bold text-white">{u.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {u.unit_type}
                    </span>
                  </td>
                  <td className="p-3 uppercase font-semibold text-violet-300 font-mono">
                    {u.dimension_code}
                  </td>
                  <td className="p-3 text-slate-300">
                    {u.reporting_line.includes("Insufficient Evidence") ? (
                      <span className="italic text-slate-500">
                        {u.reporting_line}
                      </span>
                    ) : (
                      <strong className="text-slate-200">{u.reporting_line}</strong>
                    )}
                  </td>
                  <td className="p-3 text-slate-300 max-w-md">
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
