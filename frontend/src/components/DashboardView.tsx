import { api } from "../api";
import { Fragment, h, useState } from "../lib/react-lite";
import { AssessmentFullSummary, StakeholderProfile } from "../types";
import { classificationBadge, RadialScoreGauge } from "./badges";
import { EvidenceToInsightFlow } from "./EvidenceToInsightFlow";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DocumentIcon,
  MatrixIcon,
  ReportIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  StructureIcon,
  UsersIcon,
} from "./icons";

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

  if (!summary || !summary.assessment) {
    return (
      <div className="p-12 text-center text-[#86868b] font-medium text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3] animate-pulse inline-block mr-2" />
        Loading organizational diagnostic intelligence overview...
      </div>
    );
  }

  const { assessment } = summary;
  const metrics = summary.metrics || {
    overall_alignment_score: 0,
    evidence_coverage_pct: 0,
    strong_alignments: 0,
    partial_alignments: 0,
    potential_misalignments: 0,
    insufficient_evidence_count: 0,
    alignment_gaps_identified: 0,
    conflicts_count: 0,
    recommendations_count: 0,
    total_documents: 0,
    documents_processed: 0,
    evidence_records_count: 0,
    stakeholders_assessed: 0,
    total_stakeholders: 10,
  };
  const dimensions_summary = summary.dimensions_summary || [];
  const totalReq =
    (metrics.strong_alignments || 0) +
    (metrics.partial_alignments || 0) +
    (metrics.potential_misalignments || 0) +
    (metrics.insufficient_evidence_count || 0);

  const handleRunGroqSynthesis = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await api.runAiSynthesis(assessment.id, aiQuestion);
      setAiResult(res);
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI executive synthesis");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Header Card (Apple Style Showcase) */}
      <div className="apple-card p-7 text-[#1d1d1f] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5 bg-[#0071e3]/10 border border-[#0071e3]/20 px-3 py-1 rounded-full text-[#0071e3]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] shadow-sm shadow-[#0071e3]/60" />
                Organizational Diagnostic Intelligence
              </span>
              <span className="text-[#d2d2d7]">•</span>
              <span className="text-[#1d1d1f] font-bold">{assessment.fiscal_year}</span>
              {assessment.company_ticker ? (
                <span className="px-2.5 py-0.5 bg-[#f5f5f7] border border-black/10 rounded-md text-[#0071e3] font-mono font-bold">
                  {assessment.company_ticker}
                </span>
              ) : null}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f]">
              {assessment.company_name}
            </h1>
            <p className="text-sm text-[#86868b] mt-1">
              {assessment.title}
            </p>
            <div className="text-xs text-[#86868b] mt-3 flex flex-wrap items-center gap-3">
              <span>
                Last Evaluated:{" "}
                <strong className="text-[#1d1d1f]">
                  {assessment.last_analyzed_at
                    ? new Date(assessment.last_analyzed_at).toLocaleString()
                    : "Not yet analyzed"}
                </strong>
              </span>
              <span>•</span>
              <span>
                Status:{" "}
                <span className="font-semibold text-[#248a3d] px-2.5 py-0.5 rounded-full bg-[#34c759]/10 border border-[#34c759]/30">
                  {assessment.status}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("documents")}
              className="apple-btn-secondary"
            >
              <DocumentIcon className="w-4 h-4 text-[#0071e3]" />
              <span>Manage Filings ({metrics.documents_processed})</span>
            </button>
            <button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="apple-btn-primary"
            >
              {isAnalyzing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Running AI Engine...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  <span>Run AI Diagnostic</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5-Step Diagnostic Workflow Journey (Apple Clean Cards) */}
      <div className="apple-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#86868b]">
            Diagnostic Workflow
          </div>
          <span className="text-xs text-[#0071e3] font-mono font-semibold">
            5-Stage Pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div 
            onClick={() => onNavigate("documents")}
            className="p-4 rounded-2xl bg-[#f5f5f7]/80 hover:bg-white border border-black/5 hover:border-[#0071e3]/30 cursor-pointer card-hover transition group shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868b] mb-1">
              <span>STEP 01</span>
              <span className="text-[#248a3d] font-semibold">Ingested</span>
            </div>
            <div className="text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition">
              Research Library
            </div>
            <div className="text-xs text-[#86868b] mt-1">
              {metrics.documents_processed} Filings • {metrics.evidence_records_count} Chunks
            </div>
          </div>

          {/* Step 2 */}
          <div 
            onClick={() => onNavigate("stakeholders")}
            className="p-4 rounded-2xl bg-[#f5f5f7]/80 hover:bg-white border border-black/5 hover:border-[#0071e3]/30 cursor-pointer card-hover transition group shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868b] mb-1">
              <span>STEP 02</span>
              <span className="text-[#248a3d] font-semibold">Mapped</span>
            </div>
            <div className="text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition">
              Stakeholders
            </div>
            <div className="text-xs text-[#86868b] mt-1">
              {metrics.stakeholders_assessed} Groups (4 Int / 6 Ext)
            </div>
          </div>

          {/* Step 3 */}
          <div 
            onClick={() => onNavigate("structure")}
            className="p-4 rounded-2xl bg-[#f5f5f7]/80 hover:bg-white border border-black/5 hover:border-[#0071e3]/30 cursor-pointer card-hover transition group shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868b] mb-1">
              <span>STEP 03</span>
              <span className="text-[#248a3d] font-semibold">Extracted</span>
            </div>
            <div className="text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition">
              Org Structure
            </div>
            <div className="text-xs text-[#86868b] mt-1">
              7 Core Dimensions & Units
            </div>
          </div>

          {/* Step 4 */}
          <div 
            onClick={() => onNavigate("matrix")}
            className="p-4 rounded-2xl bg-[#0071e3]/5 hover:bg-white border border-[#0071e3]/20 hover:border-[#0071e3] cursor-pointer card-hover transition group shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#0071e3] mb-1">
              <span>STEP 04</span>
              <span className="font-bold">{assessment.overall_alignment_score}% Score</span>
            </div>
            <div className="text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition">
              Alignment Matrix
            </div>
            <div className="text-xs text-[#86868b] mt-1">
              {totalReq} Requirements Evaluated
            </div>
          </div>

          {/* Step 5 */}
          <div 
            onClick={() => onNavigate("recommendations")}
            className="p-4 rounded-2xl bg-[#f5f5f7]/80 hover:bg-white border border-black/5 hover:border-[#ff9500]/40 cursor-pointer card-hover transition group shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868b] mb-1">
              <span>STEP 05</span>
              <span className="text-[#c96500] font-bold">{metrics.recommendations_count} Actions</span>
            </div>
            <div className="text-sm font-bold text-[#1d1d1f] group-hover:text-[#c96500] transition">
              Action Plan
            </div>
            <div className="text-xs text-[#86868b] mt-1">
              {metrics.conflicts_count} Conflicts • Reforms
            </div>
          </div>
        </div>
      </div>

      {/* Dual Radial Gauges & Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RadialScoreGauge
          label="Overall Alignment Score"
          sublabel="Weighted average across stakeholder expectations (Strong=4, Partial=3, Misaligned=1)"
          value={assessment.overall_alignment_score}
          colorHex={
            (assessment.overall_alignment_score || 0) >= 75
              ? "#34c759"
              : (assessment.overall_alignment_score || 0) >= 55
              ? "#ff9500"
              : "#ff3b30"
          }
        />
        <RadialScoreGauge
          label="Evidence Coverage"
          sublabel="Percentage of applicable requirements backed by extracted documentary evidence"
          value={assessment.evidence_coverage_pct}
          colorHex="#0071e3"
        />

        <div className="apple-card p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Knowledge Base & Evidence
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1d1d1f]">
                {metrics.documents_processed}
              </span>
              <span className="text-xs text-[#86868b] font-medium">
                documents ({metrics.evidence_records_count} citations)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs">
            <span className="text-[#515154]">
              Assessed:{" "}
              <strong className="text-[#1d1d1f]">
                {metrics.stakeholders_assessed} / {metrics.total_stakeholders}
              </strong>
            </span>
            <button
              onClick={() => onNavigate("evidence")}
              className="text-[#0071e3] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Inspect Citations</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="apple-card p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Alignment Gaps & Diagnostics
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#d70015]">
                {metrics.alignment_gaps_identified}
              </span>
              <span className="text-xs text-[#86868b] font-medium">
                gaps ({metrics.potential_misalignments} misaligned,{" "}
                {metrics.partial_alignments} partial)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs">
            <span className="text-[#515154]">
              Remediations:{" "}
              <strong className="text-[#1d1d1f]">{metrics.recommendations_count}</strong>
            </span>
            <button
              onClick={() => onNavigate("recommendations")}
              className="text-[#0071e3] font-semibold hover:underline flex items-center gap-1"
            >
              <span>View Actions</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown Bar (Apple Clean Segment) */}
      <div className="apple-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1d1d1f]">
              Requirement Alignment Distribution ({totalReq} Evaluated Requirements)
            </h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              Click any cell in the Alignment Matrix to inspect exact quotations, root causes, and score math
            </p>
          </div>
          <button
            onClick={() => onNavigate("matrix")}
            className="apple-btn-secondary"
          >
            <span>Open Interactive Alignment Matrix</span>
            <ArrowRightIcon className="w-4 h-4 text-[#0071e3]" />
          </button>
        </div>

        <div className="w-full h-4 rounded-full overflow-hidden flex bg-[#e5e5ea]">
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.strong_alignments / totalReq) * 100}%`,
              }}
              className="bg-[#34c759] h-full"
              title={`Strong Alignment: ${metrics.strong_alignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.partial_alignments / totalReq) * 100}%`,
              }}
              className="bg-[#ff9500] h-full"
              title={`Partial Alignment: ${metrics.partial_alignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.potential_misalignments / totalReq) * 100}%`,
              }}
              className="bg-[#ff3b30] h-full"
              title={`Potential Misalignment: ${metrics.potential_misalignments}`}
            ></div>
          ) : null}
          {totalReq > 0 ? (
            <div
              style={{
                width: `${(metrics.insufficient_evidence_count / totalReq) * 100}%`,
              }}
              className="bg-[#8e8e93] h-full"
              title={`Insufficient Evidence: ${metrics.insufficient_evidence_count}`}
            ></div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] flex items-center justify-between">
            <span className="font-semibold text-[#1d7334]">Strong Alignment (4)</span>
            <span className="font-bold text-[#1d7334] text-base">
              {metrics.strong_alignments}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#fff7e6] border border-[#ffd580] flex items-center justify-between">
            <span className="font-semibold text-[#b25e00]">Partial Alignment (3)</span>
            <span className="font-bold text-[#b25e00] text-base">
              {metrics.partial_alignments}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#fdeef0] border border-[#f9abb4] flex items-center justify-between">
            <span className="font-semibold text-[#c9182b]">Potential Misaligned (1)</span>
            <span className="font-bold text-[#c9182b] text-base">
              {metrics.potential_misalignments}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#f2f2f7] border border-[#d1d1d6] flex items-center justify-between">
            <span className="font-semibold text-[#636366]">Insufficient Evidence</span>
            <span className="font-bold text-[#636366] text-base">
              {metrics.insufficient_evidence_count}
            </span>
          </div>
        </div>
      </div>

      {/* Top Priority Structural Findings & Key Insights */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#1d1d1f] tracking-tight flex items-center gap-2">
              <MatrixIcon className="w-5 h-5 text-[#0071e3]" />
              <span>Key Diagnostic Findings & Priority Governance Gaps</span>
            </h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              Identified through automated 6-stage cross-examination of corporate charters and disclosures
            </p>
          </div>
          <button
            onClick={() => onNavigate("recommendations")}
            className="text-xs text-[#0071e3] font-semibold hover:underline"
          >
            View All {metrics.recommendations_count} Recommended Actions →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Finding 1 */}
          <div className="p-4 rounded-2xl bg-[#fdeef0]/60 border border-[#f9abb4] card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="px-2 py-0.5 rounded-full bg-[#ff3b30] text-white font-bold text-[10px]">
                  CRITICAL GAP
                </span>
                <span className="text-[#86868b] font-mono text-[11px]">Centralization</span>
              </div>
              <div className="text-sm font-bold text-[#1d1d1f] leading-snug">
                Dual-Class Founder Voting Power Concentration
              </div>
              <p className="text-xs text-[#515154] mt-2 leading-relaxed">
                Class B shares hold concentrated voting power, creating a governance imbalance between executive authority and independent minority shareholder accountability.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-black/5 text-xs text-[#0071e3] flex items-center justify-between font-medium">
              <span>Reform: Independent lead director</span>
              <span className="font-bold text-[#d70015]">Score 1.0</span>
            </div>
          </div>

          {/* Finding 2 */}
          <div className="p-4 rounded-2xl bg-[#fff7e6]/60 border border-[#ffd580] card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="px-2 py-0.5 rounded-full bg-[#ff9500] text-white font-bold text-[10px]">
                  PARTIAL ALIGNMENT
                </span>
                <span className="text-[#86868b] font-mono text-[11px]">Formalization</span>
              </div>
              <div className="text-sm font-bold text-[#1d1d1f] leading-snug">
                Youth Safety Controls &amp; Pre-Launch Review
              </div>
              <p className="text-xs text-[#515154] mt-2 leading-relaxed">
                Default teen accounts deployed; self-reported safety disclosures capped at Partial Alignment pending third-party operational audit.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-black/5 text-xs text-[#0071e3] flex items-center justify-between font-medium">
              <span>Action: Publish 3P audit report</span>
              <span className="font-bold text-[#b25e00]">Score 3.0</span>
            </div>
          </div>

          {/* Finding 3 */}
          <div className="p-4 rounded-2xl bg-[#eaf8ee]/60 border border-[#a3e4b7] card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="px-2 py-0.5 rounded-full bg-[#34c759] text-white font-bold text-[10px]">
                  STRONG ALIGNMENT
                </span>
                <span className="text-[#86868b] font-mono text-[11px]">Governance</span>
              </div>
              <div className="text-sm font-bold text-[#1d1d1f] leading-snug">
                Audit &amp; Risk Committee Board Charter
              </div>
              <p className="text-xs text-[#515154] mt-2 leading-relaxed">
                Direct board charter mandates quarterly reporting from Chief Privacy Officer, backed by executive Responsible Innovation Council.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-black/5 text-xs text-[#0071e3] flex items-center justify-between font-medium">
              <span>Verified: Formal Board Charter</span>
              <span className="font-bold text-[#1d7334]">Score 4.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Architecture Engine */}
      <div className="apple-card overflow-hidden">
        <button
          onClick={() => setShowArchitecture(!showArchitecture)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3]">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1d1d1f]">
                Technical Multi-Agent Architecture (6-Stage Pipeline)
              </div>
              <div className="text-xs text-[#86868b]">
                End-to-end evidence verification combining local RAG, Groq LLM inference, and deterministic scoring.
              </div>
            </div>
          </div>
          <span className="text-xs text-[#0071e3] font-semibold px-3 py-1.5 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20">
            {showArchitecture ? "Hide Diagram ▲" : "Inspect Diagram ▼"}
          </span>
        </button>
        {showArchitecture ? (
          <div className="p-6 border-t border-black/5 animate-fade-in bg-white/50">
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

      {/* Live AI Executive Diagnostic & Evidence Q&A Synthesis */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#5856d6] text-white text-[10px] font-bold uppercase tracking-wider">
                Groq AI Live Synthesis
              </span>
              <h3 className="text-base font-bold text-[#1d1d1f]">
                AI Executive Briefing & Diagnostic Synthesis
              </h3>
            </div>
            <p className="text-xs text-[#86868b] mt-0.5">
              Powered by Groq with strict citation verification. Synthesizes extracted evidence and structural gaps.
            </p>
          </div>
          <button
            onClick={handleRunGroqSynthesis}
            disabled={isGeneratingAi}
            className="apple-btn-primary self-start sm:self-auto"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>{isGeneratingAi ? "Synthesizing AI Briefing..." : "Generate AI Briefing"}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={aiQuestion}
            onInput={(e: any) => setAiQuestion(e.target.value)}
            placeholder="Ask an organizational alignment question grounded in this period's evidence..."
            className="flex-1 bg-[#f5f5f7] border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
          />
        </div>

        {aiError ? (
          <div className="p-3 rounded-xl bg-[#fdeef0] border border-[#f9abb4] text-xs text-[#c9182b]">
            {aiError}
          </div>
        ) : null}

        {aiResult ? (
          <div className="p-5 rounded-2xl bg-[#fbfbfd] border border-black/8 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
              <span className="font-bold text-[#1d1d1f] text-sm">
                Executive Diagnostic Briefing ({assessment.company_name})
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 font-mono text-[11px] font-semibold">
                Engine: {aiResult.provider_used}
              </span>
            </div>
            <p className="text-[#515154] leading-relaxed text-sm">
              {aiResult.executive_summary}
            </p>
            {aiResult.targeted_question_response &&
            aiResult.targeted_question_response !== aiResult.executive_summary ? (
              <div className="p-3.5 rounded-xl bg-[#f5f5f7] border border-black/8">
                <div className="font-bold text-[#1d1d1f] mb-1">
                  Targeted Diagnostic Response:
                </div>
                <p className="text-[#515154] leading-relaxed">
                  {aiResult.targeted_question_response}
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7]">
                <div className="font-bold text-[#1d7334] mb-1">
                  Key Structural Strengths
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[#1d7334]">
                  {(aiResult.key_strengths || []).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3.5 rounded-xl bg-[#fff7e6] border border-[#ffd580]">
                <div className="font-bold text-[#b25e00] mb-1">
                  Key Structural Alignment Gaps
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[#b25e00]">
                  {(aiResult.key_structural_gaps || []).map((g: string, i: number) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-[11px] text-[#86868b] italic">
              <strong>Evidence Limitation Disclosure:</strong>{" "}
              {aiResult.evidence_limitations_summary}
            </div>
          </div>
        ) : null}
      </div>

      {/* Two-Column Grid: Stakeholder Alignment vs Coverage & 7 Organizational Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stakeholder Alignment & Coverage Chart */}
        <div className="apple-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#1d1d1f]">
                Stakeholder Alignment Score vs. Evidence Coverage
              </h3>
              <p className="text-xs text-[#86868b]">
                Weighted by evaluator importance weights
              </p>
            </div>
            <button
              onClick={() => onNavigate("stakeholders")}
              className="text-xs text-[#0071e3] font-semibold hover:underline"
            >
              Adjust Weights →
            </button>
          </div>
          <div className="space-y-3.5">
            {stakeholders.map((sh) => {
              const score = sh.alignment_score;
              const barColor =
                score === null
                  ? "bg-[#8e8e93]"
                  : score >= 75
                  ? "bg-[#34c759]"
                  : score >= 55
                  ? "bg-[#ff9500]"
                  : "bg-[#ff3b30]";
              return (
                <div key={sh.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1d1d1f]">{sh.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-black/5 text-[#86868b] text-[10px] font-mono">
                        {sh.category} • W:{sh.importance_weight}x
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#86868b]">
                        Cov: <strong className="text-[#1d1d1f]">{sh.evidence_coverage_pct}%</strong>
                      </span>
                      <span className="font-bold text-[#1d1d1f] w-14 text-right">
                        {score !== null ? `${score}%` : "Insuff."}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#e5e5ea] rounded-full overflow-hidden flex">
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
          <div className="apple-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-[#1d1d1f]">
                  7 Organizational Structure Dimensions
                </h3>
                <p className="text-xs text-[#86868b]">
                  Structural suitability based on extracted evidence
                </p>
              </div>
              <button
                onClick={() => onNavigate("structure")}
                className="text-xs text-[#0071e3] font-semibold hover:underline"
              >
                Inspect Structure →
              </button>
            </div>
            <div className="divide-y divide-black/5">
              {dimensions_summary.map((d) => (
                <div
                  key={d.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#1d1d1f]">
                      {d.dimension_name}
                    </span>
                    <span className="text-[#86868b] ml-2">
                      ({d.evidence_count} citations)
                    </span>
                  </div>
                  {classificationBadge(d.suitability_classification)}
                </div>
              ))}
            </div>
          </div>

          {/* Company-Specific Analysis Priorities */}
          <div className="apple-card p-6">
            <h3 className="text-base font-bold text-[#1d1d1f]">
              Configured Diagnostic Priorities ({assessment.company_name})
            </h3>
            <p className="text-xs text-[#86868b] mt-0.5 mb-3">
              Priority focus areas guiding retrieval and expectation discovery without predetermining conclusions
            </p>
            <div className="flex flex-wrap gap-2">
              {(assessment.company_priorities || []).map((prio, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] text-xs font-semibold"
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
