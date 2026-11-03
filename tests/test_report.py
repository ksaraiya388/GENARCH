"""Tests for `python -m pipeline.report --freeze`.

Two kinds of check live here. The R1-R4 tests assert that the generator still
reproduces the findings `docs/report-2026/CONTEXT.md` section 4 states, on their
original windows. The rest assert the output contract: determinism, no internal
identifier in any published file, and no reading value beside a DEQ site name.

A reproduction failure is reported, never papered over. Nothing in the generator
is tuned to make one of these pass.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

import pytest

from pipeline.report import PM25_24H_LEVEL, compute, run_report
from pipeline.report_lib import (
    ancestry,
    ancestry_report,
    atlas,
    collocation,
    correlation,
    daily,
    figures,
    palette,
    site_codes,
)
from pipeline.report_lib import freeze as freeze_lib
from pipeline.report_lib.freeze import Freeze, FreezeError, sha256_of
from pipeline.report_lib.numbers import NumberRegistry
from pipeline.report_lib.rounding import decimals_of, half_up, matches_at_published_precision
from pipeline.report_lib.verify import (
    CONTEXT_R2,
    CONTEXT_R3_CLOCK,
    CONTEXT_R3_STANDARD,
    CONTEXT_R4,
    build_rows,
    render,
)

MOJIBAKE_PATTERNS = ("\u00c3", "\u00c2", "\u00e2\u20ac")
TEXT_SUFFIXES = {".json", ".csv", ".svg", ".txt", ".md"}
PNG_METADATA_CHUNKS = (b"tEXt", b"zTXt", b"iTXt", b"tIME")

# Columns that would put a reading value beside a DEQ site name (CONTEXT C8).
READING_TERMS = (
    "µg/m³",
    "ug/m3",
    "percentile",
    "p98",
    "mean",
    "median",
    "maximum",
    "concentration",
    "pm2.5",
    "reading",
    "exceed",
)


def _read_csv(path: Path) -> tuple[list[str], list[list[str]]]:
    with open(path, encoding="utf-8", newline="") as handle:
        rows = list(csv.reader(handle))
    return rows[0], rows[1:]


# --------------------------------------------------------------- determinism


def test_outputs_are_byte_identical_between_runs(freeze_path, report_dir, tmp_path):
    second = tmp_path / "report-run-2"
    assert run_report(year=2026, freeze=freeze_path, out_dir=second) == 0

    first_files = sorted(p.name for p in report_dir.iterdir() if p.is_file())
    second_files = sorted(p.name for p in second.iterdir() if p.is_file())
    assert first_files == second_files, "the two runs produced different file sets"

    differing = [
        name
        for name in first_files
        if (report_dir / name).read_bytes() != (second / name).read_bytes()
    ]
    assert not differing, f"not byte-identical between runs: {differing}"


def test_png_carries_no_text_or_time_metadata(report_dir):
    offenders = {}
    for png in sorted(report_dir.glob("*.png")):
        data = png.read_bytes()
        present = [c.decode() for c in PNG_METADATA_CHUNKS if c in data]
        if present:
            offenders[png.name] = present
    assert not offenders, f"PNG metadata survived stripping: {offenders}"


def test_text_outputs_are_utf8_without_bom(report_dir):
    for path in sorted(report_dir.iterdir()):
        if path.suffix not in TEXT_SUFFIXES:
            continue
        raw = path.read_bytes()
        assert not raw.startswith(b"\xef\xbb\xbf"), f"{path.name} starts with a BOM"
        raw.decode("utf-8")
        assert b"\r\n" not in raw, f"{path.name} uses CRLF line endings"


# ------------------------------------------------------------------------ R1


def test_r1_three_match_deq_at_published_precision_and_one_is_near(numbers, results):
    statuses = {f["key"]: f["status"] for f in results["collocation"]}
    matched = [k for k, v in statuses.items() if v == collocation.STATUS_MATCH]
    near = [k for k, v in statuses.items() if v == collocation.STATUS_NEAR]

    assert len(matched) == 3, f"expected three to match DEQ, got {matched}"
    assert near == ["apex-14_NO2"], f"expected APEX 14 NO2 to be near, got {near}"
    assert numbers["colloc.match_count"]["value"] == 3
    assert numbers["colloc.near_count"]["value"] == 1


def test_no_status_claims_an_exact_match(report_dir, results):
    """"Exact" is never claimed: DEQ publishes two significant figures.

    "exact zeros" stays available as a method description, so the check is scoped
    to status values rather than to the whole file.
    """
    for fit in results["collocation"]:
        assert "exact" not in fit["status"].lower()
    numbers = json.loads((report_dir / "numbers.json").read_text(encoding="utf-8"))
    statuses = [k for k in numbers if k.endswith(".status")]
    assert len(statuses) == 4
    for key in statuses:
        assert "exact" not in str(numbers[key]["value"]).lower()


def test_r1_reproduces_the_recorded_values_at_three_decimals(results):
    """Internal reproducibility check against GENARCH_RULES.md section 9.

    Never presented as agreement with DEQ: section 9 bars a three-decimal claim
    against a source published to two significant figures.
    """
    failures = []
    for fit in results["collocation"]:
        recorded = collocation.RULES_SECTION_9[fit["key"]]
        for field in ("intercept", "slope", "r2"):
            actual = half_up(fit[f"gx_{field}"], 3)
            if actual != recorded[field]:
                failures.append(f"{fit['key']} {field}: {actual} against {recorded[field]}")
        if fit["n_pairs"] != recorded["n"]:
            failures.append(f"{fit['key']} n: {fit['n_pairs']} against {recorded['n']}")
    assert not failures, "section 9 values did not reproduce: " + "; ".join(failures)


def test_r1_retains_exact_zeros_in_one_fit_only(results):
    retaining = [f["key"] for f in results["collocation"] if f["retains_exact_zeros"]]
    assert retaining == ["apex-05_NO2"]


# ------------------------------------------------------------------------ R2


def test_r2_118_of_119_on_the_original_window(numbers, results):
    rec = results["reconciliation"]
    assert rec["n_days"] == CONTEXT_R2["n_days"]
    assert rec["n_match"] == CONTEXT_R2["n_match"]
    assert half_up(rec["mean_abs_diff"], 4) == CONTEXT_R2["mean_abs_diff"]
    assert rec["window_start"] == CONTEXT_R2["window_start"]
    assert rec["window_end"] == CONTEXT_R2["window_end"]
    assert rec["mismatch_dates"] == ["2026-03-10"]
    assert half_up(rec["max_abs_diff"], 4) == 0.2

    assert numbers["daily.n_days"]["value"] == 119
    assert numbers["daily.n_match"]["value"] == 118
    assert numbers["daily.mean_abs_diff"]["value"] == 0.0017


def test_r2_row_count_matches_the_comparable_day_count(report_dir, results):
    _, rows = _read_csv(report_dir / "T04_daily_reconciliation.csv")
    assert len(rows) == results["reconciliation"]["n_days"]


# ------------------------------------------------------------------------ R3


@pytest.mark.parametrize(
    ("key", "expected"),
    [("p98_common_standard", CONTEXT_R3_STANDARD), ("p98_common_clock", CONTEXT_R3_CLOCK)],
)
def test_r3_common_window_values_match_context_to_two_decimals(results, key, expected):
    failures = []
    for site_id, (value, days) in expected.items():
        got = results[key][site_id]
        if half_up(got["p98"], 2) != half_up(value, 2):
            failures.append(
                f"{site_codes.code_for(site_id)} p98 {half_up(got['p98'], 2)} "
                f"against {half_up(value, 2)}"
            )
        if got["days"] != days:
            failures.append(
                f"{site_codes.code_for(site_id)} days {got['days']} against {days}"
            )
    assert not failures, "; ".join(failures)


@pytest.mark.parametrize("key", ["p98_common_standard", "p98_common_clock"])
def test_r3_five_of_six_above_35_and_the_table4_sensor_ranks_fourth(results, key):
    above = sum(1 for v in results[key].values() if v["p98"] > PM25_24H_LEVEL)
    assert above == 5
    ranked = [s for s, _ in sorted(results[key].items(), key=lambda kv: -kv[1]["p98"])]
    assert ranked.index("sterling-ms") + 1 == 4


def test_r3_numbers_carry_both_day_definitions_and_both_cutoffs(numbers):
    code = site_codes.code_for("sterling-ms")
    for key in (
        f"p98.common.{code}",
        f"p98.common.{code}.deq_cutoff",
        f"p98.common_clock.{code}",
        f"p98.common_clock.{code}.deq_cutoff",
        f"p98.common.rank.{code}",
    ):
        assert key in numbers, f"missing {key}"
    assert numbers[f"p98.common.rank.{code}"]["value"] == 4
    assert numbers["deq.edition_cutoff"]["value"] == "2026-08-07T07:00 EST"


# ------------------------------------------------------------------------ R4


def test_r4_correlation_range_matches_context(numbers, results):
    corr = results["correlation"]
    assert half_up(corr["r_min"], 3) == CONTEXT_R4["r_min"]
    assert half_up(corr["r_max"], 3) == CONTEXT_R4["r_max"]
    assert len(corr["pairs"]) == 15
    assert numbers["corr.min"]["value"] == CONTEXT_R4["r_min"]
    assert numbers["corr.max"]["value"] == CONTEXT_R4["r_max"]


def test_r4_smoke_window_is_excluded_and_recorded(numbers):
    assert numbers["smoke.window_start"]["value"] == "2026-07-16"
    assert numbers["smoke.window_end"]["value"] == "2026-07-19"
    assert numbers["smoke.rule"]["value"] == correlation.SMOKE_RULE


# -------------------------------------------------- the CONTEXT comparison


def test_every_r1_to_r4_value_reproduces(results, capsys):
    rows = build_rows(results, site_codes.code_for)
    with capsys.disabled():
        print()
        print(render(rows))
    failures = [f"{r.claim}: {r.recomputed} against {r.context}" for r in rows if not r.match]
    assert not failures, "did not reproduce: " + "; ".join(failures)


# ------------------------------------------------------------- C7 and C8


def test_no_output_contains_an_internal_slug(report_dir):
    offenders = {}
    for path in sorted(report_dir.iterdir()):
        if path.suffix not in TEXT_SUFFIXES or path.name == "FREEZE.json":
            continue
        found = site_codes.find_slugs(path.read_text(encoding="utf-8"))
        if found:
            offenders[path.name] = found
    assert not offenders, f"internal slugs reached published output: {offenders}"


def test_no_output_filename_contains_an_internal_slug(report_dir):
    offenders = {
        path.name: site_codes.find_slugs(path.name)
        for path in report_dir.iterdir()
        if site_codes.find_slugs(path.name)
    }
    assert not offenders, f"slugs in filenames: {offenders}"


def test_no_output_contains_mojibake(report_dir):
    offenders = {}
    for path in sorted(report_dir.iterdir()):
        if path.suffix not in TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8")
        found = [repr(p) for p in MOJIBAKE_PATTERNS if p in text]
        if text.startswith("﻿"):
            found.append("leading U+FEFF")
        if found:
            offenders[path.name] = found
    assert not offenders, f"mojibake in published output: {offenders}"


def test_site_key_has_no_reading_value_column(report_dir):
    header, rows = _read_csv(report_dir / "T02_site_key.csv")
    lowered = [h.lower() for h in header]
    offenders = [h for h in lowered for term in READING_TERMS if term in h]
    assert not offenders, f"T02 carries reading-value columns: {offenders}"
    assert lowered == [
        "site code",
        "deq published name",
        "apex unit",
        "county",
        "active start",
        "active end",
        "record days",
    ]
    assert len(rows) == 13, "one row per site-unit period"


def test_only_the_site_key_carries_deq_published_names(report_dir):
    names = [s.deq_published_name for s in site_codes.load()]
    offenders = {}
    for path in sorted(report_dir.iterdir()):
        if path.suffix not in TEXT_SUFFIXES or path.name in {
            "FREEZE.json",
            "T02_site_key.csv",
        }:
            continue
        text = path.read_text(encoding="utf-8")
        found = [n for n in names if n in text]
        if found:
            offenders[path.name] = found
    assert not offenders, f"DEQ site names outside the site key: {offenders}"


CONTEXT_PATH = Path(__file__).resolve().parents[1] / "docs" / "report-2026" / "CONTEXT.md"
ATTRIBUTION_TS_PATH = (
    Path(__file__).resolve().parents[1] / "site" / "src" / "content" / "deq-attribution.ts"
)


def test_deq_limitation_constant_equals_the_transcribed_attribution_constant():
    """The quotation is sliced out of deq-attribution.ts, so it cannot drift from it.

    `DEQ_REPORT_LIMITATION` is DEQ's published weekly-report wording, transcribed
    once from the PDF. `site/src/content/deq-limitation.json` is generated from it by
    `scripts/gen_deq_limitation.py` and compared byte-for-byte here, so the pipeline
    and the site cannot quote anything but that one transcription (DECISIONS.md D24).
    The pairing sentence and the credit line are GENARCH's own wording and stay
    sliced out of CONTEXT.md section 3.
    """
    source = ATTRIBUTION_TS_PATH.read_text(encoding="utf-8")
    match = re.search(r"export const DEQ_REPORT_LIMITATION = `(.*?)`;", source, re.S)
    assert match, "DEQ_REPORT_LIMITATION not found in deq-attribution.ts"
    expected_limitation = match.group(1)

    lines = CONTEXT_PATH.read_text(encoding="utf-8").splitlines()
    (pairing_line,) = [ln for ln in lines if ln.startswith("Always pair with: ")]
    (credit_line,) = [
        ln
        for ln in lines
        if ln.startswith("Credit line until DEQ Communications supplies its preferred wording: ")
    ]
    expected_pairing = pairing_line.removeprefix("Always pair with: ")
    expected_credit = credit_line.split(": ", 1)[1].strip().strip('"')

    constant = figures.deq_limitation()
    assert constant["limitation"] == expected_limitation
    assert constant["pairing"] == expected_pairing
    assert constant["credit"] == expected_credit
    assert constant["citation"] == (
        "Virginia DEQ, Data Center Air Monitoring Project weekly report, 2026-10-09, p. 2"
    )
    assert constant["rendered"] == (
        f"{expected_limitation} ({constant['citation']}) "
        f"{expected_pairing} {expected_credit}"
    )


def test_context_section_3_quotes_the_same_wording_with_its_citation():
    """CONTEXT section 3 carries DEQ's published wording, not an edited email text."""
    lines = CONTEXT_PATH.read_text(encoding="utf-8").splitlines()
    heading = next(i for i, ln in enumerate(lines) if ln.startswith("## 3. DEQ limitation"))
    constant = figures.deq_limitation()
    assert lines[heading + 1] == f'"{constant["limitation"]}" ({constant["citation"]})'


