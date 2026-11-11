import { api, getAuthContext } from "./api";
import { ComparisonView } from "./components/ComparisonView";
import { ConflictsView } from "./components/ConflictsView";
import { DashboardView } from "./components/DashboardView";
import { DocumentsView } from "./components/DocumentsView";
import { MatrixView } from "./components/MatrixView";
import { RecommendationsView } from "./components/RecommendationsView";
import { ReportView } from "./components/ReportView";
import { SettingsView } from "./components/SettingsView";
import { StakeholdersView } from "./components/StakeholdersView";
import { StructureView } from "./components/StructureView";
import { h, mountApp, useEffect, useState } from "./lib/react-lite";
import {
  AssessmentFullSummary,
  AssessmentPeriod,
  Company,
  DocumentItem,
  EvidenceRecord,
  RecommendationItem,
  StakeholderConflict,
  StakeholderProfile,
} from "./types";

const NAV_ITEMS = [
  { id: "dashboard", label: "1. Dashboard Overview", step: "Overview" },
  { id: "documents", label: "2. Document Knowledge Base", step: "Ingest & RAG" },
  { id: "stakeholders", label: "3. Stakeholder Profiles", step: "Stakeholders" },
  { id: "structure", label: "4. Org Structure (7 Dims)", step: "Structure" },
  { id: "matrix", label: "5. Alignment Matrix", step: "Evaluate" },
  { id: "conflicts", label: "6. Conflict Analysis", step: "Conflicts" },
  { id: "recommendations", label: "7. Recommendations", step: "Actions" },
  { id: "evidence", label: "8. Evidence Repository", step: "Citations" },
  { id: "comparison", label: "9. Historical Comparison", step: "Trends" },
  { id: "report", label: "10. Diagnostic Report", step: "Export" },
  { id: "settings", label: "11. Settings & Audit Trail", step: "Governance" },
];

