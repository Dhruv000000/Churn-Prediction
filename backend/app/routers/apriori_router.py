"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/routers/apriori_router.py
Purpose: REST endpoints for Apriori Market Basket Analysis, Frequent Pattern Mining,
         Retrospective Churn Pattern Forensics, and Customer Recommendations.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from app.schemas import (
    AprioriRunRequest,
    AprioriSummaryResponse,
    FrequentItemsetItem,
    AssociationRuleItem,
    ChurnPatternsResponse,
    RecommendationRequest,
    RecommendationResponse
)
from app.services import apriori_service

router = APIRouter(prefix="/api/mining/apriori", tags=["Market Basket Analysis (Apriori)"])


@router.get("/summary", response_model=AprioriSummaryResponse, summary="Get Apriori Mining Summary & Top Rules")
def get_summary():
    """
    Returns full Market Basket Mining diagnostics:
    - Total transactions analyzed (105,000)
    - Frequent itemset counts partitioned by itemset length k
    - Association rules ranked by Lift & Confidence
    - Active threshold parameters and sub-second execution duration
    """
    try:
        return apriori_service.get_apriori_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Apriori summary: {str(e)}")


@router.post("/run", response_model=AprioriSummaryResponse, summary="Execute On-Demand Apriori Mining with Custom Thresholds")
def run_apriori(payload: AprioriRunRequest):
    """
    Executes from-scratch Apriori algorithm across the Star Schema warehouse:
    - Generates candidate itemsets via (k-1) lexicographical join
    - Enforces Apriori Downward Closure Pruning
    - Computes Support, Confidence, Lift, Leverage, and Conviction
    """
    try:
        return apriori_service.run_apriori_on_demand(
            min_support=payload.min_support,
            min_confidence=payload.min_confidence,
            max_len=payload.max_len
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apriori execution failed: {str(e)}")


@router.get("/itemsets", response_model=List[FrequentItemsetItem], summary="Filtered Frequent Itemsets")
def get_itemsets(
    min_size: int = Query(default=1, ge=1, le=10, description="Minimum itemset size"),
    max_size: int = Query(default=5, ge=1, le=10, description="Maximum itemset size"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum itemsets to return")
):
    """Returns frequent itemsets matching size constraints, ranked by support."""
    try:
        return apriori_service.get_frequent_itemsets(min_size=min_size, max_size=max_size, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch frequent itemsets: {str(e)}")


@router.get("/rules", response_model=List[AssociationRuleItem], summary="Filtered Association Rules")
def get_rules(
    min_lift: float = Query(default=1.0, ge=0.0, description="Minimum Lift threshold"),
    min_confidence: float = Query(default=0.0, ge=0.0, le=1.0, description="Minimum Confidence threshold"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum rules to return")
):
    """Returns association rules meeting minimum lift and confidence thresholds, ranked by lift."""
    try:
        return apriori_service.get_association_rules(min_lift=min_lift, min_confidence=min_confidence, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch association rules: {str(e)}")


@router.get("/churn-rules", response_model=ChurnPatternsResponse, summary="Retrospective Churn Pattern Association Rules")
def get_churn_rules():
    """
    Discovers combinations of services, contracts, and payment channels strongly
    associated with Churn vs. Retention outcomes (e.g. Month-to-month + Fiber Optic -> Churned).
    
    Academic Clarification:
    Retrospective descriptive analysis; correlation does not imply causation.
    """
    try:
        return apriori_service.get_churn_patterns()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch churn association patterns: {str(e)}")


@router.post("/recommend", response_model=RecommendationResponse, summary="Customer Complementary Service Recommender")
def recommend_services(payload: RecommendationRequest):
    """
    Recommends unadopted telecom services based on the customer's current service basket
    using mined association rules with high confidence and lift.
    Categorizes suggestions into 'Cross-Sell Bundle' or 'Retention Shield'.
    """
    try:
        return apriori_service.recommend_complementary_services(
            active_services=payload.active_services,
            min_confidence=payload.min_confidence or 0.35,
            min_lift=payload.min_lift or 1.05
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation engine failed: {str(e)}")


@router.get("/export/itemsets", summary="Export Frequent Itemsets to CSV")
def export_itemsets():
    """Streams CSV download of frequent itemsets."""
    csv_data = apriori_service.export_itemsets_to_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=frequent_itemsets.csv"}
    )


@router.get("/export/rules", summary="Export Association Rules to CSV")
def export_rules():
    """Streams CSV download of association rules."""
    csv_data = apriori_service.export_rules_to_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=association_rules.csv"}
    )
