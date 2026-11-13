import { h } from "../lib/react-lite";

export function classificationBadge(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    "Strong Alignment": {
      bg: "bg-[#eaf8ee] border-[#a3e4b7]",
      text: "text-[#1d7334] font-semibold",
      dot: "bg-[#34c759] shadow-sm shadow-[#34c759]/60",
    },
    "Partial Alignment": {
      bg: "bg-[#fff7e6] border-[#ffd580]",
      text: "text-[#b25e00] font-semibold",
      dot: "bg-[#ff9500] shadow-sm shadow-[#ff9500]/60",
    },
    "Potential Misalignment": {
      bg: "bg-[#fdeef0] border-[#f9abb4]",
      text: "text-[#c9182b] font-semibold",
      dot: "bg-[#ff3b30] shadow-sm shadow-[#ff3b30]/60",
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
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${style.bg} ${style.text} shadow-sm`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
      {status}
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
      className={`inline-block px-2.5 py-0.5 rounded-md text-xs border font-mono tracking-wide ${
        styles[evType] || "bg-[#f2f2f7] text-[#1d1d1f] border-[#d1d1d6]"
      }`}
    >
      {evType.replace(/_/g, " ")}
    </span>
  );
}

export function priorityBadge(priority: string) {
  const styles: Record<string, string> = {
    Critical: "bg-[#ff3b30] text-white shadow-sm font-bold",
    High: "bg-[#ff9500] text-white shadow-sm font-bold",
    Medium: "bg-[#ffcc00] text-[#1d1d1f] font-semibold",
    Low: "bg-[#e5e5ea] text-[#636366] font-medium",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider ${
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
  const pct = props.value !== null && props.value !== undefined ? Math.max(0, Math.min(100, props.value)) : 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4 bg-white/90 p-5 rounded-2xl border border-black/10 shadow-sm relative overflow-hidden card-hover group">
      {/* Ambient soft glow */}
      <div 
        className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-10"
        style={{ backgroundColor: props.colorHex }}
      />
      
      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
        <svg 
          className="w-24 h-24 -rotate-90" 
          viewBox="0 0 120 120"
        >
          {/* Background circle track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#e5e5ea"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={props.colorHex}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            {props.value !== null && props.value !== undefined ? props.value.toFixed(1) : "N/A"}
          </span>
          <span className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider">
            {props.value !== null && props.value !== undefined ? "/ 100" : ""}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-[#1d1d1f] tracking-tight">
          {props.label}
        </span>
        <span className="text-xs text-[#86868b] mt-0.5 leading-relaxed">
          {props.sublabel}
        </span>
        <div className="mt-2 flex items-center gap-2">
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: props.colorHex }}
          />
          <span className="text-[11px] font-mono font-medium text-[#515154]">
            {pct >= 75 ? "Target Range" : pct >= 50 ? "Moderate Alignment" : "Action Required"}
          </span>
        </div>
      </div>
    </div>
  );
}
