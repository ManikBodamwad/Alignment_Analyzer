"""Normalized SQLAlchemy 2.0 ORM Models for Stakeholder–Structure Alignment Analyzer."""

from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    ticker: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    industry: Mapped[str] = mapped_column(
        String(128), default="Social Media & Digital Platforms"
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    analysis_priorities: Mapped[List[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    assessment_periods: Mapped[List["AssessmentPeriod"]] = relationship(
        "AssessmentPeriod", back_populates="company", cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="company", cascade="all, delete-orphan"
    )


class AssessmentPeriod(Base):
    __tablename__ = "assessment_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    fiscal_year: Mapped[str] = mapped_column(String(32), nullable=False)
    start_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="draft")
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    overall_alignment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evidence_coverage_pct: Mapped[float] = mapped_column(Float, default=0.0)
    last_analyzed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[str] = mapped_column(String(128), default="Lead Organizational Analyst")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    company: Mapped["Company"] = relationship("Company", back_populates="assessment_periods")
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="assessment_period", cascade="all, delete-orphan"
    )
    stakeholders: Mapped[List["Stakeholder"]] = relationship(
        "Stakeholder", back_populates="assessment_period", cascade="all, delete-orphan"
    )
    organizational_dimensions: Mapped[List["OrganizationalDimension"]] = relationship(
        "OrganizationalDimension",
        back_populates="assessment_period",
        cascade="all, delete-orphan",
    )
    organizational_units: Mapped[List["OrganizationalUnit"]] = relationship(
        "OrganizationalUnit",
        back_populates="assessment_period",
        cascade="all, delete-orphan",
    )
    evidence_records: Mapped[List["EvidenceRecord"]] = relationship(
        "EvidenceRecord",
        back_populates="assessment_period",
        cascade="all, delete-orphan",
    )
    alignment_assessments: Mapped[List["AlignmentAssessment"]] = relationship(
        "AlignmentAssessment",
        back_populates="assessment_period",
        cascade="all, delete-orphan",
    )
    stakeholder_conflicts: Mapped[List["StakeholderConflict"]] = relationship(
        "StakeholderConflict",
        back_populates="assessment_period",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="assessment_period",
        cascade="all, delete-orphan",
    )
    scoring_configuration: Mapped[Optional["ScoringConfiguration"]] = relationship(
        "ScoringConfiguration",
        back_populates="assessment_period",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    financial_year: Mapped[str] = mapped_column(String(32), nullable=False)
    publication_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    file_type: Mapped[str] = mapped_column(String(32), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[str] = mapped_column(String(32), default="1.0")
    processing_status: Mapped[str] = mapped_column(String(64), default="pending")
    uploader: Mapped[str] = mapped_column(String(128), default="Lead Organizational Analyst")
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prompt_injection_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    company: Mapped["Company"] = relationship("Company", back_populates="documents")
    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="documents"
    )
    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    section_heading: Mapped[str] = mapped_column(String(512), default="General Section")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    publication_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    financial_year: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    document_category: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    embedding_json: Mapped[Optional[List[float]]] = mapped_column(JSON, nullable=True)

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")


class Stakeholder(Base):
    __tablename__ = "stakeholders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)  # Internal or External
    slug: Mapped[str] = mapped_column(String(128), nullable=False)
    importance_weight: Mapped[float] = mapped_column(Float, default=1.0)
    influence_level: Mapped[str] = mapped_column(String(64), default="High")
    dependence_level: Mapped[str] = mapped_column(String(64), default="High")
    key_interests: Mapped[List[str]] = mapped_column(JSON, default=list)
    concerns_and_risks: Mapped[List[str]] = mapped_column(JSON, default=list)
    relevant_policies: Mapped[List[str]] = mapped_column(JSON, default=list)
    potential_conflicts: Mapped[List[str]] = mapped_column(JSON, default=list)
    alignment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evidence_coverage_pct: Mapped[float] = mapped_column(Float, default=0.0)

    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="stakeholders"
    )
    expectations: Mapped[List["StakeholderExpectation"]] = relationship(
        "StakeholderExpectation",
        back_populates="stakeholder",
        cascade="all, delete-orphan",
    )


class StakeholderExpectation(Base):
    __tablename__ = "stakeholder_expectations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stakeholder_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("stakeholders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirement_weight: Mapped[float] = mapped_column(Float, default=1.0)
    priority_category: Mapped[str] = mapped_column(String(128), default="Core Requirement")
    is_discovered_from_docs: Mapped[bool] = mapped_column(Boolean, default=False)
    mapped_dimension_codes: Mapped[List[str]] = mapped_column(JSON, default=list)

    stakeholder: Mapped["Stakeholder"] = relationship(
        "Stakeholder", back_populates="expectations"
    )


class OrganizationalDimension(Base):
    __tablename__ = "organizational_dimensions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dimension_code: Mapped[str] = mapped_column(String(64), nullable=False)
    dimension_name: Mapped[str] = mapped_column(String(255), nullable=False)
    suitability_classification: Mapped[str] = mapped_column(
        String(64), default="Insufficient Evidence"
    )
    assessment_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strengths: Mapped[List[str]] = mapped_column(JSON, default=list)
    weaknesses: Mapped[List[str]] = mapped_column(JSON, default=list)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    confidence_level: Mapped[str] = mapped_column(String(64), default="Low")

    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="organizational_dimensions"
    )


