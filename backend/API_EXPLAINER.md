# Analytical Backend Architecture & Academic Viva Cheat Sheet
## Project: Enterprise Churn Forensics & Predictive Retention Warehouse
### Module: Task 5 – FastAPI High-Performance Analytical & Mining Backend

---

## 1. System Architecture & Component Mapping

The FastAPI backend serves as the high-throughput bridge connecting the analytical PostgreSQL/SQLite Star Schema and the Data Mining machine learning models to the executive React frontend dashboard.

```
       +-------------------------------------------------------------+
       |           Executive React + Tailwind Dashboard              |
       |                (Vite Server @ :5173)                        |
       +-------------------------------------------------------------+
                                      |
                      REST API Calls (Axios / JSON)
                                      v
+----------------------------------------------------------------------------+
|                  FastAPI Backend Server (:8000)                            |
|                                                                            |
|  [Routers]                                                                 |
|  - dwh_router.py    -> /api/dwh/kpis, /contract-analysis, /payment-analysis|
|  - mining_router.py -> /api/mining/clusters, /elbow, /metrics, /predict    |
|                                                                            |
|  [Services Layer]                                                          |
|  - olap_service.py   : Raw SQL aggregate engine on Fact & Dimensions       |
|  - mining_service.py : Scaler & vector loader, Random Forest inference    |
+----------------------------------------------------------------------------+
            |                                              |
            v                                              v
+-----------------------------+              +-------------------------------+
|  Data Warehouse Star Schema |              |  Serialized Mining Artifacts  |
|  - Fact_Subscriptions       |              |  - kmeans_model.pkl (Scratch) |
|  - Dim_Customer             |              |  - churn_forest.pkl (RandomF) |
|  - Dim_Service_Plan         |              |  - feature_schema.json        |
|  - Dim_Billing              |              |  - classifier_summary.json    |
+-----------------------------+              +-------------------------------+
```

---

## 2. Core Viva Defense Points (Evaluator Talking Points)

### Point 1: Why FastAPI Over Flask or Django?
A common academic question is: *"Why did you use FastAPI instead of traditional frameworks like Flask or Django?"*

| Evaluation Dimension | FastAPI (Our Choice) | Flask (Microframework) | Django (Monolithic) |
| :--- | :--- | :--- | :--- |
| **Concurrency & Async (ASGI)** | Native `async`/`await` support on Uvicorn; handles high-concurrency requests with minimal latency. | WSGI-based; synchronous by default, prone to thread blocking on heavy analytical queries. | Heavier synchronous WSGI; significant overhead for lightweight REST microservices. |
| **Data Validation** | Built-in Pydantic integration: automatic runtime payload validation, type casting, and serialization. | Manual validation or requires external libraries (`marshmallow`). | Form/Model serializers tied to Django ORM rather than analytical schemas. |
| **API Documentation** | Auto-generates interactive OpenAPI (Swagger UI) at `/docs` and ReDoc at `/redoc` with zero extra code. | Requires manual third-party plugins (`flask-restx` / `flasgger`). | Requires third-party setup (`drf-yasg` / `drf-spectacular`). |
| **Developer Productivity** | Strict typing reduces runtime bugs and guarantees contractual fidelity with React TypeScript/JavaScript. | Dynamically typed, prone to silent payload mismatch bugs. | High boilerplate and steep learning curve for pure API services. |

---

### Point 2: The Role of the Backend as an Architectural Bridge
In modern enterprise data platforms, machine learning models and data warehouses must not be queried directly by the frontend for three reasons:
1. **Security & Connection Isolation:** Exposing database connection pools directly to client-side browsers creates security vulnerabilities. The FastAPI backend isolates database credentials securely within the environment.
2. **Schema Translation:** The backend transforms flat transactional predictions into rich contextual objects containing the customer's behavioral persona, contributing risk factors, and prescriptive retention actions.
3. **In-Memory Caching:** Serialized model artifacts (`churn_forest.pkl`, `kmeans_model.pkl`) are loaded once into server memory (`_load_artifacts()`), allowing sub-millisecond scoring ($< 5\text{ ms}$) without repeated disk reads.

---

### Point 3: Pydantic Data Contracts & Integrity
Every request and response adheres to strict schemas defined in `backend/app/schemas.py`:
* **`CustomerPredictRequest`:** Validates continuous attributes (`tenure_months >= 0`, `monthly_charges >= 0`) and provides sensible defaults for exploration.
* **`CustomerPredictResponse`:** Guarantees a normalized float probability ($[0.0, 1.0]$), risk tier categorization, and a concrete list of explainable risk drivers.
* **`ClusterQueryResponse`:** Bundles centroid metrics with a coordinate sample formatted specifically for Recharts scatter components.

---

## 3. Interactive API Documentation (Swagger UI)

* **Interactive Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Alternative ReDoc UI:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 4. Endpoints Quick Reference Table

| HTTP Method | Endpoint URL | Purpose / Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Liveness probe and CORS configuration verification |
| `GET` | `/api/dwh/kpis` | Executive Star Schema KPIs (Subscribers, Churn Rate %, ARR, Average Spend) |
| `GET` | `/api/dwh/contract-analysis`| Multidimensional aggregation by Contract Type and Internet Service |
| `GET` | `/api/dwh/payment-analysis` | Churn rates and revenues sliced across payment channels |
| `GET` | `/api/mining/clusters` | K-Means centroids, customer persona definitions, and 2D scatter sample |
| `GET` | `/api/mining/elbow` | Within-Cluster Sum of Squares (WCSS) curve across $K=2 \dots 6$ |
| `GET` | `/api/mining/metrics` | Holdout evaluation metrics (ROC-AUC, Recall, Confusion Matrix, Top Gini features) |
| `POST`| `/api/mining/predict` | Real-time customer churn probability scoring and risk factor explanation |
| `POST`| `/api/mining/retrain` | Triggers programmatic re-extraction and model re-training |
