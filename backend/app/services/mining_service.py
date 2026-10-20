"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/services/mining_service.py
Purpose: Machine Learning Inference and Data Mining Service Layer.
         Consumes serialized Multi-Model Suite (Logistic Regression, Random Forest,
         XGBoost, LightGBM) and K-Means clustering artifacts to deliver:
         - 2D scatter coordinates with K-Means cluster persona assignments
         - Elbow curve WCSS metrics for dynamic visualization
         - Real-time customer churn risk scoring via selected algorithm
         - Churn-Probability-Based Dynamic Retention Discount Engine
         - Algorithm Suite Benchmarking & Comparative Holdout Metrics
         - Automated model retraining triggers
"""

import os
import sys
import time
import json
import pickle
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
import joblib
from sqlalchemy import text

from app.database import engine
from app.schemas import (
    CustomerPredictRequest,
    CustomerPredictResponse,
    ClusterQueryResponse,
    CentroidItem,
    ScatterPoint,
    ElbowCurveResponse,
    ModelMetricsResponse,
    ModelComparisonItem,
    FeatureImportanceItem,
    RetrainResponse
)

# Path resolution to 3_MINING_ENGINE/saved_models
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BACKEND_DIR.parent if BACKEND_DIR.name == "backend" else BACKEND_DIR
MODELS_DIR = PROJECT_ROOT / "3_MINING_ENGINE" / "saved_models"

# In-memory cache for models
_CACHE = {
    "kmeans_payload": None,
    "kmeans_summary": None,
    "multi_models": None,
    "forest_payload": None,
    "feature_schema": None,
    "classifier_summary": None,
}


def _load_artifacts():
    """Lazy loads serialized models and schema metadata into memory."""
    if _CACHE["kmeans_summary"] is None:
        summary_path = MODELS_DIR / "kmeans_summary.json"
        if summary_path.exists():
            with open(summary_path, "r", encoding="utf-8") as f:
                _CACHE["kmeans_summary"] = json.load(f)

    if _CACHE["kmeans_payload"] is None:
        model_path = MODELS_DIR / "kmeans_model.pkl"
        if model_path.exists():
            with open(model_path, "rb") as f:
                _CACHE["kmeans_payload"] = pickle.load(f)

    if _CACHE["feature_schema"] is None:
        schema_path = MODELS_DIR / "feature_schema.json"
        if schema_path.exists():
            with open(schema_path, "r", encoding="utf-8") as f:
                _CACHE["feature_schema"] = json.load(f)

    if _CACHE["multi_models"] is None:
        models_path = MODELS_DIR / "churn_models.pkl"
        if models_path.exists():
            _CACHE["multi_models"] = joblib.load(models_path)

    if _CACHE["forest_payload"] is None:
        clf_path = MODELS_DIR / "churn_forest.pkl"
        if clf_path.exists():
            _CACHE["forest_payload"] = joblib.load(clf_path)

    if _CACHE["classifier_summary"] is None:
        clf_sum_path = MODELS_DIR / "classifier_summary.json"
        if clf_sum_path.exists():
            with open(clf_sum_path, "r", encoding="utf-8") as f:
                _CACHE["classifier_summary"] = json.load(f)


def calculate_retention_discount(
    churn_probability: float,
    monthly_charges: float,
    tenure_months: int
) -> dict:
    """
    Task 3: Churn-Probability-Based Dynamic Discount Engine.
    Maps raw churn probability (p) to targeted customer retention discounts:
    - p < 0.30 (Low Risk): 0% discount (no discount needed).
    - 0.30 <= p < 0.60 (Moderate Risk): 10%–15% discount or loyalty offer.
    - 0.60 <= p < 0.85 (High Risk): 20%–25% discount (with tenure-based adjustments).
    - p >= 0.85 (Critical Risk): Up to 30% discount / urgent customer success intervention.
    """
    p = float(churn_probability)
    bill = float(monthly_charges)
    tenure = int(tenure_months)

    if p < 0.30:
        tier = "Low"
        discount_pct = 0.0
        rationale = "Healthy Retention Profile (p < 30%): Customer exhibits low churn risk. Standard account maintenance; 0% discount required."
        action = "Relationship Maintenance: Standard quarterly check-in, evaluate for premium fiber bandwidth or multi-line cross-sell opportunities."
    elif p < 0.60:
        tier = "Moderate"
        # 10% - 15% discount with tenure adjustment
        if tenure >= 12:
            discount_pct = 15.0
            rationale = f"Moderate Churn Risk ({p*100:.1f}%): 15% loyalty retention discount applied (+5% tenure loyalty bonus for {tenure} months tenure)."
        else:
            discount_pct = 10.0
            rationale = f"Moderate Churn Risk ({p*100:.1f}%): 10% targeted early-lifecycle retention offer applied."
        action = f"Nurture Campaign: Apply {discount_pct:.0f}% monthly billing discount (${bill * discount_pct / 100:.2f}/mo savings) and promote automatic payment."
    elif p < 0.85:
        tier = "High"
        # 20% - 25% discount with tenure adjustment
        if tenure >= 24:
            discount_pct = 25.0
            rationale = f"High Churn Risk ({p*100:.1f}%): 25% deep contract retention discount applied (+5% established tenure VIP protection incentive)."
        else:
            discount_pct = 20.0
            rationale = f"High Churn Risk ({p*100:.1f}%): 20% contract renewal discount applied to mitigate active flight risk."
        action = f"High-Touch Intervention: Offer 1-year contract extension with {discount_pct:.0f}% discounted billing and attach complimentary Tech Support package."
    else:
        tier = "Critical"
        # Up to 30% discount / urgent customer success intervention
        discount_pct = 30.0
        rationale = f"Critical Churn Risk ({p*100:.1f}%): Maximum 30% emergency retention relief authorized for immediate executive rescue."
        action = "Urgent Intervention: Dedicated customer success manager intervention, apply maximum 30% emergency billing credit, and schedule priority consultation."

    discounted_bill = round(bill * (1.0 - (discount_pct / 100.0)), 2)
    savings = round(bill - discounted_bill, 2)

    return {
        "churn_risk_tier": tier,
        "discount_percentage": discount_pct,
        "original_monthly_charges": round(bill, 2),
        "discounted_monthly_charges": discounted_bill,
        "monthly_savings": savings,
        "retention_tier_rationale": rationale,
        "recommended_retention_action": action,
    }


def get_kmeans_visualization_data(sample_size: int = 1000) -> ClusterQueryResponse:
    """
    Returns cluster centroids, persona definitions, and a sampled 2D scatter matrix
    (tenure_months, monthly_charges, cluster_id, churn_flag) for Recharts visualizations.
    Efficiently samples up to sample_size points from 100k+ rows.
    """
    _load_artifacts()
    summary = _CACHE["kmeans_summary"]
    payload = _CACHE["kmeans_payload"]

    if not summary or not payload:
        raise RuntimeError("K-Means clustering artifacts not found. Please run the mining pipeline first.")

    # 1. Format Personas & Centroids
    personas = [CentroidItem(**p) for p in summary["personas"]]

    # 2. Extract sample data from fact table to plot in scatter chart
    # Use deterministic or random stride to avoid scanning full 100k rows
    query = f"""
    SELECT tenure_months, monthly_charges, churn_flag 
    FROM fact_subscriptions 
    LIMIT {sample_size};
    """
    with engine.connect() as conn:
        df_sample = pd.read_sql(text(query), con=conn)

    # 3. Predict cluster IDs using learned centroids and scaler parameters
    mean = payload["mean_"]
    std = payload["std_"]
    centroids = payload["centroids_"]  # Standardized centroids

    X_raw = df_sample[["tenure_months", "monthly_charges"]].values.astype(np.float64)
    X_scaled = (X_raw - mean) / std

    # Vectorized Euclidean distance: (N, K, D)
    diff = X_scaled[:, np.newaxis, :] - centroids[np.newaxis, :, :]
    dists = np.sqrt(np.sum(diff ** 2, axis=2))
    assigned_clusters = np.argmin(dists, axis=1)

    scatter_points = []
    for i, row in df_sample.iterrows():
        scatter_points.append(ScatterPoint(
            tenure_months=int(row["tenure_months"]),
            monthly_charges=float(row["monthly_charges"]),
            cluster_id=int(assigned_clusters[i]),
            churn_flag=int(row["churn_flag"])
        ))

    return ClusterQueryResponse(
        n_clusters=int(summary["optimal_k"]),
        final_wcss=float(summary["final_wcss"]),
        convergence_iterations=int(summary["convergence_iterations"]),
        personas=personas,
        scatter_sample=scatter_points,
    )


def get_elbow_curve_data() -> ElbowCurveResponse:
    """Returns the WCSS values across K=2 to 6 for the Elbow Method chart."""
    _load_artifacts()
    summary = _CACHE["kmeans_summary"]
    if not summary:
        raise RuntimeError("Clustering summary not found.")

    elbow_points = []
    for k_val, wcss_val in summary["elbow_curve"].items():
        elbow_points.append({
            "k": int(k_val),
            "wcss": float(wcss_val),
        })

    return ElbowCurveResponse(
        optimal_k=int(summary["optimal_k"]),
        elbow_points=elbow_points,
    )


def get_model_metrics(model_name: Optional[str] = None) -> ModelMetricsResponse:
    """
    Returns holdout evaluation metrics, confusion matrix, and feature rankings.
    Supports querying specific model metrics or defaults to best/Random Forest model,
    and returns comparative benchmark metrics across all algorithms.
    """
    _load_artifacts()
    clf_summary = _CACHE["classifier_summary"]
    if not clf_summary:
        raise RuntimeError("Classifier summary not found.")

    models_detail = clf_summary.get("models_detail", {})
    available_models = clf_summary.get("available_models", ["Random Forest", "XGBoost", "LightGBM", "Logistic Regression"])

    # Determine which model metrics to return
    selected_name = model_name
    if not selected_name or selected_name not in models_detail:
        # Default to best model or Random Forest
        selected_name = clf_summary.get("best_model", "Random Forest")
        if selected_name not in models_detail and "Random Forest" in models_detail:
            selected_name = "Random Forest"

    if selected_name in models_detail:
        target_info = models_detail[selected_name]
        m = target_info["metrics"]
        top_features = [
            FeatureImportanceItem(**feat) for feat in target_info.get("top_features", [])
        ]
        active_model_type = target_info.get("model_name", selected_name)
    else:
        m = clf_summary["metrics"]
        top_features = [
            FeatureImportanceItem(**feat) for feat in clf_summary["top_features"]
        ]
        active_model_type = clf_summary.get("model_type", "RandomForestClassifier")

    # Format comparative benchmarking table
    comparison_items = []
    raw_comparison = clf_summary.get("models_comparison", [])
    for comp in raw_comparison:
        comparison_items.append(ModelComparisonItem(
            model_key=comp["model_key"],
            model_name=comp["model_name"],
            accuracy=float(comp["accuracy"]),
            precision=float(comp["precision"]),
            recall=float(comp["recall"]),
            f1_score=float(comp["f1_score"]),
            roc_auc=float(comp["roc_auc"]),
            is_best=bool(comp.get("is_best", False)),
            notes=comp.get("training_time", None)
        ))

    return ModelMetricsResponse(
        model_type=active_model_type,
        accuracy=float(m["accuracy"]),
        precision=float(m["precision"]),
        recall=float(m["recall"]),
        f1_score=float(m["f1_score"]),
        roc_auc=float(m["roc_auc"]),
        confusion_matrix=m["confusion_matrix"],
        top_features=top_features,
        models_comparison=comparison_items,
        available_models=available_models,
        selected_model=selected_name,
        test_samples=m.get("test_samples", 21000),
        train_samples=m.get("train_samples", 84000),
    )


def predict_single_customer(payload: CustomerPredictRequest) -> CustomerPredictResponse:
    """
    Encodes customer attributes, runs inference through selected classification model
    (Logistic Regression, Random Forest, XGBoost, or LightGBM),
    computes dynamic discount engine savings and risk tier, maps cluster persona,
    and isolates dominant risk factors.
    """
    _load_artifacts()
    schema = _CACHE["feature_schema"]
    multi_data = _CACHE["multi_models"]
    forest_data = _CACHE["forest_payload"]
    kmeans_payload = _CACHE["kmeans_payload"]
    kmeans_summary = _CACHE["kmeans_summary"]

    if not schema:
        raise RuntimeError("Feature schema metadata missing.")

    # 1. Resolve Classification Model (Requested or Default)
    requested_model_name = payload.model_name or "Random Forest"
    clf = None

    if multi_data and "models" in multi_data:
        # Match case-insensitively or exact
        for name, model_obj in multi_data["models"].items():
            if name.lower() == requested_model_name.lower():
                clf = model_obj
                requested_model_name = name
                break

    if clf is None and forest_data:
        clf = forest_data["model"]
        requested_model_name = "Random Forest"

    if clf is None:
        raise RuntimeError("No trained classification model available for inference.")

    feature_cols = schema["encoded_feature_names"]

    # 2. Populate Total Charges if omitted
    total_charges = payload.total_charges
    if total_charges is None:
        total_charges = payload.tenure_months * payload.monthly_charges

    # 3. Build Raw Dictionary
    raw_dict = {
        "tenure_months": payload.tenure_months,
        "monthly_charges": payload.monthly_charges,
        "total_charges": total_charges,
        "senior_citizen": payload.senior_citizen,
        "gender": payload.gender,
        "partner": payload.partner,
        "dependents": payload.dependents,
        "phone_service": payload.phone_service,
        "multiple_lines": payload.multiple_lines,
        "internet_service": payload.internet_service,
        "online_security": payload.online_security,
        "online_backup": payload.online_backup,
        "device_protection": payload.device_protection,
        "tech_support": payload.tech_support,
        "streaming_tv": payload.streaming_tv,
        "streaming_movies": payload.streaming_movies,
        "contract": payload.contract,
        "paperless_billing": payload.paperless_billing,
        "payment_method": payload.payment_method,
    }

    # 4. Vectorize & One-Hot Encode
    df_raw = pd.DataFrame([raw_dict])
    df_dummies = pd.get_dummies(df_raw, drop_first=False, dtype=int)

    # Align with 30-feature schema
    feature_vector = pd.DataFrame(0, index=[0], columns=feature_cols)
    for c in feature_cols:
        if c in df_dummies.columns:
            feature_vector[c] = df_dummies[c].values[0]
        elif c in raw_dict:
            feature_vector[c] = raw_dict[c]

    # 5. Infer Churn Probability via Selected Algorithm
    prob_churn = float(clf.predict_proba(feature_vector)[0][1])
    churn_pred = int(prob_churn >= 0.50)

    # 6. Apply Churn-Probability-Based Dynamic Discount Engine
    discount_result = calculate_retention_discount(
        churn_probability=prob_churn,
        monthly_charges=payload.monthly_charges,
        tenure_months=payload.tenure_months
    )

    # 7. Derive Behavioral Persona via K-Means Scaler
    persona_label = "Unclassified Subscriber"
    if kmeans_payload and kmeans_summary:
        mean = kmeans_payload["mean_"]
        std = kmeans_payload["std_"]
        cents = kmeans_payload["centroids_"]
        pt_scaled = (np.array([[payload.tenure_months, payload.monthly_charges]]) - mean) / std
        diff = pt_scaled - cents
        c_id = int(np.argmin(np.sqrt(np.sum(diff ** 2, axis=1))))
        for p in kmeans_summary["personas"]:
            if p["cluster_id"] == c_id:
                persona_label = p["persona_name"]
                break

    # 8. Isolate Top Contributing Risk Factors
    risk_factors = []
    if payload.contract == "Month-to-month":
        risk_factors.append("Volatile contract commitment (Month-to-month has >42% churn baseline)")
    if payload.tenure_months <= 12:
        risk_factors.append(f"Early customer lifecycle vulnerability ({payload.tenure_months} months tenure)")
    if payload.internet_service == "Fiber optic":
        risk_factors.append("Fiber optic subscription prone to bill shock without technical security pack")
    if payload.payment_method == "Electronic check":
        risk_factors.append("Electronic check payment channel associated with elevated involuntary churn")
    if payload.tech_support == "No":
        risk_factors.append("Absence of dedicated technical support addon")
    if payload.monthly_charges > 70.0:
        risk_factors.append(f"High monthly recurring commitment (${payload.monthly_charges:.2f}/mo)")

    if not risk_factors:
        risk_factors.append("Stable tenure and multi-year contract protections")

    return CustomerPredictResponse(
        churn_probability=round(prob_churn, 4),
        churn_prediction=churn_pred,
        churn_risk_tier=discount_result["churn_risk_tier"],
        cluster_persona=persona_label,
        risk_factors=risk_factors,
        recommended_retention_action=discount_result["recommended_retention_action"],
        discount_percentage=discount_result["discount_percentage"],
        original_monthly_charges=discount_result["original_monthly_charges"],
        discounted_monthly_charges=discount_result["discounted_monthly_charges"],
        monthly_savings=discount_result["monthly_savings"],
        retention_tier_rationale=discount_result["retention_tier_rationale"],
        model_used=requested_model_name,
    )


def trigger_retraining() -> RetrainResponse:
    """
    Executes the entire mining pipeline programmatically and refreshes in-memory caches.
    """
    import subprocess
    start_t = time.time()

    pipeline_script = PROJECT_ROOT / "3_MINING_ENGINE" / "run_mining_pipeline.py"
    if not pipeline_script.exists():
        raise FileNotFoundError(f"Mining orchestrator not found at {pipeline_script}")

    # Run pipeline in subprocess using same python executable
    proc = subprocess.run(
        [sys.executable, str(pipeline_script)],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT)
    )

    if proc.returncode != 0:
        raise RuntimeError(f"Retraining failed: {proc.stderr}")

    duration = time.time() - start_t

    # Invalidate in-memory cache so subsequent queries read refreshed models
    for k in _CACHE:
        _CACHE[k] = None
    _load_artifacts()

    updated_metrics = _CACHE["classifier_summary"]["metrics"] if _CACHE["classifier_summary"] else {}

    return RetrainResponse(
        status="success",
        message="Data Mining pipeline executed successfully. All models updated and hot-reloaded into memory.",
        training_duration_seconds=round(duration, 2),
        updated_metrics=updated_metrics,
    )
