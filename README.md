# GENARCH

GENARCH is a static web atlas of gene-environment interaction evidence for Loudoun County, Virginia, built from a Python data pipeline and a Next.js export. It publishes population-level evidence at county resolution, with every scientific claim tied to a citation.

It is not a diagnostic tool, a risk calculator, or a personal genomics service. There are no accounts, no uploads, no genotype intake, and no individual-level output of any kind.

- Live site: <https://genarch.org>
- Data Center Alley page: <https://genarch.org/community/data-center-alley/>

## The DEQ reproduction

The current focus of the repo is a reproduction of Virginia DEQ's own air-monitoring analysis for the Loudoun data center corridor, computed from DEQ's raw exports rather than from any figure DEQ published.

Two checks, both asserted at build time.

The first is collocation. DEQ's August 7, 2026 report publishes four sensor-versus-regulatory-monitor regressions at the collocated Ashburn site. All four reproduce within 0.05 on the intercept and slope and 0.03 on R². APEX 5 NO2 took a round of correspondence to get there: the August 7 figure did not reproduce here, and DEQ traced it to axis limits in the plotting call that bounded the fit as well as the view, then reissued the regression and sent the underlying paired hourly data (DEQ staff, correspondence, 2026-08-19). That one fit retains the sensor's exact-zero readings, because DEQ retains them; the rest of the pipeline excludes them. All four are asserted in `DEQ_PUBLISHED` in `site/src/lib/deq-data.ts`, and drift outside tolerance fails the build.

The second is daily averages. Recomputing 24-hour PM2.5 means from the FOIA'd hourly file under DEQ's 18-of-24 completeness rule reproduces DEQ's published daily file on 118 of 119 comparable days, with a mean absolute difference of 0.0017 µg/m³. The one disagreement is Ashburn on 2026-03-10, where the recomputation gives 5.0 against a published 5.2.

Both numbers regenerate from source on a clean checkout, and both fail loudly if they stop holding. Neither is a claim about air quality. They establish only that the processing in this repo agrees with the agency's.

## What is here

### The Data Center Alley page

`site/src/app/community/data-center-alley/page.tsx` covers the six sensor locations that have exported records and one regulatory reference monitor, March to August 2026. It carries DEQ's limitation language verbatim at the top, the collocation comparison, hourly series with the July wildfire smoke window marked, a record-length percentile comparison, and an identifier crosswalk to DEQ's published site labels.

### The DEQ pipeline

`pipeline/reshape_deq.py` reshapes two raw formats into two tidy CSVs that are never merged: semicolon-delimited Kunak sensor exports and OLE2 `.xls` regulatory files released under FOIA. It normalizes Kunak's hour-ending, DST-adjusted timestamps to hour-beginning EST, keeps `ts_raw` unmodified alongside, and flags rather than deletes. Exact-zero readings stay in the file with `excluded=true` and a run length recorded.

### The weekly report archive

`docs/deq-reports/` holds the August 7 and August 14, 2026 editions of DEQ's analysis. DEQ reissues it weekly and the published page carries only the current edition, so the archive is what makes the edition-over-edition comparison on the site checkable. The six transcribed figures live in `DEQ_WEEKLY_EDITIONS` in `site/src/lib/deq-data.ts:598`.

The rest of the atlas covers curated diseases, exposures, genes, and pathways, a Cytoscape knowledge graph, mechanism briefs, and county-level community pages.

## Layout

```
data/            Emitted JSON consumed by the site (diseases, exposures, genes,
                 pathways, graph, community, briefs, figures, reports)
docs/            METHODS, ETHICS, MODEL_CARD, DATA_PROVENANCE, content constraints,
                 deq-reports/ (archived DEQ PDFs)
pipeline/        Python: ingest, normalize, annotate, score, emit, validate,
                 graph_builder, reshape_deq
pipeline/sources/  Raw and reshaped inputs, plus manifest.json (per-source provenance)
site/            Next.js 14 static export; src/lib/deq-data.ts holds the DEQ analysis
scripts/         Constraint linter, figure export
.github/workflows/  CI
```

Data flows one way. The pipeline writes `data/`, `site/scripts/copy-data.js` copies it to `site/_data/` at build time, `site/src/lib/data.ts` reads it synchronously, and pages resolve it at build. There is no runtime API.

## Reproducing from a clean checkout

```bash
git clone https://github.com/ksaraiya388/GENARCH.git
cd GENARCH
pip install -r pipeline/requirements.txt
python pipeline/reshape_deq.py
cd site && npm ci && npm run build
```

