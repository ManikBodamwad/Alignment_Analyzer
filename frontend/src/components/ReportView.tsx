import { api } from "../api";
import { h, useEffect, useState } from "../lib/react-lite";
import { EvidenceRecord } from "../types";
import {
  classificationBadge,
  evidenceClassBadge,
  priorityBadge,
} from "./badges";
import { DownloadIcon, ReportIcon, SearchIcon } from "./icons";

export function ReportView(props: {
  assessmentPeriodId: number;
  evidenceList: EvidenceRecord[];
  mode: "report" | "evidence";
}) {
  const { assessmentPeriodId, evidenceList, mode } = props;
  const [report, setReport] = useState<any | null>(null);
  const [evFilter, setEvFilter] = useState<string>("ALL");
  const [contradictoryOnly, setContradictoryOnly] = useState<boolean>(false);

  useEffect(() => {
    if (assessmentPeriodId) {
      api.getReport(assessmentPeriodId).then(setReport).catch(() => {});
    }
  }, [assessmentPeriodId]);

  const filteredEv = evidenceList.filter((e) => {
    if (evFilter !== "ALL" && e.evidence_classification !== evFilter)
      return false;
    if (contradictoryOnly && !e.is_contradictory) return false;
    return true;
  });

  if (mode === "evidence") {
    return (
      <div className="space-y-6 text-[#1d1d1f]">
        <div className="apple-card p-6 stagger-1 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0">
                <SearchIcon className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
                Traceable Evidence Repository &amp; Quality Scoring ({evidenceList.length} Records)
              </h2>
            </div>
            <p className="text-xs text-[#86868b] mt-1">
              Classifies every extracted claim into FACT, COMPANY CLAIM, THIRD-PARTY CLAIM, or INFERENCE. Evidence quality is scored separately from alignment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={`/api/reports/${assessmentPeriodId}/export/evidence-csv`}
              className="apple-btn-secondary"
            >
              <DownloadIcon className="w-4 h-4 text-[#0071e3]" />
              <span>Export Evidence CSV</span>
            </a>
            <a
              href={`/api/reports/${assessmentPeriodId}/export/evidence-xlsx`}
              className="apple-btn-primary"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Export Evidence Excel (.xlsx)</span>
            </a>
          </div>
        </div>

        {/* Classification Filters */}
        <div className="apple-card p-4 stagger-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#86868b] mr-1">
              Filter by Classification:
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-black/8">
              {[
                "ALL",
                "FACT",
                "COMPANY_CLAIM",
                "THIRD_PARTY_CLAIM",
                "INFERENCE",
              ].map((cl) => (
                <button
                  key={cl}
                  onClick={() => setEvFilter(cl)}
                  className={`px-3 py-1 rounded-full font-semibold transition ${
                    evFilter === cl
                      ? "bg-[#0071e3] text-white shadow-sm"
                      : "text-[#515154] hover:text-[#1d1d1f]"
                  }`}
                >
                  {cl.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#c9182b]">
            <input
              type="checkbox"
              checked={contradictoryOnly}
              onChange={(e: any) => setContradictoryOnly(e.target.checked)}
            />
            <span>Show Only Contradictory Evidence</span>
          </label>
        </div>

        {/* Evidence Records Cards */}
        <div className="space-y-3 stagger-3">
          {filteredEv.length === 0 ? (
            <div className="apple-card p-10 text-center text-xs text-[#86868b]">
              No evidence records match the selected filter criteria.
            </div>
          ) : (
            filteredEv.map((ev) => (
              <div
                key={ev.id}
                className="apple-card p-5 space-y-2.5 text-xs card-hover"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-[#0071e3]">
                      Evidence #{ev.id}
                    </span>
                    {evidenceClassBadge(ev.evidence_classification)}
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] font-mono uppercase text-[10px] border border-black/8">
                      Dimension: {ev.organizational_dimension}
                    </span>
                    {ev.is_contradictory ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#fdeef0] text-[#c9182b] border border-[#f9abb4] font-bold text-[10px]">
                        Contradictory
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-[#86868b]">
                    <span>
                      Confidence: <strong className="text-[#1d1d1f]">{ev.confidence_level}</strong>
                    </span>
                    <span>
                      Quality:{" "}
                      <strong className="text-[#0071e3] font-mono tabular-nums">
                        {Math.round(ev.quality_score * 100)}%
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="font-bold text-[#1d1d1f] text-sm">
                  {ev.extracted_statement}
                </div>

                <blockquote className="p-3.5 rounded-xl bg-[#f5f5f7] border-l-4 border-[#0071e3] italic text-[#1d1d1f] leading-relaxed">
                  &ldquo;{ev.exact_quotation}&rdquo;
                </blockquote>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#86868b] pt-1 gap-2">
                  <span>
                    Document: <strong className="text-[#1d1d1f]">{ev.document_name}</strong> • Page{" "}
                    <strong className="text-[#1d1d1f]">{ev.page_number}</strong> • Section:{" "}
                    <strong className="text-[#1d1d1f]">{ev.section_heading}</strong>
                  </span>
                  <span className="font-mono text-[#0066cc] font-semibold">
                    FY: {ev.financial_year} | Pub: {ev.publication_date || "N/A"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 14-Section Diagnostic Report View
  if (!report) {
    return (
      <div className="p-12 text-center text-[#86868b] font-medium text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-pulse inline-block mr-2" />
        Generating 14-section evidence diagnostic report...
      </div>
    );
  }

  const sec = report.sections;

  return (
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Export Action Header */}
      <div className="apple-card p-6 stagger-1 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#0071e3] uppercase tracking-wider flex items-center gap-1.5">
            <ReportIcon className="w-3.5 h-3.5" />
            <span>Comprehensive 14-Section Diagnostic Report</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-[#1d1d1f] tracking-tight">
            {report.company_name} — {report.assessment_title}
          </h2>
          <p className="text-xs text-[#86868b] mt-1 font-mono">
            Overall Alignment:{" "}
            <strong className="text-[#0071e3]">{report.overall_alignment_score}%</strong> | Evidence Coverage:{" "}
            <strong className="text-[#1d7334]">{report.evidence_coverage_pct}%</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href={`/api/reports/${assessmentPeriodId}/export/pdf`}
            className="apple-btn-primary"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Export PDF (.pdf)</span>
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/docx`}
            className="apple-btn-secondary"
          >
            <DownloadIcon className="w-4 h-4 text-[#0071e3]" />
            <span>Export Word (.docx)</span>
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/evidence-csv`}
            className="apple-btn-secondary"
          >
            <DownloadIcon className="w-4 h-4 text-[#515154]" />
            <span>Evidence CSV</span>
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/evidence-xlsx`}
            className="apple-btn-secondary"
          >
            <DownloadIcon className="w-4 h-4 text-[#1d7334]" />
            <span>Evidence XLSX</span>
          </a>
        </div>
      </div>

      {/* 14 Report Sections */}
      <div className="apple-card p-6 space-y-6 text-xs stagger-2">
        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2">
            {sec["1_executive_summary"].title}
          </h3>
          <p className="mt-2.5 text-[#515154] leading-relaxed text-sm">
            {sec["1_executive_summary"].summary_narrative}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2">
            {sec["2_company_overview"].title} &amp;{" "}
            {sec["3_assessment_methodology"].title}
          </h3>
          <p className="mt-2.5 text-[#515154] leading-relaxed">
            <strong className="text-[#1d1d1f]">
              {sec["2_company_overview"].company_name}
            </strong>{" "}
            ({sec["2_company_overview"].industry}):{" "}
            {sec["2_company_overview"].description}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(sec["2_company_overview"].analysis_priorities || []).map(
              (p: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-[#e8f2fe] border border-[#b3d7ff] text-[#0066cc] font-semibold"
                >
                  {p}
                </span>
              )
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2">
            {sec["4_stakeholder_landscape"].title} &amp;{" "}
            {sec["5_stakeholder_expectations"].title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {(
              sec["4_stakeholder_landscape"].internal_stakeholders.concat(
                sec["4_stakeholder_landscape"].external_stakeholders
              ) || []
            ).map((s: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#fbfbfd] border border-black/8 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="font-bold text-[#1d1d1f]">{s.name}</span>
                  <span className="text-[#86868b] ml-2">
                    (W: {s.importance_weight}x, Influence: {s.influence_level})
                  </span>
                </div>
                <div className="font-mono font-bold text-[#0071e3] shrink-0 tabular-nums">
                  {s.alignment_score !== null ? `${s.alignment_score}%` : "N/A"}{" "}
                  (Cov: {s.evidence_coverage_pct}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2">
            {sec["6_organizational_structure_analysis"].title}
          </h3>
          <div className="space-y-2.5 mt-3">
            {(sec["6_organizational_structure_analysis"].dimensions || []).map(
              (d: any) => (
                <div
                  key={d.dimension_code}
                  className="p-3.5 rounded-2xl border border-black/8 bg-[#fbfbfd] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-[#1d1d1f]">
                      {d.dimension_name}
                    </span>
                    <p className="text-[#515154] mt-0.5 leading-relaxed">
                      {d.assessment_summary}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {classificationBadge(d.suitability_classification)}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2">
            {sec["10_key_organizational_gaps"].title} &amp;{" "}
            {sec["11_recommendations"].title}
          </h3>
          <div className="space-y-2.5 mt-3">
            {(sec["11_recommendations"].recommendations || []).map((r: any) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {priorityBadge(r.priority)}
                    <span className="font-bold text-[#1d1d1f]">{r.title}</span>
                  </div>
                  <span className="font-semibold text-[#0071e3] font-mono">
                    {r.status}
                  </span>
                </div>
                <p className="text-[#515154] leading-relaxed">
                  {r.suggested_organizational_change}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-black/8 pb-2">
            {sec["12_evidence_limitations"].title} &amp;{" "}
            {sec["13_sources_and_references"].title}
          </h3>
          <div className="mt-2.5 p-4 rounded-2xl bg-[#fff7e6] border border-[#ffd580] text-[#1d1d1f] leading-relaxed">
            {sec["12_evidence_limitations"].limitation_statement}
          </div>
        </div>
      </div>
    </div>
  );
}
