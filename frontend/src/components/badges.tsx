import { h } from "../lib/react-lite";

export function classificationBadge(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    "Strong Alignment": {
      bg: "bg-emerald-50 border-emerald-300",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
    },
    "Partial Alignment": {
      bg: "bg-amber-50 border-amber-300",
      text: "text-amber-800",
      dot: "bg-amber-500",
    },
    "Potential Misalignment": {
      bg: "bg-rose-50 border-rose-300",
      text: "text-rose-800",
      dot: "bg-rose-500",
    },
    "Insufficient Evidence": {
      bg: "bg-slate-100 border-slate-300",
      text: "text-slate-600",
      dot: "bg-slate-400",
    },
    "Not Applicable": {
      bg: "bg-gray-100 border-gray-200",
      text: "text-gray-500",
      dot: "bg-gray-400",
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
    FACT: "bg-blue-50 text-blue-800 border-blue-300",
    COMPANY_CLAIM: "bg-purple-50 text-purple-800 border-purple-300",
    THIRD_PARTY_CLAIM: "bg-teal-50 text-teal-800 border-teal-300",
    INFERENCE: "bg-orange-50 text-orange-800 border-orange-300",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${
        styles[evType] || "bg-slate-100 text-slate-700 border-slate-300"
      }`}
    >
      {evType.replace(/_/g, " ")}
    </span>
  );
}

export function priorityBadge(priority: string) {
  const styles: Record<string, string> = {
    Critical: "bg-rose-600 text-white",
    High: "bg-orange-500 text-white",
    Medium: "bg-amber-500 text-white",
    Low: "bg-slate-500 text-white",
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
    <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#e2e8f0"
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
          <span className="text-xl font-extrabold text-slate-900">
            {props.value !== null && props.value !== undefined ? `${props.value}%` : "N/A"}
          </span>
        </div>
      </div>
      <div>
        <div className="text-sm font-bold text-slate-900">{props.label}</div>
        <div className="text-xs text-slate-500 mt-1 leading-relaxed">{props.sublabel}</div>
      </div>
    </div>
  );
}

