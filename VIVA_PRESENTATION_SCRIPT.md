# Viva Presentation Guide & Oral Defense Script
## Enterprise Churn Forensics & Predictive Retention Warehouse
**Target Duration:** 5–7 Minutes  
**Target Audience:** Academic Evaluators, Professors, and External Examiners  
**Course Code / Subject:** Data Warehousing & Data Mining (DWM)

---

## 1. Minute-by-Minute Oral Defense Script

### [0:00 – 1:00] Problem Context & Architectural Motivation
> **Speaker Action:** Open the project in browser (`http://localhost:5173`) showing the Landing Page and Star Schema overview.

**Spoken Script:**
> *"Good morning, respected examiners. Today I am presenting our project: **'Enterprise Churn Forensics and Predictive Retention Warehouse'**.*
>
> *In modern subscription enterprises, acquiring a new customer costs 5 to 7 times more than retaining an existing one. In telecom datasets, churn rates of 26% to 28% represent tens of millions of dollars in recurring revenue at risk.*
>
> *Traditional operational billing databases (OLTP) are structured in Third Normal Form for low-latency row insertions. However, when analytics and executive teams run heavy multi-dimensional aggregation queries—such as slicing churn across contracts, payment methods, and technical infrastructure—OLTP systems suffer from severe join contention, locks, and degraded latency.*
>
> *To solve this, we architected a decoupled, full-stack analytical platform: a **Kimball Star Schema Data Warehouse**, an automated **ETL Data Cleansing Pipeline**, and a **Tri-Engine Data Mining Layer** comprising:*
> 1. *Unsupervised Customer Segmentation via from-scratch K-Means++ (pure NumPy).*
> 2. *Supervised Predictive Retention Scoring via our champion Logistic Regression classifier.*
> 3. *Market Basket & Pattern Mining via our from-scratch Apriori algorithm with retrospective churn forensics and service recommendations.*
> *All connected through a FastAPI REST backend to an interactive React executive dashboard."*

---

### [1:00 – 2:00] Data Warehouse (Star Schema) & ETL Pipeline
> **Speaker Action:** Navigate to the **OLAP Warehouse** tab on the dashboard.

**Spoken Script:**
> *"Examining our Data Warehouse layer: following Ralph Kimball’s dimensional modeling methodology, we implemented a clean **Star Schema**:*
> - *At the center is `Fact_Subscriptions`. The grain of our fact table is **one row per individual customer subscription lifecycle snapshot**.*
> - *Surrounding the fact table are three dimension tables: `Dim_Customer` (demographics), `Dim_Billing` (contracts and payment channels), and `Dim_Service_Plan` (portfolio of voice and digital products).*
> - *We strictly enforced synthetic integer **Surrogate Keys** (`INTEGER PRIMARY KEY AUTOINCREMENT`) rather than natural business keys. This isolates the warehouse from upstream ERP schema changes, compacts foreign key storage, and accelerates B-Tree indexing.*
>
> *In our ETL pipeline (`2_ETL_PIPELINE/etl_runner.py`): raw records are ingested, cleansed, and validated. Zero-tenure accounts with blank TotalCharges are automatically imputed to $0.00 rather than dropped, preserving demographic distribution integrity.*
>
> *On the dashboard screen, our OLAP engine demonstrates four classical operations:*
> - *`ROLL-UP`: Aggregating metrics up from Internet Service into Total Contract levels.*
> - *`DRILL-DOWN`: Expanding high-level billing methods down into contract breakdowns.*
> - *`SLICE`: Isolating Month-to-month subscribers.*
> - *`DICE`: Filtering across Month-to-month, Fiber Optic, and Senior Citizens simultaneously."*

---

### [2:00 – 3:30] Supervised Classification & Champion Selection
> **Speaker Action:** Switch to the **Churn Predictor** and **Pipeline & Diagnostics** tabs.

