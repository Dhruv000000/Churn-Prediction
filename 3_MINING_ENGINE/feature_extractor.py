#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/feature_extractor.py
Purpose: Feature Engineering & Star Schema Extraction Layer.
         Extracts analytical facts and dimensional attributes, handles one-hot encoding,
         and formats numerical matrices for clustering and classification engines.
"""

import os
import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
SAVED_MODELS_DIR = CURRENT_DIR / "saved_models"

backend_env = PROJECT_ROOT / "backend" / ".env"
root_env = PROJECT_ROOT / ".env"

if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
elif root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/churn_dwh"
)


def get_db_engine():
    """Initializes SQLAlchemy engine normalized for PostgreSQL (psycopg2) or SQLite."""
    engine_url = DATABASE_URL
    if engine_url.startswith("postgresql://"):
        engine_url = engine_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return create_engine(engine_url, pool_pre_ping=True)
    elif engine_url.startswith("sqlite"):
        db_path_str = engine_url.replace("sqlite:///", "")
        db_path = Path(db_path_str)
        if not db_path.is_absolute():
            db_path = PROJECT_ROOT / db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return create_engine(f"sqlite:///{db_path.as_posix()}")
    return create_engine(engine_url)


def extract_warehouse_data(engine=None) -> pd.DataFrame:
    """
    Executes analytical Star Schema join across Fact_Subscriptions and
    all three dimensions (Dim_Customer, Dim_Service_Plan, Dim_Billing).
    """
    if engine is None:
        engine = get_db_engine()

    query = """
    SELECT 
        f.fact_key,
        c.customer_id,
        f.tenure_months,
        f.monthly_charges,
        f.total_charges,
        f.churn_flag,
        c.gender,
        c.senior_citizen,
        c.partner,
        c.dependents,
        s.phone_service,
        s.multiple_lines,
        s.internet_service,
        s.online_security,
        s.online_backup,
        s.device_protection,
        s.tech_support,
        s.streaming_tv,
        s.streaming_movies,
        b.contract,
        b.paperless_billing,
        b.payment_method
    FROM fact_subscriptions f
    JOIN dim_customer c     ON f.customer_key = c.customer_key
    JOIN dim_service_plan s ON f.service_key  = s.service_key
    JOIN dim_billing b      ON f.billing_key  = b.billing_key;
    """

    with engine.connect() as conn:
        df = pd.read_sql(text(query), con=conn)

    print(f"[EXTRACTOR] Extracted {len(df):,} analytical rows from Star Schema.")
    return df


def get_clustering_features(df: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    """
    Extracts core behavioural feature matrix for K-Means Customer Persona clustering:
    - tenure_months (Tenure / Relationship Duration)
    - monthly_charges (Revenue / Monthly Financial Commitment)
    """
    feature_cols = ["tenure_months", "monthly_charges"]
    X_cluster = df[feature_cols].values.astype(np.float64)
    print(f"[EXTRACTOR] Clustering Feature Matrix: {X_cluster.shape[0]:,} rows x {X_cluster.shape[1]} features ({feature_cols})")
    return X_cluster, feature_cols


def get_classification_features(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray, list[str]]:
    """
    Constructs one-hot encoded feature matrix for Supervised Churn Classification:
    - Numeric continuous: tenure_months, monthly_charges, total_charges
    - Categorical dimensions: senior_citizen, gender, partner, dependents, services, billing
    """
    # Exclude identifiers and fact surrogate keys
    exclude_cols = ["fact_key", "customer_id", "churn_flag"]
    feature_source = df.drop(columns=exclude_cols)

    # Identify categorical columns for one-hot encoding
    cat_cols = [
        "gender", "partner", "dependents", "phone_service", "multiple_lines",
        "internet_service", "online_security", "online_backup", "device_protection",
        "tech_support", "streaming_tv", "streaming_movies", "contract",
        "paperless_billing", "payment_method"
    ]

    # Deterministic dummy variable encoding with drop_first=True to avoid multicollinearity
    X_encoded = pd.get_dummies(feature_source, columns=cat_cols, drop_first=True, dtype=int)
    y = df["churn_flag"].values.astype(int)

    feature_names = list(X_encoded.columns)
    print(f"[EXTRACTOR] Classification Feature Matrix: {X_encoded.shape[0]:,} rows x {X_encoded.shape[1]} encoded features")
    print(f"[EXTRACTOR] Target Class Distribution: Retained (0) = {(y == 0).sum():,} | Churned (1) = {(y == 1).sum():,} ({((y == 1).sum() / len(y)) * 100:.2f}%)")

    # Persist feature schema metadata
    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    schema_path = SAVED_MODELS_DIR / "feature_schema.json"
    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump({
            "numeric_features": ["tenure_months", "monthly_charges", "total_charges"],
            "categorical_source_features": cat_cols,
            "encoded_feature_names": feature_names,
            "total_features": len(feature_names),
        }, f, indent=2)
    print(f"[EXTRACTOR] Saved feature schema metadata to: {schema_path}")

    return X_encoded, y, feature_names


if __name__ == "__main__":
    print("=" * 78)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  Task 4: Analytical Feature Extraction Test")
    print("=" * 78)

    df_warehouse = extract_warehouse_data()
    X_clust, cluster_cols = get_clustering_features(df_warehouse)
    X_clf, y_clf, clf_cols = get_classification_features(df_warehouse)
    print("=" * 78)
    print("[SUCCESS] Feature extractor verified.")
