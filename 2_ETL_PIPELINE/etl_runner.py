#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  2_ETL_PIPELINE/etl_runner.py
Purpose: Production-grade End-to-End ETL Pipeline.
         Ingests raw Telco Churn CSV, performs data cleansing and validation,
         resolves dimensional surrogate keys, and populates the Star Schema.
         Supports PostgreSQL and SQLite warehouses seamlessly.
"""

import os
import sys
import time
import argparse
from pathlib import Path
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

# -----------------------------------------------------------------------------
# Configuration & Environment Resolution
# -----------------------------------------------------------------------------
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent

backend_env = PROJECT_ROOT / "backend" / ".env"
root_env = PROJECT_ROOT / ".env"

if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
elif root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

DATA_PRIMARY = PROJECT_ROOT / "data" / "raw" / "telco_churn.csv"
DATA_KAGGLE = PROJECT_ROOT / "data" / "raw" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"

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


# -----------------------------------------------------------------------------
# PHASE 1: EXTRACT
# -----------------------------------------------------------------------------
def extract_phase(file_path: Path) -> pd.DataFrame:
    """Reads raw CSV dataset and logs raw ingestion metrics."""
    print("\n" + "=" * 78)
    print("  PHASE 1: EXTRACT (Raw Data Ingestion)")
    print("=" * 78)

    resolved_path = file_path
    if not resolved_path.exists():
        if DATA_PRIMARY.exists():
            resolved_path = DATA_PRIMARY
        elif DATA_KAGGLE.exists():
            resolved_path = DATA_KAGGLE
        else:
            raise FileNotFoundError(f"Raw dataset file not found at: {file_path}")

    print(f"[EXTRACT] Ingesting CSV from: {resolved_path}")
    df_raw = pd.read_csv(resolved_path)
    print(f"[EXTRACT] Total Rows Ingested: {len(df_raw):,}")
    print(f"[EXTRACT] Total Columns Ingested: {len(df_raw.columns)}")
    print(f"[EXTRACT] Ingestion Memory Footprint: {df_raw.memory_usage(deep=True).sum() / (1024 * 1024):.2f} MB")
    print(f"[EXTRACT] Features: {list(df_raw.columns)}")
    return df_raw


# -----------------------------------------------------------------------------
# PHASE 2: TRANSFORM (Data Cleansing & Validation)
# -----------------------------------------------------------------------------
def transform_phase(df_raw: pd.DataFrame) -> pd.DataFrame:
    """Cleans whitespace, handles TotalCharges anomalies, standardizes flags, and validates."""
    print("\n" + "=" * 78)
    print("  PHASE 2: TRANSFORM (Data Cleansing & Validation)")
    print("=" * 78)
    df_clean = df_raw.copy()

    # 1. Strip leading and trailing whitespace across all text columns
    str_cols = df_clean.select_dtypes(include=["object", "string"]).columns
    for col in str_cols:
        df_clean[col] = df_clean[col].astype(str).str.strip()
    print(f"[TRANSFORM] Stripped whitespace across {len(str_cols)} string attributes.")

    # 2. Critical Edge Case: TotalCharges whitespace detection and tenure == 0 handling
    blank_mask = (df_clean["TotalCharges"] == "") | (df_clean["TotalCharges"] == " ")
    blank_count = blank_mask.sum()
    print(f"[TRANSFORM] Detected {blank_count} records with empty/whitespace 'TotalCharges'.")

    # Coerce TotalCharges to float
    df_clean["TotalCharges"] = pd.to_numeric(df_clean["TotalCharges"], errors="coerce")

    # When tenure == 0, subscribers have just joined; TotalCharges is legally and logically 0.0
    zero_tenure_mask = (df_clean["tenure"] == 0) & (df_clean["TotalCharges"].isna())
    zero_tenure_count = zero_tenure_mask.sum()
    df_clean.loc[zero_tenure_mask, "TotalCharges"] = 0.0
    print(f"[TRANSFORM] Imputed {zero_tenure_count} zero-tenure records with TotalCharges = 0.0")

    # Fallback fill for any remaining anomalous NaNs
    remaining_nans = df_clean["TotalCharges"].isna().sum()
    if remaining_nans > 0:
        df_clean["TotalCharges"] = df_clean["TotalCharges"].fillna(0.0)
        print(f"[TRANSFORM] Imputed {remaining_nans} residual TotalCharges NaNs with 0.0.")

    # 3. Standardize binary flags and targets
    df_clean["SeniorCitizen"] = pd.to_numeric(df_clean["SeniorCitizen"], errors="coerce").fillna(0).astype(int)
    churn_map = {"Yes": 1, "No": 0}
    df_clean["churn_flag"] = df_clean["Churn"].map(churn_map).fillna(0).astype(int)

    # 4. Standardize Column Names to Star Schema standards (snake_case)
    column_renames = {
        "customerID": "customer_id",
        "gender": "gender",
        "SeniorCitizen": "senior_citizen",
        "Partner": "partner",
        "Dependents": "dependents",
        "tenure": "tenure_months",
        "PhoneService": "phone_service",
        "MultipleLines": "multiple_lines",
        "InternetService": "internet_service",
        "OnlineSecurity": "online_security",
        "OnlineBackup": "online_backup",
        "DeviceProtection": "device_protection",
        "TechSupport": "tech_support",
        "StreamingTV": "streaming_tv",
        "StreamingMovies": "streaming_movies",
        "Contract": "contract",
        "PaperlessBilling": "paperless_billing",
        "PaymentMethod": "payment_method",
        "MonthlyCharges": "monthly_charges",
        "TotalCharges": "total_charges",
    }
    df_clean = df_clean.rename(columns=column_renames)

    # 5. Non-Null Validation & Integrity Enforcement
    required_not_null = [
        "customer_id", "tenure_months", "monthly_charges", "total_charges", "churn_flag"
    ]
    null_violations = df_clean[required_not_null].isna().any(axis=1)
    rejected_count = null_violations.sum()

    if rejected_count > 0:
        print(f"[VALIDATION WARNING] Rejected {rejected_count} malformed records violating NOT NULL constraints.")
        df_clean = df_clean[~null_violations]
    else:
        print("[VALIDATION] [PASS] 100% of rows passed non-null validation constraints.")

    print(f"[TRANSFORM] Cleansed records available: {len(df_clean):,} valid rows.")
    return df_clean


# -----------------------------------------------------------------------------
# PHASE 3: LOAD (Dimensional Staging, Surrogate Key Resolution & Fact Loading)
# -----------------------------------------------------------------------------
def load_phase(engine, df_clean: pd.DataFrame, batch_size: int = 1000, truncate: bool = True):
    """
    Populates dimensions, resolves surrogate integer keys, and loads Fact_Subscriptions
    in transactional chunks with full rollback on failure.
    """
    print("\n" + "=" * 78)
    print("  PHASE 3: LOAD (Dimensional Staging & Surrogate Key Resolution)")
    print("=" * 78)

    is_sqlite = engine.dialect.name == "sqlite"

    # Step 3.1: Populate Dim_Customer
    print("[LOAD DIMENSIONS] Staging & upserting Dim_Customer...")
    cust_cols = ["customer_id", "gender", "senior_citizen", "partner", "dependents"]
    dim_cust_df = df_clean[cust_cols].drop_duplicates(subset=["customer_id"])

    with engine.begin() as conn:
        if is_sqlite:
            # Check existing customers in SQLite
            existing_custs = pd.read_sql(text("SELECT customer_id FROM dim_customer;"), con=conn)
            new_custs = dim_cust_df[~dim_cust_df["customer_id"].isin(existing_custs["customer_id"])]
            if len(new_custs) > 0:
                new_custs.to_sql("dim_customer", con=conn, if_exists="append", index=False)
        else:
            conn.execute(text("CREATE TEMP TABLE stage_customer (LIKE dim_customer INCLUDING DEFAULTS) ON COMMIT DROP;"))
            dim_cust_df.to_sql("stage_customer", con=conn, if_exists="append", index=False)
            conn.execute(text("""
                INSERT INTO dim_customer (customer_id, gender, senior_citizen, partner, dependents)
                SELECT s.customer_id, s.gender, s.senior_citizen, s.partner, s.dependents
                FROM stage_customer s
                ON CONFLICT (customer_id) DO UPDATE SET
                    gender = EXCLUDED.gender,
                    senior_citizen = EXCLUDED.senior_citizen,
                    partner = EXCLUDED.partner,
                    dependents = EXCLUDED.dependents;
            """))

        cust_lookup = pd.read_sql(text("SELECT customer_key, customer_id FROM dim_customer;"), con=conn)
    print(f"[LOAD DIMENSIONS] Dim_Customer resolved: {len(cust_lookup):,} surrogate keys.")

    # Step 3.2: Populate Dim_Service_Plan
    print("[LOAD DIMENSIONS] Staging & populating Dim_Service_Plan...")
    service_cols = [
        "phone_service", "multiple_lines", "internet_service",
        "online_security", "online_backup", "device_protection",
        "tech_support", "streaming_tv", "streaming_movies"
    ]
    dim_service_df = df_clean[service_cols].drop_duplicates()

    with engine.begin() as conn:
        if is_sqlite:
            existing_services = pd.read_sql(text("SELECT " + ", ".join(service_cols) + " FROM dim_service_plan;"), con=conn)
            if len(existing_services) == 0:
                dim_service_df.to_sql("dim_service_plan", con=conn, if_exists="append", index=False)
            else:
                merged = dim_service_df.merge(existing_services, on=service_cols, how="left", indicator=True)
                new_services = merged[merged["_merge"] == "left_only"].drop(columns=["_merge"])
                if len(new_services) > 0:
                    new_services.to_sql("dim_service_plan", con=conn, if_exists="append", index=False)
        else:
            conn.execute(text("CREATE TEMP TABLE stage_service (LIKE dim_service_plan INCLUDING DEFAULTS) ON COMMIT DROP;"))
            dim_service_df.to_sql("stage_service", con=conn, if_exists="append", index=False)
            conn.execute(text("""
                INSERT INTO dim_service_plan (
                    phone_service, multiple_lines, internet_service,
                    online_security, online_backup, device_protection,
                    tech_support, streaming_tv, streaming_movies
                )
                SELECT DISTINCT 
                    s.phone_service, s.multiple_lines, s.internet_service,
                    s.online_security, s.online_backup, s.device_protection,
                    s.tech_support, s.streaming_tv, s.streaming_movies
                FROM stage_service s
                WHERE NOT EXISTS (
                    SELECT 1 FROM dim_service_plan d
                    WHERE d.phone_service = s.phone_service
                      AND d.multiple_lines = s.multiple_lines
                      AND d.internet_service = s.internet_service
                      AND d.online_security = s.online_security
                      AND d.online_backup = s.online_backup
                      AND d.device_protection = s.device_protection
                      AND d.tech_support = s.tech_support
                      AND d.streaming_tv = s.streaming_tv
                      AND d.streaming_movies = s.streaming_movies
                );
            """))

        service_lookup = pd.read_sql(
            text("SELECT service_key, " + ", ".join(service_cols) + " FROM dim_service_plan;"),
            con=conn
        )
    print(f"[LOAD DIMENSIONS] Dim_Service_Plan resolved: {len(service_lookup):,} distinct service catalogs.")

    # Step 3.3: Populate Dim_Billing
    print("[LOAD DIMENSIONS] Staging & populating Dim_Billing...")
    billing_cols = ["contract", "paperless_billing", "payment_method"]
    dim_billing_df = df_clean[billing_cols].drop_duplicates()

    with engine.begin() as conn:
        if is_sqlite:
            existing_billing = pd.read_sql(text("SELECT " + ", ".join(billing_cols) + " FROM dim_billing;"), con=conn)
            if len(existing_billing) == 0:
                dim_billing_df.to_sql("dim_billing", con=conn, if_exists="append", index=False)
            else:
                merged_b = dim_billing_df.merge(existing_billing, on=billing_cols, how="left", indicator=True)
                new_billing = merged_b[merged_b["_merge"] == "left_only"].drop(columns=["_merge"])
                if len(new_billing) > 0:
                    new_billing.to_sql("dim_billing", con=conn, if_exists="append", index=False)
        else:
            conn.execute(text("CREATE TEMP TABLE stage_billing (LIKE dim_billing INCLUDING DEFAULTS) ON COMMIT DROP;"))
            dim_billing_df.to_sql("stage_billing", con=conn, if_exists="append", index=False)
            conn.execute(text("""
                INSERT INTO dim_billing (contract, paperless_billing, payment_method)
                SELECT DISTINCT s.contract, s.paperless_billing, s.payment_method
                FROM stage_billing s
                WHERE NOT EXISTS (
                    SELECT 1 FROM dim_billing d
                    WHERE d.contract = s.contract
                      AND d.paperless_billing = s.paperless_billing
                      AND d.payment_method = s.payment_method
                );
            """))

        billing_lookup = pd.read_sql(
            text("SELECT billing_key, " + ", ".join(billing_cols) + " FROM dim_billing;"),
            con=conn
        )
    print(f"[LOAD DIMENSIONS] Dim_Billing resolved: {len(billing_lookup):,} distinct billing plans.")

    # Step 3.4: Surrogate Key Resolution via In-Memory Hash Lookups
    print("\n[SURROGATE RESOLUTION] Performing in-memory hash joins to map surrogate integer keys...")
    df_fact = df_clean.merge(cust_lookup, on="customer_id", how="left")
    df_fact = df_fact.merge(service_lookup, on=service_cols, how="left")
    df_fact = df_fact.merge(billing_lookup, on=billing_cols, how="left")

    # Check for resolution integrity
    unresolved_c = df_fact["customer_key"].isna().sum()
    unresolved_s = df_fact["service_key"].isna().sum()
    unresolved_b = df_fact["billing_key"].isna().sum()

    if unresolved_c or unresolved_s or unresolved_b:
        raise ValueError(
            f"Foreign key resolution failed! Missing keys: "
            f"Customer: {unresolved_c}, Service: {unresolved_s}, Billing: {unresolved_b}"
        )
    print("[SURROGATE RESOLUTION] [PASS] 100% of foreign keys successfully mapped to surrogate integers.")

    fact_cols = [
        "customer_key", "service_key", "billing_key",
        "tenure_months", "monthly_charges", "total_charges", "churn_flag"
    ]
    df_fact_final = df_fact[fact_cols].copy()
    df_fact_final["customer_key"] = df_fact_final["customer_key"].astype(int)
    df_fact_final["service_key"] = df_fact_final["service_key"].astype(int)
    df_fact_final["billing_key"] = df_fact_final["billing_key"].astype(int)

    # Step 3.5: Batch Insert into Fact_Subscriptions with Transactional Integrity
    print(f"\n[LOAD FACT] Batch inserting {len(df_fact_final):,} records into Fact_Subscriptions (batch size = {batch_size})...")
    start_load = time.time()

    try:
        with engine.begin() as conn:
            if truncate:
                print("[TRANSACTION] Truncating Fact_Subscriptions for clean idempotent load...")
                if is_sqlite:
                    conn.execute(text("DELETE FROM fact_subscriptions;"))
                else:
                    conn.execute(text("TRUNCATE TABLE fact_subscriptions RESTART IDENTITY CASCADE;"))

            total_rows = len(df_fact_final)
            for i in range(0, total_rows, batch_size):
                chunk = df_fact_final.iloc[i : i + batch_size]
                chunk.to_sql(
                    "fact_subscriptions",
                    con=conn,
                    if_exists="append",
                    index=False,
                    method="multi"
                )
                print(f"   * Loaded batch {i + 1:,} - {min(i + batch_size, total_rows):,} of {total_rows:,} rows...")

            print("[TRANSACTION] [COMMITTED] All batches successfully committed to Fact_Subscriptions.")
    except Exception as e:
        print(f"[TRANSACTION ERROR] Load failed: {e}. Executed automatic ROLLBACK.")
        raise e

    load_duration = time.time() - start_load
    print(f"[LOAD COMPLETED] {len(df_fact_final):,} Fact records persisted in {load_duration:.2f} seconds.")

    # Step 3.6: Refresh Materialized Views
    print("\n[POST-LOAD] Refreshing / Verifying OLAP Views...")
    with engine.begin() as conn:
        try:
            if is_sqlite:
                cnt = conn.execute(text("SELECT COUNT(*) FROM mv_rollup_contract_service;")).scalar()
                print(f"[POST-LOAD] [SUCCESS] Verified OLAP Rollup View ({cnt} aggregation tiers active).")
            else:
                conn.execute(text("REFRESH MATERIALIZED VIEW mv_rollup_contract_service;"))
                print("[POST-LOAD] [SUCCESS] Refreshed Materialized View: mv_rollup_contract_service")
        except SQLAlchemyError as err:
            print(f"[POST-LOAD WARNING] View refresh skipped: {err}")


# -----------------------------------------------------------------------------
# ORCHESTRATOR
# -----------------------------------------------------------------------------
def run_pipeline(file_path: Path, batch_size: int = 1000, truncate: bool = True):
    print("=" * 78)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  Task 3: Production ETL Pipeline Orchestrator")
    print("=" * 78)

    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                ver = conn.execute(text("SELECT sqlite_version();")).scalar()
                print(f"[DATABASE] Connected to SQLite: v{ver}")
            else:
                ver = conn.execute(text("SELECT version();")).scalar()
                print(f"[DATABASE] Connected to PostgreSQL: {ver.split(',')[0]}")
    except Exception as e:
        print(f"\n[DATABASE CONNECTION ERROR] Could not connect to database: {e}")
        sys.exit(1)

    # Phase 1: Extract
    df_raw = extract_phase(file_path)

    # Phase 2: Transform
    df_clean = transform_phase(df_raw)

    # Phase 3: Load
    load_phase(engine, df_clean, batch_size=batch_size, truncate=truncate)

    print("\n" + "=" * 78)
    print("  🎉 ETL EXECUTION FINISHED: Star Schema Data Staged and Verified!")
    print("=" * 78)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Production ETL Pipeline for Churn DWH.")
    parser.add_argument(
        "--file",
        type=str,
        default=str(DATA_PRIMARY),
        help="Path to raw CSV dataset"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Batch size for Fact table loading (default: 1000)"
    )
    parser.add_argument(
        "--no-truncate",
        action="store_true",
        help="Do not truncate Fact table before inserting."
    )
    args = parser.parse_args()

    run_pipeline(
        file_path=Path(args.file),
        batch_size=args.batch_size,
        truncate=(not args.no_truncate)
    )
