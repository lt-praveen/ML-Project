# ClimateLens — Climate Pattern Clustering Demo Website

A self-contained, browser-side front end for demonstrating **Climate Pattern Clustering Using K-Means and Hierarchical Clustering**.

**Team 15:** Praveen (2520030406) and Venkat (2520030450)  
**Guide:** Dr. Shaik Asif  
**Course:** Machine Learning · A.Y. 2026–27

## Launch it

1. Extract the ZIP file.
2. Open `index.html` in Chrome, Edge, Firefox, or Safari.
3. A demo login screen appears first. Use `demo@climatelens.local` / `climate123`, or choose **Continue as guest**.
4. It opens in synthetic-demo mode. The banner and status labels identify the demo data as synthetic.
5. To analyze the project's actual data, choose **Load your CSV** and select the real Indian Climate Dataset CSV.
6. Visit **Dataset & EDA**, then **Preprocessing**, then run **K-Means** and **Hierarchical**, and finally show **Model comparison**.

No installation, Python server, API key, or backend is required. Uploaded CSV data is read and processed locally in your browser; it is not sent to a server. Internet is only useful if the browser fetches the optional Google Fonts; system font fallbacks are defined.

## Implemented features

- CSV upload and lightweight parsing for normal comma-separated files with quoted values.
- Dataset overview, preview, missing-cell counts, exact duplicate-row count, numerical distributions and Pearson correlation heatmap.
- Reproducible 70% training / 15% validation / 15% test split (`random_state = 42`).
- Median imputation and z-score standardization. Medians, means, and standard deviations are fit only on the training split and reused for validation and test.
- Browser implementation of K-Means++ initialization and iterative centroid updates. Candidate K values 2–6 are selected by validation silhouette score.
- Browser implementation of Ward agglomerative clustering on a bounded sample (up to 180 training observations) to keep the interactive dendrogram manageable. Candidate cluster counts 2–6 are compared using validation silhouette after a clearly labelled nearest-centroid extension.
- Test-set silhouette and Davies–Bouldin scores, cluster-size views, a temperature-versus-humidity scatter plot, dendrogram merge-distance view, comparison table and CSV export of test assignments.

## Important methodology notes

- The initial dataset loaded by the page is **synthetic demo data** created for interface testing. It is not the real Kaggle project dataset and its numbers must not be cited as project findings.
- Upload the actual project CSV before collecting real values for your report or presentation.
- Clustering has no target labels; classification accuracy is not a suitable primary metric here. Silhouette and Davies–Bouldin are internal cluster-quality measures.
- The website uses a 70/15/15 split as a demonstration workflow. For K-Means, it fits on train and selects K on validation. Agglomerative hierarchical clustering does not natively predict labels for unseen data, so this website explicitly uses nearest final-cluster centroid only as an approximate holdout comparison.
- The hierarchical tree is trained on a sample of up to 180 training records due to browser performance and dendrogram readability. This is displayed in the UI and should be mentioned during the demonstration.
- The web implementation is intended as a front-end demonstration companion to the Python/Scikit-learn project workflow; it is not a replacement for your full notebook implementation.

## Files

- `index.html` — site layout and page structure.
- `assets/styles.css` — responsive visual theme.
- `assets/app.js` — CSV processing, EDA calculations, preprocessing, clustering algorithms and charts.
- `DEMO_GUIDE.md` — suggested demonstration order, concepts, sample narration, and viva preparation.
- `sample_demo_climate_data.csv` — generated synthetic sample data, also labelled as synthetic.

## Suggested stage flow

Overview → upload the real CSV → Dataset & EDA → Preprocessing → run K-Means → run Hierarchical → Model comparison → explain the metric trade-offs and limitations.


## Demo login

- Email: `demo@climatelens.local`
- Password: `climate123`
- Alternative: **Continue as guest**
- **Sign out** returns to the login screen.

This is intentionally a front-end-only presentation gate. It checks the demo credentials in client-side JavaScript and does not provide real account security, authorization, a server session, or password storage. Do not enter personal or sensitive passwords.