def test_the_cited_deq_report_is_frozen_and_hash_pinned(freeze):
    """The report the citation names is one of the hash-verified frozen inputs."""
    cited = [
        entry
        for entry in freeze.weekly_reports()
        if entry.path.name == "deq_dcamp_weekly_2026-10-09.pdf"
    ]
    assert cited, "the cited 2026-10-09 report is not pinned in FREEZE.json"
    freeze.verified_path(cited[0].rel_path)


# F01-F05 plot DEQ sensor data; F06 plots a study population and a census table.
DEQ_FIGURE_IDS = (
    "F01_network_timeline",
    "F02_collocation",
    "F03_daily_reconciliation",
    "F04_p98_by_site",
    "F05_correlation_heatmap",
)


def test_every_sensor_figure_limitation_equals_the_constant(report_dir):
    """Every sensor-data figure carries DEQ's wording verbatim (CONTEXT.md section 3)."""
    manifest = json.loads((report_dir / "figures.json").read_text(encoding="utf-8"))
    constant = figures.deq_limitation_block()
    deq = [e for e in manifest["figures"] if e["id"] in DEQ_FIGURE_IDS]
    assert len(deq) == len(DEQ_FIGURE_IDS)
    for entry in deq:
        assert entry["limitation"] == constant, entry["id"]


