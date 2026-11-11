import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { AssessmentFullSummary, StakeholderProfile } from "../types";
import { classificationBadge, RadialScoreGauge } from "./badges";
import { EvidenceToInsightFlow } from "./EvidenceToInsightFlow";

export function DashboardView(props: {
  summary: AssessmentFullSummary | null;
  stakeholders: StakeholderProfile[];
  onNavigate: (tab: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}) {
  const { summary, stakeholders, onNavigate, onRunAnalysis, isAnalyzing } = props;
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [aiQuestion, setAiQuestion] = useState(
    "What are the primary structural governance vulnerabilities and priority board-level reforms supported by the evidence?"
  );
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!summary) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse inline-block mr-2" />
        Loading organizational diagnostic intelligence overview...
      </div>
    );
  }

  const { assessment, metrics, dimensions_summary } = summary;
  const totalReq =
    metrics.strong_alignments +
    metrics.partial_alignments +
    metrics.potential_misalignments +
    metrics.insufficient_evidence_count;

  const handleRunGroqSynthesis = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await api.runAiSynthesis(assessment.id, aiQuestion);
      setAiResult(res);
    } catch (err: any) {
      setAiError(err.message || "Failed to generate Groq AI synthesis");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Header Card */}
      <div className="glass-card rounded-2xl p-6 text-white border border-slate-700/80 bg-[#111827] shadow-2xl relative overflow-hidden card-hover">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-700/50 px-2.5 py-1 rounded-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Organizational Diagnostic Intelligence
              </span>
              <span>•</span>
              <span className="text-cyan-300 font-bold">{assessment.fiscal_year}</span>
              {assessment.company_ticker ? (
                <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-cyan-300 font-mono font-bold">
                  {assessment.company_ticker}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              {assessment.company_name} — {assessment.title}
            </h1>
            <p className="text-slate-300 text-xs mt-1.5 flex items-center gap-3">
              <span>
                Last Evaluated:{" "}
                <strong className="text-slate-100">
                  {assessment.last_analyzed_at
                    ? new Date(assessment.last_analyzed_at).toLocaleString()
                    : "Not yet analyzed"}
                </strong>
              </span>
              <span>•</span>
              <span>
                Status:{" "}
                <span className="uppercase font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-600/40">
                  {assessment.status}
                </span>
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate("documents")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition card-hover"
            >
              📁 Manage Filings ({metrics.documents_processed})
            </button>
            <button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition card-hover flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Running AI Engine...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Run AI Diagnostic</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5-Step Clear Diagnostic Workflow Journey */}
      <div className="glass-card bg-[#111827] rounded-2xl p-5 border border-slate-700/80 shadow-xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Diagnostic Workflow (Click Any Step to Inspect)
            </span>
          </div>
          <span className="text-[11px] text-indigo-400 font-mono font-semibold">
            5-Stage Diagnostic Pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div 
            onClick={() => onNavigate("documents")}
            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/60 cursor-pointer card-hover transition group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>STEP 01</span>
              <span className="text-emerald-400 font-semibold">✓ Ingested</span>
            </div>
            <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
              Research Library
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {metrics.documents_processed} Filings • {metrics.evidence_records_count} Chunks
            </div>
          </div>

          {/* Step 2 */}
          <div 
            onClick={() => onNavigate("stakeholders")}
            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/60 cursor-pointer card-hover transition group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>STEP 02</span>
              <span className="text-emerald-400 font-semibold">✓ Mapped</span>
            </div>
            <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
              Stakeholders
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {metrics.stakeholders_assessed} Groups (4 Int / 6 Ext)
            </div>
          </div>

          {/* Step 3 */}
          <div 
            onClick={() => onNavigate("structure")}
            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/60 cursor-pointer card-hover transition group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>STEP 03</span>
              <span className="text-emerald-400 font-semibold">✓ Extracted</span>
            </div>
            <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
              Org Structure
            </div>
            <div className="text-xs text-slate-300 mt-1">
              7 Core Dimensions & Units
            </div>
          </div>

          {/* Step 4 */}
          <div 
            onClick={() => onNavigate("matrix")}
            className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/70 to-slate-900 border border-indigo-500/50 hover:border-indigo-400 cursor-pointer card-hover transition group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300 mb-1">
              <span>STEP 04</span>
              <span className="text-indigo-300 font-bold">{assessment.overall_alignment_score}% Score</span>
            </div>
            <div className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition">
              Alignment Matrix
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {totalReq} Requirements Evaluated
            </div>
          </div>

          {/* Step 5 */}
          <div 
            onClick={() => onNavigate("recommendations")}
            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/60 cursor-pointer card-hover transition group"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>STEP 05</span>
              <span className="text-amber-400 font-bold">{metrics.recommendations_count} Actions</span>
            </div>
            <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
              Action Plan
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {metrics.conflicts_count} Conflicts • Reforms
            </div>
          </div>
        </div>
      </div>
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
          colorHex="#06b6d4"
        />

        <div className="glass-card bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Knowledge Base & Evidence
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {metrics.documents_processed}
              </span>
              <span className="text-xs text-slate-400">
                documents ({metrics.evidence_records_count} citations)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Assessed:{" "}
              <strong className="text-slate-200">
                {metrics.stakeholders_assessed} / {metrics.total_stakeholders}
              </strong>
            </span>
            <button
              onClick={() => onNavigate("evidence")}
              className="text-cyan-400 font-semibold hover:underline"
            >
              Inspect Citations →
            </button>
          </div>
        </div>

        <div className="glass-card bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Alignment Gaps & Diagnostics
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-400">
                {metrics.alignment_gaps_identified}
              </span>
              <span className="text-xs text-slate-400">
                gaps ({metrics.potential_misalignments} misaligned,{" "}
                {metrics.partial_alignments} partial)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Remediations:{" "}
              <strong className="text-slate-200">{metrics.recommendations_count}</strong>
            </span>
            <button
              onClick={() => onNavigate("recommendations")}
              className="text-violet-400 font-semibold hover:underline"
            >
              View Actions →
            </button>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown Bar */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Requirement Alignment Distribution ({totalReq} Evaluated Requirements)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any cell in the Alignment Matrix to inspect exact quotations, root causes, and score math
            </p>
          </div>
          <button
            onClick={() => onNavigate("matrix")}
            className="px-3.5 py-1.5 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-bold hover:bg-violet-600/50 transition self-start sm:self-auto"
          >
            Open Interactive Alignment Matrix →
          </button>
        </div>

        <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-800/80 border border-slate-700/50">
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.strong_alignments / totalReq) * 100}%`,
              }}
              className="bg-emerald-500 h-full shadow-sm shadow-emerald-400/50"
              title={`Strong Alignment: ${metrics.strong_alignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.partial_alignments / totalReq) * 100}%`,
              }}
              className="bg-amber-500 h-full shadow-sm shadow-amber-400/50"
              title={`Partial Alignment: ${metrics.partial_alignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.potential_misalignments / totalReq) * 100}%`,
              }}
              className="bg-rose-500 h-full shadow-sm shadow-rose-400/50"
              title={`Potential Misalignment: ${metrics.potential_misalignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.insufficient_evidence_count / totalReq) * 100}%`,
              }}
              className="bg-slate-600 h-full"
              title={`Insufficient Evidence: ${metrics.insufficient_evidence_count}`}
            ></div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between card-hover">
            <span className="font-bold text-emerald-200">Strong Alignment (4)</span>
            <span className="font-black text-emerald-300 text-base">
              {metrics.strong_alignments}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-between card-hover">
            <span className="font-bold text-amber-200">Partial Alignment (3)</span>
            <span className="font-black text-amber-300 text-base">
              {metrics.partial_alignments}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-between card-hover">
            <span className="font-bold text-rose-200">Potential Misaligned (1)</span>
            <span className="font-black text-rose-300 text-base">
              {metrics.potential_misalignments}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between card-hover">
            <span className="font-bold text-slate-300">Insufficient Evidence</span>
            <span className="font-black text-slate-300 text-base">
              {metrics.insufficient_evidence_count}
            </span>
          </div>
        </div>
      </div>

      {/* Top Priority Structural Findings & Key Insights */}
      <div className="glass-card bg-[#111827] p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>🎯</span>
              <span>Key Diagnostic Findings & Priority Governance Gaps</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Identified through automated 6-stage cross-examination of corporate charters and 10-K disclosures
            </p>
          </div>
          <button
            onClick={() => onNavigate("recommendations")}
            className="text-xs text-indigo-400 font-bold hover:underline"
          >
            View All {metrics.recommendations_count} Recommended Reforms →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* Finding 1 */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/30 card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold text-[10px] border border-rose-800/60">
                  CRITICAL MISALIGNMENT
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Centralization</span>
              </div>
              <div className="text-xs font-bold text-white leading-snug">
                Dual-Class Founder Voting Power Concentration
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Class B shares hold &gt;60% voting power, creating a severe governance imbalance between executive authority and independent minority shareholder accountability.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-indigo-300 flex items-center justify-between">
              <span>Reform: Independent lead director vote</span>
              <span className="text-slate-500">Score 1.0</span>
            </div>
          </div>

          {/* Finding 2 */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold text-[10px] border border-amber-800/60">
                  PARTIAL ALIGNMENT (CLAIM CAPPED)
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Formalization</span>
              </div>
              <div className="text-xs font-bold text-white leading-snug">
                Teen Safety Controls &amp; Pre-Launch Privacy Review
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Default Instagram Teen Accounts deployed; self-reported safety disclosures capped at Partial Alignment by the epistemic validator pending independent audit.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-indigo-300 flex items-center justify-between">
              <span>Action: Publish 3P safety verification</span>
              <span className="text-slate-500">Score 3.0</span>
            </div>
          </div>

          {/* Finding 3 */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-800/60">
                  STRONG ALIGNMENT
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Governance</span>
              </div>
              <div className="text-xs font-bold text-white leading-snug">
                Audit &amp; Privacy Committee Board Charter
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                Direct board charter mandates quarterly reporting from Chief Privacy Officer, backed by AI Governance &amp; Responsible Innovation Council.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-indigo-300 flex items-center justify-between">
              <span>Verified: Formal Board Charter (2025)</span>
              <span className="text-emerald-400 font-bold">Score 4.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Architecture Engine */}
      <div className="glass-card bg-[#111827] rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
        <button
          onClick={() => setShowArchitecture(!showArchitecture)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <div>
              <div className="text-sm font-bold text-white">
                Technical Multi-Agent Architecture (6-Stage Pipeline)
              </div>
              <div className="text-xs text-slate-400">
                End-to-end evidence verification combining local RAG, Groq LLM inference, and deterministic scoring.
              </div>
            </div>
          </div>
          <span className="text-xs text-indigo-300 font-bold px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-700/60">
            {showArchitecture ? "Hide Diagram ▲" : "Inspect Diagram ▼"}
          </span>
        </button>
        {showArchitecture ? (
          <div className="p-5 border-t border-slate-800 animate-fade-in bg-slate-950/40">
            <EvidenceToInsightFlow
              evidenceCount={metrics.evidence_records_count}
              coveragePct={assessment.evidence_coverage_pct}
              alignmentScore={assessment.overall_alignment_score}
              conflictCount={metrics.conflicts_count}
              recommendationCount={metrics.recommendations_count}
            />
          </div>
        ) : null}
      </div>

      {/* Live Groq AI Executive Diagnostic & Evidence Q&A Synthesis */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-violet-900/60 shadow-xl space-y-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Groq AI Live Synthesis
              </span>
              <h3 className="text-sm font-bold text-white">
                AI Executive Board Briefing & Evidence-Grounded Diagnostic Q&A
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Powered by Groq (llama-3.3-70b-versatile) with strict quotation guardrails. Synthesizes extracted citations and structural alignment gaps.
            </p>
          </div>
          <button
            onClick={handleRunGroqSynthesis}
            disabled={isGeneratingAi}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition shrink-0"
          >
            {isGeneratingAi
              ? "Querying Groq AI (llama-3.3-70b)..."
              : "Generate Groq AI Executive Synthesis"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={aiQuestion}
            onInput={(e: any) => setAiQuestion(e.target.value)}
            placeholder="Ask an organizational alignment question grounded in this period's evidence..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {aiError ? (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
            {aiError}
          </div>
        ) : null}

        {aiResult ? (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-violet-300">
                Executive Diagnostic Briefing ({assessment.company_name})
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 font-mono text-[11px]">
                Engine: {aiResult.provider_used}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {aiResult.executive_summary}
            </p>
            {aiResult.targeted_question_response &&
            aiResult.targeted_question_response !== aiResult.executive_summary ? (
              <div className="p-3 rounded-lg bg-violet-950/40 border border-violet-800/40">
                <div className="font-bold text-violet-300 mb-1">
                  Targeted Diagnostic Response:
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {aiResult.targeted_question_response}
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <div className="font-bold text-emerald-300 mb-1">
                  Key Structural Strengths
                </div>
                <ul className="list-disc pl-4 space-y-1 text-emerald-200">
                  {(aiResult.key_strengths || []).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30">
                <div className="font-bold text-amber-300 mb-1">
                  Key Structural Alignment Gaps
                </div>
                <ul className="list-disc pl-4 space-y-1 text-amber-200">
                  {(aiResult.key_structural_gaps || []).map((g: string, i: number) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 italic">
              <strong>Evidence Limitation Disclosure:</strong>{" "}
              {aiResult.evidence_limitations_summary}
            </div>
          </div>
        ) : null}
      </div>

      {/* Two-Column Chart Grid: Stakeholder Alignment vs Coverage & 7 Organizational Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-white">
        {/* Stakeholder Alignment & Coverage Chart */}
        <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Stakeholder Alignment Score vs. Evidence Coverage
              </h3>
              <p className="text-xs text-slate-400">
                Weighted by evaluator importance weights
              </p>
            </div>
            <button
              onClick={() => onNavigate("stakeholders")}
              className="text-xs text-cyan-400 font-semibold hover:underline"
            >
              Adjust Weights →
            </button>
          </div>
          <div className="space-y-3">
            {stakeholders.map((sh) => {
              const score = sh.alignment_score;
              const barColor =
                score === null
                  ? "bg-slate-700"
                  : score >= 75
                  ? "bg-emerald-500 shadow-sm shadow-emerald-400/50"
                  : score >= 55
                  ? "bg-amber-500 shadow-sm shadow-amber-400/50"
                  : "bg-rose-500 shadow-sm shadow-rose-400/50";
              return (
                <div key={sh.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{sh.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                        {sh.category} • W:{sh.importance_weight}x
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        Cov: <strong className="text-slate-200">{sh.evidence_coverage_pct}%</strong>
                      </span>
                      <span className="font-bold text-white w-14 text-right">
                        {score !== null ? `${score}%` : "Insuff."}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
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
          <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  7 Organizational Structure Dimensions
                </h3>
                <p className="text-xs text-slate-400">
                  Structural suitability based on extracted evidence
                </p>
              </div>
              <button
                onClick={() => onNavigate("structure")}
                className="text-xs text-cyan-400 font-semibold hover:underline"
              >
                Inspect Structure →
              </button>
            </div>
            <div className="divide-y divide-slate-800">
              {dimensions_summary.map((d) => (
                <div
                  key={d.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200">
                      {d.dimension_name}
                    </span>
                    <span className="text-slate-500 ml-2">
                      ({d.evidence_count} citations)
                    </span>
                  </div>
                  {classificationBadge(d.suitability_classification)}
                </div>
              ))}
            </div>
          </div>

          {/* Company-Specific Analysis Priorities */}
          <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-white">
              Configured Diagnostic Priorities ({assessment.company_name})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">
              Priority focus areas guiding RAG retrieval and expectation discovery without predetermining conclusions
            </p>
            <div className="flex flex-wrap gap-2">
              {(assessment.company_priorities || []).map((prio, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-violet-950/60 border border-violet-700/50 text-violet-300 text-xs font-semibold"
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
