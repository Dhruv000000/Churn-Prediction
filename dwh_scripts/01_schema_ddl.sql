-- ==============================================================================
-- Project: Enterprise Churn Forensics & Predictive Retention Warehouse
-- File: 01_schema_ddl.sql
-- Description: DDL Script for PostgreSQL Star Schema Architecture
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Database Extensions & Pre-requisites
-- ------------------------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. Dimension Tables (PLACEHOLDER)
-- ------------------------------------------------------------------------------

-- Dim Date: Temporal dimension for historical slicing and seasonal analysis
-- CREATE TABLE IF NOT EXISTS dim_date (
--     date_key            INT PRIMARY KEY, -- YYYYMMDD
--     full_date           DATE NOT NULL,
--     day_of_month        SMALLINT NOT NULL,
--     month_number        SMALLINT NOT NULL,
--     month_name          VARCHAR(20) NOT NULL,
--     quarter             SMALLINT NOT NULL,
--     year_number         INT NOT NULL,
--     is_weekend          BOOLEAN NOT NULL
-- );

-- Dim Customer: Customer profile and demographic forensics
-- CREATE TABLE IF NOT EXISTS dim_customer (
--     customer_key        BIGSERIAL PRIMARY KEY,
--     customer_id         VARCHAR(64) UNIQUE NOT NULL,
--     gender              VARCHAR(20),
--     senior_citizen      BOOLEAN,
--     partner             BOOLEAN,
--     dependents          BOOLEAN,
--     created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- Dim Subscription: Contract, payment methods, and billing arrangements
-- CREATE TABLE IF NOT EXISTS dim_subscription (
--     subscription_key    BIGSERIAL PRIMARY KEY,
--     contract_type       VARCHAR(50) NOT NULL, -- Month-to-month, One year, Two year
--     paperless_billing   BOOLEAN NOT NULL,
--     payment_method      VARCHAR(50) NOT NULL  -- Electronic check, Mailed check, Bank transfer, Credit card
-- );

-- Dim Service Portfolio: Telecommunication and SaaS service package dimensions
-- CREATE TABLE IF NOT EXISTS dim_service_portfolio (
--     service_key         BIGSERIAL PRIMARY KEY,
--     phone_service       BOOLEAN,
--     multiple_lines      VARCHAR(30),
--     internet_service    VARCHAR(30), -- DSL, Fiber optic, No
--     online_security     VARCHAR(30),
--     online_backup       VARCHAR(30),
--     device_protection   VARCHAR(30),
--     tech_support        VARCHAR(30),
--     streaming_tv        VARCHAR(30),
--     streaming_movies    VARCHAR(30)
-- );

-- ------------------------------------------------------------------------------
-- 3. Fact Tables (PLACEHOLDER)
-- ------------------------------------------------------------------------------

-- Fact Customer Activity / Monthly Metrics: Granular billing, usage, tenure, and churn status
-- Grain: One record per customer billing snapshot
-- CREATE TABLE IF NOT EXISTS fact_customer_activity (
--     activity_id         BIGSERIAL PRIMARY KEY,
--     customer_key        BIGINT NOT NULL REFERENCES dim_customer(customer_key),
--     subscription_key    BIGINT NOT NULL REFERENCES dim_subscription(subscription_key),
--     service_key         BIGINT NOT NULL REFERENCES dim_service_portfolio(service_key),
--     date_key            INT NOT NULL,
--     tenure_months       INT NOT NULL,
--     monthly_charges     NUMERIC(10, 2) NOT NULL,
--     total_charges       NUMERIC(12, 2) NOT NULL,
--     support_tickets_count INT DEFAULT 0,
--     churn_label         BOOLEAN NOT NULL, -- True = Churned, False = Retained
--     recorded_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- Fact Retention Predictions: Forecasted churn risk probabilities & cluster assignments
-- CREATE TABLE IF NOT EXISTS fact_retention_predictions (
--     prediction_id       BIGSERIAL PRIMARY KEY,
--     customer_key        BIGINT NOT NULL REFERENCES dim_customer(customer_key),
--     model_version       VARCHAR(50) NOT NULL,
--     churn_probability   NUMERIC(6, 4) NOT NULL,
--     risk_category       VARCHAR(20) NOT NULL, -- Low, Medium, High, Critical
--     cluster_id          INT NOT NULL,
--     retention_action    VARCHAR(100),
--     predicted_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- ------------------------------------------------------------------------------
-- 4. Analytical Views & Performance Indexes (PLACEHOLDER)
-- ------------------------------------------------------------------------------
-- CREATE INDEX IF NOT EXISTS idx_fact_activity_cust ON fact_customer_activity(customer_key);
-- CREATE INDEX IF NOT EXISTS idx_fact_activity_churn ON fact_customer_activity(churn_label);
-- CREATE INDEX IF NOT EXISTS idx_fact_preds_cust ON fact_retention_predictions(customer_key);
