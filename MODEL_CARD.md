# MODEL_CARD

## Model name

GENARCH Community Relative Burden Model (v1.0 seed)

## Intended use

Educational interpretation of **relative modeled burden** at community level using public aggregate indicators.

## Not intended use

- Individual diagnosis or prognosis
- Personal risk scoring
- Treatment recommendation or screening triage
- Clinical decision support

## Model type

Gradient-boosting style hotspot model (seed placeholder in v1) with SHAP-style feature attribution summaries.

## Features

- PM2.5 annual mean
- Industrial proximity score
- Food access score
- Social vulnerability percentile

## Data sources

- EPA AQS
- EPA EJSCREEN
- USDA Food Access Atlas
- CDC WONDER
- ACS-derived socioeconomic context

## Performance (seed placeholder)

- R²: 0.68
- MAE: 0.09

## Known limitations

- Aggregated data can hide within-region heterogeneity
- Exposure proxies are not personal measurements
- Ancestry and geography representation remain uneven
- Model output is relative, not causal or clinical

## Update cadence

Annual refresh with annual report pipeline cycle.
