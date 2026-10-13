-- ==============================================================================
-- PROJECT: Enterprise Churn Forensics & Predictive Retention Warehouse
-- MODULE:  Task 2 - Analytical Data Warehouse Schema (Star Schema DDL)
-- FILE:    1_DATA_WAREHOUSE/01_schema_ddl.sql
-- ENGINE:  PostgreSQL 14+
-- ==============================================================================
-- ACADEMIC / VIVA ARCHITECTURE SUMMARY:
-- Architecture: Star Schema (Kimball Dimensional Modeling)
-- Central Fact: Fact_Subscriptions
-- Dimensions:   Dim_Customer, Dim_Service_Plan, Dim_Billing
-- Grain:        One row per active customer subscription contract
-- Keys:         Surrogate Keys (SERIAL INT) for performance & independence from
--               operational source system changes.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. CLEANUP (Drop existing objects with dependency cascading)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS Fact_Subscriptions CASCADE;
DROP TABLE IF EXISTS Dim_Customer CASCADE;
DROP TABLE IF EXISTS Dim_Service_Plan CASCADE;
DROP TABLE IF EXISTS Dim_Billing CASCADE;

-- ------------------------------------------------------------------------------
-- 1. DIMENSION 1: Dim_Customer
-- ROLE:  Stores customer demographic attributes and profile information.
-- GRAIN: Exactly one row per unique enterprise customer.
-- KEYS:  customer_key (Surrogate Key), customer_id (Natural/Business Key).
-- ------------------------------------------------------------------------------
CREATE TABLE Dim_Customer (
    -- Surrogate Primary Key (Single-column integer, optimal for B-Tree index and foreign key joins)
    customer_key    SERIAL PRIMARY KEY,

    -- Natural / Business Key (Alpha-numeric identifier imported from the operational CRM/OLTP system)
    customer_id     VARCHAR(50) UNIQUE NOT NULL,

    -- Demographic Dimension Attributes
    gender          VARCHAR(10),            -- 'Male', 'Female'
    senior_citizen  SMALLINT,               -- 1 = Senior Citizen, 0 = Non-Senior
    partner         VARCHAR(5),             -- 'Yes', 'No'
    dependents      VARCHAR(5)              -- 'Yes', 'No'
);

COMMENT ON TABLE Dim_Customer IS 'Dimension storing customer demographics and natural identifiers';
COMMENT ON COLUMN Dim_Customer.customer_key IS 'Surrogate primary key auto-generated for DWH joins';
COMMENT ON COLUMN Dim_Customer.customer_id IS 'Natural business key from source CRM system';


-- ------------------------------------------------------------------------------
-- 2. DIMENSION 2: Dim_Service_Plan
-- ROLE:  Encapsulates the telecommunication/SaaS service portfolio consumed.
-- GRAIN: Exactly one row per unique configuration of services.
-- KEYS:  service_key (Surrogate Key).
-- ------------------------------------------------------------------------------
CREATE TABLE Dim_Service_Plan (
    -- Surrogate Primary Key
    service_key         SERIAL PRIMARY KEY,

    -- Core Communication Services
    phone_service       VARCHAR(10),        -- 'Yes', 'No'
    multiple_lines      VARCHAR(30),        -- 'Yes', 'No', 'No phone service'
    internet_service    VARCHAR(30),        -- 'DSL', 'Fiber optic', 'No'

    -- Cyber Security & Cloud Add-ons
    online_security     VARCHAR(30),        -- 'Yes', 'No', 'No internet service'
    online_backup       VARCHAR(30),        -- 'Yes', 'No', 'No internet service'
    device_protection   VARCHAR(30),        -- 'Yes', 'No', 'No internet service'
    tech_support        VARCHAR(30),        -- 'Yes', 'No', 'No internet service'

    -- Digital Media & Entertainment Streaming Add-ons
    streaming_tv        VARCHAR(30),        -- 'Yes', 'No', 'No internet service'
    streaming_movies    VARCHAR(30)         -- 'Yes', 'No', 'No internet service'
);

COMMENT ON TABLE Dim_Service_Plan IS 'Dimension representing customer service and addon subscription combinations';
COMMENT ON COLUMN Dim_Service_Plan.service_key IS 'Surrogate primary key for service catalog instances';


