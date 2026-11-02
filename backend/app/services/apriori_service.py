"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/services/apriori_service.py
Purpose: Service Layer for Apriori Market Basket Analysis, Frequent Pattern Mining,
         Retrospective Churn Pattern Forensics, and Cross-Selling Recommendations.
"""

import sys
import os
import json
import io
import csv
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

# Path resolution to 3_MINING_ENGINE
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BACKEND_DIR.parent if BACKEND_DIR.name == "backend" else BACKEND_DIR
MINING_ENGINE_DIR = PROJECT_ROOT / "3_MINING_ENGINE"
SAVED_MODELS_DIR = MINING_ENGINE_DIR / "saved_models"

if str(MINING_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(MINING_ENGINE_DIR))

from apriori_scratch import (
    ScratchApriori,
    encode_service_transactions,
    encode_churn_transactions,
    mine_churn_patterns,
    generate_service_recommendations,
    run_and_save_apriori_artifacts
)
from feature_extractor import extract_warehouse_data

from app.schemas import (
    AprioriSummaryResponse,
    FrequentItemsetItem,
    AssociationRuleItem,
    ChurnRuleItem,
    ChurnPatternsResponse,
    RecommendationResponse,
    RecommendationItem
)

# Global in-memory cache for pre-mined artifacts
_APRIORI_CACHE: Dict[str, Any] = {
    "payload": None,
    "last_loaded": 0,
}


def _load_cached_artifacts() -> Dict[str, Any]:
    """Loads saved Apriori summary JSON into in-memory cache or computes default if missing."""
    summary_path = SAVED_MODELS_DIR / "apriori_summary.json"

    if _APRIORI_CACHE["payload"] is None:
        if summary_path.exists():
            with open(summary_path, "r", encoding="utf-8") as f:
                _APRIORI_CACHE["payload"] = json.load(f)
        else:
            # Generate if missing
            df = extract_warehouse_data()
            _APRIORI_CACHE["payload"] = run_and_save_apriori_artifacts(df)

    return _APRIORI_CACHE["payload"]


def get_apriori_summary() -> AprioriSummaryResponse:
    """Returns top-level summary, metrics, top frequent itemsets, and top rules."""
    payload = _load_cached_artifacts()
    mb = payload["market_basket"]

    # Parse itemset models
    top_itemsets = [
        FrequentItemsetItem(
            itemset=it["itemset"],
            size=it["size"],
            support=it["support"],
            support_pct=it.get("support_pct", round(it["support"] * 100, 2)),
            count=it["count"]
        )
        for it in mb.get("top_itemsets", [])
    ]

    # Parse association rule models
    top_rules = [
        AssociationRuleItem(
            antecedent=r["antecedent"],
            consequent=r["consequent"],
            support=r["support"],
            confidence=r["confidence"],
            lift=r["lift"],
            leverage=r.get("leverage", 0.0),
            conviction=r.get("conviction", 1.0),
            strength=r.get("strength", "Moderate"),
            rule_text=r["rule_text"]
        )
        for r in mb.get("top_rules", [])
    ]

    return AprioriSummaryResponse(
        total_transactions=mb["total_transactions"],
        total_frequent_itemsets=mb["total_frequent_itemsets"],
        total_rules=mb["total_rules"],
        min_support=mb["min_support"],
        min_confidence=mb["min_confidence"],
        max_len=mb["max_len"],
        execution_time_seconds=mb["execution_time_seconds"],
        itemset_counts_by_size=mb.get("itemset_counts_by_size", {}),
        top_itemsets=top_itemsets,
        top_rules=top_rules,
        available_services=payload.get("available_services", [])
    )


def get_frequent_itemsets(
    min_size: int = 1,
    max_size: int = 5,
    limit: int = 100
) -> List[FrequentItemsetItem]:
    """Filters frequent itemsets by size constraints."""
    summary = get_apriori_summary()
    filtered = [
        item for item in summary.top_itemsets
        if min_size <= item.size <= max_size
    ]
    return filtered[:limit]


def get_association_rules(
    min_lift: float = 1.0,
    min_confidence: float = 0.0,
    limit: int = 100
) -> List[AssociationRuleItem]:
    """Filters association rules by minimum lift and confidence thresholds."""
    summary = get_apriori_summary()
    filtered = [
        r for r in summary.top_rules
        if r.lift >= min_lift and r.confidence >= min_confidence
    ]
    return filtered[:limit]


def get_churn_patterns() -> ChurnPatternsResponse:
    """Returns retrospective churn and retention association rules."""
    payload = _load_cached_artifacts()
    cp = payload.get("churn_patterns", {})

    churn_rules = [
        ChurnRuleItem(
            antecedent=r["antecedent"],
            outcome=r["outcome"],
            support=r["support"],
            confidence=r["confidence"],
            lift=r["lift"],
            rule_text=r["rule_text"],
            churn_risk_level=r.get("churn_risk_level", "High Risk")
        )
        for r in cp.get("churn_rules", [])
    ]

    retention_rules = [
        ChurnRuleItem(
            antecedent=r["antecedent"],
            outcome=r["outcome"],
            support=r["support"],
            confidence=r["confidence"],
            lift=r["lift"],
            rule_text=r["rule_text"],
            retention_strength=r.get("retention_strength", "Strong")
        )
        for r in cp.get("retention_rules", [])
    ]

    return ChurnPatternsResponse(
        total_churn_rules=cp.get("total_churn_rules", len(churn_rules)),
        total_retention_rules=cp.get("total_retention_rules", len(retention_rules)),
        min_support=cp.get("min_support", 0.04),
        min_confidence=cp.get("min_confidence", 0.35),
        execution_time_seconds=cp.get("execution_time_seconds", 0.0),
        churn_rules=churn_rules,
        retention_rules=retention_rules
    )


def run_apriori_on_demand(
    min_support: float = 0.12,
    min_confidence: float = 0.38,
    max_len: int = 5
) -> AprioriSummaryResponse:
    """Recomputes Apriori with user-specified parameter thresholds."""
    df = extract_warehouse_data()
    payload = run_and_save_apriori_artifacts(
        df,
        min_support=min_support,
        min_confidence=min_confidence,
        max_len=max_len
    )
    _APRIORI_CACHE["payload"] = payload
    return get_apriori_summary()


def recommend_complementary_services(
    active_services: List[str],
    min_confidence: float = 0.35,
    min_lift: float = 1.05
) -> RecommendationResponse:
    """Generates customer service recommendations using mined association rules."""
    payload = _load_cached_artifacts()
    rules = payload["market_basket"].get("top_rules", [])

    recs = generate_service_recommendations(
        active_services=active_services,
        rules=rules,
        min_confidence=min_confidence,
        min_lift=min_lift
    )

    items = [
        RecommendationItem(
            recommended_service=r["recommended_service"],
            triggering_antecedent=r["triggering_antecedent"],
            confidence=r["confidence"],
            lift=r["lift"],
            support=r["support"],
            strategy=r["strategy"],
            rationale=r["rationale"]
        )
        for r in recs
    ]

    return RecommendationResponse(
        active_services=active_services,
        recommendations_count=len(items),
        recommendations=items
    )


def export_itemsets_to_csv() -> str:
    """Generates CSV representation of frequent itemsets."""
    summary = get_apriori_summary()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["itemset_size", "itemset", "support", "support_pct", "transaction_count"])

    for it in summary.top_itemsets:
        writer.writerow([
            it.size,
            " + ".join(it.itemset),
            f"{it.support:.4f}",
            f"{it.support_pct:.2f}%",
            it.count
        ])

    return output.getvalue()


def export_rules_to_csv() -> str:
    """Generates CSV representation of association rules."""
    summary = get_apriori_summary()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "rule_text", "antecedent", "consequent",
        "support", "confidence", "lift", "leverage", "conviction", "strength"
    ])

    for r in summary.top_rules:
        writer.writerow([
            r.rule_text,
            " + ".join(r.antecedent),
            " + ".join(r.consequent),
            f"{r.support:.4f}",
            f"{r.confidence:.4f}",
            f"{r.lift:.4f}",
            f"{r.leverage:.4f}",
            f"{r.conviction:.4f}",
            r.strength
        ])

    return output.getvalue()