**Spoken Script:**
> *"Next is our Supervised Classification module. We benchmarked multiple standard algorithms and standardized on **Logistic Regression as our Primary Champion Classifier**.*
>
> *Our selection is grounded in rigorous academic criteria:*
> 1. *It achieves the highest verified holdout **ROC-AUC (0.8726)**.*
> 2. *It delivers peak **Churn Recall of 83.83%**, correctly intercepting 4,947 out of 5,901 churners in our holdout test set—critical because missed churners cost 7× more than false alarms.*
> 3. *Unlike opaque tree ensembles, Logistic Regression provides exact **Log-Odds Interpretability** ($\ln(p/(1-p)) = \beta_0 + \sum \beta_i x_i$). Standardized coefficients translate directly to Odds Ratios ($e^{\beta_i}$): a Two-Year contract has $\beta = -1.26$, reducing churn odds by 72%, while an Electronic Check has $\beta = +0.48$, increasing churn risk.*
> 4. *The L-BFGS solver guarantees global convex convergence without tree-splitting instability.*
>
> *On the Churn Predictor tab, entering customer attributes generates an instant churn probability, persona assignment, and feeds our **Dynamic Retention Discount Engine** (prescribing up to 30% targeted relief for critical-risk accounts)."*

---

### [3:30 – 5:00] Market Basket Analysis, Apriori & Churn Pattern Forensics
> **Speaker Action:** Navigate to the new **Market Basket Mining** tab. Show the Apriori tuning sliders and association rules table.

**Spoken Script:**
> *"Now we arrive at our newest capability: **Market Basket Analysis using Apriori from Scratch** in `3_MINING_ENGINE/apriori_scratch.py`.*
>
> *We did not use external black-box packages like `mlxtend`. We coded the algorithm from first principles:*
> 1. *`Candidate Generation`: Using the lexicographical join step $L_{k-1} \bowtie L_{k-1}$.*
> 2. *`Pruning via Downward Closure`: Enforcing the Apriori property—'If any $(k-1)$-subset of candidate $c$ is infrequent, prune $c$ immediately before counting.'*
> 3. *`Vectorized Support Counting`: Using boolean bitmask operations across 105,000 transactions, converging in less than 10 milliseconds.*
>
> *At minimum support of 12% and confidence of 38%, the engine discovers 79 frequent itemsets and 178 association rules. For example:*
> - *`DSL Internet` + `Phone Service` $\rightarrow$ `Device Protection` with a **Lift of 1.29x**.*
>
> *Crucially, we added **Retrospective Churn Pattern Forensics**: analyzing billing and contract combinations associated with churn outcomes.*
> - *The #1 churn-risk basket is: `{Month-to-month, Fiber Optic, Electronic Check} -> Churned` with **78.15% confidence and 2.78x lift**.*
> - *Conversely, our top retention anchor is: `{Two year, Tech Support} -> Retained` with **97.15% confidence**.*
>
> *Finally, our **Customer Service Recommendation Engine** takes an active customer basket and recommends complementary unadopted services ranked by rule lift and confidence, categorizing suggestions into Cross-Sell Bundles or Retention Shields."*

---

## 2. Comprehensive Viva Examination Questions & Model Answers (35 Q&As)

### Section A: Market Basket Analysis & Apriori Algorithm

#### Q1: What is Market Basket Analysis, and what is its goal?
**Answer:** Market Basket Analysis (MBA) is an unsupervised data mining technique designed to discover co-occurrence relationships and affinity patterns among products or services purchased together. In this telecom project, customer service portfolios (e.g., Phone, Fiber Optic, Streaming TV) form transaction baskets, allowing the business to engineer high-affinity service bundles and targeted cross-selling strategies.

#### Q2: Define Support, Confidence, and Lift with their mathematical formulas.
**Answer:**
1. **Support ($X \rightarrow Y$):** The proportion of total transactions containing both $X$ and $Y$:
   $$\text{Support}(X \cup Y) = \frac{\sigma(X \cup Y)}{N}$$
2. **Confidence ($X \rightarrow Y$):** The conditional probability that transaction contains $Y$ given it contains $X$:
   $$\text{Confidence}(X \rightarrow Y) = \frac{\text{Support}(X \cup Y)}{\text{Support}(X)}$$
3. **Lift ($X \rightarrow Y$):** The ratio of observed joint occurrence to expected occurrence under statistical independence:
   $$\text{Lift}(X \rightarrow Y) = \frac{\text{Confidence}(X \rightarrow Y)}{\text{Support}(Y)} = \frac{\text{Support}(X \cup Y)}{\text{Support}(X) \times \text{Support}(Y)}$$