-- ------------------------------------------------------------------------------
-- 3. DIMENSION 3: Dim_Billing
-- ROLE:  Captures commercial contract arrangements and payment mechanics.
-- GRAIN: Exactly one row per distinct billing setup.
-- KEYS:  billing_key (Surrogate Key).
-- ------------------------------------------------------------------------------
CREATE TABLE Dim_Billing (
    -- Surrogate Primary Key
    billing_key         SERIAL PRIMARY KEY,

    -- Commercial Contract Commitment
    contract            VARCHAR(30),        -- 'Month-to-month', 'One year', 'Two year'

    -- Invoicing & Financial Settlement Channel
    paperless_billing   VARCHAR(5),         -- 'Yes', 'No'
    payment_method      VARCHAR(50)         -- 'Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'
);

COMMENT ON TABLE Dim_Billing IS 'Dimension storing contractual terms and billing channel details';
COMMENT ON COLUMN Dim_Billing.billing_key IS 'Surrogate primary key for billing configurations';


-- ------------------------------------------------------------------------------
-- 4. CENTRAL FACT TABLE: Fact_Subscriptions
-- ROLE:  Stores measurable numerical metrics and the primary business event
--        (customer retention vs churn) linked to surrounding dimensions.
-- GRAIN: One row per customer subscription snapshot.
-- KEYS:  fact_key (Surrogate Key), 3 Foreign Keys referencing Dimension tables.
-- ------------------------------------------------------------------------------
CREATE TABLE Fact_Subscriptions (
    -- Fact Table Surrogate Key
    fact_key            SERIAL PRIMARY KEY,

    -- Dimension Foreign Keys (Referential Integrity)
    customer_key        INT NOT NULL REFERENCES Dim_Customer(customer_key) ON DELETE RESTRICT,
    service_key         INT NOT NULL REFERENCES Dim_Service_Plan(service_key) ON DELETE RESTRICT,
    billing_key         INT NOT NULL REFERENCES Dim_Billing(billing_key) ON DELETE RESTRICT,

    -- Additive and Semi-Additive Numerical Facts / Measures
    tenure_months       INT NOT NULL CHECK (tenure_months >= 0),
    monthly_charges     NUMERIC(10, 2) NOT NULL CHECK (monthly_charges >= 0),
    total_charges       NUMERIC(10, 2) NOT NULL CHECK (total_charges >= 0),

    -- Primary Churn Classification Label (1 = Churned customer, 0 = Retained customer)
    churn_flag          SMALLINT NOT NULL CHECK (churn_flag IN (0, 1))
);

COMMENT ON TABLE Fact_Subscriptions IS 'Central Fact table recording customer subscription tenures, financial metrics, and churn outcomes';
COMMENT ON COLUMN Fact_Subscriptions.fact_key IS 'Surrogate primary key for fact records';
COMMENT ON COLUMN Fact_Subscriptions.tenure_months IS 'Additive metric: number of active months customer has been with company';
COMMENT ON COLUMN Fact_Subscriptions.monthly_charges IS 'Additive financial measure: current monthly recurring charges ($)';
COMMENT ON COLUMN Fact_Subscriptions.total_charges IS 'Additive financial measure: cumulative historical billed amount ($)';
COMMENT ON COLUMN Fact_Subscriptions.churn_flag IS 'Binary target flag: 1 = Customer churned, 0 = Customer retained';


-- ------------------------------------------------------------------------------
-- 5. OLAP OPTIMIZATION INDEXES (B-Tree)
-- Purpose: Accelerate Star Schema star-joins, aggregations, and high-frequency
--          retention analytics filters.
-- ------------------------------------------------------------------------------

-- Foreign Key Join Indexes (avoids sequential scans during star-join queries)
CREATE INDEX idx_fact_customer_key ON Fact_Subscriptions (customer_key);
CREATE INDEX idx_fact_service_key  ON Fact_Subscriptions (service_key);
CREATE INDEX idx_fact_billing_key  ON Fact_Subscriptions (billing_key);

-- Filter & Slicing Indexes
CREATE INDEX idx_fact_churn_flag   ON Fact_Subscriptions (churn_flag);

-- Composite Index for Churn vs Financial Cohort Analysis
CREATE INDEX idx_fact_churn_tenure_charges ON Fact_Subscriptions (churn_flag, tenure_months, monthly_charges);
