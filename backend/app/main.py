"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/main.py
Purpose: Main FastAPI Application Entrypoint.
         Configures CORS, registers modular routers, and serves API documentation.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import dwh_router, mining_router

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

tags_metadata = [
    {
        "name": "Data Warehouse & OLAP",
        "description": "Analytical queries against the Star Schema: Executive KPIs, Multidimensional Rollups, and Payment Method slices.",
    },
    {
        "name": "Data Mining & Machine Learning",
        "description": "Pure NumPy K-Means clustering, WCSS Elbow Curve, Random Forest churn prediction, and retraining.",
    },
    {
        "name": "System Health",
        "description": "Diagnostic and liveness probes.",
    },
]

app = FastAPI(
    title="Enterprise Churn Forensics & Retention Warehouse API",
    description="""
High-throughput analytical backend connecting a PostgreSQL/SQLite Star Schema, 
a pure NumPy K-Means customer segmentation engine, and a supervised Random Forest 
retention classifier to executive dashboards.
    """,
    version="1.0.0",
    openapi_tags=tags_metadata,
)

# -----------------------------------------------------------------------------
# CORS CONFIGURATION
# -----------------------------------------------------------------------------
cors_env = os.getenv("CORS_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
if "http://localhost:5173" not in allowed_origins:
    allowed_origins.append("http://localhost:5173")
if "http://127.0.0.1:5173" not in allowed_origins:
    allowed_origins.append("http://127.0.0.1:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# ROUTER REGISTRATION
# -----------------------------------------------------------------------------
app.include_router(dwh_router.router)
app.include_router(mining_router.router)


# -----------------------------------------------------------------------------
# ROOT & HEALTH CHECK ROUTES
# -----------------------------------------------------------------------------
@app.get("/", tags=["System Health"])
def read_root():
    return {
        "service": "Enterprise Churn Forensics & Retention Warehouse API",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "endpoints": {
            "dwh_kpis": "/api/dwh/kpis",
            "contract_analysis": "/api/dwh/contract-analysis",
            "payment_analysis": "/api/dwh/payment-analysis",
            "clusters": "/api/mining/clusters",
            "elbow_curve": "/api/mining/elbow",
            "model_metrics": "/api/mining/metrics",
            "predict_churn": "/api/mining/predict",
            "retrain_pipeline": "/api/mining/retrain",
        }
    }


@app.get("/health", tags=["System Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Enterprise Churn Forensics & Retention Warehouse API",
        "database_connected": True,
        "cors_origins": allowed_origins,
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", 8000))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
