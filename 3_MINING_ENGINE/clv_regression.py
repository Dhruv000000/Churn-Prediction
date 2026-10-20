#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/clv_regression.py
Purpose: Continuous Value Estimation — Customer Lifetime Value (CLV) Regression Engine.
         Trains an L2-regularized Ridge Regression model on analytical Star Schema data
         to estimate Customer Lifetime Value ($) based on tenure, contract type,
         monthly charges, and spend history. Acts as a profit guardrail for retention discounts.
"""

import sys
import json
import time
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
SAVED_MODELS_DIR = CURRENT_DIR / "saved_models"


def prepare_clv_features(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray, list[str]]:
    """
    Constructs feature matrix for Customer Lifetime Value (CLV) regression:
    - tenure_months (Tenure)
    - monthly_charges (Recurring Spend)
    - spend_history (tenure_months * monthly_charges or historical total_charges)
    - contract (One-hot encoded contract commitments: One year, Two year)
    Target:
    - total_charges (cumulative customer lifetime value in dollars)
    """
    df_work = df.copy()

    if "total_charges" in df_work.columns and df_work["total_charges"].notna().all():
        y = df_work["total_charges"].values.astype(np.float64)
    else:
        y = (df_work["tenure_months"] * df_work["monthly_charges"]).values.astype(np.float64)

    spend_history = (df_work["tenure_months"] * df_work["monthly_charges"]).astype(np.float64)

    feature_dict = {
        "tenure_months": df_work["tenure_months"].astype(np.float64),
        "monthly_charges": df_work["monthly_charges"].astype(np.float64),
        "spend_history": spend_history,
    }

    base_df = pd.DataFrame(feature_dict)

    contract_series = df_work["contract"] if "contract" in df_work.columns else pd.Series(["Month-to-month"] * len(df_work))
    contract_dummies = pd.get_dummies(contract_series, prefix="contract", drop_first=False, dtype=float)

    for col in ["contract_One year", "contract_Two year"]:
        if col in contract_dummies.columns:
            base_df[col] = contract_dummies[col]
        else:
            base_df[col] = 0.0

    feature_cols = list(base_df.columns)
    return base_df, y, feature_cols


def train_clv_model(
    df: pd.DataFrame,
    alpha: float = 1.0,
    random_state: int = 42
) -> tuple[Ridge, dict, list[str]]:
    """
    Trains and validates an L2-regularized Ridge Regression model for CLV estimation.
    """
    print("\n" + "=" * 82)
    print("  CONTINUOUS VALUE ESTIMATION: CUSTOMER LIFETIME VALUE (CLV) REGRESSION")
    print("=" * 82)

    X, y, feature_cols = prepare_clv_features(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state
    )

    start_t = time.time()
    reg = Ridge(alpha=alpha, random_state=random_state)
    reg.fit(X_train, y_train)
    fit_duration = time.time() - start_t

    y_pred = reg.predict(X_test)
    r2 = float(r2_score(y_test, y_pred))
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(np.mean((y_test - y_pred) ** 2)))

    metrics = {
        "model_type": "Ridge Regression (L2 Regularized)",
        "alpha": alpha,
        "r2_score": round(r2, 4),
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "training_duration_seconds": round(fit_duration, 2),
        "test_samples": int(len(y_test)),
        "train_samples": int(len(y_train)),
        "coefficients": {col: round(float(coef), 4) for col, coef in zip(feature_cols, reg.coef_)},
        "intercept": round(float(reg.intercept_), 4),
    }

    print(f"[FIT] Ridge Regression fitted in {fit_duration:.2f}s across {len(X_train):,} training records.")
    print(f"      * R² Variance Explained: {r2:.4f} ({r2*100:.2f}%)")
    print(f"      * Mean Absolute Error   : ${mae:.2f}")
    print(f"      * Root Mean Squared Error: ${rmse:.2f}")
    print("=" * 82)

    return reg, metrics, feature_cols


def save_clv_artifacts(reg: Ridge, metrics: dict, feature_cols: list[str]):
    """Persists trained regression model and metadata for API inference."""
    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SAVED_MODELS_DIR / "clv_regression.pkl"
    joblib.dump({
        "model": reg,
        "feature_cols": feature_cols,
        "metrics": metrics,
    }, out_path)

    summary_path = SAVED_MODELS_DIR / "clv_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"[PERSISTENCE] CLV Regression model saved to: {out_path}")
    print(f"[PERSISTENCE] CLV Summary metrics saved to: {summary_path}")


def predict_clv(
    reg_payload: dict,
    tenure_months: int,
    monthly_charges: float,
    contract: str = "Month-to-month",
    total_charges: float = None
) -> float:
    """Estimates Customer Lifetime Value in dollars for a single customer."""
    model = reg_payload["model"]
    feature_cols = reg_payload["feature_cols"]

    spend_history = float(total_charges) if total_charges is not None else float(tenure_months * monthly_charges)

    row_dict = {
        "tenure_months": float(tenure_months),
        "monthly_charges": float(monthly_charges),
        "spend_history": spend_history,
        "contract_One year": 1.0 if contract == "One year" else 0.0,
        "contract_Two year": 1.0 if contract == "Two year" else 0.0,
    }

    df_single = pd.DataFrame([row_dict])[feature_cols]
    pred = float(model.predict(df_single)[0])
    return max(round(pred, 2), 0.0)


if __name__ == "__main__":
    from feature_extractor import extract_warehouse_data

    df_wh = extract_warehouse_data()
    reg, metrics, feat_cols = train_clv_model(df_wh)
    save_clv_artifacts(reg, metrics, feat_cols)