def test_the_ancestry_figure_does_not_carry_the_sensor_limitation(report_dir):
    """F06 plots no sensor reading, so DEQ's CFR limitation must not be attached.

    Attaching it would put a limitation Virginia DEQ published about low-cost air
    sensors onto a GWAS Catalog count and a census table, which DEQ never made a
    statement about.
    """
    manifest = json.loads((report_dir / "figures.json").read_text(encoding="utf-8"))
    f06 = [e for e in manifest["figures"] if e["id"] == "F06_ancestry_composition"]
    if not f06:
        pytest.skip("ancestry inputs are not pinned in this freeze")
    entry = f06[0]
    constant = figures.deq_limitation()
    assert entry["limitation"] != figures.deq_limitation_block()
    for part in (constant["limitation"], constant["citation"], constant["credit"]):
        assert part not in entry["limitation"]
    assert "not an effect estimate" in entry["limitation"]
    assert ancestry_report.ACS_CATEGORY_SENTENCE in entry["limitation"]


def test_no_caption_repeats_any_part_of_the_constant(report_dir):
    manifest = json.loads((report_dir / "figures.json").read_text(encoding="utf-8"))
    constant = figures.deq_limitation()
    parts = [constant[k] for k in ("limitation", "citation", "pairing", "credit")]
    offenders = {}
    for entry in manifest["figures"]:
        repeated = [p[:40] for p in parts if p in entry["caption"]]
        if repeated:
            offenders[entry["id"]] = repeated
    assert not offenders, f"captions retype the constant: {offenders}"


def test_every_figure_has_both_formats_and_usable_alt_text(report_dir):
    manifest = json.loads((report_dir / "figures.json").read_text(encoding="utf-8"))
    for entry in manifest["figures"]:
        assert entry["caption"] and entry["title"]
        assert entry["alt_text"].count(".") >= 1
        assert len(entry["alt_text"].split(". ")) <= 4, f"{entry['id']} alt text is too long"
        assert (report_dir / f"{entry['id']}.svg").is_file()
        assert (report_dir / f"{entry['id']}.png").is_file()


def test_prince_william_sites_carry_no_values(numbers):
    outside = [s.code for s in site_codes.load() if not s.in_v1_scope]
    assert outside == ["DC-10", "DC-11", "DC-12"]
    for code in outside:
        assert f"summary.share_site_days_below_35.{code}" not in numbers
        assert f"p98.full.{code}.lst_zero_missing" not in numbers


def test_atlas_keys_stay_out_of_numbers_json(numbers):
    """The atlas keys live in inventory.json and chain.json, never in numbers.json.

    numbers.json is the DEQ half and CI gates on its bytes, so the atlas half carries
    its own key files. This was also the shape while the atlas was unfrozen, when the
    keys were simply unemitted and never placeholders.
    """
    assert not [k for k in numbers if k.startswith(("inventory.", "chain.", "Chain."))]


# --------------------------------------------------------------- numbers shape


def test_every_number_carries_its_provenance(numbers):
    for key, record in numbers.items():
        assert set(record) == {
            "value",
            "unit",
            "precision",
            "n",
            "window",
            "method",
            "inputs",
        }, key
        assert record["method"], f"{key} has no method"
        if record["precision"] is not None:
            assert isinstance(record["value"], (int, float)), key
        for source in record["inputs"]:
            assert set(source) == {"source", "sha256"}, key
            assert len(source["sha256"]) == 64, key


