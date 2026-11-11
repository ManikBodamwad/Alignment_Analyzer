import { api, getAuthContext, setAuthContext } from "../api";
import { h, useEffect, useState } from "../lib/react-lite";

export function SettingsView(props: {
  assessmentPeriodId: number;
  onAuthChange: () => void;
}) {
  const { assessmentPeriodId, onAuthChange } = props;
  const auth = getAuthContext();
  const [userName, setUserName] = useState(auth.name);
  const [userRole, setUserRole] = useState(auth.role);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>(
    "alignment_assessment"
  );
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState<any>({
    llm_provider: "groq",
    llm_model: "llama-3.3-70b-versatile",
    groq_configured: false,
    masked_groq_key: "Checking...",
  });
  const [newGroqKey, setNewGroqKey] = useState("");
  const [llmModelInput, setLlmModelInput] = useState("llama-3.3-70b-versatile");
  const [llmMsg, setLlmMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getAuditLogs(assessmentPeriodId).then(setAuditLogs).catch(() => {});
    api.getPrompts().then(setPrompts).catch(() => {});
    api
      .getLlmConfig()
      .then((cfg) => {
        setLlmConfig(cfg);
        if (cfg.llm_model) setLlmModelInput(cfg.llm_model);
      })
      .catch(() => {});
  }, [assessmentPeriodId]);

  const handleSaveLlmConfig = async (ev: Event) => {
    ev.preventDefault();
    setLlmMsg(null);
    try {
      const updated = await api.updateLlmConfig({
        groq_api_key: newGroqKey.trim() || undefined,
        llm_provider: "groq",
        llm_model: llmModelInput,
      });
      setLlmConfig(updated);
      setNewGroqKey("");
      setLlmMsg(
        `Groq AI configuration active (${updated.llm_model}, Key: ${updated.masked_groq_key})`
      );
    } catch (err: any) {
      setLlmMsg(`Failed to update LLM config: ${err.message}`);
    }
  };

  const handleSaveRole = (ev: Event) => {
    ev.preventDefault();
    setAuthContext(userName, userRole);
    onAuthChange();
  };

  const handleBackup = async () => {
    try {
      const res = await api.triggerBackup();
      setBackupMsg(`Database backup snapshot created at: ${res.backup_path}`);
    } catch (err: any) {
      setBackupMsg(`Backup failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Groq AI Provider Configuration */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-violet-800/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Groq Cloud LLM
              </span>
              <h3 className="text-sm font-bold text-white">
                AI Inference Engine & Groq API Configuration
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Active Provider: <strong className="text-slate-200">{llmConfig.llm_provider}</strong> | Model:{" "}
              <strong className="text-cyan-300 font-mono">{llmConfig.llm_model}</strong> | Key Status:{" "}
              <span
                className={
                  llmConfig.groq_configured
                    ? "text-emerald-400 font-bold font-mono"
                    : "text-amber-400 font-bold font-mono"
                }
              >
                {llmConfig.masked_groq_key}
              </span>
            </p>
          </div>
        </div>
        <form onSubmit={handleSaveLlmConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Groq Model
            </label>
            <select
              value={llmModelInput}
              onChange={(e: any) => setLlmModelInput(e.target.value)}
              className="w-full border border-slate-700 rounded-lg p-2 bg-slate-950 text-white font-mono focus:outline-none"
            >
              <option value="llama-3.3-70b-versatile">
                llama-3.3-70b-versatile (Recommended)
              </option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
              <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Update Groq API Key (Optional if in .env)
            </label>
            <input
              type="password"
              value={newGroqKey}
              onInput={(e: any) => setNewGroqKey(e.target.value)}
              placeholder={
                llmConfig.groq_configured
                  ? `Active: ${llmConfig.masked_groq_key}`
                  : "gsk_..."
              }
              className="w-full border border-slate-700 rounded-lg p-2 bg-slate-950 text-white font-mono placeholder-slate-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition shadow-md shadow-violet-600/30"
            >
              Save Groq AI Settings
            </button>
          </div>
        </form>
        {llmMsg ? (
          <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
            {llmMsg}
          </div>
        ) : null}
      </div>

      {/* RBAC & Database Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Authentication & Role-Based Access Control (RBAC)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure active evaluator identity and role permissions (Admin, Analyst, Viewer) for audit logging.
            </p>
          </div>
          <form onSubmit={handleSaveRole} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Evaluator Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onInput={(e: any) => setUserName(e.target.value)}
                  className="w-full border border-slate-700 rounded-lg p-2 bg-slate-950 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Access Role
                </label>
                <select
                  value={userRole}
                  onChange={(e: any) => setUserRole(e.target.value)}
                  className="w-full border border-slate-700 rounded-lg p-2 bg-slate-950 text-white font-semibold focus:outline-none"
                >
                  <option value="Admin">Admin (Full Write, Override & Config)</option>
                  <option value="Analyst">Analyst (Upload, Analyze & Override)</option>
                  <option value="Viewer">Viewer (Read-Only Diagnostic Access)</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-sm"
            >
              Update Active Evaluator Context
            </button>
          </form>
        </div>

        <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Database Reliability & Immutable Provenance
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Uploaded documents are treated as untrusted data and scanned for prompt injection before indexing. Create an instant database backup below.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={handleBackup}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
            >
              Create Timestamped Database Backup Snapshot
            </button>
            {backupMsg ? (
              <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
                {backupMsg}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 10 Dedicated AI System Prompts Registry */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              10 Modular AI System Prompts & Evidence Guardrails
            </h3>
            <p className="text-xs text-slate-400">
              Inspect the separate system prompts enforcing strict evidence citation and Pydantic JSON validation
            </p>
          </div>
          <select
            value={selectedPromptKey}
            onChange={(e: any) => setSelectedPromptKey(e.target.value)}
            className="text-xs border border-slate-700 rounded-lg p-2 bg-slate-950 font-bold text-violet-300 focus:outline-none"
          >
            {Object.keys(prompts).map((k) => (
              <option key={k} value={k}>
                Prompt: {k.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72 font-mono">
          {prompts[selectedPromptKey] || "Loading prompt specification..."}
        </pre>
      </div>

      {/* Immutable Audit Trail */}
      <div className="glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">
            Immutable Audit Trail & Manual Override History ({auditLogs.length})
          </h3>
          <p className="text-xs text-slate-400">
            Tracks all weight calibrations, manual classification overrides, document uploads, and score recalculations
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-3 font-bold">Timestamp</th>
                <th className="p-3 font-bold">Actor & Role</th>
                <th className="p-3 font-bold">Action</th>
                <th className="p-3 font-bold">Entity</th>
                <th className="p-3 font-bold">Justification / State Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    No manual overrides or configuration changes logged for this period yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-200">
                      {log.actor}{" "}
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                        {log.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-700/60 font-mono font-bold">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-mono">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="p-3 text-slate-300">
                      {log.justification ? (
                        <div className="font-semibold text-white">
                          Justification: "{log.justification}"
                        </div>
                      ) : null}
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                        {JSON.stringify(log.after_state)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
