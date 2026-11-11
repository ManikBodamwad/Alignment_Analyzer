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
      <div className="space-y-6 text-white">
        <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-base font-bold text-white">
                Traceable Evidence Repository & Quality Scoring ({evidenceList.length} Records)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Classifies every extracted claim into FACT, COMPANY CLAIM, THIRD-PARTY CLAIM, or INFERENCE. Evidence quality is scored separately from alignment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/reports/${assessmentPeriodId}/export/evidence-csv`}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
            >
              ⬇ Export Evidence CSV
            </a>
            <a
              href={`/api/reports/${assessmentPeriodId}/export/evidence-xlsx`}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition"
            >
              ⬇ Export Evidence Excel (.xlsx)
            </a>
          </div>
        </div>

        {/* Classification Filters */}
        <div className="glass-card bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-400">
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
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {cl.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-rose-400">
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
              className="glass-card bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-violet-300">
                    Evidence #{ev.id}
                  </span>
                  {evidenceClassBadge(ev.evidence_classification)}
                  <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono uppercase text-[10px] border border-slate-800">
                    Dimension: {ev.organizational_dimension}
                  </span>
                  {ev.is_contradictory ? (
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold text-[10px]">
                      ⚠ Contradictory
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span>
                    Confidence: <strong className="text-slate-200">{ev.confidence_level}</strong>
                  </span>
                  <span>
                    Quality:{" "}
                    <strong className="text-cyan-300 font-mono">
                      {Math.round(ev.quality_score * 100)}%
                    </strong>
                  </span>
                </div>
              </div>

              <div className="font-semibold text-white">
                {ev.extracted_statement}
              </div>

              <blockquote className="p-3 rounded-lg bg-slate-950 border-l-4 border-violet-500 italic text-slate-300 font-serif">
                "{ev.exact_quotation}"
              </blockquote>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  Document: <strong className="text-slate-200">{ev.document_name}</strong> • Page{" "}
                  <strong className="text-slate-200">{ev.page_number}</strong> • Section:{" "}
                  <strong className="text-slate-200">{ev.section_heading}</strong>
                </span>
                <span className="font-mono text-cyan-300">
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
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse inline-block mr-2" />
        Generating 14-section evidence diagnostic report...
      </div>
    );
  }

  const sec = report.sections;

  return (
    <div className="space-y-6 text-white">
      {/* Export Action Header */}
      <div className="glass-card bg-slate-950 p-6 rounded-2xl border border-violet-800/80 shadow-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-violet-400 uppercase tracking-wider">
            Comprehensive 14-Section Diagnostic Report
          </div>
          <h2 className="text-xl font-extrabold mt-1 text-white">
            {report.company_name} — {report.assessment_title}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Overall Alignment: <strong className="text-cyan-300">{report.overall_alignment_score}%</strong>{" "}
            | Evidence Coverage: <strong className="text-violet-300">{report.evidence_coverage_pct}%</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/reports/${assessmentPeriodId}/export/pdf`}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition"
          >
            ⬇ Export Report PDF (.pdf)
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/docx`}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition"
          >
            ⬇ Export Report Word (.docx)
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/evidence-csv`}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            ⬇ Evidence CSV
          </a>
          <a
            href={`/api/reports/${assessmentPeriodId}/export/evidence-xlsx`}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition"
          >
            ⬇ Evidence XLSX
          </a>
        </div>
      </div>

      {/* 14 Report Sections */}
      <div className="glass-card bg-slate-900/90 p-6 rounded-xl border border-slate-800 shadow-xl space-y-6 text-xs">
        <div>
          <h3 className="text-sm font-extrabold text-white border-b border-slate-800 pb-2">
            {sec["1_executive_summary"].title}
          </h3>
          <p className="mt-2 text-slate-300 leading-relaxed font-serif">
            {sec["1_executive_summary"].summary_narrative}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-white border-b border-slate-800 pb-2">
            {sec["2_company_overview"].title} &{" "}
            {sec["3_assessment_methodology"].title}
          </h3>
          <p className="mt-2 text-slate-300">
            <strong className="text-white">{sec["2_company_overview"].company_name}</strong> (
            {sec["2_company_overview"].industry}):{" "}
            {sec["2_company_overview"].description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(sec["2_company_overview"].analysis_priorities || []).map(
              (p: string, i: number) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded bg-violet-950/70 border border-violet-700/60 text-violet-300 font-semibold"
                >
                  {p}
                </span>
              )
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-white border-b border-slate-800 pb-2">
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
                className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-white">{s.name}</span>
                  <span className="text-slate-400 ml-2">
                    (W: {s.importance_weight}x, Influence: {s.influence_level})
                  </span>
                </div>
                <div className="font-mono font-bold text-cyan-300">
                  {s.alignment_score !== null ? `${s.alignment_score}%` : "N/A"}{" "}
                  (Cov: {s.evidence_coverage_pct}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-white border-b border-slate-800 pb-2">
            {sec["6_organizational_structure_analysis"].title}
          </h3>
          <div className="space-y-2 mt-3">
            {(sec["6_organizational_structure_analysis"].dimensions || []).map(
              (d: any) => (
                <div
                  key={d.dimension_code}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-white">
                      {d.dimension_name}
                    </span>
                    <p className="text-slate-400 mt-0.5">
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
          <h3 className="text-sm font-extrabold text-white border-b border-slate-800 pb-2">
            {sec["10_key_organizational_gaps"].title} &{" "}
            {sec["11_recommendations"].title}
          </h3>
          <div className="space-y-2.5 mt-3">
            {(sec["11_recommendations"].recommendations || []).map((r: any) => (
              <div
                key={r.id}
                className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {priorityBadge(r.priority)}
                    <span className="font-bold text-white">{r.title}</span>
                  </div>
                  <span className="font-semibold text-violet-300 font-mono">
                    {r.status}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {r.suggested_organizational_change}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-white border-b border-slate-800 pb-2">
            {sec["12_evidence_limitations"].title} &{" "}
            {sec["13_sources_and_references"].title}
          </h3>
          <div className="mt-2 p-3.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200">
            {sec["12_evidence_limitations"].limitation_statement}
          </div>
        </div>
      </div>
    </div>
  );
}
