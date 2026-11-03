"""Cross-ancestry evidence base: who the asthma GWAS evidence was measured in.

Descriptive only. Nothing here computes a gene-environment effect estimate, a
polygenic score, or any per-group effect: CONTEXT.md X7 bars all three from v1,
and every figure in this module is a count of people enrolled or associations
declared, never a measure of how much a variant does.

Three computations, from three pinned inputs:

1. ``discovery_composition()`` -- initial-stage discovery individuals by broad
   ancestral category across the asthma studies, as counts and shares, from the
   committed ancestry extract.
2. ``loci_by_ancestry()`` -- genome-wide-significant associations at the five
   in-scope asthma loci, by the broad ancestral category of the discovery
   sample, from the committed association extract.
3. ``acs_context()`` -- Loudoun County's recorded population composition, from
   the ACS 5-year release files.

The ACS categories are self-identified race and Hispanic origin. They are social
categories and not genetic ancestry, they are measured a different way from a
study's ancestry assignment, and the two must never be presented as one series or
on one axis. ``acs_context()`` is a description of the population the atlas
serves, nothing more.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
LOOKUPS = REPO_ROOT / "pipeline" / "lookups"
GWAS_DIR = REPO_ROOT / "pipeline" / "sources" / "gwas-catalog"
CROSS_ANCESTRY_DIR = REPO_ROOT / "pipeline" / "sources" / "cross_ancestry"

CATEGORIES_PATH = LOOKUPS / "gwas_ancestry_categories.json"
LOCI_PATH = LOOKUPS / "asthma_loci.json"
TERMS_PATH = LOOKUPS / "asthma_trait_terms.json"
EXTRACT_MANIFEST = GWAS_DIR / "extract_manifest.json"

# Columns, resolved by name against each extract's own header.
ANC_ACCESSION = "STUDY ACCESSION"
ANC_STAGE = "STAGE"
ANC_N = "NUMBER OF INDIVIDUALS"
ANC_BROAD = "BROAD ANCESTRAL CATEGORY"
ASSOC_ACCESSION = "STUDY ACCESSION"
ASSOC_PVALUE = "P-VALUE"
ASSOC_MAPPED_GENE = "MAPPED_GENE"
ASSOC_SNPS = "SNPS"
ASSOC_TRAIT = "MAPPED_TRAIT"

# The catalog records the discovery sample under this stage label.
INITIAL_STAGE = "initial"

# Separators that appear inside a MAPPED_GENE cell: ` - ` for an intergenic pair,
# `; ` or `, ` for several mappings on one row, and `/` where the catalog joins a
# pair. All four are safe because no HGNC gene symbol contains any of them. A
# bare letter must never be used as a separator: splitting on `x` would cut
# every symbol carrying a lowercase x in two and silently lose both halves.
_GENE_SEPARATORS = (" - ", ";", ",", "/")


class AncestryError(RuntimeError):
    """An input contract failure. Nothing is emitted when this is raised."""


# ------------------------------------------------------------------- lookups


@lru_cache(maxsize=1)
def categories() -> tuple[str, ...]:
    """The controlled broad-ancestral-category vocabulary, longest label first.

    Longest first because the field is parsed by longest match: `South Asian` has
    to be tried before `Asian unspecified` cannot steal it, and the one label
    containing its own commas has to be tried before any split on a comma.
    """
    doc = json.loads(CATEGORIES_PATH.read_text(encoding="utf-8"))
    labels = tuple(entry["label"] for entry in doc["categories"])
    if not labels:
        raise AncestryError(f"{CATEGORIES_PATH.name} lists no categories")
    return tuple(sorted(labels, key=lambda s: (-len(s), s)))


@lru_cache(maxsize=1)
def category_order() -> dict[str, int]:
    """Report order for the vocabulary, as the lookup lists it."""
    doc = json.loads(CATEGORIES_PATH.read_text(encoding="utf-8"))
    return {entry["label"]: i for i, entry in enumerate(doc["categories"])}


@lru_cache(maxsize=1)
def asthma_term_ids() -> frozenset[str]:
    """The asthma ontology IDs the extraction selected on."""
    doc = json.loads(TERMS_PATH.read_text(encoding="utf-8"))
    return frozenset(entry["id"] for entry in doc["terms"])


@lru_cache(maxsize=1)
def loci() -> list[dict]:
    return json.loads(LOCI_PATH.read_text(encoding="utf-8"))["loci"]


@lru_cache(maxsize=1)
def significance_threshold() -> float:
    return float(json.loads(LOCI_PATH.read_text(encoding="utf-8"))["significance_threshold"])


@lru_cache(maxsize=1)
def extract_manifest() -> dict:
    if not EXTRACT_MANIFEST.is_file():
        raise AncestryError(
            f"missing {EXTRACT_MANIFEST.relative_to(REPO_ROOT).as_posix()}; "
            "run scripts/fetch_gwas_catalog.py"
        )
    return json.loads(EXTRACT_MANIFEST.read_text(encoding="utf-8"))


def release_date() -> str:
    return extract_manifest()["release_date"]


def extract_path(role_name: str) -> Path:
    path = GWAS_DIR / role_name
    if not path.is_file():
        raise AncestryError(f"missing extract {path.relative_to(REPO_ROOT).as_posix()}")
    return path


def _extract_named(prefix: str) -> Path:
    for entry in extract_manifest()["files"]:
        if entry["role"] == "committed extract" and entry["name"].startswith(prefix):
            return extract_path(entry["name"])
    raise AncestryError(f"no committed extract named {prefix}* in the extract manifest")


# ------------------------------------------------------------------- naming

# Parenthesised qualifiers are dropped from a key, not from a label. The one
# category that carries them, `Greater Middle Eastern (Middle Eastern, North
# African or Persian)`, would otherwise give a 60-character numbers.json key.
# Every table and figure still prints the label in full.
def slug(label: str) -> str:
    """A stable numbers.json key fragment for a category label."""
    text = label.split("(")[0].strip().lower()
    out = []
    for ch in text:
        if ch.isalnum():
            out.append(ch)
        elif out and out[-1] != "_":
            out.append("_")
    return "".join(out).strip("_")


# ------------------------------------------------------------- field parsing


def split_broad(field: str) -> list[str]:
    """Split a BROAD ANCESTRAL CATEGORY cell into controlled-vocabulary labels.

    The catalog separates several categories in one cell with a comma and a
    space. A bare comma split is wrong, because one label in the vocabulary
    carries commas of its own: `Greater Middle Eastern (Middle Eastern, North
    African or Persian)`. So the cell is consumed by longest match against the
    vocabulary instead, and any residue is an error rather than a silent drop: an
    unrecognised category would otherwise vanish from a denominator.
    """
    text = (field or "").strip()
    if not text:
        return []
    found: list[str] = []
    vocabulary = categories()
    while text:
        for label in vocabulary:
            if text.startswith(label):
                found.append(label)
                text = text[len(label) :]
                break
        else:
            raise AncestryError(
                f"unrecognised broad ancestral category near {text[:60]!r} in "
                f"{field!r}; add it to {CATEGORIES_PATH.name} rather than dropping it"
            )
        text = text.lstrip()
        if text.startswith(","):
            text = text[1:].lstrip()
    return found


def split_genes(field: str) -> set[str]:
    """Gene symbols in a MAPPED_GENE cell."""
    text = (field or "").strip()
    if not text:
        return set()
    for sep in _GENE_SEPARATORS:
        text = text.replace(sep, "|")
    return {piece.strip() for piece in text.split("|") if piece.strip()}


def _as_int(value: str) -> int | None:
    text = (value or "").strip().replace(",", "")
    if not text or text.upper() in {"NA", "NR"}:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def _as_float(value: str) -> float | None:
    text = (value or "").strip()
    if not text or text.upper() in {"NA", "NR"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


# ------------------------------------------------------------------- reading


def _read_tsv(path: Path) -> tuple[list[str], list[list[str]]]:
    with open(path, encoding="utf-8", newline="") as fh:
        reader = csv.reader(fh, delimiter="\t", quoting=csv.QUOTE_NONE)
        header = next(reader)
        return header, [row for row in reader]


def _column(header: list[str], name: str, where: str) -> int:
    if name not in header:
        raise AncestryError(f"{where} has no {name!r} column")
    return header.index(name)


@dataclass(frozen=True)
class AncestryRow:
    accession: str
    stage: str
    individuals: int | None
    broad: tuple[str, ...]
    raw_broad: str


def ancestry_rows() -> list[AncestryRow]:
    path = _extract_named("asthma_ancestries_")
    header, rows = _read_tsv(path)
    i_acc = _column(header, ANC_ACCESSION, path.name)
    i_stage = _column(header, ANC_STAGE, path.name)
    i_n = _column(header, ANC_N, path.name)
    i_broad = _column(header, ANC_BROAD, path.name)
    out: list[AncestryRow] = []
    for row in rows:
        if len(row) <= max(i_acc, i_stage, i_n, i_broad):
            continue
        out.append(
            AncestryRow(
                accession=row[i_acc].strip(),
                stage=row[i_stage].strip().lower(),
                individuals=_as_int(row[i_n]),
                broad=tuple(split_broad(row[i_broad])),
                raw_broad=row[i_broad].strip(),
            )
        )
    return out


# -------------------------------------------------------- 3a. discovery mix


def discovery_composition() -> dict:
    """Initial-stage discovery individuals by broad ancestral category.

    The split rule, which the report states wherever these shares appear: a row
    naming one category contributes all of its individuals to that category; a
    row naming k categories contributes an equal 1/k share to each. The catalog
    gives no per-category count inside a multi-category row, so an equal split is
    an assumption, not a measurement. It is used because it is the only split
    that leaves the total unchanged, so the shares still describe one
    denominator. Its weight is reported beside the result: `multi_category_rows`
    and `multi_category_individuals` say how much of the total rests on it, and
    `shares_single_category_only` recomputes the shares with those rows dropped
    so a reader can see the assumption move.

    Rows with no individual count are counted in `rows_without_n` and contribute
    nothing. Rows are not deduplicated by study: one study contributing two
    initial-stage ancestry rows is two measurements of different sample parts.
    """
    rows = [r for r in ancestry_rows() if r.stage == INITIAL_STAGE]
    totals: dict[str, float] = {}
    single: dict[str, float] = {}
    multi_rows = 0
    multi_individuals = 0
    without_n = 0
    without_category = 0
    total = 0

    for row in rows:
        if row.individuals is None:
            without_n += 1
            continue
        if not row.broad:
            without_category += 1
            continue
        total += row.individuals
        k = len(row.broad)
        if k > 1:
            multi_rows += 1
            multi_individuals += row.individuals
        for label in row.broad:
            totals[label] = totals.get(label, 0.0) + row.individuals / k
            if k == 1:
                single[label] = single.get(label, 0.0) + row.individuals

    single_total = sum(single.values())
    order = category_order()

    def ranked(mapping: dict[str, float], denominator: float) -> list[dict]:
        items = sorted(
            mapping.items(), key=lambda kv: (-kv[1], order.get(kv[0], 999), kv[0])
        )
        return [
            {
                "category": label,
                "individuals": value,
                "share": (value / denominator) if denominator else 0.0,
            }
            for label, value in items
        ]

    return {
        "release_date": release_date(),
        "stage": INITIAL_STAGE,
        "studies": len({r.accession for r in rows}),
        "rows": len(rows),
        "rows_without_n": without_n,
        "rows_without_category": without_category,
        "total_individuals": total,
        "categories": ranked(totals, total),
        "multi_category_rows": multi_rows,
        "multi_category_individuals": multi_individuals,
        "multi_category_share_of_total": (multi_individuals / total) if total else 0.0,
        "shares_single_category_only": ranked(single, single_total),
        "single_category_individuals": single_total,
        "split_rule": (
            "A row naming one broad ancestral category contributes all its individuals "
            "to that category; a row naming k categories contributes an equal 1/k share "
            "to each. The catalog publishes no per-category count within a row, so the "
            "equal split is an assumption. It preserves the total, so the shares "
            "describe one denominator."
        ),
        "denominator_note": (
            "The total is a sum of study sample sizes, not a count of distinct people. "
            "Asthma GWAS draw repeatedly on the same large cohorts, so a participant "
            "enrolled in several studies is counted once per study, and studies mapped "
            "to asthma alongside another trait contribute their whole sample. The total "
            "is therefore much larger than the number of people who have ever been in "
            "an asthma GWAS, and must never be reported as a headcount. What the shares "
            "describe is how the field's accumulated asthma evidence is distributed "
            "across ancestry groups, which is the question this module asks."
        ),
        "delimiter_rule": (
            "The category cell is consumed by longest match against the controlled "
            "vocabulary in pipeline/lookups/gwas_ancestry_categories.json, not split on "
            "a comma: one vocabulary label, 'Greater Middle Eastern (Middle Eastern, "
            "North African or Persian)', contains commas of its own. Any residue the "
            "vocabulary cannot account for fails the run."
        ),
    }


# ---------------------------------------------------------- 3b. loci counts


def loci_by_ancestry() -> dict:
    """Genome-wide-significant associations at the in-scope loci, by category.

    An association is counted once per broad ancestral category of its study's
    initial-stage sample, so a multi-ancestry discovery sample adds one to each
    of its categories and the per-category counts do not sum to the association
    total. That is recorded rather than normalised away: the question is how much
    evidence at each locus was declared in each group, and a study enrolling two
    groups contributes to both.
    """
    path = _extract_named("asthma_associations_")
    header, rows = _read_tsv(path)
    i_acc = _column(header, ASSOC_ACCESSION, path.name)
    i_p = _column(header, ASSOC_PVALUE, path.name)
    i_gene = _column(header, ASSOC_MAPPED_GENE, path.name)
    i_snp = _column(header, ASSOC_SNPS, path.name)

    threshold = significance_threshold()
    by_accession: dict[str, set[str]] = {}
    for row in ancestry_rows():
        if row.stage == INITIAL_STAGE:
            by_accession.setdefault(row.accession, set()).update(row.broad)

    symbol_to_locus: dict[str, str] = {}
    for locus in loci():
        for symbol in locus["gene_symbols"]:
            symbol_to_locus[symbol] = locus["id"]

    counts: dict[str, dict[str, int]] = {locus["id"]: {} for locus in loci()}
    totals: dict[str, int] = {locus["id"]: 0 for locus in loci()}
    variants: dict[str, set[str]] = {locus["id"]: set() for locus in loci()}
    no_category: dict[str, int] = {locus["id"]: 0 for locus in loci()}
    scanned = 0
    significant = 0

    for row in rows:
        if len(row) <= max(i_acc, i_p, i_gene, i_snp):
            continue
        scanned += 1
        p = _as_float(row[i_p])
        if p is None or not p < threshold:
            continue
        significant += 1
        hit_loci = {
            symbol_to_locus[symbol]
            for symbol in split_genes(row[i_gene])
            if symbol in symbol_to_locus
        }
        if not hit_loci:
            continue
        cats = by_accession.get(row[i_acc].strip(), set())
        for locus_id in hit_loci:
            totals[locus_id] += 1
            variants[locus_id].add(row[i_snp].strip())
            if not cats:
                no_category[locus_id] += 1
            for cat in cats:
                counts[locus_id][cat] = counts[locus_id].get(cat, 0) + 1

    order = category_order()
    present = sorted(
        {cat for per in counts.values() for cat in per},
        key=lambda c: (order.get(c, 999), c),
    )

    return {
        "release_date": release_date(),
        "threshold": threshold,
        "associations_scanned": scanned,
        "associations_significant": significant,
        "categories_present": present,
        "loci": [
            {
                "id": locus["id"],
                "label": locus["label"],
                "cytoband": locus["cytoband"],
                "gene_symbols": list(locus["gene_symbols"]),
                "associations": totals[locus["id"]],
                "distinct_variants": len(variants[locus["id"]]),
                # Every category present anywhere in the table gets an entry here,
                # including a zero. A locus with no association from a group is a
                # finding about the evidence base, not missing data, and leaving
                # the key out would make it uncitable in report prose while the
                # table still printed the 0.
                "by_category": {
                    category: counts[locus["id"]].get(category, 0)
                    for category in present
                },
                "associations_without_initial_stage_category": no_category[locus["id"]],
            }
            for locus in loci()
        ],
        "counting_rule": (
            "One association counts once per broad ancestral category of its study's "
            "initial-stage sample, so the per-category counts do not sum to the "
            "association total when a discovery sample names more than one category. "
            "An association whose study has no initial-stage ancestry row is counted in "
            "the locus total and in associations_without_initial_stage_category only."
        ),
        "locus_rule": json.loads(LOCI_PATH.read_text(encoding="utf-8"))["selection_rule"],
    }


# -------------------------------------------------------------- 3c. ACS


def _acs_file(release: str, table: str) -> Path:
    path = CROSS_ANCESTRY_DIR / f"acs_loudoun_{release}_{table}.json"
    if not path.is_file():
        raise AncestryError(
            f"missing {path.relative_to(REPO_ROOT).as_posix()}; "
            "run scripts/fetch_acs_loudoun_release.py"
        )
    return path


def _cell_by_label(doc: dict, label: str) -> dict:
    """One cell, selected by the release's own label text.

    Never by variable code: Census renumbers profile variables between vintages,
    so a memorised code silently returns a different series.
    """
    matches = [
        {"variable": code, **cell}
        for code, cell in doc["cells"].items()
        if cell.get("label") == label
    ]
    if len(matches) != 1:
        raise AncestryError(
            f"label {label!r} matched {len(matches)} cells in "
            f"{doc['table']} {doc['release']}; expected exactly 1"
        )
    return matches[0]


# B02001 race categories. These are mutually exclusive and sum to the table
# total, which is what lets them stack.
_RACE_LABELS = (
    "Estimate!!Total:!!White alone",
    "Estimate!!Total:!!Black or African American alone",
    "Estimate!!Total:!!American Indian and Alaska Native alone",
    "Estimate!!Total:!!Asian alone",
    "Estimate!!Total:!!Native Hawaiian and Other Pacific Islander alone",
    "Estimate!!Total:!!Some Other Race alone",
    "Estimate!!Total:!!Two or More Races:",
)
_RACE_TOTAL_LABEL = "Estimate!!Total:"


def acs_context(release: str) -> dict:
    """Loudoun County's recorded population composition for the F06 ACS panel.

    Race categories come from B02001, where they are mutually exclusive and sum
    to the table total, so they can stack. Hispanic or Latino origin is reported
    beside the stack and never inside it: in ACS it cross-cuts race, so adding it
    as an eighth segment would double-count people and push the stack past 100
    percent.
    """
    b02001 = json.loads(_acs_file(release, "b02001").read_text(encoding="utf-8"))
    dp05 = json.loads(_acs_file(release, "dp05").read_text(encoding="utf-8"))

    total_cell = _cell_by_label(b02001, _RACE_TOTAL_LABEL)
    total = _as_int(total_cell["value"])
    if not total:
        raise AncestryError(f"B02001 {release} published no usable total population")

    segments = []
    for label in _RACE_LABELS:
        cell = _cell_by_label(b02001, label)
        value = _as_int(cell["value"])
        if value is None:
            raise AncestryError(f"B02001 {release} cell {label!r} published no estimate")
        moe_cell = _cell_by_label(b02001, label.replace("Estimate!!", "Margin of Error!!"))
        segments.append(
            {
                "category": label.split("!!")[-1].rstrip(":"),
                "label": label,
                "variable": cell["variable"],
                "count": value,
                "share": value / total,
                "margin_of_error": _as_int(moe_cell["value"]),
                "margin_of_error_published": bool(moe_cell["published"]),
            }
        )

    summed = sum(s["count"] for s in segments)
    if summed != total:
        raise AncestryError(
            f"B02001 {release} race categories sum to {summed} against a published "
            f"total of {total}; the stack would not describe the whole population"
        )

    hispanic_label = (
        "Estimate!!HISPANIC OR LATINO AND RACE!!Total population!!"
        "Hispanic or Latino (of any race)"
    )
    hispanic = _cell_by_label(dp05, hispanic_label)
    hispanic_count = _as_int(hispanic["value"])

    return {
        "release": release,
        "dataset": b02001["dataset"],
        "geography": b02001["geography"],
        "tables": ["B02001", "B02015", "DP05"],
        "total_population": total,
        "total_variable": total_cell["variable"],
        "segments": segments,
        "hispanic_or_latino": {
            "label": hispanic_label,
            "variable": hispanic["variable"],
            "count": hispanic_count,
            "share": (hispanic_count / total) if hispanic_count else None,
            "note": (
                "Hispanic or Latino origin cross-cuts every race category in ACS, so "
                "this figure is reported beside the race stack and is never a segment "
                "of it. Adding it would count the same residents twice."
            ),
        },
        "category_note": (
            "ACS categories are self-identified race and ethnicity, which are social "
            "categories and not genetic ancestry."
        ),
    }
