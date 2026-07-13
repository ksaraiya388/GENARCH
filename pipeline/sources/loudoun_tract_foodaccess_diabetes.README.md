# Source spec: Loudoun tract-level food access and diabetes prevalence (figure C4)

Figure C4 (`food-access-t2d`) is **not shipped**. It would plot one point per
census tract, with a USDA food-access measure on the x-axis and CDC PLACES
diagnosed-diabetes prevalence on the y-axis. The claim is an ecological
association across tracts, not a causal or individual-level relationship.

The community dataset (`data/community/loudoun-county-va.json`) contains only a
single county-level food-access summary (`low_access_pct: 4.5`). There is no
tract-level pairing of food access with diabetes prevalence. That paired table
must be curated before the figure can be built. No values may be synthesized.

## File to curate

`pipeline/sources/loudoun_tract_foodaccess_diabetes.csv`

| column | type | description |
|---|---|---|
| `tract_geoid` | string | 11-digit census tract GEOID within Loudoun County (state+county FIPS 51107) |
| `low_access_measure` | number | USDA food-access measure for the tract. Pick one and keep it consistent: share of tract population that is low-income and low-access (`lalowihalfshare` / `lapophalfshare`-family), or the LILATracts flag aggregated to a share. Document which. |
| `diabetes_prevalence_pct` | number | CDC PLACES model-based crude or age-adjusted prevalence of diagnosed diabetes among adults, tract level. State crude vs age-adjusted. |
| `year` | integer | Reference year of each measure (they need not match; record both if not) |
| `food_access_source` | string | e.g. "USDA Food Access Research Atlas 2019" |
| `diabetes_source` | string | e.g. "CDC PLACES 2023 (BRFSS-modeled), census tract" |

## Sources to draw from

- USDA Food Access Research Atlas (tract-level food-access measures and LILA flags):
  https://www.ers.usda.gov/data-products/food-access-research-atlas/
- CDC PLACES, census tract data (diagnosed diabetes among adults):
  https://www.cdc.gov/places/

## Join and scope

Join the two datasets on `tract_geoid`, restricted to Loudoun County tracts
(FIPS 51107). Report `n` (number of tracts) on the figure. If a trend line is
drawn, compute the fit from these rows and print r or R-squared and n. The
figure must carry the on-image text: "Ecological association across census
tracts. Not a causal or individual-level claim." Destination:
`/community/loudoun-county-va`.
