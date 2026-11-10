import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { AlignmentMatrixCell } from "../types";
import {
  classificationBadge,
  evidenceClassBadge,
  priorityBadge,
} from "./badges";

export function MatrixView(props: {
  matrixData: any | null;
  onRefresh: () => void;
}) {
  const { matrixData, onRefresh } = props;
  const [selectedCell, setSelectedCell] = useState<AlignmentMatrixCell | null>(
    null
  );
  const [overrideClass, setOverrideClass] = useState<string>("Strong Alignment");
  const [overrideJustification, setOverrideJustification] = useState<string>("");
  const [overrideMsg, setOverrideMsg] = useState<string | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);

  if (!matrixData) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading Stakeholder × Structure Alignment Matrix...
      </div>
    );
  }

  const stakeholders: any[] = matrixData.stakeholders || [];
  const dimensions: any[] = matrixData.dimensions || [];
  const assessments: AlignmentMatrixCell[] = matrixData.assessments || [];

  const activeCell =
    (selectedCell &&
      assessments.find((a) => a.id === selectedCell.id)) ||
    assessments[0] ||
    null;

  const handleSelectCell = (cell: AlignmentMatrixCell) => {
    setSelectedCell(cell);
    setOverrideClass(cell.classification);
    setOverrideJustification("");
    setOverrideMsg(null);
  };

  const handleOverrideSubmit = async (ev: Event) => {
    ev.preventDefault();
    if (!activeCell) return;
    if (overrideJustification.trim().length < 5) {
      setOverrideMsg(
        "Error: Please provide a justification of at least 5 characters for the audit trail."
      );
      return;
    }
    setSavingOverride(true);
    try {
      const res = await api.overrideAlignment(
        activeCell.id,
        overrideClass,
        overrideJustification.trim()
      );
      setOverrideMsg(
        `Override saved & logged! Overall Alignment recalculated to ${res.recalculated_scores.overall_alignment_score}% (Coverage: ${res.recalculated_scores.evidence_coverage_pct}%).`
      );
      setOverrideJustification("");
      onRefresh();
    } catch (err: any) {
      setOverrideMsg(`Override failed: ${err.message}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const getCellStyle = (status: string) => {
    if (status === "Strong Alignment")
      return "bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200";
    if (status === "Partial Alignment")
      return "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200";
    if (status === "Potential Misalignment")
      return "bg-rose-100 border-rose-400 text-rose-900 hover:bg-rose-200";
    return "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Matrix Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Interactive Stakeholder × Organizational Structure Alignment Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Click any cell to inspect the AI's reasoning, requirement mapping, exact page citations, score calculation, and manual override controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
            Strong Alignment (4)
          </span>
          <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">
            Partial Alignment (3)
          </span>
          <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-900 font-bold border border-rose-300">
            Potential Misalignment (1)
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-bold border border-slate-300">
            Insufficient Evidence (N/A)
          </span>
        </div>
      </div>

      {/* Interactive Grid Table: Rows = Stakeholders, Columns = 7 Organizational Dimensions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3 font-bold min-w-[210px]">
                Stakeholder Group (Score / Cov)
              </th>
              {dimensions.map((d) => (
                <th
                  key={d.code}
                  className="p-3 font-bold text-center min-w-[130px] capitalize border-l border-slate-700"
                >
                  <div>{d.code}</div>
                  <div className="text-[10px] font-normal text-slate-300">
                    {d.suitability_classification.replace(" Alignment", "")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {stakeholders.map((sh) => {
              const shAssessments = assessments.filter(
                (a) => a.stakeholder_id === sh.id
              );
              return (
                <tr key={sh.id} className="hover:bg-slate-50/70">
                  <td className="p-3 bg-slate-50 font-bold text-slate-900 border-r border-slate-200">
                    <div className="flex items-center justify-between">
                      <span>{sh.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {sh.category}
                      </span>
                    </div>
                    <div className="text-[11px] font-normal text-slate-500 mt-1">
                      Align:{" "}
                      <strong>
                        {sh.alignment_score !== null
                          ? `${sh.alignment_score}%`
                          : "N/A"}
                      </strong>{" "}
                      • Cov: <strong>{sh.evidence_coverage_pct}%</strong>
                    </div>
                  </td>
                  {dimensions.map((dim) => {
                    const matchingCells = shAssessments.filter(
                      (a) => a.organizational_dimension === dim.code
                    );
                    return (
                      <td
                        key={dim.code}
                        className="p-2 border-l border-slate-100 align-top"
                      >
                        {matchingCells.length === 0 ? (
                          <div className="h-14 flex items-center justify-center text-[11px] text-slate-300 italic">
                            —
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {matchingCells.map((cell) => {
                              const isAct =
                                activeCell && activeCell.id === cell.id;
                              return (
                                <button
                                  key={cell.id}
                                  onClick={() => handleSelectCell(cell)}
                                  className={`w-full text-left p-2 rounded-lg border transition ${getCellStyle(
                                    cell.classification
                                  )} ${
                                    isAct
                                      ? "ring-2 ring-indigo-600 shadow-sm"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold text-[11px]">
                                    <span>
                                      {cell.classification.replace(
                                        " Alignment",
                                        ""
                                      )}
                                    </span>
                                    <span>
                                      {cell.numeric_score !== null
                                        ? `${cell.numeric_score}/4`
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] truncate mt-0.5 opacity-90">
                                    {cell.expectation_title}
                                  </div>
                                  {cell.is_overridden ? (
                                    <div className="text-[9px] font-extrabold uppercase text-indigo-800 mt-0.5">
                                      ★ Evaluator Overridden
                                    </div>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explainable Diagnostic Inspector Drawer / Panel (Section 23) */}
      {activeCell ? (
        <div className="bg-white rounded-2xl border-2 border-indigo-600 shadow-lg overflow-hidden">
          <div className="bg-indigo-950 text-white p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold uppercase tracking-wider">
                <span>Explainable Finding Inspector</span>
                <span>•</span>
                <span>Stakeholder: {activeCell.stakeholder_name}</span>
                <span>•</span>
                <span>
                  Dimension: {activeCell.organizational_dimension.toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-extrabold mt-1">
                {activeCell.expectation_title}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {activeCell.expectation_description}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {classificationBadge(activeCell.classification)}
              <div className="bg-indigo-900 px-3 py-1.5 rounded-lg border border-indigo-700 text-xs">
                Score:{" "}
                <strong>
                  {activeCell.numeric_score !== null
                    ? `${activeCell.numeric_score} / 4.0`
                    : "N/A (Excluded from denominator)"}
                </strong>{" "}
                × Weight <strong>{activeCell.requirement_weight}x</strong>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Rationale, Root Causes, Mapped Mechanisms, Quotations */}
            <div className="lg:col-span-2 space-y-5">
              {/* Why the AI reached this conclusion */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Why the Diagnostic Engine Reached This Conclusion
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {activeCell.rationale}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">
                    Mapped Organizational Mechanisms:
                  </span>
                  {(activeCell.mapped_mechanisms || []).length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      None identified in disclosures
                    </span>
                  ) : (
                    (activeCell.mapped_mechanisms || []).map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold"
                      >
                        {m}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Root-Cause Diagnosis */}
              {(activeCell.root_cause_diagnosis || []).length > 0 ? (
                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
                  <div className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                    2. Structural Root-Cause Diagnosis (Stage 5)
                  </div>
                  <ul className="space-y-1 text-xs text-rose-900 list-disc list-inside">
                    {activeCell.root_cause_diagnosis.map((rc, i) => (
                      <li key={i}>{rc}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Supporting Documentary Evidence & Exact Quotations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Traceable Documentary Evidence & Verbatim Quotations (
                    {(activeCell.evidence_records || []).length})
                  </div>
                  <span className="text-xs text-slate-600">
                    Separate Evidence Quality Score:{" "}
                    <strong>
                      {Math.round((activeCell.evidence_quality_score || 0) * 100)}
                      %
                    </strong>
                  </span>
                </div>

                {(activeCell.evidence_records || []).length === 0 ? (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    Insufficient Evidence: No documentary excerpts in this assessment period address this requirement. Missing public evidence does not assign a zero score; it reduces Evidence Coverage.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeCell.evidence_records.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              Evidence #{ev.id}
                            </span>
                            {evidenceClassBadge(ev.evidence_classification)}
                            {ev.is_contradictory ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                ⚠ Contradictory / Competing Evidence Detected
                              </span>
                            ) : null}
                          </div>
                          <span className="text-slate-500">
                            Confidence: <strong>{ev.confidence_level}</strong> |
                            Quality: <strong>{Math.round(ev.quality_score * 100)}%</strong>
                          </span>
                        </div>
                        <blockquote className="p-3 rounded-lg bg-slate-50 border-l-4 border-indigo-600 italic text-slate-800">
                          "{ev.exact_quotation}"
                        </blockquote>
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>
                            Document: <strong>{ev.document_name}</strong> • Page{" "}
                            <strong>{ev.page_number}</strong> • Section:{" "}
                            <strong>{ev.section_heading}</strong>
                          </span>
                          <span>
                            FY: {ev.financial_year} | Pub:{" "}
                            {ev.publication_date || "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Recommendations */}
              {(activeCell.recommendations || []).length > 0 ? (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                  <div className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    4. Recommended Structural & Governance Improvements
                  </div>
                  {activeCell.recommendations.map((rec) => (
                    <div key={rec.id} className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        {priorityBadge(rec.priority)}
                        <span className="font-bold text-slate-900">
                          {rec.title}
                        </span>
                      </div>
                      <p className="text-slate-700">
                        {rec.suggested_organizational_change}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        <strong>Trade-offs:</strong> {rec.possible_tradeoffs}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Right Column: Score Math & Manual Override Control */}
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
                <div className="font-bold text-indigo-300 uppercase tracking-wider">
                  Score Calculation Transparency
                </div>
                <div className="space-y-1 text-slate-300">
                  <div>
                    Classification: <strong>{activeCell.classification}</strong>
                  </div>
                  <div>
                    Raw Numerical Score:{" "}
                    <strong>
                      {activeCell.numeric_score !== null
                        ? `${activeCell.numeric_score} / 4.0`
                        : "N/A"}
                    </strong>
                  </div>
                  <div>
                    Requirement Weight:{" "}
                    <strong>{activeCell.requirement_weight}x</strong>
                  </div>
                  <div>
                    Weighted Contribution:{" "}
                    <strong>
                      {activeCell.numeric_score !== null
                        ? (
                            activeCell.numeric_score *
                            activeCell.requirement_weight
                          ).toFixed(2)
                        : "Excluded from denominator"}
                    </strong>
                  </div>
                  <div className="pt-2 border-t border-slate-700 text-[11px] text-slate-400">
                    Formula: Stakeholder Alignment % = ((Σ Score × ReqWeight) /
                    (Σ AssessedWeight) / 4) × 100
                  </div>
                </div>
              </div>

              {/* Manual Evaluator Override Form (Section 8) */}
              <form
                onSubmit={handleOverrideSubmit}
                className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3 text-xs"
              >
                <div className="font-bold text-slate-900 uppercase tracking-wider">
                  Evaluator Manual Override & Audit Log
                </div>
                <p className="text-[11px] text-slate-600">
                  Override the AI-generated classification with a mandatory audit justification. Automatically recalculates stakeholder and overall alignment scores.
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Override Classification
                  </label>
                  <select
                    value={overrideClass}
                    onChange={(e: any) => setOverrideClass(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white font-semibold"
                  >
                    <option value="Strong Alignment">Strong Alignment (4)</option>
                    <option value="Partial Alignment">Partial Alignment (3)</option>
                    <option value="Potential Misalignment">
                      Potential Misalignment (1)
                    </option>
                    <option value="Insufficient Evidence">
                      Insufficient Evidence (N/A)
                    </option>
                    <option value="Not Applicable">Not Applicable (N/A)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mandatory Evaluator Justification
                  </label>
                  <textarea
                    rows={3}
                    value={overrideJustification}
                    onInput={(e: any) =>
                      setOverrideJustification(e.target.value)
                    }
                    placeholder="Provide documentary or governance rationale for overriding this classification..."
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={savingOverride}
                  className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm transition"
                >
                  {savingOverride
                    ? "Saving Override & Recalculating..."
                    : "Apply Manual Override & Recalculate"}
                </button>

                {overrideMsg ? (
                  <div className="p-2.5 rounded bg-indigo-100 text-indigo-900 font-medium text-[11px]">
                    {overrideMsg}
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