def test_headline_share_is_the_loudoun_figure(numbers):
    headline = numbers["summary.share_site_days_below_35"]
    assert headline["n"] == 1231
    assert headline["value"] == 99.11
    assert numbers["summary.share_site_days_below_35.all_sites"]["n"] == 1299
    assert numbers["summary.share_site_days_below_35.all_sites"]["value"] == 99.15


def test_registry_rejects_a_duplicate_key():
    reg = NumberRegistry()
    reg.add("a.b", 1, method="first")
    with pytest.raises(KeyError):
        reg.add("a.b", 2, method="second")


# ------------------------------------------------------------------- palette


def test_data_mark_colours_clear_three_to_one_on_white():
    """Every mark a reader reads a value from or against clears 3:1. No exemptions.

    `palette.data_marks()` is the whole list: the two series colours, the reference
    line and the wash outline. The reference line used to sit in an exempt `chrome`
    role at 2.56:1; the exemption is gone and the line is held to the floor like any
    other mark, because on F04 six plotted percentiles are read against it.
    """
    failures = [
        f"{colour} against white at {palette.contrast_ratio(colour, palette.WHITE):.2f}:1"
        for colour in palette.data_marks()
        if palette.contrast_ratio(colour, palette.WHITE) < palette.DATA_MARK_MIN_CONTRAST
    ]
    assert not failures, "data marks below 3:1: " + "; ".join(failures)


def test_the_palette_offers_no_exempt_role():
    """There is no colour role that opts out of the contrast floors."""
    assert not hasattr(palette, "chrome"), "the exempt chrome role is back"
    assert palette.reference() in palette.data_marks()
    assert palette.wash_edge() in palette.data_marks()


def test_the_reference_line_label_clears_the_text_floor():
    """F04 prints the level beside the line, so the label is held to 4.5:1."""
    for colour in (palette.ink(), palette.reference()):
        ratio = palette.contrast_ratio(colour, palette.WHITE)
        assert ratio >= palette.TEXT_MIN_CONTRAST, f"{colour} at {ratio:.2f}:1"


def test_text_colours_clear_four_and_a_half_to_one():
    failures = []
    if palette.contrast_ratio(palette.ink(), palette.WHITE) < palette.TEXT_MIN_CONTRAST:
        failures.append("ink against white")
    # Heatmap cells print their value, so each cell's own text must clear the floor.
    for step in range(11):
        fill = palette.sequential(step / 10)
        text = palette.readable_on(fill)
        ratio = palette.contrast_ratio(text, fill)
        if ratio < palette.TEXT_MIN_CONTRAST:
            failures.append(f"{text} on cell {fill} at {ratio:.2f}:1")
    assert not failures, "text below 4.5:1: " + "; ".join(failures)


def test_series_are_distinguishable_without_colour():
    primary, secondary = palette.series_styles()
    assert primary["linestyle"] != secondary["linestyle"]
    assert primary["marker"] != secondary["marker"]
    assert primary["color"] != secondary["color"]


def test_palette_is_read_from_the_site_tokens():
    tokens = palette.tokens()
    assert tokens["navy.deep"] == "#0B1F2F"
    assert tokens["teal.dim"] == "#177A6F"
    assert tokens["cool.mid"] == "#94A3B8"
    assert tokens["cool.dark"] == "#64748B"
    assert palette.reference() == tokens["cool.dark"]
    assert palette.wash() == tokens["cool.mid"]
    assert palette.wash_edge() == tokens["cool.dark"]


# --------------------------------------------------------- report_lib units


@pytest.mark.parametrize(
    ("value", "places", "expected"),
    [
        (0.725, 2, 0.73),
        (0.735, 2, 0.74),
        (-4.678, 1, -4.7),
        (1.299, 1, 1.3),
        (2.5, 0, 3.0),
        (None, 2, None),
    ],
)
def test_half_up_rounds_away_from_zero(value, places, expected):
    assert half_up(value, places) == expected


@pytest.mark.parametrize(
    ("published", "places"), [(1.3, 1), (0.83, 2), (-4.7, 1), (1.7, 1), (0.21, 2), (35, 0)]
)
def test_decimals_of_reads_the_published_precision(published, places):
    assert decimals_of(published) == places


def test_matches_at_published_precision_uses_deq_precision():
    assert matches_at_published_precision(1.299, 1.3)
    assert matches_at_published_precision(0.831, 0.83)
    assert not matches_at_published_precision(0.497, 0.49)
    assert matches_at_published_precision(0.497, 0.5)


def test_p98_uses_linear_interpolation():
    assert daily.p98([1, 2, 3, 4, 5]) == pytest.approx(4.92)
    assert daily.p98([]) is None


def test_percentile_rank_position_lands_on_an_observation_at_51_days():
    position = daily.percentile_rank_position(51)
    assert position["exact"] is True
    assert position["lower"] == position["upper"] == 50
    assert daily.percentile_rank_position(50)["exact"] is False


def test_day_key_differs_between_the_two_binnings():
    from datetime import datetime as dt

    row = {"ts_est": dt(2026, 7, 1, 23), "ts_raw": dt(2026, 7, 2, 1)}
    assert daily.day_key(row, daily.STANDARD) == dt(2026, 7, 1).date()
    assert daily.day_key(row, daily.CLOCK) == dt(2026, 7, 2).date()
    with pytest.raises(ValueError):
        daily.day_key(row, "utc")


def test_days_below_counts_strictly_below_the_level():
    from datetime import date

    days = {date(2026, 7, 1): 34.9, date(2026, 7, 2): 35.0, date(2026, 7, 3): 35.1}
    assert daily.days_below(days, 35) == (1, 3)


def test_least_squares_matches_a_known_fit():
    fit = collocation.least_squares([1, 2, 3, 4], [2, 4, 6, 8])
    assert fit["slope"] == pytest.approx(2.0)
    assert fit["intercept"] == pytest.approx(0.0)
    assert fit["r2"] == pytest.approx(1.0)
    assert fit["n"] == 4
    with pytest.raises(ValueError):
        collocation.least_squares([1], [2])


def test_pearson_matches_a_known_correlation():
    assert correlation.pearson([1, 2, 3], [1, 2, 3]) == pytest.approx(1.0)
    assert correlation.pearson([1, 2, 3], [3, 2, 1]) == pytest.approx(-1.0)


def test_smoke_window_is_inclusive_on_both_ends():
    from datetime import datetime as dt

    assert correlation.in_smoke_window(dt(2026, 7, 16, 0))
    assert correlation.in_smoke_window(dt(2026, 7, 19, 23))
    assert not correlation.in_smoke_window(dt(2026, 7, 20, 0))


