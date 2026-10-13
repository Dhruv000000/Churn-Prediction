# Viva Presentation Guide & Oral Defense Script
## Enterprise Churn Forensics & Predictive Retention Warehouse
**Target Duration:** 5 Minutes  
**Target Audience:** Academic Evaluators, Professors, and External Examiners  

---

## 1. Minute-by-Minute Oral Script

### [0:00 – 1:00] Problem Context & Architectural Motivation
> **Speaker Action:** Open the project root in VS Code / IDE. Have `PROJECT_REPORT_DWH_DM.md` visible on screen.

**Spoken Script:**
> *"Good morning, respected professors. Today I am presenting our project: **'Enterprise Churn Forensics and Predictive Retention Warehouse'**.*
>
> *In subscription enterprises, acquiring a new customer costs 5 to 7 times more than retaining an existing one. In the Kaggle Telco dataset of 7,043 accounts, the churn rate is **26.54%**, representing **$1.45M in annual recurring revenue at risk**.*
>
> *Traditional operational billing databases (OLTP) are designed in Third Normal Form for fast ACID transactions. However, when analytics teams run heavy aggregation queries—such as slicing churn across contracts, payment methods, and technical infrastructure—OLTP systems suffer from slow table joins, lock contention, and high latency.*
>
> *To solve this, we architected a decoupled, full-stack analytical platform: an **OLAP Star Schema Data Warehouse**, an automated **ETL Data Cleansing Pipeline**, a **Dual-Engine Data Mining Layer** featuring K-Means++ clustering implemented from scratch in pure NumPy alongside a balanced Random Forest classifier, and an executive React dashboard connected to a live FastAPI analytical backend."*

---

### [1:00 – 2:00] Data Warehouse (Star Schema) & ETL Pipeline
> **Speaker Action:** Navigate to `1_DATA_WAREHOUSE/01_schema_ddl.sql` and run `python 2_ETL_PIPELINE/verify_etl.py` in the terminal.

**Spoken Script:**
> *"Let us first examine our Data Warehouse layer in `1_DATA_WAREHOUSE/`. Following Ralph Kimball’s dimensional modeling methodology, we designed a clean **Star Schema**:*
> - *At the center is `Fact_Subscriptions`. The grain of our fact table is **one row per individual customer subscription lifecycle snapshot**.*
> - *Surrounding the fact table are three dimension tables: `Dim_Customer` (capturing demographics), `Dim_Account` (capturing billing and contract mechanics), and `Dim_Service` (capturing the portfolio of internet and phone products).*
> - *Notice that we deliberately avoided using raw alphanumeric natural keys like `customer_id`. Instead, we enforced synthetic integer **Surrogate Keys** (`SERIAL PK`). This isolates the warehouse from upstream billing schema changes, reduces index size, and accelerates B-Tree join traversal.*
>
> *Moving to `2_ETL_PIPELINE/etl_runner.py`: our ETL pipeline performs rigorous automated data hygiene. For example, in the raw dataset, 11 customer records contained blank whitespace strings in `TotalCharges`. Our forensics identified that all 11 records belonged to new signups with `tenure = 0` months. Rather than dropping them and skewing retention figures, our pipeline imputed `TotalCharges = 0.0`.*
>
> *As you can see from our live verification script on screen: **7,043 rows ingested**, **11 records imputed**, and **0 orphan foreign keys**, demonstrating 100% referential integrity."*

---

### [2:00 – 3:30] Data Mining Core: From-Scratch K-Means & Random Forest
> **Speaker Action:** Open `3_MINING_ENGINE/kmeans_scratch.py` and point out the Euclidean distance and K-Means++ methods, then open `3_MINING_ENGINE/saved_models/model_metrics.json`.

