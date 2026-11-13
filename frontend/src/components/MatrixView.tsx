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
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse inline-block mr-2" />
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
      return "bg-emerald-950/60 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60 hover:border-emerald-400 shadow-sm shadow-emerald-500/10";
    if (status === "Partial Alignment")
      return "bg-amber-950/60 border-amber-500/40 text-amber-200 hover:bg-amber-900/60 hover:border-amber-400 shadow-sm shadow-amber-500/10";
    if (status === "Potential Misalignment")
      return "bg-rose-950/60 border-rose-500/40 text-rose-200 hover:bg-rose-900/60 hover:border-rose-400 shadow-sm shadow-rose-500/10";
    return "bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:border-slate-700";
  };

  return (
    <div className="space-y-6 text-white">
      {/* Matrix Header */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">
              Interactive Stakeholder × Organizational Structure Alignment Matrix
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click any cell to inspect exact page citations, root causes, score formula calculation, and manual audit override controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/40">
            Strong (4.0)
          </span>
          <span className="px-2.5 py-1 rounded-md bg-amber-950/60 text-amber-300 font-bold border border-amber-500/40">
            Partial (3.0)
          </span>
          <span className="px-2.5 py-1 rounded-md bg-rose-950/60 text-rose-300 font-bold border border-rose-500/40">
            Misaligned (1.0)
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-400 font-bold border border-slate-700">
            Insufficient Evidence (N/A)
          </span>
        </div>
      </div>

      {/* Interactive Grid Table */}
      <div className="glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950 text-slate-200 border-b border-slate-800">
              <th className="p-3.5 font-bold min-w-[220px]">
                Stakeholder Group (Score / Cov)
              </th>
              {dimensions.map((d) => (
                <th
                  key={d.code}
                  className="p-3.5 font-bold text-center min-w-[140px] capitalize border-l border-slate-800"
                >
                  <div className="text-slate-100">{d.code}</div>
                  <div className="text-[10px] font-normal text-violet-300 mt-0.5">
                    {d.suitability_classification.replace(" Alignment", "")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {stakeholders.map((sh) => {
              const shAssessments = assessments.filter(
                (a) => a.stakeholder_id === sh.id
              );
              return (
                <tr key={sh.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-3.5 bg-slate-950/60 font-bold text-slate-100 border-r border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-white">{sh.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {sh.category}
                      </span>
                    </div>
                    <div className="text-[11px] font-normal text-slate-400 mt-1">
                      Align:{" "}
                      <strong className="text-cyan-300">
                        {sh.alignment_score !== null
                          ? `${sh.alignment_score}%`
                          : "N/A"}
                      </strong>{" "}
                      • Cov: <strong className="text-slate-200">{sh.evidence_coverage_pct}%</strong>
                    </div>
                  </td>
                  {dimensions.map((dim) => {
                    const matchingCells = shAssessments.filter(
                      (a) => a.organizational_dimension === dim.code
                    );
                    return (
                      <td
                        key={dim.code}
                        className="p-2 border-l border-slate-800/60 align-top"
                      >
                        {matchingCells.length === 0 ? (
                          <div className="h-14 flex items-center justify-center text-[11px] text-slate-400 font-mono">
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
                                      ? "ring-2 ring-violet-400 shadow-md shadow-violet-500/20"
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
                                    <span className="font-mono">
                                      {cell.numeric_score !== null
                                        ? `${cell.numeric_score}/4`
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] truncate mt-0.5 opacity-90 text-slate-300">
                                    {cell.expectation_title}
                                  </div>
                                  {cell.is_overridden ? (
                                    <div className="text-[9px] font-extrabold uppercase text-cyan-300 mt-0.5">
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
        <div className="glass-card bg-slate-900/95 rounded-2xl border-2 border-violet-500/70 shadow-2xl overflow-hidden text-white relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="bg-slate-950 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-xs text-violet-400 font-bold uppercase tracking-wider">
                <span>Diagnostic Evidence Inspector</span>
                <span>•</span>
                <span>Stakeholder: {activeCell.stakeholder_name}</span>
                <span>•</span>
                <span className="text-cyan-300 font-mono">
                  Dimension: {activeCell.organizational_dimension.toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-extrabold mt-1 text-white">
                {activeCell.expectation_title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeCell.expectation_description}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {classificationBadge(activeCell.classification)}
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono">
                Score:{" "}
                <strong className="text-cyan-300">
                  {activeCell.numeric_score !== null
                    ? `${activeCell.numeric_score} / 4.0`
                    : "N/A (Excluded from denominator)"}
                </strong>{" "}
                × Weight <strong className="text-violet-300">{activeCell.requirement_weight}x</strong>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            {/* Left Column: AI Diagnostic Rationale & Root Causes */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                  Diagnostic Rationale & Evaluation
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeCell.rationale}
                </p>
              </div>

              {/* Mapped Mechanisms */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Identified Organizational Mechanisms
                </div>
                <div className="flex flex-wrap gap-2">
                  {(activeCell.mapped_mechanisms || []).map((m: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-violet-950/60 border border-violet-700/50 text-violet-300 text-xs font-semibold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Root Causes */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Root Causes & Structural Constraints
                </div>
                <div className="space-y-2">
                  {(activeCell.root_cause_diagnosis || []).map((rc: string, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2"
                    >
                      <span className="text-rose-400 font-bold shrink-0">!</span>
                      <span>{rc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supporting Documentary Evidence Citations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <span>Supporting Evidence Records ({activeCell.evidence_records.length})</span>
                  <span className="text-[11px] text-cyan-300 font-normal">
                    Quotation Provenance Verified
                  </span>
                </div>
                {activeCell.evidence_records.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300 italic">
                    Insufficient Evidence: No supporting documents or verifiable disclosures were found in this assessment period.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeCell.evidence_records.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 space-y-2 text-xs"
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
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                            Quality: {Math.round((ev.quality_score || 0.8) * 100)}%
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-slate-900 border-l-2 border-cyan-400 font-serif italic text-slate-300 text-xs">
                          "{ev.exact_quotation}"
                        </div>
                        {ev.is_contradictory ? (
                          <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Marked as Contradictory: Clashes with countervailing external or operational findings.</span>
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
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="font-bold text-slate-200 uppercase tracking-wider">
                  Score Calculation Transparency
                </div>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span>Base Numeric Score:</span>
                    <strong className="text-white font-mono">
                      {activeCell.numeric_score !== null
                        ? `${activeCell.numeric_score} / 4.0`
                        : "Excluded"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Requirement Weight:</span>
                    <strong className="text-violet-300 font-mono">{activeCell.requirement_weight}x</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Weighted Contribution:</span>
                    <strong className="text-cyan-300 font-mono">
                      {activeCell.numeric_score !== null
                        ? `${(activeCell.numeric_score * activeCell.requirement_weight).toFixed(2)} pts`
                        : "0.00 pts"}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2">
                    <span>Evidence Quality Score:</span>
                    <strong className="text-emerald-400 font-mono">
                      {Math.round((activeCell.evidence_quality_score || 0) * 100)}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* Manual Override Audit Form */}
              <div className="bg-slate-950/90 p-4 rounded-xl border border-violet-800/60 space-y-3 text-xs">
                <div className="font-bold text-violet-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Evaluator Manual Override</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Logged to Audit Trail
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Override AI classification if proprietary context or unindexed evidence justifies a revision.
                </p>

                {overrideMsg ? (
                  <div className="p-2.5 rounded bg-violet-950/80 border border-violet-700/60 text-violet-200 text-xs">
                    {overrideMsg}
                  </div>
                ) : null}

                <form onSubmit={handleOverrideSubmit} className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      New Classification:
                    </label>
                    <select
                      value={overrideClass}
                      onChange={(e: any) => setOverrideClass(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="Strong Alignment">Strong Alignment (4.0)</option>
                      <option value="Partial Alignment">Partial Alignment (3.0)</option>
                      <option value="Potential Misalignment">Potential Misalignment (1.0)</option>
                      <option value="Insufficient Evidence">Insufficient Evidence (N/A)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Mandatory Evaluator Justification:
                    </label>
                    <textarea
                      rows={3}
                      value={overrideJustification}
                      onInput={(e: any) => setOverrideJustification(e.target.value)}
                      placeholder="Explain organizational rationale, supporting document citations, or internal policy evidence..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingOverride}
                    className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition"
                  >
                    {savingOverride ? "Saving Override..." : "Save Override & Recalculate Scores"}
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
