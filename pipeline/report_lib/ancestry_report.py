"""The ancestry module's report outputs: ancestry.* keys, T10, T11, T12.

Separate from `pipeline/report.py` because that file is already long and because
this module's inputs are pinned under their own `ancestry_inputs` block in
FREEZE.json. The F06 figure lives in `pipeline/report_lib/figures.py` with every
other figure; `pipeline/report.py` composes its caption and alt text.

Unlike the atlas half, the ancestry keys go into `numbers.json` rather than a
file of their own: report prose cites them through the `<N>` component like any
other number, and nothing about them is provisional in the way the atlas counts
were while the graph rebuild was outstanding.
"""

from __future__ import annotations

from pipeline.report_lib import ancestry, tables
from pipeline.report_lib.freeze import Freeze, FreezeError
from pipeline.report_lib.numbers import NumberRegistry

# Stated wherever this module reports a number, because the module sits next to
# transferability prose that does report per-group metrics from the literature.
ANCESTRY_CAVEAT = (
    "Descriptive only. These are counts of people enrolled and associations declared, "
    "not effect estimates: no cross-ancestry gene-environment effect is computed in v1 "
    "(CONTEXT.md X7)."
)

# Required verbatim on F06 and repeated on every ACS surface in this module.
# Written once and referenced, so two copies cannot drift apart.
ACS_CATEGORY_SENTENCE = (
    "ACS categories are self-identified race and ethnicity, which are social "
    "categories and not genetic ancestry. They are shown only to describe the "
    "population the atlas is meant to serve."
)

# The live page and the report read different sources for GWAS ancestry share, so
# the report says so wherever it states one (AUDIT.md, 2026-11-03).
METHOD_DIVERGENCE = (
    "The atlas page /ancestry-equity states an all-trait GWAS participant share "
    "transcribed from the GWAS Diversity Monitor dashboard. The share here is computed "
    "from the GWAS Catalog release named below, over asthma studies only, counting "
    "initial-stage discovery individuals. The two are different quantities with "
    "different denominators and are not comparable; the comparison is tabulated in "
    "docs/report-2026/AUDIT.md."
)

STATE_FIPS_LABEL = "51 (Virginia)"
COUNTY_FIPS_LABEL = "107 (Loudoun)"

# F06's limitation block. The DEQ CFR quotation is deliberately not used here:
# it is a statement about low-cost air sensors and says nothing about a study
# population or a census table, so attaching it to this figure would attribute to
# Virginia DEQ a limitation on data it did not publish. CONTEXT.md section 3
# requires that quotation on every sensor-data figure, and F06 carries none.
FIGURE_LIMITATION = (
    "Descriptive only, and not an effect estimate: these are counts of people "
    "enrolled and associations declared, and v1 computes no cross-ancestry "
    "gene-environment effect (CONTEXT.md X7). The discovery composition is the "
    "composition of the published evidence base, not of any population: a category "
    "with few individuals means the evidence was measured in few people from it, "
    "which is a property of who was studied and not of anyone's genome. Because the "
    "asthma evidence base is predominantly European, every locus count here rests "
    "mostly on European-ancestry discovery samples, and findings from that base "
    "transfer unevenly to other groups. A study sample naming several broad ancestral "
    "categories is split equally across them, because the catalog publishes no "
    "per-category count within a row. The discovery total is a sum of study sample "
    "sizes and not a headcount: asthma studies draw repeatedly on the same cohorts, so "
    "a participant in several studies is counted once per study. "
    + ACS_CATEGORY_SENTENCE
)

GWAS_LOOKUPS = (
    "pipeline/lookups/asthma_trait_terms.json",
    "pipeline/lookups/gwas_ancestry_categories.json",
)
LOCI_LOOKUPS = (
    "pipeline/lookups/asthma_trait_terms.json",
    "pipeline/lookups/asthma_loci.json",
)


def _inputs(fz: Freeze, rel_paths) -> list[dict]:
    return [
        {"source": e.rel_path, "sha256": e.sha256}
        for e in (fz.ancestry_entry(rel) for rel in sorted(set(rel_paths)))
    ]


def _release_inputs(fz: Freeze) -> list[dict]:
    """The uncommitted full downloads, as hash plus dated origin URL.

    D30 keeps these out of git, so there is no path to stamp. What is stamped is
    the release they attest, which is the whole of what a reader needs to check
    an extract without storing 120 MB.
    """
    return [
        {
            "source": f"{entry['origin_url']} (full download, not stored; D30)",
            "sha256": entry["sha256"],
        }
        for entry in fz.ancestry_full_downloads()
    ]


