-- =============================================================================
-- Stakeholder–Structure Alignment Analyzer
-- PostgreSQL + pgvector Normalized Schema Migration (15 Models)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    ticker VARCHAR(32),
    industry VARCHAR(128) NOT NULL DEFAULT 'Social Media & Digital Platforms',
    description TEXT,
    analysis_priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_periods (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    fiscal_year VARCHAR(32) NOT NULL,
    start_date VARCHAR(32),
    end_date VARCHAR(32),
    status VARCHAR(64) NOT NULL DEFAULT 'draft',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    overall_alignment_score DOUBLE PRECISION,
    evidence_coverage_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_analyzed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(128) NOT NULL DEFAULT 'Lead Organizational Analyst',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    title VARCHAR(512) NOT NULL,
    category VARCHAR(128) NOT NULL,
    financial_year VARCHAR(32) NOT NULL,
    publication_date VARCHAR(64),
    source_url VARCHAR(1024),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_type VARCHAR(32) NOT NULL,
    file_path VARCHAR(1024),
    file_size INTEGER NOT NULL DEFAULT 0,
    version VARCHAR(32) NOT NULL DEFAULT '1.0',
    processing_status VARCHAR(64) NOT NULL DEFAULT 'pending',
    uploader VARCHAR(128) NOT NULL DEFAULT 'Lead Organizational Analyst',
    extracted_text TEXT,
    error_message TEXT,
    prompt_injection_flag BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    section_heading VARCHAR(512) NOT NULL DEFAULT 'General Section',
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    source_url VARCHAR(1024),
    publication_date VARCHAR(64),
    financial_year VARCHAR(32),
    document_category VARCHAR(128),
    embedding_json JSONB,
    embedding vector(384)
);

CREATE INDEX IF NOT EXISTS idx_chunks_company_period ON document_chunks(company_id, assessment_period_id);
CREATE INDEX IF NOT EXISTS idx_chunks_category_fy ON document_chunks(document_category, financial_year);

