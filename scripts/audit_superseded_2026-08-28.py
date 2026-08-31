"""Phase 4: audit the repo for claims superseded by the 2026-08-28 DEQ report.

Audit only. This script never edits anything; it emits
outputs/repro/superseded_claims_audit_2026-08-28.csv with one row per finding.

Scope is claim-bearing text: the site, docs, content, data, and the top-level
markdown. It deliberately skips DEQ's own report text and the raw and reshaped
data CSVs, which are sources rather than claims and which the task forbids
editing.

Every finding carries a status. "open" means it still needs an edit.
"resolved" means this task fixed it. "accepted-as-correct" means the pattern
matched a correction or a correctly dated historical record, so the text is
right as written. "deferred-owner-decision" means the finding is real but the
fix is a judgment call outside a refresh task.
"""

from __future__ import annotations

import csv
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "outputs" / "repro" / "superseded_claims_audit_2026-08-28.csv"

# Sources and generated data are not claims. DEQ's own report text is a source
# the task forbids editing.
SKIP_DIRS = (
    "node_modules/",
    "site/out/",
    "site/.next/",
    "site/_data/",
    "site/public/data/",
    "pipeline/sources/deq/",
    "pipeline/sources/deq-raw/",
    "pipeline/sources/deq-regulatory/",
    "docs/deq-reports/",
    "outputs/repro/pre_refresh_2026-08-28/",
)
SKIP_SUFFIX = (".pdf", ".pyc", ".lock", ".png", ".jpg", ".svg", ".ico", ".woff", ".woff2")
SKIP_FILES = (
    "package-lock.json",
    "docs/CITATION_GAPS.csv",
    "pipeline/sources/deq_data_center_air_monitoring_hourly.csv",
    "pipeline/sources/deq_regulatory_monitor_hourly.csv",
    "pipeline/sources/deq_pm25_daily.csv",
    "pipeline/sources/deq_missing_hours.csv",
    "pipeline/sources/deq_occupancy_violations.csv",
    "pipeline/sources/deq_unit_conflicts.csv",
)

CHECKS: list[tuple[str, str, str]] = [
    (
        "four-regression-claim",
        "Rewrite to distinguish the two closed APEX 14 regressions from the two "
        "open APEX 5 regressions. Delete any 'three exact, one near' phrasing.",
        r"three exact|one near",
    ),
    (
        "table4-only-site",
        "Rewrite per Phase 5.2: attribute the claim to the 2026-08-07 edition, "
        "give the four-report series 40.4/38.2/36.0/33.8, and state that as of "
        "the 2026-08-28 report no site exceeds 35.0.",
        r"is the only one whose|only sensor|sole site|only one whose 98th",
    ),
    (
        "superseded-edition-count",
        "The Aug 28 report is the fourth edition. Update the count and the "
        "archive location, and stop asserting the Table 4 sentence is unchanged.",
        r"all three archived editions|all three editions|three archived|"
        r"Two later editions|three consecutive editions",
    ),
    (
        "superseded-figure",
        "Figure belongs to a superseded edition. Restate with its report date "
        "and data cutoff, or replace with the 2026-08-28 value.",
        r"\b45\.40\b|\b40\.19\b|\b40\.12\b|\b38\.21\b|\b37\.10\b|\b29\.50\b",
    ),
    (
        "stored-no2-coefficient",
        "Stored APEX 5 NO2 coefficients. Verify against the 2026-08-28 "
        "published 1.7/0.31/0.21 before restating.",
        r"1\.84\b.*0\.316|\b0\.205\b|1\.065\b|\b0\.491\b",
    ),
    (
        "record-length-framing",
        "Must read as a methodological point about percentile comparison across "
        "unequal records, not as a correction of a standing DEQ error.",
        r"corrects? (?:a |the )?DEQ|DEQ (?:is |was )?wrong",
    ),
    (
        "precision-claim",
        "DEQ publishes to two significant figures. Restate any tighter "
        "reproduction claim as rounding to DEQ's published precision.",
        r"three decimals|to three decimal",
    ),
    (
        "window-mismatch-explanation",
        "A.8 refutes the window-mismatch explanation for the APEX 5 near-miss. "
        "Remove any text offering it.",
        r"window mismatch|earlier cutoff explains|cutoff mismatch",
    ),
]

