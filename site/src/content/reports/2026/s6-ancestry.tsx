import {
  Callout,
  Cite,
  N,
  P,
  ReportFigure,
  ReportTable,
  Section,
  Sub,
} from "./bound";

export function AncestryEvidenceBase() {
  return (
    <Section number="6" id="ancestry" title="The ancestry composition of the evidence base">
      <P>
        Everything the atlas says about genetic architecture rests on published
        association studies, and those studies were not conducted in a population that
        resembles Loudoun County. This section measures that gap rather than asserting
        it. It counts who the asthma evidence was measured in, how the associations at
        the atlas&apos;s in-scope asthma loci are distributed across ancestry groups, and
        who lives in the county. All of it is descriptive. No cross-ancestry
        gene-environment effect estimates are reported in this version; they are planned
        for a later phase.
      </P>

      <Sub number="6.1" id="ancestry-selection" title="How the asthma studies were selected">
        <P>
          The trait set is the union of the hierarchical descendants of the MONDO asthma
          term in the MONDO ontology and in EFO, plus both seed terms, plus one retired
          identifier: <N k="ancestry.trait_terms" /> ontology IDs in all{" "}
          <Cite id="ols2026" />. The union is used because the two ontologies disagree
          about the subtree, MONDO&apos;s being larger while EFO carries asthma subtypes
          MONDO does not, and nothing was hand-filtered out of either. Selection against
          the catalog is by identifier only: a row is kept when the last segment of any
          trait URI it names matches one of the set, and no trait name is matched as free
          text anywhere in this module.
        </P>
        <P>
          Two properties of that set should be read together with any share below. The
          retired identifier, the obsolete EFO asthma term, is kept as a seed so that a
          catalog row still carrying it would be matched rather than dropped; in the
          release used it matched nothing. It is one of{" "}
          <N k="ancestry.trait_terms_matching_no_association" /> identifiers in the set
          that matched no association in this release, which are kept so the set stays
          reviewable rather than looking complete: an identifier matching nothing is a
          fact about this release&apos;s curation, not a reason to narrow the selection.
          And of the <N k="ancestry.discovery.association_rows_kept" /> association rows
          the selection keeps, <N k="ancestry.discovery.multi_trait_rows" /> are rows the
          catalog mapped to asthma alongside another trait, mostly from multi-trait and
          pleiotropy analyses. The selection rule keeps those rows and their studies
          contribute their whole samples, so the asthma denominator includes them.
        </P>
      </Sub>

      <Sub number="6.2" id="ancestry-discovery" title="Who the evidence was measured in">
        <P>
          Across <N k="ancestry.discovery.studies" /> asthma studies in the GWAS Catalog
          release of <N k="ancestry.gwas_release_date" />{" "}
          <Cite id="gwascatalog2026" />, the initial-stage discovery samples total{" "}
          <N k="ancestry.discovery.total_individuals" /> individuals, of whom{" "}
          <N k="ancestry.discovery.european.share" /> percent fall in the catalog&apos;s
          European category. The next largest is East Asian at{" "}
          <N k="ancestry.discovery.east_asian.share" /> percent, then African American or
          Afro-Caribbean at <N k="ancestry.discovery.african_american_or_afro_caribbean.share" />{" "}
          percent. South Asian ancestry accounts for{" "}
          <N k="ancestry.discovery.south_asian.share" /> percent of the discovery total.
        </P>
        <Callout title="What that total is, and is not">
          <P>
            The discovery total is a sum of study sample sizes, not a count of distinct
            people. Asthma studies draw repeatedly on the same large cohorts, so a
            participant enrolled in several studies is counted once per study, and a study
            mapped to asthma alongside another trait contributes its whole sample. The
            total is therefore much larger than the number of people who have ever been in
            an asthma study, and it must never be reported as a headcount. What the shares
            describe is how the field&apos;s accumulated asthma evidence is distributed
            across ancestry groups, which is the question this module asks. A row naming
            one broad ancestral category contributes all its individuals to that category;
            a row naming several contributes an equal share to each, because the catalog
            publishes no per-category count within a row. That assumption applies to{" "}
            <N k="ancestry.discovery.multi_category_rows" /> of{" "}
            <N k="ancestry.discovery.rows" /> ancestry rows, carrying{" "}
            <N k="ancestry.discovery.multi_category_share" /> percent of the total, and
            the table repeats every share with those rows dropped so the weight it carries
            is visible rather than asserted.
          </P>
        </Callout>
        <ReportFigure id="F06" />
      </Sub>

      <Sub number="6.3" id="ancestry-loci" title="The in-scope loci, by ancestry of the discovery sample">
        <P>
          Narrowing from the whole evidence base to the{" "}
          <N k="ancestry.loci.count" /> asthma loci the atlas carries gives the same
          picture at higher resolution. Counting associations below the genome-wide
          significance threshold by the broad ancestral category of each study&apos;s
          initial-stage sample, the locus at 17q12-21 carries{" "}
          <N k="ancestry.loci.17q12-21.associations" /> associations across{" "}
          <N k="ancestry.loci.17q12-21.variants" /> distinct variants, of which{" "}
          <N k="ancestry.loci.17q12-21.european.associations" /> have a European discovery
          sample, <N k="ancestry.loci.17q12-21.east_asian.associations" /> East Asian,{" "}
          <N k="ancestry.loci.17q12-21.hispanic_or_latin_american.associations" /> Hispanic
          or Latin American, and{" "}
          <N k="ancestry.loci.17q12-21.south_asian.associations" /> South Asian.
        </P>
        <Callout title="How to read a zero in that row">
          <P>
            That last figure is a gap in the discovery record and nothing else. It says
            that no study declaring an association at this locus had a South Asian
            initial-stage sample, which is a property of who has been studied. It does
            not say, and must not be read to say, that the locus is absent, inactive or
            irrelevant in any population. No study has looked there in a South Asian
            discovery sample, so the record is silent, and silence is not evidence of
            absence. The same holds for every other zero in the table.
          </P>
        </Callout>
        <ReportTable id="T11" />
        <P>
          One association counts once per broad ancestral category of its study&apos;s
          initial-stage sample, so the per-category counts do not sum to the association
          total where a discovery sample names more than one category. An association is
          assigned to a locus when any symbol in the catalog&apos;s own mapped-gene
          annotation for that association matches one of the locus&apos;s gene symbols;
          the authors&apos; own reported-gene field is deliberately not used, because it
          is not a controlled field. No genomic window is applied, because a window needs
          a genome build the extract does not state per row.
        </P>
        <P>
          What this implies for the atlas is a transferability caveat, not a correction to
          any locus. An evidence base measured overwhelmingly in one ancestry group
          yields effect estimates whose portability to other groups is uncertain, and
          polygenic scores built on it lose accuracy as the target population&apos;s
          ancestry moves away from the discovery sample&apos;s{" "}
          <Cite id="martin2019" />
          <Cite id="duncan2019" />
          <Cite id="prive2022" />
          <Cite id="ding2023" />. The loss is continuous rather than categorical, so it
          cannot be fixed by a correction factor per group{" "}
          <Cite id="ding2023" />. Increasing the diversity of discovery samples is the
          only measure that addresses it{" "}
          <Cite id="fatumo2022" />
          <Cite id="kachuri2024" />, and population descriptors used in genomics are
          social as well as genetic categories, which is a further reason not to read a
          category label as a biological fact{" "}
          <Cite id="nasem2023" />.
        </P>
      </Sub>

      <Sub number="6.4" id="ancestry-county" title="The county the atlas serves">
        <P>
          Loudoun County has <N k="ancestry.acs.total_population" /> residents on the ACS{" "}
          <N k="ancestry.acs.release" /> 5-year estimates{" "}
          <Cite id="acs2024" />. By self-identified race,{" "}
          <N k="ancestry.acs.white_alone.share" /> percent are White alone,{" "}
          <N k="ancestry.acs.asian_alone.share" /> percent Asian alone,{" "}
          <N k="ancestry.acs.two_or_more_races.share" /> percent two or more races and{" "}
          <N k="ancestry.acs.black_or_african_american_alone.share" /> percent Black or
          African American alone; <N k="ancestry.acs.hispanic_or_latino.share" /> percent
          are of Hispanic or Latino origin, which cross-cuts every race category and so
          is not part of that stack.
        </P>
        <Callout title="Two different measurements">
          <P>
            ACS categories are self-identified race and ethnicity, which are social
            categories and not genetic ancestry. They are shown only to describe the
            population the atlas is meant to serve, and the county counts cannot be set
            against the discovery shares above as two values of one quantity: one counts
            residents grouped by a social category, the other counts enrolments grouped by
            genetic ancestry. The figure gives the two panels separate axes for that
            reason.
          </P>
        </Callout>
        <ReportTable id="T12" />
        <P>
          Two release notes belong with that table. It reads the ACS{" "}
          <N k="ancestry.acs.release" /> 5-year release, retrieved for this module. The
          atlas page on ancestry and equity still reads the 2023 release, so the report
          and that page state county counts from two different vintages; both name their
          vintage, and aligning them is on the roadmap.
        </P>
        <P>
          The second note concerns the GWAS shares rather than the county counts. The
          atlas page states an all-trait participant share transcribed from the GWAS
          Diversity Monitor dashboard at its September 2024 snapshot{" "}
          <Cite id="mills2020" />. The share in this report is computed from the catalog
          release named above, over asthma studies only, counting initial-stage discovery
          individuals. The two measure different things: the denominators differ in trait
          scope, in stage, in provenance and in the category framework, so a difference
          between them measures the distance between two definitions and nothing else.
          Neither can be substituted for the other, and the comparison is tabulated in
          the project audit. This is not a correction of the page.
        </P>
      </Sub>
    </Section>
  );
}