CREATE TABLE IF NOT EXISTS stakeholders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'Internal' or 'External'
    slug VARCHAR(128) NOT NULL,
    importance_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    influence_level VARCHAR(64) NOT NULL DEFAULT 'High',
    dependence_level VARCHAR(64) NOT NULL DEFAULT 'High',
    key_interests JSONB NOT NULL DEFAULT '[]'::jsonb,
    concerns_and_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    relevant_policies JSONB NOT NULL DEFAULT '[]'::jsonb,
    potential_conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
    alignment_score DOUBLE PRECISION,
    evidence_coverage_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS stakeholder_expectations (
    id SERIAL PRIMARY KEY,
    stakeholder_id INTEGER NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    title VARCHAR(512) NOT NULL,
    description TEXT NOT NULL,
    requirement_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    priority_category VARCHAR(128) NOT NULL DEFAULT 'Core Requirement',
    is_discovered_from_docs BOOLEAN NOT NULL DEFAULT FALSE,
    mapped_dimension_codes JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS organizational_dimensions (
    id SERIAL PRIMARY KEY,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    dimension_code VARCHAR(64) NOT NULL,
    dimension_name VARCHAR(255) NOT NULL,
    suitability_classification VARCHAR(64) NOT NULL DEFAULT 'Insufficient Evidence',
    assessment_summary TEXT,
    strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    confidence_level VARCHAR(64) NOT NULL DEFAULT 'Low'
);

CREATE TABLE IF NOT EXISTS organizational_units (
    id SERIAL PRIMARY KEY,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    dimension_id INTEGER REFERENCES organizational_dimensions(id) ON DELETE SET NULL,
    unit_name VARCHAR(255) NOT NULL,
    unit_type VARCHAR(128) NOT NULL,
    reporting_line VARCHAR(255) NOT NULL DEFAULT 'Insufficient Evidence',
    responsibilities TEXT NOT NULL,
    authority_scope VARCHAR(255),
    source_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    evidence_classification VARCHAR(64) NOT NULL DEFAULT 'FACT'
);

CREATE TABLE IF NOT EXISTS evidence_records (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id INTEGER REFERENCES document_chunks(id) ON DELETE SET NULL,
    stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL,
    expectation_id INTEGER REFERENCES stakeholder_expectations(id) ON DELETE SET NULL,
    organizational_dimension VARCHAR(64) NOT NULL,
    extracted_statement TEXT NOT NULL,
    exact_quotation TEXT NOT NULL,
    document_name VARCHAR(512) NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    section_heading VARCHAR(512) NOT NULL DEFAULT 'General',
    source_url VARCHAR(1024),
    publication_date VARCHAR(64),
    financial_year VARCHAR(32),
    evidence_classification VARCHAR(64) NOT NULL, -- FACT, COMPANY_CLAIM, THIRD_PARTY_CLAIM, INFERENCE
    confidence_level VARCHAR(64) NOT NULL DEFAULT 'Medium',
    quality_score DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    quality_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_contradictory BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS alignment_assessments (
    id SERIAL PRIMARY KEY,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    stakeholder_id INTEGER NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    expectation_id INTEGER NOT NULL REFERENCES stakeholder_expectations(id) ON DELETE CASCADE,
    organizational_dimension VARCHAR(64) NOT NULL,
    mapped_mechanisms JSONB NOT NULL DEFAULT '[]'::jsonb,
    classification VARCHAR(64) NOT NULL DEFAULT 'Insufficient Evidence',
    numeric_score DOUBLE PRECISION,
    requirement_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    rationale TEXT NOT NULL,
    root_cause_diagnosis JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_quality_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_overridden BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS stakeholder_conflicts (
    id SERIAL PRIMARY KEY,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    stakeholder_a_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL,
    stakeholder_b_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL,
    stakeholder_a_name VARCHAR(255) NOT NULL,
    stakeholder_b_name VARCHAR(255) NOT NULL,
    conflicting_expectations TEXT NOT NULL,
    organizational_units_involved JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_resolution_mechanisms TEXT NOT NULL,
    structural_weaknesses TEXT NOT NULL,
    recommended_governance_mechanism TEXT NOT NULL,
    severity VARCHAR(64) NOT NULL DEFAULT 'High',
    evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL,
    alignment_assessment_id INTEGER REFERENCES alignment_assessments(id) ON DELETE SET NULL,
    organizational_dimension VARCHAR(64) NOT NULL,
    title VARCHAR(512) NOT NULL,
    identified_issue TEXT NOT NULL,
    suggested_organizational_change TEXT NOT NULL,
    expected_benefit TEXT NOT NULL,
    priority VARCHAR(64) NOT NULL DEFAULT 'High', -- Critical, High, Medium, Low
    implementation_difficulty VARCHAR(64) NOT NULL DEFAULT 'Medium',
    possible_tradeoffs TEXT NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'Proposed', -- Proposed, Accepted, Rejected, Implemented
    evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS scoring_configurations (
    id SERIAL PRIMARY KEY,
    assessment_period_id INTEGER NOT NULL UNIQUE REFERENCES assessment_periods(id) ON DELETE CASCADE,
    strong_alignment_value DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    partial_alignment_value DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    potential_misalignment_value DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    stakeholder_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    requirement_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    min_evidence_threshold INTEGER NOT NULL DEFAULT 1,
    updated_by VARCHAR(128) NOT NULL DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manual_overrides (
    id SERIAL PRIMARY KEY,
    assessment_period_id INTEGER NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
    alignment_assessment_id INTEGER NOT NULL REFERENCES alignment_assessments(id) ON DELETE CASCADE,
    previous_classification VARCHAR(64) NOT NULL,
    new_classification VARCHAR(64) NOT NULL,
    previous_score DOUBLE PRECISION,
    new_score DOUBLE PRECISION,
    justification TEXT NOT NULL,
    evaluator_name VARCHAR(128) NOT NULL,
    evaluator_role VARCHAR(128) NOT NULL DEFAULT 'Lead Organizational Analyst',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    assessment_period_id INTEGER,
    actor VARCHAR(128) NOT NULL,
    role VARCHAR(128) NOT NULL,
    action_type VARCHAR(128) NOT NULL,
    entity_type VARCHAR(128) NOT NULL,
    entity_id INTEGER,
    before_state JSONB,
    after_state JSONB,
    justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

