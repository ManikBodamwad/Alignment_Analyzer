import { api } from "../api";
import { h, useEffect, useState } from "../lib/react-lite";
import { EvidenceRecord } from "../types";
import {
  classificationBadge,
  evidenceClassBadge,
  priorityBadge,
} from "./badges";

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
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Traceable Evidence Repository & Quality Scoring ({evidenceList.length} Records)
            </h2>
            <p className="text-xs text-slate-500">
              Classifies every extracted claim into FACT, COMPANY CLAIM, THIRD-PARTY CLAIM, or INFERENCE. Evidence quality is scored separately from alignment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/reports/${assessmentPeriodId}/export/evidence-csv`}
              className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              ⬇ Export Evidence CSV
            </a>
            <a
              href={`/api/reports/${assessmentPeriodId}/export/evidence-xlsx`}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
            >
              ⬇ Export Evidence Excel (.xlsx)
            </a>
          </div>
        </div>

        {/* Classification Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700">
              Filter by Classification:
            </span>
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
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  evFilter === cl
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cl.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-rose-700">
            <input
              type="checkbox"
              checked={contradictoryOnly}
              onChange={(e: any) => setContradictoryOnly(e.target.checked)}
            />
            <span>Show Only Contradictory Evidence</span>
          </label>
        </div>

        {/* Evidence Records Cards */}
        <div className="space-y-3">
          {filteredEv.map((ev) => (
            <div
              key={ev.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">
                    Evidence #{ev.id}
                  </span>
                  {evidenceClassBadge(ev.evidence_classification)}
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                    Dimension: {ev.organizational_dimension}
                  </span>
                  {ev.is_contradictory ? (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                      ⚠ Contradictory Evidence
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <span>
                    Confidence: <strong>{ev.confidence_level}</strong>
                  </span>
                  <span>
                    Evidence Quality:{" "}
                    <strong className="text-indigo-700">
                      {Math.round(ev.quality_score * 100)}%
                    </strong>
                  </span>
                </div>
              </div>

              <div className="font-semibold text-slate-900">
                {ev.extracted_statement}
              </div>

              <blockquote className="p-3 rounded-lg bg-slate-50 border-l-4 border-indigo-500 italic text-slate-800">
                "{ev.exact_quotation}"
              </blockquote>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  Document: <strong>{ev.document_name}</strong> • Page{" "}
                  <strong>{ev.page_number}</strong> • Section:{" "}
                  <strong>{ev.section_heading}</strong>
                </span>
                <span>
                  FY: {ev.financial_year} | Pub: {ev.publication_date || "N/A"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 14-Section Diagnostic Report View
  if (!report) {
    return (
      <div className="p-8 text-center text-slate-500">
        Generating 14-section diagnostic report...
      </div>
    );
  }

  const sec = report.sections;

  return (
    <div className="space-y-6">
      {/* Export Action Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
            Comprehensive 14-Section Diagnostic Report
          </div>
          <h2 className="text-xl font-extrabold mt-1">
            {report.company_name} — {report.assessment_title}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Overall Alignment: <strong>{report.overall_alignment_score}%</strong>{" "}
            | Evidence Coverage: <strong>{report.evidence_coverage_pct}%</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/reports/${assessmentPeriodId}/export/pdf`}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition"
          >
            ⬇ Export Report PDF (.pdf)
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/docx`}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
          >
            ⬇ Export Report Word (.docx)
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/evidence-csv`}
            className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
          >
            ⬇ Evidence CSV
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/evidence-xlsx`}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
          >
            ⬇ Evidence XLSX
          </a>
        </div>
      </div>

      {/* 14 Report Sections */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-xs">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2">
            {sec["1_executive_summary"].title}
          </h3>
          <p className="mt-2 text-slate-700 leading-relaxed">
            {sec["1_executive_summary"].summary_narrative}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2">
            {sec["2_company_overview"].title} &{" "}
            {sec["3_assessment_methodology"].title}
          </h3>
          <p className="mt-2 text-slate-700">
            <strong>{sec["2_company_overview"].company_name}</strong> (
            {sec["2_company_overview"].industry}):{" "}
            {sec["2_company_overview"].description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(sec["2_company_overview"].analysis_priorities || []).map(
              (p: string, i: number) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold"
                >
                  {p}
                </span>
              )
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2">
            {sec["4_stakeholder_landscape"].title} &{" "}
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
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900">{s.name}</span>
                  <span className="text-slate-500 ml-2">
                    (Weight: {s.importance_weight}x, Influence:{" "}
                    {s.influence_level})
                  </span>
                </div>
                <div className="font-bold text-indigo-700">
                  {s.alignment_score !== null ? `${s.alignment_score}%` : "N/A"}{" "}
                  (Cov: {s.evidence_coverage_pct}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2">
            {sec["6_organizational_structure_analysis"].title}
          </h3>
          <div className="space-y-2 mt-3">
            {(sec["6_organizational_structure_analysis"].dimensions || []).map(
              (d: any) => (
                <div
                  key={d.dimension_code}
                  className="p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      {d.dimension_name}
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      {d.assessment_summary}
                    </p>
                  </div>
                  {classificationBadge(d.suitability_classification)}
                </div>
              )
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2">
            {sec["10_key_organizational_gaps"].title} &{" "}
            {sec["11_recommendations"].title}
          </h3>
          <div className="space-y-2.5 mt-3">
            {(sec["11_recommendations"].recommendations || []).map((r: any) => (
              <div
                key={r.id}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {priorityBadge(r.priority)}
                    <span className="font-bold text-slate-900">{r.title}</span>
                  </div>
                  <span className="font-semibold text-indigo-700">
                    {r.status}
                  </span>
                </div>
                <p className="text-slate-700">
                  {r.suggested_organizational_change}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2">
            {sec["12_evidence_limitations"].title} &{" "}
            {sec["13_sources_and_references"].title}
          </h3>
          <div className="mt-2 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
            {sec["12_evidence_limitations"].limitation_statement}
          </div>
        </div>
      </div>
    </div>
  );
}

