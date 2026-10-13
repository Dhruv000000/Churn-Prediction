# ETL Pipeline Architecture & Academic Viva Cheat Sheet
## Project: Enterprise Churn Forensics & Predictive Retention Warehouse
### Module: Task 3 – Automated Production-Grade ETL Pipeline

---

## 1. End-to-End ETL Pipeline Architecture

The ETL pipeline ingests the raw Kaggle/IBM Telco Customer Churn dataset, executes deterministic data cleansing, resolves dimensional surrogate keys in memory, and writes transactional batches into the PostgreSQL Star Schema.

```
   [ Raw CSV Dataset ]  (data/raw/telco_churn.csv - 7,043 rows x 21 cols)
            |
            v
+-----------------------------------------------------------------------+
|  STAGE 1: EXTRACT (E)                                                 |
|  - Ingest raw CSV into pandas DataFrame                               |
|  - Log schema types, raw row counts, and memory footprint             |
+-----------------------------------------------------------------------+
            |
            v
+-----------------------------------------------------------------------+
|  STAGE 2: TRANSFORM & DATA CLEANSING (T)                              |
|  - Strip whitespace across all 18 text attributes                     |
|  - Detect 'TotalCharges' whitespace anomaly (" ")                     |
|  - Domain Imputation: Where tenure == 0 -> TotalCharges = 0.0         |
|  - Standardize binary flags: SeniorCitizen (0/1), Churn -> churn_flag |
|  - Enforce non-null domain constraints                                |
+-----------------------------------------------------------------------+
            |
            v
+-----------------------------------------------------------------------+
|  STAGE 3: DIMENSIONAL STAGING & SURROGATE KEY RESOLUTION              |
|  - Deduplicate & upsert Dim_Customer   -> Fetch customer_key          |
|  - Distinct combinations Dim_Service   -> Fetch service_key           |
|  - Distinct combinations Dim_Billing   -> Fetch billing_key           |
|  - Vectorized in-memory hash joins map natural keys -> surrogate keys |
+-----------------------------------------------------------------------+
            |
            v
+-----------------------------------------------------------------------+
|  STAGE 4: LOAD FACT TABLE (L)                                         |
|  - Assemble Fact_Subscriptions (7 numeric attributes)                 |
|  - Execute batch insert in chunks of 1,000 records                    |
|  - Strict ACID transaction management (COMMIT on pass / ROLLBACK)     |
+-----------------------------------------------------------------------+
            |
            v
+-----------------------------------------------------------------------+
|  STAGE 5: POST-LOAD REFRESH & QUALITY AUDIT                           |
|  - REFRESH MATERIALIZED VIEW mv_rollup_contract_service               |
|  - Run verify_etl.py (referential integrity, orphan check, metrics)   |
+-----------------------------------------------------------------------+
```

---

## 2. Core Viva Talking Points (Questions Evaluators Love to Ask)

### 1. The `TotalCharges` Anomaly & Domain-Aware Imputation
* **The Problem in Raw Data:**
  In the raw Kaggle Telco CSV, 11 rows contain `" "` (a whitespace string) in the `TotalCharges` column instead of a numeric value.
* **Why Generic Imputation Fails:**
  * Dropping these 11 rows introduces survival bias and eliminates newly onboarded customers from retention studies.
  * Imputing with column `Mean` (~$2,283) or `Median` (~$1,397) creates massive data corruption because these are brand new customers who have not yet been billed.
* **Our Domain-Specific Solution:**
  * In the transform phase, we cross-examine `tenure`. In all 11 records, `tenure == 0`.
  * Because the customer has been enrolled for less than one complete billing cycle, their cumulative historical billed charge is legally and mathematically `$0.00`.
  * We coerce the column to float and impute `0.0` specifically for `tenure == 0`, preserving 100% of customer records without distortion.

---

### 2. Why Are Surrogate Keys Resolved in the ETL Pipeline Rather than the CSV?
* **Decoupling from Source Systems:**
  The raw CSV contains business keys (`customerID = '7590-VHVEG'`) and raw categorical strings (`InternetService = 'Fiber optic'`). Storing strings in the Fact table violates dimensional modeling principles.
