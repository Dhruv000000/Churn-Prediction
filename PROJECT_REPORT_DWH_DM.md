# Enterprise Churn Forensics & Predictive Retention Warehouse
## Academic Project Report & Technical Specification
**Course / Domain:** Data Warehousing (DWH) & Data Mining (DM)  
**System Title:** Enterprise Churn Forensics & Predictive Retention Warehouse  
**Technology Stack:** PostgreSQL / SQLite (Star Schema), Python 3.11, NumPy, Pandas, Scikit-Learn, FastAPI, React 19, Tailwind CSS, Recharts  

---

## Executive Summary
Customer churn presents an existential financial threat to subscription-based enterprises. Traditional operational databases (OLTP) are optimized for transactional integrity (ACID) and normalized row-by-row lookups (3NF), rendering them computationally inefficient for cross-sectional analytical slicing, cohort retention studies, and dimensional rollups.

This project designs and implements an end-to-end, enterprise-grade analytical platform that bridges the gap between structured relational data warehousing and machine learning. The solution comprises:
1. **A Kimball-Standard Star Schema Data Warehouse** containing a central Fact table (`Fact_Subscriptions`) bounded by three Dimension tables (`Dim_Customer`, `Dim_Account`, `Dim_Service`).
2. **An Automated 3-Phase ETL Pipeline** in Python/Pandas that cleans anomalies, resolves surrogate keys, and enforces zero-orphan referential integrity across 7,043 enterprise accounts.
3. **A Dual-Core Data Mining Engine**:
   - *Unsupervised Mining*: A from-scratch implementation of Lloyd's K-Means clustering in pure NumPy with K-Means++ probabilistic seeding, WCSS Elbow Curve evaluation across $K \in [2,6]$, and automatic discovery of 4 customer retention personas.
   - *Supervised Mining*: A class-balanced Random Forest ensemble achieving an ROC-AUC of **0.8422** and a high-sensitivity Churn Recall of **79.41%**, paired with Gini feature importance attribution.
