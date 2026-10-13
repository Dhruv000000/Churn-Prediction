# Data Mining & Machine Learning Architecture Cheat Sheet
## Project: Enterprise Churn Forensics & Predictive Retention Warehouse
### Module: Task 4 – Data Mining Engine & Predictive Retention Models

---

## 1. Machine Learning Architecture Overview

Our Data Mining Engine couples **Unsupervised Customer Segmentation** (from-scratch K-Means in pure NumPy) with **Supervised Predictive Classification** (Random Forest with balanced weighting) directly on analytical features extracted from our PostgreSQL/SQLite Star Schema.

```
       +-------------------------------------------------------+
       |   Analytical Star Schema Database (Warehouse Layer)   |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |   Feature Extractor (SQL Join & One-Hot Encoding)     |
       +-------------------------------------------------------+
                  /                                 \
                 /                                   \
                v                                     v
+-------------------------------+   +------------------------------------+
|  1. UNSUPERVISED MINING       |   |  2. SUPERVISED CLASSIFICATION      |
|  - Pure NumPy ScratchKMeans   |   |  - Balanced Random Forest Ensemble |
|  - Manual Z-Score Scaling     |   |  - Stratified 80/20 Train-Test     |
|  - K-Means++ Initialization   |   |  - Evaluation: ROC-AUC, Recall, F1 |
|  - WCSS Elbow Curve (K=2..6)  |   |  - Gini Impurity Feature Ranking   |
|  - 4 Business Action Personas |   |  - Artifacts: churn_forest.pkl     |
+-------------------------------+   +------------------------------------+
```

---

## 2. Deep-Dive Viva Talking Points (Evaluator Defense Guide)

### Point 1: Mathematical Formulation of Scratch K-Means & Lloyd's Convergence
* **Objective Function (Inertia / WCSS):**
  $$J = \sum_{j=1}^K \sum_{x_i \in C_j} ||x_i - \mu_j||^2$$
  where $\mu_j$ is the centroid of cluster $C_j$.
* **The 2-Step Lloyd's Algorithm:**
  1. **Expectation Step (Assignment):**
     $$C_j^{(t)} = \left\{ x_i : ||x_i - \mu_j^{(t)}||^2 \le ||x_i - \mu_l^{(t)}||^2 \quad \forall l, 1 \le l \le K \right\}$$
     In our code, this is calculated via vectorized NumPy broadcasting:
     `distances = np.sqrt(np.sum((X[:, None, :] - centroids[None, :, :]) ** 2, axis=2))`
  2. **Maximization Step (Centroid Update):**
     $$\mu_j^{(t+1)} = \frac{1}{|C_j^{(t)}|} \sum_{x_i \in C_j^{(t)}} x_i$$
* **Proof of Convergence:**
  Because the number of possible partitions of $N$ points into $K$ clusters is finite ($S(N, K)$ Stirling numbers), and each step monotonically decreases or preserves the objective function $J$ ($\partial J / \partial \mu_j = 0$ at the mean), the algorithm is guaranteed to converge to a local minimum in a finite number of iterations.
  Our implementation tests convergence using the Frobenius norm of centroid displacement:
  $$||\mu^{(t+1)} - \mu^{(t)}||_F < tol \quad (1e-4)$$

---

### Point 2: Why K-Means++ Over Random Centroid Initialization?
* **The Flaw of Standard Forgy/Random Initialization:**
  Picking $K$ points uniformly at random frequently places multiple centroids into the same dense cluster, trapping the model in suboptimal local minima.
* **The K-Means++ Solution (Arthur & Vassilvitskii, 2007):**
  1. Choose the first center $c_1$ uniformly at random from $X$.
  2. For each remaining point $x$, compute $D(x)$ (the shortest Euclidean distance from $x$ to the closest centroid already chosen).
  3. Choose the next center $c_i$ with probability proportional to the squared distance:
     $$P(x) = \frac{D(x)^2}{\sum_{x' \in X} D(x')^2}$$
* **Academic Significance:**
  K-Means++ guarantees that the expected clustering error is mathematically bounded by:
  $$E[J] \le 8(\ln K + 2) J_{OPT}$$
  It achieves an $O(\log K)$-competitive approximation ratio, converging faster and with lower variance.

---