* **In-Memory Hash Join Efficiency:**
  Instead of issuing 7,043 individual `SELECT key FROM dim WHERE ...` SQL queries over the network (which would cause severe $N+1$ query latency), our pipeline:
  1. Staged and fetched the dimension catalogs once into memory.
  2. Executed vectorized pandas hash joins (`df.merge(service_lookup, on=...)`).
  3. Resolved all 7,043 surrogate foreign keys in under 0.08 seconds.
* **Referential Integrity Enforcement:**
  Before touching `Fact_Subscriptions`, the pipeline asserts that zero unmapped or `NULL` foreign keys exist, guaranteeing zero foreign key constraint violations at load time.

---

### 3. Transactional Atomicity & Rollback Mechanics
* **The Danger of Non-Transactional Loads:**
  If a network blip or constraint violation occurs at row 5,400 during a 7,043-row load, an unmanaged database would leave 5,400 orphaned rows committed. Analytical dashboards would report partial, inaccurate revenue numbers.
* **Our ACID Implementation:**
  ```python
  with engine.begin() as conn:  # Opens transaction block: BEGIN TRANSACTION
      conn.execute(text("TRUNCATE TABLE fact_subscriptions RESTART IDENTITY CASCADE;"))
      for chunk in chunks:
          chunk.to_sql("fact_subscriptions", con=conn, if_exists="append", method="multi")
      # If any exception occurs inside the block -> Automatic ROLLBACK
      # If all batches succeed -> Automatic COMMIT
  ```
  This guarantees **all-or-nothing atomicity**: the warehouse is either 100% updated or cleanly rolled back to its previous state with zero data corruption.

---

### 4. Idempotency in Production Data Engineering
* **What is Idempotency?**
  Running the ETL script twice with the same input data produces the exact same end state without duplicating customer records or inflating financial totals.
* **How our pipeline achieves idempotency:**
  * Dimensions use `ON CONFLICT (customer_id) DO UPDATE` to gracefully upsert records.
  * Fact table loading utilizes clean truncate/cascade staging with `RESTART IDENTITY`, ensuring sequential, deterministic surrogate key allocation on every execution run.

---

## 3. Post-ETL Quality Audit Matrix (`verify_etl.py`)

Our verification test suite executes 5 automated integrity tests against the PostgreSQL warehouse:

| Audit Test Category | Validation Logic | Acceptance Criteria |
| :--- | :--- | :--- |
| **Row Count Reconciliation** | `SELECT COUNT(*) FROM fact_subscriptions;` | Exactly 7,043 records (matches clean raw dataset). |
| **Referential Integrity (Orphan Check)** | `LEFT JOIN dim ON f.key = dim.key WHERE dim.key IS NULL;` | Exactly 0 orphans across Customer, Service, and Billing dimensions. |
| **Completeness (Null Check)** | `WHERE customer_key IS NULL OR service_key IS NULL OR billing_key IS NULL;` | Exactly 0 NULL foreign key values. |
| **Measure Range Sanity** | `MIN(monthly_charges) >= 0`, `MIN(tenure_months) >= 0`, `churn_flag IN (0, 1)` | 100% of measures lie within realistic physical domains. |
| **OLAP View Freshness** | `REFRESH MATERIALIZED VIEW mv_rollup_contract_service;` | Materialized view successfully compiles and aggregates all contract tiers. |

---

## 4. Execution Commands for Demonstration

```powershell
# 1. Download and stage dataset:
.\backend\venv\Scripts\python 2_ETL_PIPELINE/download_dataset.py

# 2. Execute end-to-end ETL pipeline:
.\backend\venv\Scripts\python 2_ETL_PIPELINE/etl_runner.py

# 3. Run automated post-ETL audit suite:
.\backend\venv\Scripts\python 2_ETL_PIPELINE/verify_etl.py
```