#### Q3: What is the significance of a Lift value greater than 1, equal to 1, and less than 1?
**Answer:**
- **Lift > 1.0:** Positive correlation. Products appear together more frequently than expected by chance, indicating strong bundle complementarity (e.g., Streaming TV and Streaming Movies, Lift = 1.28x).
- **Lift = 1.0:** Statistical independence. The occurrence of item $X$ has no effect on the likelihood of item $Y$.
- **Lift < 1.0:** Negative correlation / substitute goods. Subscribing to $X$ decreases the likelihood of having $Y$ (e.g., DSL and Fiber Optic).

#### Q4: What is the Apriori Property (Downward Closure)? Give a mathematical proof/explanation.
**Answer:**
The Apriori Property states that: **"All non-empty subsets of a frequent itemset must also be frequent."**  
*Proof:* Let $X \subseteq Y$. Any transaction $T$ that contains superset $Y$ must by definition also contain subset $X$ ($Y \subseteq T \implies X \subseteq T$). Therefore:
$$\sigma(X) \ge \sigma(Y) \implies \text{Support}(X) \ge \text{Support}(Y)$$
If an itemset $X$ fails the minimum support threshold ($\text{Support}(X) < \text{min\_support}$), then every superset $Y \supseteq X$ will have $\text{Support}(Y) \le \text{Support}(X) < \text{min\_support}$, proving that $Y$ can never be frequent and can be safely pruned without scanning the dataset.

#### Q5: How does candidate generation work in the Apriori algorithm? Explain the Join and Prune steps.
**Answer:**
- **Join Step ($L_{k-1} \bowtie L_{k-1}$):** Two frequent $(k-1)$-itemsets $p$ and $q$ are joined to create candidate $k$-itemset $c = p \cup q$ if and only if their first $(k-2)$ items are identical in lexicographical order.
- **Pruning Step:** For candidate $c$, all $k$ of its $(k-1)$-subsets are checked. If any subset $s \subset c$ is absent from $L_{k-1}$, candidate $c$ is pruned immediately.

#### Q6: Walk me through a numerical calculation of Support, Confidence, and Lift if an examiner gives you numbers.
**Answer:**
*Examiner prompt:* Suppose total transactions $N = 10,000$. Itemset $\{A\}$ appears in 4,000 transactions, $\{B\}$ appears in 3,000 transactions, and $\{A, B\}$ appears in 2,000 transactions. Calculate the metrics for $A \rightarrow B$.
- $\text{Support}(A) = 4,000 / 10,000 = 0.40$ (40%)
- $\text{Support}(B) = 3,000 / 10,000 = 0.30$ (30%)
- $\text{Support}(A \cup B) = 2,000 / 10,000 = 0.20$ (20%)
- $\text{Confidence}(A \rightarrow B) = \frac{\text{Support}(A \cup B)}{\text{Support}(A)} = \frac{0.20}{0.40} = 0.50$ (50%)
- $\text{Lift}(A \rightarrow B) = \frac{\text{Confidence}(A \rightarrow B)}{\text{Support}(B)} = \frac{0.50}{0.30} = 1.67\text{x}$  
*Conclusion:* Customers with A are 1.67 times more likely to purchase B than the general population.

#### Q7: How did you implement Apriori without calling `mlxtend`?
**Answer:**
We implemented `ScratchApriori` in `3_MINING_ENGINE/apriori_scratch.py`:
1. Mapped customer affirmative subscriptions into boolean NumPy bitmasks.
2. Formed $L_1$ by counting true values via `np.count_nonzero(mask) / N >= min_support`.
3. Iterated from $k=2$ to `max_len`: joined prefixes lexicographically, verified all $(k-1)$-subsets were in $L_{k-1}$ (downward closure), and performed bitwise `AND` on candidate item masks to count support in $< 0.01$ seconds across 105,000 records.
4. Partitioned all frequent itemsets of size $\ge 2$ into non-empty antecedents and consequents using `itertools.combinations`, calculating confidence, lift, leverage, and conviction.

#### Q8: What are Leverage and Conviction?
**Answer:**
- **Leverage:** $\text{Support}(A \cup C) - (\text{Support}(A) \times \text{Support}(C))$. Measures the proportion of additional transactions covered by $A$ and $C$ together beyond independence.
- **Conviction:** $\frac{1 - \text{Support}(C)}{1 - \text{Confidence}(A \rightarrow C)}$. Measures the frequency with which rule $A \rightarrow C$ fails compared to expected failure under independence. A conviction of $\infty$ indicates an absolute logical implication.

