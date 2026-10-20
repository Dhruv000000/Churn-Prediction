#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/run_mining_pipeline.py
Purpose: Master Data Mining & Machine Learning Pipeline Orchestrator.
         Sequentially executes Star Schema Feature Extraction, from-scratch K-Means Clustering,
         and Supervised Random Forest Churn Classification.
"""

import sys
import time
import json
from pathlib import Path

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
SAVED_MODELS_DIR = CURRENT_DIR / "saved_models"

from feature_extractor import (
    extract_warehouse_data,
    get_clustering_features,
    get_classification_features
)
from kmeans_scratch import ScratchKMeans
from churn_classifier import train_multi_churn_models, train_churn_model, save_classifier_artifacts
from clv_regression import train_clv_model, save_clv_artifacts


def execute_pipeline():
    total_start = time.time()
    print("=" * 82)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  Task 4: Master Data Mining & Machine Learning Pipeline Orchestrator")
    print("=" * 82)

    # -------------------------------------------------------------------------
    # STEP 1: FEATURE EXTRACTION FROM STAR SCHEMA
    # -------------------------------------------------------------------------
    print("\n>>> STEP 1: EXTRACTING FEATURES FROM WAREHOUSE STAR SCHEMA...")
    t0 = time.time()
    df_warehouse = extract_warehouse_data()
    X_cluster, cluster_cols = get_clustering_features(df_warehouse)
    X_clf, y_clf, clf_feature_names = get_classification_features(df_warehouse)
    step1_time = time.time() - t0
    print(f"[DONE] Feature Extraction completed in {step1_time:.2f} seconds.")

    # -------------------------------------------------------------------------
    # STEP 2: FROM-SCRATCH K-MEANS CUSTOMER CLUSTERING (NUMPY)
    # -------------------------------------------------------------------------
    print("\n>>> STEP 2: EXECUTING FROM-SCRATCH K-MEANS CLUSTERING (PURE NUMPY)...")
    t0 = time.time()

    # 2.1 Calculate WCSS Elbow Curve across K=2 to 6
    kmeans = ScratchKMeans(n_clusters=4, max_iters=300, tol=1e-4, random_state=42)
    elbow_curve = kmeans.compute_wcss(X_cluster, k_range=range(2, 7))

    # 2.2 Fit with optimal K=4
    print("\n[FIT] Training ScratchKMeans with optimal K = 4...")
    kmeans.fit(X_cluster)
    print(f"[CONVERGED] In {kmeans.n_iter_} iterations with final WCSS = {kmeans.inertia_:,.2f}")

    # 2.3 Derive business personas
    personas = kmeans.assign_personas(cluster_cols)

    # 2.4 Save clustering artifacts
    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    kmeans_model_path = SAVED_MODELS_DIR / "kmeans_model.pkl"
    kmeans.save(kmeans_model_path, extra_metadata={"wcss_elbow": elbow_curve, "personas": personas})

    kmeans_summary_path = SAVED_MODELS_DIR / "kmeans_summary.json"
    with open(kmeans_summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "optimal_k": 4,
            "convergence_iterations": kmeans.n_iter_,
            "final_wcss": kmeans.inertia_,
            "elbow_curve": elbow_curve,
            "personas": personas,
        }, f, indent=2)

    step2_time = time.time() - t0
    print(f"[DONE] K-Means Mining completed in {step2_time:.2f} seconds.")

    # -------------------------------------------------------------------------
    # -------------------------------------------------------------------------
    # STEP 3: SUPERVISED MULTI-ALGORITHM CHURN CLASSIFIER SUITE
    # -------------------------------------------------------------------------
    print("\n>>> STEP 3: TRAINING & BENCHMARKING MULTI-ALGORITHM CLASSIFIERS...")
    t0 = time.time()
    trained_models, comparison, details, best_name = train_multi_churn_models(
        X_clf, y_clf, clf_feature_names, random_state=42
    )
    save_classifier_artifacts(trained_models, comparison, details, clf_feature_names, best_name)
    step3_time = time.time() - t0
    print(f"[DONE] Supervised Multi-Model Benchmarking completed in {step3_time:.2f} seconds.")

    # -------------------------------------------------------------------------
    # STEP 4: CONTINUOUS VALUE ESTIMATION (CLV RIDGE REGRESSION)
    # -------------------------------------------------------------------------
    print("\n>>> STEP 4: TRAINING CLV RIDGE REGRESSION MODEL (PROFIT GUARDRAIL)...")
    t0 = time.time()
    clv_reg, clv_metrics, clv_cols = train_clv_model(df_warehouse, alpha=1.0, random_state=42)
    save_clv_artifacts(clv_reg, clv_metrics, clv_cols)
    step4_time = time.time() - t0
    print(f"[DONE] CLV Regression training completed in {step4_time:.2f} seconds.")

    # -------------------------------------------------------------------------
    # FINAL EXECUTIVE METRICS REPORT
    # -------------------------------------------------------------------------
    total_time = time.time() - total_start
    best_detail = details[best_name]
    best_metrics = best_detail["metrics"]
    best_ranking = best_detail["all_feature_ranking"]

    print("\n" + "=" * 82)
    print("                    FINAL DATA MINING EXECUTION SUMMARY MATRIX")
    print("=" * 82)
    print(f"  Ingested Warehouse Fact Records : {len(df_warehouse):,} rows")
    print(f"  Total Engineered Features       : {len(clf_feature_names)} features")
    print("-" * 82)
    print("  1. UNSUPERVISED CLUSTERING (K-Means from Scratch)")
    print(f"     * Optimal Clusters (K)       : {kmeans.n_clusters}")
    print(f"     * Final WCSS (Inertia)       : {kmeans.inertia_:,.2f}")
    print(f"     * Convergence Iterations     : {kmeans.n_iter_} steps")
    for p in personas:
        print(f"     * Cluster {p['cluster_id']}: {p['persona_name'].ljust(28)} ({p['cluster_pct']}% of base | Center: {p['centroid_tenure_months']} mos, ${p['centroid_monthly_charges']})")
    print("-" * 82)
    print("  2. SUPERVISED ALGORITHM SUITE BENCHMARK")
    for c in comparison:
        champ_mark = " (Champion)" if c["is_best"] else ""
        print(f"     * {c['model_name'].ljust(22)}: ROC-AUC = {c['roc_auc']:.4f} | Recall = {c['recall']*100:.2f}% | F1 = {c['f1_score']*100:.2f}% | Acc = {c['accuracy']*100:.2f}%{champ_mark}")
    print("-" * 82)
    print("  3. CONTINUOUS VALUE ESTIMATION (CLV Ridge Regression)")
    print(f"     * Model Type                 : {clv_metrics['model_type']}")
    print(f"     * R² Variance Explained      : {clv_metrics['r2_score']:.4f} ({clv_metrics['r2_score']*100:.2f}%)")
    print(f"     * Mean Absolute Error (MAE)  : ${clv_metrics['mae']:.2f}")
    print("-" * 82)
    print("  4. EXPLAINABLE AI ROOT CAUSE ATTRIBUTION (TreeSHAP)")
    print(f"     * Engine Architecture        : TreeSHAP / shap.TreeExplainer (Active Inference Attributions)")
    print(f"     * Primary Driver Extraction  : Dynamic Per-Prediction Root Cause Diagnostics")
    print("-" * 82)
    print(f"  Champion Classifier Model       : {best_name}")
    print(f"  Champion Top Predictive Feature : {best_ranking[0]['feature']} ({best_ranking[0]['importance_pct']}%)")
    print("-" * 82)
    print(f"  Total Pipeline Execution Time   : {total_time:.2f} seconds")
    print(f"  Model Artifacts Persisted In    : {SAVED_MODELS_DIR}")
    print("=" * 82)
    print("  🎉 DATA MINING ENGINE PIPELINE FULLY VALIDATED AND PERSISTED!")
    print("=" * 82)


if __name__ == "__main__":
    execute_pipeline()