def test_contiguous_runs_collapse_adjacent_days():
    from datetime import date

    days = [date(2026, 3, 1), date(2026, 3, 2), date(2026, 3, 5)]
    assert figures.contiguous_runs(days) == [
        (date(2026, 3, 1), date(2026, 3, 2)),
        (date(2026, 3, 5), date(2026, 3, 5)),
    ]


def test_site_codes_cover_every_site_in_order():
    codes = site_codes.all_codes()
    assert codes == tuple(f"DC-{i:02d}" for i in range(1, 13))
    assert site_codes.code_for("ashburn-collocated") == "DC-01"
    assert site_codes.code_for("sterling-ms") == "DC-06"
    assert site_codes.by_code("DC-01").collocated_regulatory is True
    assert len(site_codes.loudoun_codes()) == 9
    with pytest.raises(KeyError):
        site_codes.code_for("not-a-site")


def test_site_code_units_list_each_period_separately():
    collocated = site_codes.by_code("DC-01")
    assert [u.unit_label for u in collocated.units] == ["APEX 14", "APEX 5"]
    assert collocated.units[0].end_date == "2026-04-08"


# ---------------------------------------------------------------- the freeze


def test_freeze_aborts_on_a_hash_mismatch(freeze_path, tmp_path):
    doc = json.loads(freeze_path.read_text(encoding="utf-8"))
    doc["kunak_exports"][0]["sha256"] = "0" * 64
    tampered = tmp_path / "FREEZE.json"
    tampered.write_text(json.dumps(doc), encoding="utf-8")

    fz = Freeze(tampered)
    with pytest.raises(FreezeError, match="SHA-256 mismatch"):
        fz.verified_path(doc["kunak_exports"][0]["frozen_path"])


def test_freeze_refuses_a_path_it_does_not_list(freeze):
    with pytest.raises(FreezeError, match="not listed"):
        freeze.verified_path("pipeline/sources/deq-raw/some-other-file.csv")


def test_freeze_verifies_every_listed_input(freeze):
    """29 DEQ inputs, every pinned atlas record and every ancestry input, all hashed.

    The three blocks are counted separately so that adding one cannot quietly
    absorb a missing input from another.
    """
    checked = freeze.verify_all()
    atlas_records = {e["path"] for e in freeze.atlas_inputs()["files"]}
    ancestry_records = {e["path"] for e in (freeze.ancestry_inputs() or {"files": []})["files"]}
    assert not atlas_records & ancestry_records
    deq_inputs = [rel for rel in checked if rel not in atlas_records | ancestry_records]
    assert len(deq_inputs) == 29
    assert len(ancestry_records) == 9
    assert len(checked) == 29 + len(atlas_records) + len(ancestry_records)
    assert "pipeline/lookups/site_codes.json" in checked


def test_report_run_without_a_freeze_still_writes_only_the_index(tmp_path):
    # Into tmp_path, not data/reports/2026/: the suite leaves the working tree
    # clean, and CI asserts that with `git status --porcelain` after pytest.
    assert run_report(year=2026, out_dir=tmp_path) == 0
    assert [path.name for path in sorted(tmp_path.iterdir())] == ["index.json"]


# ----------------------------------------------------------- the atlas gate


def test_the_atlas_gate_is_open_on_all_three_conditions(freeze):
    """The gate holds: the Prompt A commit is in HEAD, the graph is clean, D25 is logged."""
    assert freeze.atlas_gate_blockers() == []
    assert freeze_lib.head_contains(freeze_lib.ATLAS_PROMPT_A_COMMIT)
    assert freeze_lib.mojibake_hits_for(freeze_lib.GRAPH_PATH) == 0
    assert freeze_lib.audit_records_graph_reproducibility()


def test_the_gate_no_longer_reads_the_graph_generated_at_date(freeze):
    """`metadata.generated_at` is not a condition: D25 keeps the graph at its 2026-03-07 build.

    The old gate required a date later than 2026-10-22, which no checkout can satisfy
    while D25 stands, so the condition is gone rather than waived.
    """
    assert not hasattr(freeze_lib, "ATLAS_GRAPH_MIN_GENERATED_AT")
    graph = json.loads(
        (Path(freeze_lib.REPO_ROOT) / freeze_lib.GRAPH_PATH).read_text(encoding="utf-8")
    )
    assert graph["metadata"]["generated_at"] == "2026-03-07"
    assert freeze.atlas_gate_blockers() == []


@pytest.mark.parametrize(
    ("condition", "needle"),
    [
        ("commit", "Prompt A commit"),
        ("mojibake", "check_mojibake.py"),
        ("audit", "graph reproducibility entry"),
    ],
)
def test_each_gate_condition_blocks_on_its_own(freeze, monkeypatch, condition, needle):
    """Each condition is reported separately, so a refusal names what is missing."""
    if condition == "commit":
        monkeypatch.setattr(freeze_lib, "head_contains", lambda _commit: False)
    elif condition == "mojibake":
        monkeypatch.setattr(freeze_lib, "mojibake_hits_for", lambda _path: 3)
    else:
        monkeypatch.setattr(freeze_lib, "audit_records_graph_reproducibility", lambda: False)
    blockers = freeze.atlas_gate_blockers()
    assert len(blockers) == 1, blockers
    assert needle in blockers[0]


def test_a_shallow_clone_is_reported_as_shallow_not_as_a_missing_repair(freeze, monkeypatch):
    """A depth-1 checkout has no Prompt A commit object; that is not a closed gate.

    `actions/checkout` clones shallow by default, so `merge-base --is-ancestor`
    fails there for a reason that has nothing to do with what HEAD contains. CI
    fetches the full history; the blocker says which case it is either way.
    """
    monkeypatch.setattr(freeze_lib, "head_contains", lambda _commit: False)
    monkeypatch.setattr(freeze_lib, "commit_is_present", lambda _commit: False)
    (blocker,) = freeze.atlas_gate_blockers()
    assert "shallow clone" in blocker
    assert "not in this repository at all" in blocker


def test_add_atlas_inputs_refuses_to_repin_an_already_frozen_atlas(freeze_path):
    """Re-pinning would move the counts under a freeze date that no longer matches them."""
    before = freeze_path.read_bytes()
    assert run_report(year=2026, freeze=freeze_path, add_atlas=True) == 1
    assert freeze_path.read_bytes() == before


# ------------------------------------------------------------ the atlas half


def _atlas_doc(report_dir, name):
    return json.loads((report_dir / name).read_text(encoding="utf-8"))