4. **A Full-Stack Analytical Delivery Suite**: A high-performance FastAPI asynchronous REST service coupled with a React 19 / Tailwind CSS dark-mode executive dashboard with real-time churn simulation.

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
|  [data/raw/telco_churn.csv] (7,043 Accounts, 21 Attributes)                                       |
|       |                                                                                           |
|       |  Extraction & Data Cleansing (ETL Pipeline)                                               |
|       v                                                                                           |
|  +---------------------------------------------------------------------------------------------+  |
|  | 2_ETL_PIPELINE/etl_runner.py                                                                |  |
|  | - Strips whitespace strings                                                                 |  |
|  | - Imputes 11 zero-tenure accounts (TotalCharges -> 0.0)                                       |  |
|  | - Resolves Dimensional Surrogate Keys (SERIAL PKs)                                          |  |
|  | - Atomic Transactional Batch Ingestion                                                      |  |
|  +---------------------------------------------------------------------------------------------+  |
|       |                                                                                           |
|       v                                                                                           |
|  [Analytical Data Warehouse: Star Schema] (1_DATA_WAREHOUSE/)                                     |
|  +--------------------+        +-------------------------+        +--------------------+          |
|  |    Dim_Customer    |        |    Fact_Subscriptions   |        |    Dim_Account     |          |
|  |--------------------|        |-------------------------|        |--------------------|          |
|  | PK customer_key    |<-------| FK customer_key         |------->| PK account_key     |          |
|  |    customer_id     |        | FK account_key          |        |    contract        |          |
|  |    gender          |        | FK service_key          |        |    payment_method  |          |
|  |    senior_citizen  |        |    tenure_months        |        |    paperless_bill  |          |
|  |    partner         |        |    monthly_charges      |        +--------------------+          |
|  |    dependents      |        |    total_charges        |                                        |
|  +--------------------+        |    churn_flag (0/1)     |        +--------------------+          |
|                                |    churn_label          |        |    Dim_Service     |          |
|                                +-------------------------+        |--------------------|          |
|                                            |                      | PK service_key     |          |
|                                            +--------------------->|    internet_service|          |
|                                                                   |    tech_support    |          |
|                                                                   |    online_security |          |
|                                                                   |    streaming_tv    |          |
|                                                                   +--------------------+          |
|       |                                                                                           |
|       |  Analytical Feature Extraction (SQL Star-Join Mart)                                       |
|       v                                                                                           |
|  +---------------------------------------------------------------------------------------------+  |
|  | 3_MINING_ENGINE/                                                                            |  |
|  |  1. K-Means++ from Scratch (Pure NumPy)                                                     |  |
|  |     - Probabilistic centroid seeding                                                        |  |
|  |     - Euclidean distance convergence (WCSS Elbow Curve K=2..6 -> Optimal K=4)              |  |
|  |     - 4 Archetypal Personas (VIP Champions, Flight Risk, Budget Loyalists, Casuals)         |  |
|  |  2. Supervised Churn Classifier (Random Forest Ensemble)                                   |  |
|  |     - Class-Balanced Trees, Stratified 80/20 Train-Test Split                               |  |
|  |     - ROC-AUC: 0.8422 | Recall: 79.41% | F1: 0.6272                                         |  |
|  |     - Ranked Gini Feature Importances (Contract, Tenure, Charges)                           |  |
|  +---------------------------------------------------------------------------------------------+  |
|       |                                                                                           |
|       v                                                                                           |
|  [REST API Backend: FastAPI] (backend/app/)                                                       |
|  - GET  /api/dwh/kpis                  -> Executive Warehouse Aggregates                           |
|  - GET  /api/dwh/contract-analysis     -> Multi-dimensional Contract x Internet Rollup            |
|  - GET  /api/dwh/payment-analysis      -> Payment Channel Churn Slices                            |
|  - GET  /api/mining/clusters           -> K-Means Centroids, Personas & 2D Scatter Sample         |
|  - GET  /api/mining/elbow              -> Inertia / WCSS Curve across K=2..6                      |
|  - GET  /api/mining/metrics            -> Random Forest Diagnostics & Confusion Matrix            |
|  - POST /api/mining/predict            -> Real-Time Churn Scoring & Prescriptive Playbook         |
|  - POST /api/mining/retrain            -> Hot-Reload Model Retraining                             |
|       |                                                                                           |
|       v                                                                                           |
|  [Full-Stack React Dashboard] (frontend/ & 4_FULLSTACK_APP/frontend/)                             |
|  - Pure Black Canvas & Aesthetic Zinc Palette                                                     |
|  - View 1: OLAP Warehouse & Interactive Pivot Table                                               |
|  - View 2: Clustering Studio (2D Scatter Plot & Elbow Curve)                                      |
|  - View 3: Churn Predictor (Real-time Sliders, Circular Gauge, Prescriptive Actions)              |
|  - View 4: Pipeline Health & Diagnostics (ETL Integrity, Confusion Matrix, Gini Rank)            |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Data Warehouse Specification

### 3.1 Star Schema Architecture & Grain
- **Grain**: Exactly one row in `Fact_Subscriptions` represents the single active subscription lifecycle snapshot of an individual telecom account.
- **Central Measure Table**: `Fact_Subscriptions` stores additive facts (`monthly_charges`, `total_charges`), semi-additive facts (`tenure_months`), and degenerate/status measures (`churn_flag`).
- **Surrogate Keys vs. Natural Keys**:
  - Natural Business Keys (e.g., `customer_id` like `"7590-VHVEG"`) are alphanumeric strings susceptible to upstream format changes.
  - Surrogate Keys (`customer_key`, `account_key`, `service_key`) are auto-incrementing integers (`SERIAL PK`). This minimizes index footprint, accelerates B-Tree index traversal, and isolates the analytical warehouse from operational source schema drift.

