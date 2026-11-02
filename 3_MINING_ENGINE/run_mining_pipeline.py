#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/run_mining_pipeline.py
Purpose: Master Data Mining & Machine Learning Pipeline Orchestrator.
         Sequentially executes:
         1. Feature Extraction from Kimball Star Schema.
         2. From-Scratch K-Means++ Clustering (Pure NumPy) & Business Personas.
         3. Supervised Champion Churn Classifier (Logistic Regression).
         4. From-Scratch Apriori Market Basket & Churn Association Mining.
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
from churn_classifier import train_churn_model
from apriori_scratch import run_and_save_apriori_artifacts


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
    # STEP 3: SUPERVISED PRIMARY CHURN CLASSIFIER (LOGISTIC REGRESSION)
    # -------------------------------------------------------------------------
    print("\n>>> STEP 3: TRAINING PRIMARY CHAMPION CHURN CLASSIFIER (LOGISTIC REGRESSION)...")
    t0 = time.time()
    train_churn_model(X_clf, y_clf, clf_feature_names, random_state=42)
    step3_time = time.time() - t0
    print(f"[DONE] Champion Supervised Classification completed in {step3_time:.2f} seconds.")

    # -------------------------------------------------------------------------
    # STEP 4: FROM-SCRATCH APRIORI MARKET BASKET & CHURN PATTERN MINING
    # -------------------------------------------------------------------------
    print("\n>>> STEP 4: EXECUTING FROM-SCRATCH APRIORI MARKET BASKET & CHURN MINING...")
    t0 = time.time()
    run_and_save_apriori_artifacts(df_warehouse, min_support=0.12, min_confidence=0.38, max_len=5)
    step4_time = time.time() - t0
    print(f"[DONE] Apriori Market Basket Mining completed in {step4_time:.2f} seconds.")

    # -------------------------------------------------------------------------
    # TOTAL PIPELINE SUMMARY
    # -------------------------------------------------------------------------
    total_time = time.time() - total_start
    print("\n" + "=" * 82)
    print("  🎉 MASTER MINING PIPELINE EXECUTION FINISHED SUCCESSFULLY!")
    print(f"  * Total Execution Time : {total_time:.2f} seconds")
    print(f"  * Step 1 (Feature Ext.): {step1_time:.2f}s")
    print(f"  * Step 2 (K-Means++   ): {step2_time:.2f}s")
    print(f"  * Step 3 (Logistic Reg): {step3_time:.2f}s")
    print(f"  * Step 4 (Apriori MBA ): {step4_time:.2f}s")
    print(f"  * Artifacts Persisted  : {SAVED_MODELS_DIR}")
    print("=" * 82)


if __name__ == "__main__":
    execute_pipeline()
