import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { EvidenceRecord, RecommendationItem } from "../types";
import { evidenceClassBadge, priorityBadge } from "./badges";

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
    Proposed: "bg-slate-800 text-slate-300 border-slate-700",
    Accepted: "bg-violet-950/80 text-violet-300 border-violet-700/60",
    Implemented: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
    Rejected: "bg-rose-950/80 text-rose-300 border-rose-700/60",
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header & Filters */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">
              Actionable Structural & Governance Recommendations ({recommendations.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Specific organizational design changes, reporting line reforms, and governance controls with implementation trade-offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-400">Priority:</span>
          {["ALL", "Critical", "High", "Medium", "Low"].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                priorityFilter === p
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
          <span className="font-semibold text-slate-400 ml-2">Status:</span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="border border-slate-700 rounded-lg p-1.5 bg-slate-950 text-white font-semibold focus:outline-none"
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
      <div className="space-y-4">
        {filtered.map((rec) => (
          <div
            key={rec.id}
            className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {priorityBadge(rec.priority)}
                  <span className="px-2.5 py-0.5 rounded bg-violet-950/70 text-violet-300 text-xs font-mono border border-violet-700/60 uppercase">
                    Dimension: {rec.organizational_dimension}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700 font-mono">
                    Difficulty: <strong className="text-white">{rec.implementation_difficulty}</strong>
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-white pt-1">
                  {rec.title}
                </h3>
              </div>

              {/* Status Workflow Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-400">
                  Workflow Status:
                </span>
                <select
                  disabled={updatingId === rec.id}
                  value={rec.status}
                  onChange={(e: any) =>
                    handleStatusChange(rec.id, e.target.value)
                  }
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none ${
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 space-y-1">
                <div className="font-bold text-rose-300">
                  Identified Structural Issue
                </div>
                <p className="text-rose-200 leading-relaxed">
                  {rec.identified_issue}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-violet-950/30 border border-violet-500/30 space-y-1">
                <div className="font-bold text-violet-300">
                  Required Governance Change
                </div>
                <p className="text-violet-200 leading-relaxed font-medium">
                  {rec.suggested_organizational_change}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                <span className="font-bold text-emerald-300">
                  Expected Benefit:{" "}
                </span>
                <span className="text-emerald-200">{rec.expected_benefit}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30">
                <span className="font-bold text-amber-300">
                  Implementation Trade-offs:{" "}
                </span>
                <span className="text-amber-200">{rec.possible_tradeoffs}</span>
              </div>
            </div>

            {/* Linked Evidence Citations */}
            {(rec.evidence_ids || []).length > 0 ? (
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300">
                  Traceable Evidence Citations:
                </span>
                {rec.evidence_ids
                  .map((id) => evMap.get(id))
                  .filter(Boolean)
                  .map((ev) => (
                    <span
                      key={ev!.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
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
    </div>
  );
}