# A superseded cutoff is only a finding where the line also makes a claim.
STALE_CUTOFF_DATE = re.compile(r"2026-08-07|2026-08-10")
STALE_CUTOFF_CLAIM = re.compile(
    r"reproduc|coverage|percentile|collocat|current|as of|latest|"
    r"through|record end|cutoff|six sites|site-hours",
    re.IGNORECASE,
)
STALE_CUTOFF_EXEMPT = re.compile(
    r"superseded|FOIA|26-4646|regulatory|_2026-08-10|voided|"
    r"download_date|retrieval_method|report_date",
    re.IGNORECASE,
)
# Provenance records carry historical dates by design.
PROVENANCE_RECORDS = (
    "pipeline/sources/manifest.json",
    "pipeline/sources/deq_sensor_site_history.csv",
)

# Automated matches whose text is the correction rather than the violation, or
# a historical record that is correct as written.
ACCEPTED = [
    ("precision-claim", "not verifiable against the source"),
    ("precision-claim", "not something this data can establish"),
    ("precision-claim", "two significant figures"),
    ("stored-no2-coefficient", "reproduces only under a"),
    ("stored-no2-coefficient", "Closed window 2026-03-03"),
    ("stored-no2-coefficient", "Capped at 2026-08-10"),
    ("stale-cutoff", "Reproduction status at a 2026-08-10 cutoff"),
    ("stale-cutoff", "2026-08-07 to 2026-08-28"),
    ("stale-cutoff", "cutoff sweep from 2026-08-05"),
    ("stale-cutoff", "weekly PDFs"),
    ("stale-cutoff", "at DEQ's published precision"),
    ("stale-cutoff", "APEX 5 NO2 collocation regression corrected"),
    ("stale-cutoff", "every percentile compared against its Table 4 stops there"),
    ("stale-cutoff", "DEQ_EDITION_CUTOFF"),
]

ACCEPTED_NOTE = (
    "Statement is the correction itself or a correctly dated historical "
    "record. No edit required."
)

MANUAL: list[dict] = [
    {
        "file": "site/src/lib/deq-data.ts",
        "line": 567,
        "matched_text": (
            "apex-05-no2 assertion target 1.8/0.32/0.21 from 2026-08-19 "
            "correspondence, fitted over the 2026-08-07 window"
        ),
        "claim_category": "cross-window-comparator",
        "required_action": (
            "The assertion target is a correspondence value dated 2026-08-19 "
            "while the GENARCH fit stops at the 2026-08-07 edition cutoff, "
            "which is the same cross-window comparison the surrounding comment "
            "warns against."
        ),
        "status": "deferred-owner-decision",
        "disposition": (
            "Reported, not changed. Moving it would alter a build-time gate. "
            "Needs an owner decision on whether the column carries DEQ's "
            "2026-08-07 published figure or DEQ's 2026-08-19 corrected figure."
        ),
        "public_facing": "no",
    },
    {
        "file": "site/src/lib/deq-data.ts",
        "line": 286,
        "matched_text": "export const siteLabel = (siteId, area) => siteId (area)",
        "claim_category": "internal-slug-public",
        "required_action": (
            "Amendment A.5 asks for DEQ's published site names in public "
            "artifacts. Not applicable to this file."
        ),
        "status": "accepted-as-correct",
        "disposition": (
            "A.5 cannot be applied to site/src. DEQ's published names are "
            "school names (Broad Run HS, Sterling MS, Farmwell Station MS, "
            "Steuart Weller ES) and docs/CONTENT_CONSTRAINTS.md section 4 "
            "forbids a school name within 200 characters of a reading value, "
            "enforced by SCHOOL_RE in scripts/check-constraints.mjs. The slug "
            "labelling is the deliberate compliance measure, and getCrosswalk() "
            "carries DEQ's labels with no measurements so the reproduction "
            "stays checkable. A.5 is satisfied in the outputs/repro artifacts, "
            "which sit outside the lint scope and do use DEQ's published names."
        ),
        "public_facing": "yes",
    },
    {
        "file": "site/src/lib/deq-data.ts",
        "line": 838,
        "matched_text": "DEQ_WEEKLY_EDITIONS: three editions, values 40.4, 38.2, 36.0",
        "claim_category": "superseded-edition-count",
        "required_action": "Add the 2026-08-28 edition as a fourth column.",
        "status": "resolved",
        "disposition": (
            "Widened to four editions: daily p98 33.8, hourly p98 53.6, mean "
            "hourly 10.5, with the tuple types widened to length four."
        ),
        "public_facing": "no",
    },
    {
        "file": "site/src/lib/deq-data.ts",
        "line": 829,
        "matched_text": (
            "VERIFY BEFORE PUSH: nine values transcribed from the three PDFs "
            "archived under docs/deq-reports/."
        ),
        "claim_category": "verification-gate",
        "required_action": "Diff the transcribed values against the archived PDFs.",
        "status": "resolved",
        "disposition": (
            "Verified 2026-08-29 with pdfplumber against all four PDFs. All "
            "twelve values reproduce exactly. Note rewritten to record the "
            "verification and to cover the fourth edition."
        ),
        "public_facing": "no",
    },
    {
        "file": "site/src/app/community/data-center-alley/page.tsx",
        "line": 691,
        "matched_text": (
            "The sentence naming this sensor as the only one whose 98th "
            "percentile is word for word the same in all three editions."
        ),
        "claim_category": "table4-only-site",
        "required_action": "Rewrite per Phase 5.2.",
        "status": "resolved",
        "disposition": (
            "Rewritten. The page now says the sentence stood through the first "
            "three editions and that the August 28 edition drops it, gives the "
            "four-value series, and states plainly that this is a "
            "methodological point rather than a correction of a DEQ error."
        ),
        "public_facing": "yes",
    },
]

