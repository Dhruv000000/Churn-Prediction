#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/apriori_scratch.py
Purpose: Pure Python/NumPy Implementation of the Apriori Algorithm,
         Frequent Pattern Mining, Association Rule Induction,
         Churn Association Forensics, and Customer Service Recommendations.
         
Academically rigorous implementation:
- NO dependencies on external mining libraries (e.g., mlxtend).
- Explicit candidate generation via (k-1) prefix join (L_{k-1} ⋈ L_{k-1}).
- Candidate pruning enforcing the Apriori Downward Closure Property:
  "All non-empty subsets of a frequent itemset must also be frequent."
- Mathematical metrics: Support, Confidence, Lift, Leverage, Conviction.
"""

import sys
import time
import json
from pathlib import Path
from itertools import combinations
from typing import List, Dict, Set, Tuple, Optional, Any
import numpy as np
import pandas as pd

# Path Resolution
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
SAVED_MODELS_DIR = CURRENT_DIR / "saved_models"

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass


# -----------------------------------------------------------------------------
# TRANSACTION ENCODING UTILITIES
# -----------------------------------------------------------------------------
# Service items mapped strictly to active subscriptions (excluding "No" / "None")
SERVICE_COLUMN_MAPPINGS = [
    ("phone_service", "Yes", "Phone Service"),
    ("multiple_lines", "Yes", "Multiple Lines"),
    ("internet_service", "Fiber optic", "Fiber Optic Internet"),
    ("internet_service", "DSL", "DSL Internet"),
    ("online_security", "Yes", "Online Security"),
    ("online_backup", "Yes", "Online Backup"),
    ("device_protection", "Yes", "Device Protection"),
    ("tech_support", "Yes", "Tech Support"),
    ("streaming_tv", "Yes", "Streaming TV"),
    ("streaming_movies", "Yes", "Streaming Movies"),
]


def encode_service_transactions(df: pd.DataFrame) -> Tuple[List[frozenset], Dict[str, np.ndarray], int]:
    """
    Transforms warehouse subscriber rows into pure Market Basket transactions.
    
    Rules for Transaction Construction:
    1. Each subscriber record represents one transaction.
    2. Only affirmative subscriptions ('Yes', 'Fiber optic', 'DSL') are mapped into items.
    3. Negative attributes ('No', 'No internet service', 'No phone service') are excluded.
    4. Duplicates within a transaction are disallowed by set semantics.
    
    Returns:
    - transactions: List of frozenset of active service items per customer
    - item_bitmasks: Dictionary mapping item -> boolean numpy array of length N
    - total_transactions: N
    """
    n_records = len(df)
    item_bitmasks = {}

    for col, target_val, item_name in SERVICE_COLUMN_MAPPINGS:
        if col in df.columns:
            mask = (df[col].values == target_val)
            item_bitmasks[item_name] = mask

    # Build transaction sets for inspection/testing
    transactions = []
    item_names = list(item_bitmasks.keys())
    for i in range(n_records):
        active = [item for item in item_names if item_bitmasks[item][i]]
        transactions.append(frozenset(active))

    return transactions, item_bitmasks, n_records


def encode_churn_transactions(df: pd.DataFrame) -> Tuple[List[frozenset], Dict[str, np.ndarray], int]:
    """
    Constructs expanded transactions for Retrospective Churn-Pattern Mining.
    Combines service subscriptions, contract types, billing channels, and churn outcomes.
    """
    n_records = len(df)
    item_bitmasks = {}

    # 1. Base Services
    for col, target_val, item_name in SERVICE_COLUMN_MAPPINGS:
        if col in df.columns:
            item_bitmasks[item_name] = (df[col].values == target_val)

    # 2. Contract Types
    if "contract" in df.columns:
        item_bitmasks["Contract: Month-to-month"] = (df["contract"].values == "Month-to-month")
        item_bitmasks["Contract: One year"] = (df["contract"].values == "One year")
        item_bitmasks["Contract: Two year"] = (df["contract"].values == "Two year")

    # 3. Billing & Payment Methods
    if "paperless_billing" in df.columns:
        item_bitmasks["Paperless Billing"] = (df["paperless_billing"].values == "Yes")

    if "payment_method" in df.columns:
        item_bitmasks["Payment: Electronic check"] = (df["payment_method"].values == "Electronic check")
        item_bitmasks["Payment: Mailed check"] = (df["payment_method"].values == "Mailed check")
        item_bitmasks["Payment: Bank transfer"] = (df["payment_method"].values == "Bank transfer (automatic)")
        item_bitmasks["Payment: Credit card"] = (df["payment_method"].values == "Credit card (automatic)")

    # 4. Demographics
    if "senior_citizen" in df.columns:
        item_bitmasks["Senior Citizen"] = (df["senior_citizen"].values == 1)

    # 5. Churn Outcomes (Retrospective Target)
    if "churn_flag" in df.columns:
        item_bitmasks["Outcome: Churned"] = (df["churn_flag"].values == 1)
        item_bitmasks["Outcome: Retained"] = (df["churn_flag"].values == 0)

    # Build transactions
    transactions = []
    item_names = list(item_bitmasks.keys())
    for i in range(n_records):
        active = [item for item in item_names if item_bitmasks[item][i]]
        transactions.append(frozenset(active))

    return transactions, item_bitmasks, n_records


# -----------------------------------------------------------------------------
# CORE APRIORI ALGORITHM ENGINE (FROM SCRATCH)
# -----------------------------------------------------------------------------
class ScratchApriori:
    """
    Academic Pure-Python/NumPy implementation of the classical Apriori Algorithm.
    Demonstrates candidate generation, downward closure pruning, support counting,
    and association rule extraction with confidence and lift.
    """

    def __init__(
        self,
        min_support: float = 0.15,
        min_confidence: float = 0.40,
        max_len: int = 5
    ):
        if not (0.0 < min_support <= 1.0):
            raise ValueError(f"min_support must be in (0.0, 1.0], got {min_support}")
        if not (0.0 < min_confidence <= 1.0):
            raise ValueError(f"min_confidence must be in (0.0, 1.0], got {min_confidence}")
        if max_len < 1:
            raise ValueError(f"max_len must be >= 1, got {max_len}")

        self.min_support = min_support
        self.min_confidence = min_confidence
        self.max_len = max_len

        self.frequent_itemsets_: Dict[frozenset, float] = {}
        self.itemset_counts_: Dict[frozenset, int] = {}
        self.itemset_levels_: Dict[int, List[Dict[str, Any]]] = {}
        self.rules_: List[Dict[str, Any]] = []
        self.total_transactions_: int = 0
        self.execution_time_seconds_: float = 0.0

    @staticmethod
    def _join_step(prev_itemsets: List[List[str]], k: int) -> Set[frozenset]:
        """
        Apriori Join Step (L_{k-1} ⋈ L_{k-1}):
        Joins two frequent (k-1)-itemsets if their first (k-2) items match in lexicographical order.
        Produces candidate k-itemset.
        """
        candidates = set()
        n = len(prev_itemsets)
        for i in range(n):
            for j in range(i + 1, n):
                p, q = prev_itemsets[i], prev_itemsets[j]
                # Compare first k-2 items
                if p[:k - 2] == q[:k - 2]:
                    candidate = frozenset(p).union(frozenset(q))
                    if len(candidate) == k:
                        candidates.add(candidate)
        return candidates

    @staticmethod
    def _prune_step(candidates: Set[frozenset], prev_frequent: Set[frozenset], k: int) -> Set[frozenset]:
        """
        Apriori Pruning Step (Enforcing Downward Closure):
        "If any (k-1)-subset of candidate c is not in L_{k-1}, prune c immediately."
        Avoids unnecessary support counting.
        """
        pruned_candidates = set()
        for cand in candidates:
            cand_items = list(cand)
            all_subsets_frequent = True
            for sub_tuple in combinations(cand_items, k - 1):
                if frozenset(sub_tuple) not in prev_frequent:
                    all_subsets_frequent = False
                    break
            if all_subsets_frequent:
                pruned_candidates.add(cand)
        return pruned_candidates

    def fit(self, item_bitmasks: Dict[str, np.ndarray], total_transactions: int):
        """
        Executes Apriori Frequent Itemset Generation and Association Rule Mining.
        
        Args:
            item_bitmasks: Dict mapping item_name -> np.ndarray of booleans (length N)
            total_transactions: Total subscriber transaction count (N)
        """
        start_time = time.time()
        self.total_transactions_ = total_transactions
        self.frequent_itemsets_.clear()
        self.itemset_counts_.clear()
        self.itemset_levels_.clear()
        self.rules_.clear()

        if total_transactions == 0:
            self.execution_time_seconds_ = 0.0
            return self

        # ---------------------------------------------------------------------
        # STEP 1: Find Frequent 1-Itemsets (L_1)
        # ---------------------------------------------------------------------
        L1: Dict[frozenset, float] = {}
        level_1_items = []

        for item, mask in item_bitmasks.items():
            count = int(np.count_nonzero(mask))
            support = count / total_transactions
            if support >= self.min_support:
                itemset = frozenset([item])
                L1[itemset] = support
                self.frequent_itemsets_[itemset] = support
                self.itemset_counts_[itemset] = count
                level_1_items.append({
                    "itemset": [item],
                    "size": 1,
                    "support": round(support, 4),
                    "support_pct": round(support * 100, 2),
                    "count": count,
                })

        level_1_items.sort(key=lambda x: x["support"], reverse=True)
        self.itemset_levels_[1] = level_1_items

        Lk = L1
        k = 2

        # ---------------------------------------------------------------------
        # STEP 2: Iterative Candidate Generation & Pruning for k = 2..max_len
        # ---------------------------------------------------------------------
        while Lk and k <= self.max_len:
            # Sort items in each itemset for deterministic lexicographical join
            prev_sorted_lists = [sorted(list(x)) for x in Lk.keys()]
            prev_frequent_set = set(Lk.keys())

            # Join Step (L_{k-1} ⋈ L_{k-1})
            candidates = self._join_step(prev_sorted_lists, k)

            # Prune Step (Downward Closure)
            pruned_candidates = self._prune_step(candidates, prev_frequent_set, k)

            # Support Counting via Boolean Bitwise AND
            next_Lk: Dict[frozenset, float] = {}
            level_k_items = []

            for cand in pruned_candidates:
                # Intersect boolean arrays of all items in candidate
                cand_mask = None
                for item in cand:
                    if item in item_bitmasks:
                        if cand_mask is None:
                            cand_mask = item_bitmasks[item].copy()
                        else:
                            cand_mask &= item_bitmasks[item]

                if cand_mask is not None:
                    count = int(np.count_nonzero(cand_mask))
                    support = count / total_transactions
                    if support >= self.min_support:
                        next_Lk[cand] = support
                        self.frequent_itemsets_[cand] = support
                        self.itemset_counts_[cand] = count
                        level_k_items.append({
                            "itemset": sorted(list(cand)),
                            "size": k,
                            "support": round(support, 4),
                            "support_pct": round(support * 100, 2),
                            "count": count,
                        })

            if level_k_items:
                level_k_items.sort(key=lambda x: x["support"], reverse=True)
                self.itemset_levels_[k] = level_k_items

            Lk = next_Lk
            k += 1

        # ---------------------------------------------------------------------
        # STEP 3: Association Rule Induction
        # ---------------------------------------------------------------------
        self._generate_association_rules()
        self.execution_time_seconds_ = round(time.time() - start_time, 4)
        return self

    def _generate_association_rules(self):
        """
        Derives Association Rules (Antecedent -> Consequent) from all frequent itemsets of size >= 2.
        
        Metrics:
        - Support(A -> C) = Support(A ∪ C)
        - Confidence(A -> C) = Support(A ∪ C) / Support(A)
        - Lift(A -> C) = Confidence(A -> C) / Support(C)
        - Leverage(A -> C) = Support(A ∪ C) - (Support(A) * Support(C))
        - Conviction(A -> C) = (1 - Support(C)) / (1 - Confidence(A -> C)) [if Conf < 1.0]
        """
        rules = []

        for itemset, supp_I in self.frequent_itemsets_.items():
            if len(itemset) < 2:
                continue

            items_list = list(itemset)
            # Partition itemset into non-empty Antecedent (A) and Consequent (C)
            for r in range(1, len(items_list)):
                for ant_tuple in combinations(items_list, r):
                    ant = frozenset(ant_tuple)
                    con = itemset - ant

                    supp_A = self.frequent_itemsets_.get(ant, None)
                    supp_C = self.frequent_itemsets_.get(con, None)

                    if supp_A is None or supp_C is None or supp_A == 0 or supp_C == 0:
                        continue

                    conf = supp_I / supp_A
                    if conf >= self.min_confidence:
                        lift = conf / supp_C
                        leverage = supp_I - (supp_A * supp_C)
                        conviction = (
                            round(float((1.0 - supp_C) / (1.0 - conf)), 4)
                            if conf < 0.9999
                            else 999.0
                        )

                        # Qualitative Strength Tag
                        if lift >= 1.5:
                            strength = "High"
                        elif lift >= 1.2:
                            strength = "Moderate"
                        elif lift > 1.0:
                            strength = "Low (Positive)"
                        elif lift == 1.0:
                            strength = "Independent"
                        else:
                            strength = "Negative Correlation"

                        rules.append({
                            "antecedent": sorted(list(ant)),
                            "consequent": sorted(list(con)),
                            "support": round(float(supp_I), 4),
                            "confidence": round(float(conf), 4),
                            "lift": round(float(lift), 4),
                            "leverage": round(float(leverage), 4),
                            "conviction": conviction,
                            "strength": strength,
                            "rule_text": f"If {' + '.join(sorted(list(ant)))} -> Then {' + '.join(sorted(list(con)))}",
                        })

        # Rank by Lift descending, then Confidence descending
        rules.sort(key=lambda r: (r["lift"], r["confidence"]), reverse=True)
        self.rules_ = rules

    def get_summary(self) -> Dict[str, Any]:
        """Returns structured JSON summary of mining results."""
        all_itemsets = []
        for lvl in sorted(self.itemset_levels_.keys()):
            all_itemsets.extend(self.itemset_levels_[lvl])

        return {
            "total_transactions": self.total_transactions_,
            "total_frequent_itemsets": len(self.frequent_itemsets_),
            "total_rules": len(self.rules_),
            "min_support": self.min_support,
            "min_confidence": self.min_confidence,
            "max_len": self.max_len,
            "execution_time_seconds": self.execution_time_seconds_,
            "itemset_counts_by_size": {
                size: len(items) for size, items in self.itemset_levels_.items()
            },
            "top_itemsets": all_itemsets[:25],
            "top_rules": self.rules_[:50],
        }


# -----------------------------------------------------------------------------
# RETROSPECTIVE CHURN PATTERN MINING
# -----------------------------------------------------------------------------
def mine_churn_patterns(
    df: pd.DataFrame,
    min_support: float = 0.04,
    min_confidence: float = 0.35,
    max_len: int = 4
) -> Dict[str, Any]:
    """
    Executes Apriori on enriched transactions to uncover billing & service
    combinations strongly associated with customer churn or retention.
    
    Academic Clarification:
    This is a retrospective descriptive analysis. Association does not imply causation.
    It identifies high-risk behavioral baskets, not a replacement for predictive classification.
    """
    start_time = time.time()
    _, item_bitmasks, total_tx = encode_churn_transactions(df)

    if total_tx == 0:
        return {"churn_rules": [], "retention_rules": [], "execution_time": 0.0}

    # Mutual exclusion rules during candidate generation to prune invalid combinations
    apriori = ScratchApriori(
        min_support=min_support,
        min_confidence=min_confidence,
        max_len=max_len
    )
    apriori.fit(item_bitmasks, total_tx)

    churn_rules = []
    retention_rules = []

    for rule in apriori.rules_:
        consequent = rule["consequent"]
        antecedent = rule["antecedent"]

        # Only consider single-target outcome rules
        if consequent == ["Outcome: Churned"]:
            # Clean up antecedent labels for display
            clean_ant = [x for x in antecedent if not x.startswith("Outcome:")]
            if clean_ant:
                churn_rules.append({
                    "antecedent": clean_ant,
                    "outcome": "Churned",
                    "support": rule["support"],
                    "confidence": rule["confidence"],
                    "lift": rule["lift"],
                    "rule_text": f"{' + '.join(clean_ant)} -> Churned",
                    "churn_risk_level": "Critical Risk" if rule["confidence"] >= 0.70 else "High Risk"
                })
        elif consequent == ["Outcome: Retained"]:
            clean_ant = [x for x in antecedent if not x.startswith("Outcome:")]
            if clean_ant:
                retention_rules.append({
                    "antecedent": clean_ant,
                    "outcome": "Retained",
                    "support": rule["support"],
                    "confidence": rule["confidence"],
                    "lift": rule["lift"],
                    "rule_text": f"{' + '.join(clean_ant)} -> Retained",
                    "retention_strength": "Very Strong" if rule["confidence"] >= 0.90 else "Strong"
                })

    churn_rules.sort(key=lambda r: (r["lift"], r["confidence"]), reverse=True)
    retention_rules.sort(key=lambda r: (r["lift"], r["confidence"]), reverse=True)

    return {
        "total_churn_rules": len(churn_rules),
        "total_retention_rules": len(retention_rules),
        "min_support": min_support,
        "min_confidence": min_confidence,
        "execution_time_seconds": round(time.time() - start_time, 4),
        "churn_rules": churn_rules[:30],
        "retention_rules": retention_rules[:30],
    }


# -----------------------------------------------------------------------------
# CUSTOMER SERVICE RECOMMENDATION ENGINE
# -----------------------------------------------------------------------------
def generate_service_recommendations(
    active_services: List[str],
    rules: List[Dict[str, Any]],
    min_confidence: float = 0.35,
    min_lift: float = 1.05
) -> List[Dict[str, Any]]:
    """
    Recommends complementary telecom services based on discovered association rules.
    
    Principles:
    1. Recommends ONLY services the customer does not currently have.
    2. Antecedent must be a subset of the customer's active services.
    3. Consequent must contain at least one new service.
    4. Ranks suggestions by rule confidence and lift.
    5. Categorizes recommendation into 'Cross-Sell Bundle' vs 'Retention Shield'.
    """
    active_set = set(active_services)
    recommendations_map: Dict[str, Dict[str, Any]] = {}

    for rule in rules:
        ant = set(rule["antecedent"])
        con = set(rule["consequent"])

        # Check if customer satisfies antecedent
        if ant.issubset(active_set):
            candidate_items = con - active_set
            if candidate_items and rule["confidence"] >= min_confidence and rule["lift"] >= min_lift:
                for item in candidate_items:
                    # Ignore non-service items if present
                    if item.startswith("Contract:") or item.startswith("Payment:") or item.startswith("Outcome:"):
                        continue

                    # Retention shield vs Cross-sell bundle
                    strategy = "Retention Shield" if item in ["Online Security", "Tech Support", "Device Protection"] else "Cross-Sell Bundle"
                    rationale = f"Based on rule: ({' + '.join(sorted(list(ant)))}) -> {item} with {rule['confidence']*100:.1f}% confidence and {rule['lift']:.2f}x lift."

                    if item not in recommendations_map or rule["lift"] > recommendations_map[item]["lift"]:
                        recommendations_map[item] = {
                            "recommended_service": item,
                            "triggering_antecedent": sorted(list(ant)),
                            "confidence": rule["confidence"],
                            "lift": rule["lift"],
                            "support": rule["support"],
                            "strategy": strategy,
                            "rationale": rationale,
                        }

    results = list(recommendations_map.values())
    results.sort(key=lambda r: (r["lift"], r["confidence"]), reverse=True)
    return results


# -----------------------------------------------------------------------------
# PERSISTENCE & PIPELINE EXECUTION
# -----------------------------------------------------------------------------
def run_and_save_apriori_artifacts(
    df: pd.DataFrame,
    min_support: float = 0.12,
    min_confidence: float = 0.38,
    max_len: int = 5
) -> Dict[str, Any]:
    """
    Runs full Apriori Market Basket Analysis and Churn Association Pattern Mining,
    saving structured JSON artifacts for consumption by FastAPI backend and React frontend.
    """
    print("\n" + "=" * 82)
    print("  TASK: FROM-SCRATCH APRIORI MARKET BASKET & PATTERN MINING ENGINE")
    print("=" * 82)

    # 1. Market Basket Mining on Service Catalog
    print(f"\n[APRIORI] Encoding service transactions (min_support={min_support}, min_confidence={min_confidence})...")
    _, service_masks, n_tx = encode_service_transactions(df)
    print(f"[ENCODE] Enrolled {n_tx:,} transactions across {len(service_masks)} service categories.")

    apriori = ScratchApriori(
        min_support=min_support,
        min_confidence=min_confidence,
        max_len=max_len
    )
    apriori.fit(service_masks, n_tx)
    summary = apriori.get_summary()

    print(f"[APRIORI] Convergence in {summary['execution_time_seconds']}s:")
    print(f"   * Frequent Itemsets Found: {summary['total_frequent_itemsets']}")
    print(f"   * Association Rules Induced: {summary['total_rules']}")

    # 2. Retrospective Churn Association Mining
    print("\n[CHURN FORENSICS] Mining billing, contract, and churn association patterns...")
    churn_patterns = mine_churn_patterns(
        df,
        min_support=0.04,
        min_confidence=0.35,
        max_len=4
    )
    print(f"[CHURN FORENSICS] Extracted {churn_patterns['total_churn_rules']} Churn Rules and {churn_patterns['total_retention_rules']} Retention Rules.")

    # 3. Serialize artifacts to JSON
    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SAVED_MODELS_DIR / "apriori_summary.json"

    payload = {
        "market_basket": summary,
        "churn_patterns": churn_patterns,
        "available_services": list(service_masks.keys()),
        "generated_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"\n[PERSISTENCE] Successfully serialized Apriori artifacts to: {out_path}")
    print("=" * 82)
    return payload


if __name__ == "__main__":
    from feature_extractor import extract_warehouse_data

    print("[INITIALIZATION] Extracting Star Schema records from Analytical Warehouse...")
    df_wh = extract_warehouse_data()
    run_and_save_apriori_artifacts(df_wh)

