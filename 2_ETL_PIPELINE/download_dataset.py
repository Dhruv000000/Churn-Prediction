#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  2_ETL_PIPELINE/download_dataset.py
Purpose: Ingestion utility to verify and download the Kaggle/IBM Telco Customer Churn dataset.
         Ensures both data/raw/telco_churn.csv and data/raw/WA_Fn-UseC_-Telco-Customer-Churn.csv
         are present and intact before ETL processing.
"""

import sys
import shutil
from pathlib import Path
import pandas as pd
import urllib.request

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
DATA_RAW_DIR = PROJECT_ROOT / "data" / "raw"
PRIMARY_TARGET = DATA_RAW_DIR / "telco_churn.csv"
KAGGLE_TARGET = DATA_RAW_DIR / "WA_Fn-UseC_-Telco-Customer-Churn.csv"

DATASET_URL = (
    "https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d/master/data/Telco-Customer-Churn.csv"
)
FALLBACK_URL = (
    "https://raw.githubusercontent.com/treselle-systems/customer_churn_analysis/master/WA_Fn-UseC_-Telco-Customer-Churn.csv"
)

EXPECTED_COLUMNS = [
    "customerID", "gender", "SeniorCitizen", "Partner", "Dependents",
    "tenure", "PhoneService", "MultipleLines", "InternetService",
    "OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport",
    "StreamingTV", "StreamingMovies", "Contract", "PaperlessBilling",
    "PaymentMethod", "MonthlyCharges", "TotalCharges", "Churn"
]


def ensure_dataset() -> Path:
    print("=" * 78)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  Task 3: Automated Dataset Download & Ingestion Verification")
    print("=" * 78)

    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Check if primary file already exists
    if PRIMARY_TARGET.exists() and PRIMARY_TARGET.stat().st_size > 10000:
        print(f"[FOUND] Primary dataset verified at: {PRIMARY_TARGET}")
        resolved_path = PRIMARY_TARGET
    elif KAGGLE_TARGET.exists() and KAGGLE_TARGET.stat().st_size > 10000:
        print(f"[FOUND] Kaggle dataset verified at: {KAGGLE_TARGET}")
        print(f"[SYNC] Creating standardized copy at: {PRIMARY_TARGET.name}...")
        shutil.copyfile(KAGGLE_TARGET, PRIMARY_TARGET)
        resolved_path = PRIMARY_TARGET
    else:
        print(f"[DOWNLOAD] Dataset not found locally. Fetching from remote repository...")
        download_success = False

        for url in [DATASET_URL, FALLBACK_URL]:
            try:
                print(f"[DOWNLOAD] Attempting download from: {url}")
                urllib.request.urlretrieve(url, PRIMARY_TARGET)
                if PRIMARY_TARGET.stat().st_size > 10000:
                    shutil.copyfile(PRIMARY_TARGET, KAGGLE_TARGET)
                    download_success = True
                    print(f"[SUCCESS] Download completed successfully ({PRIMARY_TARGET.stat().st_size / 1024:.1f} KB).")
                    break
            except Exception as e:
                print(f"[WARNING] Download attempt failed: {e}")

        if not download_success:
            print("[ERROR] Failed to fetch dataset from remote repositories.")
            sys.exit(1)

        resolved_path = PRIMARY_TARGET

    # 2. Validate structural integrity
    print("\n[VALIDATING] Inspecting CSV structure and schema...")
    df = pd.read_csv(resolved_path)
    print(f"   * Total Records Ingested: {len(df):,} rows")
    print(f"   * Total Features: {len(df.columns)} columns")

    missing_cols = set(EXPECTED_COLUMNS) - set(df.columns)
    if missing_cols:
        print(f"[ERROR] Ingested dataset is missing required columns: {missing_cols}")
        sys.exit(1)

    print("   * Schema Conformance: [PASS] All 21 expected Kaggle Telco columns present.")
    print("-" * 78)
    print(f"[READY] Dataset is staged and ready for ETL at: {resolved_path}")
    print("=" * 78)
    return resolved_path


if __name__ == "__main__":
    ensure_dataset()
