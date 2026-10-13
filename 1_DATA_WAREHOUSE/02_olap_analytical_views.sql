-- ==============================================================================
-- PROJECT: Enterprise Churn Forensics & Predictive Retention Warehouse
-- MODULE:  Task 2 - OLAP Analytical Operations & Dimensional Views
-- FILE:    1_DATA_WAREHOUSE/02_olap_analytical_views.sql
-- ENGINE:  PostgreSQL 14+
-- ==============================================================================
-- ACADEMIC / VIVA OLAP SUMMARY:
-- This script demonstrates the 4 fundamental OLAP operations:
-- 1. ROLL-UP:    Aggregating data up the hierarchy (contract -> all contracts).
-- 2. DRILL-DOWN: Navigating from summary totals down to internet service specifics.
-- 3. SLICE:      Filtering on a single dimensional condition (contract = 'Month-to-month').
-- 4. DICE:       Filtering across multiple dimensions (contract + monthly_charges > 70).
-- Also demonstrates: GROUP BY ROLLUP, GROUP BY CUBE, and Materialized Views.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROLL-UP & DRILL-DOWN MATERIALIZED VIEW: mv_rollup_contract_service
-- CONCEPT: Provides precomputed hierarchical aggregation across Contract and
--          Internet Service tiers using PostgreSQL's ROLLUP operator.
-- DRILL-DOWN PATH: Total Enterprise -> Contract Tier -> Internet Service
-- ------------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_rollup_contract_service CASCADE;

CREATE MATERIALIZED VIEW mv_rollup_contract_service AS
SELECT
    COALESCE(b.contract, '--- ALL CONTRACT TIERS ---')          AS contract_tier,
    COALESCE(s.internet_service, '--- ALL INTERNET SERVICES ---') AS internet_service_type,
    COUNT(f.fact_key)                                           AS total_subscribers,
    SUM(f.churn_flag)                                           AS churned_subscribers,
    COUNT(f.fact_key) - SUM(f.churn_flag)                      AS retained_subscribers,
    ROUND(
        (SUM(f.churn_flag)::NUMERIC / NULLIF(COUNT(f.fact_key), 0)) * 100, 
        2
    )                                                           AS churn_rate_pct,
    ROUND(AVG(f.tenure_months)::NUMERIC, 1)                     AS avg_tenure_months,
    ROUND(AVG(f.monthly_charges)::NUMERIC, 2)                   AS avg_monthly_charges,
    ROUND(SUM(f.monthly_charges)::NUMERIC, 2)                   AS total_monthly_mrr,
    ROUND(SUM(f.total_charges)::NUMERIC, 2)                     AS total_cumulative_revenue
FROM Fact_Subscriptions f
JOIN Dim_Billing b       ON f.billing_key = b.billing_key
JOIN Dim_Service_Plan s  ON f.service_key = s.service_key
GROUP BY ROLLUP (b.contract, s.internet_service)
ORDER BY 
    b.contract NULLS LAST, 
    s.internet_service NULLS LAST;

COMMENT ON MATERIALIZED VIEW mv_rollup_contract_service IS 
'Precomputed OLAP summary demonstrating ROLLUP aggregation across Contract and Internet Service tiers';


-- ------------------------------------------------------------------------------
-- 2. SLICE & DICE VIEW: view_slice_high_risk_month_to_month
-- CONCEPT:
-- - SLICE: Slices exclusively subscribers on 'Month-to-month' contracts.
-- - DICE:  Dices across high monthly charges (> $70.00) and multidimensional cohorts
--          (Senior Citizen, Fiber Optic, Electronic Check, Tenure Buckets).
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_slice_high_risk_month_to_month CASCADE;

