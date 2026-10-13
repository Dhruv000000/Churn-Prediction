"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/services/olap_service.py
Purpose: Analytical queries against the PostgreSQL/SQLite Star Schema.
         Calculates executive KPIs, multi-dimensional rollups, and sliced financial metrics.
"""

from typing import List, Dict, Any
from sqlalchemy import text
from app.database import engine
from app.schemas import OLAPSummaryResponse, ContractAnalysisItem, PaymentAnalysisItem


def get_warehouse_kpis() -> OLAPSummaryResponse:
    """Computes high-level executive KPIs from the fact and dimension tables."""
    query = """
    SELECT 
        COUNT(*)                                                      AS total_subscribers,
        COALESCE(SUM(churn_flag), 0)                                  AS churn_count,
        COUNT(*) - COALESCE(SUM(churn_flag), 0)                       AS retained_count,
        ROUND((CAST(COALESCE(SUM(churn_flag), 0) AS FLOAT) / NULLIF(COUNT(*), 0)) * 100, 2) AS overall_churn_rate,
        ROUND(AVG(monthly_charges), 2)                                AS average_monthly_charges,
        ROUND(AVG(tenure_months), 1)                                  AS average_tenure_months,
        ROUND(SUM(monthly_charges), 2)                                AS total_monthly_revenue,
        ROUND(SUM(monthly_charges) * 12, 2)                           AS total_arr
    FROM fact_subscriptions;
    """

    with engine.connect() as conn:
        row = conn.execute(text(query)).mappings().first()

    if not row or row["total_subscribers"] == 0:
        return OLAPSummaryResponse(
            total_subscribers=0,
            churn_count=0,
            retained_count=0,
            overall_churn_rate=0.0,
            average_monthly_charges=0.0,
            average_tenure_months=0.0,
            total_monthly_revenue=0.0,
            total_arr=0.0
        )

    return OLAPSummaryResponse(
        total_subscribers=int(row["total_subscribers"]),
        churn_count=int(row["churn_count"]),
        retained_count=int(row["retained_count"]),
        overall_churn_rate=float(row["overall_churn_rate"]),
        average_monthly_charges=float(row["average_monthly_charges"]),
        average_tenure_months=float(row["average_tenure_months"]),
        total_monthly_revenue=float(row["total_monthly_revenue"]),
        total_arr=float(row["total_arr"]),
    )


def get_contract_churn_distribution() -> List[ContractAnalysisItem]:
    """
    Executes multidimensional aggregation across contract tier and internet service.
    """
    query = """
    SELECT 
        b.contract                                                    AS contract_tier,
        s.internet_service                                            AS internet_service_type,
        COUNT(f.fact_key)                                             AS total_subscribers,
        COALESCE(SUM(f.churn_flag), 0)                                AS churned_subscribers,
        COUNT(f.fact_key) - COALESCE(SUM(f.churn_flag), 0)            AS retained_subscribers,
        ROUND((CAST(COALESCE(SUM(f.churn_flag), 0) AS FLOAT) / NULLIF(COUNT(f.fact_key), 0)) * 100, 2) AS churn_rate_pct,
        ROUND(AVG(f.tenure_months), 1)                                AS avg_tenure_months,
        ROUND(AVG(f.monthly_charges), 2)                              AS avg_monthly_charges,
        ROUND(SUM(f.monthly_charges), 2)                              AS total_monthly_mrr,
        ROUND(SUM(f.total_charges), 2)                                AS total_cumulative_revenue
    FROM fact_subscriptions f
    JOIN dim_billing b       ON f.billing_key = b.billing_key
    JOIN dim_service_plan s  ON f.service_key = s.service_key
    GROUP BY b.contract, s.internet_service
    ORDER BY b.contract, s.internet_service;
    """

    with engine.connect() as conn:
        rows = conn.execute(text(query)).mappings().fetchall()

    items = []
    for r in rows:
        items.append(ContractAnalysisItem(
            contract_tier=r["contract_tier"],
            internet_service_type=r["internet_service_type"],
            total_subscribers=int(r["total_subscribers"]),
            churned_subscribers=int(r["churned_subscribers"]),
            retained_subscribers=int(r["retained_subscribers"]),
            churn_rate_pct=float(r["churn_rate_pct"] or 0.0),
            avg_tenure_months=float(r["avg_tenure_months"] or 0.0),
            avg_monthly_charges=float(r["avg_monthly_charges"] or 0.0),
            total_monthly_mrr=float(r["total_monthly_mrr"] or 0.0),
            total_cumulative_revenue=float(r["total_cumulative_revenue"] or 0.0),
        ))
    return items


def get_payment_method_breakdown() -> List[PaymentAnalysisItem]:
    """
    Slices retention metrics across payment channels to isolate billing friction.
    """
    query = """
    SELECT 
        b.payment_method,
        COUNT(f.fact_key)                                             AS total_subscribers,
        COALESCE(SUM(f.churn_flag), 0)                                AS churned_subscribers,
        ROUND((CAST(COALESCE(SUM(f.churn_flag), 0) AS FLOAT) / NULLIF(COUNT(f.fact_key), 0)) * 100, 2) AS churn_rate_pct,
        ROUND(AVG(f.monthly_charges), 2)                              AS avg_monthly_charges,
        ROUND(SUM(f.total_charges), 2)                                AS total_revenue
    FROM fact_subscriptions f
    JOIN dim_billing b ON f.billing_key = b.billing_key
    GROUP BY b.payment_method
    ORDER BY churn_rate_pct DESC;
    """

    with engine.connect() as conn:
        rows = conn.execute(text(query)).mappings().fetchall()

    items = []
    for r in rows:
        items.append(PaymentAnalysisItem(
            payment_method=r["payment_method"],
            total_subscribers=int(r["total_subscribers"]),
            churned_subscribers=int(r["churned_subscribers"]),
            churn_rate_pct=float(r["churn_rate_pct"] or 0.0),
            avg_monthly_charges=float(r["avg_monthly_charges"] or 0.0),
            total_revenue=float(r["total_revenue"] or 0.0),
        ))
    return items