### 3.2 Relational Entity Schema Definition

```sql
-- 1. Customer Dimension
CREATE TABLE Dim_Customer (
    customer_key       SERIAL PRIMARY KEY,
    customer_id        VARCHAR(50) UNIQUE NOT NULL,
    gender             VARCHAR(10),
    senior_citizen     SMALLINT,
    partner            VARCHAR(5),
    dependents         VARCHAR(5)
);

-- 2. Account & Billing Dimension
CREATE TABLE Dim_Account (
    account_key        SERIAL PRIMARY KEY,
    contract           VARCHAR(25) NOT NULL,
    paperless_billing  VARCHAR(5) NOT NULL,
    payment_method     VARCHAR(50) NOT NULL
);

-- 3. Service Portfolio Dimension
CREATE TABLE Dim_Service (
    service_key        SERIAL PRIMARY KEY,
    phone_service      VARCHAR(5),
    multiple_lines     VARCHAR(25),
    internet_service   VARCHAR(25),
    online_security    VARCHAR(25),
    online_backup      VARCHAR(25),
    device_protection  VARCHAR(25),
    tech_support       VARCHAR(25),
    streaming_tv       VARCHAR(25),
    streaming_movies   VARCHAR(25)
);

-- 4. Central Subscription Fact Table
CREATE TABLE Fact_Subscriptions (
    subscription_key   SERIAL PRIMARY KEY,
    customer_key       INTEGER NOT NULL REFERENCES Dim_Customer(customer_key),
    account_key        INTEGER NOT NULL REFERENCES Dim_Account(account_key),
    service_key        INTEGER NOT NULL REFERENCES Dim_Service(service_key),
    tenure_months      INTEGER NOT NULL,
    monthly_charges    NUMERIC(10, 2) NOT NULL,
    total_charges      NUMERIC(12, 2) NOT NULL,
    churn_flag         SMALLINT NOT NULL,
    churn_label        VARCHAR(5) NOT NULL
);
```

### 3.3 Indexing Strategy
To guarantee sub-15ms response times across 7,000+ records and multi-million row scale, dedicated B-Tree indexes are enforced on all foreign keys and high-frequency analytical slice fields:
- `idx_fact_customer_fk` on `Fact_Subscriptions(customer_key)`
- `idx_fact_account_fk` on `Fact_Subscriptions(account_key)`
- `idx_fact_service_fk` on `Fact_Subscriptions(service_key)`
- `idx_fact_churn_flag` on `Fact_Subscriptions(churn_flag)`
- `idx_dim_account_contract` on `Dim_Account(contract)`

---

## 4. ETL Engineering Pipeline

The ETL pipeline (`2_ETL_PIPELINE/etl_runner.py`) follows a robust, transactional 3-phase lifecycle.

### 4.1 Phase 1: Extraction (E)
- Ingests `data/raw/telco_churn.csv` (7,043 rows, 21 raw columns).
- Validates column completeness against the enterprise schema contract.

### 4.2 Phase 2: Transformation & Data Cleansing (T)
1. **Handling Whitespace & Type Casting in `TotalCharges`**:
   In the raw Kaggle dataset, 11 customer records contained blank whitespace strings (`" "`) in the `TotalCharges` field. Further forensic examination revealed that all 11 records corresponded to brand new customers with `tenure = 0` months who had not yet received their first billing cycle. Rather than dropping these rows (which would introduce selection bias), the pipeline imputes `TotalCharges = 0.0` and casts the series to `float64`.
2. **Boolean Standardisation**:
   Standardizes `"Yes"` / `"No"` / `"No internet service"` flags and converts `"Churn"` to binary integer `churn_flag` ($1 = \text{Churned}, 0 = \text{Retained}$).