CREATE OR REPLACE VIEW view_slice_high_risk_month_to_month AS
SELECT
    c.customer_id,
    c.gender,
    CASE WHEN c.senior_citizen = 1 THEN 'Senior' ELSE 'Non-Senior' END AS senior_status,
    b.contract,
    b.payment_method,
    s.internet_service,
    s.tech_support,
    s.online_security,
    f.tenure_months,
    CASE
        WHEN f.tenure_months <= 6  THEN '1. High Risk Cohort (0-6 mos)'
        WHEN f.tenure_months <= 12 THEN '2. Fragile Cohort (7-12 mos)'
        WHEN f.tenure_months <= 24 THEN '3. Developing Cohort (13-24 mos)'
        ELSE '4. Matured Cohort (25+ mos)'
    END AS tenure_risk_bracket,
    f.monthly_charges,
    f.total_charges,
    f.churn_flag,
    CASE WHEN f.churn_flag = 1 THEN 'LOST_CUSTOMER' ELSE 'ACTIVE_SUBSCRIBER' END AS retention_status
FROM Fact_Subscriptions f
JOIN Dim_Customer c      ON f.customer_key = c.customer_key
JOIN Dim_Billing b       ON f.billing_key  = b.billing_key
JOIN Dim_Service_Plan s  ON f.service_key  = s.service_key
WHERE 
    b.contract = 'Month-to-month'       -- Slice 1: Contract tier
    AND f.monthly_charges > 70.00;      -- Slice 2: High monthly financial exposure

COMMENT ON VIEW view_slice_high_risk_month_to_month IS 
'OLAP Slice & Dice targeting high-paying month-to-month customers vulnerable to churn';


-- ------------------------------------------------------------------------------
-- 3. CUBE MULTI-DIMENSIONAL VIEW: view_cube_demographics_billing
-- CONCEPT: GROUP BY CUBE computes all 2^N (2^3 = 8) simultaneous dimensional
--          permutations for deep demographic and contract churn analysis.
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_cube_demographics_billing CASCADE;

CREATE OR REPLACE VIEW view_cube_demographics_billing AS
SELECT
    COALESCE(c.gender, 'ALL GENDERS')               AS gender,
    COALESCE(
        CASE WHEN c.senior_citizen = 1 THEN 'Senior' 
             WHEN c.senior_citizen = 0 THEN 'Non-Senior' 
        END, 
        'ALL AGE GROUPS'
    )                                               AS seniority_group,
    COALESCE(b.contract, 'ALL CONTRACTS')           AS contract_type,
    COUNT(f.fact_key)                               AS total_records,
    SUM(f.churn_flag)                               AS total_churned,
    ROUND(
        (SUM(f.churn_flag)::NUMERIC / NULLIF(COUNT(f.fact_key), 0)) * 100, 
        2
    )                                               AS churn_rate_pct,
    ROUND(AVG(f.monthly_charges)::NUMERIC, 2)       AS avg_monthly_bill
FROM Fact_Subscriptions f
JOIN Dim_Customer c ON f.customer_key = c.customer_key
JOIN Dim_Billing b  ON f.billing_key  = b.billing_key
GROUP BY CUBE (c.gender, c.senior_citizen, b.contract);

COMMENT ON VIEW view_cube_demographics_billing IS 
'Multi-dimensional OLAP Cube aggregating all subtotal combinations of Gender, Seniority, and Contract';


-- ------------------------------------------------------------------------------
-- 4. ANALYTICAL WINDOW DRILL-DOWN: Highest Paying Churned Accounts per Contract
-- CONCEPT: Demonstrates SQL Window Ranking (DENSE_RANK) across dimensional partitions.
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_window_contract_churn_rankings CASCADE;

CREATE OR REPLACE VIEW view_window_contract_churn_rankings AS
SELECT
    b.contract,
    c.customer_id,
    s.internet_service,
    f.tenure_months,
    f.monthly_charges,
    f.total_charges,
    DENSE_RANK() OVER (
        PARTITION BY b.contract 
        ORDER BY f.monthly_charges DESC, f.total_charges DESC
    ) AS revenue_rank_in_contract
FROM Fact_Subscriptions f
JOIN Dim_Customer c     ON f.customer_key = c.customer_key
JOIN Dim_Billing b      ON f.billing_key  = b.billing_key
JOIN Dim_Service_Plan s ON f.service_key  = s.service_key
WHERE f.churn_flag = 1; -- Filter on churned accounts

COMMENT ON VIEW view_window_contract_churn_rankings IS 
'OLAP analytical window ranking showing the highest financial loss churn accounts per contract tier';