def test_every_pinned_atlas_input_hash_verifies(freeze):
    """The 88 atlas records hash-verify against the files on disk."""
    block = freeze.atlas_inputs()
    assert block is not None, "the atlas freeze has not been taken"
    assert len(block["files"]) == sum(m["record_count"] for m in block["modules"])
    for entry in block["files"]:
        resolved = freeze.verified_path(entry["path"])
        assert sha256_of(resolved) == entry["sha256"], entry["path"]


def test_verify_all_covers_the_atlas_records(freeze):
    checked = set(freeze.verify_all())
    for entry in freeze.atlas_inputs()["files"]:
        assert entry["path"] in checked


def test_inventory_counts_equal_the_committed_graph_counts(report_dir):
    """The graph counts are read from the committed data/graph/graph.json, not asserted."""
    graph = json.loads(
        (Path(freeze_lib.REPO_ROOT) / freeze_lib.GRAPH_PATH).read_text(encoding="utf-8")
    )
    expected_nodes = len(graph["nodes"])
    expected_edges = len(graph["edges"])
    assert (expected_nodes, expected_edges) == (
        graph["metadata"]["node_count"],
        graph["metadata"]["edge_count"],
    )

    doc = _atlas_doc(report_dir, "inventory.json")
    assert doc["keys"]["inventory.graph.nodes"]["value"] == expected_nodes
    assert doc["keys"]["inventory.graph.edges"]["value"] == expected_edges
    assert doc["graph"]["node_count"] == expected_nodes
    assert doc["graph"]["edge_count"] == expected_edges

    header, rows = _read_csv(report_dir / "T08_module_inventory.csv")
    (graph_row,) = [row for row in rows if row[header.index("Graph nodes")]]
    assert int(graph_row[header.index("Graph nodes")]) == expected_nodes
    assert int(graph_row[header.index("Graph edges")]) == expected_edges


def test_inventory_module_counts_equal_the_records_on_disk(report_dir):
    doc = _atlas_doc(report_dir, "inventory.json")
    total = 0
    for module, rel_dir in freeze_lib.ATLAS_MODULES:
        on_disk = len(list((Path(freeze_lib.REPO_ROOT) / rel_dir).glob("*.json")))
        assert doc["keys"][f"inventory.{module}.records"]["value"] == on_disk, module
        total += on_disk
    assert doc["keys"]["inventory.record_total"]["value"] == total


def test_every_inventory_count_carries_the_atlas_freeze_date(freeze, report_dir):
    doc = _atlas_doc(report_dir, "inventory.json")
    frozen_at = freeze.atlas_frozen_at()
    assert doc["atlas_freeze_date"] == frozen_at
    assert doc["keys"]["inventory.frozen_at"]["value"] == frozen_at
    counted = [k for k in doc["keys"] if k != "inventory.frozen_at"]
    assert counted
    for key in counted:
        assert doc["keys"][key]["window"] == f"atlas as frozen {frozen_at}", key

    header, rows = _read_csv(report_dir / "T08_module_inventory.csv")
    column = header.index("As of (atlas freeze)")
    assert {row[column] for row in rows} == {frozen_at}


def test_t08_marks_the_knowledge_graph_with_the_d25_status(report_dir):
    """The graph row carries the D25 status verbatim; no other row does."""
    header, rows = _read_csv(report_dir / "T08_module_inventory.csv")
    status = header.index("Status")
    carrying = [row for row in rows if row[status] == atlas.GRAPH_STATUS]
    assert atlas.GRAPH_STATUS == "live; not reproducible from current pipeline (D25)"
    assert len(carrying) == 1, "exactly one row is the knowledge graph"
    assert carrying[0][header.index("Module")] == atlas.MODULE_LABELS[atlas.GRAPH_MODULE]

    doc = _atlas_doc(report_dir, "inventory.json")
    assert doc["keys"]["inventory.graph.status"]["value"] == atlas.GRAPH_STATUS
    assert doc["keys"]["inventory.knowledge_graph.status"]["value"] == atlas.GRAPH_STATUS


def test_t09_carries_the_five_links_and_says_which_classes_came_from_a_record(report_dir):
    header, rows = _read_csv(report_dir / "T09_chain_evidence.csv")
    assert len(rows) == 5, "five links across six nodes"
    assert [int(row[header.index("Step")]) for row in rows] == [1, 2, 3, 4, 5]

    # The chain is end to end: every link starts where the one before it finished.
    from_col, to_col = header.index("From"), header.index("To")
    for earlier, later in zip(rows, rows[1:]):
        assert earlier[to_col] == later[from_col]

    read_from_record = header.index("Class read from an atlas record")
    assert [row[read_from_record] for row in rows] == ["yes", "no", "no", "no", "yes"]
    for row in rows:
        assert row[header.index("Source of the evidence class")]

    doc = _atlas_doc(report_dir, "chain.json")
    assert doc["keys"]["chain.steps"]["value"] == 5
    assert doc["keys"]["chain.inferred_steps"]["value"] == 1
    classes = [doc["keys"][f"chain.step{i}.evidence_class"]["value"] for i in range(1, 6)]
    assert classes == [row[header.index("Evidence class")] for row in rows]


def test_the_chain_classes_match_the_atlas_records_they_name(freeze, report_dir):
    """The two record-derived classes are read from the atlas, not restated here."""
    gene = json.loads(
        freeze.atlas_path(f"data/genes/{atlas.CHAIN_GENE}.json").read_text(encoding="utf-8")
    )
    disease = json.loads(
        freeze.atlas_path(f"data/diseases/{atlas.CHAIN_DISEASE}.json").read_text(
            encoding="utf-8"
        )
    )
    exposure_link = next(
        link
        for link in gene["linked_exposures"]
        if link["exposure_slug"] == atlas.CHAIN_EXPOSURE
    )
    disease_link = next(
        link for link in gene["linked_diseases"] if link["disease_slug"] == atlas.CHAIN_DISEASE
    )
    modifier = next(
        m
        for m in disease["exposure_modifiers"]
        if m["exposure_slug"] == atlas.CHAIN_EXPOSURE
    )

    doc = _atlas_doc(report_dir, "chain.json")
    keys = doc["keys"]
    assert keys["chain.step1.evidence_class"]["value"] == exposure_link["evidence_type"]
    assert keys["chain.step5.evidence_class"]["value"] == disease_link["evidence_type"]
    assert keys["chain.confidence"]["value"] == modifier["confidence"]
    assert keys["chain.direction"]["value"] == modifier["direction"]


