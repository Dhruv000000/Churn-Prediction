# Data Mining & Machine Learning Architecture Cheat Sheet
## Project: Enterprise Churn Forensics & Predictive Retention Warehouse
### Module: Task 4 – Data Mining Engine, Predictive Models & Market Basket Analysis

---

## 1. Machine Learning & Mining Architecture Overview

Our Data Mining Engine couples **Unsupervised Customer Segmentation** (from-scratch K-Means in pure NumPy), **Supervised Predictive Classification** (Champion Logistic Regression with StandardScaler & balanced weighting), and **Market Basket Analysis & Pattern Mining** (from-scratch Apriori algorithm) directly on analytical features extracted from our PostgreSQL/SQLite Star Schema.

```
       +-----------------------------------------------------------------+
       |       Analytical Star Schema Database (Warehouse Layer)         |
       +-----------------------------------------------------------------+
                                       |
                                       v
       +-----------------------------------------------------------------+
       |       Feature Extractor (SQL Join & One-Hot Encoding)           |
       +-----------------------------------------------------------------+
                 /                     |                       \
                /                      |                        \
               v                       v                         v
+-----------------------+  +------------------------+  +-------------------------+
| 1. UNSUPERVISED       |  | 2. SUPERVISED          |  | 3. MARKET BASKET        |
| - Pure NumPy K-Means  |  | - Champion Logistic Reg|  | - From-Scratch Apriori  |
| - Z-Score Scaling     |  | - StandardScaler       |  | - Candidate Join (Lk-1) |
| - K-Means++ Init      |  | - Balanced Weights     |  | - Downward Closure Prune|
| - WCSS Elbow (K=2..6) |  | - Holdout ROC-AUC=0.87 |  | - Support, Conf, Lift   |
| - 4 Business Personas |  | - Log-Odds Beta Coefs  |  | - Churn Pattern Mining  |
+-----------------------+  +------------------------+  +-------------------------+
```

---

## 2. Market Basket Analysis & From-Scratch Apriori Deep-Dive

### Point 1: Mathematical Foundations of Association Rule Mining
* **Transaction Representation:** Let $I = \{i_1, i_2, \dots, i_m\}$ be the complete item catalog of telecom service subscriptions ($m = 10$). A transaction $T \subseteq I$ is the set of affirmative services subscribed to by an individual customer.
* **Support:** The fraction of total transactions $N$ in database $D$ containing itemset $X$:
  $$\text{Support}(X) = \frac{\sigma(X)}{N} = \frac{|\{T \in D : X \subseteq T\}|}{|D|}$$
* **Confidence:** The conditional probability that a customer subscribing to antecedent $A$ also subscribes to consequent $C$:
  $$\text{Confidence}(A \rightarrow C) = P(C | A) = \frac{\text{Support}(A \cup C)}{\text{Support}(A)}$$
* **Lift:** The ratio of observed co-occurrence frequency to the frequency expected under mutual independence:
  $$\text{Lift}(A \rightarrow C) = \frac{P(A \cap C)}{P(A) \cdot P(C)} = \frac{\text{Confidence}(A \rightarrow C)}{\text{Support}(C)} = \frac{\text{Support}(A \cup C)}{\text{Support}(A) \times \text{Support}(C)}$$
  - **$\text{Lift} > 1.0$:** Positive correlation / strong bundle affinity (e.g., Streaming TV and Streaming Movies).
  - **$\text{Lift} = 1.0$:** Complete statistical independence ($P(A \cap C) = P(A)P(C)$).
  - **$\text{Lift} < 1.0$:** Negative correlation / cannibalistic services (e.g., DSL and Fiber Optic).
* **Leverage:** Absolute divergence from independence:
  $$\text{Leverage}(A \rightarrow C) = \text{Support}(A \cup C) - (\text{Support}(A) \times \text{Support}(C))$$
* **Conviction:** Sensitivity to rule implication failure:
  $$\text{Conviction}(A \rightarrow C) = \frac{1 - \text{Support}(C)}{1 - \text{Confidence}(A \rightarrow C)}$$

---

### Point 2: The Apriori Property (Downward Closure Principle)
* **Theorem:** *If an itemset is frequent, then all of its non-empty subsets must also be frequent.*
  $$\forall X, Y \subseteq I : X \subseteq Y \implies \text{Support}(X) \ge \text{Support}(Y)$$
* **Contrapositive (Pruning Principle):** *If an itemset $S$ is infrequent, then none of its supersets can ever be frequent.*
  $$\text{Support}(S) < \text{min\_support} \implies \forall Y \supset S, \text{Support}(Y) < \text{min\_support}$$
* **Algorithmic Execution in `apriori_scratch.py`:**
  1. **Candidate Join Step ($L_{k-1} \bowtie L_{k-1}$):** Joins two frequent $(k-1)$-itemsets $p, q$ sharing their first $(k-2)$ items in lexicographical order:
     $$p[:k-2] == q[:k-2] \implies c = p \cup q, \quad |c| = k$$
  2. **Candidate Pruning Step:** For candidate $c$, check all $k$ possible $(k-1)$-subsets. If any subset $s \subset c \notin L_{k-1}$, **prune candidate $c$ immediately** without scanning the database!
  3. **Vectorized Boolean Bitmask Support Counting:** Computes $\text{Count}(c) = \text{np.count\_nonzero}(\text{mask}_1 \ \& \ \text{mask}_2 \dots)$ across 105,000 transactions in $< 10$ milliseconds.

