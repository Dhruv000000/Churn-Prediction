#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/test_apriori.py
Purpose: Comprehensive Test Suite for From-Scratch Apriori Engine,
         Candidate Generation, Downward Closure Pruning, Rule Induction,
         Churn Forensics, Recommendations, and Edge Cases.
"""

import sys
import unittest
from pathlib import Path
import numpy as np
import pandas as pd

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from apriori_scratch import (
    ScratchApriori,
    encode_service_transactions,
    encode_churn_transactions,
    mine_churn_patterns,
    generate_service_recommendations
)


class TestAprioriEngine(unittest.TestCase):
    """Rigorous unit tests for the pure Python/NumPy Apriori implementation."""

    def setUp(self):
        # Synthetic mini-database for deterministic mathematical verification:
        # Transactions:
        # T1: {A, B, C}
        # T2: {A, C}
        # T3: {A, D}
        # T4: {B, E, F}
        # T5: {A, B, C, E}
        # Total = 5 transactions
        # Support counts:
        # A: 4/5 (0.8), B: 3/5 (0.6), C: 3/5 (0.6), D: 1/5 (0.2), E: 2/5 (0.4), F: 1/5 (0.2)
        # {A, B}: 2/5 (0.4), {A, C}: 3/5 (0.6), {B, C}: 2/5 (0.4), {A, B, C}: 2/5 (0.4)
        self.total_tx = 5
        self.item_bitmasks = {
            "ItemA": np.array([True, True, True, False, True], dtype=bool),
            "ItemB": np.array([True, False, False, True, True], dtype=bool),
            "ItemC": np.array([True, True, False, False, True], dtype=bool),
            "ItemD": np.array([False, False, True, False, False], dtype=bool),
            "ItemE": np.array([False, False, False, True, True], dtype=bool),
            "ItemF": np.array([False, False, False, True, False], dtype=bool),
        }

    def test_l1_frequent_itemsets(self):
        """Tests that frequent 1-itemsets match mathematical support thresholds."""
        apriori = ScratchApriori(min_support=0.5, min_confidence=0.5, max_len=3)
        apriori.fit(self.item_bitmasks, self.total_tx)

        # At min_support=0.5, only A (0.8), B (0.6), C (0.6) are >= 0.5
        frequent_1 = apriori.itemset_levels_.get(1, [])
        items_1 = {tuple(x["itemset"]) for x in frequent_1}
        self.assertEqual(items_1, {("ItemA",), ("ItemB",), ("ItemC",)})

    def test_apriori_pruning_downward_closure(self):
        """
        Tests the Apriori Downward Closure Property:
        If an item is infrequent (e.g., ItemD with support 0.2 < 0.5),
        any candidate containing ItemD must be pruned before counting.
        """
        apriori = ScratchApriori(min_support=0.5, min_confidence=0.5, max_len=3)
        apriori.fit(self.item_bitmasks, self.total_tx)

        for itemset in apriori.frequent_itemsets_.keys():
            self.assertNotIn("ItemD", itemset)
            self.assertNotIn("ItemF", itemset)

    def test_candidate_join_step(self):
        """Verifies candidate join (L_{k-1} ⋈ L_{k-1}) generates valid supersets."""
        prev_items = [["ItemA"], ["ItemB"], ["ItemC"]]
        candidates = ScratchApriori._join_step(prev_items, k=2)
        expected = {
            frozenset(["ItemA", "ItemB"]),
            frozenset(["ItemA", "ItemC"]),
            frozenset(["ItemB", "ItemC"]),
        }
        self.assertEqual(candidates, expected)

    def test_support_confidence_lift_calculation(self):
        """
        Tests exact numerical accuracy of Support, Confidence, and Lift:
        For rule {ItemA} -> {ItemC}:
        Support(A ∪ C) = 3/5 = 0.60
        Support(A) = 4/5 = 0.80
        Support(C) = 3/5 = 0.60
        Confidence(A -> C) = 0.60 / 0.80 = 0.75
        Lift(A -> C) = 0.75 / 0.60 = 1.25
        """
        apriori = ScratchApriori(min_support=0.4, min_confidence=0.5, max_len=2)
        apriori.fit(self.item_bitmasks, self.total_tx)

        target_rule = None
        for r in apriori.rules_:
            if r["antecedent"] == ["ItemA"] and r["consequent"] == ["ItemC"]:
                target_rule = r
                break

        self.assertIsNotNone(target_rule, "Rule {ItemA} -> {ItemC} not found!")
        self.assertAlmostEqual(target_rule["support"], 0.60, places=3)
        self.assertAlmostEqual(target_rule["confidence"], 0.75, places=3)
        self.assertAlmostEqual(target_rule["lift"], 1.25, places=3)

    def test_edge_case_empty_transactions(self):
        """Verifies graceful handling when transaction count is zero."""
        apriori = ScratchApriori(min_support=0.1, min_confidence=0.1)
        apriori.fit({}, total_transactions=0)
        self.assertEqual(len(apriori.frequent_itemsets_), 0)
        self.assertEqual(len(apriori.rules_), 0)

    def test_edge_case_high_support_no_frequent_items(self):
        """Verifies that an impossibly high min_support returns empty itemsets without crash."""
        apriori = ScratchApriori(min_support=0.99, min_confidence=0.5)
        apriori.fit(self.item_bitmasks, self.total_tx)
        self.assertEqual(len(apriori.frequent_itemsets_), 0)
        self.assertEqual(len(apriori.rules_), 0)

    def test_invalid_parameters_raise_error(self):
        """Verifies that out-of-range thresholds raise clear ValueErrors."""
        with self.assertRaises(ValueError):
            ScratchApriori(min_support=-0.1)
        with self.assertRaises(ValueError):
            ScratchApriori(min_support=1.5)
        with self.assertRaises(ValueError):
            ScratchApriori(min_confidence=0.0)
        with self.assertRaises(ValueError):
            ScratchApriori(max_len=0)

    def test_transaction_encoding(self):
        """Tests that negative or empty services are not encoded as items."""
        mock_df = pd.DataFrame({
            "phone_service": ["Yes", "No"],
            "multiple_lines": ["No", "Yes"],
            "internet_service": ["Fiber optic", "No"],
            "online_security": ["No", "No internet service"],
            "streaming_tv": ["Yes", "No"],
        })
        tx, masks, n = encode_service_transactions(mock_df)
        self.assertEqual(n, 2)
        # Row 0: Phone Service, Fiber Optic Internet, Streaming TV
        self.assertEqual(tx[0], frozenset(["Phone Service", "Fiber Optic Internet", "Streaming TV"]))
        # Row 1: Multiple Lines only (phone_service is No, online_security is No internet service)
        self.assertEqual(tx[1], frozenset(["Multiple Lines"]))

    def test_churn_pattern_mining(self):
        """Verifies that churn patterns partition rules into Churned vs Retained."""
        mock_df = pd.DataFrame({
            "phone_service": ["Yes", "Yes", "Yes", "Yes"],
            "internet_service": ["Fiber optic", "Fiber optic", "DSL", "DSL"],
            "contract": ["Month-to-month", "Month-to-month", "Two year", "Two year"],
            "payment_method": ["Electronic check", "Electronic check", "Bank transfer", "Credit card"],
            "churn_flag": [1, 1, 0, 0]
        })
        patterns = mine_churn_patterns(mock_df, min_support=0.25, min_confidence=0.5)
        self.assertIn("churn_rules", patterns)
        self.assertIn("retention_rules", patterns)
        # Should detect Month-to-month -> Churned with 100% confidence
        churn_rules = patterns["churn_rules"]
        has_month_to_month_churn = any("Contract: Month-to-month" in r["antecedent"] for r in churn_rules)
        self.assertTrue(has_month_to_month_churn)

    def test_service_recommendation_engine(self):
        """Verifies that recommendations only suggest unadopted services."""
        rules = [
            {
                "antecedent": ["Streaming TV"],
                "consequent": ["Streaming Movies"],
                "confidence": 0.80,
                "lift": 1.75,
                "support": 0.20,
            },
            {
                "antecedent": ["Fiber Optic Internet"],
                "consequent": ["Online Security"],
                "confidence": 0.60,
                "lift": 1.40,
                "support": 0.15,
            }
        ]
        # Customer already has Streaming TV and Streaming Movies, but lacks Online Security
        recs = generate_service_recommendations(
            active_services=["Streaming TV", "Streaming Movies", "Fiber Optic Internet"],
            rules=rules,
            min_confidence=0.5,
            min_lift=1.1
        )
        rec_names = [r["recommended_service"] for r in recs]
        self.assertIn("Online Security", rec_names)
        self.assertNotIn("Streaming Movies", rec_names, "Should not recommend an already active service!")


if __name__ == "__main__":
    unittest.main()
