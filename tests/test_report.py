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
from pathlib import Path

import pytest

from pipeline.report import PM25_24H_LEVEL, compute, run_report
from pipeline.report_lib import collocation, correlation, daily, figures, palette, site_codes
from pipeline.report_lib.freeze import Freeze, FreezeError
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


def test_deq_limitation_constant_equals_context_section_3():
    """The constant is sliced out of CONTEXT.md, so it cannot drift from it."""
    lines = CONTEXT_PATH.read_text(encoding="utf-8").splitlines()
    quote, attribution = lines[21].rsplit('" ', 1)
    expected_limitation = quote.lstrip('"')
    expected_pairing = lines[22].removeprefix("Always pair with: ")
    expected_credit = lines[23].split(": ", 1)[1].strip().strip('"')

    constant = figures.deq_limitation()
    assert constant["limitation"] == expected_limitation
    assert constant["attribution"] == attribution.strip() == "(Virginia DEQ)"
    assert constant["pairing"] == expected_pairing
    assert constant["credit"] == expected_credit
    assert constant["rendered"] == (
        f"{expected_limitation} {attribution.strip()} {expected_pairing} {expected_credit}"
    )


def test_every_figure_limitation_equals_the_constant(report_dir):
    manifest = json.loads((report_dir / "figures.json").read_text(encoding="utf-8"))
    assert len(manifest["figures"]) == 5
    constant = figures.deq_limitation_block()
    for entry in manifest["figures"]:
        assert entry["limitation"] == constant, entry["id"]


def test_no_caption_repeats_any_part_of_the_constant(report_dir):
    manifest = json.loads((report_dir / "figures.json").read_text(encoding="utf-8"))
    constant = figures.deq_limitation()
    parts = [constant[k] for k in ("limitation", "attribution", "pairing", "credit")]
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


def test_atlas_numbers_are_absent_rather_than_placeholders(numbers):
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
    failures = [
        f"{colour} against white at {palette.contrast_ratio(colour, palette.WHITE):.2f}:1"
        for colour in palette.series()
        if palette.contrast_ratio(colour, palette.WHITE) < palette.DATA_MARK_MIN_CONTRAST
    ]
    assert not failures, "data marks below 3:1: " + "; ".join(failures)


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
    assert palette.chrome() == tokens["cool.mid"]


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
    checked = freeze.verify_all()
    assert len(checked) == 29
    assert "pipeline/lookups/site_codes.json" in checked


def test_report_run_without_a_freeze_still_writes_only_the_index(tmp_path):
    # Into tmp_path, not data/reports/2026/: the suite leaves the working tree
    # clean, and CI asserts that with `git status --porcelain` after pytest.
    assert run_report(year=2026, out_dir=tmp_path) == 0
    assert [path.name for path in sorted(tmp_path.iterdir())] == ["index.json"]


# ----------------------------------------------------------- the atlas gate


def test_atlas_freeze_refuses_while_the_graph_rebuild_is_absent(freeze, capsys):
    blockers = freeze.atlas_gate_blockers()
    assert blockers, "the atlas gate should still be closed"
    joined = " ".join(blockers)
    assert "graph.json" in joined
    with capsys.disabled():
        print("\natlas gate blockers:")
        for blocker in blockers:
            print(f"  {blocker}")


def test_add_atlas_inputs_exits_nonzero_and_writes_nothing(freeze_path):
    before = freeze_path.read_bytes()
    assert run_report(year=2026, freeze=freeze_path, add_atlas=True) == 1
    assert freeze_path.read_bytes() == before


# -------------------------------------------------------------- the tables


def test_every_table_is_listed_in_the_manifest(report_dir):
    manifest = json.loads((report_dir / "tables.json").read_text(encoding="utf-8"))
    listed = {entry["id"] for entry in manifest["tables"]}
    on_disk = {path.stem for path in report_dir.glob("T*.csv")}
    assert listed == on_disk
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