def compute(fz: Freeze) -> dict:
    """Recompute the three ancestry findings from the pinned inputs."""
    release = fz.ancestry_release()
    acs_release = fz.ancestry_inputs()["acs_release"]
    discovery = ancestry.discovery_composition()
    if discovery["release_date"] != release:
        raise FreezeError(
            f"the extract manifest names release {discovery['release_date']} but "
            f"FREEZE.json pins {release}"
        )
    return {
        "release": release,
        "acs_release": acs_release,
        "discovery": discovery,
        "loci": ancestry.loci_by_ancestry(),
        "acs": ancestry.acs_context(acs_release),
    }


def build_numbers(fz: Freeze, anc: dict, reg: NumberRegistry) -> None:
    """Add every ancestry.* key to the shared registry."""
    release = anc["release"]
    discovery = anc["discovery"]
    loci = anc["loci"]
    acs = anc["acs"]

    anc_extract = [e.rel_path for e in fz.ancestry_files("gwas_ancestry_extract")]
    assoc_extract = [e.rel_path for e in fz.ancestry_files("gwas_association_extract")]
    acs_files = [e.rel_path for e in fz.ancestry_files("acs_release")]

    discovery_inputs = _inputs(fz, [*anc_extract, *GWAS_LOOKUPS]) + _release_inputs(fz)
    loci_inputs = (
        _inputs(fz, [*assoc_extract, *anc_extract, *LOCI_LOOKUPS]) + _release_inputs(fz)
    )
    acs_inputs = _inputs(fz, acs_files)

    window = (
        f"GWAS Catalog release {release}, asthma studies selected by ontology ID, "
        f"{discovery['stage']}-stage samples"
    )

    reg.add(
        "ancestry.gwas_release_date",
        release,
        method="dated GWAS Catalog release the committed extracts were cut from. The "
        "`latest` alias is re-pointed every month, so it is never recorded as an "
        "origin (DECISIONS.md D30)",
        inputs=_release_inputs(fz),
    )
    reg.add(
        "ancestry.method_divergence",
        METHOD_DIVERGENCE,
        method="recorded so that no reader takes the report's asthma-specific share and "
        "the live page's all-trait share for two values of one quantity",
    )
    reg.add(
        "ancestry.trait_terms",
        len(ancestry.asthma_term_ids()),
        unit="ontology IDs",
        precision=0,
        method="asthma ontology IDs the extraction selects on, resolved from OLS by "
        "scripts/build_asthma_trait_terms.py. Selection is by ID only: no trait name is "
        "matched as free text anywhere in this module",
        inputs=_inputs(fz, ["pipeline/lookups/asthma_trait_terms.json"]),
    )

    # ------------------------------------------------- 3a discovery composition
    reg.add(
        "ancestry.discovery.studies",
        discovery["studies"],
        unit="studies",
        precision=0,
        window=window,
        method="distinct STUDY ACCESSION values carrying an initial-stage ancestry row "
        "in the asthma ancestry extract",
        inputs=discovery_inputs,
    )
    reg.add(
        "ancestry.discovery.total_individuals",
        discovery["total_individuals"],
        unit="individuals",
        precision=0,
        window=window,
        method="sum of NUMBER OF INDIVIDUALS over initial-stage ancestry rows. "
        + discovery["denominator_note"]
        + " "
        + discovery["split_rule"],
        inputs=discovery_inputs,
    )
    reg.add(
        "ancestry.discovery.rows",
        discovery["rows"],
        unit="ancestry rows",
        precision=0,
        window=window,
        method="initial-stage rows in the asthma ancestry extract. Rows are not "
        "deduplicated by study, because a study contributing two rows is describing two "
        "parts of its sample",
        inputs=discovery_inputs,
    )
    reg.add(
        "ancestry.discovery.rows_without_individuals",
        discovery["rows_without_n"],
        unit="ancestry rows",
        precision=0,
        window=window,
        method="initial-stage rows whose NUMBER OF INDIVIDUALS is absent or unparseable; "
        "these contribute to no count and no share",
        inputs=discovery_inputs,
    )
    reg.add(
        "ancestry.discovery.multi_category_rows",
        discovery["multi_category_rows"],
        unit="ancestry rows",
        precision=0,
        window=window,
        method="initial-stage rows naming more than one broad ancestral category, which "
        "are the rows the equal split applies to. " + discovery["delimiter_rule"],
        inputs=discovery_inputs,
    )
    reg.add(
        "ancestry.discovery.multi_category_share",
        discovery["multi_category_share_of_total"] * 100,
        unit="percent of discovery individuals",
        precision=2,
        window=window,
        method="share of discovery individuals sitting in a multi-category row, so the "
        "weight the equal split carries is visible rather than asserted",
        inputs=discovery_inputs,
    )
    for row in discovery["categories"]:
        key = ancestry.slug(row["category"])
        reg.add(
            f"ancestry.discovery.{key}.individuals",
            row["individuals"],
            unit="individuals",
            precision=1,
            window=window,
            method="initial-stage discovery individuals in this broad ancestral "
            "category. " + discovery["split_rule"],
            inputs=discovery_inputs,
        )
        reg.add(
            f"ancestry.discovery.{key}.share",
            row["share"] * 100,
            unit="percent of discovery individuals",
            precision=2,
            window=window,
            method="this category's discovery individuals over the discovery total",
            inputs=discovery_inputs,
        )
    reg.add(
        "ancestry.discovery.largest_category",
        discovery["categories"][0]["category"],
        window=window,
        method="the broad ancestral category holding the largest share of discovery "
        "individuals",
        inputs=discovery_inputs,
    )

    # ----------------------------------------------------------------- 3b loci
    reg.add(
        "ancestry.loci.threshold",
        loci["threshold"],
        unit="p-value",
        window=window,
        method="genome-wide significance threshold. A convention for declaring an "
        "association, not a measure of effect size (CONTEXT.md X7)",
        inputs=loci_inputs,
    )
    reg.add(
        "ancestry.loci.associations_significant",
        loci["associations_significant"],
        unit="associations",
        precision=0,
        window=window,
        method=f"asthma associations in the extract with P-VALUE below "
        f"{loci['threshold']:g}, at any locus",
        inputs=loci_inputs,
    )
    for locus in loci["loci"]:
        reg.add(
            f"ancestry.loci.{locus['id']}.associations",
            locus["associations"],
            unit="associations",
            precision=0,
            window=window,
            method="genome-wide-significant asthma associations mapped to "
            f"{locus['label']}. " + loci["locus_rule"],
            inputs=loci_inputs,
        )
        reg.add(
            f"ancestry.loci.{locus['id']}.variants",
            locus["distinct_variants"],
            unit="variants",
            precision=0,
            window=window,
            method=f"distinct SNPS values among those associations at {locus['label']}",
            inputs=loci_inputs,
        )
        for category, count in locus["by_category"].items():
            reg.add(
                f"ancestry.loci.{locus['id']}.{ancestry.slug(category)}.associations",
                count,
                unit="associations",
                precision=0,
                window=window,
                method=f"genome-wide-significant associations at {locus['label']} whose "
                "study's initial-stage sample names this category. "
                + loci["counting_rule"],
                inputs=loci_inputs,
            )

    # ------------------------------------------------------------------ 3c ACS
    acs_window = f"{acs['dataset']}, {acs['geography']}"
    reg.add(
        "ancestry.acs.release",
        acs["release"],
        method="the ACS 5-year release the county composition is read from. "
        + ACS_CATEGORY_SENTENCE,
        inputs=acs_inputs,
    )
    reg.add(
        "ancestry.acs.total_population",
        acs["total_population"],
        unit="residents",
        precision=0,
        window=acs_window,
        method=f"B02001 table total ({acs['total_variable']}), selected by the release's "
        "own label text and never by variable code",
        inputs=acs_inputs,
    )
    for segment in acs["segments"]:
        key = ancestry.slug(segment["category"])
        reg.add(
            f"ancestry.acs.{key}.count",
            segment["count"],
            unit="residents",
            precision=0,
            window=acs_window,
            method=f"B02001 {segment['variable']}, label {segment['label']}. "
            + ACS_CATEGORY_SENTENCE,
            inputs=acs_inputs,
        )
        reg.add(
            f"ancestry.acs.{key}.share",
            segment["share"] * 100,
            unit="percent of county residents",
            precision=2,
            window=acs_window,
            method="this category's count over the B02001 table total. "
            + ACS_CATEGORY_SENTENCE,
            inputs=acs_inputs,
        )
    hispanic = acs["hispanic_or_latino"]
    reg.add(
        "ancestry.acs.hispanic_or_latino.count",
        hispanic["count"],
        unit="residents",
        precision=0,
        window=acs_window,
        method=f"DP05 {hispanic['variable']}. " + hispanic["note"],
        inputs=acs_inputs,
    )
    reg.add(
        "ancestry.acs.hispanic_or_latino.share",
        hispanic["share"] * 100,
        unit="percent of county residents",
        precision=2,
        window=acs_window,
        method="DP05 Hispanic or Latino count over the B02001 table total. "
        + hispanic["note"],
        inputs=acs_inputs,
    )


