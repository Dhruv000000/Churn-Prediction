# Enterprise Churn Forensics & Predictive Retention Warehouse
## Advanced Data Warehousing & Data Mining (DWM) Academic Platform

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.143+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

An end-to-end, enterprise-grade Data Warehousing (DWH) and Data Mining (DM) platform integrating a **Kimball Star Schema**, an automated **ETL Data Cleansing Pipeline**, **from-scratch K-Means++ clustering** in pure NumPy, a **champion Logistic Regression classifier**, a **from-scratch Apriori Market Basket Analysis & Churn Forensics engine**, an asynchronous **FastAPI** backend, and a modern **React 19 / Tailwind CSS** dark-mode executive dashboard.

---

## 🏛️ System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                         ENTERPRISE CHURN FORENSICS ARCHITECTURE                                    |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [Tier 1: Data Warehouse] (1_DATA_WAREHOUSE/)                                                     |
|  - Star Schema (Ralph Kimball dimensional methodology)                                            |
|  - Fact_Subscriptions (Grain: 1 row per customer subscription lifecycle)                          |
|  - Dimension Tables: Dim_Customer, Dim_Billing, Dim_Service_Plan                                   |
|  - Surrogate Keys (INTEGER PKs), Foreign Keys, B-Tree Indexes                                     |
|                                                                                                   |
|  [Tier 2: ETL Pipeline] (2_ETL_PIPELINE/)                                                         |
|  - Ingestion: data/raw/telco_churn.csv (105,000 enterprise subscriber accounts)                    |
|  - Anomaly Cleansing: Imputes 16 zero-tenure whitespace records (TotalCharges -> 0.0)             |
|  - Surrogate Resolution: Foreign keys mapped atomically                                           |
|  - Verification: 105,000 rows loaded, 0 orphan keys (100% referential integrity)                  |
|                                                                                                   |
|  [Tier 3: Data Mining Engine] (3_MINING_ENGINE/)                                                  |
|  - Unsupervised: Lloyd's K-Means from scratch in pure NumPy with K-Means++ seeding               |
|  - Mathematical Elbow Curve: WCSS evaluated across K=2..6 -> Optimal K=4 Personas                 |
|  - Supervised Champion: Standardized Logistic Regression (ROC-AUC: 0.8726 | Churn Recall: 83.83%)  |
|  - Market Basket Analysis: From-scratch Apriori Frequent Itemset & Association Rule Mining        |
|  - Downward Closure Pruning: Prunes all non-frequent subset candidates before counting            |
|  - Retrospective Churn Forensics: Maps high-risk service & billing bundles (Lift up to 2.78x)     |
|  - Recommendation Engine: Recommends unadopted complementary services with rule justification     |
|                                                                                                   |
|  [Tier 4: Full-Stack Application] (backend/ + frontend/)                                          |
|  - Backend: FastAPI async REST service on Port 8000 with Pydantic v2 schemas                      |
|  - Frontend: React 19 + Tailwind CSS dark-mode dashboard on Port 5173                             |
|  - 5 Views: OLAP Warehouse | Clustering Studio | Churn Predictor | Market Basket | Diagnostics    |
+---------------------------------------------------------------------------------------------------+
```

---

## 📂 Repository Directory Structure

```
├── 1_DATA_WAREHOUSE/             # Tier 1: Dimensional Data Warehouse
│   ├── 01_schema_ddl.sql         # Star Schema DDL (Fact + 3 Dimensions)
│   ├── 02_olap_analytical_views.sql # Dimensional Rollup & OLAP SQL views
│   ├── setup_db.py               # Database initialization & DDL executor
│   └── ARCHITECTURE_EXPLAINER.md # Academic guide to Kimball Star Schema design
│
├── 2_ETL_PIPELINE/               # Tier 2: Automated ETL Cleansing Pipeline
│   ├── download_dataset.py       # Dataset verification script
│   ├── etl_runner.py             # 3-phase E-T-L pipeline (cleansing + load)
│   ├── verify_etl.py             # Integrity audit (105,000 rows, 0 orphans)
│   └── ETL_EXPLAINER.md          # Technical documentation of the ETL lifecycle
│
├── 3_MINING_ENGINE/              # Tier 3: NumPy K-Means, Classifier & Apriori
│   ├── feature_extractor.py      # SQL feature mart extraction from Star Schema
│   ├── kmeans_scratch.py         # Pure NumPy K-Means++ & WCSS elbow curve
│   ├── churn_classifier.py       # Primary Champion Logistic Regression classifier
│   ├── apriori_scratch.py        # Pure Python/NumPy Apriori & Churn Pattern Mining
│   ├── test_apriori.py           # Unit tests for Apriori & Downward Closure pruning
│   ├── run_mining_pipeline.py    # Master 4-step pipeline orchestrator
│   ├── saved_models/             # Serialized joblib artifacts & JSON summaries
│   └── MINING_EXPLAINER.md       # Mathematical & algorithmic reference
│
├── backend/                      # Active FastAPI Analytical REST Service
│   ├── app/
│   │   ├── routers/              # dwh_router.py, mining_router.py, apriori_router.py
│   │   ├── services/             # olap_service.py, mining_service.py, apriori_service.py
│   │   ├── schemas.py            # Pydantic v2 request/response models
│   │   └── database.py           # Engine & connection pool manager
│   ├── test_api.py               # 16 automated integration tests (100% pass)
│   └── requirements.txt          # Python dependencies
│
├── frontend/                     # Active React 19 + Tailwind Dashboard
│   ├── src/
│   │   ├── components/           # Sidebar.jsx & Header.jsx
│   │   ├── pages/                # OLAPWarehouse, ClusteringStudio, ChurnPredictor,
│   │   │                         # MarketBasketStudio, PipelineDiagnostics, Landing
│   │   └── api/client.js         # Axios client for port 8000
│   └── package.json              # Node dependencies
│
├── PROJECT_REPORT_DWH_DM.md      # Comprehensive academic project report
├── VIVA_PRESENTATION_SCRIPT.md   # Oral defense guide & 35 viva Q&As
├── RUN_PROJECT.bat               # Single-click Windows launcher
└── README.md                     # Project overview (this file)
```

---

## ⚡ Quick Start (Execution Commands)

### 1. Launch Services (Single-Click)
Run the automated launcher batch script:
```bat
RUN_PROJECT.bat
```
This automatically starts:
- **FastAPI Analytical Backend**: `http://127.0.0.1:8000` (Docs: `http://127.0.0.1:8000/docs`)
- **React Executive Dashboard**: `http://localhost:5173`