Step four rebuilds the six tidy CSVs in `pipeline/sources/` from the raw DEQ files in `deq-raw/` and `deq-regulatory/`, both committed. It prints its own reconciliation as it goes, including the 118 of 119 line, and overwrites the committed CSVs with byte-identical content if nothing has changed. Step five runs the collocation and daily-average assertions and fails if either stops holding, so a clean build is the reproduction passing.

Requires Python 3.11+ and Node 20+. On Windows, run pipeline commands with `PYTHONUTF8=1` set.

To run the same four checks CI runs:

```bash
python -m pipeline validate
ruff check pipeline/
cd site && npx tsc --noEmit
cd site && npm run build
```

## Data sources

Full per-source detail, including column lists and known gaps, is in `pipeline/sources/manifest.json` and `docs/DATA_PROVENANCE.md`.

| Source | Retrieved | License | Coverage |
|---|---|---|---|
| DEQ Data Center Air Monitoring Project, Kunak Cloud dashboard export | 2026-08-10, public CSV export | Redistributable with credit to Virginia DEQ | 2026-03-03 to 2026-08-10, six sites, 17,147 site-hours |
| Virginia FOIA 26-4646, regulatory monitor hourly | 2026-08-11, released in full | Public records, no redactions, no cost | 2026-03-03 to 2026-08-10, 11,592 rows, Ashburn PM2.5 and NO2, Aurora Hills CO |
| DEQ weekly analysis PDFs | 2026-08-07 and 2026-08-14 | Virginia DEQ publication | Two editions, archived under `docs/deq-reports/` |
| US Census TIGERweb county boundaries | 2026-07-22 via `pipeline/fetch_geo.py` | Public domain | Loudoun (51107) and Fairfax (51059) polygons |

## Limitations

**The sensor data has not passed quality assurance validation.** This is DEQ's own statement, quoted verbatim on the page: values are published as soon as they are detected. The sensor export carries no null code, flag, or qualifier column of any kind. The regulatory file does. The two records are not symmetric, and where they disagree the cause could be sensor accuracy, the missing QA on one side, or the timestamp convention difference.

**No NAAQS determination can be made from this data.** Two independent reasons. First, the sensors are not Federal Reference or Equivalent Method monitors, so under the CFR they cannot be used to determine attainment or non-attainment regardless of how long they run. DEQ says this directly and the page quotes it. Second, the record is roughly five months. The PM2.5 standards are defined on a three-year design value, and five months of data cannot produce one. Any percentile computed here describes this window and nothing beyond it.

Other limits:

- DEQ has deployed seven of 22 identified locations, and six of those have exportable records. Findings describe those six locations, not the corridor.
- Sensor records differ in length, which makes unmatched percentile comparisons between sites misleading. The page reports both each site's own record and a common window from 2026-06-18.
- Exact-zero readings occur in multi-hour runs at every site. They are flagged, not deleted, and treated as missing in analysis.
- Meteorological data appears on DEQ's dashboard but is not in the historical export, so there is no wind-direction analysis.
- VOCs are recorded but unused. Readings span three orders of magnitude at Broad Run HS, and 32 percent of readings at Farmwell Station MS are exactly zero with runs up to 39 hours. No conclusion here rests on the VOC column.
- No health data appears on the Data Center Alley page and no health inference is drawn from it.
- Elsewhere in the atlas, GWAS evidence is predominantly European-ancestry. The `population_equity` field on each disease records this, and cross-ancestry caveats appear wherever it applies.

## Attribution

Air monitoring data belongs to the Virginia Department of Environmental Quality. Per DEQ staff on 2026-08-10, the sensor export is fully redistributable with credit that the data belong to Virginia DEQ. A preferred attribution line is still pending from DEQ Communications and will be added here when it arrives.

Regulatory monitor data was released in full under the Virginia Freedom of Information Act, request 26-4646, on 2026-08-11, with no redactions and no cost.

DEQ has not reviewed, endorsed, or approved anything in this repository. Errors here are mine.

Project page: <https://www.deq.virginia.gov/news-info/shortcuts/topics-of-interest/data-center-air-monitoring-project>

## License

Content and data are CC BY 4.0. Source code is MIT. See [LICENSE](LICENSE).

## Contributing

Corrections are welcome, especially to numbers. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Citing

See [CITATION.cff](CITATION.cff).
