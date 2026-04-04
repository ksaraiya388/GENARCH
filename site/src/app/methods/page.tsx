import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";

export default function MethodsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-10">
        <Breadcrumbs items={[{ label: "Methods" }]} />

        <header>
          <h1 className="text-h1 text-surface-white">Methods</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Data sources, transformations, scoring rules, pipeline architecture,
            and limitations for the GENARCH atlas.
          </p>
        </header>

        {/* ── Data Sources ── */}
        <section aria-labelledby="data-sources-heading">
          <h2 id="data-sources-heading" className="text-h2 text-surface-white mb-3">
            Data Sources
          </h2>
          <div className="space-y-4 text-cool-light">
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-1">GWAS Catalog</h3>
              <p className="text-sm">
                Variant-disease associations from the EBI GWAS Catalog, filtered
                by genome-wide significance (p &lt; 5 &times; 10<sup>&minus;8</sup>).
                Accessed via bulk download. Associations are curated per disease
                module, with ancestry composition and replication status annotated
                for each top locus.
              </p>
            </div>
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-1">GTEx Portal (v8)</h3>
              <p className="text-sm">
                Tissue-specific gene expression (TPM) and cis-eQTL data from the
                Genotype-Tissue Expression project, version 8. Used to annotate
                tissue context and regulatory variant effects. Multi-tissue
                expression profiles inform tissue relevance scoring for each
                gene&ndash;disease association.
              </p>
            </div>
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-1">CDC PLACES</h3>
              <p className="text-sm">
                County and census-tract level health prevalence estimates from the
                CDC PLACES dataset (2023 release). Used for community module health
                burden metrics, including asthma prevalence, cardiovascular disease
                estimates, and mental health indicators at sub-county resolution.
              </p>
            </div>
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-1">EPA AQS / AirNow</h3>
              <p className="text-sm">
                Air quality monitoring data including annual mean PM2.5
                concentrations from Federal Reference Method monitors within the
                EPA Air Quality System. Used for exposure characterization and
                community exposure layers. Monitor-level data is spatially
                interpolated for county-level estimates.
              </p>
            </div>
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-1">USDA Food Access Research Atlas</h3>
              <p className="text-sm">
                Census-tract level food access indicators (2023 release). Used for
                food desert mapping in the community module, including low-access
                tract percentages and distance-to-supermarket metrics.
              </p>
            </div>
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-1">KEGG / Reactome</h3>
              <p className="text-sm">
                Biological pathway databases used for gene&ndash;pathway membership
                annotation. KEGG pathway identifiers (e.g., hsa04064 for NF-kB)
                and Reactome stable IDs provide canonical pathway definitions.
                Gene membership is verified against current database releases.
              </p>
            </div>
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-1">Literature Curation</h3>
              <p className="text-sm">
                Manual review of peer-reviewed publications for exposure modifiers,
                mechanism hypotheses, and gene&ndash;environment interaction
                evidence. Each curated claim is tagged with a citation ID traceable
                to the references section of the relevant entity page. Curation
                prioritizes systematic reviews, meta-analyses, and large cohort
                studies.
              </p>
            </div>
          </div>
        </section>

        {/* ── Pipeline Architecture ── */}
        <section aria-labelledby="pipeline-heading">
          <h2 id="pipeline-heading" className="text-h2 text-surface-white mb-3">
            Pipeline Architecture
          </h2>
          <p className="text-cool-light mb-4">
            The GENARCH data pipeline is a 6-stage ETL system implemented in
            Python 3.11+ with Pydantic validation at every stage. The pipeline is
            deterministic: identical inputs produce identical outputs.
          </p>
          <div className="space-y-3">
            {[
              {
                stage: "Stage 1 — Ingest",
                desc: "Parse source files (CSV, TSV, JSON) from pipeline/sources/ into standardized Pydantic models. Every source file has a manifest entry recording origin URL, download date, license, and format.",
              },
              {
                stage: "Stage 2 — Normalize",
                desc: "Map gene symbols to HGNC official nomenclature. Standardize variant IDs to rsID format. Slugify disease and exposure names for URL-safe identifiers. Generate citation IDs using author-year-suffix convention.",
              },
              {
                stage: "Stage 3 — Annotate",
                desc: "Enrich entities with curated context: variant-to-gene mapping, tissue annotations derived from GTEx expression data, and pathway membership from KEGG/Reactome. This curated annotation layer encodes biological reasoning that connects statistical signals to molecular mechanisms.",
              },
              {
                stage: "Stage 4 — Score",
                desc: "Compute strength (0.0–1.0) and confidence (low/medium/high) per edge using the scoring formula described below. Scores are deterministic functions of the evidence signals available for each association.",
              },
              {
                stage: "Stage 5 — Emit",
                desc: "Serialize validated entities to JSON in the data/ directory. Assemble the knowledge graph (graph.json) from all entity relationships, with full edge attribute metadata.",
              },
              {
                stage: "Stage 6 — Validate",
                desc: "Blocking validation gate. Enforces JSON schema conformance, cross-link integrity (all referenced slugs resolve), citation existence, slug-filename consistency, completeness checks, and graph integrity (no orphan edges). Pipeline fails if any validation check does not pass.",
              },
            ].map((s) => (
              <div key={s.stage} className="card">
                <h3 className="text-h3 text-surface-white mb-1">{s.stage}</h3>
                <p className="text-sm text-cool-light">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-cool-light text-sm mt-4">
            All pipeline runs are versioned and documented in the{" "}
            <Link href="/updates" className="text-teal-primary hover:text-teal-soft hover:underline">
              Updates
            </Link>{" "}
            section.
          </p>
        </section>

        {/* ── Strength Scoring Algorithm ── */}
        <section aria-labelledby="scoring-heading">
          <h2 id="scoring-heading" className="text-h2 text-surface-white mb-3">
            Strength Scoring Algorithm
          </h2>
          <p className="text-cool-light mb-4">
            Every edge in the knowledge graph carries a strength score
            (0.0&ndash;1.0) computed as a weighted sum of evidence signals:
          </p>
          <div className="card font-mono text-sm text-surface-white mb-4">
            <p className="mb-3">
              strength = 0.4 &times; gwas_signal + 0.25 &times; eqtl_signal + 0.2 &times; pathway_membership + 0.15 &times; literature_support
            </p>
            <div className="space-y-2 text-cool-light font-sans text-sm">
              <p>
                <strong className="text-surface-white">gwas_signal:</strong>{" "}
                Derived from &minus;log<sub>10</sub>(p-value), capped at 20 and
                scaled to [0,&thinsp;1]. A GWAS association at p = 10<sup>&minus;8</sup>{" "}
                yields gwas_signal = 0.4; at p = 10<sup>&minus;20</sup> or below,
                gwas_signal = 1.0.
              </p>
              <p>
                <strong className="text-surface-white">eqtl_signal:</strong>{" "}
                Binary (0 or 1) based on presence of a significant cis-eQTL in the
                relevant tissue from GTEx v8. A gene with a confirmed regulatory
                variant in the disease-relevant tissue scores 1.
              </p>
              <p>
                <strong className="text-surface-white">pathway_membership:</strong>{" "}
                Binary (0 or 1) based on curated pathway inclusion in KEGG or
                Reactome for a pathway linked to the disease mechanism.
              </p>
              <p>
                <strong className="text-surface-white">literature_support:</strong>{" "}
                Manual rating (0, 0.5, or 1.0) assigned during curation based on
                quality and quantity of supporting publications. A score of 1.0
                requires multiple independent publications with concordant
                findings.
              </p>
            </div>
          </div>
        </section>

        {/* ── Confidence Rating Rules ── */}
        <section aria-labelledby="confidence-heading">
          <h2 id="confidence-heading" className="text-h2 text-surface-white mb-3">
            Confidence Rating Rules
          </h2>
          <p className="text-cool-light mb-4">
            Confidence is computed from evidence convergence, not subjective
            judgment:
          </p>
          <div className="space-y-3">
            <div className="card border-l-4 border-l-green-400">
              <h3 className="text-h3 text-green-400 mb-1">HIGH</h3>
              <p className="text-sm text-cool-light">
                Supported by two or more independent evidence types (e.g., GWAS +
                eQTL, or GWAS + pathway + literature). Replicated in at least one
                independent cohort or cross-ancestry study. Tissue specificity
                confirmed by expression data.
              </p>
            </div>
            <div className="card border-l-4 border-l-yellow-400">
              <h3 className="text-h3 text-yellow-400 mb-1">MEDIUM</h3>
              <p className="text-sm text-cool-light">
                Supported by one primary evidence type with corroborating
                literature. Not yet replicated cross-ancestry. Tissue context
                inferred but not directly confirmed by expression data.
              </p>
            </div>
            <div className="card border-l-4 border-l-red-400">
              <h3 className="text-h3 text-red-400 mb-1">LOW</h3>
              <p className="text-sm text-cool-light">
                Single evidence source. Inferred from pathway membership or
                literature review without direct statistical support. No tissue
                confirmation. Flagged as hypothesis-generating.
              </p>
            </div>
          </div>
        </section>

        {/* ── Edge Attributes ── */}
        <section aria-labelledby="edge-attrs-heading">
          <h2 id="edge-attrs-heading" className="text-h2 text-surface-white mb-3">
            Edge Attributes
          </h2>
          <p className="text-cool-light mb-4">
            Every relationship in the knowledge graph carries mandatory
            attributes for traceability and reproducibility:
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-white/[0.06] rounded-sm overflow-hidden">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-surface-white">Attribute</th>
                  <th className="text-left px-4 py-2 font-medium text-surface-white">Values</th>
                  <th className="text-left px-4 py-2 font-medium text-surface-white">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {[
                  ["evidence_type", "GWAS | eQTL | literature | pathway | inferred", "Primary evidence source for the relationship"],
                  ["direction", "amplify | buffer | unknown", "Whether the exposure/gene amplifies or buffers disease risk at population level"],
                  ["tissue", "tissue/cell type name(s)", "Tissue or cell type(s) where the relationship is observed"],
                  ["strength", "0.0–1.0", "Composite score computed per scoring algorithm above"],
                  ["confidence", "low | medium | high", "Evidence convergence rating per confidence rules above"],
                  ["sources", "citation IDs", "Reference identifiers for traceability to primary literature"],
                ].map(([attr, vals, desc]) => (
                  <tr key={attr} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-2 font-mono text-teal-primary">{attr}</td>
                    <td className="px-4 py-2 text-cool-light">{vals}</td>
                    <td className="px-4 py-2 text-cool-mid">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Validation Checks ── */}
        <section aria-labelledby="validation-heading">
          <h2 id="validation-heading" className="text-h2 text-surface-white mb-3">
            Validation Checks
          </h2>
          <p className="text-cool-light mb-4">
            The pipeline validation stage (Stage 6) enforces the following checks
            as a blocking gate before data is published:
          </p>
          <ul className="list-disc list-inside space-y-2 text-cool-light">
            <li>
              <strong className="text-surface-white">Schema validation:</strong>{" "}
              All JSON outputs conform to defined schemas (Pydantic models with
              <code className="text-xs bg-white/[0.06] px-1 rounded"> extra=&quot;forbid&quot;</code>).
            </li>
            <li>
              <strong className="text-surface-white">Cross-link integrity:</strong>{" "}
              Every referenced slug (disease, exposure, gene, pathway) resolves to
              an existing entity file.
            </li>
            <li>
              <strong className="text-surface-white">Citation existence:</strong>{" "}
              Every citation ID referenced in evidence tables, edges, and briefs
              maps to a formatted reference entry.
            </li>
            <li>
              <strong className="text-surface-white">Completeness:</strong>{" "}
              Every disease requires at least one exposure modifier, one top locus,
              one tissue entry, and non-empty population equity notes.
            </li>
            <li>
              <strong className="text-surface-white">Graph integrity:</strong>{" "}
              No orphan edges (every edge source and target must exist as a node
              in the graph).
            </li>
            <li>
              <strong className="text-surface-white">Brief frontmatter validity:</strong>{" "}
              All mechanism brief files pass schema checks on required fields
              (slug, title, question, related_disease, related_exposure,
              references).
            </li>
          </ul>
        </section>

        {/* ── Limitations ── */}
        <section aria-labelledby="limitations-heading">
          <h2 id="limitations-heading" className="text-h2 text-surface-white mb-3">
            Limitations
          </h2>
          <div className="space-y-3 text-cool-light">
            <p>
              GWAS and eQTL data remain predominantly European-ancestry; transferability
              to non-European populations is limited and explicitly noted per disease
              module in the Population Equity Notes section.
            </p>
            <p>
              Exposure proxies (e.g., county-level PM2.5 annual means from fixed
              monitors) may not capture individual-level biological exposure. Spatial
              interpolation introduces uncertainty, and temporal averaging masks
              peak exposure events.
            </p>
            <p>
              Mechanism briefs are hypothesis-driven syntheses of existing evidence,
              not experimentally validated causal models. They represent the current
              state of knowledge and are subject to revision.
            </p>
            <p>
              Community module models are trained on state and regional data with
              geographic and temporal limitations. The ecological fallacy applies:
              area-level associations do not imply individual-level effects.
            </p>
            <p>
              Strength scores are composite indices for relative comparison within
              the atlas, not absolute effect sizes suitable for clinical or
              regulatory decision-making.
            </p>
            <p>
              Literature curation reflects available publications and may be subject
              to selection bias, publication bias, and temporal gaps between primary
              research and atlas incorporation.
            </p>
          </div>
        </section>

        <EvidenceLimitations>
          <p className="mb-2">
            The methods described on this page document the current GENARCH
            pipeline. All scores, ratings, and classifications are transparent
            and reproducible from the documented rules. This atlas is for
            educational purposes only and does not constitute medical advice.
          </p>
        </EvidenceLimitations>

        <nav aria-label="Methods subpages" className="flex gap-4 pt-6">
          <Link href="/ethics" className="btn-secondary no-underline">
            Ethics Framework
          </Link>
          <Link href="/community/" className="btn-secondary no-underline">
            Model Card (via Community)
          </Link>
        </nav>
      </article>
    </div>
  );
}
