# Enterprise Churn Forensics & Predictive Retention Warehouse

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

An end-to-end, enterprise-grade Data Warehousing (DWH) and Data Mining (DM) platform integrating a **Kimball Star Schema**, an automated **ETL Data Cleansing Pipeline**, **from-scratch K-Means++ clustering** in pure NumPy, a **class-balanced Random Forest classifier**, an asynchronous **FastAPI** backend, and a modern **React 19 / Tailwind CSS** dark-mode executive dashboard.

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
|  - Dimension Tables: Dim_Customer, Dim_Account, Dim_Service                                        |
|  - Surrogate Keys (SERIAL PKs), Foreign Keys, B-Tree Indexes                                      |
|                                                                                                   |
|  [Tier 2: ETL Pipeline] (2_ETL_PIPELINE/)                                                         |
|  - Raw Ingestion: data/raw/telco_churn.csv (7,043 accounts)                                        |
|  - Anomaly Cleansing: Imputes 11 zero-tenure whitespace records (TotalCharges -> 0.0)             |
|  - Surrogate Resolution: Foreign keys mapped atomically                                           |
|  - Verification: 7,043 rows loaded, 0 orphan keys (100% integrity)                               |
|                                                                                                   |
|  [Tier 3: Data Mining Engine] (3_MINING_ENGINE/)                                                  |
|  - Unsupervised: Lloyd's K-Means from scratch in pure NumPy with K-Means++ seeding               |
|  - Mathematical Elbow Curve: WCSS evaluated across K=2..6 -> Optimal K=4 Personas                 |
|  - Supervised: Balanced Random Forest Ensemble (ROC-AUC: 0.8422 | Recall: 79.41%)                  |
|  - Feature Attribution: Ranked Gini Feature Importances (Tenure, 2-Year Contract, Spend)          |
|                                                                                                   |
|  [Tier 4: Full-Stack Application] (4_FULLSTACK_APP/ & frontend/ + backend/)                      |
|  - Backend: FastAPI async REST service on Port 8000 with Pydantic v2 schemas                      |
|  - Frontend: React 19 + Tailwind CSS pure-black dark dashboard on Port 5173                       |
|  - 4 Views: OLAP Warehouse | Clustering Studio | Churn Predictor | Pipeline Diagnostics          |
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
│   ├── download_dataset.py       # Kaggle Telco CSV verification/downloader
│   ├── etl_runner.py             # 3-phase E-T-L pipeline (cleansing + load)
│   ├── verify_etl.py             # Integrity audit (7,043 rows, 0 orphans)
│   └── ETL_EXPLAINER.md          # Technical documentation of the ETL lifecycle
│
├── 3_MINING_ENGINE/              # Tier 3: NumPy K-Means & Classification Core
│   ├── feature_extractor.py      # SQL feature mart extraction from Star Schema
│   ├── kmeans_scratch.py         # Pure NumPy K-Means++ & WCSS elbow curve
│   ├── churn_classifier.py       # Balanced Random Forest classifier
│   ├── run_mining_pipeline.py    # Pipeline runner & model serialization
│   ├── saved_models/             # Serialized joblib artifacts & JSON metrics
│   └── MINING_EXPLAINER.md       # Mathematical & algorithmic reference
│
├── 4_FULLSTACK_APP/              # Tier 4: Production Deployment Distribution
│   ├── backend/                  # Mirrored FastAPI analytical service
│   └── frontend/                 # Mirrored React 19 dashboard
│
├── backend/                      # Active FastAPI Analytical REST Service
│   ├── app/
│   │   ├── routers/              # dwh_router.py & mining_router.py
│   │   ├── services/             # olap_service.py & mining_service.py
│   │   ├── schemas.py            # Pydantic v2 request/response models
│   │   └── database.py           # Engine & connection pool manager
│   └── requirements.txt          # Python dependencies
│
├── frontend/                     # Active React 19 + Tailwind Dashboard
│   ├── src/
│   │   ├── components/           # Sidebar.jsx & Header.jsx
│   │   ├── pages/                # OLAPWarehouse, ClusteringStudio,
│   │   │                         # ChurnPredictor, PipelineDiagnostics
│   │   └── api/client.js         # Axios client for port 8000
│   └── package.json              # Node dependencies
│
├── PROJECT_REPORT_DWH_DM.md      # Comprehensive academic project report
├── VIVA_PRESENTATION_SCRIPT.md   # 5-minute viva demo guide & top 10 Q&A
├── RUN_PROJECT.bat               # Single-click Windows launcher
└── README.md                     # Project overview (this file)
```

---

## ⚡ Quick Start (Single-Click Launch)

### Prerequisites
- Python 3.10+ installed
- Node.js 18+ and npm installed

### Option A: Single-Click Batch Launcher (Windows)
Double-click `RUN_PROJECT.bat` in the project root. This will:
1. Start the FastAPI backend on `http://127.0.0.1:8000`.
2. Start the React frontend on `http://localhost:5173`.
3. Automatically launch your default browser to `http://localhost:5173`.

