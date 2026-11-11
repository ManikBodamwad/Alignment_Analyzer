import { h } from "../lib/react-lite";

export function classificationBadge(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    "Strong Alignment": {
      bg: "bg-emerald-950/80 border-emerald-500/60",
      text: "text-emerald-200 font-bold",
      dot: "bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse",
    },
    "Partial Alignment": {
      bg: "bg-amber-950/80 border-amber-500/60",
      text: "text-amber-200 font-bold",
      dot: "bg-amber-400 shadow-sm shadow-amber-400/80",
    },
    "Potential Misalignment": {
      bg: "bg-rose-950/80 border-rose-500/60",
      text: "text-rose-200 font-bold",
      dot: "bg-rose-400 shadow-sm shadow-rose-400/80 animate-pulse",
    },
    "Insufficient Evidence": {
      bg: "bg-slate-900 border-slate-700",
      text: "text-slate-300 font-medium",
      dot: "bg-slate-500",
    },
    "Not Applicable": {
      bg: "bg-slate-900/60 border-slate-800",
      text: "text-slate-400 font-medium",
      dot: "bg-slate-600",
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
    FACT: "bg-blue-950/90 text-blue-200 border-blue-500/70 shadow-sm shadow-blue-500/20 font-bold",
    COMPANY_CLAIM: "bg-purple-950/90 text-purple-200 border-purple-500/70 shadow-sm shadow-purple-500/20 font-bold",
    THIRD_PARTY_CLAIM: "bg-teal-950/90 text-teal-200 border-teal-500/70 shadow-sm shadow-teal-500/20 font-bold",
    INFERENCE: "bg-orange-950/90 text-orange-200 border-orange-500/70 shadow-sm shadow-orange-500/20 font-bold",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded text-xs border font-mono tracking-wide ${
        styles[evType] || "bg-slate-800 text-slate-200 border-slate-700"
      }`}
    >
      {evType.replace(/_/g, " ")}
    </span>
  );
}

export function priorityBadge(priority: string) {
  const styles: Record<string, string> = {
    Critical: "bg-rose-600 text-white shadow-md shadow-rose-500/40 font-black",
    High: "bg-orange-500 text-white shadow-md shadow-orange-500/40 font-black",
    Medium: "bg-amber-500 text-slate-950 font-black",
    Low: "bg-slate-700 text-slate-200 font-semibold",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded text-xs uppercase tracking-wider ${
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
    <div className="flex items-center gap-4 bg-[#111827] p-5 rounded-2xl border border-slate-700/80 shadow-xl relative overflow-hidden card-hover">
      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#1e293b"
            stroke-width="10"
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={props.colorHex}
            stroke-width="10"
            stroke-dasharray={String(circumference)}
            stroke-dashoffset={String(dashOffset)}
            stroke-linecap="round"
            fill="none"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white tracking-tight">
            {props.value !== null && props.value !== undefined ? `${props.value}%` : "N/A"}
          </span>
        </div>
      </div>
      <div>
        <div className="text-sm font-extrabold text-white tracking-tight">{props.label}</div>
        <div className="text-xs text-slate-300 mt-1 leading-relaxed font-normal">{props.sublabel}</div>
      </div>
    </div>
  );
}
