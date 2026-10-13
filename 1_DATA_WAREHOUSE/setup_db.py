#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Script: 1_DATA_WAREHOUSE/setup_db.py
Description: Automated DWH schema migration and OLAP view deployment script.
             Supports PostgreSQL as primary production target and SQLite
             as an embedded zero-configuration fallback.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

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

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/churn_dwh"
)

DDL_FILE = CURRENT_DIR / "01_schema_ddl.sql"
VIEWS_FILE = CURRENT_DIR / "02_olap_analytical_views.sql"


def print_banner(is_sqlite=False):
    print("=" * 78)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  Task 2: Analytical Data Warehouse Initialization Script")
    print("=" * 78)
    masked_url = DATABASE_URL
    if "@" in masked_url and "://" in masked_url:
        protocol_user, host_db = masked_url.split("@", 1)
        if ":" in protocol_user:
            prefix = protocol_user.split(":", 2)[0] + ":" + protocol_user.split(":", 2)[1]
            masked_url = f"{prefix}:****@{host_db}"
    engine_type = "Embedded SQLite Warehouse" if is_sqlite else "PostgreSQL Star Schema"
    print(f"  Target Engine : {engine_type}")
    print(f"  Connection URL: {masked_url}")
    print("=" * 78)


def setup_sqlite_schema(engine):
    """Initializes Star Schema and Analytical Views inside local SQLite database."""
    print("\n[SQLITE] Deploying Star Schema Tables and Views to SQLite...")

    schema_sql = """
    -- Clean existing objects
    DROP TABLE IF EXISTS fact_subscriptions;
    DROP TABLE IF EXISTS dim_customer;
    DROP TABLE IF EXISTS dim_service_plan;
    DROP TABLE IF EXISTS dim_billing;
    DROP VIEW IF EXISTS mv_rollup_contract_service;
    DROP VIEW IF EXISTS view_slice_high_risk_month_to_month;
    DROP VIEW IF EXISTS view_cube_demographics_billing;
    DROP VIEW IF EXISTS view_window_contract_churn_rankings;

    -- Dim_Customer
    CREATE TABLE dim_customer (
        customer_key    INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id     TEXT UNIQUE NOT NULL,
        gender          TEXT,
        senior_citizen  INTEGER,
        partner         TEXT,
        dependents      TEXT
    );

    -- Dim_Service_Plan
    CREATE TABLE dim_service_plan (
        service_key         INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_service       TEXT,
        multiple_lines      TEXT,
        internet_service    TEXT,
        online_security     TEXT,
        online_backup       TEXT,
        device_protection   TEXT,
        tech_support        TEXT,
        streaming_tv        TEXT,
        streaming_movies    TEXT
    );

    -- Dim_Billing
    CREATE TABLE dim_billing (
        billing_key         INTEGER PRIMARY KEY AUTOINCREMENT,
        contract            TEXT,
        paperless_billing   TEXT,
        payment_method      TEXT
    );

    -- Fact_Subscriptions
    CREATE TABLE fact_subscriptions (
        fact_key            INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_key        INTEGER NOT NULL REFERENCES dim_customer(customer_key),
        service_key         INTEGER NOT NULL REFERENCES dim_service_plan(service_key),
        billing_key         INTEGER NOT NULL REFERENCES dim_billing(billing_key),
        tenure_months       INTEGER NOT NULL,
        monthly_charges     NUMERIC(10, 2) NOT NULL,
        total_charges       NUMERIC(10, 2) NOT NULL,
        churn_flag          INTEGER NOT NULL
    );

    -- Performance Indexes
    CREATE INDEX idx_fact_customer_key ON fact_subscriptions (customer_key);
    CREATE INDEX idx_fact_service_key  ON fact_subscriptions (service_key);
    CREATE INDEX idx_fact_billing_key  ON fact_subscriptions (billing_key);
    CREATE INDEX idx_fact_churn_flag   ON fact_subscriptions (churn_flag);

    -- Analytical View: Roll-up summary (Simulating Materialized View in SQLite)
    CREATE VIEW mv_rollup_contract_service AS
    SELECT
        COALESCE(b.contract, '--- ALL CONTRACT TIERS ---')          AS contract_tier,
        COALESCE(s.internet_service, '--- ALL INTERNET SERVICES ---') AS internet_service_type,
        COUNT(f.fact_key)                                           AS total_subscribers,
        SUM(f.churn_flag)                                           AS churned_subscribers,
        COUNT(f.fact_key) - SUM(f.churn_flag)                      AS retained_subscribers,
        ROUND((CAST(SUM(f.churn_flag) AS FLOAT) / NULLIF(COUNT(f.fact_key), 0)) * 100, 2) AS churn_rate_pct,
        ROUND(AVG(f.tenure_months), 1)                              AS avg_tenure_months,
        ROUND(AVG(f.monthly_charges), 2)                            AS avg_monthly_charges,
        ROUND(SUM(f.monthly_charges), 2)                            AS total_monthly_mrr,
        ROUND(SUM(f.total_charges), 2)                              AS total_cumulative_revenue
    FROM fact_subscriptions f
    JOIN dim_billing b       ON f.billing_key = b.billing_key
    JOIN dim_service_plan s  ON f.service_key = s.service_key
    GROUP BY b.contract, s.internet_service;

    -- Slice & Dice View
    CREATE VIEW view_slice_high_risk_month_to_month AS
    SELECT
        c.customer_id,
        c.gender,
        CASE WHEN c.senior_citizen = 1 THEN 'Senior' ELSE 'Non-Senior' END AS senior_status,
        b.contract,
        b.payment_method,
        s.internet_service,
        f.tenure_months,
        f.monthly_charges,
        f.total_charges,
        f.churn_flag
    FROM fact_subscriptions f
    JOIN dim_customer c      ON f.customer_key = c.customer_key
    JOIN dim_billing b       ON f.billing_key  = b.billing_key
    JOIN dim_service_plan s  ON f.service_key  = s.service_key
    WHERE b.contract = 'Month-to-month' AND f.monthly_charges > 70.00;

    -- Analytical Window Ranking View
    CREATE VIEW view_window_contract_churn_rankings AS
    SELECT
        b.contract,
        c.customer_id,
        s.internet_service,
        f.tenure_months,
        f.monthly_charges,
        f.total_charges,
        DENSE_RANK() OVER (PARTITION BY b.contract ORDER BY f.monthly_charges DESC) AS revenue_rank_in_contract
    FROM fact_subscriptions f
    JOIN dim_customer c     ON f.customer_key = c.customer_key
    JOIN dim_billing b      ON f.billing_key  = b.billing_key
    JOIN dim_service_plan s ON f.service_key  = s.service_key
    WHERE f.churn_flag = 1;
    """

    with engine.begin() as conn:
        for statement in schema_sql.split(";"):
            stmt = statement.strip()
            if stmt:
                conn.execute(text(stmt))
    print("[SUCCESS] SQLite Star Schema and Analytical Views created successfully!")


