# GENARCH Community Hotspot Model v1.0

## Model Details

- **Model Name**: GENARCH Community Hotspot Model v1.0
- **Type**: Gradient Boosting (XGBoost)
- **Version**: 1.0
- **Model Card Version**: 1.0

---

## Intended Use

### Primary Use
Estimating **relative preventable disease burden** at the county or census-tract level for **educational purposes**. The model supports:

- Public awareness of geographic disparities in environmental exposure and health outcomes
- Community advocacy and informed engagement with local health data
- Research and education on gene–environment interactions at the population level

### Not Intended Use
- **Individual risk prediction**: The model outputs area-level scores only; it must not be used to infer individual disease risk or status.
- **Clinical decision support**: Not for diagnosis, screening recommendations, or treatment decisions.
- **Resource allocation without human review**: Hotspot scores must not be the sole basis for funding, regulation, or punitive action; human expertise and local context are required.

---

## Training Data

### Sources
- EPA EJSCREEN (environmental and demographic indices)
- CDC WONDER (mortality and morbidity rates)
- American Community Survey (ACS)
- County Health Rankings
- USDA Food Access Atlas

### Geographic Coverage
- United States (counties and census tracts)
- Coverage may vary by source and year; rural and tribal areas may have gaps.

### Temporal Coverage
- Training data cutoff documented in `CommunityModel.training_data_cutoff`
- Typically 1–2 year lag due to source publication delays.

### Known Gaps
- Small-area estimates may be unstable where event counts are low
- Tribal lands and territories may have limited or missing data
- Some environmental layers (e.g., certain industrial indices) have incomplete national coverage

---

## Features

| Feature | Description | Source |
|---------|-------------|--------|
| Air quality index | Composite air pollution exposure | EPA EJSCREEN, AQS |
| Industrial proximity score | Proximity to industrial sites | EJSCREEN |
| Food access score | Access to healthy food retail | USDA Food Access Atlas |
| SVI percentile | Social Vulnerability Index | CDC/ATSDR |
| PM2.5 concentration | Fine particulate matter | EPA AQS |

---

## Output

- **Hotspot score**: Continuous value normalized to 0–1, representing **relative** preventable disease burden.
- **Interpretation**: Higher scores indicate areas with relatively higher burden given the modeled features; scores are comparative, not absolute risk estimates.

---

## Performance

### Metrics
- **R²**: Coefficient of determination on held-out test data (value documented in model release notes).
- **MAE**: Mean absolute error by region type (urban, suburban, rural) where applicable.

### Regional Variation
Performance may vary by region type due to data density and feature availability. Results are reported in the annual GENARCH report.

---

## Known Limitations and Biases

- **Ancestry and demographics**: Training data reflect U.S. population structure; transferability to other countries or populations is not validated.
- **Temporal drift**: Model performance may degrade as demographics and exposures change; periodic retraining is recommended.
- **Ecological fallacy**: Area-level predictions do not imply individual-level outcomes.
- **Selection bias**: Areas with more complete data may be overrepresented in training; underrepresented areas may have larger prediction uncertainty.
- **Feature availability**: Missing or imputed features can affect local predictions.

---

## Update Cadence

The model is updated **annually** in conjunction with the GENARCH report. Updates include:
- Retraining with latest source data
- Re-evaluation of feature importance and SHAP summaries
- Documentation of performance and limitations

---

## SHAP Explanation Methodology

SHAP (SHapley Additive exPlanations) values are used to explain feature contributions to hotspot scores:

- **Method**: TreeSHAP for XGBoost models
- **Output**: Per-feature mean |SHAP| for global interpretation; optional per-region contributions for local explanation
- **Interpretation**: Higher |SHAP| indicates greater average impact on the model output; direction (positive/negative) indicates whether the feature increases or decreases the predicted hotspot score.

SHAP summaries are stored in `CommunityModel.shap_summaries` for each community region.