#### Q9: What is the difference between Retrospective Churn Association Analysis and Predictive Classification?
**Answer:**
- **Predictive Classification:** Uses supervised machine learning trained on historical features to infer the prospective probability $P(\text{Churn} | X)$ for a new customer. Requires holdout testing, threshold tuning, and strictly forbids target leakage.
- **Retrospective Association:** Uses Apriori to uncover descriptive co-occurrence patterns that already happened in historical data (e.g., `{Month-to-month, Fiber Optic} -> Churned`).
- *Important:* Association does not imply causation. Electronic check does not cause churn; rather, price-sensitive month-to-month customers gravitate toward manual payment methods.

#### Q10: How does your Customer Service Recommendation Engine work?
**Answer:**
Given a customer's active subscriptions:
1. It queries the association rule base for rules $A \rightarrow C$ where antecedent $A$ is a subset of the customer's active services ($A \subseteq \text{Active}$).
2. It filters for consequents containing services the customer does not currently have ($C \setminus \text{Active} \neq \emptyset$).
3. It applies confidence ($\ge 35\%$) and lift ($\ge 1.05$) thresholds and ranks suggestions by highest lift.
4. It categorizes recommendations into **Cross-Sell Bundles** (e.g., Streaming Movies) or **Retention Shields** (e.g., Tech Support, Online Security).

---

### Section B: Classification & Machine Learning

#### Q11: Why did you simplify from 4 classifiers to Logistic Regression?
**Answer:**
1. **Highest Verified Performance:** Logistic Regression achieved the highest holdout ROC-AUC (**0.8726**) and highest Churn Recall (**83.83%**).
2. **Academic Interpretability:** Linear log-odds coefficients ($\beta$) translate directly into Odds Ratios ($e^\beta$), providing clear mathematical attribution during defense, unlike black-box decision tree splits.
3. **No Overfitting:** L2-regularized convex optimization with L-BFGS converges to the unique global minimum without overfitting leaf nodes.
4. **Sub-millisecond Latency:** Instantaneous real-time scoring on the dashboard.

#### Q12: Why is Recall more important than Accuracy in customer churn prediction?
**Answer:**
Churn is imbalanced (28% churn vs 72% retain). A trivial model predicting "No Churn" for everyone achieves 72% accuracy but catches 0% of churners (0 Recall). In enterprise retention, a False Negative (failing to detect a churner who cancels and loses thousands in ARR) costs 5 to 7 times more than a False Positive (offering an unnecessary 10% loyalty discount). Hence, maximizing Recall (83.83%) is the primary business metric.

#### Q13: How did you handle class imbalance in your classifier?
**Answer:**
We passed `class_weight="balanced"` to Scikit-Learn's `LogisticRegression`. This inversely weights the loss function by class frequencies:
$$w_j = \frac{N}{2 \times N_j}$$
Minority churn instances receive an effective weight penalty $\approx 2.56\times$ higher than non-churners, penalizing misclassified churners and boosting recall from 62% to 83.83%.

#### Q14: Explain the confusion matrix numbers of your holdout test set.
**Answer:**
On our 21,000-sample holdout test set:
- **True Negatives (TN): 11,493** — Retained customers correctly classified.
- **False Positives (FP): 3,606** — Retained customers flagged as at-risk (receive proactive retention outreach).
- **False Negatives (FN): 954** — Churners missed by the model.
- **True Positives (TP): 4,947** — Churners correctly intercepted (83.83% of all 5,901 churners).

#### Q15: How does your Dynamic Retention Discount Engine work?
**Answer:**
Instead of offering blanket discounts, it maps the model's output churn probability $p$ to tailored economic tiers:
- $p < 30\%$ (Low Risk): $0\%$ discount (healthy account).
- $30\% \le p < 60\%$ (Moderate Risk): $10\%–15\%$ discount with tenure bonuses.
- $60\% \le p < 85\%$ (High Risk): $20\%–25\%$ contract extension discount.
- $p \ge 85\%$ (Critical Risk): $30\%$ emergency executive rescue credit.

---

