# Data Warehouse Architecture & Defense Cheat Sheet
## Project: Enterprise Churn Forensics & Predictive Retention Warehouse
### Module: Task 2 – Analytical Star Schema & OLAP Layer

---

## 1. Dimensional Architecture Diagram (Star Schema)

Our analytical Data Warehouse implements a **Kimball Dimensional Model (Star Schema)** in PostgreSQL. A single central Fact table is directly linked to three surrounding Dimension tables via integer Surrogate Keys.

```
                  +-----------------------------------+
                  |           Dim_Customer            |
                  +-----------------------------------+
                  | PK: customer_key (SERIAL)         |
                  |     customer_id (Natural/Business)|
                  |     gender, senior_citizen        |
                  |     partner, dependents           |
                  +-----------------+-----------------+
                                    |
                                    | (1 : N)
                                    v
+-----------------------------+   +------------------------------------+   +-----------------------------+
|      Dim_Service_Plan       |   |         Fact_Subscriptions         |   |         Dim_Billing         |
+-----------------------------+   +------------------------------------+   +-----------------------------+
| PK: service_key (SERIAL)    |-->| PK: fact_key (SERIAL)              |<--| PK: billing_key (SERIAL)    |
|     phone_service           |   | FK: customer_key                   |   |     contract                |
|     multiple_lines          |   | FK: service_key                    |   |     paperless_billing       |
|     internet_service        |   | FK: billing_key                    |   |     payment_method          |
|     online_security/backup  |   |     tenure_months (Additive)       |   +-----------------------------+
|     tech_support, stream_tv |   |     monthly_charges (Additive)     |
|     streaming_movies        |   |     total_charges (Additive)       |
+-----------------------------+   |     churn_flag (Target Metric 0/1) |
                                  +------------------------------------+
```

---

## 2. Core Architectural Decisions (Viva Talking Points)

