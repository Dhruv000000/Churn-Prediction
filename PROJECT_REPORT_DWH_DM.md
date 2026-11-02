# Enterprise Churn Forensics & Predictive Retention Warehouse
## Academic Project Report & Technical Specification
**Course / Domain:** Data Warehousing (DWH) & Data Mining (DM)  
**System Title:** Enterprise Churn Forensics & Predictive Retention Warehouse  
**Technology Stack:** PostgreSQL / SQLite (Kimball Star Schema), Python 3.11, NumPy, Pandas, Scikit-Learn, FastAPI, React 19, Tailwind CSS, Recharts  

---

## Executive Summary

Customer churn presents an existential financial threat to subscription-based enterprises. Traditional operational databases (OLTP) are optimized for transactional integrity (ACID) and normalized row-by-row lookups (3NF), rendering them computationally inefficient for cross-sectional analytical slicing, cohort retention studies, and dimensional rollups.

This project designs and implements an end-to-end, enterprise-grade analytical platform that bridges the gap between structured relational data warehousing and machine learning. The solution comprises:
1. **A Kimball-Standard Star Schema Data Warehouse** containing a central Fact table (`Fact_Subscriptions`) bounded by three Dimension tables (`Dim_Customer`, `Dim_Billing`, `Dim_Service_Plan`).
2. **An Automated 3-Phase ETL Pipeline** in Python/Pandas that cleans anomalies, resolves surrogate keys, and enforces zero-orphan referential integrity across 105,000 enterprise accounts.
3. **A Tri-Core Data Mining Engine**:
   - *Unsupervised Clustering*: From-scratch implementation of Lloyd's K-Means in pure NumPy with K-Means++ probabilistic seeding, WCSS Elbow Curve evaluation across $K \in [2,6]$, and automatic discovery of 4 customer retention personas.
   - *Supervised Classification*: A primary champion Logistic Regression classifier achieving a holdout ROC-AUC of **0.8726** and a high-sensitivity Churn Recall of **83.83%**, paired with log-odds feature attribution.
   - *Market Basket & Pattern Mining*: A from-scratch Apriori algorithm discovering frequent service itemsets, association rules, and retrospective churn bundles with Lift up to 2.78x.
4. **A Customer Service Recommendation Engine**: Rule-induced cross-selling and retention bundling.
5. **A Full-Stack Analytical Delivery Suite**: An asynchronous FastAPI REST service coupled with a React 19 / Tailwind CSS dark-mode executive dashboard with real-time churn simulation.

---

## 1. Problem Statement & Theoretical Motivation

### 1.1 The Failure of Operational OLTP in Churn Analytics
Operational databases in enterprise billing environments are modeled according to Third Normal Form (3NF) to eliminate update anomalies and optimize for fast insert/update transactions. However, executing churn forensics queries across normalized schemas incurs significant overhead:
- **Excessive Joins**: Computing multidimensional aggregates (e.g., *Churn Rate by Contract Tier by Payment Method by Fiber Optic Infrastructure*) requires joining 6 to 9 normalized tables, exhausting buffer cache and causing table scans.
- **Lock Contention**: Running heavy aggregate analytical queries directly against an OLTP engine blocks active user billing writes.
- **Historical Blindness**: OLTP systems overwrite attributes in place, obliterating the longitudinal trends required for customer lifecycle modeling.

### 1.2 The Analytical Star Schema Solution (OLAP)
By migrating from an OLTP paradigm to an Online Analytical Processing (OLAP) Star Schema based on Ralph Kimball's dimensional modeling methodology:
- Data is pre-aggregated and structured around business events.
- Central measures (charges, tenure, churn event flags) reside in a narrow, highly indexable Fact table.
- Qualitative business context is partitioned into surrounding Dimension tables joined via integer **Surrogate Keys**.
- Queries execute up to **10× to 50× faster** due to simple star-join query plans, bitmap indexes, and partitioned scans.

---