### Section C: Data Warehousing, Kimball Star Schema & OLAP

#### Q16: What is a Kimball Star Schema and why did you choose it over Third Normal Form?
**Answer:**
A Star Schema consists of a central Fact table containing quantitative numeric business metrics surrounded by de-normalized Dimension tables containing qualitative business context. We chose it over 3NF because analytical queries require simple joins ($O(1)$ fact-dimension joins vs multi-level 3NF joins), reducing query planning overhead and maximizing aggregation performance.

#### Q17: What is the grain of your Fact table?
**Answer:**
The grain of `Fact_Subscriptions` is **one row per individual customer subscription lifecycle snapshot**, containing additive monthly charges, cumulative total charges, tenure in months, and the binary churn indicator.

#### Q18: What is a Surrogate Key and why did you use it?
**Answer:**
A Surrogate Key is an artificial, system-generated integer primary key (e.g., `customer_key INTEGER`) that has no business meaning. We used it instead of natural business keys (`customer_id` string like `7590-VHVEG`) because:
1. Integer comparisons are 4× faster than string comparisons in join algorithms.
2. It insulates the data warehouse from operational billing schema migrations.
3. It takes only 4 bytes per row instead of 10–20 bytes, saving memory and disk index footprint.

#### Q19: Explain the 4 core OLAP operations implemented in your project.
**Answer:**
1. **ROLL-UP:** Aggregating data up the hierarchy (e.g., from individual Internet Services up to Total Contract tiers).
2. **DRILL-DOWN:** Navigating from high-level summary totals down into detailed service components.
3. **SLICE:** Filtering on a single dimensional predicate (e.g., `WHERE contract = 'Month-to-month'`).
4. **DICE:** Filtering across multiple dimensions simultaneously (e.g., `WHERE contract = 'Month-to-month' AND monthly_charges > 70 AND senior_citizen = 1`).

#### Q20: What is an OLAP Cube?
**Answer:**
An OLAP Cube is an $N$-dimensional data array providing precomputed aggregations across all $2^N$ simultaneous dimensional combinations (e.g., `GROUP BY CUBE (contract, payment_method, internet_service)`), allowing instant sub-second executive slice-and-dice queries.

---

### Section D: Clustering & Unsupervised Mining

#### Q21: What is the objective function of K-Means clustering?
**Answer:**
The objective function is the Within-Cluster Sum of Squares (WCSS / Inertia):
$$J = \sum_{j=1}^K \sum_{x_i \in C_j} ||x_i - \mu_j||^2$$
where $\mu_j$ is the centroid mean vector of cluster $C_j$.

#### Q22: How does K-Means++ initialization differ from random initialization?
**Answer:**
Standard random initialization picks $K$ centroids uniformly at random, which often clumps centroids into the same dense cluster. K-Means++ picks the first centroid randomly, and then selects each subsequent centroid with probability proportional to its squared Euclidean distance to the nearest existing centroid ($P(x) = D(x)^2 / \sum D(x')^2$), ensuring centroids are spread out across the feature space. Arthur and Vassilvitskii proved it achieves an $O(\log K)$-competitive approximation ratio.

#### Q23: How did you select $K=4$ as optimal?
**Answer:**
We plotted the WCSS Elbow Curve across $K \in [2, 6]$. Inertia plummeted from 121,989 at $K=2$ down to 42,686 at $K=4$, after which the curve flattened (diminishing marginal variance explained). $K=4$ corresponds naturally to the four commercial quadrants of customer tenure versus monthly spend.

---

### Section E: Dataset Authenticity & Engineering Standards

#### Q24: What is the source of the 105,000 dataset records?
**Answer:**
To simulate enterprise-scale warehouse workloads, the canonical 7,043-record IBM Telco Churn benchmark was expanded to 105,000 records via statistically conditioned synthetic augmentation (`data/generate_scaled_dataset.py`). It preserves exact empirical covariance structures, demographic marginals, and non-linear churn interactions without data snooping.

#### Q25: How did your ETL pipeline handle data hygiene?
**Answer:**
It stripped whitespace across all 18 string attributes, identified 16 zero-tenure records with blank whitespace strings in `TotalCharges`, and imputed them to `0.00` based on domain logic (new accounts have not accumulated billed charges). It verified zero orphan foreign keys across all 105,000 records.