### Point 3: Determining Optimal $K$ via the WCSS Elbow Method
* As $K$ increases, WCSS naturally decreases (reaching 0 when $K = N$).
* The **Elbow Criterion** searches for the point of diminishing marginal returns: where the second derivative of the WCSS curve $\Delta^2 \text{WCSS} / \Delta K^2$ reaches maximum curvature.
* In our dataset (Tenure vs. Monthly Charges), an elbow appears distinctly at **$K = 4$**, partitioning subscribers into 4 intuitive commercial quadrants:
  1. **VIP Champions** (High Tenure, High Spend) $\rightarrow$ Core business foundation.
  2. **Flight Risk Early Adopters** (Low Tenure, High Spend) $\rightarrow$ Primary churn vulnerability.
  3. **Budget Loyalists** (High Tenure, Low Spend) $\rightarrow$ Stable accounts, upsell candidates.
  4. **Casual Starters** (Low Tenure, Low Spend) $\rightarrow$ New exploratory tier.

---

### Point 4: Why Recall and ROC-AUC Over Raw Accuracy in Churn Prediction?
* **Class Imbalance Reality:**
  In telecom and SaaS datasets, only **26.54%** of customers churn, while **73.46%** stay.
  A naive "dummy classifier" that always predicts *retained* achieves **73.46% accuracy** while catching **0% of churners**!
* **The Asymmetric Cost of Errors:**
  * **False Positive (Type I Error):** Predicting a retained customer will churn $\rightarrow$ Cost: A small discount or outreach email sent unnecessarily.
  * **False Negative (Type II Error):** Predicting a churner will stay $\rightarrow$ Cost: The company permanently loses hundreds or thousands of dollars in lifetime revenue!
* **Why Our Architecture Prioritizes Recall & ROC-AUC:**
  * **Recall ($\frac{TP}{TP + FN}$):** Directly measures what percentage of actual churners the retention team successfully catches before they cancel.
  * **ROC-AUC:** Measures the model's ability to rank high-risk customers higher than low-risk customers across all possible probability thresholds, immune to class imbalance.
  * We utilized `class_weight='balanced'` in our Random Forest, which weights the loss inversely proportional to class frequencies:
    $$w_1 = \frac{N}{2 \times N_{\text{churn}}} \approx 1.88, \quad w_0 = \frac{N}{2 \times N_{\text{retained}}} \approx 0.68$$

---

### Point 5: How Gini Impurity Derives Feature Importance in Random Forest
* At each split node $m$ in decision tree $T$, Gini impurity is:
  $$G(m) = 1 - \sum_{k=0}^1 p_{mk}^2$$
* The **Gini Impurity Decrease** $\Delta G(m)$ achieved by splitting on feature $j$ is:
  $$\Delta G(m) = N_m G(m) - N_{L} G(L) - N_{R} G(R)$$
* The total importance of feature $j$ across the ensemble of $B$ trees is the sum of impurity decreases normalized across all splits:
  $$I(j) = \frac{1}{B} \sum_{T=1}^B \sum_{m \in T, \text{split}(m)=j} \Delta G(m)$$
* **Key Enterprise Insight Discovered:**
  Contract Type (`contract_Two year`, `contract_One year`) and `tenure_months` consistently occupy the top ranks, proving empirically that customer retention is driven by contractual lock-in and onboarding duration rather than demographics.

---

## 3. Quick-Fire Viva Q&A

* **Q: Why did you implement K-Means from scratch instead of just calling `sklearn.cluster.KMeans`?**
  * *Answer:* Building the algorithm in pure NumPy demonstrates foundational mastery of the underlying mathematics: Z-Score vector normalization, K-Means++ probability distributions, vectorized Euclidean distance broadcasting, and convergence criteria under Frobenius norm displacement.

* **Q: Why must you scale data before running K-Means?**
  * *Answer:* Euclidean distance is scale-sensitive. In our dataset, `monthly_charges` ranges from $18 to $118, while `tenure_months` ranges from 0 to 72. If unscaled, variance in charges would dominate the distance metric, distorting cluster geometry.

* **Q: What is the time complexity of your Scratch K-Means implementation?**
  * *Answer:* The time complexity is $O(I \cdot K \cdot N \cdot D)$, where $I$ is iterations to convergence (~10-25), $K$ is number of clusters (4), $N$ is sample size (7,043), and $D$ is feature dimensionality (2). NumPy broadcasting computes all $N \times K$ distances in parallel C loops.