---

### Point 3: Worked Numerical Example with Real Warehouse Values
Consider our 105,000-subscriber data warehouse:
* Total Subscribers ($N$) = $105,000$
* Subscribers with `DSL Internet` = $35,885 \implies \text{Support}(\text{DSL}) = \frac{35,885}{105,000} = 0.3418$ (34.18%)
* Subscribers with `Phone Service` + `Streaming TV` = $36,220 \implies \text{Support}(\text{Phone} \cup \text{TV}) = \frac{36,220}{105,000} = 0.3450$ (34.50%)
* Subscribers with `DSL` + `Phone` + `Streaming TV` = $15,939 \implies \text{Support}(\text{DSL} \cup \text{Phone} \cup \text{TV}) = \frac{15,939}{105,000} = 0.1518$ (15.18%)

Now compute rule metrics for: **`DSL Internet` $\rightarrow$ `Phone Service` + `Streaming TV`**:
$$\text{Support} = 0.1518 \quad (15.18\%)$$
$$\text{Confidence} = \frac{\text{Support}(\text{DSL} \cup \text{Phone} \cup \text{TV})}{\text{Support}(\text{DSL})} = \frac{0.1518}{0.3418} = 0.4441 \quad (44.41\%)$$
$$\text{Lift} = \frac{\text{Confidence}}{\text{Support}(\text{Phone} \cup \text{TV})} = \frac{0.4441}{0.3450} = 1.2872 \quad (1.29\text{x})$$
**Business Interpretation:** A subscriber with DSL Internet is **1.29 times more likely** to also bundle Phone Service and Streaming TV than a randomly selected customer, with 44.41% rule confidence.

---

### Point 4: Retrospective Churn Association Analysis vs. Predictive Classification
* **Academic Distinction:**
  - **Predictive Classification (Machine Learning):** Inductive prospective scoring that outputs $P(\text{Churn} | \mathbf{x})$ for an unseen customer profile, requiring strict train/test holdout separation and non-leaking features.
  - **Retrospective Association (Apriori Mining):** Descriptive historical co-occurrence mapping that discovers combinations frequently shared by customers who already churned or stayed.
* **Top Churn Risk Bundle Discovered:**
  $$\{\text{Contract: Month-to-month}, \text{Fiber Optic Internet}, \text{Payment: Electronic check}\} \rightarrow \text{Churned}$$
  - $\text{Support} = 5.82\%$
  - $\text{Confidence} = 78.15\%$
  - $\text{Lift} = 2.78\text{x}$ (2.78 times higher churn rate than average customer)
* **Top Retention Anchor Discovered:**
  $$\{\text{Contract: Two year}, \text{Tech Support}\} \rightarrow \text{Retained}$$
  - $\text{Support} = 6.18\%$
  - $\text{Confidence} = 97.15\%$
  - $\text{Lift} = 1.35\text{x}$ (97.15% retention rate)
* **Viva Note:** *Association does NOT imply causation.* Having an electronic check does not directly cause a customer to cancel; rather, price-sensitive month-to-month subscribers with high fiber costs disproportionately select un-automated payment methods and face friction.

---

## 3. Supervised Classification: Champion Model Defense

### Why Logistic Regression Over Tree Ensembles?
1. **Empirical Superiority on Holdout:** Achieves holdout ROC-AUC of **0.8726** (vs Random Forest 0.8650, XGBoost 0.8717, LightGBM 0.8723).
2. **Optimal Minority-Class Sensitivity:** Churn recall of **83.83%** (captures 4,947 out of 5,901 actual churners in holdout test). Tree models without aggressive class reweighting suffered lower recall (80.90%).
3. **Parametric Log-Odds Interpretability:**
   $$\ln\left(\frac{p}{1 - p}\right) = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \dots + \beta_k x_k$$
   Each standardized coefficient $\beta_i$ translates to an exact **Odds Ratio** ($e^{\beta_i}$). For example, `contract_Two year` has $\beta = -1.26$, meaning $e^{-1.26} = 0.28$ (a two-year contract slashes the odds of churn by 72%).
4. **Global Convex Minimum:** Optimizing the cross-entropy loss function via L-BFGS is strictly convex with zero risk of bad local minima or hyperparameter over-tuning.
5. **Production Latency:** Evaluates single-customer inference in $< 1$ millisecond.

---

## 4. Unsupervised K-Means++ Clustering Defense

### Mathematical Formulation
* **Objective Function (Inertia / WCSS):**
  $$J = \sum_{j=1}^K \sum_{x_i \in C_j} ||x_i - \mu_j||^2$$
* **K-Means++ Initialization Bound (Arthur & Vassilvitskii, 2007):**
  $$E[J] \le 8(\ln K + 2) J_{OPT}$$
* **Optimal K=4 Personas:**
  1. **VIP Champions** (Tenure = 58.4 mos, Charges = $92.60) $\rightarrow$ High-value foundation.
  2. **Flight Risk High Spenders** (Tenure = 8.2 mos, Charges = $84.10) $\rightarrow$ Priority churn mitigation.
  3. **Budget Loyalists** (Tenure = 54.1 mos, Charges = $32.40) $\rightarrow$ Stable accounts, upsell candidates.
  4. **Casual Starters** (Tenure = 7.9 mos, Charges = $31.80) $\rightarrow$ Early lifecycle nurturing.
