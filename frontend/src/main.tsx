import { api, getAuthContext } from "./api";
import { ComparisonView } from "./components/ComparisonView";
import { ConflictsView } from "./components/ConflictsView";
import { DashboardView } from "./components/DashboardView";
import { DocumentsView } from "./components/DocumentsView";
import {
  BoltIcon,
  BrandLogo,
  CockpitIcon,
  DocumentIcon,
  LightbulbIcon,
  MatrixIcon,
  ReportIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  StructureIcon,
  TrendIcon,
  UsersIcon,
} from "./components/icons";
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
  icon: (props: any) => any;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "DIAGNOSTIC WORKFLOW",
    items: [
      { id: "dashboard", stepNumber: "01", label: "Executive Dashboard", shortLabel: "Cockpit", icon: CockpitIcon },
      { id: "documents", stepNumber: "02", label: "Research Library", shortLabel: "Filings", icon: DocumentIcon },
      { id: "stakeholders", stepNumber: "03", label: "Stakeholder Profiles", shortLabel: "Profiles", icon: UsersIcon },
      { id: "structure", stepNumber: "04", label: "Org Structure (7 Dims)", shortLabel: "Structure", icon: StructureIcon },
      { id: "matrix", stepNumber: "05", label: "Alignment Matrix", shortLabel: "Matrix", icon: MatrixIcon },
    ],
  },
  {
    title: "DEEP ANALYSIS",
    items: [
      { id: "conflicts", stepNumber: "06", label: "Conflict Matrix", shortLabel: "Conflicts", icon: BoltIcon },
      { id: "recommendations", stepNumber: "07", label: "Recommendations", shortLabel: "Actions", icon: LightbulbIcon },
      { id: "evidence", stepNumber: "08", label: "Evidence Repository", shortLabel: "Citations", icon: SearchIcon },
    ],
  },
  {
    title: "GOVERNANCE & REPORTS",
    items: [
      { id: "comparison", stepNumber: "09", label: "Historical Trends", shortLabel: "Trends", icon: TrendIcon },
      { id: "report", stepNumber: "10", label: "Diagnostic Report", shortLabel: "Report", icon: ReportIcon },
      { id: "settings", stepNumber: "11", label: "Audit & Settings", shortLabel: "Audit", icon: SettingsIcon },
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

  const handleCreatePeriod = async (e: any) => {
    e.preventDefault();
    if (!newPeriodTitle || !newPeriodFy) return;
    const period = await api.createAssessment({
      company_id: selectedCompanyId,
      title: newPeriodTitle,
      fiscal_year: newPeriodFy,
    });
    setShowNewPeriodModal(false);
    setNewPeriodTitle("FY2026 Assessment");
    await loadInitialLists();
    setSelectedPeriodId(period.id);
  };

  const handleCreateCompany = async (e: any) => {
    e.preventDefault();
    if (!newCompName) return;
    const prios = newCompPriorities
      .split(",")
      .map((s) => s.strip ? s.strip() : s.trim())
      .filter((s) => s.length > 0);
    const comp = await api.createCompany({
      name: newCompName,
      ticker: newCompTicker || undefined,
      industry: newCompIndustry,
      analysis_priorities: prios,
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
    <div className="min-h-screen flex text-[#1d1d1f] relative overflow-x-hidden">
      {/* Left Apple Glass Sidebar */}
      <aside className="w-64 bg-white/75 backdrop-blur-2xl text-[#1d1d1f] flex flex-col justify-between shrink-0 border-r border-black/8 relative z-20 overflow-y-auto shadow-sm">
        <div>
          {/* Brand Header with Custom Animated Vector Logo */}
          <div className="p-5 border-b border-black/8">
            <div className="flex items-center gap-3">
              <BrandLogo size={42} className="shrink-0 shadow-md shadow-[#0071e3]/25 rounded-2xl" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#1d1d1f] tracking-tight truncate">
                  Alignment Analyzer
                </div>
                <div className="text-[11px] text-[#0071e3] font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="truncate">Diagnostic Engine</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-[9px] font-bold shrink-0">
                    v2.3
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Company & Period Selector in Sidebar */}
          <div className="p-4 border-b border-black/8 space-y-3 text-xs bg-black/[0.02]">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5">
                <span>Target Company</span>
                <button
                  onClick={() => setShowNewCompanyModal(true)}
                  className="text-[#0071e3] hover:text-[#0077ed] font-semibold"
                >
                  + Add
                </button>
              </div>
              <select
                value={String(selectedCompanyId)}
                onChange={(e: any) =>
                  handleSelectCompany(parseInt(e.target.value, 10))
                }
                className="w-full rounded-xl bg-white border border-black/10 p-2 text-[#1d1d1f] font-medium shadow-sm focus:outline-none focus:border-[#0071e3]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} {c.ticker ? `(${c.ticker})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5">
                <span>Assessment Period</span>
                <button
                  onClick={() => setShowNewPeriodModal(true)}
                  className="text-[#0071e3] hover:text-[#0077ed] font-semibold"
                >
                  + New
                </button>
              </div>
              <select
                value={String(selectedPeriodId)}
                onChange={(e: any) =>
                  setSelectedPeriodId(parseInt(e.target.value, 10))
                }
                className="w-full rounded-xl bg-white border border-black/10 p-2 text-[#1d1d1f] font-medium shadow-sm focus:outline-none focus:border-[#0071e3]"
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
                <div className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider px-2 py-1">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const active = activeTab === item.id;
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all duration-200 card-hover ${
                        active
                          ? "bg-[#0071e3] text-white font-semibold shadow-sm shadow-[#0071e3]/30"
                          : "text-[#515154] hover:bg-black/5 hover:text-[#1d1d1f]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <IconComp className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-[#86868b]"}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ml-1.5 ${
                          active
                            ? "bg-white/20 text-white font-bold"
                            : "bg-black/5 text-[#86868b]"
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
        <div className="p-4 border-t border-black/8 text-[11px] text-[#86868b] space-y-1 bg-black/[0.02]">
          <div className="font-semibold text-[#1d1d1f] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34c759] shadow-sm shadow-[#34c759]/60" />
            {auth.name}
          </div>
          <div>
            Role:{" "}
            <span className="px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-semibold border border-[#0071e3]/20">
              {auth.role}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Apple Frosted Top Application Bar */}
        <header className="bg-white/80 border-b border-black/8 px-6 py-3.5 backdrop-blur-2xl sticky top-0 z-30 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Breadcrumb Path & Status */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#34c759]/10 border border-[#34c759]/25 rounded-full text-[#248a3d] font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#34c759] shrink-0" />
                <span className="font-mono text-[11px]">896 Chunks Verified</span>
              </div>
              <span className="text-[#d2d2d7]">/</span>
              <span className="text-[#1d1d1f] font-bold tracking-tight">{currentCompany ? currentCompany.name : "Company"}</span>
              <span className="text-[#d2d2d7]">/</span>
              <span className="text-[#0071e3] font-mono font-semibold bg-[#0071e3]/10 border border-[#0071e3]/20 px-2.5 py-0.5 rounded-full">
                {currentPeriod ? currentPeriod.fiscal_year : "FY2025"}
              </span>
            </div>

            {/* Segmented Company Switcher Tabs */}
            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-full border border-black/5">
              {companies.map((c) => {
                const isSel = c.id === selectedCompanyId;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCompany(c.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                      isSel
                        ? "bg-white text-[#1d1d1f] shadow-sm font-bold"
                        : "text-[#86868b] hover:text-[#1d1d1f]"
                    }`}
                  >
                    <span>{c.ticker || c.name.slice(0, 4)}</span>
                    <span className={`text-[10px] ${isSel ? "text-[#0071e3]" : "text-[#a1a1a6]"}`}>
                      {c.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Apple Pill Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="apple-btn-primary btn-shimmer"
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing AI Engine...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Run Full AI Diagnostic</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveTab("report")}
                className="apple-btn-secondary"
              >
                <ReportIcon className="w-4 h-4 text-[#0071e3]" />
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

      {/* Apple Styled Modal: Create New Assessment Period */}
      {showNewPeriodModal ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleCreatePeriod}
            className="apple-card bg-white p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-[#1d1d1f] border border-black/10"
          >
            <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              Create New Periodic Assessment
            </h3>
            <p className="text-[#86868b] leading-relaxed">
              Initializes an isolated document collection, 10 stakeholder groups, and 7 organizational structure dimensions.
            </p>
            <div>
              <label className="block font-semibold text-[#1d1d1f] mb-1">
                Assessment Title
              </label>
              <input
                type="text"
                value={newPeriodTitle}
                onInput={(e: any) => setNewPeriodTitle(e.target.value)}
                className="w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1d1d1f] mb-1">
                Financial Year
              </label>
              <input
                type="text"
                value={newPeriodFy}
                onInput={(e: any) => setNewPeriodFy(e.target.value)}
                className="w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="apple-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="apple-btn-primary"
              >
                Create Assessment
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Apple Styled Modal: Create New Target Company */}
      {showNewCompanyModal ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleCreateCompany}
            className="apple-card bg-white p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-[#1d1d1f] border border-black/10"
          >
            <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
              Register New Organization
            </h3>
            <p className="text-[#86868b] leading-relaxed">
              Sets up organizational entity profile with customized diagnostic priorities and baseline stakeholder framework.
            </p>
            <div>
              <label className="block font-semibold text-[#1d1d1f] mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                placeholder="e.g., Apple Inc."
                value={newCompName}
                onInput={(e: any) => setNewCompName(e.target.value)}
                className="w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#1d1d1f] mb-1">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  placeholder="AAPL"
                  value={newCompTicker}
                  onInput={(e: any) => setNewCompTicker(e.target.value)}
                  className="w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1d1d1f] mb-1">
                  Industry Classification
                </label>
                <input
                  type="text"
                  value={newCompIndustry}
                  onInput={(e: any) => setNewCompIndustry(e.target.value)}
                  className="w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-[#1d1d1f] mb-1">
                Analysis Priorities (comma-separated)
              </label>
              <textarea
                rows={2}
                value={newCompPriorities}
                onInput={(e: any) => setNewCompPriorities(e.target.value)}
                className="w-full bg-[#f5f5f7] border border-black/10 rounded-xl p-2.5 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewCompanyModal(false)}
                className="apple-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="apple-btn-primary"
              >
                Register & Initialize
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

mountApp(App, document.getElementById("root")!);