### Option B: Manual Startup

#### 1. Backend Service
```bash
cd backend
# Create virtual environment if needed
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Documentation will be live at `http://127.0.0.1:8000/docs`.*

#### 2. Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
*Dashboard will be live at `http://localhost:5173`.*

---

## 📊 Key Experimental Results & Model Scorecard

| Category | Metric | Measured Value | Business Interpretation |
| :--- | :--- | :---: | :--- |
| **Warehouse** | Total Ingested Accounts | **7,043** | 100% of enterprise accounts ingested |
| **Warehouse** | Referential Integrity | **0 Orphans** | Zero foreign key orphan violations |
| **Warehouse** | Annual Recurring Revenue | **$5.47M** | Total customer ARR modeled in warehouse |
| **Warehouse** | Baseline Churn Rate | **26.54%** | $1.45M annual revenue at risk |
| **Clustering** | Optimal K Clusters | **$K = 4$** | Determined by WCSS Elbow inflection |
| **Clustering** | Final WCSS Inertia | **2,845.37** | Converged in 10 iterations |
| **Supervised** | **ROC-AUC** | **0.8422** | High class discriminative capacity |
| **Supervised** | **Churn Recall** | **79.41%** | **Catches 8 out of 10 leaving accounts** |
| **Supervised** | F1-Score | **62.72%** | Balanced harmonic precision-recall mean |
| **Supervised** | Accuracy | **74.95%** | Evaluated on 1,409 holdout accounts |

---

## 🎯 Discovered Customer Personas ($K=4$)

1. **VIP Champions** ($N = 1,952$, 27.7%):  
   High spend ($93.02/mo), long tenure (58.7 mos). Low churn risk. Core enterprise assets.
2. **Flight Risk Early Adopters** ($N = 2,204$, 31.3%):  
   High spend ($81.22/mo), short tenure (14.8 mos). Critical churn risk. Month-to-month fiber subscriptions.
3. **Budget Loyalists** ($N = 1,155$, 16.4%):  
   Low spend ($34.03/mo), long tenure (54.1 mos). Low churn risk. Candidates for broadband upgrades.
4. **Casual Starters** ($N = 1,732$, 24.6%):  
   Low spend ($32.47/mo), short tenure (10.5 mos). Moderate risk. Introductory testing phase.

---

## 🎓 Academic Documentation & Viva Preparation
- **Comprehensive Project Report**: See [`PROJECT_REPORT_DWH_DM.md`](PROJECT_REPORT_DWH_DM.md) for full mathematical definitions, Star Schema specifications, and results analysis.
- **Viva Presentation Guide**: See [`VIVA_PRESENTATION_SCRIPT.md`](VIVA_PRESENTATION_SCRIPT.md) for a minute-by-minute 5-minute presentation script and the Top 10 anticipated examiner questions with technical answers.
- **Architectural Reference**: See [`1_DATA_WAREHOUSE/ARCHITECTURE_EXPLAINER.md`](1_DATA_WAREHOUSE/ARCHITECTURE_EXPLAINER.md).
- **ETL Lifecycle Reference**: See [`2_ETL_PIPELINE/ETL_EXPLAINER.md`](2_ETL_PIPELINE/ETL_EXPLAINER.md).
- **Data Mining Algorithmic Reference**: See [`3_MINING_ENGINE/MINING_EXPLAINER.md`](3_MINING_ENGINE/MINING_EXPLAINER.md).

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).