def test_the_atlas_inventory_quotes_no_brief_title_or_entity_prose(report_dir):
    """AUDIT item 16: quoting brief titles in the inventory needs a ruling it has not had."""
    titles = [
        json.loads(path.read_text(encoding="utf-8"))["title"]
        for path in (Path(freeze_lib.REPO_ROOT) / "data" / "briefs").glob("*.json")
    ]
    assert titles
    for name in ("inventory.json", "chain.json", "T08_module_inventory.csv",
                 "T09_chain_evidence.csv"):
        text = (report_dir / name).read_text(encoding="utf-8")
        quoted = [t for t in titles if t in text]
        assert not quoted, f"{name} quotes a brief title: {quoted}"


# -------------------------------------------------------------- the tables


def test_every_table_is_listed_in_a_manifest(report_dir):
    """Every CSV is manifested, the DEQ tables in tables.json and the atlas pair in theirs.

    `tables.json` holds T01-T07 and nothing else, because CI gates on its bytes. T08 and
    T09 are manifested in `inventory.json` and `chain.json` instead.
    """
    manifest = json.loads((report_dir / "tables.json").read_text(encoding="utf-8"))
    listed = {entry["id"] for entry in manifest["tables"]}
    on_disk = {path.stem for path in report_dir.glob("T*.csv")}
    atlas_listed = {
        json.loads((report_dir / name).read_text(encoding="utf-8"))["table"]["id"]
        for name in ("inventory.json", "chain.json")
    }
    assert atlas_listed == {"T08_module_inventory", "T09_chain_evidence"}
    assert listed.isdisjoint(atlas_listed), "an atlas table leaked into tables.json"
    assert listed | atlas_listed == on_disk
    for entry in manifest["tables"]:
        assert entry["title"] and entry["caption"] and entry["source_note"]
        header, rows = _read_csv(report_dir / entry["file"])
        assert header == entry["columns"]
        assert len(rows) == entry["row_count"]


def test_sources_table_names_sources_by_code_and_hash(report_dir):
    header, rows = _read_csv(report_dir / "T01_sources.csv")
    assert header == ["Source", "Origin", "Licence", "Export date", "Data cutoff", "SHA-256"]
    assert len(rows) == 26, "one row per frozen DEQ input"
    for row in rows:
        assert len(row[5]) == 64, f"missing hash: {row}"
        assert row[2], f"missing licence: {row}"


def test_common_window_table_carries_both_day_definitions(report_dir):
    header, rows = _read_csv(report_dir / "T05_p98_common_window.csv")
    assert "Day definition" in header
    definitions = {row[1] for row in rows}
    assert definitions == {"local standard time", "local clock time"}
    assert len(rows) == 12


def test_full_record_table_covers_the_nine_table4_sites(report_dir):
    _, rows = _read_csv(report_dir / "T06_p98_full_record_variants.csv")
    assert len(rows) == 9
    codes = {row[0] for row in rows}
    assert codes <= set(site_codes.loudoun_codes())


def test_compute_is_pure_with_respect_to_the_repository(freeze, report_dir):
    """`compute` reads the freeze and writes nothing outside the output directory."""
    published = Path("data/reports/2026")
    before = {p.name: p.stat().st_mtime_ns for p in published.iterdir() if p.is_file()}
    compute(freeze)
    after = {p.name: p.stat().st_mtime_ns for p in published.iterdir() if p.is_file()}
    assert before == after

