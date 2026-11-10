import { h, useState } from "../lib/react-lite";
import { EvidenceRecord, StakeholderConflict } from "../types";
import { evidenceClassBadge, priorityBadge } from "./badges";

export function ConflictsView(props: {
  conflicts: StakeholderConflict[];
  evidenceList: EvidenceRecord[];
}) {
  const { conflicts, evidenceList } = props;
  const [selectedConflictId, setSelectedConflictId] = useState<number | null>(
    conflicts[0]?.id || null
  );

  const activeConflict =
    conflicts.find((c) => c.id === selectedConflictId) || conflicts[0] || null;
  const evMap = new Map<number, EvidenceRecord>();
  for (const e of evidenceList) evMap.set(e.id, e);

  // Build unique nodes and edges for the Interactive SVG Conflict Network Diagram
  const nodeNames = Array.from(
    new Set(
      conflicts.flatMap((c) => [c.stakeholder_a_name, c.stakeholder_b_name])
    )
  );
  const cx = 360;
  const cy = 155;
  const rx = 240;
  const ry = 105;
  const nodeCoords: Record<string, { x: number; y: number }> = {};
  nodeNames.forEach((name, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, nodeNames.length) - Math.PI / 2;
    nodeCoords[name] = {
      x: Math.round(cx + rx * Math.cos(angle)),
      y: Math.round(cy + ry * Math.sin(angle)),
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">
          Stakeholder Conflict Network & Governance Mediation Analysis
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Competing stakeholder expectations do not automatically imply poor alignment—this diagnostic evaluates whether the organization has effective cross-functional mechanisms to mediate competing interests.
        </p>
      </div>

      {/* Interactive Network Graph + Conflict Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive SVG Network Diagram */}
        <div className="lg:col-span-7 bg-slate-900 rounded-xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-indigo-300">
                Interactive Stakeholder Tension Network Graph
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any tension edge or conflict card to inspect organizational mediation mechanisms
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
              {conflicts.length} Structural Tensions
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 720 310" className="w-full h-72">
              {/* Edges */}
              {conflicts.map((c) => {
                const pA = nodeCoords[c.stakeholder_a_name] || { x: 100, y: 100 };
                const pB = nodeCoords[c.stakeholder_b_name] || { x: 400, y: 200 };
                const isSelected = activeConflict && activeConflict.id === c.id;
                const midX = (pA.x + pB.x) / 2;
                const midY = (pA.y + pB.y) / 2;
                return (
                  <g
                    key={c.id}
                    onClick={() => setSelectedConflictId(c.id)}
                    className="cursor-pointer"
                  >
                    <line
                      x1={pA.x}
                      y1={pA.y}
                      x2={pB.x}
                      y2={pB.y}
                      stroke={
                        isSelected
                          ? "#f43f5e"
                          : c.severity === "Critical"
                          ? "#fb7185"
                          : "#818cf8"
                      }
                      stroke-width={isSelected ? "4" : "2.5"}
                      stroke-dasharray={isSelected ? "none" : "5,4"}
                    />
                    <rect
                      x={midX - 42}
                      y={midY - 11}
                      width="84"
                      height="22"
                      rx="6"
                      fill={isSelected ? "#e11d48" : "#1e293b"}
                      stroke="#475569"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      text-anchor="middle"
                      fill="#ffffff"
                      font-size="10"
                      font-weight="bold"
                    >
                      {c.severity} Tension
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {nodeNames.map((name) => {
                const pt = nodeCoords[name];
                const isInvolved =
                  activeConflict &&
                  (activeConflict.stakeholder_a_name === name ||
                    activeConflict.stakeholder_b_name === name);
                return (
                  <g key={name}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isInvolved ? "24" : "20"}
                      fill={isInvolved ? "#4f46e5" : "#334155"}
                      stroke={isInvolved ? "#a5b4fc" : "#64748b"}
                      stroke-width="3"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 38}
                      text-anchor="middle"
                      fill="#e2e8f0"
                      font-size="11"
                      font-weight="bold"
                    >
                      {name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Conflict Selector List */}
        <div className="lg:col-span-5 space-y-3">
          {conflicts.map((c) => {
            const isSel = activeConflict && activeConflict.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedConflictId(c.id)}
                className={`cursor-pointer p-4 rounded-xl border transition shadow-sm ${
                  isSel
                    ? "bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20"
                    : "bg-white border-slate-200 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-slate-900">
                    {c.stakeholder_a_name} <span className="text-rose-600">⚡ vs.</span>{" "}
                    {c.stakeholder_b_name}
                  </div>
                  {priorityBadge(c.severity)}
                </div>
                <p className="text-xs font-semibold text-indigo-950 mt-1.5">
                  {c.conflicting_expectations}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(c.organizational_units_involved || []).map((u, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Conflict Deep-Dive & Supporting Evidence */}
      {activeConflict ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-bold text-rose-600 uppercase">
                Stakeholder Conflict Diagnostic & Resolution Architecture
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {activeConflict.stakeholder_a_name} vs.{" "}
                {activeConflict.stakeholder_b_name}
              </h3>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                {activeConflict.conflicting_expectations}
              </p>
            </div>
            {priorityBadge(activeConflict.severity)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900">
                Current Resolution Mechanisms
              </div>
              <p className="text-slate-700 leading-relaxed">
                {activeConflict.current_resolution_mechanisms}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1.5">
              <div className="font-bold text-rose-900">
                Potential Structural Weaknesses
              </div>
              <p className="text-rose-800 leading-relaxed">
                {activeConflict.structural_weaknesses}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
              <div className="font-bold text-emerald-900">
                Recommended Coordination / Governance Mechanism
              </div>
              <p className="text-emerald-800 leading-relaxed font-medium">
                {activeConflict.recommended_governance_mechanism}
              </p>
            </div>
          </div>

          {/* Supporting Evidence for Conflict */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Supporting Documentary Citations for This Conflict
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(activeConflict.evidence_ids || [])
                .map((id) => evMap.get(id))
                .filter(Boolean)
                .map((ev) => (
                  <div
                    key={ev!.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      {evidenceClassBadge(ev!.evidence_classification)}
                      <span className="text-[11px] text-slate-500">
                        {ev!.document_name} (p.{ev!.page_number})
                      </span>
                    </div>
                    <blockquote className="italic text-slate-800 border-l-2 border-rose-500 pl-2.5">
                      "{ev!.exact_quotation}"
                    </blockquote>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

