import { h } from "../lib/react-lite";

export function classificationBadge(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    "Strong Alignment": {
      bg: "bg-[#eaf8ee] border-[#a3e4b7]",
      text: "text-[#1d7334] font-semibold",
      dot: "bg-[#34c759]",
    },
    "Partial Alignment": {
      bg: "bg-[#fff7e6] border-[#ffd580]",
      text: "text-[#b25e00] font-semibold",
      dot: "bg-[#ff9500]",
    },
    "Potential Misalignment": {
      bg: "bg-[#fdeef0] border-[#f9abb4]",
      text: "text-[#c9182b] font-semibold",
      dot: "bg-[#ff3b30]",
    },
    "Insufficient Evidence": {
      bg: "bg-[#f2f2f7] border-[#d1d1d6]",
      text: "text-[#636366] font-medium",
      dot: "bg-[#8e8e93]",
    },
    "Not Applicable": {
      bg: "bg-[#f2f2f7] border-[#e5e5ea]",
      text: "text-[#8e8e93] font-medium",
      dot: "bg-[#aeaeb2]",
    },
  };
  const style = map[status] || map["Insufficient Evidence"];
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs border text-center whitespace-nowrap ${style.bg} ${style.text} shadow-sm`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}></span>
      <span>{status}</span>
    </span>
  );
}

export function evidenceClassBadge(evType: string) {
  const styles: Record<string, string> = {
    FACT: "bg-[#e8f2fe] text-[#0066cc] border-[#b3d7ff] font-semibold",
    COMPANY_CLAIM: "bg-[#f5eefb] text-[#7a2ea6] border-[#dfc3f3] font-semibold",
    THIRD_PARTY_CLAIM: "bg-[#e6f7f7] text-[#007a7a] border-[#b0e6e6] font-semibold",
    INFERENCE: "bg-[#fff3e6] text-[#b85c00] border-[#ffd1a4] font-semibold",
  };
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] border font-mono tracking-wide text-center whitespace-nowrap ${
        styles[evType] || "bg-[#f2f2f7] text-[#1d1d1f] border-[#d1d1d6]"
      }`}
    >
      {evType.replace(/_/g, " ")}
    </span>
  );
}

export function priorityBadge(priority: string) {
  const styles: Record<string, string> = {
    Critical: "bg-[#ff3b30] text-white border-[#ff3b30] font-bold shadow-sm",
    High: "bg-[#ff9500] text-white border-[#ff9500] font-bold shadow-sm",
    Medium: "bg-[#fff3cd] text-[#8a5300] border-[#ffd580] font-semibold",
    Low: "bg-[#e5e5ea] text-[#515154] border-[#d1d1d6] font-semibold",
  };
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] border uppercase tracking-wider text-center whitespace-nowrap ${
        styles[priority] || styles.Medium
      }`}
    >
      {priority}
    </span>
  );
}

export function RadialScoreGauge(props: {
  label: string;
  sublabel: string;
  value: number | null;
  colorHex: string;
}) {
  const pct =
    props.value !== null && props.value !== undefined
      ? Math.max(0, Math.min(100, props.value))
      : 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="apple-card p-5 flex items-center gap-4 relative overflow-hidden card-hover group">
      {/* Ambient soft tint */}
      <div
        className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-15"
        style={{ backgroundColor: props.colorHex }}
      />

      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
        <svg
          className="w-28 h-28"
          viewBox="0 0 120 120"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#e5e5ea"
            stroke-width="9"
            fill="transparent"
          />
          {/* Progress */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={props.colorHex}
            stroke-width="9"
            stroke-dasharray={circumference}
            stroke-dashoffset={dashOffset}
            stroke-linecap="round"
            fill="transparent"
            style={{
              transition: "stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-bold tracking-tight text-[#1d1d1f] tabular-nums leading-none">
            {props.value !== null && props.value !== undefined
              ? `${props.value.toFixed(1)}%`
              : "N/A"}
          </span>
          <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider mt-1">
            {props.value !== null && props.value !== undefined ? "Score" : "Pending"}
          </span>
        </div>
      </div>

      <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold text-[#1d1d1f] tracking-tight">
          {props.label}
        </span>
        <span className="text-xs text-[#86868b] mt-1 leading-relaxed">
          {props.sublabel}
        </span>
        <div className="mt-2.5 flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: props.colorHex }}
          />
          <span className="text-[11px] font-mono font-semibold text-[#515154]">
            {pct >= 75
              ? "Target Range"
              : pct >= 50
              ? "Moderate Alignment"
              : "Action Required"}
          </span>
        </div>
      </div>
    </div>
  );
}
