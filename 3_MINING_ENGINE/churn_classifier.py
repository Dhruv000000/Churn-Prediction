#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/churn_classifier.py
Purpose: Supervised Predictive Retention & Churn Classification Engine.
         Trains and benchmarks multiple standard classification models:
         1. Logistic Regression (Baseline with StandardScaler)
         2. Random Forest Classifier (Ensemble Bagging with balanced class weights)
         3. XGBoost Classifier (Gradient Boosting with scale_pos_weight)
         4. LightGBM Classifier (Fast Gradient Boosted Decision Trees)
         Computes comparative benchmarking metrics (ROC-AUC, Precision, Recall, F1, Accuracy),
         confusion matrix diagnostics, and feature attribution rankings across all algorithms.
"""

import os
import sys
import json
import time
from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)

import xgboost as xgb
import lightgbm as lgb

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
SAVED_MODELS_DIR = CURRENT_DIR / "saved_models"


def compute_metrics_for_model(
    model,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: np.ndarray,
    y_test: np.ndarray,
    feature_names: list[str],
    is_pipeline: bool = False
) -> tuple[dict, list[dict]]:
    """Calculates comprehensive classification metrics and feature importances."""
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_pred_proba)

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    metrics = {
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(roc_auc), 4),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
        },
        "test_samples": int(len(y_test)),
        "train_samples": int(len(y_train)),
    }

    # Extract feature importance or normalized coefficients
    if is_pipeline and hasattr(model.named_steps.get("classifier", None), "coef_"):
        coefs = np.abs(model.named_steps["classifier"].coef_[0])
        total_coef = np.sum(coefs) or 1.0
        importances = coefs / total_coef
    elif hasattr(model, "feature_importances_"):
        raw_imp = model.feature_importances_
        total_imp = np.sum(raw_imp) or 1.0
        importances = raw_imp / total_imp
    else:
        importances = np.ones(len(feature_names)) / len(feature_names)

    sorted_indices = np.argsort(importances)[::-1]
    feature_ranking = []
    for rank, idx in enumerate(sorted_indices, 1):
        feature_ranking.append({
            "rank": rank,
            "feature": feature_names[idx],
            "importance": round(float(importances[idx]), 4),
            "importance_pct": round(float(importances[idx] * 100), 2),
        })

    return metrics, feature_ranking


def train_multi_churn_models(
    X: pd.DataFrame,
    y: np.ndarray,
    feature_names: list[str],
    random_state: int = 42
) -> tuple[dict, list[dict], dict, str]:
    """
    Executes supervised training and benchmarking across all standard algorithms:
    - Logistic Regression (Baseline)
    - Random Forest Classifier
    - XGBoost Classifier
    - LightGBM Classifier
    """
    print("\n" + "=" * 82)
    print("  SUPERVISED MULTI-ALGORITHM BENCHMARKING & CHURN CLASSIFICATION SUITE")
    print("=" * 82)

    # 1. Stratified Train-Test Split (80% Train, 20% Holdout Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )
    print(f"[SPLIT] Training Set  : {X_train.shape[0]:,} samples (Churn = {np.mean(y_train)*100:.2f}%)")
    print(f"[SPLIT] Holdout Test Set: {X_test.shape[0]:,} samples (Churn = {np.mean(y_test)*100:.2f}%)")

    # Positive class ratio for XGBoost scale_pos_weight
    neg_count = np.sum(y_train == 0)
    pos_count = np.sum(y_train == 1)
    scale_pos_weight = float(neg_count / pos_count) if pos_count > 0 else 1.0

    # Model Definitions
    models_definitions = {
        "Logistic Regression": {
            "key": "logistic_regression",
            "model": Pipeline([
                ("scaler", StandardScaler()),
                ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=random_state))
            ]),
            "is_pipeline": True,
            "description": "Baseline linear classifier with L2 regularization and balanced weighting"
        },
        "Random Forest": {
            "key": "random_forest",
            "model": RandomForestClassifier(
                n_estimators=100,
                max_depth=8,
                class_weight="balanced",
                random_state=random_state,
                n_jobs=-1
            ),
            "is_pipeline": False,
            "description": "Ensemble bagging of 100 decision trees with Gini impurity splitting"
        },
        "XGBoost": {
            "key": "xgboost",
            "model": xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                scale_pos_weight=scale_pos_weight,
                eval_metric="logloss",
                random_state=random_state,
                n_jobs=-1
            ),
            "is_pipeline": False,
            "description": "Extreme Gradient Boosting with regularized objective optimization"
        },
        "LightGBM": {
            "key": "lightgbm",
            "model": lgb.LGBMClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                class_weight="balanced",
                random_state=random_state,
                n_jobs=-1,
                verbose=-1
            ),
            "is_pipeline": False,
            "description": "Fast histogram-based gradient boosted decision tree classifier"
        }
    }

    trained_models = {}
    models_detail = {}
    models_comparison = []

    print("\n" + "-" * 82)
    print("                    TRAINING ALGORITHM SUITE")
    print("-" * 82)

    for name, spec in models_definitions.items():
        start_t = time.time()
        print(f"[TRAINING] Fitting {name.ljust(22)}: {spec['description']}...")
        clf = spec["model"]
        clf.fit(X_train, y_train)
        duration = time.time() - start_t

        metrics, rankings = compute_metrics_for_model(
            clf, X_train, X_test, y_train, y_test, feature_names, is_pipeline=spec["is_pipeline"]
        )

        trained_models[name] = clf
        models_detail[name] = {
            "model_key": spec["key"],
            "model_name": name,
            "training_duration_seconds": round(duration, 2),
            "metrics": metrics,
            "top_features": rankings[:10],
            "all_feature_ranking": rankings,
        }

        models_comparison.append({
            "model_key": spec["key"],
            "model_name": name,
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1_score": metrics["f1_score"],
            "roc_auc": metrics["roc_auc"],
            "is_best": False,
            "training_time": f"{duration:.2f}s"
        })
        print(f"   * Completed in {duration:.2f}s | ROC-AUC: {metrics['roc_auc']:.4f} | Recall: {metrics['recall']*100:.2f}% | F1: {metrics['f1_score']*100:.2f}%")

    # Identify Best Model by ROC-AUC
    best_item = max(models_comparison, key=lambda x: x["roc_auc"])
    best_item["is_best"] = True
    best_model_name = best_item["model_name"]

    print("\n" + "=" * 82)
    print("                    ALGORITHM BENCHMARK COMPARISON MATRIX")
    print("=" * 82)
    print(f"{'Algorithm':<22} | {'ROC-AUC':<9} | {'Recall':<8} | {'Precision':<10} | {'F1-Score':<9} | {'Accuracy':<9} | {'Status':<6}")
    print("-" * 82)
    for c in models_comparison:
        best_tag = "★ BEST" if c["is_best"] else ""
        print(f"{c['model_name']:<22} | {c['roc_auc']:<9.4f} | {c['recall']*100:<7.2f}% | {c['precision']*100:<9.2f}% | {c['f1_score']*100:<9.2f}% | {c['accuracy']*100:<8.2f}% | {best_tag}")
    print("=" * 82)
    print(f"  Champion Classifier: {best_model_name} (ROC-AUC = {best_item['roc_auc']:.4f})")
    print("=" * 82)

    return trained_models, models_comparison, models_detail, best_model_name


def save_classifier_artifacts(
    trained_models: dict,
    models_comparison: list[dict],
    models_detail: dict,
    feature_names: list[str],
    best_model_name: str
):
    """Persists all model binaries, backward-compatible Random Forest pkl, and comprehensive JSON metrics."""
    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Save all models in unified dictionary
    multi_model_path = SAVED_MODELS_DIR / "churn_models.pkl"
    joblib.dump({
        "models": trained_models,
        "feature_names": feature_names,
        "models_detail": models_detail,
        "models_comparison": models_comparison,
        "best_model_name": best_model_name,
    }, multi_model_path)
    print(f"\n[PERSISTENCE] Serialized complete multi-model suite to: {multi_model_path}")

    # 2. Save Scikit-Learn Random Forest Binary for full backward compatibility
    rf_model = trained_models.get("Random Forest")
    rf_metrics = models_detail.get("Random Forest", {}).get("metrics", {})
    rf_path = SAVED_MODELS_DIR / "churn_forest.pkl"
    joblib.dump({
        "model": rf_model,
        "feature_names": feature_names,
        "metrics": rf_metrics,
    }, rf_path)
    print(f"[PERSISTENCE] Maintained backward-compatible Random Forest binary at: {rf_path}")

    # 3. Save JSON Summary for Backend API and Dashboard consumption
    summary_path = SAVED_MODELS_DIR / "classifier_summary.json"
    default_model = models_detail.get(best_model_name, models_detail.get("Random Forest"))
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            # Top-level backward compatibility fields
            "model_type": default_model["model_name"],
            "metrics": default_model["metrics"],
            "top_features": default_model["top_features"],
            "all_feature_ranking": default_model["all_feature_ranking"],
            # Multi-algorithm benchmark payload
            "available_models": list(trained_models.keys()),
            "best_model": best_model_name,
            "models_comparison": models_comparison,
            "models_detail": models_detail,
        }, f, indent=2)
    print(f"[PERSISTENCE] Saved classification metrics summary with comparative benchmarks to: {summary_path}")


def train_churn_model(
    X: pd.DataFrame,
    y: np.ndarray,
    feature_names: list[str],
    n_estimators: int = 100,
    max_depth: int = 8,
    random_state: int = 42
):
    """Backward-compatible signature: delegates to multi-model training pipeline."""
    trained_models, comparison, details, best_name = train_multi_churn_models(
        X, y, feature_names, random_state=random_state
    )
    save_classifier_artifacts(trained_models, comparison, details, feature_names, best_name)
    rf_model = trained_models["Random Forest"]
    rf_metrics = details["Random Forest"]["metrics"]
    rf_rankings = details["Random Forest"]["all_feature_ranking"]
    return rf_model, rf_metrics, rf_rankings


if __name__ == "__main__":
    from feature_extractor import extract_warehouse_data, get_classification_features

    df_wh = extract_warehouse_data()
    X, y, feature_names = get_classification_features(df_wh)
    trained_models, comparison, details, best_name = train_multi_churn_models(X, y, feature_names)
    save_classifier_artifacts(trained_models, comparison, details, feature_names, best_name)