class OrganizationalUnit(Base):
    __tablename__ = "organizational_units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dimension_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("organizational_dimensions.id", ondelete="SET NULL"),
        nullable=True,
    )
    unit_name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_type: Mapped[str] = mapped_column(String(128), nullable=False)
    reporting_line: Mapped[str] = mapped_column(String(255), default="Insufficient Evidence")
    responsibilities: Mapped[str] = mapped_column(Text, nullable=False)
    authority_scope: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    evidence_classification: Mapped[str] = mapped_column(String(64), default="FACT")

    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="organizational_units"
    )


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True
    )
    chunk_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("document_chunks.id", ondelete="SET NULL"), nullable=True
    )
    stakeholder_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("stakeholders.id", ondelete="SET NULL"), nullable=True
    )
    expectation_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("stakeholder_expectations.id", ondelete="SET NULL"),
        nullable=True,
    )
    organizational_dimension: Mapped[str] = mapped_column(String(64), nullable=False)
    extracted_statement: Mapped[str] = mapped_column(Text, nullable=False)
    exact_quotation: Mapped[str] = mapped_column(Text, nullable=False)
    document_name: Mapped[str] = mapped_column(String(512), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    section_heading: Mapped[str] = mapped_column(String(512), default="General")
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    publication_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    financial_year: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    evidence_classification: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # FACT, COMPANY_CLAIM, THIRD_PARTY_CLAIM, INFERENCE
    confidence_level: Mapped[str] = mapped_column(String(64), default="Medium")
    quality_score: Mapped[float] = mapped_column(Float, default=0.75)
    quality_breakdown: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    is_contradictory: Mapped[bool] = mapped_column(Boolean, default=False)

    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="evidence_records"
    )


class AlignmentAssessment(Base):
    __tablename__ = "alignment_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stakeholder_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("stakeholders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expectation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("stakeholder_expectations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organizational_dimension: Mapped[str] = mapped_column(String(64), nullable=False)
    mapped_mechanisms: Mapped[List[str]] = mapped_column(JSON, default=list)
    classification: Mapped[str] = mapped_column(
        String(64), default="Insufficient Evidence"
    )
    numeric_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    requirement_weight: Mapped[float] = mapped_column(Float, default=1.0)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause_diagnosis: Mapped[List[str]] = mapped_column(JSON, default=list)
    evidence_ids: Mapped[List[int]] = mapped_column(JSON, default=list)
    evidence_quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_overridden: Mapped[bool] = mapped_column(Boolean, default=False)

    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="alignment_assessments"
    )


class StakeholderConflict(Base):
    __tablename__ = "stakeholder_conflicts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stakeholder_a_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("stakeholders.id", ondelete="SET NULL"), nullable=True
    )
    stakeholder_b_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("stakeholders.id", ondelete="SET NULL"), nullable=True
    )
    stakeholder_a_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stakeholder_b_name: Mapped[str] = mapped_column(String(255), nullable=False)
    conflicting_expectations: Mapped[str] = mapped_column(Text, nullable=False)
    organizational_units_involved: Mapped[List[str]] = mapped_column(JSON, default=list)
    current_resolution_mechanisms: Mapped[str] = mapped_column(Text, nullable=False)
    structural_weaknesses: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_governance_mechanism: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(64), default="High")
    evidence_ids: Mapped[List[int]] = mapped_column(JSON, default=list)

    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="stakeholder_conflicts"
    )


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stakeholder_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("stakeholders.id", ondelete="SET NULL"), nullable=True
    )
    alignment_assessment_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("alignment_assessments.id", ondelete="SET NULL"),
        nullable=True,
    )
    organizational_dimension: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    identified_issue: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_organizational_change: Mapped[str] = mapped_column(Text, nullable=False)
    expected_benefit: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(64), default="High")
    implementation_difficulty: Mapped[str] = mapped_column(String(64), default="Medium")
    possible_tradeoffs: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="Proposed")
    evidence_ids: Mapped[List[int]] = mapped_column(JSON, default=list)

    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="recommendations"
    )


class ScoringConfiguration(Base):
    __tablename__ = "scoring_configurations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    strong_alignment_value: Mapped[float] = mapped_column(Float, default=4.0)
    partial_alignment_value: Mapped[float] = mapped_column(Float, default=3.0)
    potential_misalignment_value: Mapped[float] = mapped_column(Float, default=1.0)
    stakeholder_weights: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    requirement_weights: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    min_evidence_threshold: Mapped[int] = mapped_column(Integer, default=1)
    updated_by: Mapped[str] = mapped_column(String(128), default="System")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    assessment_period: Mapped["AssessmentPeriod"] = relationship(
        "AssessmentPeriod", back_populates="scoring_configuration"
    )


class ManualOverride(Base):
    __tablename__ = "manual_overrides"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alignment_assessment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("alignment_assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    previous_classification: Mapped[str] = mapped_column(String(64), nullable=False)
    new_classification: Mapped[str] = mapped_column(String(64), nullable=False)
    previous_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    new_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    evaluator_name: Mapped[str] = mapped_column(String(128), nullable=False)
    evaluator_role: Mapped[str] = mapped_column(
        String(128), default="Lead Organizational Analyst"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    assessment_period_id: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, index=True
    )
    actor: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(128), nullable=False)
    action_type: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    before_state: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    after_state: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    justification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