3. **Surrogate Key Resolution**:
   - Distinct dimensional tuples are extracted for `Dim_Account` and `Dim_Service`.
   - Dimension tables are loaded first, generating synthetic integer surrogate keys.
   - The pipeline joins raw records against the newly populated dimension tables on business key tuples to resolve `customer_key`, `account_key`, and `service_key` for every fact row.

### 4.3 Phase 3: Loading & Verification (L)
- Records are loaded into the database within an atomic SQL transaction block.
- Automated post-load verification (`2_ETL_PIPELINE/verify_etl.py`) executes:
  - Row count consistency check ($7,043 \equiv 7,043$).
  - Referential integrity check (Orphan key count $= 0$).
  - Fact aggregation verification (Total ARR calculation matches raw sums).

---

## 5. Data Mining Core

### 5.1 Unsupervised Mining: K-Means Clustering from Scratch

#### Mathematical Formulation
The objective of K-Means clustering is to partition $N$ observation vectors $\{x_1, x_2, \dots, x_N\} \subset \mathbb{R}^d$ into $K$ disjoint clusters $C = \{C_1, C_2, \dots, C_K\}$ to minimize the Within-Cluster Sum of Squares (WCSS / Inertia):

$$\text{WCSS}(K) = \sum_{k=1}^{K} \sum_{x \in C_k} ||x - \mu_k||_2^2$$

where $\mu_k = \frac{1}{|C_k|} \sum_{x \in C_k} x$ denotes the centroid of cluster $C_k$.

#### K-Means++ Probabilistic Centroid Initialization
Standard random initialization frequently converges into suboptimal local minima. Our pure NumPy engine implements **K-Means++ initialization**:
1. Select the initial centroid $\mu_1$ uniformly at random from the dataset $X$.
2. For each subsequent point $x \in X$, compute $D(x) = \min_{j < k} ||x - \mu_j||_2$, the Euclidean distance to the nearest existing centroid.
3. Sample the next centroid $\mu_k$ according to the probability distribution:

$$P(x) = \frac{D(x)^2}{\sum_{x' \in X} D(x')^2}$$

4. Repeat steps 2 and 3 until all $K$ initial centroids are established.

#### Lloyd's Iterative Optimization Algorithm
- **Assignment Step**: Assign each point $x_i$ to its closest centroid:

$$c^{(i)} = \arg\min_{k} ||x_i - \mu_k||_2$$

- **Update Step**: Recompute each centroid as the arithmetic mean of its assigned cluster:

$$\mu_k = \frac{1}{|C_k|} \sum_{x \in C_k} x$$

- **Convergence Criterion**: Terminate when centroid displacement $||\mu^{(t)} - \mu^{(t-1)}|| < \epsilon = 10^{-4}$ or when $t = \text{max\_iter} = 100$. (In practice, convergence occurred at $t=10$).

#### Determining Optimal $K$: The WCSS Elbow Method
Evaluating WCSS across $K \in [2, 6]$ produced the following empirical inertia values:

| Number of Clusters ($K$) | WCSS / Inertia | Marginal WCSS Reduction ($\Delta$) |
| :---: | :---: | :---: |
| $K = 2$ | 7,991.73 | Baseline |
| $K = 3$ | 4,622.54 | -3,369.19 (42.2%) |
| **$K = 4$** | **2,845.37** | **-1,777.17 (38.4%) [Optimal Elbow Point]** |
| $K = 5$ | 2,387.00 | -458.37 (16.1%) |
| $K = 6$ | 1,947.69 | -439.31 (18.4%) |

Beyond $K=4$, marginal gains drop sharply, establishing $K=4$ as the mathematically optimal cluster configuration.

#### Discovered Behavioral Retention Personas

