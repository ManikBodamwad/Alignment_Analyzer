/**
 * TypeScript Interfaces for Stakeholder–Structure Alignment Analyzer
 */

export interface Company {
  id: number;
  name: string;
  ticker: string | null;
  industry: string;
  description: string | null;
  analysis_priorities: string[];
  created_at: string;
  updated_at: string;
}

export interface AssessmentPeriod {
  id: number;
  company_id: number;
  title: string;
  fiscal_year: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_locked: boolean;
  version: number;
  overall_alignment_score: number | null;
  evidence_coverage_pct: number;
  last_analyzed_at: string | null;
  created_by: string;
  created_at: string;
}

export interface AssessmentFullSummary {
  assessment: {
    id: number;
    company_id: number;
    company_name: string;
    company_ticker: string;
    company_priorities: string[];
    title: string;
    fiscal_year: string;
    status: string;
    is_locked: boolean;
    version: number;
    overall_alignment_score: number | null;
    evidence_coverage_pct: number;
    last_analyzed_at: string | null;
    created_at: string;
  };
  metrics: {
    documents_processed: number;
    total_documents: number;
    stakeholders_assessed: number;
    total_stakeholders: number;
    alignment_gaps_identified: number;
    potential_misalignments: number;
    partial_alignments: number;
    strong_alignments: number;
    insufficient_evidence_count: number;
    recommendations_count: number;
    conflicts_count: number;
    evidence_records_count: number;
    organizational_units_count: number;
  };
  dimensions_summary: {
    id: number;
    dimension_code: string;
    dimension_name: string;
    suitability_classification: string;
    evidence_count: number;
    confidence_level: string;
  }[];
}

export interface DocumentItem {
  id: number;
  company_id: number;
  assessment_period_id: number;
  title: string;
  category: string;
  financial_year: string;
  publication_date: string | null;
  source_url: string | null;
  upload_date: string;
  file_type: string;
  file_size: number;
  version: string;
  processing_status: string;
  uploader: string;
  error_message: string | null;
  prompt_injection_flag: boolean;
  is_archived: boolean;
  chunk_count: number;
}

export interface StakeholderExpectation {
  id: number;
  stakeholder_id: number;
  assessment_period_id: number;
  title: string;
  description: string;
  requirement_weight: number;
  priority_category: string;
  is_discovered_from_docs: boolean;
  mapped_dimension_codes: string[];
}

export interface StakeholderProfile {
  id: number;
  company_id: number;
  assessment_period_id: number;
  name: string;
  category: "Internal" | "External";
  slug: string;
  importance_weight: number;
  influence_level: string;
  dependence_level: string;
  key_interests: string[];
  concerns_and_risks: string[];
  relevant_policies: string[];
  potential_conflicts: string[];
  alignment_score: number | null;
  evidence_coverage_pct: number;
  expectations: StakeholderExpectation[];
  strong_count: number;
  partial_count: number;
  misalignment_count: number;
  insufficient_count: number;
}

export interface EvidenceRecord {
  id: number;
  company_id: number;
  assessment_period_id: number;
  document_id: number | null;
  chunk_id: number | null;
  stakeholder_id: number | null;
  expectation_id: number | null;
  organizational_dimension: string;
  extracted_statement: string;
  exact_quotation: string;
  document_name: string;
  page_number: number;
  section_heading: string;
  source_url: string | null;
  publication_date: string | null;
  financial_year: string | null;
  evidence_classification: "FACT" | "COMPANY_CLAIM" | "THIRD_PARTY_CLAIM" | "INFERENCE";
  confidence_level: string;
  quality_score: number;
  quality_breakdown: Record<string, number>;
  is_contradictory: boolean;
}

export interface AlignmentMatrixCell {
  id: number;
  stakeholder_id: number;
  stakeholder_name: string;
  stakeholder_category: string;
  expectation_id: number;
  expectation_title: string;
  expectation_description: string;
  is_discovered_from_docs: boolean;
  organizational_dimension: string;
  mapped_mechanisms: string[];
  classification: string;
  numeric_score: number | null;
  requirement_weight: number;
  rationale: string;
  root_cause_diagnosis: string[];
  evidence_ids: number[];
  evidence_records: EvidenceRecord[];
  evidence_quality_score: number;
  is_overridden: boolean;
  recommendations: RecommendationItem[];
}

export interface StakeholderConflict {
  id: number;
  assessment_period_id: number;
  stakeholder_a_id: number | null;
  stakeholder_b_id: number | null;
  stakeholder_a_name: string;
  stakeholder_b_name: string;
  conflicting_expectations: string;
  organizational_units_involved: string[];
  current_resolution_mechanisms: string;
  structural_weaknesses: string;
  recommended_governance_mechanism: string;
  severity: string;
  evidence_ids: number[];
}

export interface RecommendationItem {
  id: number;
  assessment_period_id: number;
  stakeholder_id: number | null;
  alignment_assessment_id: number | null;
  organizational_dimension: string;
  title: string;
  identified_issue: string;
  suggested_organizational_change: string;
  expected_benefit: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  implementation_difficulty: string;
  possible_tradeoffs: string;
  status: "Proposed" | "Accepted" | "Rejected" | "Implemented";
  evidence_ids: number[];
}

