#!/usr/bin/env python3
"""
Enterprise Churn Forensics & Predictive Retention Warehouse
Module:  3_MINING_ENGINE/kmeans_scratch.py
Purpose: Pure NumPy implementation of K-Means Clustering algorithm from first principles.
         Includes manual Z-Score standardization, K-Means++ initialization,
         vectorized Euclidean distance broadcasting, WCSS Elbow Curve computation,
         and business persona quadrant mapping.
"""

import os
import sys
import json
import pickle
from pathlib import Path
import numpy as np

# Ensure robust console output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
SAVED_MODELS_DIR = CURRENT_DIR / "saved_models"


class ScratchKMeans:
    """
    K-Means Clustering implemented from scratch using pure NumPy.
    Mathematical formulation:
    - Distance Metric: Euclidean Distance ||x - c||_2
    - Initialization: K-Means++ D^2 weighting
    - Convergence Criteria: Frobenius norm shift ||C_{t} - C_{t-1}||_F < tol
    """

    def __init__(self, n_clusters: int = 4, max_iters: int = 300, tol: float = 1e-4, random_state: int = 42):
        self.n_clusters = n_clusters
        self.max_iters = max_iters
        self.tol = tol
        self.random_state = random_state

        # Scaler attributes
        self.mean_ = None
        self.std_ = None

        # Model state
        self.centroids_ = None           # Centroids in standardized space
        self.centroids_unscaled_ = None  # Centroids in original feature space
        self.labels_ = None
        self.inertia_ = None             # Within-Cluster Sum of Squares (WCSS)
        self.n_iter_ = 0

    def fit_scaler(self, X: np.ndarray) -> np.ndarray:
        """Computes mean and standard deviation for Z-Score standardization: (X - mean) / std."""
        self.mean_ = np.mean(X, axis=0)
        self.std_ = np.std(X, axis=0)
        # Prevent division by zero
        self.std_[self.std_ == 0.0] = 1.0
        return (X - self.mean_) / self.std_

    def transform_scaler(self, X: np.ndarray) -> np.ndarray:
        """Applies learned Z-Score standardization to input matrix."""
        return (X - self.mean_) / self.std_

    def inverse_transform_scaler(self, X_scaled: np.ndarray) -> np.ndarray:
        """Reverses standardization back to original physical domain."""
        return (X_scaled * self.std_) + self.mean_

    def _init_kmeans_plus_plus(self, X_norm: np.ndarray, rng: np.random.RandomState) -> np.ndarray:
        """
        K-Means++ Centroid Initialization:
        1. First centroid chosen uniformly at random from dataset.
        2. Subsequent centroids chosen with probability proportional to squared Euclidean distance D(x)^2.
        Guarantees O(log k) competitive ratio against optimal clustering solution.
        """
        n_samples, n_features = X_norm.shape
        centroids = np.empty((self.n_clusters, n_features), dtype=np.float64)

        # 1. Choose first center uniformly at random
        first_idx = rng.randint(0, n_samples)
        centroids[0] = X_norm[first_idx]

        # 2. Choose remaining k - 1 centroids
        for c_idx in range(1, self.n_clusters):
            # Compute distance of each point to nearest existing centroid
            current_centroids = centroids[:c_idx]
            # Broadcasting: (N, C, D) -> (N, C)
            diff = X_norm[:, np.newaxis, :] - current_centroids[np.newaxis, :, :]
            sq_dists = np.sum(diff ** 2, axis=2)
            min_sq_dists = np.min(sq_dists, axis=1)

            # Probabilities proportional to D(x)^2
            total_dist = np.sum(min_sq_dists)
            if total_dist == 0:
                probs = np.ones(n_samples) / n_samples
            else:
                probs = min_sq_dists / total_dist

            # Sample next centroid
            next_idx = rng.choice(n_samples, p=probs)
            centroids[c_idx] = X_norm[next_idx]

        return centroids

    def _compute_pairwise_distances(self, X: np.ndarray, centroids: np.ndarray) -> np.ndarray:
        """
        Vectorized pairwise Euclidean distance calculation via NumPy broadcasting.
        d(x_i, c_j) = sqrt( sum( (x_ik - c_jk)^2 ) )
        Input shapes: X (N, D), centroids (K, D) -> Output shape: (N, K)
        """
        diff = X[:, np.newaxis, :] - centroids[np.newaxis, :, :]  # (N, K, D)
        return np.sqrt(np.sum(diff ** 2, axis=2))                  # (N, K)

    def fit(self, X: np.ndarray):
        """
        Iterative Lloyd's algorithm update step:
        1. E-Step: Assign each observation to the closest centroid.
        2. M-Step: Recompute centroids as mathematical mean of all points assigned to that cluster.
        Terminates when centroid shift < tol or max_iters reached.
        """
        rng = np.random.RandomState(self.random_state)
        X_scaled = self.fit_scaler(X)
        n_samples = X_scaled.shape[0]

        # Initialize centroids via K-Means++
        centroids = self._init_kmeans_plus_plus(X_scaled, rng)

        for iteration in range(self.max_iters):
            # E-Step: Assignment
            distances = self._compute_pairwise_distances(X_scaled, centroids)
            labels = np.argmin(distances, axis=1)

            # M-Step: Centroid Recomputation
            new_centroids = np.empty_like(centroids)
            for k in range(self.n_clusters):
                cluster_points = X_scaled[labels == k]
                if len(cluster_points) > 0:
                    new_centroids[k] = np.mean(cluster_points, axis=0)
                else:
                    # Handle empty cluster: re-initialize with random point
                    new_centroids[k] = X_scaled[rng.randint(0, n_samples)]

            # Convergence Check: Frobenius norm of centroid shift
            centroid_shift = np.linalg.norm(new_centroids - centroids)
            centroids = new_centroids
            self.n_iter_ = iteration + 1

            if centroid_shift < self.tol:
                break

        self.centroids_ = centroids
        self.labels_ = labels
        self.centroids_unscaled_ = self.inverse_transform_scaler(centroids)

        # Compute final WCSS (Within-Cluster Sum of Squares)
        final_distances = self._compute_pairwise_distances(X_scaled, centroids)
        min_distances = np.min(final_distances, axis=1)
        self.inertia_ = float(np.sum(min_distances ** 2))

        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Assigns new observations to closest learned cluster centroids."""
        X_scaled = self.transform_scaler(X)
        distances = self._compute_pairwise_distances(X_scaled, self.centroids_)
        return np.argmin(distances, axis=1)

    def compute_wcss(self, X: np.ndarray, k_range=range(2, 7)) -> dict[int, float]:
        """
        Calculates Within-Cluster Sum of Squares (WCSS / Inertia) across k_range
        to generate the mathematical Elbow Curve for cluster validation.
        """
        print(f"\n[WCSS ELBOW] Computing Elbow Curve across K = {list(k_range)}...")
        elbow_results = {}
        for k in k_range:
            model = ScratchKMeans(n_clusters=k, max_iters=200, tol=self.tol, random_state=self.random_state)
            model.fit(X)
            elbow_results[int(k)] = round(model.inertia_, 2)
            print(f"   * K = {k} -> WCSS (Inertia): {model.inertia_:>10.2f}")
        return elbow_results

    def assign_personas(self, feature_names: list[str]) -> list[dict]:
        """
        Translates mathematical centroid coordinates back into real-world business segments:
        Features: [tenure_months, monthly_charges]
        Quadrant logic categorizes customers into actionable retention personas.
        """
        if self.centroids_unscaled_ is None:
            raise ValueError("Model must be fitted before assigning personas.")

        # Determine median split across centroids for quadrant classification
        all_tenure = self.centroids_unscaled_[:, 0]
        all_charges = self.centroids_unscaled_[:, 1]
        mid_tenure = np.median(all_tenure)
        mid_charges = np.median(all_charges)

        personas = []
        for cluster_id, (tenure, charges) in enumerate(self.centroids_unscaled_):
            cluster_mask = (self.labels_ == cluster_id)
            cluster_size = int(np.sum(cluster_mask))

            is_high_tenure = tenure >= mid_tenure
            is_high_spend = charges >= mid_charges

            if is_high_spend and is_high_tenure:
                name = "VIP Champions"
                archetype = "High Spend / High Tenure"
                risk_level = "Low Risk (Core Assets)"
                action = "Exclusive loyalty perks, dedicated support tier, long-term renewal incentives."
            elif is_high_spend and not is_high_tenure:
                name = "Flight Risk Early Adopters"
                archetype = "High Spend / Low Tenure"
                risk_level = "Critical Risk (Primary Churn Culprit)"
                action = "Proactive onboarding concierge, bill shock alerts, direct customer success check-ins."
            elif not is_high_spend and is_high_tenure:
                name = "Budget Loyalists"
                archetype = "Low Spend / High Tenure"
                risk_level = "Low Risk (Stable Base)"
                action = "Feature cross-selling (fiber optic, security addons), referral incentives."
            else:
                name = "Casual Starters"
                archetype = "Low Spend / Low Tenure"
                risk_level = "Medium Risk (Testing Services)"
                action = "Educational product nurture campaigns, discount trial extensions."

            personas.append({
                "cluster_id": cluster_id,
                "persona_name": name,
                "archetype": archetype,
                "risk_profile": risk_level,
                "recommended_action": action,
                "cluster_size": cluster_size,
                "cluster_pct": round((cluster_size / len(self.labels_)) * 100, 2),
                "centroid_tenure_months": round(float(tenure), 1),
                "centroid_monthly_charges": round(float(charges), 2),
            })

        # Sort personas by cluster size descending
        personas.sort(key=lambda x: x["cluster_id"])
        return personas

    def save(self, filepath: Path, extra_metadata: dict = None):
        """Serializes trained model state, scaler parameters, and metadata."""
        filepath.parent.mkdir(parents=True, exist_ok=True)
        model_payload = {
            "n_clusters": self.n_clusters,
            "max_iters": self.max_iters,
            "tol": self.tol,
            "random_state": self.random_state,
            "mean_": self.mean_,
            "std_": self.std_,
            "centroids_": self.centroids_,
            "centroids_unscaled_": self.centroids_unscaled_,
            "inertia_": self.inertia_,
            "n_iter_": self.n_iter_,
            "extra_metadata": extra_metadata or {},
        }
        with open(filepath, "wb") as f:
            pickle.dump(model_payload, f)
        print(f"[K-MEANS] Model state successfully persisted to: {filepath}")


if __name__ == "__main__":
    from feature_extractor import extract_warehouse_data, get_clustering_features

    print("=" * 78)
    print("  Enterprise Churn Forensics & Predictive Retention Warehouse")
    print("  Task 4: Pure NumPy K-Means Clustering Scratch Execution")
    print("=" * 78)

    df_wh = extract_warehouse_data()
    X_raw, feat_names = get_clustering_features(df_wh)

    # 1. Compute Elbow Curve
    kmeans = ScratchKMeans(n_clusters=4, random_state=42)
    elbow_curve = kmeans.compute_wcss(X_raw, k_range=range(2, 7))

    # 2. Fit optimal K = 4
    print("\n[FIT] Fitting ScratchKMeans with optimal K = 4 clusters...")
    kmeans.fit(X_raw)
    print(f"[CONVERGENCE] Reached convergence in {kmeans.n_iter_} iterations.")
    print(f"[CONVERGENCE] Final WCSS (Inertia): {kmeans.inertia_:,.2f}")

    # 3. Assign Personas
    personas = kmeans.assign_personas(feat_names)
    print("\n[PERSONAS] Extracted Customer Retention Personas:")
    print("-" * 78)
    for p in personas:
        print(f"Cluster {p['cluster_id']}: {p['persona_name']} ({p['archetype']})")
        print(f"  * Size   : {p['cluster_size']:,} accounts ({p['cluster_pct']}%)")
        print(f"  * Center : Tenure = {p['centroid_tenure_months']} mos | Monthly = ${p['centroid_monthly_charges']}")
        print(f"  * Action : {p['recommended_action']}\n")

    # 4. Save Artifacts
    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = SAVED_MODELS_DIR / "kmeans_model.pkl"
    kmeans.save(model_path, extra_metadata={"wcss_elbow": elbow_curve, "personas": personas})

    summary_path = SAVED_MODELS_DIR / "kmeans_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "optimal_k": 4,
            "convergence_iterations": kmeans.n_iter_,
            "final_wcss": kmeans.inertia_,
            "elbow_curve": elbow_curve,
            "personas": personas,
        }, f, indent=2)
    print(f"[K-MEANS] Saved JSON summary to: {summary_path}")
    print("=" * 78)
