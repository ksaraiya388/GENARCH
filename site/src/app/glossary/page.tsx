import { Breadcrumbs } from "@/components/Breadcrumbs";

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

// Alphabetized. Anchor ids allow deep links (e.g. /glossary#gwas).
const TERMS: GlossaryTerm[] = [
  {
    id: "alarmin",
    term: "Alarmin",
    definition:
      "A signal cells release when they are damaged or stressed, which starts inflammation to defend the area. Helpful briefly, harmful when it will not switch off. IL33 and TSLP are alarmins.",
  },
  {
    id: "allele",
    term: "Allele",
    definition:
      "One of the different versions of a gene or DNA spot. You inherit one copy from each parent, and they can match or differ.",
  },
  {
    id: "ancestry",
    term: "Ancestry / cross-ancestry",
    definition:
      'Your genetic ancestry is the population history carried in your DNA. "Cross-ancestry" asks whether a finding from one population (often European) actually holds in others.',
  },
  {
    id: "cis-eqtl",
    term: "cis-eQTL",
    definition:
      'A DNA variant that changes how strongly a nearby gene is switched on. "Cis" means it acts on a gene close to it on the same chromosome.',
  },
  {
    id: "cohort",
    term: "Cohort",
    definition:
      "A group of people studied together, often over time. Larger, more diverse cohorts give more trustworthy results.",
  },
  {
    id: "confidence-rating",
    term: "Confidence rating (low / medium / high)",
    definition:
      "GENARCH's own label for how solid a claim is, based on how many independent lines of evidence agree. High means several methods point the same way; low means a single hint worth flagging but not settled.",
  },
  {
    id: "confounding",
    term: "Confounding",
    definition:
      "When a hidden third factor makes two things look related even though one does not cause the other. Careful studies try to rule it out.",
  },
  {
    id: "cytokine",
    term: "Cytokine",
    definition:
      "A small protein cells use to talk to each other, mostly to run the immune system. Some cytokines ramp inflammation up, others calm it down.",
  },
  {
    id: "effect-size",
    term: "Effect size",
    definition:
      "How much influence something actually has, not just whether it is real. A variant can be statistically certain yet shift risk only slightly.",
  },
  {
    id: "eqtl",
    term: "eQTL",
    definition:
      "A DNA variant linked to how strongly a gene is expressed. It helps connect a risk variant to the gene it actually affects.",
  },
  {
    id: "epidemiology",
    term: "Epidemiology",
    definition:
      "The study of how often diseases occur across populations and why. It looks at group patterns, not individual diagnosis.",
  },
  {
    id: "exposure",
    term: "Exposure",
    definition:
      "Something in the environment that can affect health, such as air pollution, diet, or limited food access. GENARCH focuses on exposures you could plausibly change.",
  },
  {
    id: "feature-importance",
    term: "Feature importance",
    definition:
      "In a model, a ranking of which inputs matter most to the prediction. See SHAP.",
  },
  {
    id: "gene-expression",
    term: "Gene expression",
    definition:
      "How much a gene is actually switched on in a given cell or tissue. The same gene can be loud in the lung and quiet in the liver.",
  },
  {
    id: "gene-environment-interaction",
    term: "Gene–environment interaction (GxE)",
    definition:
      "When genes and surroundings combine so the effect of one depends on the other. The same pollution can matter more for some genotypes than others.",
  },
  {
    id: "genome-wide-significance",
    term: "Genome-wide significance",
    definition:
      "A strict statistical bar (p < 5×10⁻⁸) a genetic association must clear to count, set high because so many variants are tested at once.",
  },
  {
    id: "gtex",
    term: "GTEx",
    definition:
      "A public reference dataset showing which genes are expressed in which human tissues. GENARCH uses it to add tissue context.",
  },
  {
    id: "gwas",
    term: "GWAS (genome-wide association study)",
    definition:
      "A scan of DNA across many people to find variants more common in those with a disease. It points to regions of interest, not exact causes.",
  },
  {
    id: "heritability",
    term: "Heritability",
    definition:
      "The share of the differences in a trait across a population that ties to genetic differences. It is a population number, not a percentage for any one person.",
  },
  {
    id: "incidence",
    term: "Incidence",
    definition:
      "How many new cases of a condition appear in a population over a set time. Prevalence counts existing cases; incidence counts new ones.",
  },
  {
    id: "locus",
    term: "Locus (plural loci)",
    definition:
      "A specific location on the genome. In GWAS it usually means a region flagged as linked to a trait.",
  },
  {
    id: "nf-kb",
    term: "NF-κB",
    definition:
      "A control switch inside cells that turns on inflammation genes in response to stress or pollution. It shows up as a hub in several disease mechanisms here.",
  },
  {
    id: "odds-ratio",
    term: "Odds ratio",
    definition:
      "A number comparing the odds of disease with a variant versus without. Above 1 means higher odds, below 1 means lower.",
  },
  {
    id: "pathway",
    term: "Pathway",
    definition:
      "A chain of genes and molecules that work together to get something done in a cell. Disease often comes from a pathway being pushed too far.",
  },
  {
    id: "penetrance",
    term: "Penetrance",
    definition:
      "How reliably a variant actually leads to the trait. High penetrance means most carriers show it; low means many do not.",
  },
  {
    id: "pm25",
    term: "PM2.5",
    definition:
      "Fine airborne particles under 2.5 microns, small enough to reach deep into the lungs. Traffic and industry are common local sources.",
  },
  {
    id: "polygenic",
    term: "Polygenic",
    definition:
      "Shaped by many genes at once, each adding a little, rather than one gene deciding the outcome. Most common diseases are polygenic.",
  },
  {
    id: "prevalence",
    term: "Prevalence",
    definition:
      "The share of a population that has a condition at a given time. It is the main way GENARCH describes community health burden.",
  },
  {
    id: "prs",
    term: "PRS (polygenic risk score)",
    definition:
      "A single number that sums the small effects of many variants to estimate genetic predisposition across a population. GENARCH does not compute personal scores, and these scores lose accuracy across ancestries.",
  },
  {
    id: "replication",
    term: "Replication",
    definition:
      "Getting the same result again in a separate, independent study. A finding that replicates is far more trustworthy than one that does not.",
  },
  {
    id: "shap",
    term: "SHAP",
    definition:
      "A method that explains a model's prediction by showing how much each input pushed the result up or down. Positive values raise the predicted burden; negative values lower it.",
  },
  {
    id: "snp-rsid",
    term: "SNP / rsID",
    definition:
      "A SNP is a single-letter difference in DNA between people. Its rsID (like rs7216389) is the standard catalog name for that spot.",
  },
  {
    id: "tissue-specificity",
    term: "Tissue specificity",
    definition:
      "The fact that a gene or mechanism can matter in one tissue but not another. It is why GENARCH ties genes to specific tissues like bronchial epithelium.",
  },
  {
    id: "variant",
    term: "Variant",
    definition:
      "Any place where one person's DNA differs from another's. Some variants do nothing; a few shift disease risk.",
  },
];

export default function GlossaryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Glossary" }]} />
        <header>
          <h1 className="text-h1 text-surface-white">Glossary</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Plain-language definitions for the terms that come up across the
            atlas. Each entry is one or two sentences.
          </p>
        </header>

        <dl className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
          {TERMS.map((t) => (
            <div key={t.id} id={t.id} className="scroll-mt-24">
              <dt className="text-teal-primary font-semibold">{t.term}</dt>
              <dd className="mt-1 text-sm text-cool-light leading-relaxed">
                {t.definition}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
