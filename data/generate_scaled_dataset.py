#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  data/generate_scaled_dataset.py
Purpose: High-Fidelity Synthetic Churn Dataset Generator (>= 100,000 Rows).
         Generates realistic customer demographics, service subscriptions,
         billing terms, contract durations, and calibrated churn outcomes
         preserving real-world telecom domain dynamics.
"""

import sys
import os
import argparse
from pathlib import Path
import numpy as np
import pandas as pd

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"


def generate_churn_dataset(n_samples: int = 105000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates n_samples records of realistic telecom churn data matching
    the exact schema of the Telco Customer Churn dataset with rich statistical properties.
    """
    print(f"\n[DATA GENERATOR] Generating {n_samples:,} realistic subscriber records...")
    rng = np.random.RandomState(random_state)

    # 1. Customer Identification
    # Formats like 0001-ABCDE
    chars = np.array(list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
    suffix_chars = rng.choice(chars, size=(n_samples, 5))
    suffixes = ["".join(row) for row in suffix_chars]
    customer_ids = [f"{i+1:04d}-{suffixes[i]}" for i in range(n_samples)]

    # 2. Demographics
    gender = rng.choice(["Male", "Female"], size=n_samples, p=[0.505, 0.495])
    # ~16.2% Senior Citizens
    senior_citizen = rng.choice([0, 1], size=n_samples, p=[0.838, 0.162])
    # Partner & Dependents correlation
    partner = rng.choice(["Yes", "No"], size=n_samples, p=[0.483, 0.517])
    
    # Dependents depend heavily on partner
    dependents = []
    for p in partner:
        if p == "Yes":
            dependents.append(rng.choice(["Yes", "No"], p=[0.52, 0.48]))
        else:
            dependents.append(rng.choice(["Yes", "No"], p=[0.11, 0.89]))
    dependents = np.array(dependents)

    # 3. Tenure (months 0 to 72)
    # Bimodal distribution: many new signups (1-6 months), steady middle, and many loyalists (65-72 months)
    tenure_modes = rng.choice([0, 1, 2], size=n_samples, p=[0.38, 0.32, 0.30])
    tenure = np.zeros(n_samples, dtype=int)
    
    # Early tenure (0 - 12 mos)
    early_idx = (tenure_modes == 0)
    tenure[early_idx] = rng.geometric(p=0.15, size=np.sum(early_idx)) - 1
    tenure[early_idx] = np.clip(tenure[early_idx], 0, 12)
    
    # Mid tenure (13 - 54 mos)
    mid_idx = (tenure_modes == 1)
    tenure[mid_idx] = rng.randint(13, 55, size=np.sum(mid_idx))
    
    # Veteran tenure (55 - 72 mos)
    vet_idx = (tenure_modes == 2)
    tenure[vet_idx] = rng.randint(55, 73, size=np.sum(vet_idx))

    # 4. Service Portfolio
    phone_service = rng.choice(["Yes", "No"], size=n_samples, p=[0.903, 0.097])
    multiple_lines = []
    for ps in phone_service:
        if ps == "No":
            multiple_lines.append("No phone service")
        else:
            multiple_lines.append(rng.choice(["Yes", "No"], p=[0.46, 0.54]))
    multiple_lines = np.array(multiple_lines)

    internet_service = rng.choice(["Fiber optic", "DSL", "No"], size=n_samples, p=[0.44, 0.34, 0.22])

    online_security = []
    online_backup = []
    device_protection = []
    tech_support = []
    streaming_tv = []
    streaming_movies = []

    for is_val in internet_service:
        if is_val == "No":
            online_security.append("No internet service")
            online_backup.append("No internet service")
            device_protection.append("No internet service")
            tech_support.append("No internet service")
            streaming_tv.append("No internet service")
            streaming_movies.append("No internet service")
        else:
            online_security.append(rng.choice(["Yes", "No"], p=[0.36, 0.64]))
            online_backup.append(rng.choice(["Yes", "No"], p=[0.44, 0.56]))
            device_protection.append(rng.choice(["Yes", "No"], p=[0.43, 0.57]))
            tech_support.append(rng.choice(["Yes", "No"], p=[0.37, 0.63]))
            streaming_tv.append(rng.choice(["Yes", "No"], p=[0.49, 0.51]))
            streaming_movies.append(rng.choice(["Yes", "No"], p=[0.50, 0.50]))

    # 5. Contract Terms & Billing
    # Tenure strongly influences contract
    contract = []
    for t in tenure:
        if t <= 12:
            contract.append(rng.choice(["Month-to-month", "One year", "Two year"], p=[0.86, 0.11, 0.03]))
        elif t <= 36:
            contract.append(rng.choice(["Month-to-month", "One year", "Two year"], p=[0.48, 0.34, 0.18]))
        else:
            contract.append(rng.choice(["Month-to-month", "One year", "Two year"], p=[0.22, 0.38, 0.40]))
    contract = np.array(contract)

    paperless_billing = rng.choice(["Yes", "No"], size=n_samples, p=[0.592, 0.408])
    payment_method = rng.choice(
        [
            "Electronic check",
            "Mailed check",
            "Bank transfer (automatic)",
            "Credit card (automatic)"
        ],
        size=n_samples,
        p=[0.336, 0.228, 0.219, 0.217]
    )

    # 6. Monthly Charges Pricing Matrix ($18.25 - $118.75)
    monthly_charges = np.zeros(n_samples, dtype=float)
    for i in range(n_samples):
        base = 0.0
        # Phone
        if phone_service[i] == "Yes":
            base += 19.50
            if multiple_lines[i] == "Yes":
                base += 5.50

        # Internet base
        if internet_service[i] == "DSL":
            base += 24.50
        elif internet_service[i] == "Fiber optic":
            base += 49.50

        # Addons ($5 - $10 each)
        if online_security[i] == "Yes": base += 5.0
        if online_backup[i] == "Yes": base += 5.0
        if device_protection[i] == "Yes": base += 5.0
        if tech_support[i] == "Yes": base += 5.0
        if streaming_tv[i] == "Yes": base += 10.0
        if streaming_movies[i] == "Yes": base += 10.0

        # Jitter +- $2.50
        jitter = rng.uniform(-2.50, 2.50)
        monthly_charges[i] = round(max(18.25, min(118.75, base + jitter)), 2)

    # 7. Total Charges = tenure * monthly_charges + noise
    total_charges = np.zeros(n_samples, dtype=object)
    for i in range(n_samples):
        if tenure[i] == 0:
            total_charges[i] = 0.0
        else:
            noise = rng.uniform(0.97, 1.03)
            total_charges[i] = round(float(tenure[i] * monthly_charges[i] * noise), 2)

    # Add realistic edge-case anomaly: ~16 records with tenure==0 have whitespace string ' '
    zero_idx = np.where(tenure == 0)[0]
    blank_anomalies = min(len(zero_idx), 16)
    if blank_anomalies > 0:
        for idx in zero_idx[:blank_anomalies]:
            total_charges[idx] = " "

    # 8. Real-World Domain Calibrated Churn Ground Truth
    # Logit latent function based on proven telecom drivers
    # Baseline ~26.5% overall churn rate
    logits = np.zeros(n_samples, dtype=float) - 1.25

    # Contract impact (Month-to-month is #1 driver)
    logits += np.where(contract == "Month-to-month", 1.45, 0.0)
    logits += np.where(contract == "Two year", -1.85, 0.0)
    logits += np.where(contract == "One year", -0.85, 0.0)

    # Tenure impact (Exponential retention protection)
    logits -= (tenure / 72.0) * 1.65

    # Payment method (Electronic check high risk)
    logits += np.where(payment_method == "Electronic check", 0.65, 0.0)
    logits += np.where(payment_method == "Credit card (automatic)", -0.45, 0.0)
    logits += np.where(payment_method == "Bank transfer (automatic)", -0.40, 0.0)

    # Service pack impact (Fiber optic without support = bill shock)
    fiber_mask = (internet_service == "Fiber optic")
    no_support_mask = (np.array(tech_support) == "No")
    no_sec_mask = (np.array(online_security) == "No")
    logits += np.where(fiber_mask & no_support_mask, 0.60, 0.0)
    logits += np.where(fiber_mask & no_sec_mask, 0.40, 0.0)
    logits += np.where(internet_service == "No", -0.80, 0.0)

    # Monthly charges intensity
    logits += ((monthly_charges - 65.0) / 40.0) * 0.45

    # Demographics
    logits += np.where(senior_citizen == 1, 0.25, 0.0)
    logits += np.where(partner == "Yes", -0.20, 0.0)
    logits += np.where(dependents == "Yes", -0.25, 0.0)
    logits += np.where(paperless_billing == "Yes", 0.30, 0.0)

    # Sigmoid function for probability
    churn_probs = 1.0 / (1.0 + np.exp(-logits))
    # Bernoulli draw for actual outcome
    churn_flags = (rng.uniform(0.0, 1.0, size=n_samples) < churn_probs)
    churn = np.where(churn_flags, "Yes", "No")

    observed_churn_pct = (churn == "Yes").mean() * 100
    print(f"[DATA GENERATOR] Observed Churn Rate: {observed_churn_pct:.2f}% across {n_samples:,} records.")

    # Assemble DataFrame
    df = pd.DataFrame({
        "customerID": customer_ids,
        "gender": gender,
        "SeniorCitizen": senior_citizen,
        "Partner": partner,
        "Dependents": dependents,
        "tenure": tenure,
        "PhoneService": phone_service,
        "MultipleLines": multiple_lines,
        "InternetService": internet_service,
        "OnlineSecurity": online_security,
        "OnlineBackup": online_backup,
        "DeviceProtection": device_protection,
        "TechSupport": tech_support,
        "StreamingTV": streaming_tv,
        "StreamingMovies": streaming_movies,
        "Contract": contract,
        "PaperlessBilling": paperless_billing,
        "PaymentMethod": payment_method,
        "MonthlyCharges": monthly_charges,
        "TotalCharges": total_charges,
        "Churn": churn,
    })

    return df


def main():
    parser = argparse.ArgumentParser(description="Scale or generate >= 100k rows telecom churn dataset.")
    parser.add_argument("--rows", type=int, default=105000, help="Number of records to generate (default: 105,000)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    n_rows = max(args.rows, 100000)
    df = generate_churn_dataset(n_samples=n_rows, random_state=args.seed)

    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    out1 = RAW_DATA_DIR / "telco_churn.csv"
    out2 = RAW_DATA_DIR / "WA_Fn-UseC_-Telco-Customer-Churn.csv"

    print(f"[DATA GENERATOR] Writing {len(df):,} records to: {out1}")
    df.to_csv(out1, index=False)
    print(f"[DATA GENERATOR] Writing {len(df):,} records to: {out2}")
    df.to_csv(out2, index=False)

    size_mb1 = out1.stat().st_size / (1024 * 1024)
    print(f"[DATA GENERATOR] Generated {len(df):,} rows successfully ({size_mb1:.2f} MB).")


if __name__ == "__main__":
    main()
