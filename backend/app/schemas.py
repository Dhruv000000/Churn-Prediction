"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  backend/app/schemas.py
Purpose: Pydantic request and response schemas for REST API endpoints.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# 1. PREDICT SCHEMAS
# -----------------------------------------------------------------------------
class CustomerPredictRequest(BaseModel):
    tenure_months: int = Field(default=12, ge=0, description="Duration in months customer has been with company")
    monthly_charges: float = Field(default=75.0, ge=0.0, description="Current monthly billed amount ($)")
    total_charges: Optional[float] = Field(default=None, description="Cumulative billed amount ($). If None, calculated from tenure * monthly")
    
    # Demographics
    gender: str = Field(default="Male", description="'Male' or 'Female'")
    senior_citizen: int = Field(default=0, ge=0, le=1, description="1 if Senior Citizen, 0 otherwise")
    partner: str = Field(default="No", description="'Yes' or 'No'")
    dependents: str = Field(default="No", description="'Yes' or 'No'")
    
    # Service Portfolio
    phone_service: str = Field(default="Yes", description="'Yes' or 'No'")
    multiple_lines: str = Field(default="No", description="'Yes', 'No', or 'No phone service'")
    internet_service: str = Field(default="Fiber optic", description="'DSL', 'Fiber optic', or 'No'")
    online_security: str = Field(default="No", description="'Yes', 'No', or 'No internet service'")
    online_backup: str = Field(default="No", description="'Yes', 'No', or 'No internet service'")
    device_protection: str = Field(default="No", description="'Yes', 'No', or 'No internet service'")
    tech_support: str = Field(default="No", description="'Yes', 'No', or 'No internet service'")
    streaming_tv: str = Field(default="No", description="'Yes', 'No', or 'No internet service'")
    streaming_movies: str = Field(default="No", description="'Yes', 'No', or 'No internet service'")
    
    # Billing Terms
    contract: str = Field(default="Month-to-month", description="'Month-to-month', 'One year', or 'Two year'")
    paperless_billing: str = Field(default="Yes", description="'Yes' or 'No'")
    payment_method: str = Field(default="Electronic check", description="Payment channel")
    
    # Model Selection (Standardized on Champion Logistic Regression)
    model_name: Optional[str] = Field(default="Logistic Regression", description="Classification algorithm ('Logistic Regression')")


class CustomerPredictResponse(BaseModel):
    churn_probability: float = Field(..., description="Forecasted likelihood of churn (0.0 to 1.0)")
    churn_prediction: int = Field(..., description="1 = Likely to Churn, 0 = Likely to Retain")
    churn_risk_tier: str = Field(..., description="'Low', 'Moderate', 'High', or 'Critical'")
    cluster_persona: str = Field(..., description="Matched behavioural retention persona")
    risk_factors: List[str] = Field(default_factory=list, description="Key drivers explaining prediction")
    recommended_retention_action: str = Field(..., description="Actionable intervention suggestion")
    
    # Churn-Probability-Based Dynamic Discount Engine
    discount_percentage: float = Field(default=0.0, description="Targeted retention discount (0% to 30%)")
    original_monthly_charges: float = Field(default=0.0, description="Current monthly billed amount ($)")
    discounted_monthly_charges: float = Field(default=0.0, description="Newly calculated discounted bill ($)")
    monthly_savings: float = Field(default=0.0, description="Customer savings per month ($)")
    retention_tier_rationale: str = Field(default="", description="Business explanation of applied retention discount tier")
    model_used: Optional[str] = Field(default="Logistic Regression", description="Machine learning algorithm executed")


# -----------------------------------------------------------------------------
# 2. DWH OLAP SCHEMAS
# -----------------------------------------------------------------------------
class OLAPSummaryResponse(BaseModel):
    total_subscribers: int
    churn_count: int
    retained_count: int
    overall_churn_rate: float
    average_monthly_charges: float
    average_tenure_months: float
    total_monthly_revenue: float
    total_arr: float


class ContractAnalysisItem(BaseModel):
    contract_tier: str
    internet_service_type: str
    total_subscribers: int
    churned_subscribers: int
    retained_subscribers: int
    churn_rate_pct: float
    avg_tenure_months: float
    avg_monthly_charges: float
    total_monthly_mrr: float
    total_cumulative_revenue: float


class PaymentAnalysisItem(BaseModel):
    payment_method: str
    total_subscribers: int
    churned_subscribers: int
    churn_rate_pct: float
    avg_monthly_charges: float
    total_revenue: float