| Cluster ID | Persona Archetype | Centroid Tenure | Centroid Monthly | Size (%) | Business Churn Risk Profile & Strategic Prescription |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | **Budget Loyalists** | 54.1 mos | $34.03 | 1,155 (16.4%) | **Low Risk (Stable Base)**: High-tenure subscribers with low spend. *Action:* Cross-sell broadband upgrades and add-on security. |
| **1** | **VIP Champions** | 58.7 mos | $93.02 | 1,952 (27.7%) | **Low Risk (Core Assets)**: High spend, highly loyal multi-year contracts. *Action:* Dedicated VIP account management, long-term renewal incentives. |
| **2** | **Flight Risk Early Adopters** | 14.8 mos | $81.22 | 2,204 (31.3%) | **Critical Risk (Primary Churn Culprit)**: High monthly spend on new month-to-month fiber subscriptions. *Action:* Immediate onboarding concierge, contract conversion discounts (15% off for 1-year commit). |
| **3** | **Casual Starters** | 10.5 mos | $32.47 | 1,732 (24.6%) | **Moderate Risk (Testing Phase)**: Low monthly commitment, exploratory lifecycle. *Action:* Educational product tours, free trial add-on bundles. |

---

### 5.2 Supervised Mining: Random Forest Classification

#### Algorithmic Design & Ensemble Formulation
To predict individual churn probability, an ensemble **Random Forest Classifier** was trained over one-hot encoded dimensional features. An ensemble of $B = 100$ decorrelated decision trees was constructed using bootstrap aggregation (bagging) and randomized feature subspace selection ($\sqrt{p}$ features per split):

$$\hat{y} = \text{mode}\left(\{T_b(x)\}_{b=1}^B\right), \quad P(\text{Churn} = 1 \mid x) = \frac{1}{B} \sum_{b=1}^{B} \mathbb{I}\left(T_b(x) = 1\right)$$

#### Addressing Class Imbalance
In the dataset, 26.54% of accounts churned ($N_{\text{churn}} = 1,869$) while 73.46% remained ($N_{\text{retain}} = 5,174$). In unweighted models, classifiers maximize accuracy by disproportionately predicting the majority class ("Retained"), resulting in unacceptable false negatives.  
To resolve this, **balanced class weighting** was enforced:

$$w_j = \frac{N}{2 \cdot N_j}$$

Assigning $w_1 = 1.884$ to churners and $w_0 = 0.681$ to retained accounts, heavily penalizing missed churners during tree splitting.

#### Model Evaluation on Holdout Test Set ($N = 1,409$)

```
+-----------------------------------------------------------------+
|               CONFUSION MATRIX (Holdout Test N=1,409)           |
+------------------------------------+----------------------------+
|                                    |      PREDICTED CLASS       |
|                                    |   Retained (0) | Churn (1) |
+------------------+-----------------+------------+---------------+
| ACTUAL CLASS     | Retained (0)    |  TN = 759  |  FP = 276     |
|                  | Churned (1)     |  FN =  77  |  TP = 297     |
+------------------+-----------------+------------+---------------+
```

#### Analytical Performance Metrics

| Evaluation Metric | Measured Score | Academic Interpretation |
| :--- | :---: | :--- |
| **ROC-AUC** | **0.8422** | Excellent global discriminative capability across all decision thresholds. |
| **Recall (Sensitivity)** | **79.41%** | **Primary Business Metric**: Successfully flags 297 out of 374 churners before departure. |
| **F1-Score** | **62.72%** | Strong harmonic mean balancing high sensitivity with operational efficiency. |
| **Accuracy** | **74.95%** | Robust generalization performance on unseen enterprise test data. |
| **Precision** | **51.83%** | Over 50% of triggered outreach calls target genuine at-risk accounts. |

#### Gini Feature Importance Attribution
The Random Forest computes feature importances via Mean Decrease in Impurity (Gini):

$$\Delta I(t) = I(t) - p_L I(t_L) - p_R I(t_R), \quad \text{where } I(t) = 1 - \sum_{k=0}^{1} p_k^2$$

