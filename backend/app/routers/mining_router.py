"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/routers/mining_router.py
Purpose: REST endpoints for Data Mining, K-Means clustering, and Machine Learning inference.
"""

from fastapi import APIRouter, HTTPException, Query
from app.schemas import (
    CustomerPredictRequest,
    CustomerPredictResponse,
    ClusterQueryResponse,
    ElbowCurveResponse,
    ModelMetricsResponse,
    RetrainResponse
)
from app.services import mining_service

router = APIRouter(prefix="/api/mining", tags=["Data Mining & Machine Learning"])


@router.get("/clusters", response_model=ClusterQueryResponse, summary="K-Means Clusters, Personas & Scatter Sample")
def get_clusters(sample_size: int = Query(default=1000, ge=100, le=7043, description="Sample points for scatter plot")):
    """
    Returns:
    - Optimal K cluster centroids (Tenure Months vs. Monthly Charges)
    - Actionable Business Retention Personas
    - Sampled 2D scatter points with cluster IDs for dynamic Recharts visualization
    """
    try:
        return mining_service.get_kmeans_visualization_data(sample_size=sample_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch clustering visualization data: {str(e)}")


@router.get("/elbow", response_model=ElbowCurveResponse, summary="WCSS Elbow Curve for Optimal K Determination")
def get_elbow_curve():
    """
    Returns Within-Cluster Sum of Squares (WCSS / Inertia) across K=2 to 6
    demonstrating the mathematical Elbow Criterion.
    """
    try:
        return mining_service.get_elbow_curve_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch elbow curve metrics: {str(e)}")


@router.get("/metrics", response_model=ModelMetricsResponse, summary="Supervised Model Evaluation & Gini Importances")
def get_model_metrics():
    """
    Returns holdout test metrics for the Random Forest classifier:
    - ROC-AUC, Recall (Sensitivity), Precision, F1-Score, Accuracy
    - Complete 2x2 Confusion Matrix (TP, FP, TN, FN)
    - Ranked Gini Feature Importances
    """
    try:
        return mining_service.get_model_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch model evaluation metrics: {str(e)}")


@router.post("/predict", response_model=CustomerPredictResponse, summary="Real-Time Single Customer Churn Scoring")
def predict_churn(payload: CustomerPredictRequest):
    """
    Evaluates an individual customer profile in real time:
    - Forecasts Churn Probability (0.0 to 1.0)
    - Classifies Risk Tier ('Low', 'Moderate', 'High')
    - Maps into Customer Behavioral Persona
    - Diagnoses specific contributing risk factors
    - Provides prescriptive retention recommendations
    """
    try:
        return mining_service.predict_single_customer(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failure: {str(e)}")


@router.post("/retrain", response_model=RetrainResponse, summary="Trigger Automated Pipeline Retraining")
def trigger_retraining():
    """
    Executes the end-to-end data mining pipeline in the background:
    - Re-extracts features from the Star Schema
    - Re-fits K-Means clustering and updates WCSS metrics
    - Retrains Random Forest with balanced class weighting
    - Hot-reloads updated model artifacts into active memory
    """
    try:
        return mining_service.trigger_retraining()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failure: {str(e)}")