# -----------------------------------------------------------------------------
# 3. DATA MINING & CLUSTERING SCHEMAS
# -----------------------------------------------------------------------------
class CentroidItem(BaseModel):
    cluster_id: int
    centroid_tenure_months: float
    centroid_monthly_charges: float
    persona_name: str
    archetype: str
    risk_profile: str
    cluster_size: int
    cluster_pct: float
    recommended_action: str


class ScatterPoint(BaseModel):
    tenure_months: int
    monthly_charges: float
    cluster_id: int
    churn_flag: int


class ClusterQueryResponse(BaseModel):
    n_clusters: int
    final_wcss: float
    convergence_iterations: int
    personas: List[CentroidItem]
    scatter_sample: List[ScatterPoint]


class ElbowCurveResponse(BaseModel):
    optimal_k: int
    elbow_points: List[Dict[str, Any]]


class FeatureImportanceItem(BaseModel):
    rank: int
    feature: str
    importance: float
    importance_pct: float


class ModelComparisonItem(BaseModel):
    model_key: str = Field(..., description="Machine-readable model identifier (e.g. 'logistic_regression')")
    model_name: str = Field(..., description="Human-readable model name (e.g. 'Logistic Regression')")
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    is_best: bool = False
    notes: Optional[str] = None


class ModelMetricsResponse(BaseModel):
    model_type: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    confusion_matrix: Dict[str, int]
    top_features: List[FeatureImportanceItem]
    models_comparison: Optional[List[ModelComparisonItem]] = Field(default_factory=list, description="Champion model benchmark note")
    available_models: Optional[List[str]] = Field(default_factory=lambda: ["Logistic Regression"])
    selected_model: Optional[str] = Field(default="Logistic Regression")
    selection_rationale: Optional[str] = Field(
        default="Logistic Regression was chosen as the champion classifier due to superior ROC-AUC (0.8726), optimal Churn Recall (83.83%), and complete log-odds interpretability.",
        description="Academic rationale for model selection"
    )
    test_samples: Optional[int] = None
    train_samples: Optional[int] = None


class RetrainResponse(BaseModel):
    status: str
    message: str
    training_duration_seconds: float
    updated_metrics: Dict[str, Any]


# -----------------------------------------------------------------------------
# 4. APRIORI MARKET BASKET & PATTERN MINING SCHEMAS
# -----------------------------------------------------------------------------
class AprioriRunRequest(BaseModel):
    min_support: float = Field(default=0.12, ge=0.01, le=1.0, description="Minimum itemset support threshold (0.01 to 1.0)")
    min_confidence: float = Field(default=0.38, ge=0.05, le=1.0, description="Minimum rule confidence threshold (0.05 to 1.0)")
    max_len: int = Field(default=5, ge=1, le=10, description="Maximum itemset length to mine (1 to 10)")


class FrequentItemsetItem(BaseModel):
    itemset: List[str]
    size: int
    support: float
    support_pct: float
    count: int


class AssociationRuleItem(BaseModel):
    antecedent: List[str]
    consequent: List[str]
    support: float
    confidence: float
    lift: float
    leverage: float
    conviction: float
    strength: str
    rule_text: str


class ChurnRuleItem(BaseModel):
    antecedent: List[str]
    outcome: str
    support: float
    confidence: float
    lift: float
    rule_text: str
    churn_risk_level: Optional[str] = None
    retention_strength: Optional[str] = None


class AprioriSummaryResponse(BaseModel):
    total_transactions: int
    total_frequent_itemsets: int
    total_rules: int
    min_support: float
    min_confidence: float
    max_len: int
    execution_time_seconds: float
    itemset_counts_by_size: Dict[int, int]
    top_itemsets: List[FrequentItemsetItem]
    top_rules: List[AssociationRuleItem]
    available_services: List[str]


class ChurnPatternsResponse(BaseModel):
    total_churn_rules: int
    total_retention_rules: int
    min_support: float
    min_confidence: float
    execution_time_seconds: float
    churn_rules: List[ChurnRuleItem]
    retention_rules: List[ChurnRuleItem]


class RecommendationRequest(BaseModel):
    active_services: List[str] = Field(default_factory=list, description="Currently subscribed telecom services")
    min_confidence: Optional[float] = Field(default=0.35, ge=0.05, le=1.0)
    min_lift: Optional[float] = Field(default=1.05, ge=0.5)


class RecommendationItem(BaseModel):
    recommended_service: str
    triggering_antecedent: List[str]
    confidence: float
    lift: float
    support: float
    strategy: str
    rationale: str


class RecommendationResponse(BaseModel):
    active_services: List[str]
    recommendations_count: int
    recommendations: List[RecommendationItem]
