#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/churn_classifier.py
Purpose: Supervised Predictive Retention & Churn Classification Engine.
         Trains an ensemble Random Forest with balanced class weighting,
         computes multi-metric evaluation (Accuracy, Precision, Recall, F1, ROC-AUC),
         confusion matrix diagnostics, and Gini feature importances.
"""

import os
import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
SAVED_MODELS_DIR = CURRENT_DIR / "saved_models"


def train_churn_model(
    X: pd.DataFrame,
    y: np.ndarray,
    feature_names: list[str],
    n_estimators: int = 100,
    max_depth: int = 8,
    random_state: int = 42
) -> tuple[RandomForestClassifier, dict, list[dict]]:
    """
    Executes supervised model training, evaluation, and feature importance extraction.
    """
    print("\n" + "=" * 78)
    print("  SUPERVISED CHURN PREDICTION PIPELINE: RANDOM FOREST")
    print("=" * 78)

    # 1. Stratified Train-Test Split (80% Train, 20% Test)
    # Stratification guarantees identical 26.54% churn prevalence in train and test splits
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )
    print(f"[SPLIT] Training Set  : {X_train.shape[0]:,} samples (Churn = {np.mean(y_train)*100:.2f}%)")
    print(f"[SPLIT] Holdout Test Set: {X_test.shape[0]:,} samples (Churn = {np.mean(y_test)*100:.2f}%)")

    # 2. Model Initialization with Balanced Class Weighting
    # Churn represents 26.5% of total subscribers. Balanced class weights penalize
    # False Negatives (missed churners) proportionally to mitigate class imbalance.
    print(f"\n[MODEL] Initializing RandomForestClassifier:")
    print(f"   * Estimators : {n_estimators}")
    print(f"   * Max Depth  : {max_depth}")
    print(f"   * Weighting  : 'balanced'")
    print(f"   * Criterion  : Gini Impurity")

    clf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1
    )

    # 3. Fit Model
    print("[TRAINING] Fitting ensemble trees on training data...")
    clf.fit(X_train, y_train)
    print("[TRAINING] Fit completed.")

    # 4. Predict on Holdout Test Set
    y_pred = clf.predict(X_test)
    y_pred_proba = clf.predict_proba(X_test)[:, 1]

    # 5. Comprehensive Metric Calculation
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
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

    # 6. Gini Feature Importance Ranking
    importances = clf.feature_importances_
    sorted_indices = np.argsort(importances)[::-1]

    feature_ranking = []
    for rank, idx in enumerate(sorted_indices, 1):
        feature_ranking.append({
            "rank": rank,
            "feature": feature_names[idx],
            "importance": round(float(importances[idx]), 4),
            "importance_pct": round(float(importances[idx] * 100), 2),
        })

    # Print Evaluation Summary
    print("\n" + "-" * 78)
    print("                    HOLDOUT EVALUATION METRICS MATRIX")
    print("-" * 78)
    print(f"  Accuracy  : {acc * 100:>6.2f}%   | Overall correct classification rate")
    print(f"  Precision : {prec * 100:>6.2f}%   | Out of predicted churners, true churners")
    print(f"  Recall    : {rec * 100:>6.2f}%   | Churn capture rate (Sensitivity)")
    print(f"  F1-Score  : {f1 * 100:>6.2f}%   | Harmonic mean of Precision and Recall")
    print(f"  ROC-AUC   : {roc_auc:>8.4f}   | Discriminative ranking power")
    print("-" * 78)
    print("                    CONFUSION MATRIX DIAGNOSTICS")
    print("-" * 78)
    print(f"  True Negatives  (TN) : {tn:>5,}  (Retained customers correctly predicted)")
    print(f"  False Positives (FP) : {fp:>5,}  (Type I: Retained wrongly flagged as churn)")
    print(f"  False Negatives (FN) : {fn:>5,}  (Type II: Missed churners who left company)")
    print(f"  True Positives  (TP) : {tp:>5,}  (Caught churners targeted for retention)")
    print("-" * 78)
    print("                  TOP 8 GINI FEATURE IMPORTANCES")
    print("-" * 78)
    for item in feature_ranking[:8]:
        bar = "█" * int(item["importance_pct"] / 1.5)
        print(f"  #{item['rank']:<2} {item['feature'].ljust(32)}: {item['importance_pct']:>5.2f}% {bar}")
    print("-" * 78)

    return clf, metrics, feature_ranking


def save_classifier_artifacts(clf, metrics: dict, feature_ranking: list[dict], feature_names: list[str]):
    """Persists model binary, schema, and JSON metrics report."""
    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Save Scikit-Learn Random Forest Binary
    model_path = SAVED_MODELS_DIR / "churn_forest.pkl"
    joblib.dump({
        "model": clf,
        "feature_names": feature_names,
        "metrics": metrics,
    }, model_path)
    print(f"\n[PERSISTENCE] Serialized Random Forest model to: {model_path}")

    # 2. Save JSON Summary for Backend API and Dashboard consumption
    summary_path = SAVED_MODELS_DIR / "classifier_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "model_type": "RandomForestClassifier",
            "hyperparameters": {
                "n_estimators": clf.n_estimators,
                "max_depth": clf.max_depth,
                "class_weight": "balanced",
            },
            "metrics": metrics,
            "top_features": feature_ranking[:10],
            "all_feature_ranking": feature_ranking,
        }, f, indent=2)
    print(f"[PERSISTENCE] Saved classification metrics summary to: {summary_path}")


if __name__ == "__main__":
    from feature_extractor import extract_warehouse_data, get_classification_features

    df_wh = extract_warehouse_data()
    X, y, feature_names = get_classification_features(df_wh)
    forest_model, eval_metrics, rankings = train_churn_model(X, y, feature_names)
    save_classifier_artifacts(forest_model, eval_metrics, rankings, feature_names)
