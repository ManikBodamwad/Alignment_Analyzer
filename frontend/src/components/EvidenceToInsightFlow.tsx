import { h, useState } from "../lib/react-lite";
import { ArrowRightIcon } from "./icons";

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
      metricValue: "PDF, DOCX, XLSX, TXT",
      badge: "Zlib Stream Verified",
      description:
        "Extracts raw document text preserving page numbers, section headers, publication dates, and financial year metadata.",
      auditRule:
        "Strict character sanitization; rejection of prompt-injection attempts and binary malformations.",
      provenanceGuarantee:
        "Every extracted sentence retains immutable (document_id, chunk_id, page_number) coordinates.",
    },
    {
      id: "vector-rag",
      step: "02",
      title: "Semantic Vector RAG",
      category: "rag",
      status: "active",
      metricLabel: "Embedding Model",
      metricValue: "MiniLM-L6-v2 (384d)",
      badge: "Local Semantic Vectors",
      description:
        "Embeds chunks locally with metadata-aware filtering (company_id, fiscal_year, dimension) and cosine similarity ranking.",
      auditRule:
        "Deterministic fallback to semantic feature hashing if local transformer weights are offline.",
      provenanceGuarantee:
        "Never hallucinates passage origins; context windows restricted to top-ranked verified chunks.",
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
      description:
        "Classifies evidence into FACT, COMPANY_CLAIM, THIRD_PARTY_CLAIM, and INFERENCE via structured JSON prompt contracts.",
      auditRule:
        "Mandatory Quotation Verification: Every quote is verified against source chunks; unmatched assertions are purged.",
      provenanceGuarantee:
        "COMPANY_CLAIM is capped at Partial Alignment (3.0); never awarded Strong Alignment without corroboration.",
    },
    {
      id: "dimension-mapping",
      step: "04",
      title: "7-Dimension Mapping",
      category: "struct",
      status: "active",
      metricLabel: "Org Dimensions",
      metricValue: "7 Core Dimensions",
      badge: "Hierarchy & Governance",
      description:
        "Maps stakeholder expectations against organizational mechanisms, reporting lines, and operational units.",
      auditRule:
        "Reporting lines default to 'Insufficient Evidence' unless explicitly stated; no invented hierarchy.",
      provenanceGuarantee:
        "Disclosed units are indexed with explicit authority scope and evidence classification.",
    },
    {
      id: "deterministic-scoring",
      step: "05",
      title: "Deterministic Scoring",
      category: "score",
      status: "verified",
      metricLabel: "Overall Alignment",
      metricValue:
        props.alignmentScore !== null && props.alignmentScore !== undefined
          ? `${props.alignmentScore}%`
          : "Pending",
      badge: "Zero-LLM Numerical Bias",
      description:
        "Calculates requirement-level and stakeholder-weighted scores entirely in deterministic Python math.",
      auditRule:
        "LLM is strictly prohibited from inventing numerical percentages; weights: Strong (4.0), Partial (3.0), Misaligned (1.0).",
      provenanceGuarantee:
        "Coverage score is calculated separately from alignment score so data gaps never masquerade as misalignment.",
    },
    {
      id: "action-insight",
      step: "06",
      title: "Actionable Insights",
      category: "action",
      status: "live",
      metricLabel: "Remediations",
      metricValue: `${props.conflictCount ?? 0} Tensions / ${props.recommendationCount ?? 0} Actions`,
      badge: "Executive Synthesis",
      description:
        "Generates prioritized structural governance recommendations and cross-stakeholder tension mediation strategies.",
      auditRule:
        "Every recommendation links directly to identified root causes and verified source evidence citations.",
      provenanceGuarantee:
        "Full audit trail: allows expert manual override with logged evaluator rationale and timestamp.",
    },
  ];

  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[2];

  return (
    <div className="rounded-2xl p-6 text-[#1d1d1f] space-y-6 border border-black/8 bg-[#fbfbfd] relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3] live-dot text-[#0071e3]" />
            <h3 className="text-sm font-bold tracking-tight uppercase text-[#0071e3]">
              Signature Diagnostic Engine: Evidence to Insight Architecture
            </h3>
          </div>
          <p className="text-xs text-[#86868b] mt-1">
            End-to-end evidence verification pipeline combining local RAG, Groq LLM inference, and deterministic scoring.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff]">
            6-Stage Multi-Agent Pipeline
          </span>
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#eaf8ee] text-[#1d7334] border border-[#a3e4b7]">
            Quotation Provenance Active
          </span>
        </div>
      </div>

      {/* Horizontal Pipeline Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative z-10">
        {nodes.map((node, idx) => {
          const isSelected = node.id === selectedNodeId;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border relative flex flex-col justify-between ${
                isSelected
                  ? "bg-white border-[#0071e3] shadow-lg ring-2 ring-[#0071e3]/20"
                  : "bg-white/80 border-black/8 hover:border-[#0071e3]/40 hover:bg-white shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-[#86868b]">
                    STAGE {node.step}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      node.status === "verified"
                        ? "bg-[#34c759]"
                        : node.status === "live"
                        ? "bg-[#0071e3]"
                        : "bg-[#5856d6]"
                    }`}
                  />
                </div>
                <div className="text-xs font-bold text-[#1d1d1f] leading-snug">
                  {node.title}
                </div>
              </div>
              <div className="text-[11px] text-[#0071e3] font-semibold mt-2 truncate">
                {node.metricValue}
              </div>

              {idx < nodes.length - 1 ? (
                <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-4 h-4 rounded-full bg-white border border-black/10 items-center justify-center text-[#0071e3] shadow-sm">
                  <ArrowRightIcon className="w-2.5 h-2.5" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Detailed Inspection Drawer for Selected Node */}
      <div className="rounded-2xl p-5 bg-white border border-black/8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/8 pb-3.5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#e8f2fe] text-[#0071e3] border border-[#b3d7ff] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              {activeNode.step}
            </span>
            <div>
              <div className="text-sm font-bold text-[#1d1d1f] flex flex-wrap items-center gap-2">
                <span>{activeNode.title}</span>
                <span className="text-xs font-medium text-[#86868b]">
                  ({activeNode.badge})
                </span>
              </div>
              <div className="text-xs text-[#515154] mt-0.5 leading-relaxed">
                {activeNode.description}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <span className="inline-block text-xs font-mono font-bold text-[#0066cc] bg-[#e8f2fe] px-3 py-1.5 rounded-full border border-[#b3d7ff]">
              {activeNode.metricLabel}: {activeNode.metricValue}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#f5f5f7] rounded-xl p-3.5 border border-black/8 space-y-1">
            <div className="font-bold text-[#5856d6] uppercase tracking-wider text-[10px]">
              Diagnostic Audit Rule
            </div>
            <p className="text-[#1d1d1f] leading-relaxed">{activeNode.auditRule}</p>
          </div>
          <div className="bg-[#eaf8ee] rounded-xl p-3.5 border border-[#a3e4b7] space-y-1">
            <div className="font-bold text-[#1d7334] uppercase tracking-wider text-[10px]">
              Provenance &amp; Academic Guarantee
            </div>
            <p className="text-[#1d1d1f] leading-relaxed">{activeNode.provenanceGuarantee}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
