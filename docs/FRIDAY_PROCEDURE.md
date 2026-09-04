# GENARCH Friday procedure

Mechanical ingestion only. No analysis, no artifact edits, no outreach.
Anything surprising gets written down and left for the next working session.

## 1. Download

DEQ weekly PDF. Note the date printed on the cover; it is not always the Friday
you downloaded it.

Kunak dashboard, Historical data tab. All six operating sites, 2026-03-03 through
the latest available date, hourly, CSV, semicolon-delimited. If the three retired
sites (Steuart Weller ES, Heritage Farm Museum, Newberry Condo Assoc.) can be
selected for their past ranges, export them too. Steuart Weller ES and Sterling MS
are the same physical unit, apex-06, moved on 2026-06-18, and that pairing is the
cleanest available test of site versus season.

## 2. Ingest the report

    python .\scripts\ingest_deq_report.py "$env:USERPROFILE\Downloads\<file>.pdf" <report-date> "<url>"

The content gate rejects anything that is not a DEQ weekly report. If it rejects,
read the reason before reaching for --force.

## 3. Diff against the prior report

    $prev = "pipeline\sources\deq\deq_dcamp_weekly_<prior>.txt"
    $curr = "pipeline\sources\deq\deq_dcamp_weekly_<new>.txt"
    Compare-Object (Get-Content $prev -Encoding UTF8) (Get-Content $curr -Encoding UTF8) |
      Where-Object { $_.InputObject -match '\d' } |
      Tee-Object -FilePath "outputs\repro\deq_report_diff_<new>.txt"

Read for silent revisions to prior weeks. DEQ has corrected a regression and a
daily value without announcement before.

## 4. Supersede and stage the sensor exports

    Get-ChildItem .\pipeline\sources\deq-raw -Filter "*_multi_*.csv" |
      Move-Item -Destination .\pipeline\sources\deq-raw\_superseded\
    python .\scripts\stage_kunak_incoming.py "$env:USERPROFILE\Downloads"
    # verify the dry run, then add --go

Edit END in stage_kunak_incoming.py to the new last data date first.
reshape_deq globs deq-raw/ non-recursively, so exactly six files must remain
there. Verify before running anything.

## 5. Run and record

    python -m pipeline.reshape_deq
    python -m pipeline.validate
    python -m ruff check pipeline\

Record row counts per site, the daily reconciliation result, and anything that
changed. Do not investigate. Do not edit artifacts. Do not restate any figure.

## 6. Commit

    git add -A
    git commit -m "deq: weekly ingest <date>"

## Do not, until the September checkpoint

Recompute published claims, edit site content, send correspondence, or change
the pipeline.
