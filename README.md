# Climate Pattern Clustering Using K-Means and Hierarchical Clustering

**Team 7 — Machine Learning Project (A.Y. 2026–27)**

**Members:** Praveen (2520030406), Venkat (2520030450)  
**Guide:** Dr. Shaik Asif  
**Department:** CSE

## Project Overview

This project applies **unsupervised machine learning** to identify groups of climate observations with similar environmental characteristics. The project compares **K-Means Clustering** and **Hierarchical Clustering** using standardized numerical climate features.

The project material describes the dataset as the **Indian Climate Dataset (2024–2025)** sourced from Kaggle, with **7,310+ observations and 13 attributes**. The reported attributes include date, city, state, maximum/minimum/average temperature, humidity, rainfall, wind speed, pressure, cloud cover, AQI and AQI category.

## Repository Structure

```text
Climate-Pattern-Clustering/
├── Abstract/
├── Dataset/
├── EDA/
├── Research_Paper/
├── Project_Presentation/
├── Clustering/
│   ├── KMeans/
│   └── Hierarchical/
├── Results/
└── .gitignore
```

## Workflow

```text
Raw Dataset
    ↓
EDA & Data Quality Checks
    ↓
Select Numerical Climate Features
    ↓
Missing-value Handling
    ↓
Standardization
    ↓
K-Means ─────────────┐
                     ├── Silhouette Score + Davies–Bouldin Index + Visual Analysis
Hierarchical ────────┘
    ↓
Comparison & Interpretation
```

## Clustering Features

The project clustering notebooks use:

- Maximum Temperature
- Minimum Temperature
- Average Temperature
- Humidity
- Rainfall
- Wind Speed
- Pressure
- Cloud Cover

City, State, Date and AQI Category are not inserted directly into the numerical distance calculation.

## Running the Project

1. Add the raw CSV dataset to `Dataset/` as:

   `Indian_Climate_Dataset_2024_2025.csv`

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the EDA notebook.
4. Run `Clustering/KMeans/kmeans_clustering.ipynb`.
5. Run `Clustering/Hierarchical/hierarchical_clustering.ipynb`.
6. Review generated files under `Results/`.

## Results Status

The repository contains **ready-to-run analysis notebooks and result templates**. Final numerical clustering results should only be added after running the notebooks on the actual raw CSV. No fabricated project metrics are included in this repository.

## Academic Scope

The project material identifies climate analysis, environmental monitoring, agriculture planning and disaster-management support as possible application areas for the discovered patterns.
