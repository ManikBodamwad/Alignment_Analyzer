import { h, useState } from "../lib/react-lite";

export interface EvidenceToInsightFlowProps {
  evidenceCount?: number;
  coveragePct?: number;
  alignmentScore?: number | null;
  conflictCount?: number;
  recommendationCount?: number;
}

interface PipelineNode {
  id: string;
  step: string;
  title: string;
  category: "ingest" | "rag" | "llm" | "struct" | "score" | "action";
  status: "verified" | "active" | "live";
  metricLabel: string;
  metricValue: string;
  badge: string;
  description: string;
  auditRule: string;
  provenanceGuarantee: string;
}

export function EvidenceToInsightFlow(props: EvidenceToInsightFlowProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("llm-gate");

  const nodes: PipelineNode[] = [
    {
      id: "ingestion",
      step: "01",
      title: "Document Ingestion",
      category: "ingest",
      status: "verified",
      metricLabel: "Formats Supported",
      metricValue: "PDF • DOCX • XLSX • CSV • TXT",
      badge: "Zlib Stream Verified",
      description: "Extracts raw document text preserving page numbers, section headers, publication dates, and financial year metadata.",
      auditRule: "Strict character sanitization; rejection of prompt-injection attempts and binary malformations.",
      provenanceGuarantee: "Every extracted sentence retains immutable (document_id, chunk_id, page_number) coordinates."
    },
    {
      id: "vector-rag",
      step: "02",
      title: "Semantic Vector RAG",
      category: "rag",
      status: "active",
      metricLabel: "Embedding Model",
      metricValue: "all-MiniLM-L6-v2 (384-dim)",
      badge: "Local Semantic Vectors",
      description: "Embeds chunks locally with metadata-aware filtering (company_id, fiscal_year, dimension) and cosine similarity ranking.",
      auditRule: "Deterministic fallback to semantic feature hashing if local transformer weights are offline.",
      provenanceGuarantee: "Never hallucinates passage origins; context windows restricted to top-ranked verified chunks."
    },
    {
      id: "llm-gate",
      step: "03",
      title: "LLM Evidence Gate",
      category: "llm",
      status: "live",
      metricLabel: "Verified Quotations",
      metricValue: `${props.evidenceCount ?? 0} Records`,
      badge: "Groq Llama-3.3-70B",
      description: "Classifies evidence into FACT, COMPANY_CLAIM, THIRD_PARTY_CLAIM, and INFERENCE via structured JSON prompt contracts.",
      auditRule: "Mandatory Quotation Verification: Every quote is verified against source chunks; unmatched assertions are purged.",
      provenanceGuarantee: "COMPANY_CLAIM is capped at Partial Alignment (3.0); never awarded Strong Alignment without corroboration."
    },
    {
      id: "dimension-mapping",
      step: "04",
      title: "7-Dimension Mapping",
      category: "struct",
      status: "active",
      metricLabel: "Org Dimensions",
      metricValue: "7 Core Dimensions",
      badge: "Hierarchy • Centralization • Governance...",
      description: "Maps stakeholder expectations against organizational mechanisms, reporting lines, and operational units.",
      auditRule: "Reporting lines default to 'Insufficient Evidence' unless explicitly stated; no invented hierarchy.",
      provenanceGuarantee: "Disclosed units are indexed with explicit authority scope and evidence classification."
    },
    {
      id: "deterministic-scoring",
      step: "05",
      title: "Deterministic Scoring",
      category: "score",
      status: "verified",
      metricLabel: "Overall Alignment",
      metricValue: props.alignmentScore !== null && props.alignmentScore !== undefined ? `${props.alignmentScore}%` : "Pending",
      badge: "Zero-LLM Numerical Bias",
      description: "Calculates requirement-level and stakeholder-weighted scores entirely in deterministic Python math.",
      auditRule: "LLM is strictly prohibited from inventing numerical percentages; weights: Strong (4.0), Partial (3.0), Misaligned (1.0).",
      provenanceGuarantee: "Coverage score is calculated separately from alignment score so data gaps never masquerade as misalignment."
    },
    {
      id: "action-insight",
      step: "06",
      title: "Actionable Insights",
      category: "action",
      status: "live",
      metricLabel: "Remediations",
      metricValue: `${props.conflictCount ?? 0} Tensions • ${props.recommendationCount ?? 0} Actions`,
      badge: "Executive Synthesis",
      description: "Generates prioritized structural governance recommendations and cross-stakeholder tension mediation strategies.",
      auditRule: "Every recommendation links directly to identified root causes and verified source evidence citations.",
      provenanceGuarantee: "Full audit trail: allows expert manual override with logged evaluator rationale and timestamp."
    }
  ];

  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[2];

  return (
    <div className="glass-card rounded-2xl p-6 text-white space-y-6 border border-slate-800 bg-slate-900/90 shadow-2xl relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-extrabold tracking-wider uppercase text-cyan-300">
              Signature Diagnostic Engine: Evidence to Insight Architecture
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end evidence verification pipeline combining local RAG, Groq LLM inference, and deterministic scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/80 text-violet-300 border border-violet-700/50">
            6 Stage Multi-Agent Pipeline
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
            Quotation Provenance Active
          </span>
        </div>
      </div>

      {/* Horizontal Pipeline Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
        {nodes.map((node, idx) => {
          const isSelected = node.id === selectedNodeId;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`cursor-pointer rounded-xl p-3.5 transition-all duration-200 border relative ${
                isSelected
                  ? "bg-slate-800/90 border-violet-500 shadow-lg shadow-violet-500/20 ring-1 ring-violet-400"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
              }`}
            >
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {node.step}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    node.status === "verified"
                      ? "bg-emerald-400"
                      : node.status === "live"
                      ? "bg-cyan-400"
                      : "bg-violet-400"
                  }`}
                />
              </div>

              {/* Title */}
              <div className="text-xs font-bold text-slate-100 truncate">
                {node.title}
              </div>

              {/* Value / status */}
              <div className="text-[11px] text-cyan-300 font-semibold mt-1 truncate">
                {node.metricValue}
              </div>

              {/* Connector dot for desktop */}
              {idx < nodes.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-20">
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Inspection Drawer for Selected Node */}
      <div className="rounded-xl p-4 bg-slate-950/80 border border-slate-800/80 relative z-10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/30 flex items-center justify-center font-mono font-bold text-xs">
              {activeNode.step}
            </span>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {activeNode.title}
                <span className="text-xs font-normal text-slate-400">({activeNode.badge})</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {activeNode.description}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/50">
              {activeNode.metricLabel}: {activeNode.metricValue}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800 space-y-1">
            <div className="font-semibold text-violet-300 uppercase tracking-wider text-[10px]">
              Diagnostic Audit Rule
            </div>
            <p className="text-slate-300 leading-relaxed">{activeNode.auditRule}</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-300 uppercase tracking-wider text-[10px]">
              Provenance & Academic Guarantee
            </div>
            <p className="text-slate-300 leading-relaxed">{activeNode.provenanceGuarantee}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

