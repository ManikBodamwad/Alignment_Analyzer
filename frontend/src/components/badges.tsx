import { h } from "../lib/react-lite";

export function classificationBadge(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    "Strong Alignment": {
      bg: "bg-emerald-950/60 border-emerald-500/40",
      text: "text-emerald-300",
      dot: "bg-emerald-400 shadow-sm shadow-emerald-400/50",
    },
    "Partial Alignment": {
      bg: "bg-amber-950/60 border-amber-500/40",
      text: "text-amber-300",
      dot: "bg-amber-400 shadow-sm shadow-amber-400/50",
    },
    "Potential Misalignment": {
      bg: "bg-rose-950/60 border-rose-500/40",
      text: "text-rose-300",
      dot: "bg-rose-400 shadow-sm shadow-rose-400/50",
    },
    "Insufficient Evidence": {
      bg: "bg-slate-900/80 border-slate-700",
      text: "text-slate-400",
      dot: "bg-slate-500",
    },
    "Not Applicable": {
      bg: "bg-slate-900/50 border-slate-800",
      text: "text-slate-500",
      dot: "bg-slate-600",
    },
  };
  const style = map[status] || map["Insufficient Evidence"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
      {status}
    </span>
  );
}

export function evidenceClassBadge(evType: string) {
  const styles: Record<string, string> = {
    FACT: "bg-blue-950/70 text-blue-300 border-blue-600/50 shadow-sm shadow-blue-500/10",
    COMPANY_CLAIM: "bg-purple-950/70 text-purple-300 border-purple-600/50 shadow-sm shadow-purple-500/10",
    THIRD_PARTY_CLAIM: "bg-teal-950/70 text-teal-300 border-teal-600/50 shadow-sm shadow-teal-500/10",
    INFERENCE: "bg-orange-950/70 text-orange-300 border-orange-600/50 shadow-sm shadow-orange-500/10",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold border font-mono tracking-wide ${
        styles[evType] || "bg-slate-800 text-slate-300 border-slate-700"
      }`}
    >
      {evType.replace(/_/g, " ")}
    </span>
  );
}

export function priorityBadge(priority: string) {
  const styles: Record<string, string> = {
    Critical: "bg-rose-600 text-white shadow-sm shadow-rose-500/30",
    High: "bg-orange-500 text-white shadow-sm shadow-orange-500/30",
    Medium: "bg-amber-500 text-slate-950 font-bold",
    Low: "bg-slate-700 text-slate-300",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
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
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl relative overflow-hidden">
      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
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
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-white">
            {props.value !== null && props.value !== undefined ? `${props.value}%` : "N/A"}
          </span>
        </div>
      </div>
      <div>
        <div className="text-sm font-bold text-slate-100">{props.label}</div>
        <div className="text-xs text-slate-400 mt-1 leading-relaxed">{props.sublabel}</div>
      </div>
    </div>
  );
}
