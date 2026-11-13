import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { AlignmentMatrixCell } from "../types";
import { classificationBadge, evidenceClassBadge } from "./badges";
import { MatrixIcon } from "./icons";

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
      <div className="p-12 text-center text-[#86868b] font-medium text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-pulse inline-block mr-2" />
        Loading Stakeholder × Structure Alignment Matrix...
      </div>
    );
  }

  const stakeholders: any[] = matrixData.stakeholders || [];
  const dimensions: any[] = matrixData.dimensions || [];
  const assessments: AlignmentMatrixCell[] = matrixData.assessments || [];

  const activeCell =
    (selectedCell && assessments.find((a) => a.id === selectedCell.id)) ||
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
        `Override logged! Overall Alignment recalculated to ${res.recalculated_scores.overall_alignment_score}% (Coverage: ${res.recalculated_scores.evidence_coverage_pct}%).`
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
      return "bg-[#eaf8ee] border-[#a3e4b7] text-[#1d7334] hover:bg-[#daf3e2] hover:border-[#34c759]";
    if (status === "Partial Alignment")
      return "bg-[#fff7e6] border-[#ffd580] text-[#b25e00] hover:bg-[#ffefc9] hover:border-[#ff9500]";
    if (status === "Potential Misalignment")
      return "bg-[#fdeef0] border-[#f9abb4] text-[#c9182b] hover:bg-[#fadbe0] hover:border-[#ff3b30]";
    return "bg-[#f5f5f7] border-[#d1d1d6] text-[#636366] hover:bg-[#e5e5ea]";
  };

  return (
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Matrix Header */}
      <div className="apple-card p-6 stagger-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0">
              <MatrixIcon className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              Interactive Stakeholder × Organizational Structure Alignment Matrix
            </h2>
          </div>
          <p className="text-xs text-[#86868b] mt-1">
            Click any cell to inspect exact page citations, root causes, score formula calculation, and manual audit override controls.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] shrink-0">
          <span className="px-3 py-1 rounded-full bg-[#eaf8ee] text-[#1d7334] font-bold border border-[#a3e4b7]">
            Strong (4.0)
          </span>
          <span className="px-3 py-1 rounded-full bg-[#fff7e6] text-[#b25e00] font-bold border border-[#ffd580]">
            Partial (3.0)
          </span>
          <span className="px-3 py-1 rounded-full bg-[#fdeef0] text-[#c9182b] font-bold border border-[#f9abb4]">
            Misaligned (1.0)
          </span>
          <span className="px-3 py-1 rounded-full bg-[#f2f2f7] text-[#636366] font-bold border border-[#d1d1d6]">
            Insufficient (N/A)
          </span>
        </div>
      </div>

      {/* Interactive Grid Table */}
      <div className="apple-card overflow-x-auto stagger-2">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#f5f5f7] text-[#515154] border-b border-black/8">
              <th className="p-3.5 font-bold min-w-[230px] text-[#1d1d1f]">
                Stakeholder Group (Score / Cov)
              </th>
              {dimensions.map((d) => (
                <th
                  key={d.code}
                  className="p-3.5 font-bold text-center min-w-[145px] capitalize border-l border-black/8"
                >
                  <div className="text-[#1d1d1f]">{d.code}</div>
                  <div className="text-[10px] font-semibold text-[#0071e3] mt-0.5">
                    {d.suitability_classification.replace(" Alignment", "")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {stakeholders.map((sh) => {
              const shAssessments = assessments.filter(
                (a) => a.stakeholder_id === sh.id
              );
              return (
                <tr key={sh.id} className="hover:bg-black/[0.015] transition">
                  <td className="p-3.5 bg-[#fbfbfd] font-bold text-[#1d1d1f] border-r border-black/8">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#1d1d1f]">{sh.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#515154] border border-black/10 shrink-0">
                        {sh.category}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-[#86868b] mt-1 tabular-nums">
                      Align:{" "}
                      <strong className="text-[#0071e3]">
                        {sh.alignment_score !== null
                          ? `${sh.alignment_score}%`
                          : "N/A"}
                      </strong>{" "}
                      • Cov:{" "}
                      <strong className="text-[#1d1d1f]">
                        {sh.evidence_coverage_pct}%
                      </strong>
                    </div>
                  </td>
                  {dimensions.map((dim) => {
                    const matchingCells = shAssessments.filter(
                      (a) => a.organizational_dimension === dim.code
                    );
                    return (
                      <td
                        key={dim.code}
                        className="p-2 border-l border-black/5 align-top"
                      >
                        {matchingCells.length === 0 ? (
                          <div className="h-14 flex items-center justify-center text-[11px] text-[#aeaeb2] font-mono">
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
                                  className={`w-full text-left p-2.5 rounded-xl border transition ${getCellStyle(
                                    cell.classification
                                  )} ${
                                    isAct
                                      ? "ring-2 ring-[#0071e3] shadow-md"
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
                                    <span className="font-mono tabular-nums">
                                      {cell.numeric_score !== null
                                        ? `${cell.numeric_score}/4`
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] truncate mt-0.5 opacity-90 font-medium">
                                    {cell.expectation_title}
                                  </div>
                                  {cell.is_overridden ? (
                                    <div className="text-[9px] font-extrabold uppercase text-[#0071e3] mt-0.5">
                                      [Overridden]
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

      {/* Explainable Diagnostic Inspector Drawer / Panel */}
      {activeCell ? (
        <div className="apple-card overflow-hidden border-[#0071e3]/30 stagger-3">
          <div className="bg-[#f5f5f7] p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-black/8">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#0071e3] font-bold uppercase tracking-wider">
                <span>Diagnostic Evidence Inspector</span>
                <span>•</span>
                <span>Stakeholder: {activeCell.stakeholder_name}</span>
                <span>•</span>
                <span className="font-mono">
                  Dimension: {activeCell.organizational_dimension.toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-bold mt-1 text-[#1d1d1f] tracking-tight">
                {activeCell.expectation_title}
              </h3>
              <p className="text-xs text-[#515154] mt-0.5">
                {activeCell.expectation_description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {classificationBadge(activeCell.classification)}
              <div className="bg-white px-3.5 py-1.5 rounded-full border border-black/10 text-xs font-mono text-[#515154] shadow-sm">
                Score:{" "}
                <strong className="text-[#0071e3]">
                  {activeCell.numeric_score !== null
                    ? `${activeCell.numeric_score} / 4.0`
                    : "N/A (Excluded)"}
                </strong>{" "}
                × Weight <strong className="text-[#1d1d1f]">{activeCell.requirement_weight}x</strong>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: AI Diagnostic Rationale & Root Causes */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-[#f5f5f7] p-4 rounded-2xl border border-black/8 space-y-1.5">
                <div className="text-[11px] font-bold text-[#0071e3] uppercase tracking-wider">
                  Diagnostic Rationale &amp; Evaluation
                </div>
                <p className="text-xs text-[#1d1d1f] leading-relaxed">
                  {activeCell.rationale}
                </p>
              </div>

              {/* Mapped Mechanisms */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
                  Identified Organizational Mechanisms
                </div>
                <div className="flex flex-wrap gap-2">
                  {(activeCell.mapped_mechanisms || []).map((m: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-[#e8f2fe] border border-[#b3d7ff] text-[#0066cc] text-xs font-semibold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Root Causes */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
                  Root Causes &amp; Structural Constraints
                </div>
                <div className="space-y-2">
                  {(activeCell.root_cause_diagnosis || []).map((rc: string, i: number) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-[#fdeef0] border border-[#f9abb4] text-xs text-[#1d1d1f] flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#ff3b30] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                        !
                      </span>
                      <span className="leading-relaxed">{rc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supporting Documentary Evidence Citations */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
                  <span>Supporting Evidence Records ({activeCell.evidence_records.length})</span>
                  <span className="text-[#0071e3] font-semibold">
                    Quotation Provenance Verified
                  </span>
                </div>
                {activeCell.evidence_records.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#f5f5f7] border border-black/8 text-xs text-[#86868b] italic">
                    Insufficient Evidence: No supporting documents or verifiable disclosures were found in this assessment period.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeCell.evidence_records.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 space-y-2 text-xs"
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
                          <span className="px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] font-mono text-[10px] font-bold">
                            Quality: {Math.round((ev.quality_score || 0.8) * 100)}%
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white border-l-2 border-[#0071e3] italic text-[#1d1d1f] text-xs leading-relaxed">
                          &ldquo;{ev.exact_quotation}&rdquo;
                        </div>
                        {ev.is_contradictory ? (
                          <div className="text-[11px] text-[#b25e00] font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#ff9500]" />
                            <span>
                              Marked as Contradictory: Clashes with countervailing external or operational findings.
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Score Formula & Evaluator Manual Override */}
            <div className="space-y-5">
              <div className="bg-[#f5f5f7] p-4 rounded-2xl border border-black/8 space-y-3 text-xs">
                <div className="font-bold text-[#1d1d1f] uppercase tracking-wider text-[11px]">
                  Score Calculation Transparency
                </div>
                <div className="space-y-2 text-[#515154]">
                  <div className="flex justify-between">
                    <span>Base Numeric Score:</span>
                    <strong className="text-[#1d1d1f] font-mono">
                      {activeCell.numeric_score !== null
                        ? `${activeCell.numeric_score} / 4.0`
                        : "Excluded"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Requirement Weight:</span>
                    <strong className="text-[#5856d6] font-mono">
                      {activeCell.requirement_weight}x
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Weighted Contribution:</span>
                    <strong className="text-[#0071e3] font-mono">
                      {activeCell.numeric_score !== null
                        ? `${(
                            activeCell.numeric_score * activeCell.requirement_weight
                          ).toFixed(2)} pts`
                        : "0.00 pts"}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-black/8 pt-2">
                    <span>Evidence Quality Score:</span>
                    <strong className="text-[#1d7334] font-mono">
                      {Math.round((activeCell.evidence_quality_score || 0) * 100)}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* Manual Override Audit Form */}
              <div className="bg-[#fbfbfd] p-4 rounded-2xl border border-[#0071e3]/25 space-y-3 text-xs">
                <div className="font-bold text-[#0071e3] uppercase tracking-wider flex items-center justify-between text-[11px]">
                  <span>Evaluator Manual Override</span>
                  <span className="text-[10px] font-medium text-[#86868b]">
                    Audit Trail Logged
                  </span>
                </div>
                <p className="text-[#515154] text-[11px] leading-relaxed">
                  Override AI classification if proprietary context or unindexed evidence justifies a revision.
                </p>

                {overrideMsg ? (
                  <div className="p-3 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0066cc] text-xs font-medium">
                    {overrideMsg}
                  </div>
                ) : null}

                <form onSubmit={handleOverrideSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[#1d1d1f] font-semibold mb-1">
                      New Classification:
                    </label>
                    <select
                      value={overrideClass}
                      onChange={(e: any) => setOverrideClass(e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl p-2.5 text-xs text-[#1d1d1f] font-medium focus:outline-none focus:border-[#0071e3]"
                    >
                      <option value="Strong Alignment">Strong Alignment (4.0)</option>
                      <option value="Partial Alignment">Partial Alignment (3.0)</option>
                      <option value="Potential Misalignment">Potential Misalignment (1.0)</option>
                      <option value="Insufficient Evidence">Insufficient Evidence (N/A)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#1d1d1f] font-semibold mb-1">
                      Mandatory Evaluator Justification:
                    </label>
                    <textarea
                      rows={3}
                      value={overrideJustification}
                      onInput={(e: any) => setOverrideJustification(e.target.value)}
                      placeholder="Explain organizational rationale, supporting document citations, or internal policy evidence..."
                      className="w-full bg-white border border-black/10 rounded-xl p-2.5 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingOverride}
                    className="apple-btn-primary w-full"
                  >
                    {savingOverride
                      ? "Saving Override..."
                      : "Save Override & Recalculate Scores"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