def execute_sql_file(engine, file_path: Path, title: str):
    """Executes multi-statement SQL script for PostgreSQL."""
    if not file_path.exists():
        print(f"[ERROR] Required SQL file not found at {file_path}")
        sys.exit(1)

    print(f"\n[FILE] Reading {title} from: {file_path.name}...")
    with open(file_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    print(f"[RUNNING] Executing {title}...")
    with engine.begin() as conn:
        conn.execute(text(sql_content))
    print(f"[SUCCESS] {title} executed successfully!")


def verify_dwh_objects(engine, is_sqlite=False):
    """Queries system metadata to verify created Star Schema objects."""
    print("\n[VERIFICATION] Verifying Data Warehouse Schema & Objects:")
    print("-" * 78)

    with engine.connect() as conn:
        if is_sqlite:
            res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")).fetchall()
            created_tables = [r[0] for r in res]
            v_res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='view';")).fetchall()
            created_views = [r[0] for r in v_res]
            i_res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_fact_%';")).fetchall()
            indexes = [r[0] for r in i_res]

            print(f"[TABLES] Base Tables Verified ({len(created_tables)}/4):")
            for tbl in created_tables:
                print(f"   * {tbl}")
            print(f"\n[VIEWS] Analytical Views Verified ({len(created_views)}):")
            for vw in created_views:
                print(f"   * {vw}")
            print(f"\n[INDEXES] Performance Indexes Verified ({len(indexes)}):")
            for idx in indexes:
                print(f"   * {idx}")
        else:
            tables_query = text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                  AND table_name IN ('dim_customer', 'dim_service_plan', 'dim_billing', 'fact_subscriptions')
                ORDER BY table_name;
            """)
            created_tables = [row[0] for row in conn.execute(tables_query).fetchall()]
            print(f"[TABLES] Base Tables Verified ({len(created_tables)}/4):")
            for tbl in created_tables:
                print(f"   * public.{tbl}")

    print("-" * 78)
    print("[DONE] Star Schema Initialization & Verification COMPLETE!")
    print("=" * 78)


def main():
    is_sqlite = DATABASE_URL.startswith("sqlite")
    print_banner(is_sqlite=is_sqlite)

    # 1. Connect to database
    engine_url = DATABASE_URL
    if engine_url.startswith("postgresql://"):
        engine_url = engine_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    if is_sqlite:
        # Ensure target directory exists for sqlite file
        db_path_str = engine_url.replace("sqlite:///", "")
        db_path = Path(db_path_str)
        if not db_path.is_absolute():
            db_path = PROJECT_ROOT / db_path
            engine_url = f"sqlite:///{db_path.as_posix()}"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(engine_url)
        setup_sqlite_schema(engine)
        verify_dwh_objects(engine, is_sqlite=True)
    else:
        try:
            engine = create_engine(engine_url, isolation_level="AUTOCOMMIT")
            with engine.connect() as conn:
                version = conn.execute(text("SELECT version();")).scalar()
                print(f"\n[CONNECTED] PostgreSQL Version:\n   {version.split(',')[0]}")
            execute_sql_file(engine, DDL_FILE, "Star Schema DDL (01_schema_ddl.sql)")
            execute_sql_file(engine, VIEWS_FILE, "OLAP Analytical Views (02_olap_analytical_views.sql)")
            verify_dwh_objects(engine, is_sqlite=False)
        except Exception as e:
            print(f"\n[ERROR] PostgreSQL execution failed: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
