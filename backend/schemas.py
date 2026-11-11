"""Pydantic v2 Schemas for API Validation and Structured LLM Output Enforcement."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# Enums & Literals
# =============================================================================

StakeholderCategoryType = Literal["Internal", "External"]
EvidenceClassType = Literal["FACT", "COMPANY_CLAIM", "THIRD_PARTY_CLAIM", "INFERENCE"]
AlignmentClassType = Literal[
    "Strong Alignment",
    "Partial Alignment",
    "Potential Misalignment",
    "Insufficient Evidence",
    "Not Applicable",
]
DimensionCodeType = Literal[
    "hierarchy",
    "centralization",
    "formalization",
    "specialization",
    "delegation",
    "coordination",
    "governance",
]
RecommendationPriorityType = Literal["Critical", "High", "Medium", "Low"]
RecommendationStatusType = Literal["Proposed", "Accepted", "Rejected", "Implemented"]


# =============================================================================
# Company Schemas
# =============================================================================

class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    ticker: Optional[str] = None
    industry: str = "Social Media & Digital Platforms"
    description: Optional[str] = None
    analysis_priorities: List[str] = Field(default_factory=list)


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    ticker: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    analysis_priorities: Optional[List[str]] = None


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    ticker: Optional[str]
    industry: str
    description: Optional[str]
    analysis_priorities: List[str]
    created_at: datetime
    updated_at: datetime


# =============================================================================
# Assessment Period Schemas
# =============================================================================

class AssessmentCreate(BaseModel):
    company_id: int
    title: str = Field(..., min_length=2, max_length=255)
    fiscal_year: str = Field(..., min_length=2, max_length=32)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    created_by: str = "Lead Organizational Analyst"
    seed_baseline_framework: bool = True


class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    fiscal_year: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    is_locked: Optional[bool] = None


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    title: str
    fiscal_year: str
    start_date: Optional[str]
    end_date: Optional[str]
    status: str
    is_locked: bool
    version: int
    overall_alignment_score: Optional[float]
    evidence_coverage_pct: float
    last_analyzed_at: Optional[datetime]
    created_by: str
    created_at: datetime


# =============================================================================
# Document Schemas
# =============================================================================

class DocumentUploadJSON(BaseModel):
    company_id: int
    assessment_period_id: int
    title: str
    category: str = "Annual Report / 10-K"
    financial_year: str = "FY2025"
    publication_date: Optional[str] = None
    source_url: Optional[str] = None
    file_name: str
    content_text: Optional[str] = None
    content_base64: Optional[str] = None
    version: str = "1.0"
    uploader: str = "Lead Organizational Analyst"


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    assessment_period_id: int
    title: str
    category: str
    financial_year: str
    publication_date: Optional[str]
    source_url: Optional[str]
    upload_date: datetime
    file_type: str
    file_size: int
    version: str
    processing_status: str
    uploader: str
    error_message: Optional[str]
    prompt_injection_flag: bool
    is_archived: bool
    chunk_count: int = 0


# =============================================================================
# Stakeholder & Expectation Schemas
# =============================================================================

class ExpectationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stakeholder_id: int
    assessment_period_id: int
    title: str
    description: str
    requirement_weight: float
    priority_category: str
    is_discovered_from_docs: bool
    mapped_dimension_codes: List[str]


class StakeholderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    assessment_period_id: int
    name: str
    category: str
    slug: str
    importance_weight: float
    influence_level: str
    dependence_level: str
    key_interests: List[str]
    concerns_and_risks: List[str]
    relevant_policies: List[str]
    potential_conflicts: List[str]
    alignment_score: Optional[float]
    evidence_coverage_pct: float
    expectations: List[ExpectationResponse] = Field(default_factory=list)
    strong_count: int = 0
    partial_count: int = 0
    misalignment_count: int = 0
    insufficient_count: int = 0


class StakeholderWeightUpdate(BaseModel):
    importance_weight: float = Field(..., ge=0.1, le=5.0)
    influence_level: Optional[str] = None
    dependence_level: Optional[str] = None
    actor: str = "Lead Organizational Analyst"
    justification: Optional[str] = "Evaluator weight calibration"


class ExpectationWeightUpdate(BaseModel):
    requirement_weight: float = Field(..., ge=0.1, le=5.0)
    actor: str = "Lead Organizational Analyst"
    justification: Optional[str] = "Requirement weight adjustment"


# =============================================================================
# Organizational Structure Schemas
# =============================================================================

class OrganizationalDimensionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_period_id: int
    dimension_code: str
    dimension_name: str
    suitability_classification: str
    assessment_summary: Optional[str]
    strengths: List[str]
    weaknesses: List[str]
    evidence_count: int
    confidence_level: str


class OrganizationalUnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_period_id: int
    dimension_id: Optional[int]
    unit_name: str
    unit_type: str
    reporting_line: str
    responsibilities: str
    authority_scope: Optional[str]
    source_document_id: Optional[int]
    evidence_classification: str


# =============================================================================
# Evidence, Alignment, Conflicts & Recommendations Schemas
# =============================================================================

class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    assessment_period_id: int
    document_id: Optional[int]
    chunk_id: Optional[int]
    stakeholder_id: Optional[int]
    expectation_id: Optional[int]
    organizational_dimension: str
    extracted_statement: str
    exact_quotation: str
    document_name: str
    page_number: int
    section_heading: str
    source_url: Optional[str]
    publication_date: Optional[str]
    financial_year: Optional[str]
    evidence_classification: str
    confidence_level: str
    quality_score: float
    quality_breakdown: Dict[str, Any]
    is_contradictory: bool


class AlignmentAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_period_id: int
    stakeholder_id: int
    expectation_id: int
    organizational_dimension: str
    mapped_mechanisms: List[str]
    classification: str
    numeric_score: Optional[float]
    requirement_weight: float
    rationale: str
    root_cause_diagnosis: List[str]
    evidence_ids: List[int]
    evidence_quality_score: float
    is_overridden: bool


class ManualOverrideRequest(BaseModel):
    new_classification: AlignmentClassType
    justification: str = Field(..., min_length=5)
    evaluator_name: str = "Lead Organizational Analyst"
    evaluator_role: str = "Admin"


class StakeholderConflictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_period_id: int
    stakeholder_a_id: Optional[int]
    stakeholder_b_id: Optional[int]
    stakeholder_a_name: str
    stakeholder_b_name: str
    conflicting_expectations: str
    organizational_units_involved: List[str]
    current_resolution_mechanisms: str
    structural_weaknesses: str
    recommended_governance_mechanism: str
    severity: str
    evidence_ids: List[int]


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_period_id: int
    stakeholder_id: Optional[int]
    alignment_assessment_id: Optional[int]
    organizational_dimension: str
    title: str
    identified_issue: str
    suggested_organizational_change: str
    expected_benefit: str
    priority: str
    implementation_difficulty: str
    possible_tradeoffs: str
    status: str
    evidence_ids: List[int]


class RecommendationStatusUpdate(BaseModel):
    status: RecommendationStatusType
    actor: str = "Lead Organizational Analyst"
    justification: Optional[str] = "Updated recommendation workflow status"


# =============================================================================
# Structured LLM Output Validation Schemas (Section 17)
# =============================================================================

class LLMStakeholderItem(BaseModel):
    name: str
    category: StakeholderCategoryType
    slug: str
    influence_level: Literal["High", "Medium", "Low"] = "High"
    dependence_level: Literal["High", "Medium", "Low"] = "High"
    key_interests: List[str] = Field(default_factory=list)
    concerns_and_risks: List[str] = Field(default_factory=list)
    relevant_policies: List[str] = Field(default_factory=list)
    potential_conflicts: List[str] = Field(default_factory=list)


class LLMStakeholderList(BaseModel):
    stakeholders: List[LLMStakeholderItem]


class LLMExpectationItem(BaseModel):
    stakeholder_slug: str
    title: str
    description: str
    priority_category: str = "Discovered Requirement"
    is_discovered_from_docs: bool = True
    mapped_dimension_codes: List[str] = Field(default_factory=list)


class LLMExpectationList(BaseModel):
    expectations: List[LLMExpectationItem]


class LLMStructureDimensionItem(BaseModel):
    dimension_code: DimensionCodeType
    suitability_classification: AlignmentClassType
    assessment_summary: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    confidence_level: Literal["High", "Medium", "Low"] = "Medium"


class LLMOrganizationalUnitItem(BaseModel):
    unit_name: str
    unit_type: str
    dimension_code: str = "governance"
    reporting_line: str = "Insufficient Evidence"
    responsibilities: str
    authority_scope: str = "Disclosed in filing"
    evidence_classification: EvidenceClassType = "FACT"


class LLMStructureOutput(BaseModel):
    dimensions: List[LLMStructureDimensionItem] = Field(default_factory=list)
    organizational_units: List[LLMOrganizationalUnitItem] = Field(default_factory=list)


class LLMEvidenceExtractionItem(BaseModel):
    stakeholder_slug: str
    organizational_dimension: DimensionCodeType
    extracted_statement: str
    exact_quotation: str
    document_name: str
    page_number: int = 1
    section_heading: str = "General"
    evidence_classification: EvidenceClassType
    confidence_level: Literal["High", "Medium", "Low"] = "Medium"
    is_contradictory: bool = False


class LLMEvidenceList(BaseModel):
    evidence_records: List[LLMEvidenceExtractionItem]


class LLMMappingItem(BaseModel):
    expectation_id: int
    organizational_dimension: str
    mapped_mechanisms: List[str]
    supporting_evidence_ids: List[int] = Field(default_factory=list)


class LLMMappingList(BaseModel):
    mappings: List[LLMMappingItem]


class LLMAlignmentEvaluationItem(BaseModel):
    expectation_id: int
    organizational_dimension: DimensionCodeType
    classification: AlignmentClassType
    rationale: str
    evidence_ids: List[int] = Field(default_factory=list)


class LLMAlignmentList(BaseModel):
    assessments: List[LLMAlignmentEvaluationItem]


class LLMRootCauseItem(BaseModel):
    assessment_id: int
    root_causes: List[str] = Field(default_factory=list)


class LLMRootCauseList(BaseModel):
    diagnoses: List[LLMRootCauseItem]


class LLMConflictItem(BaseModel):
    stakeholder_a_name: str
    stakeholder_b_name: str
    conflicting_expectations: str
    organizational_units_involved: List[str] = Field(default_factory=list)
    current_resolution_mechanisms: str
    structural_weaknesses: str
    recommended_governance_mechanism: str
    severity: Literal["Critical", "High", "Medium", "Low"] = "High"
    evidence_ids: List[int] = Field(default_factory=list)


class LLMConflictList(BaseModel):
    conflicts: List[LLMConflictItem]


class LLMRecommendationItem(BaseModel):
    stakeholder_slug: str
    organizational_dimension: DimensionCodeType
    title: str
    identified_issue: str
    suggested_organizational_change: str
    expected_benefit: str
    priority: RecommendationPriorityType = "High"
    implementation_difficulty: Literal["High", "Medium", "Low"] = "Medium"
    possible_tradeoffs: str
    evidence_ids: List[int] = Field(default_factory=list)


class LLMRecommendationList(BaseModel):
    recommendations: List[LLMRecommendationItem]


class LLMExecutiveSummaryOutput(BaseModel):
    executive_summary: str
    targeted_question_response: Optional[str] = None
    key_strengths: List[str] = Field(default_factory=list)
    key_structural_gaps: List[str] = Field(default_factory=list)
    evidence_limitations_summary: str

