import { api, getAuthContext, setAuthContext } from "../api";
import { h, useEffect, useState } from "../lib/react-lite";
import { SettingsIcon, ShieldIcon } from "./icons";

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
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Groq AI Provider Configuration */}
      <div className="apple-card p-6 space-y-4 stagger-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#5856d6] text-white text-[10px] font-bold uppercase tracking-wider">
                Groq Cloud LLM
              </span>
              <h3 className="text-base font-bold text-[#1d1d1f]">
                AI Inference Engine &amp; Groq API Configuration
              </h3>
            </div>
            <p className="text-xs text-[#86868b] mt-1">
              Active Provider: <strong className="text-[#1d1d1f]">{llmConfig.llm_provider}</strong> | Model:{" "}
              <strong className="text-[#0071e3] font-mono">{llmConfig.llm_model}</strong> | Key Status:{" "}
              <span
                className={
                  llmConfig.groq_configured
                    ? "text-[#1d7334] font-bold font-mono"
                    : "text-[#b25e00] font-bold font-mono"
                }
              >
                {llmConfig.masked_groq_key}
              </span>
            </p>
          </div>
        </div>
        <form onSubmit={handleSaveLlmConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1d1d1f] mb-1.5">
              Groq Model
            </label>
            <select
              value={llmModelInput}
              onChange={(e: any) => setLlmModelInput(e.target.value)}
              className="w-full border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-mono focus:outline-none focus:border-[#0071e3] focus:bg-white"
            >
              <option value="llama-3.3-70b-versatile">
                llama-3.3-70b-versatile (Recommended)
              </option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
              <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[#1d1d1f] mb-1.5">
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
              className="w-full border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-mono placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="apple-btn-primary w-full"
            >
              Save Groq AI Settings
            </button>
          </div>
        </form>
        {llmMsg ? (
          <div className="p-3 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] text-xs text-[#1d7334] font-mono font-medium">
            {llmMsg}
          </div>
        ) : null}
      </div>

      {/* RBAC & Database Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-2">
        <div className="apple-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-[#0071e3]" />
              <span>Authentication &amp; Role-Based Access Control (RBAC)</span>
            </h3>
            <p className="text-xs text-[#86868b] mt-1">
              Configure active evaluator identity and role permissions (Admin, Analyst, Viewer) for audit logging.
            </p>
          </div>
          <form onSubmit={handleSaveRole} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                  Evaluator Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onInput={(e: any) => setUserName(e.target.value)}
                  className="w-full border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                  Access Role
                </label>
                <select
                  value={userRole}
                  onChange={(e: any) => setUserRole(e.target.value)}
                  className="w-full border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-semibold focus:outline-none focus:border-[#0071e3] focus:bg-white"
                >
                  <option value="Admin">Admin (Full Write, Override &amp; Config)</option>
                  <option value="Analyst">Analyst (Upload, Analyze &amp; Override)</option>
                  <option value="Viewer">Viewer (Read-Only Diagnostic Access)</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="apple-btn-primary"
            >
              Update Active Evaluator Context
            </button>
          </form>
        </div>

        <div className="apple-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[#0071e3]" />
              <span>Database Reliability &amp; Immutable Provenance</span>
            </h3>
            <p className="text-xs text-[#86868b] mt-1 leading-relaxed">
              Uploaded documents are treated as untrusted data and scanned for prompt injection before indexing. Create an instant database backup below.
            </p>
          </div>
          <div className="space-y-2.5">
            <button
              onClick={handleBackup}
              className="apple-btn-secondary"
            >
              Create Timestamped Database Backup Snapshot
            </button>
            {backupMsg ? (
              <div className="p-3 rounded-xl bg-[#eaf8ee] border border-[#a3e4b7] text-xs text-[#1d7334] font-mono">
                {backupMsg}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 10 Dedicated AI System Prompts Registry */}
      <div className="apple-card p-6 space-y-4 stagger-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">
              10 Modular AI System Prompts &amp; Evidence Guardrails
            </h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              Inspect the separate system prompts enforcing strict evidence citation and Pydantic JSON validation
            </p>
          </div>
          <select
            value={selectedPromptKey}
            onChange={(e: any) => setSelectedPromptKey(e.target.value)}
            className="text-xs border border-black/10 rounded-full px-4 py-2 bg-[#f5f5f7] font-bold text-[#0071e3] focus:outline-none focus:border-[#0071e3]"
          >
            {Object.keys(prompts).map((k) => (
              <option key={k} value={k}>
                Prompt: {k.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <pre className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/8 text-[#1d1d1f] text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72 font-mono">
          {prompts[selectedPromptKey] || "Loading prompt specification..."}
        </pre>
      </div>

      {/* Immutable Audit Trail */}
      <div className="apple-card overflow-hidden stagger-4">
        <div className="p-5 border-b border-black/8">
          <h3 className="text-sm font-bold text-[#1d1d1f]">
            Immutable Audit Trail &amp; Manual Override History ({auditLogs.length})
          </h3>
          <p className="text-xs text-[#86868b] mt-0.5">
            Tracks all weight calibrations, manual classification overrides, document uploads, and score recalculations
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#86868b] border-b border-black/8">
                <th className="p-3.5 font-bold">Timestamp</th>
                <th className="p-3.5 font-bold">Actor &amp; Role</th>
                <th className="p-3.5 font-bold">Action</th>
                <th className="p-3.5 font-bold">Entity</th>
                <th className="p-3.5 font-bold">Justification / State Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[#86868b]">
                    No manual overrides or configuration changes logged for this period yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-black/[0.02] transition">
                    <td className="p-3.5 text-[#86868b] font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-semibold text-[#1d1d1f]">
                      {log.actor}{" "}
                      <span className="px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#515154] text-[10px] border border-black/10">
                        {log.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff] font-mono font-bold">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#515154] font-mono whitespace-nowrap">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="p-3.5 text-[#515154]">
                      {log.justification ? (
                        <div className="font-semibold text-[#1d1d1f]">
                          Justification: &ldquo;{log.justification}&rdquo;
                        </div>
                      ) : null}
                      <div className="text-[11px] text-[#86868b] font-mono truncate max-w-md">
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
