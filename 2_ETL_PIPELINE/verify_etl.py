#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  2_ETL_PIPELINE/verify_etl.py
Purpose: Post-ETL Data Quality Audit and Referential Integrity Verification Suite.
         Executes analytical audit queries against PostgreSQL or SQLite Star Schema tables.
"""

import os
import sys
from pathlib import Path
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


def run_audit():
    print("=" * 80)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  Task 3: Post-ETL Data Quality Audit & Integrity Verification")
    print("=" * 80)

    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
            is_sqlite = engine.dialect.name == "sqlite"
            db_type = "SQLite Warehouse" if is_sqlite else "PostgreSQL Star Schema"
            print(f"[CONNECTED] Database Engine: {db_type}")
    except Exception as e:
        print(f"\n[ERROR] Unable to connect to database: {e}")
        print("[TIPS] Verify database configuration in 'backend/.env'.")
        sys.exit(1)

    all_passed = True
    audit_results = []

    with engine.connect() as conn:
        # ---------------------------------------------------------------------
        # TEST 1: Row Count Audits Across Dimensions & Fact Table
        # ---------------------------------------------------------------------
        print("\n[TEST GROUP 1] Table Volume & Population Counts:")
        print("-" * 80)

        tables = ["dim_customer", "dim_service_plan", "dim_billing", "fact_subscriptions"]
        for tbl in tables:
            cnt = conn.execute(text(f"SELECT COUNT(*) FROM {tbl};")).scalar()
            passed = cnt > 0
            all_passed = all_passed and passed
            status = "[PASS]" if passed else "[FAIL]"
            print(f"  {status} {tbl.ljust(22)} : {cnt:>6,} records")
            audit_results.append((f"Row Count: {tbl}", "> 0 records", f"{cnt:,} records", status))

        # ---------------------------------------------------------------------
        # TEST 2: Zero Orphaned Foreign Keys (Referential Integrity)
        # ---------------------------------------------------------------------
        print("\n[TEST GROUP 2] Referential Integrity & Orphan Key Checks:")
        print("-" * 80)

        orphan_queries = [
            (
                "Orphan Customer Keys",
                """
                SELECT COUNT(*) FROM fact_subscriptions f
                LEFT JOIN dim_customer d ON f.customer_key = d.customer_key
                WHERE d.customer_key IS NULL;
                """
            ),
            (
                "Orphan Service Keys",
                """
                SELECT COUNT(*) FROM fact_subscriptions f
                LEFT JOIN dim_service_plan d ON f.service_key = d.service_key
                WHERE d.service_key IS NULL;
                """
            ),
            (
                "Orphan Billing Keys",
                """
                SELECT COUNT(*) FROM fact_subscriptions f
                LEFT JOIN dim_billing d ON f.billing_key = d.billing_key
                WHERE d.billing_key IS NULL;
                """
            ),
        ]

        for test_name, q in orphan_queries:
            orphan_count = conn.execute(text(q)).scalar()
            passed = orphan_count == 0
            all_passed = all_passed and passed
            status = "[PASS]" if passed else "[FAIL]"
            print(f"  {status} {test_name.ljust(25)} : {orphan_count} orphans")
            audit_results.append((test_name, "0 orphans", f"{orphan_count} orphans", status))

        # ---------------------------------------------------------------------
        # TEST 3: Foreign Key Non-Nullability Constraint
        # ---------------------------------------------------------------------
        print("\n[TEST GROUP 3] Foreign Key Completeness (Non-Null Check):")
        print("-" * 80)

        null_fk_query = """
            SELECT COUNT(*) FROM fact_subscriptions
            WHERE customer_key IS NULL OR service_key IS NULL OR billing_key IS NULL;
        """
        null_fks = conn.execute(text(null_fk_query)).scalar()
        passed = null_fks == 0
        all_passed = all_passed and passed
        status = "[PASS]" if passed else "[FAIL]"
        print(f"  {status} NULL Foreign Keys Check  : {null_fks} nulls")
        audit_results.append(("NULL Foreign Keys", "0 nulls", f"{null_fks} nulls", status))

        # ---------------------------------------------------------------------
        # TEST 4: Distribution & Measure Range Sanity Check
        # ---------------------------------------------------------------------
        print("\n[TEST GROUP 4] Analytical Measure Distributions:")
        print("-" * 80)

        metrics_query = """
            SELECT 
                COUNT(*)                                                AS total_rows,
                ROUND(AVG(monthly_charges), 2)                          AS avg_monthly_charge,
                MIN(monthly_charges)                                    AS min_monthly_charge,
                MAX(monthly_charges)                                    AS max_monthly_charge,
                ROUND(AVG(total_charges), 2)                            AS avg_total_charges,
                MIN(tenure_months)                                      AS min_tenure,
                MAX(tenure_months)                                      AS max_tenure,
                SUM(churn_flag)                                         AS total_churned,
                ROUND((CAST(SUM(churn_flag) AS FLOAT) / COUNT(*)) * 100, 2) AS churn_rate_pct
            FROM fact_subscriptions;
        """
        metrics = conn.execute(text(metrics_query)).mappings().first()

        if metrics and metrics["total_rows"] > 0:
            print(f"  * Total Subscriptions   : {metrics['total_rows']:,}")
            print(f"  * Total Churned Lost    : {metrics['total_churned']:,} ({metrics['churn_rate_pct']}%)")
            print(f"  * Avg Monthly Charge    : ${metrics['avg_monthly_charge']} (Range: ${metrics['min_monthly_charge']} - ${metrics['max_monthly_charge']})")
            print(f"  * Avg Cumulative Billed : ${metrics['avg_total_charges']}")
            print(f"  * Tenure Months Range   : {metrics['min_tenure']} to {metrics['max_tenure']} months")

            range_valid = (
                metrics["min_monthly_charge"] >= 0 and
                metrics["min_tenure"] >= 0 and
                metrics["churn_rate_pct"] > 0 and metrics["churn_rate_pct"] < 100
            )
            passed = range_valid
            all_passed = all_passed and passed
            status = "[PASS]" if passed else "[FAIL]"
            audit_results.append(("Measure Range Sanity", "Valid positive values", f"Churn: {metrics['churn_rate_pct']}%", status))

        # ---------------------------------------------------------------------
        # TEST 5: Materialized / Analytical View Freshness Check
        # ---------------------------------------------------------------------
        print("\n[TEST GROUP 5] OLAP Materialized / Analytical View Operational Status:")
        print("-" * 80)
        try:
            if not is_sqlite:
                conn.execute(text("REFRESH MATERIALIZED VIEW mv_rollup_contract_service;"))
            mv_count = conn.execute(text("SELECT COUNT(*) FROM mv_rollup_contract_service;")).scalar()
            passed = mv_count > 0
            all_passed = all_passed and passed
            status = "[PASS]" if passed else "[FAIL]"
            print(f"  {status} OLAP Rollup View Operational : Successfully queried ({mv_count} rollup tiers)")
            audit_results.append(("OLAP View Status", "Executable & populated", f"{mv_count} tiers", status))
        except SQLAlchemyError as err:
            all_passed = False
            print(f"  [FAIL] OLAP View Status : Error ({err})")
            audit_results.append(("OLAP View Status", "Executable & populated", "View error", "[FAIL]"))

    # -------------------------------------------------------------------------
    # FINAL AUDIT SUMMARY TABLE
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("                      FINAL ETL AUDIT SUMMARY MATRIX")
    print("=" * 80)
    print(f"{'Audit Check':<32} | {'Expected':<22} | {'Observed':<14} | {'Status':<6}")
    print("-" * 80)
    for check, expected, observed, status in audit_results:
        print(f"{check:<32} | {expected:<22} | {observed:<14} | {status:<6}")
    print("=" * 80)

    if all_passed:
        print("  🎉 AUDIT RESULT: ALL TESTS PASSED! DATA WAREHOUSE IS INTEGRITY-CERTIFIED.")
    else:
        print("  ⚠️ AUDIT RESULT: ONE OR MORE INTEGRITY TESTS FAILED. PLEASE REVIEW LOGS.")
    print("=" * 78)
    return all_passed


if __name__ == "__main__":
    success = run_audit()
    sys.exit(0 if success else 1)
