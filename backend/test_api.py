#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Script:  backend/test_api.py
Purpose: Comprehensive Test Suite for FastAPI Analytical & Data Mining Endpoints.
         Executes automated integration tests verifying HTTP 200 OK responses
         and JSON schema validity across all DWH and Mining routes.
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

# Add backend directory to sys.path so app can be imported
CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from fastapi.testclient import TestClient
from app.main import app


def run_api_tests():
    print("=" * 82)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  Task 5: FastAPI Analytical & Data Mining API Test Suite")
    print("=" * 82)

    client = TestClient(app)
    tests_passed = 0
    total_tests = 10
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
    sample_tier = d3[0] if d3 else {}
    print(f"  Payload: {len(d3)} Rollup Tiers | First: '{sample_tier.get('contract_tier')}' x '{sample_tier.get('internet_service_type')}' (Churn: {sample_tier.get('churn_rate_pct')}%)")
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
    highest_risk_method = d4[0] if d4 else {}
    print(f"  Payload: {len(d4)} Channels | Highest Churn: '{highest_risk_method.get('payment_method')}' ({highest_risk_method.get('churn_rate_pct')}%)")
    summary_results.append(("GET /api/dwh/payment-analysis", r4.status_code, f"{len(d4)} payment methods", status4))
    if status4 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 5: K-Means Clusters & Scatter Samples
    # -------------------------------------------------------------------------
    print("\n[TEST 5] GET /api/mining/clusters (K-Means Centroids & Scatter Points)")
    r5 = client.get("/api/mining/clusters?sample_size=500")
    d5 = r5.json()
    status5 = "[PASS]" if r5.status_code == 200 and len(d5.get("personas", [])) == 4 and len(d5.get("scatter_sample", [])) > 0 else "[FAIL]"
    print(f"  Status : {r5.status_code} {status5}")
    print(f"  Payload: Optimal K: {d5.get('n_clusters')} | Personas: {len(d5.get('personas', []))} | Scatter Points: {len(d5.get('scatter_sample', [])):,}")
    for p in d5.get("personas", [])[:2]:
        print(f"           - {p['persona_name']}: Tenure = {p['centroid_tenure_months']} mos | Monthly = ${p['centroid_monthly_charges']}")
    summary_results.append(("GET /api/mining/clusters", r5.status_code, f"K={d5.get('n_clusters')}, {len(d5.get('scatter_sample', []))} points", status5))
    if status5 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 6: WCSS Elbow Curve Points
    # -------------------------------------------------------------------------
    print("\n[TEST 6] GET /api/mining/elbow (WCSS Elbow Curve)")
    r6 = client.get("/api/mining/elbow")
    d6 = r6.json()
    status6 = "[PASS]" if r6.status_code == 200 and len(d6.get("elbow_points", [])) >= 4 else "[FAIL]"
    print(f"  Status : {r6.status_code} {status6}")
    pts = [f"K={p['k']}: {p['wcss']:,.0f}" for p in d6.get("elbow_points", [])]
    print(f"  Payload: Optimal K: {d6.get('optimal_k')} | Curve: {', '.join(pts)}")
    summary_results.append(("GET /api/mining/elbow", r6.status_code, f"Optimal K={d6.get('optimal_k')}", status6))
    if status6 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 7: Supervised Model Holdout Metrics & Gini Feature Rankings
    # -------------------------------------------------------------------------
    print("\n[TEST 7] GET /api/mining/metrics (Random Forest Holdout Evaluation)")
    r7 = client.get("/api/mining/metrics")
    d7 = r7.json()
    status7 = "[PASS]" if r7.status_code == 200 and d7.get("roc_auc", 0) > 0.75 else "[FAIL]"
    print(f"  Status : {r7.status_code} {status7}")
    print(f"  Payload: Model: '{d7.get('model_type')}' | ROC-AUC: {d7.get('roc_auc')} | Recall: {d7.get('recall') * 100:.2f}% | F1: {d7.get('f1_score') * 100:.2f}%")
    top_feature = d7.get("top_features", [{}])[0]
    print(f"           Top Feature: '{top_feature.get('feature')}' ({top_feature.get('importance_pct')}%)")
    summary_results.append(("GET /api/mining/metrics", r7.status_code, f"ROC-AUC: {d7.get('roc_auc')}", status7))
    if status7 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 8: Real-Time Churn Scoring & Dynamic Discount Engine (High-Risk Profile)
    # -------------------------------------------------------------------------
    print("\n[TEST 8] POST /api/mining/predict (Real-Time Customer Scoring & Dynamic Discount)")
    high_risk_payload = {
        "tenure_months": 2,
        "monthly_charges": 89.50,
        "total_charges": 179.00,
        "contract": "Month-to-month",
        "internet_service": "Fiber optic",
        "payment_method": "Electronic check",
        "tech_support": "No",
        "online_security": "No",
        "streaming_tv": "Yes",
        "streaming_movies": "Yes",
        "senior_citizen": 0,
        "gender": "Female",
        "partner": "No",
        "dependents": "No",
        "phone_service": "Yes",
        "multiple_lines": "No",
        "online_backup": "No",
        "device_protection": "No",
        "paperless_billing": "Yes",
        "model_name": "Random Forest"
    }

    r8 = client.post("/api/mining/predict", json=high_risk_payload)
    d8 = r8.json()
    status8 = "[PASS]" if r8.status_code == 200 and d8.get("churn_probability", 0) > 0.60 and "discount_percentage" in d8 else "[FAIL]"
    print(f"  Status : {r8.status_code} {status8}")
    print(f"  Payload: Churn Probability: {d8.get('churn_probability') * 100:.2f}% | Risk Tier: '{d8.get('churn_risk_tier')}' | Prediction: {d8.get('churn_prediction')}")
    print(f"           Discount Engine: {d8.get('discount_percentage')}% off (${d8.get('original_monthly_charges')}/mo -> ${d8.get('discounted_monthly_charges')}/mo, Save: ${d8.get('monthly_savings')}/mo)")
    print(f"           Rationale: {d8.get('retention_tier_rationale')}")
    summary_results.append(("POST /api/mining/predict (High Risk)", r8.status_code, f"Prob: {d8.get('churn_probability')*100:.1f}%, Disc: {d8.get('discount_percentage')}%", status8))
    if status8 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 9: Algorithm Suite Benchmarking & Model Selection
    # -------------------------------------------------------------------------
    print("\n[TEST 9] GET /api/mining/metrics?model=XGBoost (Multi-Algorithm Comparative Benchmarks)")
    r9 = client.get("/api/mining/metrics?model=XGBoost")
    d9 = r9.json()
    has_comparison = len(d9.get("models_comparison", [])) >= 4
    status9 = "[PASS]" if r9.status_code == 200 and d9.get("selected_model") == "XGBoost" and has_comparison else "[FAIL]"
    print(f"  Status : {r9.status_code} {status9}")
    print(f"  Payload: Selected: '{d9.get('selected_model')}' | ROC-AUC: {d9.get('roc_auc')} | F1: {d9.get('f1_score')*100:.2f}%")
    print("           Benchmarked Models:")
    for comp in d9.get("models_comparison", []):
        star = " ★ CHAMPION" if comp.get("is_best") else ""
        print(f"           - {comp.get('model_name').ljust(20)}: ROC-AUC={comp.get('roc_auc'):.4f}, F1={comp.get('f1_score')*100:.2f}%{star}")
    summary_results.append(("GET /api/mining/metrics (XGBoost)", r9.status_code, f"4 models benchmarked", status9))
    if status9 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # TEST 10: Dynamic Discount Engine Range Validation (Low Risk: 0% Discount)
    # -------------------------------------------------------------------------
    print("\n[TEST 10] POST /api/mining/predict (Low Risk: 0% Discount Validation)")
    low_risk_payload = {
        "tenure_months": 65,
        "monthly_charges": 25.00,
        "contract": "Two year",
        "internet_service": "DSL",
        "payment_method": "Credit card (automatic)",
        "tech_support": "Yes",
        "online_security": "Yes",
        "partner": "Yes",
        "dependents": "Yes",
        "paperless_billing": "No",
        "model_name": "XGBoost"
    }
    r10 = client.post("/api/mining/predict", json=low_risk_payload)
    d10 = r10.json()
    is_low_prob = d10.get("churn_probability", 1.0) < 0.30
    is_zero_discount = d10.get("discount_percentage") == 0.0
    status10 = "[PASS]" if r10.status_code == 200 and is_low_prob and is_zero_discount else "[FAIL]"
    print(f"  Status : {r10.status_code} {status10}")
    print(f"  Payload: Churn Prob: {d10.get('churn_probability')*100:.2f}% | Tier: '{d10.get('churn_risk_tier')}' | Discount: {d10.get('discount_percentage')}% | Bill: ${d10.get('discounted_monthly_charges')}/mo")
    summary_results.append(("POST /api/mining/predict (Low Risk)", r10.status_code, f"Prob: {d10.get('churn_probability')*100:.1f}%, Disc: 0%", status10))
    if status10 == "[PASS]": tests_passed += 1

    # -------------------------------------------------------------------------
    # FINAL RESULTS MATRIX
    # -------------------------------------------------------------------------
    print("\n" + "=" * 82)
    print("                    FASTAPI ENDPOINT INTEGRATION SUMMARY")
    print("=" * 82)
    print(f"{'Endpoint Tested':<34} | {'HTTP Code':<10} | {'Observed Payload Sample':<24} | {'Status':<6}")
    print("-" * 82)
    for ep, code, sample, st in summary_results:
        print(f"{ep:<34} | {code:<10} | {sample:<24} | {st:<6}")
    print("=" * 82)

    if tests_passed == total_tests:
        print(f"  🎉 ALL {total_tests}/{total_tests} ENDPOINTS PASSED WITH 200 OK! BACKEND IS READY FOR PRODUCTION.")
    else:
        print(f"  ⚠️ {total_tests - tests_passed} TESTS FAILED. PLEASE REVIEW SERVER LOGS.")
    print("=" * 82)
    return tests_passed == total_tests


if __name__ == "__main__":
    success = run_api_tests()
    sys.exit(0 if success else 1)