### 2. Run ETL Pipeline
```powershell
python 2_ETL_PIPELINE/etl_runner.py
```

### 3. Run Master Data Mining & Machine Learning Pipeline
```powershell
python 3_MINING_ENGINE/run_mining_pipeline.py
```

### 4. Run Automated Test Suites
```powershell
# 1. Apriori Unit Tests (Pruning, Downward Closure, Edge Cases)
python 3_MINING_ENGINE/test_apriori.py

# 2. FastAPI Endpoints Integration Tests (16 Tests)
python backend/test_api.py
```

---

## 🔬 Scientific Honesty & Dataset Methodology

To simulate high-throughput enterprise data warehouse scale, the canonical 7,043-record IBM Telco Churn benchmark was statistically expanded to **105,000 records** via conditioned synthetic augmentation (`data/generate_scaled_dataset.py`).
- **Class Balance**: 75,496 Retained (71.9%) vs. 29,504 Churned (28.1%).
- **Empirical Preservation**: Exact covariance structure between contract tiers, service adoptions, and churn probabilities are strictly preserved.
- **Leakage Prevention**: Churn labels are strictly isolated from feature matrices during predictive modeling.

---

## 📊 Core Performance Metrics

| Module | Metric | Verified Result | Notes |
| :--- | :--- | :--- | :--- |
| **DWH Star Schema** | Records Ingested | **105,000** | 0 orphan foreign keys, 100% integrity |
| **K-Means++** | Optimal Personas | **K = 4** | Inertia elbow curve from K=2 to 6 |
| **Classifier** | Champion Model | **Logistic Regression** | StandardScaler + Balanced Weights |
| **Classifier** | Holdout ROC-AUC | **0.8726** | Superior discrimination over trees |
| **Classifier** | Churn Recall | **83.83%** | Intercepts 4,947 of 5,901 churners |
| **Apriori MBA** | Frequent Itemsets | **79** itemsets | Pure Python/NumPy downward closure |
| **Apriori MBA** | Association Rules | **178** rules | Lift up to 1.29x across service bundles |
| **Churn Forensics** | Top Churn Rule | **Lift = 2.78x** | Month-to-month + Fiber + Electronic check |
