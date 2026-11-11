/**
 * Typed REST API Client for Stakeholder–Structure Alignment Analyzer
 */

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

let currentUserName = "Lead Organizational Analyst";
let currentUserRole = "Admin";

export function setAuthContext(name: string, role: string) {
  currentUserName = name;
  currentUserRole = role;
}

export function getAuthContext() {
  return { name: currentUserName, role: currentUserRole };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "X-User-Name": currentUserName,
    "X-User-Role": currentUserRole,
    ...(options.headers as Record<string, string> || {}),
  };
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errBody.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getCompanies: () => request<Company[]>("/api/companies"),
  createCompany: (data: Partial<Company>) =>
    request<Company>("/api/companies", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCompany: (id: number, data: Partial<Company>) =>
    request<Company>(`/api/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getAssessments: (companyId?: number) =>
    request<AssessmentPeriod[]>(
      companyId ? `/api/assessments?company_id=${companyId}` : "/api/assessments"
    ),
  createAssessment: (data: {
    company_id: number;
    title: string;
    fiscal_year: string;
    start_date?: string;
    end_date?: string;
  }) =>
    request<AssessmentPeriod>("/api/assessments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAssessmentSummary: (id: number) =>
    request<AssessmentFullSummary>(`/api/assessments/${id}`),
  runAnalysis: (id: number) =>
    request<any>(`/api/assessments/${id}/run-analysis`, { method: "POST" }),
  recalculateScores: (id: number) =>
    request<any>(`/api/assessments/${id}/recalculate-scores`, {
      method: "POST",
    }),
  compareAssessments: (baseId: number, targetId: number) =>
    request<any>(`/api/assessments/compare?base_id=${baseId}&target_id=${targetId}`),

  getDocuments: (assessmentPeriodId: number) =>
    request<DocumentItem[]>(
      `/api/documents?assessment_period_id=${assessmentPeriodId}`
    ),
  uploadDocumentsForm: (formData: FormData) =>
    request<DocumentItem[]>("/api/documents/upload", {
      method: "POST",
      body: formData,
    }),
  getDocumentDetails: (docId: number) =>
    request<any>(`/api/documents/${docId}`),
  retryDocument: (docId: number) =>
    request<DocumentItem>(`/api/documents/${docId}/retry`, { method: "POST" }),
  archiveDocument: (docId: number) =>
    request<any>(`/api/documents/${docId}`, { method: "DELETE" }),
  searchChunks: (
    query: string,
    companyId: number,
    assessmentPeriodId: number,
    category?: string,
    financialYear?: string
  ) => {
    const params = new URLSearchParams({
      query,
      company_id: String(companyId),
      assessment_period_id: String(assessmentPeriodId),
    });
    if (category) params.set("document_category", category);
    if (financialYear) params.set("financial_year", financialYear);
    return request<any[]>(`/api/documents/search/chunks?${params.toString()}`);
  },

  getStakeholders: (assessmentPeriodId: number) =>
    request<StakeholderProfile[]>(
      `/api/stakeholders?assessment_period_id=${assessmentPeriodId}`
    ),
  updateStakeholderWeight: (
    stakeholderId: number,
    importanceWeight: number,
    influenceLevel?: string,
    dependenceLevel?: string,
    justification?: string
  ) =>
    request<StakeholderProfile>(`/api/stakeholders/${stakeholderId}/weight`, {
      method: "PUT",
      body: JSON.stringify({
        importance_weight: importanceWeight,
        influence_level: influenceLevel,
        dependence_level: dependenceLevel,
        justification: justification || "Adjusted stakeholder importance weight",
      }),
    }),
  updateExpectationWeight: (
    expectationId: number,
    requirementWeight: number,
    justification?: string
  ) =>
    request<any>(`/api/stakeholders/expectations/${expectationId}/weight`, {
      method: "PUT",
      body: JSON.stringify({
        requirement_weight: requirementWeight,
        justification: justification || "Adjusted requirement weight",
      }),
    }),

  getStructureAnalysis: (assessmentPeriodId: number) =>
    request<any>(`/api/analysis/${assessmentPeriodId}/structure`),
  getAlignmentMatrix: (assessmentPeriodId: number) =>
    request<any>(`/api/analysis/${assessmentPeriodId}/alignment-matrix`),
  overrideAlignment: (
    alignmentId: number,
    newClassification: string,
    justification: string
  ) =>
    request<any>(`/api/analysis/alignments/${alignmentId}/override`, {
      method: "POST",
      body: JSON.stringify({
        new_classification: newClassification,
        justification,
        evaluator_name: currentUserName,
        evaluator_role: currentUserRole,
      }),
    }),
  getConflicts: (assessmentPeriodId: number) =>
    request<StakeholderConflict[]>(
      `/api/analysis/${assessmentPeriodId}/conflicts`
    ),
  getRecommendations: (assessmentPeriodId: number) =>
    request<RecommendationItem[]>(
      `/api/analysis/${assessmentPeriodId}/recommendations`
    ),
  updateRecommendationStatus: (recId: number, status: string) =>
    request<RecommendationItem>(
      `/api/analysis/recommendations/${recId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status, actor: currentUserName }),
      }
    ),
  getEvidence: (assessmentPeriodId: number, classification?: string) => {
    const params = new URLSearchParams({
      assessment_period_id: String(assessmentPeriodId),
    });
    if (classification) params.set("evidence_classification", classification);
    return request<EvidenceRecord[]>(`/api/evidence?${params.toString()}`);
  },
  getAuditLogs: (assessmentPeriodId: number) =>
    request<any[]>(`/api/analysis/${assessmentPeriodId}/audit-logs`),
  getPrompts: () => request<Record<string, string>>("/api/analysis/prompts"),
  getLlmConfig: () =>
    request<{
      llm_provider: string;
      llm_model: string;
      groq_configured: boolean;
      masked_groq_key: string;
    }>("/api/analysis/llm-config"),
  updateLlmConfig: (data: {
    groq_api_key?: string;
    llm_provider?: string;
    llm_model?: string;
  }) =>
    request<{
      llm_provider: string;
      llm_model: string;
      groq_configured: boolean;
      masked_groq_key: string;
    }>("/api/analysis/llm-config", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  runAiSynthesis: (assessmentPeriodId: number, question?: string) =>
    request<{
      provider_used: string;
      executive_summary: string;
      targeted_question_response?: string;
      key_strengths: string[];
      key_structural_gaps: string[];
      evidence_limitations_summary: string;
    }>(`/api/analysis/${assessmentPeriodId}/ai-synthesize`, {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
  triggerBackup: () =>
    request<{ status: string; backup_path: string }>("/api/analysis/backup", {
      method: "POST",
    }),
  getReport: (assessmentPeriodId: number) =>
    request<any>(`/api/reports/${assessmentPeriodId}`),
};