**Spoken Script:**
> *"Next is our Data Mining core in `3_MINING_ENGINE/`. Rather than relying on black-box libraries, we implemented **Lloyd’s K-Means clustering algorithm completely from scratch in pure NumPy**.*
>
> *To prevent the algorithm from getting trapped in suboptimal local minima, we built **K-Means++ probabilistic initialization**: each successive centroid is seeded based on the squared Euclidean distance to existing centroids, $P(x) = D(x)^2 / \sum D(x')^2$.*
>
> *We evaluated the Within-Cluster Sum of Squares (WCSS / Inertia) across $K \in [2, 6]$. As demonstrated by our Elbow Curve, inertia dropped from 7,991 down to 2,845 at $K=4$, beyond which marginal gains diminish. This mathematically proved that **$K = 4$ is the optimal number of customer personas**:*
> 1. *`VIP Champions` (High spend, high tenure — our core assets).*
> 2. *`Flight Risk Early Adopters` (High monthly spend on month-to-month contracts — our primary churn risk).*
> 3. *`Budget Loyalists` (Low spend, high loyalty).*
> 4. *`Casual Starters` (Low spend, introductory tenure).*
>
> *For our supervised prediction, we trained a balanced **Random Forest classifier** on an 80/20 train/test split. Telecom churn is naturally imbalanced (26% churn vs 74% retained). Standard models optimize for raw accuracy and fail to catch churners. We applied balanced class weighting, penalizing missed churners 2.7× more heavily.*
>
> *The resulting model achieves an **ROC-AUC of 0.8422** and a **Churn Recall of 79.41%** on unseen holdout test data, catching approximately 8 out of every 10 leaving accounts."*

---

### [3:30 – 5:00] Live Dashboard Demonstration
> **Speaker Action:** Open the browser at `http://localhost:5173`. Switch between the 4 tabs smoothly.

**Spoken Script:**
> *"Now let us observe the system running live in our full-stack React dashboard.*
>
> 1. ***Header & Live Status:*** *Notice the live status pill showing `API Connected (Port 8000)`. Our frontend communicates asynchronously with the FastAPI backend via Axios.*
> 2. ***Tab 1: OLAP Warehouse:*** *Here are our 4 executive KPIs: 7,043 accounts, 26.5% churn, $5.47M ARR, and $64.76 avg monthly spend. Below is a grouped bar chart showing Churn by Contract Tier $\times$ Internet Tech. Notice that Month-to-Month Fiber Optic customers have a massive 54.6% churn rate, while Two-Year contracts drop below 7%. The interactive pivot table allows full slicing and sorting across all 9 dimensional cubes.*
> 3. ***Tab 2: Clustering Studio:*** *This interactive 2D Scatter Plot maps tenure versus monthly spend for our accounts. The points are colored by our 4 discovered personas, with the white cross markers representing mathematical cluster centroids. On the right is the interactive WCSS Elbow Curve showing $K=4$ as optimal.*
> 4. ***Tab 3: Churn Predictor:*** *This is our real-time simulation sandbox. If I select the preset `'High-Risk Flight Risk'` (or drag Tenure down to 2 months and Monthly Charges up to $89), the model immediately calls `POST /api/mining/predict` in the background. The circular gauge animates to **85% Churn Risk**, labels it `'CRITICAL RISK'`, maps it to the `'Flight Risk Early Adopters'` quadrant, diagnoses 6 key risk drivers, and prescribes an immediate retention playbook: a 1-year contract discount with free tech support.*
> 5. ***Tab 4: Pipeline & Diagnostics:*** *Finally, this view presents our ETL health audit, the 2×2 confusion matrix showing 297 true positive saves out of 374, and the horizontal Gini Feature Importance chart showing that tenure duration and contract commitment dominate the decision tree splits.*
>
> *In summary, this project demonstrates the end-to-end synergy between Dimensional Data Warehousing, mathematical Data Mining, and production software engineering. Thank you, and I am delighted to take your questions."*

---

## 2. Top 10 Anticipated Viva Questions & Technical Model Answers

### Q1: Why did you build a Star Schema instead of Snowflake Schema or staying in 3NF?
> **Answer:**  
> *"In a Snowflake Schema, dimension tables are normalized into hierarchies (e.g., splitting `Dim_Service` into `Dim_Internet`, `Dim_Phone`, and `Dim_Streaming`). While this saves negligible disk space, it reintroduces multiple joins into analytical query plans. In a Star Schema, all dimensional attributes are de-normalized into a single hop around the central Fact table. This maximizes query speed, simplifies OLAP aggregation queries (`GROUP BY CUBE/ROLLUP`), and makes the schema intuitive for business analysts."*

---

### Q2: What is the "Grain" of your Fact Table and why is defining it critical?
> **Answer:**  
> *"The grain represents the exact level of detail represented by a single row in the fact table. In our warehouse, the grain is **one row per individual telecom subscription lifecycle snapshot**. Defining the grain first is the fundamental rule of Kimball dimensional modeling because it dictates which dimension foreign keys can be attached and guarantees that metrics like `monthly_charges` and `total_charges` are not double-counted when aggregating."*

---

### Q3: Why use Surrogate Keys instead of natural keys like `customer_id`?
> **Answer:**  
> *"We use synthetic auto-incrementing integer surrogate keys (`SERIAL PRIMARY KEY`) for three key reasons:*
> 1. *Performance: Integer comparisons and B-Tree index traversal are faster and consume significantly less memory than variable-length string comparisons (`VARCHAR(50)`).*
> 2. *Source Independence: If the upstream billing system changes the format of `customer_id` or recycles IDs, our analytical warehouse history remains intact.*
> 3. *Slowly Changing Dimensions (SCD): Surrogate keys allow storing multiple historical versions of the same business entity over time without violating primary key uniqueness."*

---

### Q4: How did your ETL pipeline handle the 11 missing `TotalCharges` values?
> **Answer:**  
> *"In the raw dataset, 11 records contained whitespace strings (`" "`). Forensic analysis revealed that all 11 records had `tenure = 0` months—brand new customers who had signed up within the billing cycle and had not yet received their first bill. Dropping these rows would have biased our tenure distribution. Therefore, our ETL pipeline imputed `TotalCharges = 0.0`, typecast the column to `float64`, and verified that no records were lost."*

---

### Q5: How does K-Means++ initialization differ from Standard Lloyd's K-Means?
> **Answer:**  
> *"Standard K-Means picks initial centroids uniformly at random, which frequently places two centroids close together in the same dense cluster, leading to suboptimal local minima and slow convergence.  
> K-Means++ picks the first centroid randomly, but picks each subsequent centroid with a probability proportional to the square of its Euclidean distance to the nearest already chosen centroid: $P(x) = \frac{D(x)^2}{\sum D(x')^2}$. This forces initial centroids to be spatially spread across the entire feature space, providing a theoretical $O(\log K)$ approximation guarantee to the optimal clustering."*

---

### Q6: Why did you choose $K = 4$ for clustering? What does WCSS measure?
> **Answer:**  
> *"WCSS stands for Within-Cluster Sum of Squares, or Inertia: $\text{WCSS} = \sum_{k=1}^K \sum_{x \in C_k} ||x - \mu_k||^2$. It measures cluster compactness. As $K$ increases, WCSS monotonically decreases (reaching 0 when $K=N$).  
> By plotting WCSS across $K \in [2, 6]$, we observed an 'elbow' inflection point at $K=4$. Between $K=2$ and $K=4$, inertia dropped by over 5,100 units (64% drop), whereas moving from $K=4$ to $K=5$ reduced inertia by only 458 units (a marginal 16% gain). Therefore, $K=4$ represents the optimal trade-off between compactness and model parsimony."*

---

### Q7: Why is Recall prioritized over Accuracy for churn classification?
> **Answer:**  
> *"In customer churn, the costs of classification errors are highly asymmetric:*
> - *A **False Positive** means we predict a loyal customer will churn; we send them an unnecessary email or discount. The cost is negligible ($1–$5).*
> - *A **False Negative** means we predict a customer will stay, but they leave unnoticed. The cost is the loss of that customer's entire lifetime value (hundreds or thousands of dollars).*
>
> *Because only 26% of customers churn, a naive classifier predicting 'No Churn' for everyone achieves 74% accuracy but has 0% recall. Our balanced Random Forest achieves **79.41% Recall**, catching ~80% of actual churners."*

---

### Q8: How did you handle Class Imbalance in the Random Forest model?
> **Answer:**  
> *"The raw dataset has 1,869 churners (26.5%) and 5,174 retained customers (73.5%), a ~1:2.8 imbalance. We configured `class_weight='balanced'`. This computes weights inversely proportional to class frequencies: $w_j = \frac{N}{2 \cdot N_j}$. As a result, misclassifying a churner carries 2.77 times more penalty during Gini split evaluation than misclassifying a retained customer, which directly drives high recall without synthetic data artifacts like SMOTE."*

---

### Q9: What is Gini Impurity and what were the top feature importances?
> **Answer:**  
> *"Gini impurity measures the probability that a randomly chosen element from a node would be incorrectly labeled if it were randomly labeled according to the distribution of labels in the subset: $I_G(t) = 1 - \sum p_i^2$.  
> The Random Forest measures feature importance by the Mean Decrease in Impurity across all 100 trees. The top three features were:*
> 1. `tenure_months` (18.94%): Long-term customers develop habituation and loyalty.
> 2. `contract_Two year` (12.43%): Multi-year contracts create financial and legal commitments.
> 3. `total_charges` (12.16%): Cumulative spend reflects account maturity and usage depth."*

---

### Q10: Why use FastAPI and React instead of Streamlit or Dash?
> **Answer:**  
> *"While Streamlit is suitable for simple data science scripts, it couples the UI to Python execution and re-runs the entire script on every user interaction, making it unsuitable for enterprise deployment.  
> By decoupling into a **FastAPI backend** and a **React 19 SPA**:*
> 1. *Architecture: We achieve a true multi-tier enterprise architecture with clear separation of concerns (REST API + stateless client).*
> 2. *Performance: FastAPI provides asynchronous, non-blocking I/O with automatic Pydantic request validation and sub-millisecond route handling.*
> 3. *User Experience: React enables client-side state management, real-time debounced slider simulation without full page reloads, and custom SVG gauges."*