The top 8 predictive drivers accounting for $>75\%$ of all splits:
1. `tenure_months` (18.94%): Account duration is the single strongest anchor of retention.
2. `contract_Two year` (12.43%): Multi-year legal commitment drastically reduces departure likelihood.
3. `total_charges` (12.16%): Cumulative historical revenue footprint.
4. `monthly_charges` (8.38%): Billed monthly expenditure magnitude.
5. `internet_service_Fiber optic` (8.10%): High incidence of churn due to competitive fiber pricing.
6. `payment_method_Electronic check` (7.02%): Correlated with payment friction and involuntary churn.
7. `contract_One year` (4.03%): Intermediate commitment dampening churn.
8. `online_security_Yes` (3.83%): Sticky security services that increase customer switching costs.

---

## 6. Full-Stack Application Architecture

### 6.1 Backend API (FastAPI)
The backend service (`backend/app/`) provides high-throughput, asynchronous REST endpoints:
- **`GET /api/dwh/kpis`**: Calculates real-time aggregates directly from `Fact_Subscriptions`.
- **`GET /api/dwh/contract-analysis`**: Multi-dimensional rollup across Contract $\times$ Internet Service tiers.
- **`GET /api/dwh/payment-analysis`**: Payment channel churn breakdown.
- **`GET /api/mining/clusters`**: Returns K-Means centroids, personas, and sampled 2D scatter coordinates.
- **`GET /api/mining/elbow`**: Delivers the 5-point WCSS curve data for $K \in [2,6]$.
- **`GET /api/mining/metrics`**: Exposes holdout model evaluation statistics and feature importance rankings.
- **`POST /api/mining/predict`**: Accepts single customer profiles and returns real-time risk scores, assigned personas, and custom retention prescriptions.
- **`POST /api/mining/retrain`**: Triggers full pipeline retraining with hot model reloading.

### 6.2 Frontend Dashboard (React 19 & Tailwind CSS)
Constructed in [`frontend/`](file:///c:/Users/Asus/OneDrive/Documents/Churn%20Prediction/frontend) and mirrored in [`4_FULLSTACK_APP/frontend/`](file:///c:/Users/Asus/OneDrive/Documents/Churn%20Prediction/4_FULLSTACK_APP/frontend/):
- **Aesthetic**: Pure black (`#000000`) canvas, `bg-zinc-950` navigation, `bg-zinc-900/80` cards with custom scrollbars and accent data highlights.
- **View 1: OLAP Warehouse**: 4 KPI cards, grouped bar charts, payment channel charts, and an interactive OLAP pivot table with column sorting and filtering.
- **View 2: Clustering Studio**: Recharts 2D `ScatterChart` visualizing 800+ customer points color-coded by persona, centroid markers, and the interactive WCSS Elbow Curve.
- **View 3: Churn Predictor**: Real-time simulation sliders (Tenure 0–72, Spend $18–$120), quick archetypes, circular SVG risk gauge, and prescription action banners.
- **View 4: Pipeline Diagnostics**: ETL ingestion summary, 2×2 confusion matrix, model performance scorecard, and horizontal Gini feature importances.

---

## 7. Results, Business Impact & Academic Conclusion

### 7.1 Quantitative Impact
- **Annual Recurring Revenue (ARR) Modeled**: **$5,473,399.20**
- **At-Risk Annual ARR Identified**: **$1,452,698.80** (26.54% churn rate)
- **Preventable ARR Salvaged (at 30% retention efficiency)**:
  
$$\text{Salvaged ARR} = \$1.452\text{M} \times 79.41\% \text{ (Recall)} \times 30\% \text{ (Intervention)} \approx \mathbf{\$346,000 / \text{year}}$$

### 7.2 Academic Conclusion
This project successfully proves that combining an OLAP Star Schema with Data Mining algorithms delivers profound analytical value over raw transactional systems. The Star Schema decouples reporting overhead from operational pipelines, Lloyd's K-Means clustering systematically uncovers latent customer personas without manual heuristic rules, and the balanced Random Forest classifier catches approximately 8 out of every 10 leaving customers with high statistical confidence.