def _read_table(report_dir, table_id):
    """One emitted CSV as a list of dicts, or a skip when it is not emitted."""
    path = report_dir / f"{table_id}.csv"
    if not path.is_file():
        pytest.skip(f"{table_id} is not emitted in this freeze")
    with open(path, encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


# ------------------------------------------------------- ancestry composition


@pytest.fixture(scope="session")
def anc(freeze):
    """The recomputed ancestry block, or a skip while its inputs are unpinned."""
    if freeze.ancestry_inputs() is None:
        pytest.skip("ancestry_inputs is not pinned in this freeze")
    return ancestry_report.compute(freeze)


def test_discovery_shares_sum_to_one_within_rounding(anc):
    shares = [row["share"] for row in anc["discovery"]["categories"]]
    assert shares, "no discovery categories"
    assert abs(sum(shares) - 1.0) < 1e-9


def test_acs_shares_sum_to_one_within_rounding(anc):
    """The race stack must cover the whole county, or the panel misleads."""
    shares = [segment["share"] for segment in anc["acs"]["segments"]]
    assert shares
    assert abs(sum(shares) - 1.0) < 1e-9


def test_published_shares_sum_to_one_hundred_within_rounding(numbers, anc):
    """The rounded percentages a reader adds up must also reach 100."""
    for prefix, rows in (
        ("ancestry.discovery", anc["discovery"]["categories"]),
        ("ancestry.acs", anc["acs"]["segments"]),
    ):
        keys = [
            f"{prefix}.{ancestry.slug(row.get('category'))}.share" for row in rows
        ]
        total = sum(numbers[key]["value"] for key in keys)
        # Each value is rounded half away from zero to two decimals, so the sum can
        # drift by at most half a unit in the last place per row.
        tolerance = 0.005 * len(keys)
        assert abs(total - 100.0) <= tolerance, f"{prefix} shares sum to {total}"


def test_the_equal_split_preserves_the_discovery_total(anc):
    """Splitting a multi-category row 1/k must not change the denominator."""
    discovery = anc["discovery"]
    assert abs(
        sum(row["individuals"] for row in discovery["categories"])
        - discovery["total_individuals"]
    ) < 1e-6


def test_the_weight_of_the_equal_split_is_reported(numbers, anc):
    """A reader has to be able to see how much rests on the split assumption."""
    assert "ancestry.discovery.multi_category_rows" in numbers
    assert "ancestry.discovery.multi_category_share" in numbers
    single = anc["discovery"]["shares_single_category_only"]
    assert single, "the single-category sensitivity was not computed"


# The one ancestry key with no measured input: it states how the report's method
# differs from the live page's, which is a statement about two methods and not a
# value read off a file. Named here so the exemption is visible rather than a
# silent gap in the check below.
NARRATIVE_ANCESTRY_KEYS = {"ancestry.method_divergence"}


def test_every_ancestry_number_names_its_release_and_inputs(numbers):
    keys = [k for k in numbers if k.startswith("ancestry.")]
    assert keys, "no ancestry keys were emitted"
    for key in keys:
        record = numbers[key]
        assert record["method"], key
        if key in NARRATIVE_ANCESTRY_KEYS:
            assert not record["inputs"], f"{key} is narrative and should cite no file"
            continue
        assert record["inputs"], f"{key} carries no provenance"
        for source in record["inputs"]:
            assert len(source["sha256"]) == 64, key


def test_the_release_recorded_is_a_dated_path_not_the_latest_alias(numbers, freeze):
    """`latest` is re-pointed monthly, so it can never be an origin (D30)."""
    for entry in freeze.ancestry_full_downloads():
        assert "/releases/latest/" not in entry["origin_url"], entry["name"]
        assert freeze.ancestry_release() in {"2026-11-02"} or entry["origin_url"]
    for record in numbers.values():
        for source in record["inputs"]:
            assert "releases/latest" not in source["source"]


def test_selection_uses_ontology_ids_and_no_trait_name(freeze):
    """Selection is by ID; a trait name must never be a selector."""
    block = freeze.ancestry_inputs()
    if block is None:
        pytest.skip("ancestry_inputs is not pinned in this freeze")
    assert block["asthma_term_ids"], "no term IDs recorded in the freeze"
    for term_id in block["asthma_term_ids"]:
        assert term_id.split("_")[0] in {"EFO", "MONDO"}, term_id
    assert "free text" in block["selection_rule"]


def test_the_obsolete_and_live_asthma_seeds_are_both_present(freeze):
    """EFO_0000270 is obsolete; MONDO_0004979 is live. Both must be selectors."""
    block = freeze.ancestry_inputs()
    if block is None:
        pytest.skip("ancestry_inputs is not pinned in this freeze")
    assert "EFO_0000270" in block["asthma_term_ids"]
    assert "MONDO_0004979" in block["asthma_term_ids"]


def test_the_category_splitter_keeps_the_comma_bearing_label_whole():
    """One vocabulary label carries commas, so a comma split would corrupt it."""
    label = "Greater Middle Eastern (Middle Eastern, North African or Persian)"
    assert ancestry.split_broad(label) == [label]
    assert ancestry.split_broad(f"European, {label}") == ["European", label]
    assert ancestry.split_broad("European, East Asian") == ["European", "East Asian"]


def test_an_unknown_category_fails_rather_than_vanishing():
    """An unrecognised category would otherwise drop out of the denominator."""
    with pytest.raises(ancestry.AncestryError):
        ancestry.split_broad("European, Martian")


def test_loci_counts_never_exceed_the_locus_total(anc):
    """A per-category count is a subset of the locus's associations."""
    for locus in anc["loci"]["loci"]:
        for category, count in locus["by_category"].items():
            assert count <= locus["associations"], (locus["id"], category)


def test_every_in_scope_locus_appears_in_t11(report_dir, anc):
    rows = _read_table(report_dir, "T11_loci_by_ancestry")
    labels = {row["Locus"] for row in rows}
    assert labels == {locus["label"] for locus in anc["loci"]["loci"]}
    assert len(rows) == 5


def test_t12_keeps_hispanic_origin_out_of_the_race_stack(report_dir):
    """Hispanic origin cross-cuts race; stacking it would double-count residents."""
    rows = _read_table(report_dir, "T12_loudoun_acs_context")
    stacked = [r for r in rows if r["In race stack"] == "yes"]
    crossing = [r for r in rows if r["In race stack"] == "no"]
    assert len(crossing) == 1
    assert "Hispanic or Latino" in crossing[0]["Category"]
    assert abs(sum(float(r["Share"]) for r in stacked) - 100.0) <= 0.005 * len(stacked)


def test_the_required_acs_sentence_is_on_f06_verbatim(report_dir):
    manifest = json.loads((report_dir / "figures.json").read_text(encoding="utf-8"))
    f06 = [e for e in manifest["figures"] if e["id"] == "F06_ancestry_composition"]
    if not f06:
        pytest.skip("ancestry inputs are not pinned in this freeze")
    required = (
        "ACS categories are self-identified race and ethnicity, which are social "
        "categories and not genetic ancestry. They are shown only to describe the "
        "population the atlas is meant to serve."
    )
    assert required in f06[0]["caption"]


def test_the_method_divergence_from_the_live_page_is_recorded(numbers, report_dir):
    """The report and /ancestry-equity read different sources; the report says so."""
    assert "ancestry.method_divergence" in numbers
    value = numbers["ancestry.method_divergence"]["value"]
    assert "Diversity Monitor" in value and "AUDIT.md" in value
    rows = _read_table(report_dir, "T10_gwas_ancestry_composition")
    assert rows


def test_no_ancestry_output_states_an_effect_estimate(report_dir):
    """CONTEXT.md X7: no cross-ancestry effect estimate appears in v1."""
    banned = ("odds ratio", "hazard ratio", "effect size", "beta =", "AUC")
    for name in (
        "T10_gwas_ancestry_composition.csv",
        "T11_loci_by_ancestry.csv",
        "T12_loudoun_acs_context.csv",
    ):
        path = report_dir / name
        if not path.is_file():
            pytest.skip("ancestry tables are not emitted in this freeze")
        text = path.read_text(encoding="utf-8").lower()
        for phrase in banned:
            assert phrase.lower() not in text, f"{name} states {phrase!r}"


def test_the_extract_is_reproducible_from_the_full_download(freeze):
    """Re-cutting the extract twice must give the pinned bytes both times.

    Skipped when the full downloads are absent, which is the normal state of a
    clean clone: D30 keeps them out of git. The pinned SHA-256 of each full file
    is what a reader re-downloads against.
    """
    block = freeze.ancestry_inputs()
    if block is None:
        pytest.skip("ancestry_inputs is not pinned in this freeze")
    gwas_dir = freeze_lib.REPO_ROOT / "pipeline" / "sources" / "gwas-catalog"
    missing = [
        entry["name"]
        for entry in freeze.ancestry_full_downloads()
        if not (gwas_dir / entry["name"]).is_file()
    ]
    if missing:
        pytest.skip(f"full downloads absent (D30): {missing}")

    import subprocess

    pinned = {
        entry["path"]: entry["sha256"]
        for entry in block["files"]
        if entry["role"].startswith("gwas_") and entry["role"].endswith("extract")
    }
    assert pinned, "no extracts pinned"
    for run in (1, 2):
        result = subprocess.run(
            [sys.executable, "scripts/fetch_gwas_catalog.py", "--extract-only"],
            cwd=freeze_lib.REPO_ROOT,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"run {run} failed: {result.stderr}"
        for rel, expected in pinned.items():
            actual = sha256_of(freeze_lib.REPO_ROOT / rel)
            assert actual == expected, f"run {run} changed {rel}"
