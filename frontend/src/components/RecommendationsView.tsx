import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { EvidenceRecord, RecommendationItem } from "../types";
import { evidenceClassBadge, priorityBadge } from "./badges";
import { LightbulbIcon } from "./icons";

export function RecommendationsView(props: {
  recommendations: RecommendationItem[];
  evidenceList: EvidenceRecord[];
  onRefresh: () => void;
}) {
  const { recommendations, evidenceList, onRefresh } = props;
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const evMap = new Map<number, EvidenceRecord>();
  for (const e of evidenceList) evMap.set(e.id, e);

  const filtered = recommendations.filter((r) => {
    if (priorityFilter !== "ALL" && r.priority !== priorityFilter) return false;
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    return true;
  });

  const criticalCount = recommendations.filter((r) => r.priority === "Critical").length;
  const highCount = recommendations.filter((r) => r.priority === "High").length;
  const activeCount = recommendations.filter(
    (r) => r.status === "Accepted" || r.status === "Implemented"
  ).length;

  const handleStatusChange = async (recId: number, nextStatus: string) => {
    setUpdatingId(recId);
    try {
      await api.updateRecommendationStatus(recId, nextStatus);
      onRefresh();
    } finally {
      setUpdatingId(null);
    }
  };

  const statusStyles: Record<string, string> = {
    Proposed: "bg-[#f2f2f7] text-[#515154] border-[#d1d1d6]",
    Accepted: "bg-[#e8f2fe] text-[#0066cc] border-[#b3d7ff]",
    Implemented: "bg-[#eaf8ee] text-[#1d7334] border-[#a3e4b7]",
    Rejected: "bg-[#fdeef0] text-[#c9182b] border-[#f9abb4]",
  };

  return (
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Executive Summary Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-1">
        <div className="apple-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">
              Total Reforms
            </div>
            <div className="text-2xl font-bold text-[#1d1d1f] mt-1 tabular-nums">
              {recommendations.length}
            </div>
          </div>
          <span className="w-9 h-9 rounded-xl bg-[#e8f2fe] text-[#0071e3] flex items-center justify-center">
            <LightbulbIcon className="w-5 h-5" />
          </span>
        </div>

        <div className="apple-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">
              Critical Priority
            </div>
            <div className="text-2xl font-bold text-[#d70015] mt-1 tabular-nums">
              {criticalCount}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#fdeef0] border border-[#f9abb4] text-[#c9182b] text-[11px] font-bold">
            Urgent
          </span>
        </div>

        <div className="apple-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">
              High Priority
            </div>
            <div className="text-2xl font-bold text-[#b25e00] mt-1 tabular-nums">
              {highCount}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#fff7e6] border border-[#ffd580] text-[#b25e00] text-[11px] font-bold">
            Keystone
          </span>
        </div>

        <div className="apple-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">
              Adopted / Active
            </div>
            <div className="text-2xl font-bold text-[#1d7334] mt-1 tabular-nums">
              {activeCount}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#eaf8ee] border border-[#a3e4b7] text-[#1d7334] text-[11px] font-bold">
            Tracked
          </span>
        </div>
      </div>

      {/* Header & Filter Controls */}
      <div className="apple-card p-5 stagger-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#1d1d1f] tracking-tight">
            Actionable Structural &amp; Governance Recommendations ({filtered.length})
          </h2>
          <p className="text-xs text-[#86868b] mt-0.5">
            Organizational design changes, reporting line reforms, and governance controls grounded in extracted evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-black/8">
            {["ALL", "Critical", "High", "Medium", "Low"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-full font-semibold transition ${
                  priorityFilter === p
                    ? "bg-[#0071e3] text-white shadow-sm"
                    : "text-[#515154] hover:text-[#1d1d1f]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="border border-black/10 rounded-full px-3.5 py-1.5 bg-white text-[#1d1d1f] font-semibold focus:outline-none focus:border-[#0071e3] shadow-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="Proposed">Proposed</option>
            <option value="Accepted">Accepted</option>
            <option value="Implemented">Implemented</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Recommendations Cards */}
      {filtered.length === 0 ? (
        <div className="apple-card p-10 text-center space-y-3 stagger-3">
          <div className="text-sm font-bold text-[#1d1d1f]">
            {recommendations.length === 0
              ? "No recommendations generated for this assessment period yet."
              : "No recommendations match the selected Priority / Status filters."}
          </div>
          <p className="text-xs text-[#86868b]">
            {recommendations.length === 0
              ? "Run the AI Diagnostic from the top bar to generate prioritized organizational reforms."
              : "Reset your filters to view all available recommendations for this period."}
          </p>
          {recommendations.length > 0 ? (
            <button
              onClick={() => {
                setPriorityFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="apple-btn-secondary"
            >
              Reset All Filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec, idx) => (
            <div
              key={rec.id}
              className={`apple-card p-6 space-y-4 card-hover ${
                idx < 4 ? `stagger-${idx + 2}` : "animate-fade-in"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-black/8 pb-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] border border-black/10 text-[#515154] text-[11px] font-mono font-bold">
                      REC #{rec.id}
                    </span>
                    {priorityBadge(rec.priority)}
                    <span className="px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] text-[11px] font-mono font-semibold border border-[#b3d7ff] uppercase">
                      {rec.organizational_dimension}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] text-[11px] border border-black/8 font-medium">
                      Difficulty: <strong className="text-[#1d1d1f]">{rec.implementation_difficulty}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#1d1d1f] tracking-tight leading-snug">
                    {rec.title}
                  </h3>
                </div>

                {/* Status Workflow Selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-[#86868b]">
                    Status:
                  </span>
                  <select
                    disabled={updatingId === rec.id}
                    value={rec.status}
                    onChange={(e: any) =>
                      handleStatusChange(rec.id, e.target.value)
                    }
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-full border focus:outline-none cursor-pointer ${
                      statusStyles[rec.status] || statusStyles.Proposed
                    }`}
                  >
                    <option value="Proposed">Proposed</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Implemented">Implemented</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Root Cause & Governance Reform */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4] space-y-1.5">
                  <div className="font-bold text-[#c9182b] uppercase tracking-wider text-[11px]">
                    Identified Structural Issue
                  </div>
                  <p className="text-[#1d1d1f] leading-relaxed">
                    {rec.identified_issue}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#e8f2fe] border border-[#b3d7ff] space-y-1.5">
                  <div className="font-bold text-[#0066cc] uppercase tracking-wider text-[11px]">
                    Required Governance Reform
                  </div>
                  <p className="text-[#1d1d1f] leading-relaxed font-medium">
                    {rec.suggested_organizational_change}
                  </p>
                </div>
              </div>

              {/* Expected Benefit & Trade-offs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] leading-relaxed">
                  <span className="font-bold text-[#1d7334]">
                    Expected Benefit:{" "}
                  </span>
                  <span className="text-[#1d1d1f]">{rec.expected_benefit}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#fff7e6] border border-[#ffd580] leading-relaxed">
                  <span className="font-bold text-[#b25e00]">
                    Implementation Trade-offs:{" "}
                  </span>
                  <span className="text-[#1d1d1f]">{rec.possible_tradeoffs}</span>
                </div>
              </div>

              {/* Linked Evidence Citations */}
              {(rec.evidence_ids || []).length > 0 ? (
                <div className="pt-3 border-t border-black/8 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-[#86868b] uppercase tracking-wider">
                    Evidence Citations:
                  </span>
                  {rec.evidence_ids
                    .map((id) => evMap.get(id))
                    .filter(Boolean)
                    .map((ev) => (
                      <span
                        key={ev!.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f5f5f7] border border-black/8 text-[#1d1d1f] font-medium"
                      >
                        {evidenceClassBadge(ev!.evidence_classification)}
                        <span>
                          {ev!.document_name} (p.{ev!.page_number})
                        </span>
                      </span>
                    ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