def build_tables(anc: dict) -> list[tables.Table]:
    """T10, T11 and T12."""
    release = anc["release"]
    discovery = anc["discovery"]
    loci = anc["loci"]
    acs = anc["acs"]
    source_note = (
        f"GWAS Catalog release {release}, asthma extract cut by "
        "scripts/fetch_gwas_catalog.py on the ontology IDs in "
        "pipeline/lookups/asthma_trait_terms.json."
    )

    single = {r["category"]: r["share"] for r in discovery["shares_single_category_only"]}
    t10 = tables.Table(
        "T10_gwas_ancestry_composition",
        "Asthma GWAS discovery samples by broad ancestral category",
        "Initial-stage discovery individuals across the asthma studies in the GWAS "
        f"Catalog {release} release, by the catalog's own broad ancestral category. "
        + discovery["denominator_note"]
        + " "
        + discovery["split_rule"]
        + " "
        + discovery["delimiter_rule"]
        + " The last column repeats each share with multi-category rows dropped, so the "
        "weight the equal split carries is visible rather than asserted. "
        + ANCESTRY_CAVEAT
        + " "
        + METHOD_DIVERGENCE,
        source_note,
        {
            "Discovery individuals": "count",
            "Share": "percent",
            "Share, single-category rows only": "percent",
        },
        [
            "Broad ancestral category",
            "Discovery individuals",
            "Share",
            "Share, single-category rows only",
        ],
        [
            [
                row["category"],
                round(row["individuals"], 1),
                round(row["share"] * 100, 2),
                round(single[row["category"]] * 100, 2)
                if row["category"] in single
                else "no single-category rows",
            ]
            for row in discovery["categories"]
        ],
    )

    categories = loci["categories_present"]
    t11 = tables.Table(
        "T11_loci_by_ancestry",
        "Genome-wide-significant associations at the in-scope asthma loci, by ancestry "
        "of the discovery sample",
        f"Associations with P-VALUE below {loci['threshold']:g} at the five asthma loci "
        f"in v1 scope, from the GWAS Catalog {release} release, counted by the broad "
        "ancestral category of each study's initial-stage sample. "
        + loci["counting_rule"]
        + " "
        + loci["locus_rule"]
        + " "
        + ANCESTRY_CAVEAT,
        source_note,
        {
            "Associations": "count",
            "Distinct variants": "count",
            **{category: "count" for category in categories},
            "Associations with no initial-stage ancestry row": "count",
        },
        [
            "Locus",
            "Cytoband",
            "Genes",
            "Associations",
            "Distinct variants",
            *categories,
            "Associations with no initial-stage ancestry row",
        ],
        [
            [
                locus["label"],
                locus["cytoband"],
                " / ".join(locus["gene_symbols"]),
                locus["associations"],
                locus["distinct_variants"],
                *[locus["by_category"].get(category, 0) for category in categories],
                locus["associations_without_initial_stage_category"],
            ]
            for locus in loci["loci"]
        ],
    )

    acs_rows = [
        [
            segment["category"],
            segment["count"],
            round(segment["share"] * 100, 2),
            segment["margin_of_error"]
            if segment["margin_of_error_published"]
            else "not published",
            "yes",
        ]
        for segment in acs["segments"]
    ]
    hispanic = acs["hispanic_or_latino"]
    acs_rows.append(
        [
            "Hispanic or Latino (of any race)",
            hispanic["count"],
            round(hispanic["share"] * 100, 2),
            "see DP05",
            "no",
        ]
    )
    t12 = tables.Table(
        "T12_loudoun_acs_context",
        "Loudoun County population composition",
        f"{acs['dataset']}, {acs['geography']}. "
        + ACS_CATEGORY_SENTENCE
        + " The race categories are mutually exclusive and sum to the table total, which "
        "is what lets them stack in F06. Hispanic or Latino origin cross-cuts every race "
        "category and is listed with 'In race stack' set to no: adding it to the stack "
        "would count the same residents twice. "
        + ANCESTRY_CAVEAT,
        "US Census Bureau, American Community Survey, "
        f"{acs['dataset']}, tables {', '.join(acs['tables'])}, state "
        f"{STATE_FIPS_LABEL} county {COUNTY_FIPS_LABEL}.",
        {"Residents": "count", "Share": "percent", "Margin of error": "count"},
        ["Category", "Residents", "Share", "Margin of error", "In race stack"],
        acs_rows,
    )
    return [t10, t11, t12]


def figure_segments(anc: dict) -> tuple[list[dict], str, list[dict], str]:
    """The two F06 panels: segments and subtitle for each."""
    discovery = anc["discovery"]
    acs = anc["acs"]
    top = [
        {"label": row["category"], "share": row["share"]}
        for row in discovery["categories"]
    ]
    bottom = [
        {"label": segment["category"], "share": segment["share"]}
        for segment in acs["segments"]
    ]
    top_subtitle = (
        f"{discovery['total_individuals']:,} study-sample individuals summed across "
        f"{discovery['studies']} studies (counted once per study, not per person); "
        f"GWAS Catalog release {anc['release']}"
    )
    bottom_subtitle = (
        f"{acs['total_population']:,} residents, {acs['dataset']}, table B02001"
    )
    return top, top_subtitle, bottom, bottom_subtitle
