# ClimateLens — Project Demonstration and Viva Guide

## 0. Demo login (before starting the presentation)

The website starts at a branded login screen.

- **Demo email:** `demo@climatelens.local`
- **Demo password:** `climate123`
- Or click **Continue as guest**.
- Use **Sign out** in the dashboard top bar to return to the login screen.

This login is for visual demonstration only. It is checked locally in browser JavaScript and is not real authentication. Do not enter personal passwords or present it as a secure user-management system.

## 1. Project at a glance

**Title:** Climate Pattern Clustering Using K-Means and Hierarchical Clustering  
**Team 15:** Praveen (2520030406), Venkat (2520030450)  
**Guide:** Dr. Shaik Asif  
**Course:** Machine Learning · A.Y. 2026–27

### One-sentence pitch

“We use unsupervised machine learning to group climate observations with similar environmental profiles, then compare centroid-based K-Means with bottom-up Ward hierarchical clustering using internal cluster-quality metrics.”

## 2. Recommended live demo sequence (5–7 minutes)

1. **Overview (30 seconds):** introduce the problem: climate tables contain many measurements, and groups of records can share climate behaviour even when there is no label column.
2. **Load the true CSV (20 seconds):** click *Load your CSV*. Explain that the preloaded synthetic sample only keeps the website demonstrable; real findings must come from the actual project CSV.
3. **Dataset & EDA (60 seconds):** show row/column counts, data preview, missing values, feature distributions and correlation heatmap. Explain why data quality and feature scales matter before distance-based clustering.
4. **Preprocessing (60 seconds):** run the 70/15/15 split. Explain that median imputation and standardization parameters are fitted on training data only, then reused on validation and test. This avoids leakage from held-out observations into preprocessing.
5. **K-Means (60–90 seconds):** click *Run K-Means*. The website tests K = 2–6, fits each candidate on training data, then uses the validation silhouette score to choose K. Show the score chart and test metrics.
6. **Hierarchical (60–90 seconds):** click *Run Hierarchical*. Explain singleton starts, Ward's merge criterion, dendrogram merge distances, and why this demo caps the hierarchy to 180 training records.
7. **Comparison (45 seconds):** compare test silhouette and Davies–Bouldin, cluster sizes and interpretability. Don't claim one is “best” based on one metric alone.
8. **Close (20 seconds):** explain the potential application: climate characterization, environmental monitoring, and decision support. State that clusters are exploratory patterns, not official weather warnings or causal explanations.

## 3. Explanation of the entire pipeline

### Dataset

The project material describes an Indian climate dataset from Kaggle with date and geographic identifiers plus environmental attributes. Typical attributes are maximum/minimum/average temperature, humidity, rainfall, wind speed, pressure, cloud cover, AQI and AQI category. For distance-based clustering, this workflow selects eight numerical climate features: maximum temperature, minimum temperature, average temperature, humidity, rainfall, wind speed, pressure and cloud cover. City/State/Date provide context but are not inserted directly as arbitrary numeric distances.

### EDA — Exploratory Data Analysis

EDA looks at the dataset's structure before modelling:

- Shape and column names tell us how much data is available and what each record contains.
- Missing-cell and duplicate checks expose data quality concerns.
- Histograms show distributions and skew.
- Range and outlier views help identify extreme values for review. Weather extremes may be real, so they should not automatically be removed.
- Correlation helps identify relationships and possible redundancy among features.

### Train / validation / test

- **Train (70%)** is used to estimate medians, means, standard deviations and fit the clustering candidates.
- **Validation (15%)** is used to select a model configuration such as K.
- **Test (15%)** is kept aside until model selection is complete, then used for the final internal-metric check.

Clustering has no target labels, so this is not a supervised split with class stratification. Use a fixed random seed to make the partition reproducible.

### Missing values and standardization

For each selected variable, missing values are replaced with the **training-set median**. Then z-score standardization applies

`z = (x − training_mean) / training_standard_deviation`

The scaler is fitted on the training set. Validation/test use the same training means and standard deviations. If the scaler were fitted on all rows first, held-out information would influence the transformation; that is a data leakage concern. Scaling matters because temperature, rainfall, pressure and humidity have different numerical ranges.

### K-Means

K-Means tries to partition numerical observations into K clusters by minimizing the within-cluster sum of squared distances to each centroid.

1. Initialize K centres (K-Means++ improves centre seeding).
2. Assign each observation to its closest centre.
3. Recalculate each centre as the mean of its assigned observations.
4. Repeat the assignment/update loop until assignments stop changing or an iteration limit is reached.
5. Compare candidate K values and inspect the resulting clusters.

The **elbow method** watches how inertia falls as K grows. **Silhouette score** balances within-cluster closeness against the nearest alternative cluster. **Davies–Bouldin** compares within-cluster scatter with between-centre separation.

### Hierarchical clustering (agglomerative, Ward linkage)