function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allPeriods, setAllPeriods] = useState<AssessmentPeriod[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(1);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number>(2); // Default to Meta FY2025

  const [summary, setSummary] = useState<AssessmentFullSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderProfile[]>([]);
  const [structureData, setStructureData] = useState<any | null>(null);
  const [matrixData, setMatrixData] = useState<any | null>(null);
  const [conflicts, setConflicts] = useState<StakeholderConflict[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState<boolean>(false);
  const [newPeriodTitle, setNewPeriodTitle] = useState<string>("FY2026 Assessment");
  const [newPeriodFy, setNewPeriodFy] = useState<string>("FY2026");

  const [showNewCompanyModal, setShowNewCompanyModal] = useState<boolean>(false);
  const [newCompName, setNewCompName] = useState<string>("");
  const [newCompTicker, setNewCompTicker] = useState<string>("");
  const [newCompIndustry, setNewCompIndustry] = useState<string>(
    "Social Media & Digital Platforms"
  );
  const [newCompPriorities, setNewCompPriorities] = useState<string>(
    "User privacy, Content safety, AI governance, Regulatory compliance"
  );
  const [, setAuthTick] = useState<number>(0);

  const loadInitialLists = async () => {
    const [comps, periods] = await Promise.all([
      api.getCompanies(),
      api.getAssessments(),
    ]);
    setCompanies(comps);
    setAllPeriods(periods);
  };

  const loadPeriodData = async (periodId: number) => {
    if (!periodId) return;
    const [sum, docs, shs, struct, mat, confs, recs, evs] = await Promise.all([
      api.getAssessmentSummary(periodId),
      api.getDocuments(periodId),
      api.getStakeholders(periodId),
      api.getStructureAnalysis(periodId),
      api.getAlignmentMatrix(periodId),
      api.getConflicts(periodId),
      api.getRecommendations(periodId),
      api.getEvidence(periodId),
    ]);
    setSummary(sum);
    setDocuments(docs);
    setStakeholders(shs);
    setStructureData(struct);
    setMatrixData(mat);
    setConflicts(confs);
    setRecommendations(recs);
    setEvidenceList(evs);
  };

  useEffect(() => {
    loadInitialLists();
  }, []);

  useEffect(() => {
    loadPeriodData(selectedPeriodId);
  }, [selectedPeriodId]);

  const handleSelectCompany = (compId: number) => {
    setSelectedCompanyId(compId);
    const compPeriods = allPeriods.filter((p) => p.company_id === compId);
    if (compPeriods.length > 0) {
      setSelectedPeriodId(compPeriods[compPeriods.length - 1].id);
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await api.runAnalysis(selectedPeriodId);
      await loadInitialLists();
      await loadPeriodData(selectedPeriodId);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreatePeriod = async (ev: Event) => {
    ev.preventDefault();
    if (!newPeriodTitle.trim()) return;
    const created = await api.createAssessment({
      company_id: selectedCompanyId,
      title: newPeriodTitle.trim(),
      fiscal_year: newPeriodFy.trim() || "FY2026",
    });
    setShowNewPeriodModal(false);
    await loadInitialLists();
    setSelectedPeriodId(created.id);
  };

  const handleCreateCompany = async (ev: Event) => {
    ev.preventDefault();
    if (!newCompName.trim()) return;
    const comp = await api.createCompany({
      name: newCompName.trim(),
      ticker: newCompTicker.trim() || null,
      industry: newCompIndustry.trim(),
      analysis_priorities: newCompPriorities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    const period = await api.createAssessment({
      company_id: comp.id,
      title: "FY2025 Baseline Assessment",
      fiscal_year: "FY2025",
    });
    setShowNewCompanyModal(false);
    setNewCompName("");
    setNewCompTicker("");
    await loadInitialLists();
    setSelectedCompanyId(comp.id);
    setSelectedPeriodId(period.id);
  };

  const companyPeriods = allPeriods.filter(
    (p) => p.company_id === selectedCompanyId
  );
  const currentPeriod = allPeriods.find((p) => p.id === selectedPeriodId);
  const auth = getAuthContext();

  return (
    <div className="min-h-screen flex bg-[#060913] text-slate-100 relative overflow-x-hidden">
      {/* Background ambient accents */}
      <div className="fixed top-0 right-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Left Enterprise Sidebar */}
      <aside className="w-64 bg-[#090d1a]/95 text-slate-200 flex flex-col justify-between shrink-0 border-r border-slate-800/80 backdrop-blur-xl relative z-20">
        <div>
          <div className="p-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-violet-500/30">
                SA
              </div>
              <div>
                <div className="text-xs font-extrabold text-white tracking-wider uppercase">
                  Alignment Analyzer
                </div>
                <div className="text-[10px] text-violet-400 font-mono">
                  Enterprise AI Diagnostic
                </div>
              </div>
            </div>
          </div>

          {/* Company & Period Selector in Sidebar */}
          <div className="p-4 border-b border-slate-800/80 space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>1. Target Company</span>
                <button
                  onClick={() => setShowNewCompanyModal(true)}
                  className="text-violet-400 hover:text-violet-300 font-semibold"
                >
                  + Add
                </button>
              </div>
              <select
                value={String(selectedCompanyId)}
                onChange={(e: any) =>
                  handleSelectCompany(parseInt(e.target.value, 10))
                }
                className="w-full rounded-lg bg-slate-900 border border-slate-700/80 p-2 text-white font-semibold focus:outline-none focus:border-violet-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} {c.ticker ? `(${c.ticker})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>2. Assessment Period</span>
                <button
                  onClick={() => setShowNewPeriodModal(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  + New Period
                </button>
              </div>
              <select
                value={String(selectedPeriodId)}
                onChange={(e: any) =>
                  setSelectedPeriodId(parseInt(e.target.value, 10))
                }
                className="w-full rounded-lg bg-slate-900 border border-slate-700/80 p-2 text-white font-semibold focus:outline-none focus:border-cyan-500"
              >
                {companyPeriods.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      active
                        ? "bg-violet-950/70 text-violet-200"
                        : "bg-slate-900 text-slate-500"
                    }`}
                  >
                    {item.step}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Evaluator Context */}
        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 bg-slate-950/40">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {auth.name}
          </div>
          <div>
            Role:{" "}
            <span className="px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 font-bold border border-violet-800/50">
              {auth.role}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Multi-Step Workflow Progress Bar */}
        <header className="bg-slate-950/80 border-b border-slate-800/80 px-6 py-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {NAV_ITEMS.map((item, idx) => {
                const isCurrent = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all duration-200 ${
                      isCurrent
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30 ring-1 ring-violet-400"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {idx + 1}. {item.step}
                  </button>
                );
              })}
            </div>

            {currentPeriod && currentPeriod.title.includes("Sample") ? (
              <span className="px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                Representative Sample Dataset (Upload filings anytime)
              </span>
            ) : null}
          </div>
        </header>

        {/* Main View Container */}
        <main className="p-6 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" ? (
            <DashboardView
              summary={summary}
              stakeholders={stakeholders}
              onNavigate={setActiveTab}
              onRunAnalysis={handleRunAnalysis}
              isAnalyzing={isAnalyzing}
            />
          ) : null}

          {activeTab === "documents" ? (
            <DocumentsView
              companyId={selectedCompanyId}
              assessmentPeriodId={selectedPeriodId}
              fiscalYear={currentPeriod?.fiscal_year || "FY2025"}
              documents={documents}
              onRefresh={() => loadPeriodData(selectedPeriodId)}
              onRunAnalysis={handleRunAnalysis}
            />
          ) : null}

          {activeTab === "stakeholders" ? (
            <StakeholdersView
              stakeholders={stakeholders}
              onRefresh={async () => {
                await loadInitialLists();
                await loadPeriodData(selectedPeriodId);
              }}
            />
          ) : null}

          {activeTab === "structure" ? (
            <StructureView structureData={structureData} />
          ) : null}

          {activeTab === "matrix" ? (
            <MatrixView
              matrixData={matrixData}
              onRefresh={async () => {
                await loadInitialLists();
                await loadPeriodData(selectedPeriodId);
              }}
            />
          ) : null}

          {activeTab === "conflicts" ? (
            <ConflictsView
              conflicts={conflicts}
              evidenceList={evidenceList}
            />
          ) : null}

          {activeTab === "recommendations" ? (
            <RecommendationsView
              recommendations={recommendations}
              evidenceList={evidenceList}
              onRefresh={() => loadPeriodData(selectedPeriodId)}
            />
          ) : null}

          {activeTab === "evidence" ? (
            <ReportView
              assessmentPeriodId={selectedPeriodId}
              evidenceList={evidenceList}
              mode="evidence"
            />
          ) : null}

          {activeTab === "comparison" ? (
            <ComparisonView
              companies={companies}
              allPeriods={allPeriods}
              currentPeriodId={selectedPeriodId}
            />
          ) : null}

          {activeTab === "report" ? (
            <ReportView
              assessmentPeriodId={selectedPeriodId}
              evidenceList={evidenceList}
              mode="report"
            />
          ) : null}

          {activeTab === "settings" ? (
            <SettingsView
              assessmentPeriodId={selectedPeriodId}
              onAuthChange={() => setAuthTick((t) => t + 1)}
            />
          ) : null}
        </main>
      </div>

      {/* Modal: Create New Assessment Period */}
      {showNewPeriodModal ? (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreatePeriod}
            className="glass-card bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-white border border-slate-700"
          >
            <h3 className="text-base font-extrabold text-white">
              Create New Periodic Assessment
            </h3>
            <p className="text-slate-400">
              Initializes an isolated document collection, 10 stakeholder groups, and 7 organizational structure dimensions.
            </p>
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Assessment Title
              </label>
              <input
                type="text"
                value={newPeriodTitle}
                onInput={(e: any) => setNewPeriodTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Financial Year
              </label>
              <input
                type="text"
                value={newPeriodFy}
                onInput={(e: any) => setNewPeriodFy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-md shadow-violet-600/30"
              >
                Create Assessment Period
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal: Create New Company */}
      {showNewCompanyModal ? (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateCompany}
            className="glass-card bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-white border border-slate-700"
          >
            <h3 className="text-base font-extrabold text-white">
              Add New Company to Diagnostic Platform
            </h3>
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={newCompName}
                onInput={(e: any) => setNewCompName(e.target.value)}
                placeholder="e.g., Alphabet Inc."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  value={newCompTicker}
                  onInput={(e: any) => setNewCompTicker(e.target.value)}
                  placeholder="GOOGL"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={newCompIndustry}
                  onInput={(e: any) => setNewCompIndustry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Company-Specific Analysis Priorities (Comma-separated)
              </label>
              <textarea
                rows={2}
                value={newCompPriorities}
                onInput={(e: any) => setNewCompPriorities(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
              ></textarea>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewCompanyModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-md shadow-violet-600/30"
              >
                Create Company
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

const rootEl = document.getElementById("app");
if (rootEl) {
  mountApp(App, rootEl);
}