## 2. End-to-End System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                 SYSTEM ARCHITECTURE PIPELINE                                      |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [Raw Data Layer]                                                                                 |
|       |                                                                                           |
|       v                                                                                           |
|  [data/raw/telco_churn.csv] (105,000 Accounts, 21 Attributes)                                     |
|       |                                                                                           |
|       |  Extraction & Data Cleansing (ETL Pipeline)                                               |
|       v                                                                                           |
|  +---------------------------------------------------------------------------------------------+  |
|  | 2_ETL_PIPELINE/etl_runner.py                                                                |  |
|  | - Strips whitespace across 18 string attributes                                             |  |
|  | - Imputes 16 zero-tenure accounts (TotalCharges -> 0.0)                                       |  |
|  | - Resolves Dimensional Surrogate Keys (INTEGER AUTOINCREMENT PKs)                           |  |
|  | - Atomic Transactional Batch Ingestion (1,000 rows/batch)                                   |  |
|  +---------------------------------------------------------------------------------------------+  |
|       |                                                                                           |
|       v                                                                                           |
|  [Kimball Star Schema Data Warehouse] (1_DATA_WAREHOUSE/ & data/churn_dwh.db)                      |
|  - Fact_Subscriptions (105,000 rows | Grain: 1 row per subscriber lifecycle snapshot)             |
|  - Dim_Customer (105,000 rows | Demographics: Gender, Senior Citizen, Partner, Dependents)        |
|  - Dim_Service_Plan (387 catalogs | Services: Internet, Phone, Security, Tech Support, TV)       |
|  - Dim_Billing (24 profiles | Billing: Contract, Paperless, Payment Method)                       |
|  - Analytical Views: ROLL-UP, DRILL-DOWN, SLICE, DICE, and CUBE Views                             |
|       |                                                                                           |
|       v                                                                                           |
|  [SQL Feature Extraction Mart] (3_MINING_ENGINE/feature_extractor.py)                             |
|  - Normalizes continuous attributes: Tenure Months, Monthly Charges, Total Cumulative Spend        |
|  - One-Hot Encodes categorical dimensions into 30 numerical regressors                             |
|       |                                                                                           |
|       +------------------------------------+---------------------------------------+              |
|       |                                    |                                       |              |
|       v                                    v                                       v              |
|  [Unsupervised Mining]             [Supervised Classifier]            [Market Basket Mining]      |
|  (kmeans_scratch.py)               (churn_classifier.py)              (apriori_scratch.py)        |
|  - Pure NumPy Lloyd's K-Means      - Champion Logistic Regression     - Pure Python/NumPy Apriori |
|  - K-Means++ Seeding               - StandardScaler Pipeline          - Downward Closure Pruning  |
|  - WCSS Elbow Curve (K=2..6)       - Balanced Class Weighting         - Candidate Join (Lk-1)     |
|  - Optimal K=4 Personas            - Holdout ROC-AUC = 0.8726         - Support, Confidence, Lift |
|                                    - Churn Recall = 83.83%            - Churn Bundle Forensics    |
|                                    - Odds-Ratio Interpretability      - Service Recommender       |
|       |                                    |                                       |              |
|       +------------------------------------+---------------------------------------+              |
|                                            |                                                      |
|                                            v                                                      |
|  [Analytical REST Backend API] (FastAPI Port 8000)                                                |
|  - /api/dwh/*: Executive KPIs, Multidimensional Rollups, Payment Slices                          |
|  - /api/mining/*: K-Means Personas, WCSS Elbow, Real-Time Scoring, Retraining                     |
|  - /api/mining/apriori/*: Summary, Itemsets, Rules, Churn Rules, Recommendations, CSV Export      |
|                                            |                                                      |
|                                            v                                                      |
|  [Executive React Dashboard] (React 19 + Tailwind CSS Port 5173)                                  |
|  - 5 Operational Views: OLAP Warehouse | Clustering Studio | Churn Predictor |                    |
|                         Market Basket Mining | Pipeline & Diagnostics                             |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Tier 1: Dimensional Data Warehouse (Kimball Star Schema)

### 3.1 Architectural Schema Specification
Following Ralph Kimball’s dimensional modeling methodology, our data warehouse decomposes enterprise telecom subscription activity into a single centralized Fact table surrounded by three conformed Dimension tables:

```
                  +-----------------------------------+
                  |           Dim_Customer            |
                  +-----------------------------------+
                  | customer_key (PK)       INTEGER   |
                  | customer_id (Natural)   VARCHAR   |
                  | gender                  VARCHAR   |
                  | senior_citizen          INTEGER   |
                  | partner                 VARCHAR   |
                  | dependents              VARCHAR   |
                  +-----------------------------------+
                                    |
                                    | 1:N
                                    v
+-----------------------+ 1:N +----------------------------+ N:1 +-----------------------+
|   Dim_Service_Plan    |---->|     Fact_Subscriptions     |<----|      Dim_Billing      |
+-----------------------+     +----------------------------+     +-----------------------+
| service_key (PK) INT  |     | fact_key (PK)    INTEGER   |     | billing_key (PK)  INT |
| phone_service   TEXT  |     | customer_key(FK) INTEGER   |     | contract         TEXT |
| multiple_lines  TEXT  |     | service_key (FK) INTEGER   |     | paperless_billing TEXT|
| internet_service TEXT |     | billing_key (FK) INTEGER   |     | payment_method   TEXT |
| online_security TEXT  |     | tenure_months    INTEGER   |     +-----------------------+
| online_backup   TEXT  |     | monthly_charges  NUMERIC   |
| device_protection TEXT|     | total_charges    NUMERIC   |
| tech_support    TEXT  |     | churn_flag       INTEGER   |
| streaming_tv    TEXT  |     +----------------------------+
| streaming_movies TEXT |
+-----------------------+
```

### 3.2 Granularity & Additivity
- **Fact Table Grain**: Exactly **one record per customer subscription lifecycle snapshot**.
- **Additive Measures**: `monthly_charges`, `total_charges`. These can be summed across any arbitrary dimension (e.g., total MRR across contract tiers).
- **Semi-Additive / Non-Additive Measures**: `tenure_months` (averaged across cohorts), `churn_flag` (ratio calculated via `SUM(churn_flag) / COUNT(*)`).

### 3.3 Surrogate Keys vs. Natural Keys
Natural business identifiers (e.g., alphanumeric strings such as `7590-VHVEG`) were strictly banned from the Fact table foreign keys in favor of synthetic integer **Surrogate Keys**:
1. **Performance**: Integer comparisons take 4 bytes and evaluate in single CPU registers, compared to 10+ bytes for strings.
2. **Schema Decoupling**: Upstream billing migrations do not invalidate warehouse foreign key relationships.

---

## 4. Tier 2: Automated ETL Cleansing Pipeline

### 4.1 Data Cleaning & Anomaly Imputation
In raw enterprise telemetry, nulls, corrupted types, and whitespace anomalies undermine downstream mining engines:
- **Whitespace Anomaly in `TotalCharges`**: In the raw dataset, 16 records contained empty whitespace strings (`" "`).
- **Domain Forensics**: Analyzing these 16 customer profiles revealed that all 16 had `tenure = 0` months (new accounts that signed up during the current billing cycle).
- **Cleansing Rule**: Imputed `TotalCharges = 0.00` based on domain business reality, preserving customer accounts for churn evaluation rather than dropping them.

---

## 5. Tier 3: Data Mining Engine

### 5.1 Market Basket Analysis using Apriori from Scratch

#### Mathematical Formalism
Let $I = \{i_1, i_2, \dots, i_m\}$ represent the catalog of affirmative telecom subscriptions. A transaction $T \subseteq I$ is the active service basket of an individual subscriber.

1. **Support ($X \rightarrow Y$):**
   $$\text{Support}(X \cup Y) = \frac{|\{T \in D : (X \cup Y) \subseteq T\}|}{|D|}$$
2. **Confidence ($X \rightarrow Y$):**
   $$\text{Confidence}(X \rightarrow Y) = \frac{\text{Support}(X \cup Y)}{\text{Support}(X)}$$
3. **Lift ($X \rightarrow Y$):**
   $$\text{Lift}(X \rightarrow Y) = \frac{\text{Confidence}(X \rightarrow Y)}{\text{Support}(Y)} = \frac{\text{Support}(X \cup Y)}{\text{Support}(X) \times \text{Support}(Y)}$$

#### The Downward Closure Property (Apriori Pruning)
$$\forall X \subseteq Y \implies \text{Support}(X) \ge \text{Support}(Y)$$
If $\text{Support}(X) < \text{min\_support}$, then for all supersets $Y \supseteq X$, $\text{Support}(Y) < \text{min\_support}$. This mathematical guarantee enables pruning entire subtrees of candidates prior to transaction evaluation.

#### Verified Numerical Example from Warehouse
- $N = 105,000$ subscribers
- $\text{Support}(\text{DSL Internet}) = 34.18\%$ ($35,885$ customers)
- $\text{Support}(\text{Phone Service} \cup \text{Streaming TV}) = 34.50\%$ ($36,220$ customers)
- Joint Support $\text{Support}(\text{DSL} \cup \text{Phone} \cup \text{TV}) = 15.18\%$ ($15,939$ customers)
- Rule: $\text{DSL Internet} \rightarrow \text{Phone Service} + \text{Streaming TV}$
  $$\text{Confidence} = \frac{0.1518}{0.3418} = 44.41\%$$
  $$\text{Lift} = \frac{0.4441}{0.3450} = 1.287\text{x}$$

#### Retrospective Churn Pattern Forensics
- **Top Churn Driver**: $\{\text{Month-to-month}, \text{Fiber Optic}, \text{Electronic Check}\} \rightarrow \text{Churned}$
  - Support: 5.82% | Confidence: 78.15% | Lift: 2.78x
- **Top Retention Anchor**: $\{\text{Two year}, \text{Tech Support}\} \rightarrow \text{Retained}$
  - Support: 6.18% | Confidence: 97.15% | Lift: 1.35x

---

### 5.2 Supervised Classification: Champion Logistic Regression

#### Selection Rationale
We benchmarked standard algorithms and selected **Logistic Regression** as the primary champion model:
1. **Holdout ROC-AUC (0.8726)**: Highest discrimination on unseen test samples.
2. **Churn Recall (83.83%)**: Intercepts 4,947 out of 5,901 actual churners in holdout testing.
3. **Log-Odds Explainability**: Standardized Beta coefficients map directly to Odds Ratios ($e^\beta$).
4. **Global Convexity**: Solved via L-BFGS, eliminating tree-split over-tuning risks.

#### Holdout Confusion Matrix (21,000 Test Customers)
| Actual \ Predicted | Predicted Retained | Predicted Churned | Total |
| :--- | :--- | :--- | :--- |
| **Actual Retained** | **11,493** (TN) | 3,606 (FP) | 15,099 |
| **Actual Churned** | 954 (FN) | **4,947** (TP) | 5,901 |
| **Total** | 12,447 | 8,553 | 21,000 |

---

### 5.3 Unsupervised Clustering: Pure NumPy K-Means++
- Implemented Lloyd's algorithm from scratch with K-Means++ seeding.
- Evaluated WCSS across $K \in [2, 6]$, identifying the optimal elbow at $K=4$:
  1. **VIP Champions** (Tenure = 58.4 mos, Charges = $92.60)
  2. **Flight Risk High Spenders** (Tenure = 8.2 mos, Charges = $84.10)
  3. **Budget Loyalists** (Tenure = 54.1 mos, Charges = $32.40)
  4. **Casual Starters** (Tenure = 7.9 mos, Charges = $31.80)

---

## 6. Tier 4: FastAPI REST Backend & React Executive Dashboard

### 6.1 REST Endpoint Reference
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Diagnostic probe & CORS verification |
| `GET` | `/api/dwh/kpis` | Executive summary metrics (Subscribers, ARR, Churn Rate) |
| `GET` | `/api/dwh/contract-analysis` | Multidimensional roll-up across Contract & Internet tiers |
| `GET` | `/api/dwh/payment-analysis` | Sliced financial performance by payment channel |
| `GET` | `/api/mining/clusters` | Centroid coordinates & sampled 2D scatter matrix |
| `GET` | `/api/mining/elbow` | WCSS inertia values across K=2..6 |
| `GET` | `/api/mining/metrics` | Holdout evaluation metrics & coefficient attribution |
| `POST` | `/api/mining/predict` | Real-time single customer churn risk scoring |
| `POST` | `/api/mining/retrain` | Subprocess trigger to retrain all pipeline models |
| `GET` | `/api/mining/apriori/summary` | Top-level MBA metrics, top frequent itemsets & rules |
| `POST` | `/api/mining/apriori/run` | On-demand Apriori run with user-defined thresholds |
| `GET` | `/api/mining/apriori/itemsets` | Filtered frequent itemsets by size constraints |
| `GET` | `/api/mining/apriori/rules` | Filtered association rules by lift and confidence |
| `GET` | `/api/mining/apriori/churn-rules`| Retrospective churn and retention association patterns |
| `POST` | `/api/mining/apriori/recommend` | Customer service recommendation engine |
| `GET` | `/api/mining/apriori/export/itemsets`| Stream frequent itemsets as CSV download |
| `GET` | `/api/mining/apriori/export/rules` | Stream association rules as CSV download |

---

## 7. Scientific Honesty & Dataset Methodology

To simulate enterprise-scale data warehouse workloads, the canonical 7,043-record IBM Telco Churn benchmark was statistically expanded to **105,000 records** via conditioned synthetic augmentation (`data/generate_scaled_dataset.py`).
- **Class Balance**: 75,496 Retained (71.9%) vs. 29,504 Churned (28.1%).
- **Empirical Preservation**: Exact joint distributions and non-linear churn interactions are strictly preserved.
- **Leakage Prevention**: Churn labels are strictly isolated from feature matrices during predictive modeling.
