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
import { Fragment, h, mountApp, useEffect, useState } from "./lib/react-lite";
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

interface NavItem {
  id: string;
  stepNumber: string;
  label: string;
  shortLabel: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "DIAGNOSTIC WORKFLOW",
    items: [
      { id: "dashboard", stepNumber: "01", label: "Executive Dashboard", shortLabel: "Cockpit", icon: "📊" },
      { id: "documents", stepNumber: "02", label: "Research Library", shortLabel: "Filings", icon: "📁" },
      { id: "stakeholders", stepNumber: "03", label: "Stakeholder Profiles", shortLabel: "Profiles", icon: "👥" },
      { id: "structure", stepNumber: "04", label: "Org Structure (7 Dims)", shortLabel: "Structure", icon: "🏛️" },
      { id: "matrix", stepNumber: "05", label: "Alignment Matrix", shortLabel: "Matrix", icon: "🎯" },
    ],
  },
  {
    title: "DEEP ANALYSIS",
    items: [
      { id: "conflicts", stepNumber: "06", label: "Conflict Matrix", shortLabel: "Conflicts", icon: "⚡" },
      { id: "recommendations", stepNumber: "07", label: "Recommendations", shortLabel: "Actions", icon: "💡" },
      { id: "evidence", stepNumber: "08", label: "Evidence Repository", shortLabel: "Citations", icon: "🔍" },
    ],
  },
  {
    title: "GOVERNANCE & REPORTS",
    items: [
      { id: "comparison", stepNumber: "09", label: "Historical Trends", shortLabel: "Trends", icon: "📈" },
      { id: "report", stepNumber: "10", label: "Diagnostic Report", shortLabel: "Report", icon: "📄" },
      { id: "settings", stepNumber: "11", label: "Audit & Settings", shortLabel: "Audit", icon: "⚙️" },
    ],
  },
];

function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allPeriods, setAllPeriods] = useState<AssessmentPeriod[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(1);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number>(0);

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
    try {
      const [comps, periods] = await Promise.all([
        api.getCompanies(),
        api.getAssessments(),
      ]);
      setCompanies(comps);
      setAllPeriods(periods);
      const metaPeriods = periods.filter((p) => p.company_id === 1);
      if (metaPeriods.length > 0) {
        const comprehensive = metaPeriods.find((p) => p.title.includes("Official SEC Filings") || p.id === 15);
        if (comprehensive) {
          setSelectedPeriodId(comprehensive.id);
        } else {
          setSelectedPeriodId(metaPeriods[metaPeriods.length - 1].id);
        }
      } else if (periods.length > 0) {
        setSelectedPeriodId(periods[0].id);
      }
    } catch (err) {
      console.error("Failed to load initial lists:", err);
    }
  };

  const loadPeriodData = async (periodId: number) => {
    if (!periodId) return;
    try {
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
    } catch (err) {
      console.error("Failed to load period data:", err);
    }
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
  const currentCompany = companies.find((c) => c.id === selectedCompanyId);
  const currentPeriod = allPeriods.find((p) => p.id === selectedPeriodId);
  const auth = getAuthContext();

  return (
    <div className="min-h-screen flex bg-[#0a0e1a] text-slate-100 relative overflow-x-hidden">
      {/* Background ambient accents */}
      <div className="fixed top-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Left Enterprise Sidebar */}
      <aside className="w-64 bg-[#080f1e] text-slate-200 flex flex-col justify-between shrink-0 border-r border-white/10 backdrop-blur-2xl relative z-20 overflow-y-auto shadow-2xl">
        <div>
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-emerald-500/30">
                SA
              </div>
              <div>
                <div className="text-xs font-black text-white tracking-wider uppercase">
                  Alignment Analyzer
                </div>
                <div className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1.5 mt-0.5">
                  <span>Enterprise Intelligence</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/40">v2.2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Company & Period Selector in Sidebar */}
          <div className="p-4 border-b border-white/10 space-y-3 text-xs bg-[#0b1528]/80">
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                <span>1. Target Company</span>
                <button
                  onClick={() => setShowNewCompanyModal(true)}
                  className="text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  + Add
                </button>
              </div>
              <select
                value={String(selectedCompanyId)}
                onChange={(e: any) =>
                  handleSelectCompany(parseInt(e.target.value, 10))
                }
                className="w-full rounded-xl bg-[#060b14] border border-white/15 p-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} {c.ticker ? `(${c.ticker})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                <span>2. Assessment Period</span>
                <button
                  onClick={() => setShowNewPeriodModal(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  + New
                </button>
              </div>
              <select
                value={String(selectedPeriodId)}
                onChange={(e: any) =>
                  setSelectedPeriodId(parseInt(e.target.value, 10))
                }
                className="w-full rounded-xl bg-[#060b14] border border-white/15 p-2 text-white font-semibold focus:outline-none focus:border-cyan-500"
              >
                {companyPeriods.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categorized Navigation Menu */}
          <nav className="p-3 space-y-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 card-hover ${
                        active
                          ? "bg-gradient-to-r from-emerald-600/30 via-teal-600/20 to-transparent border-l-2 border-emerald-400 text-white font-bold shadow-md shadow-emerald-500/10"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ml-1.5 ${
                          active
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                            : "bg-[#060b14] text-slate-400"
                        }`}
                      >
                        {item.stepNumber}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Evaluator Context */}
        <div className="p-4 border-t border-white/10 text-[11px] text-slate-300 space-y-1 bg-[#060b14]/70">
          <div className="font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {auth.name}
          </div>
          <div>
            Role:{" "}
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-600/40">
              {auth.role}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Sleek Enterprise Top Application Bar (EcoVault Inspired) */}
        <header className="bg-[#080f1e]/85 border-b border-white/10 px-6 py-3.5 backdrop-blur-2xl sticky top-0 z-30 shadow-lg shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Breadcrumb Path & Live Indicator */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/70 border border-emerald-500/50 rounded-full text-emerald-300 font-bold shadow-sm shadow-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="font-mono text-[11px]">896 Chunks Verified</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-white font-extrabold tracking-tight">{currentCompany ? currentCompany.name : "Company"}</span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-300 font-mono font-semibold bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-0.5 rounded-md">
                {currentPeriod ? currentPeriod.fiscal_year : "FY2025"}
              </span>
            </div>

            {/* Quick Company Switcher Tabs */}
            <div className="flex items-center gap-1.5 bg-[#060b14]/90 p-1.5 rounded-xl border border-white/10 shadow-inner">
              {companies.map((c) => {
                const isSel = c.id === selectedCompanyId;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCompany(c.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                      isSel
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{c.ticker || c.name.slice(0, 4)}</span>
                    <span className={`text-[10px] font-normal ${isSel ? "text-emerald-100" : "text-slate-400"}`}>
                      {c.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Actions: Run Analysis + Export Report */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="btn-shimmer px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all card-hover"
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing 6-Stage AI...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Run Full AI Diagnostic</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveTab("report")}
                className="px-4 py-2.5 rounded-xl bg-[#0b1528] hover:bg-[#101d36] border border-white/10 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition card-hover"
              >
                <span>📄</span>
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main View Container */}
        <main className="p-6 flex-1 overflow-y-auto max-w-7xl w-full mx-auto animate-fade-in">
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
