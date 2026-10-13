"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/services/mining_service.py
Purpose: Machine Learning Inference and Data Mining Service Layer.
         Consumes serialized K-Means and Random Forest models to deliver:
         - 2D scatter coordinates with K-Means cluster persona assignments
         - Elbow curve WCSS metrics for dynamic visualization
         - Real-time customer churn risk scoring and contributing risk factor extraction
         - Automated model retraining triggers
"""

import os
import sys
import time
import json
import pickle
from pathlib import Path
from typing import List, Dict, Any, Tuple
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

    if _CACHE["forest_payload"] is None:
        clf_path = MODELS_DIR / "churn_forest.pkl"
        if clf_path.exists():
            _CACHE["forest_payload"] = joblib.load(clf_path)

    if _CACHE["classifier_summary"] is None:
        clf_sum_path = MODELS_DIR / "classifier_summary.json"
        if clf_sum_path.exists():
            with open(clf_sum_path, "r", encoding="utf-8") as f:
                _CACHE["classifier_summary"] = json.load(f)


def get_kmeans_visualization_data(sample_size: int = 1000) -> ClusterQueryResponse:
    """
    Returns cluster centroids, persona definitions, and a sampled 2D scatter matrix
    (tenure_months, monthly_charges, cluster_id, churn_flag) for Recharts visualizations.
    """
    _load_artifacts()
    summary = _CACHE["kmeans_summary"]
    payload = _CACHE["kmeans_payload"]

    if not summary or not payload:
        raise RuntimeError("K-Means clustering artifacts not found. Please run the mining pipeline first.")

    # 1. Format Personas & Centroids
    personas = [CentroidItem(**p) for p in summary["personas"]]

    # 2. Extract sample data from fact table to plot in scatter chart
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


def get_model_metrics() -> ModelMetricsResponse:
    """Returns holdout evaluation metrics, confusion matrix, and feature rankings."""
    _load_artifacts()
    clf_summary = _CACHE["classifier_summary"]
    if not clf_summary:
        raise RuntimeError("Classifier summary not found.")

    top_features = [
        FeatureImportanceItem(**feat) for feat in clf_summary["top_features"]
    ]

    m = clf_summary["metrics"]
    return ModelMetricsResponse(
        model_type=clf_summary["model_type"],
        accuracy=float(m["accuracy"]),
        precision=float(m["precision"]),
        recall=float(m["recall"]),
        f1_score=float(m["f1_score"]),
        roc_auc=float(m["roc_auc"]),
        confusion_matrix=m["confusion_matrix"],
        top_features=top_features,
    )


def predict_single_customer(payload: CustomerPredictRequest) -> CustomerPredictResponse:
    """
    Encodes customer attributes, runs inference through Random Forest model,
    determines risk tier, maps cluster persona, and isolates dominant risk factors.
    """
    _load_artifacts()
    forest_data = _CACHE["forest_payload"]
    schema = _CACHE["feature_schema"]
    kmeans_payload = _CACHE["kmeans_payload"]
    kmeans_summary = _CACHE["kmeans_summary"]

    if not forest_data or not schema:
        raise RuntimeError("Random Forest model or feature schema missing.")

    clf = forest_data["model"]
    feature_cols = schema["encoded_feature_names"]

    # 1. Populate Total Charges if omitted
    total_charges = payload.total_charges
    if total_charges is None:
        total_charges = payload.tenure_months * payload.monthly_charges

    # 2. Build Raw Dictionary
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

    # 3. Vectorize & One-Hot Encode
    df_raw = pd.DataFrame([raw_dict])
    df_dummies = pd.get_dummies(df_raw, drop_first=False, dtype=int)

    # Align with 30-feature schema
    feature_vector = pd.DataFrame(0, index=[0], columns=feature_cols)
    for c in feature_cols:
        if c in df_dummies.columns:
            feature_vector[c] = df_dummies[c].values[0]
        elif c in raw_dict:
            feature_vector[c] = raw_dict[c]

    # 4. Infer Churn Probability via Random Forest
    prob_churn = float(clf.predict_proba(feature_vector)[0][1])
    churn_pred = int(prob_churn >= 0.50)

    # 5. Risk Tier Assignment
    if prob_churn >= 0.65:
        tier = "High"
    elif prob_churn >= 0.35:
        tier = "Moderate"
    else:
        tier = "Low"

    # 6. Derive Behavioral Persona via K-Means Scaler
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

    # 7. Isolate Top Contributing Risk Factors
    risk_factors = []
    if payload.contract == "Month-to-month":
        risk_factors.append("Volatile contract commitment (Month-to-month has 42.7% churn baseline)")
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

    # 8. Actionable Retention Prescription
    if tier == "High":
        recommendation = "Immediate Intervention: Proactive customer success outreach, offer 1-year contract renewal discount (15% off), and attach complimentary Tech Support package."
    elif tier == "Moderate":
        recommendation = "Nurture Campaign: Automated email engagement survey, promote automated payment method (Credit card/Bank transfer) for $5 billing credit."
    else:
        recommendation = "Relationship Maintenance: Standard quarterly check-in, evaluate for premium fiber bandwidth or multi-line cross-sell opportunities."

    return CustomerPredictResponse(
        churn_probability=round(prob_churn, 4),
        churn_prediction=churn_pred,
        churn_risk_tier=tier,
        cluster_persona=persona_label,
        risk_factors=risk_factors,
        recommended_retention_action=recommendation,
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
        message="Data Mining pipeline executed successfully. Models updated and hot-reloaded into memory.",
        training_duration_seconds=round(duration, 2),
        updated_metrics=updated_metrics,
    )
