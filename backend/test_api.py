#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Script:  backend/test_api.py
Purpose: Comprehensive Integration Test Suite for FastAPI Analytical,
         Data Mining, and Apriori Market Basket Analysis Endpoints.
"""

import sys
import json
import time
from pathlib import Path

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from fastapi.testclient import TestClient
from app.main import app


def run_api_tests():
    print("=" * 82)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  FastAPI Analytical, Supervised ML & Apriori Mining Test Suite")
    print("=" * 82)

    client = TestClient(app)
    tests_passed = 0
    summary_results = []

    # -------------------------------------------------------------------------
    # TEST 1: System Health Check
    # -------------------------------------------------------------------------
    print("\n[TEST 1] GET /health (Liveness Probe)")
    r1 = client.get("/health")
    d1 = r1.json()
    status1 = "[PASS]" if r1.status_code == 200 and d1.get("status") == "healthy" else "[FAIL]"
    print(f"  Status : {r1.status_code} {status1}")
    print(f"  Payload: Service: '{d1.get('service')}' | Status: '{d1.get('status')}'")
    summary_results.append(("GET /health", r1.status_code, "status: healthy", status1))
    if status1 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 2: Executive Warehouse KPIs
    # -------------------------------------------------------------------------
    print("\n[TEST 2] GET /api/dwh/kpis (Executive Star Schema KPIs)")
    r2 = client.get("/api/dwh/kpis")
    d2 = r2.json()
    status2 = "[PASS]" if r2.status_code == 200 and d2.get("total_subscribers", 0) > 0 else "[FAIL]"
    print(f"  Status : {r2.status_code} {status2}")
    print(f"  Payload: Subscribers: {d2.get('total_subscribers'):,} | Churn Rate: {d2.get('overall_churn_rate')}% | Total ARR: ${d2.get('total_arr'):,.2f}")
    summary_results.append(("GET /api/dwh/kpis", r2.status_code, f"{d2.get('total_subscribers'):,} subscribers", status2))
    if status2 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 3: Contract & Service Rollup
    # -------------------------------------------------------------------------
    print("\n[TEST 3] GET /api/dwh/contract-analysis (Multidimensional Rollup)")
    r3 = client.get("/api/dwh/contract-analysis")
    d3 = r3.json()
    status3 = "[PASS]" if r3.status_code == 200 and isinstance(d3, list) and len(d3) > 0 else "[FAIL]"
    print(f"  Status : {r3.status_code} {status3}")
    summary_results.append(("GET /api/dwh/contract-analysis", r3.status_code, f"{len(d3)} rollup tiers", status3))
    if status3 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 4: Payment Channel Slicing
    # -------------------------------------------------------------------------
    print("\n[TEST 4] GET /api/dwh/payment-analysis (Payment Method Churn Slice)")
    r4 = client.get("/api/dwh/payment-analysis")
    d4 = r4.json()
    status4 = "[PASS]" if r4.status_code == 200 and isinstance(d4, list) and len(d4) > 0 else "[FAIL]"
    print(f"  Status : {r4.status_code} {status4}")
    summary_results.append(("GET /api/dwh/payment-analysis", r4.status_code, f"{len(d4)} payment methods", status4))
    if status4 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 5: K-Means Clusters & Personas
    # -------------------------------------------------------------------------
    print("\n[TEST 5] GET /api/mining/clusters (K-Means Centroids & Scatter Points)")
    r5 = client.get("/api/mining/clusters?sample_size=500")
    d5 = r5.json()
    status5 = "[PASS]" if r5.status_code == 200 and len(d5.get("personas", [])) == 4 and len(d5.get("scatter_sample", [])) > 0 else "[FAIL]"
    print(f"  Status : {r5.status_code} {status5}")
    summary_results.append(("GET /api/mining/clusters", r5.status_code, f"K={d5.get('n_clusters')} personas", status5))
    if status5 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 6: WCSS Elbow Curve
    # -------------------------------------------------------------------------
    print("\n[TEST 6] GET /api/mining/elbow (WCSS Inertia Curve)")
    r6 = client.get("/api/mining/elbow")
    d6 = r6.json()
    status6 = "[PASS]" if r6.status_code == 200 and len(d6.get("elbow_points", [])) >= 4 else "[FAIL]"
    print(f"  Status : {r6.status_code} {status6}")
    summary_results.append(("GET /api/mining/elbow", r6.status_code, f"K={d6.get('optimal_k')} optimal", status6))
    if status6 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 7: Champion Classifier Metrics (Logistic Regression)
    # -------------------------------------------------------------------------
    print("\n[TEST 7] GET /api/mining/metrics (Champion Classifier Evaluation)")
    r7 = client.get("/api/mining/metrics")
    d7 = r7.json()
    status7 = "[PASS]" if r7.status_code == 200 and d7.get("roc_auc", 0) >= 0.85 and d7.get("model_type") == "Logistic Regression" else "[FAIL]"
    print(f"  Status : {r7.status_code} {status7}")
    print(f"  Payload: Model: {d7.get('model_type')} | ROC-AUC: {d7.get('roc_auc')} | Recall: {d7.get('recall')}")
    summary_results.append(("GET /api/mining/metrics", r7.status_code, f"ROC-AUC: {d7.get('roc_auc')}", status7))
    if status7 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 8: Real-Time Churn Scoring & Dynamic Discount
    # -------------------------------------------------------------------------
    print("\n[TEST 8] POST /api/mining/predict (Single Customer Churn Scoring)")
    customer_payload = {
        "tenure_months": 3,
        "monthly_charges": 89.5,
        "contract": "Month-to-month",
        "internet_service": "Fiber optic",
        "payment_method": "Electronic check",
        "tech_support": "No",
        "online_security": "No",
        "senior_citizen": 0,
        "paperless_billing": "Yes",
        "partner": "No",
        "dependents": "No",
        "phone_service": "Yes",
        "multiple_lines": "No"
    }
    r8 = client.post("/api/mining/predict", json=customer_payload)
    d8 = r8.json()
    status8 = "[PASS]" if r8.status_code == 200 and d8.get("churn_prediction") in [0, 1] and 0.0 <= d8.get("churn_probability", -1) <= 1.0 else "[FAIL]"
    print(f"  Status : {r8.status_code} {status8}")
    print(f"  Payload: Probability: {d8.get('churn_probability')} | Tier: {d8.get('churn_risk_tier')} | Discount: {d8.get('discount_percentage')}% | Model: {d8.get('model_used')}")
    summary_results.append(("POST /api/mining/predict", r8.status_code, f"Risk: {d8.get('churn_risk_tier')}", status8))
    if status8 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 9: Apriori Market Basket Summary
    # -------------------------------------------------------------------------
    print("\n[TEST 9] GET /api/mining/apriori/summary (Apriori Diagnostic Summary)")
    r9 = client.get("/api/mining/apriori/summary")
    d9 = r9.json()
    status9 = "[PASS]" if r9.status_code == 200 and d9.get("total_frequent_itemsets", 0) > 0 and d9.get("total_rules", 0) > 0 else "[FAIL]"
    print(f"  Status : {r9.status_code} {status9}")
    print(f"  Payload: Transactions: {d9.get('total_transactions'):,} | Frequent Itemsets: {d9.get('total_frequent_itemsets')} | Rules: {d9.get('total_rules')}")
    summary_results.append(("GET /api/mining/apriori/summary", r9.status_code, f"{d9.get('total_rules')} rules", status9))
    if status9 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 10: On-Demand Apriori Execution
    # -------------------------------------------------------------------------
    print("\n[TEST 10] POST /api/mining/apriori/run (On-Demand Apriori with Custom Thresholds)")
    r10 = client.post("/api/mining/apriori/run", json={"min_support": 0.15, "min_confidence": 0.40, "max_len": 4})
    d10 = r10.json()
    status10 = "[PASS]" if r10.status_code == 200 and d10.get("min_support") == 0.15 else "[FAIL]"
    print(f"  Status : {r10.status_code} {status10}")
    print(f"  Payload: Runtime: {d10.get('execution_time_seconds')}s | Frequent Itemsets: {d10.get('total_frequent_itemsets')}")
    summary_results.append(("POST /api/mining/apriori/run", r10.status_code, f"runtime: {d10.get('execution_time_seconds')}s", status10))
    if status10 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 11: Filtered Frequent Itemsets
    # -------------------------------------------------------------------------
    print("\n[TEST 11] GET /api/mining/apriori/itemsets (Filtered Itemsets)")
    r11 = client.get("/api/mining/apriori/itemsets?min_size=2&max_size=3&limit=20")
    d11 = r11.json()
    status11 = "[PASS]" if r11.status_code == 200 and isinstance(d11, list) and len(d11) > 0 else "[FAIL]"
    print(f"  Status : {r11.status_code} {status11}")
    print(f"  Payload: Returned {len(d11)} itemsets | First: {d11[0].get('itemset')} (Supp: {d11[0].get('support_pct')}%)")
    summary_results.append(("GET /api/mining/apriori/itemsets", r11.status_code, f"{len(d11)} itemsets", status11))
    if status11 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 12: Filtered Association Rules
    # -------------------------------------------------------------------------
    print("\n[TEST 12] GET /api/mining/apriori/rules (Filtered Rules by Lift & Confidence)")
    r12 = client.get("/api/mining/apriori/rules?min_lift=1.1&min_confidence=0.40&limit=20")
    d12 = r12.json()
    status12 = "[PASS]" if r12.status_code == 200 and isinstance(d12, list) and len(d12) > 0 else "[FAIL]"
    print(f"  Status : {r12.status_code} {status12}")
    top_r = d12[0] if d12 else {}
    print(f"  Payload: Returned {len(d12)} rules | Top: {top_r.get('rule_text')} (Lift: {top_r.get('lift')}x)")
    summary_results.append(("GET /api/mining/apriori/rules", r12.status_code, f"{len(d12)} rules", status12))
    if status12 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 13: Retrospective Churn Pattern Association Rules
    # -------------------------------------------------------------------------
    print("\n[TEST 13] GET /api/mining/apriori/churn-rules (Churn Pattern Mining)")
    r13 = client.get("/api/mining/apriori/churn-rules")
    d13 = r13.json()
    status13 = "[PASS]" if r13.status_code == 200 and len(d13.get("churn_rules", [])) > 0 and len(d13.get("retention_rules", [])) > 0 else "[FAIL]"
    print(f"  Status : {r13.status_code} {status13}")
    print(f"  Payload: Churn Rules: {d13.get('total_churn_rules')} | Retention Rules: {d13.get('total_retention_rules')}")
    summary_results.append(("GET /api/mining/apriori/churn-rules", r13.status_code, f"{d13.get('total_churn_rules')} churn rules", status13))
    if status13 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 14: Customer Service Recommendation Engine
    # -------------------------------------------------------------------------
    print("\n[TEST 14] POST /api/mining/apriori/recommend (Complementary Addon Suggestions)")
    r14 = client.post("/api/mining/apriori/recommend", json={"active_services": ["Streaming TV", "Fiber Optic Internet"]})
    d14 = r14.json()
    status14 = "[PASS]" if r14.status_code == 200 and isinstance(d14.get("recommendations"), list) else "[FAIL]"
    print(f"  Status : {r14.status_code} {status14}")
    rec_sample = d14["recommendations"][0] if d14["recommendations"] else {}
    print(f"  Payload: Recommendations: {d14.get('recommendations_count')} | Top: {rec_sample.get('recommended_service')} ({rec_sample.get('strategy')})")
    summary_results.append(("POST /api/mining/apriori/recommend", r14.status_code, f"{d14.get('recommendations_count')} recommendations", status14))
    if status14 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 15: CSV Export of Frequent Itemsets
    # -------------------------------------------------------------------------
    print("\n[TEST 15] GET /api/mining/apriori/export/itemsets (CSV Streaming)")
    r15 = client.get("/api/mining/apriori/export/itemsets")
    status15 = "[PASS]" if r15.status_code == 200 and "text/csv" in r15.headers.get("content-type", "") and "itemset" in r15.text else "[FAIL]"
    print(f"  Status : {r15.status_code} {status15}")
    print(f"  Payload: CSV Export ({len(r15.text.splitlines())} rows including header)")
    summary_results.append(("GET /api/mining/apriori/export/itemsets", r15.status_code, "text/csv stream", status15))
    if status15 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 16: CSV Export of Association Rules
    # -------------------------------------------------------------------------
    print("\n[TEST 16] GET /api/mining/apriori/export/rules (CSV Streaming)")
    r16 = client.get("/api/mining/apriori/export/rules")
    status16 = "[PASS]" if r16.status_code == 200 and "text/csv" in r16.headers.get("content-type", "") and "antecedent" in r16.text else "[FAIL]"
    print(f"  Status : {r16.status_code} {status16}")
    print(f"  Payload: CSV Export ({len(r16.text.splitlines())} rows including header)")
    summary_results.append(("GET /api/mining/apriori/export/rules", r16.status_code, "text/csv stream", status16))
    if status16 == "[PASS]": tests_passed += 1

    total_tests = len(summary_results)

    # -------------------------------------------------------------------------
    # FINAL SCORECARD
    # -------------------------------------------------------------------------
    print("\n" + "=" * 82)
    print("                    AUTOMATED TEST SCORECARD MATRIX")
    print("=" * 82)
    print(f"{'Endpoint':<42} | {'HTTP':<5} | {'Verification':<20} | {'Result':<6}")
    print("-" * 82)
    for route, code, note, res in summary_results:
        print(f"{route:<42} | {code:<5} | {note:<20} | {res:<6}")
    print("=" * 82)
    print(f"  Final API Verification: {tests_passed} of {total_tests} Tests Passed ({(tests_passed/total_tests)*100:.1f}%)")
    print("=" * 82)

    return tests_passed == total_tests


if __name__ == "__main__":
    success = run_api_tests()
    sys.exit(0 if success else 1)
