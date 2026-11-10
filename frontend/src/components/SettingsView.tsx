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

  useEffect(() => {
    api.getAuditLogs(assessmentPeriodId).then(setAuditLogs).catch(() => {});
    api.getPrompts().then(setPrompts).catch(() => {});
  }, [assessmentPeriodId]);

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
    <div className="space-y-6">
      {/* RBAC & Database Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Authentication & Role-Based Access Control (RBAC)
            </h3>
            <p className="text-xs text-slate-500">
              Configure active evaluator identity and role permissions (Admin, Analyst, Viewer) for audit logging.
            </p>
          </div>
          <form onSubmit={handleSaveRole} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Evaluator Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onInput={(e: any) => setUserName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Access Role
                </label>
                <select
                  value={userRole}
                  onChange={(e: any) => setUserRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white font-semibold"
                >
                  <option value="Admin">Admin (Full Write, Override & Config)</option>
                  <option value="Analyst">Analyst (Upload, Analyze & Override)</option>
                  <option value="Viewer">Viewer (Read-Only Diagnostic Access)</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500"
            >
              Update Active Evaluator Context
            </button>
          </form>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Database Reliability, Backups & Security Guardrails
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Uploaded documents are treated as untrusted data and scanned for prompt injection before indexing. Create an instant database backup below.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={handleBackup}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              Create Timestamped Database Backup Snapshot
            </button>
            {backupMsg ? (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                {backupMsg}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 10 Dedicated AI System Prompts Registry (Section 17) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              10 Modular AI System Prompts & Evidence Guardrails (Section 17)
            </h3>
            <p className="text-xs text-slate-500">
              Inspect the separate system prompts enforcing strict evidence citation and Pydantic JSON validation
            </p>
          </div>
          <select
            value={selectedPromptKey}
            onChange={(e: any) => setSelectedPromptKey(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-white font-bold text-indigo-700"
          >
            {Object.keys(prompts).map((k) => (
              <option key={k} value={k}>
                Prompt: {k.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72">
          {prompts[selectedPromptKey] || "Loading prompt specification..."}
        </pre>
      </div>

      {/* Immutable Audit Trail (Section 8 & Section 18) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Immutable Audit Trail & Manual Override History ({auditLogs.length})
          </h3>
          <p className="text-xs text-slate-500">
            Tracks all weight calibrations, manual classification overrides, document uploads, and score recalculations
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3 font-bold">Timestamp</th>
                <th className="p-3 font-bold">Actor & Role</th>
                <th className="p-3 font-bold">Action</th>
                <th className="p-3 font-bold">Entity</th>
                <th className="p-3 font-bold">Justification / State Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    No manual overrides or configuration changes logged for this period yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {log.actor}{" "}
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                        {log.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="p-3 text-slate-700">
                      {log.justification ? (
                        <div className="font-semibold text-slate-900">
                          Justification: "{log.justification}"
                        </div>
                      ) : null}
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-md">
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

