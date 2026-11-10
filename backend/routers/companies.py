"""Companies REST API Router."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Company
from backend.schemas import CompanyCreate, CompanyResponse, CompanyUpdate
from backend.security import (
    UserContext,
    get_current_user,
    log_audit_event,
    require_write_access,
)

router = APIRouter(prefix="/api/companies", tags=["Companies"])


@router.get("", response_model=List[CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).order_by(Company.id.asc()).all()


@router.post("", response_model=CompanyResponse, status_code=201)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    existing = db.query(Company).filter(Company.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=400, detail=f"Company '{payload.name}' already exists."
        )
    company = Company(
        name=payload.name,
        ticker=payload.ticker,
        industry=payload.industry,
        description=payload.description,
        analysis_priorities=payload.analysis_priorities,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    log_audit_event(
        db=db,
        action_type="CREATE_COMPANY",
        entity_type="Company",
        actor=user.username,
        role=user.role,
        company_id=company.id,
        entity_id=company.id,
        after_state={"name": company.name, "ticker": company.ticker},
    )
    return company


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    return company


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    before = {
        "name": company.name,
        "ticker": company.ticker,
        "industry": company.industry,
        "analysis_priorities": company.analysis_priorities,
    }
    if payload.name is not None:
        company.name = payload.name
    if payload.ticker is not None:
        company.ticker = payload.ticker
    if payload.industry is not None:
        company.industry = payload.industry
    if payload.description is not None:
        company.description = payload.description
    if payload.analysis_priorities is not None:
        company.analysis_priorities = payload.analysis_priorities

    db.commit()
    db.refresh(company)
    log_audit_event(
        db=db,
        action_type="UPDATE_COMPANY",
        entity_type="Company",
        actor=user.username,
        role=user.role,
        company_id=company.id,
        entity_id=company.id,
        before_state=before,
        after_state={
            "name": company.name,
            "ticker": company.ticker,
            "industry": company.industry,
            "analysis_priorities": company.analysis_priorities,
        },
    )
    return company