### Point 1: Data Grain Definition
* **Selected Grain:** **"One active subscription contract snapshot per unique customer."**
* **Why Grain Matters (Kimball Principle #1):**
  * The grain defines the atomic level of detail represented by a single row in the Fact table.
  * In telecom/SaaS customer retention, business decisions (contract renewals, discount targeting, retention offers) operate at the level of the *entire subscription account*.
  * Setting this grain prevents double-counting revenue while allowing direct attribution of services, billing methods, and demographic factors to churn events.

---

### Point 2: Why Star Schema Instead of Snowflake Schema?
A common academic question is: *"Why didn't you normalize `Dim_Service_Plan` or `Dim_Billing` into third normal form (Snowflake)?"*

| Evaluation Metric | Star Schema (Our Implementation) | Snowflake Schema (Alternative) | Why We Chose Star Schema |
| :--- | :--- | :--- | :--- |
| **Join Complexity** | **Single-Hop Joins:** Every dimension connects directly to `Fact_Subscriptions`. | **Multi-Hop Joins:** Dimensions link to sub-dimensions (e.g., `Dim_Internet_Type` $\rightarrow$ `Dim_Service`). | Minimizes query planning overhead and joins in PostgreSQL. |
| **Query Latency** | **Fastest:** Star-joins allow parallel index scans and hash joins. | **Slower:** Multi-table joins increase IO operations on analytical queries. | OLAP dashboards require sub-second analytical aggregations. |
| **BI & Tool Simplicity**| Extremely easy for SQL analysts and BI tools (PowerBI, Tableau, React UI) to query. | Complex drill-paths with fragmented foreign key chains. | Simplifies feature extraction for scikit-learn ML models. |
| **Storage Redundancy** | Minor dimensional attribute denormalization (negligible disk footprint). | Perfectly normalized (3NF) dimensions with minimal redundancy. | In modern analytics, storage is cheap; query latency and developer clarity dominate. |

---

### Point 3: Why Surrogate Keys (`customer_key`) Instead of Natural Keys (`customer_id`)?
In `Dim_Customer`, we maintain both:
* `customer_id VARCHAR(50)`: The upstream operational / CRM business key (e.g., `'7590-VHVEG'`).
* `customer_key SERIAL`: The internal Data Warehouse surrogate key (e.g., `1, 2, 3...`).

**Four Core Reasons for Surrogate Keys:**
1. **Source System Decoupling:** If the upstream billing system migrates or re-formats customer IDs (e.g., UUIDs or alphanumeric prefixes), the warehouse schema remains unaffected.
2. **Join & Index Performance:** Integer comparisons (`INT` 4 bytes) are significantly faster in B-Tree index lookups and Hash Joins than variable-width string comparisons (`VARCHAR(50)`).
3. **Slowly Changing Dimensions (SCD Type 2):** If a customer changes contract or upgrades to fiber optic over time, surrogate keys allow multiple historical dimension records for the same business `customer_id` with separate valid date ranges.
4. **Data Integration:** Enables merging data from multiple disparate operational systems that might have conflicting or non-standard key formats.

---

### Point 4: OLAP (Analytical Warehouse) vs. OLTP (Operational Database)

| Dimension | OLTP (Operational / Production DB) | OLAP (Analytical Data Warehouse - Ours) |
| :--- | :--- | :--- |
| **Primary Workload** | High-volume, short read/write transactions (`INSERT`, `UPDATE`, `DELETE`). | Complex, batch-read aggregation queries (`SUM`, `AVG`, `GROUP BY`, `ROLLUP`). |
| **Schema Design** | Normalized (3NF / BCNF) to eliminate anomalies during atomic writes. | Denormalized Dimensional Model (Star Schema) to eliminate expensive joins. |
| **Subject Orientation**| Application / process-centric (e.g., billing engine, support tickets). | Subject-centric (e.g., Customer Churn Forensics, Lifetime Value). |
| **Time Horizon** | Current, instantaneous operational state. | Historical trend tracking across tenures, cohorts, and life-cycle events. |
| **Target User** | Automated web applications, end-users executing transactions. | Data scientists, ML engineers, analytical queries, executive dashboards. |

---

## 3. OLAP Operations Demonstrated in `02_olap_analytical_views.sql`

When demonstrating the project, explain these 4 canonical OLAP operations:

1. **Roll-up (Aggregation Upward):**
   * *What it does:* Summarizes data from granular levels to executive totals.
   * *Implementation:* `mv_rollup_contract_service` uses `GROUP BY ROLLUP (b.contract, s.internet_service)` to produce subtotals by internet tier, contract tier, and enterprise grand total.
2. **Drill-down (De-aggregation Downward):**
   * *What it does:* Allows navigation from the top-level contract churn rate down to the specific internet service breakdown (e.g., discovering Fiber Optic has higher churn than DSL).
3. **Slice (1-Dimensional Filter):**
   * *What it does:* Fixes one dimension to a single value.
   * *Implementation:* Filtering `b.contract = 'Month-to-month'` in `view_slice_high_risk_month_to_month`.
4. **Dice (Multi-Dimensional Filter):**
   * *What it does:* Subsets a sub-cube across multiple dimensions simultaneously.
   * *Implementation:* Filtering `b.contract = 'Month-to-month' AND f.monthly_charges > 70.00` diced by `s.internet_service` and tenure risk brackets.
5. **Cube (Multi-Dimensional Subtotals):**
   * *What it does:* Computes all $2^N$ subtotal permutations across dimensions.
   * *Implementation:* `GROUP BY CUBE (c.gender, c.senior_citizen, b.contract)` in `view_cube_demographics_billing`.

---

## 4. Viva Quick-Fire Q&A (30-Second Punchy Answers)

* **Q: Why is `churn_flag` in the Fact table instead of a Dimension table?**
  * *Answer:* `churn_flag` is the numerical target measure of the business event being analyzed. Storing it as a numerical flag (`0` or `1`) in the Fact table enables instant mathematical aggregations like `SUM(churn_flag)` (total churned count) and `AVG(churn_flag) * 100` (churn rate percentage) without casting or joins.

* **Q: What types of measures are in `Fact_Subscriptions`?**
  * *Answer:* `monthly_charges` and `total_charges` are fully additive measures (they can be meaningfully summed across any dimension: customer, contract, or service). `tenure_months` is semi-additive (averaging across cohorts is meaningful, while summing across all customers requires business context).

* **Q: How do your B-Tree indexes speed up OLAP queries?**
  * *Answer:* B-Tree indexes are created on each foreign key (`customer_key`, `service_key`, `billing_key`) and on `churn_flag`. When PostgreSQL executes star-joins, the query planner uses index scans or bitmap heap scans rather than scanning millions of rows sequentially.
