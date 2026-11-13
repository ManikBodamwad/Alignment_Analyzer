import { h, useState } from "../lib/react-lite";
import { EvidenceRecord, StakeholderConflict } from "../types";
import { evidenceClassBadge, priorityBadge } from "./badges";
import { BoltIcon, ScaleIcon, ShieldIcon } from "./icons";

function truncateLabel(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "..." : text;
}

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

  // Deduplicate Left (Stakeholder A) and Right (Stakeholder B) nodes for clean Bipartite Layout
  const leftStakeholders = Array.from(
    new Set(conflicts.map((c) => c.stakeholder_a_name))
  );
  const rightStakeholders = Array.from(
    new Set(conflicts.map((c) => c.stakeholder_b_name))
  );

  const laneCount = Math.max(
    1,
    conflicts.length,
    leftStakeholders.length,
    rightStakeholders.length
  );
  const svgHeight = Math.max(360, laneCount * 92 + 56);

  const getYPositions = (count: number) => {
    const usableHeight = svgHeight - 72;
    const step = usableHeight / Math.max(1, count);
    return Array.from({ length: count }, (_, idx) =>
      Math.round(44 + step * idx + step / 2)
    );
  };

  const leftYs = getYPositions(leftStakeholders.length);
  const rightYs = getYPositions(rightStakeholders.length);
  const centerYs = getYPositions(conflicts.length);

  const leftCoordMap: Record<string, number> = {};
  leftStakeholders.forEach((name, idx) => {
    leftCoordMap[name] = leftYs[idx];
  });

  const rightCoordMap: Record<string, number> = {};
  rightStakeholders.forEach((name, idx) => {
    rightCoordMap[name] = rightYs[idx];
  });

  const severityStroke = (severity: string, isSelected: boolean) => {
    if (isSelected) return "#0071e3";
    if (severity === "Critical") return "#ff3b30";
    if (severity === "High") return "#ff9500";
    return "#5856d6";
  };

  return (
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Header Card */}
      <div className="apple-card p-6 stagger-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#fdeef0] border border-[#f9abb4] text-[#d70015] flex items-center justify-center shrink-0">
              <ScaleIcon className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              Stakeholder Conflict Network &amp; Governance Mediation Analysis
            </h2>
          </div>
          <p className="text-xs text-[#515154] mt-1.5 leading-relaxed max-w-3xl">
            Competing stakeholder expectations do not automatically imply misalignment. This bipartite diagnostic evaluates whether existing organizational mechanisms effectively mediate structural tensions.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3.5 py-1.5 rounded-full bg-[#fdeef0] border border-[#f9abb4] text-[#c9182b] text-xs font-bold font-mono">
            {conflicts.length} Active Tensions
          </span>
        </div>
      </div>

      {/* Bipartite Tension Architecture Diagram (Full Width Clean SVG + Interactive Selector Grid) */}
      {conflicts.length === 0 ? (
        <div className="apple-card p-10 text-center text-sm text-[#86868b] stagger-2">
          No stakeholder conflicts recorded for this assessment period yet. Run the AI Diagnostic to extract structural tensions.
        </div>
      ) : (
        <div className="apple-card p-6 stagger-2 space-y-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
                <BoltIcon className="w-4 h-4 text-[#0071e3]" />
                <span>Bipartite Stakeholder Tension &amp; Mediation Architecture</span>
              </h3>
              <p className="text-xs text-[#86868b] mt-0.5">
                Click any center tension bridge or stakeholder node to inspect structural weaknesses and governance reforms
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 text-[#c9182b]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b30]" />
                Critical
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#b25e00]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500]" />
                High
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#5856d6]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5856d6]" />
                Medium
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#0071e3]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]" />
                Selected
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl bg-[#fbfbfd] border border-black/[0.06] p-3">
            <svg
              viewBox={`0 0 960 ${svgHeight}`}
              className="w-full min-w-[760px]"
              style={{ height: `${Math.min(460, svgHeight)}px` }}
            >
              {/* Column Headers */}
              <text
                x="134"
                y="24"
                text-anchor="middle"
                fill="#86868b"
                font-size="10"
                font-weight="700"
                letter-spacing="0.08em"
              >
                STAKEHOLDER PARTY A
              </text>
              <text
                x="480"
                y="24"
                text-anchor="middle"
                fill="#86868b"
                font-size="10"
                font-weight="700"
                letter-spacing="0.08em"
              >
                STRUCTURAL TENSION &amp; GOVERNANCE BRIDGE
              </text>
              <text
                x="826"
                y="24"
                text-anchor="middle"
                fill="#86868b"
                font-size="10"
                font-weight="700"
                letter-spacing="0.08em"
              >
                STAKEHOLDER PARTY B
              </text>

              {/* Smooth Bezier Tension Curves */}
              {conflicts.map((c, idx) => {
                const yA = leftCoordMap[c.stakeholder_a_name] ?? 100;
                const yB = rightCoordMap[c.stakeholder_b_name] ?? 100;
                const yC = centerYs[idx];
                const isSelected = activeConflict && activeConflict.id === c.id;
                const strokeColor = severityStroke(c.severity, isSelected);

                const leftPath = `M 248 ${yA} C 294 ${yA}, 300 ${yC}, 336 ${yC}`;
                const rightPath = `M 624 ${yC} C 660 ${yC}, 666 ${yB}, 712 ${yB}`;

                return (
                  <g
                    key={`edge-${c.id}`}
                    onClick={() => setSelectedConflictId(c.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Soft background halo for selected curve */}
                    {isSelected ? (
                      <g>
                        <path
                          d={leftPath}
                          fill="none"
                          stroke="#0071e3"
                          stroke-opacity="0.18"
                          stroke-width="8"
                          stroke-linecap="round"
                        />
                        <path
                          d={rightPath}
                          fill="none"
                          stroke="#0071e3"
                          stroke-opacity="0.18"
                          stroke-width="8"
                          stroke-linecap="round"
                        />
                      </g>
                    ) : null}

                    <path
                      d={leftPath}
                      fill="none"
                      stroke={strokeColor}
                      stroke-width={isSelected ? "2.6" : "1.8"}
                      stroke-opacity={isSelected ? "1" : "0.65"}
                      className={isSelected ? "animate-dash-flow" : ""}
                    />
                    <path
                      d={rightPath}
                      fill="none"
                      stroke={strokeColor}
                      stroke-width={isSelected ? "2.6" : "1.8"}
                      stroke-opacity={isSelected ? "1" : "0.65"}
                      className={isSelected ? "animate-dash-flow" : ""}
                    />

                    {/* Endpoint Dots */}
                    <circle cx="248" cy={yA} r="4" fill={strokeColor} />
                    <circle cx="712" cy={yB} r="4" fill={strokeColor} />
                  </g>
                );
              })}

              {/* Left Stakeholder Nodes */}
              {leftStakeholders.map((name) => {
                const y = leftCoordMap[name];
                const isInvolved =
                  activeConflict && activeConflict.stakeholder_a_name === name;
                return (
                  <g
                    key={`left-${name}`}
                    onClick={() => {
                      const match = conflicts.find((c) => c.stakeholder_a_name === name);
                      if (match) setSelectedConflictId(match.id);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x="20"
                      y={y - 26}
                      width="228"
                      height="52"
                      rx="14"
                      fill={isInvolved ? "#e8f2fe" : "#ffffff"}
                      stroke={isInvolved ? "#0071e3" : "#d2d2d7"}
                      stroke-width={isInvolved ? "2" : "1.2"}
                    />
                    <circle
                      cx="40"
                      cy={y}
                      r="5"
                      fill={isInvolved ? "#0071e3" : "#86868b"}
                    />
                    <text
                      x="54"
                      y={y + 4}
                      fill="#1d1d1f"
                      font-size="12"
                      font-weight="700"
                    >
                      {truncateLabel(name, 26)}
                    </text>
                  </g>
                );
              })}

              {/* Center Tension Bridge Cards (Never Overlapping) */}
              {conflicts.map((c, idx) => {
                const y = centerYs[idx];
                const isSelected = activeConflict && activeConflict.id === c.id;
                const badgeFill =
                  c.severity === "Critical"
                    ? "#ff3b30"
                    : c.severity === "High"
                    ? "#ff9500"
                    : "#5856d6";

                return (
                  <g
                    key={`center-${c.id}`}
                    onClick={() => setSelectedConflictId(c.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x="336"
                      y={y - 32}
                      width="288"
                      height="64"
                      rx="16"
                      fill={isSelected ? "#ffffff" : "#f5f5f7"}
                      stroke={isSelected ? "#0071e3" : "#d2d2d7"}
                      stroke-width={isSelected ? "2.2" : "1.2"}
                    />
                    {/* Severity Pill inside SVG */}
                    <rect
                      x="350"
                      y={y - 20}
                      width="72"
                      height="18"
                      rx="9"
                      fill={badgeFill}
                    />
                    <text
                      x="386"
                      y={y - 8}
                      text-anchor="middle"
                      fill="#ffffff"
                      font-size="9.5"
                      font-weight="700"
                    >
                      {c.severity.toUpperCase()}
                    </text>

                    <text
                      x="432"
                      y={y - 8}
                      fill="#86868b"
                      font-size="10"
                      font-weight="600"
                    >
                      {(c.organizational_units_involved || [])[0]
                        ? truncateLabel(c.organizational_units_involved[0], 26)
                        : "Cross-Functional"}
                    </text>

                    <text
                      x="350"
                      y={y + 15}
                      fill="#1d1d1f"
                      font-size="11.5"
                      font-weight="600"
                    >
                      {truncateLabel(c.conflicting_expectations, 40)}
                    </text>
                  </g>
                );
              })}

              {/* Right Stakeholder Nodes */}
              {rightStakeholders.map((name) => {
                const y = rightCoordMap[name];
                const isInvolved =
                  activeConflict && activeConflict.stakeholder_b_name === name;
                return (
                  <g
                    key={`right-${name}`}
                    onClick={() => {
                      const match = conflicts.find((c) => c.stakeholder_b_name === name);
                      if (match) setSelectedConflictId(match.id);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x="712"
                      y={y - 26}
                      width="228"
                      height="52"
                      rx="14"
                      fill={isInvolved ? "#e8f2fe" : "#ffffff"}
                      stroke={isInvolved ? "#0071e3" : "#d2d2d7"}
                      stroke-width={isInvolved ? "2" : "1.2"}
                    />
                    <circle
                      cx="732"
                      cy={y}
                      r="5"
                      fill={isInvolved ? "#0071e3" : "#86868b"}
                    />
                    <text
                      x="746"
                      y={y + 4}
                      fill="#1d1d1f"
                      font-size="12"
                      font-weight="700"
                    >
                      {truncateLabel(name, 26)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Conflict Selector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-3">
        {conflicts.map((c) => {
          const isSel = activeConflict && activeConflict.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedConflictId(c.id)}
              className={`apple-card p-5 cursor-pointer card-hover flex flex-col justify-between gap-3 ${
                isSel
                  ? "border-[#0071e3] ring-2 ring-[#0071e3]/20 bg-white"
                  : "bg-white/85"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-[#1d1d1f] flex flex-wrap items-center gap-1.5">
                    <span>{c.stakeholder_a_name}</span>
                    <span className="text-[#d70015] font-semibold px-1.5 py-0.5 rounded bg-[#fdeef0] text-[11px]">
                      vs.
                    </span>
                    <span>{c.stakeholder_b_name}</span>
                  </div>
                  {priorityBadge(c.severity)}
                </div>
                <p className="text-xs font-medium text-[#515154] mt-2 leading-relaxed">
                  {c.conflicting_expectations}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-black/5">
                {(c.organizational_units_involved || []).map((u, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] text-[11px] font-medium border border-black/8"
                  >
                    {u}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Conflict Deep-Dive & Supporting Evidence */}
      {activeConflict ? (
        <div className="apple-card p-6 space-y-5 stagger-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/8 pb-4">
            <div>
              <div className="text-xs font-bold text-[#0071e3] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldIcon className="w-3.5 h-3.5" />
                <span>Stakeholder Conflict Diagnostic &amp; Resolution Architecture</span>
              </div>
              <h3 className="text-xl font-bold text-[#1d1d1f] mt-1 tracking-tight">
                {activeConflict.stakeholder_a_name} vs.{" "}
                {activeConflict.stakeholder_b_name}
              </h3>
              <p className="text-xs font-medium text-[#515154] mt-1">
                {activeConflict.conflicting_expectations}
              </p>
            </div>
            <div className="shrink-0">{priorityBadge(activeConflict.severity)}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/8 space-y-1.5">
              <div className="font-bold text-[#1d1d1f] uppercase tracking-wider text-[11px]">
                Current Resolution Mechanisms
              </div>
              <p className="text-[#515154] leading-relaxed">
                {activeConflict.current_resolution_mechanisms}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#fdeef0] border border-[#f9abb4] space-y-1.5">
              <div className="font-bold text-[#c9182b] uppercase tracking-wider text-[11px]">
                Potential Structural Weaknesses
              </div>
              <p className="text-[#7f1d1d] leading-relaxed">
                {activeConflict.structural_weaknesses}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#e8f2fe] border border-[#b3d7ff] space-y-1.5">
              <div className="font-bold text-[#0066cc] uppercase tracking-wider text-[11px]">
                Recommended Governance Mechanism
              </div>
              <p className="text-[#1d1d1f] leading-relaxed font-medium">
                {activeConflict.recommended_governance_mechanism}
              </p>
            </div>
          </div>

          {/* Supporting Evidence for Conflict */}
          <div>
            <h4 className="text-xs font-bold text-[#86868b] uppercase tracking-wider mb-3">
              Supporting Documentary Citations for This Conflict
            </h4>
            {(activeConflict.evidence_ids || []).length === 0 ? (
              <div className="p-4 rounded-xl bg-[#f5f5f7] border border-black/8 text-xs text-[#86868b]">
                No linked quotation IDs recorded for this conflict.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(activeConflict.evidence_ids || [])
                  .map((id) => evMap.get(id))
                  .filter(Boolean)
                  .map((ev) => (
                    <div
                      key={ev!.id}
                      className="p-4 rounded-2xl border border-black/8 bg-[#fbfbfd] text-xs space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {evidenceClassBadge(ev!.evidence_classification)}
                        <span className="text-[11px] font-medium text-[#86868b]">
                          {ev!.document_name} (p.{ev!.page_number})
                        </span>
                      </div>
                      <blockquote className="italic text-[#1d1d1f] border-l-2 border-[#0071e3] pl-3 leading-relaxed">
                        &ldquo;{ev!.exact_quotation}&rdquo;
                      </blockquote>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
