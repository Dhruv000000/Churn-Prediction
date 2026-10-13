"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/routers/dwh_router.py
Purpose: Fast analytical REST endpoints exposing Star Schema aggregates and OLAP queries.
"""

from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas import OLAPSummaryResponse, ContractAnalysisItem, PaymentAnalysisItem
from app.services import olap_service

router = APIRouter(prefix="/api/dwh", tags=["Data Warehouse & OLAP"])


@router.get("/kpis", response_model=OLAPSummaryResponse, summary="Executive Warehouse KPIs")
def get_warehouse_kpis():
    """
    Returns high-level business health metrics:
    - Total Subscribers
    - Churn Count vs Retained Count
    - Overall Churn Rate (%)
    - Average Monthly Charges
    - Total Monthly Revenue and Annual Recurring Revenue (ARR)
    """
    try:
        return olap_service.get_warehouse_kpis()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate warehouse KPIs: {str(e)}")


@router.get("/contract-analysis", response_model=List[ContractAnalysisItem], summary="Multidimensional Contract & Service Rollup")
def get_contract_analysis():
    """
    Aggregates subscription volume, churn rate, and cumulative revenue grouped by:
    - Contract Type ('Month-to-month', 'One year', 'Two year')
    - Internet Service ('DSL', 'Fiber optic', 'No')
    """
    try:
        return olap_service.get_contract_churn_distribution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch contract analysis: {str(e)}")


@router.get("/payment-analysis", response_model=List[PaymentAnalysisItem], summary="Payment Channel Churn Breakdown")
def get_payment_analysis():
    """
    Slices customer churn rate across payment mechanics:
    - Electronic check, Mailed check, Bank transfer, Credit card
    """
    try:
        return olap_service.get_payment_method_breakdown()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch payment method analysis: {str(e)}")
