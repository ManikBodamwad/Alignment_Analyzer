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
    Proposed: "bg-slate-100 text-slate-800 border-slate-300",
    Accepted: "bg-indigo-100 text-indigo-800 border-indigo-300",
    Implemented: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Rejected: "bg-rose-100 text-rose-800 border-rose-300",
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Actionable Structural & Governance Recommendations ({recommendations.length})
          </h2>
          <p className="text-xs text-slate-500">
            Specific organizational design changes, reporting line reforms, and governance controls with implementation trade-offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">Priority:</span>
          {["ALL", "Critical", "High", "Medium", "Low"].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                priorityFilter === p
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
          <span className="font-semibold text-slate-600 ml-2">Status:</span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg p-1.5 bg-white font-semibold"
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
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {priorityBadge(rec.priority)}
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-xs font-bold uppercase">
                    Dimension: {rec.organizational_dimension}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                    Difficulty: <strong>{rec.implementation_difficulty}</strong>
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 pt-1">
                  {rec.title}
                </h3>
              </div>

              {/* Status Workflow Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-500">
                  Workflow Status:
                </span>
                <select
                  disabled={updatingId === rec.id}
                  value={rec.status}
                  onChange={(e: any) =>
                    handleStatusChange(rec.id, e.target.value)
                  }
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
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
              <div className="p-3.5 rounded-lg bg-rose-50/50 border border-rose-200 space-y-1">
                <div className="font-bold text-rose-900">
                  Identified Structural Issue
                </div>
                <p className="text-rose-900 leading-relaxed">
                  {rec.identified_issue}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-200 space-y-1">
                <div className="font-bold text-indigo-950">
                  Required Organizational / Governance Change
                </div>
                <p className="text-indigo-950 leading-relaxed font-medium">
                  {rec.suggested_organizational_change}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="font-bold text-emerald-900">
                  Expected Benefit:{" "}
                </span>
                <span className="text-emerald-800">{rec.expected_benefit}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                <span className="font-bold text-amber-900">
                  Implementation Trade-offs:{" "}
                </span>
                <span className="text-amber-800">{rec.possible_tradeoffs}</span>
              </div>
            </div>

            {/* Linked Evidence Citations */}
            {(rec.evidence_ids || []).length > 0 ? (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700">
                  Traceable Evidence Citations:
                </span>
                {rec.evidence_ids
                  .map((id) => evMap.get(id))
                  .filter(Boolean)
                  .map((ev) => (
                    <span
                      key={ev!.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200"
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

