import { h } from "../lib/react-lite";
import { AssessmentFullSummary, StakeholderProfile } from "../types";
import { classificationBadge, RadialScoreGauge } from "./badges";

export function DashboardView(props: {
  summary: AssessmentFullSummary | null;
  stakeholders: StakeholderProfile[];
  onNavigate: (tab: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}) {
  const { summary, stakeholders, onNavigate, onRunAnalysis, isAnalyzing } = props;
  if (!summary) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading organizational diagnostic overview...
      </div>
    );
  }

  const { assessment, metrics, dimensions_summary } = summary;
  const totalReq =
    metrics.strong_alignments +
    metrics.partial_alignments +
    metrics.potential_misalignments +
    metrics.insufficient_evidence_count;

  return (
    <div className="space-y-6">
      {/* Top Executive Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <span>Organizational Alignment Diagnostic</span>
              <span>•</span>
              <span>{assessment.fiscal_year}</span>
              {assessment.company_ticker ? (
                <span className="px-2 py-0.5 bg-indigo-900/80 border border-indigo-600 rounded text-white">
                  {assessment.company_ticker}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-extrabold mt-1">
              {assessment.company_name} — {assessment.title}
            </h1>
            <p className="text-slate-300 text-xs mt-1">
              Last Assessed:{" "}
              {assessment.last_analyzed_at
                ? new Date(assessment.last_analyzed_at).toLocaleString()
                : "Not yet analyzed"}{" "}
              | Status:{" "}
              <span className="uppercase font-semibold text-emerald-300">
                {assessment.status}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("documents")}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold transition"
            >
              + Upload Company Documents
            </button>
            <button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-xs font-bold shadow transition"
            >
              {isAnalyzing
                ? "Running 6-Stage AI Analysis..."
                : "Run Full Diagnostic Analysis"}
            </button>
            <button
              onClick={() => onNavigate("report")}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold transition"
            >
              Export Report (PDF / DOCX)
            </button>
          </div>
        </div>
      </div>

      {/* Evidence Coverage Warning if < 85% */}
      {assessment.evidence_coverage_pct < 85 ? (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong>Evidence Coverage Notice ({assessment.evidence_coverage_pct}%):</strong>{" "}
            {metrics.insufficient_evidence_count} stakeholder requirement(s) currently lack
            sufficient documentary evidence and are excluded from the alignment score
            denominator rather than assigned zero. Upload additional governance charters,
            10-K filings, or independent audits to increase evidence coverage.
          </div>
        </div>
      ) : null}

      {/* Dual Gauges + KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RadialScoreGauge
          label="Overall Alignment Score"
          sublabel="Weighted average across assessed stakeholder expectations (Scale: Strong=4, Partial=3, Misaligned=1)"
          value={assessment.overall_alignment_score}
          colorHex={
            (assessment.overall_alignment_score || 0) >= 75
              ? "#10b981"
              : (assessment.overall_alignment_score || 0) >= 55
              ? "#f59e0b"
              : "#f43f5e"
          }
        />
        <RadialScoreGauge
          label="Evidence Coverage"
          sublabel="Percentage of applicable stakeholder requirements backed by extracted documentary evidence"
          value={assessment.evidence_coverage_pct}
          colorHex="#4f46e5"
        />

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">
              Knowledge Base & Evidence
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {metrics.documents_processed}
              </span>
              <span className="text-xs text-slate-500">
                documents indexed ({metrics.evidence_records_count} citations)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Stakeholders Assessed:{" "}
              <strong>
                {metrics.stakeholders_assessed} / {metrics.total_stakeholders}
              </strong>
            </span>
            <button
              onClick={() => onNavigate("evidence")}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Inspect Evidence →
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">
              Alignment Gaps & Diagnostics
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-600">
                {metrics.alignment_gaps_identified}
              </span>
              <span className="text-xs text-slate-500">
                gaps ({metrics.potential_misalignments} misaligned,{" "}
                {metrics.partial_alignments} partial)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Actionable Recommendations:{" "}
              <strong>{metrics.recommendations_count}</strong>
            </span>
            <button
              onClick={() => onNavigate("recommendations")}
              className="text-indigo-600 font-semibold hover:underline"
            >
              View Actions →
            </button>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Requirement Alignment Distribution ({totalReq} Total Requirements Evaluated)
            </h3>
            <p className="text-xs text-slate-500">
              Click any cell in the Alignment Matrix to inspect exact quotations, root causes, and score math
            </p>
          </div>
          <button
            onClick={() => onNavigate("matrix")}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
          >
            Open Interactive Alignment Matrix →
          </button>
        </div>

        <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-100">
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.strong_alignments / totalReq) * 100}%`,
              }}
              className="bg-emerald-500 h-full"
              title={`Strong Alignment: ${metrics.strong_alignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.partial_alignments / totalReq) * 100}%`,
              }}
              className="bg-amber-500 h-full"
              title={`Partial Alignment: ${metrics.partial_alignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.potential_misalignments / totalReq) * 100}%`,
              }}
              className="bg-rose-500 h-full"
              title={`Potential Misalignment: ${metrics.potential_misalignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.insufficient_evidence_count / totalReq) * 100}%`,
              }}
              className="bg-slate-300 h-full"
              title={`Insufficient Evidence: ${metrics.insufficient_evidence_count}`}
            ></div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <span className="font-semibold text-emerald-900">Strong Alignment (4)</span>
            <span className="font-extrabold text-emerald-700 text-sm">
              {metrics.strong_alignments}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
            <span className="font-semibold text-amber-900">Partial Alignment (3)</span>
            <span className="font-extrabold text-amber-700 text-sm">
              {metrics.partial_alignments}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between">
            <span className="font-semibold text-rose-900">Potential Misalignment (1)</span>
            <span className="font-extrabold text-rose-700 text-sm">
              {metrics.potential_misalignments}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Insufficient Evidence (N/A)</span>
            <span className="font-extrabold text-slate-700 text-sm">
              {metrics.insufficient_evidence_count}
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Chart Grid: Stakeholder Alignment vs Coverage & 7 Organizational Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stakeholder Alignment & Coverage Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Stakeholder Alignment Score vs. Evidence Coverage
              </h3>
              <p className="text-xs text-slate-500">
                Weighted by evaluator importance weights
              </p>
            </div>
            <button
              onClick={() => onNavigate("stakeholders")}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Adjust Weights →
            </button>
          </div>
          <div className="space-y-3">
            {stakeholders.map((sh) => {
              const score = sh.alignment_score;
              const barColor =
                score === null
                  ? "bg-slate-300"
                  : score >= 75
                  ? "bg-emerald-500"
                  : score >= 55
                  ? "bg-amber-500"
                  : "bg-rose-500";
              return (
                <div key={sh.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{sh.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                        {sh.category} • W:{sh.importance_weight}x
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        Cov: <strong>{sh.evidence_coverage_pct}%</strong>
                      </span>
                      <span className="font-bold text-slate-900 w-14 text-right">
                        {score !== null ? `${score}%` : "Insuff."}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`${barColor} h-full transition-all`}
                      style={{ width: `${score !== null ? score : 0}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7 Organizational Dimensions Suitability & Company Priorities */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  7 Organizational Structure Dimensions
                </h3>
                <p className="text-xs text-slate-500">
                  Structural suitability based on extracted evidence
                </p>
              </div>
              <button
                onClick={() => onNavigate("structure")}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                Inspect Structure →
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {dimensions_summary.map((d) => (
                <div
                  key={d.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">
                      {d.dimension_name}
                    </span>
                    <span className="text-slate-400 ml-2">
                      ({d.evidence_count} evidence records)
                    </span>
                  </div>
                  {classificationBadge(d.suitability_classification)}
                </div>
              ))}
            </div>
          </div>

          {/* Company-Specific Analysis Priorities (Section 10) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">
              Configured Company-Specific Diagnostic Priorities ({assessment.company_name})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">
              Priority focus areas guiding RAG retrieval and expectation discovery without predetermining conclusions
            </p>
            <div className="flex flex-wrap gap-2">
              {(assessment.company_priorities || []).map((prio, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold"
                >
                  {prio}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