Agglomerative hierarchical clustering begins with one cluster per observation and merges groups step-by-step. Ward linkage selects merges intended to minimize the increase in within-cluster sum of squares. A **dendrogram** displays the merge structure; the vertical merge distance helps show how dissimilar the combined groups were.

Unlike K-Means, hierarchical clustering does not provide a native `predict()` for unseen rows. This browser demo clusters a bounded training sample and assigns held-out records to their nearest final cluster centroid only to create a comparable illustrative holdout view. Mention that distinction clearly. The Python notebook's hierarchical implementation and the website's bounded browser version may differ.

## 4. How to interpret the metrics

### Silhouette score

Range: −1 to +1.

- Near +1: the record is much closer to its own cluster than to neighbouring clusters.
- Around 0: clusters overlap or boundaries are ambiguous.
- Negative: the record may be closer to a different cluster.

Higher is generally preferable, but compare using the same dataset/features and interpret alongside cluster sizes and context.

### Davies–Bouldin index (DBI)

Lower is generally preferable. It measures the average similarity between each cluster and its most similar other cluster, using within-cluster scatter and separation between cluster centres.

### Why not accuracy?

Accuracy requires ground-truth labels to compare predictions with known answers. Our task is unsupervised and has no predefined climate class target, so accuracy is not the primary metric. Internal measures such as silhouette and DBI are used instead.

## 5. Suggested presentation wording

“First, we examine data quality, feature distributions and relationships through EDA. We select numerical climate variables for clustering, because distance calculations require numeric values on comparable scales. We use a reproducible 70/15/15 train-validation-test workflow. Missing values are imputed with training medians and features are standardized using training statistics only. K-Means candidates are compared using validation silhouette scores, while Ward hierarchical clustering reveals nested grouping structure through a dendrogram. Finally, we compare internal metrics and cluster composition. These methods reveal structure in the observations, but cluster meaning must be interpreted with climate context.”

## 6. Likely viva questions and answers

**Q1. Why is this unsupervised learning?**  
Because the dataset does not provide a predefined target label for each observation. The algorithm discovers groupings from the features themselves.

**Q2. Why use both K-Means and Hierarchical Clustering?**  
They build groups differently. K-Means optimizes centroid-based partitions and scales well; hierarchical clustering builds a nested tree that helps visualize how observations/groups combine.

**Q3. Why do we standardize?**  
Distance calculations are sensitive to scale. A variable with a large numerical range can dominate the distances if features are not standardized.

**Q4. Why fit the scaler only on training data?**  
To avoid leakage. Validation and test rows must not influence the preprocessing parameters used during model development.

**Q5. Why split unsupervised data into train, validation and test?**  
It is a disciplined evaluation design. Train fits the candidate model, validation helps select settings, and test provides a final check. Since labels do not exist, this is not class-stratified evaluation.

**Q6. What does the silhouette score mean?**  
It compares a point's average distance to points in its own cluster with its distance to the nearest other cluster. It ranges from −1 to +1; higher is generally better.

**Q7. What does a lower Davies–Bouldin score mean?**  
On average, clusters have less within-cluster scatter relative to their separation from nearby clusters. Lower is generally better.

**Q8. Why don't you report accuracy?**  
There are no ground-truth labels to compare cluster assignments against, so ordinary classification accuracy is not defined for this project.

**Q9. What is a limitation of K-Means?**  
K must be selected, results can depend on initialization, and centroid-based partitions can be sensitive to outliers and irregular cluster shapes.

**Q10. What is a limitation of hierarchical clustering?**  
It can be computationally expensive on large datasets, and early greedy merges cannot usually be undone. A full dendrogram may also be difficult to read with thousands of points.

**Q11. Why sample the hierarchy in the website?**  
A full in-browser dendrogram would be costly and visually crowded. This front end caps its hierarchy sample at 180 training records. For the final research result, cite the results from the project's actual Python implementation and state its sample settings.

**Q12. Does one cluster mean a whole state has one climate?**  
Not necessarily. The unit being clustered is the observation/record unless the data was aggregated by state first. Daily records for one city/state can fall into different clusters over time.

**Q13. Do clusters prove climate change?**  
No. Clustering reveals similarities in the included observations; it does not establish a causal effect or prove a temporal climate-change trend by itself.

**Q14. What would you improve next?**  
Validate cluster stability across random seeds, compare multiple linkage methods, explore aggregation by city/season, assess feature redundancy, and interpret cluster profiles with domain knowledge.

## 7. Important honesty rules for the stage

- The website's built-in observations are synthetic for interface demonstration. Do not present their metrics as findings from the real dataset.
- Upload the actual CSV before collecting final numbers.
- Quote the final K, silhouette score and DBI from the output generated on your real project data. The front end does not guarantee the same output as your Scikit-learn notebook because its algorithm implementation and hierarchy sampling can differ.
- Do not claim that clustering predicts future weather, causes climate change, or is a validated warning system.
- State that the current work is an exploratory grouping/characterization prototype.