PUBLIC_PREFIXES = ("site/src/app/", "site/src/components/")

COLUMNS = [
    "file",
    "line",
    "matched_text",
    "claim_category",
    "required_action",
    "status",
    "disposition",
    "public_facing",
]


def disposition_for(category: str, text: str) -> tuple[str, str]:
    for cat, needle in ACCEPTED:
        if category == cat and needle in text:
            return "accepted-as-correct", ACCEPTED_NOTE
    return "open", ""


def tracked_files() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files"], cwd=REPO, capture_output=True, text=True, check=True
    ).stdout.splitlines()
    extra = [
        "docs/COLLOCATION_METHOD.md",
        "outputs/repro/collocation_state_2026-08-28.csv",
    ]
    return sorted(set(out) | {e for e in extra if (REPO / e).exists()})


def in_scope(rel: str) -> bool:
    if any(rel.startswith(d) for d in SKIP_DIRS):
        return False
    if rel in SKIP_FILES:
        return False
    return not rel.endswith(SKIP_SUFFIX)


def main() -> int:
    rows: list[dict] = []
    for rel in tracked_files():
        if not in_scope(rel):
            continue
        path = REPO / rel
        try:
            text = path.read_text(encoding="utf-8-sig")
        except (UnicodeDecodeError, OSError):
            continue
        public = rel.startswith(PUBLIC_PREFIXES)
        for lineno, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()
            if not stripped:
                continue
            for category, action, pattern in CHECKS:
                if re.search(pattern, line, re.IGNORECASE):
                    status, note = disposition_for(category, stripped)
                    rows.append(
                        {
                            "file": rel,
                            "line": lineno,
                            "matched_text": stripped[:220],
                            "claim_category": category,
                            "required_action": action,
                            "status": status,
                            "disposition": note,
                            "public_facing": "yes" if public else "no",
                        }
                    )

            if (
                rel not in PROVENANCE_RECORDS
                and STALE_CUTOFF_DATE.search(line)
                and STALE_CUTOFF_CLAIM.search(line)
                and not STALE_CUTOFF_EXEMPT.search(line)
            ):
                status, note = disposition_for("stale-cutoff", stripped)
                rows.append(
                    {
                        "file": rel,
                        "line": lineno,
                        "matched_text": stripped[:220],
                        "claim_category": "stale-cutoff",
                        "required_action": (
                            "Claim or coverage statement pinned to a superseded "
                            "cutoff. Add or update the report date and data "
                            "cutoff so the figure is checkable."
                        ),
                        "status": status,
                        "disposition": note,
                        "public_facing": "yes" if public else "no",
                    }
                )

    rows.extend(MANUAL)
    rows.sort(key=lambda r: (r["status"], r["claim_category"], r["file"], int(r["line"])))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"wrote {OUT.relative_to(REPO)} ({len(rows)} findings)")
    by_status: dict[str, int] = {}
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
    print("  by status:")
    for status, n in sorted(by_status.items(), key=lambda kv: -kv[1]):
        print(f"    {status:24s} {n}")

    open_rows = [r for r in rows if r["status"] == "open"]
    if open_rows:
        print(f"  OPEN findings ({len(open_rows)}):")
        for r in open_rows:
            print(f"    {r['claim_category']:26s} {r['file']}:{r['line']}")
    else:
        print("  no open findings")
    return 0


if __name__ == "__main__":
    sys.exit(main())
