import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface Part {
  label: string;
  body: string;
}

const PARTS: Part[] = [
  {
    label: "Breadcrumbs and title",
    body: "These show where you are. Each page covers one disease at the population level. It is not a personal risk estimate.",
  },
  {
    label: "TL;DR box",
    body: "On the flagship pages, a three-sentence plain version: what the disease is, why it matters in Loudoun, and what the genetics say. Start here.",
  },
  {
    label: "Disease Overview",
    body: "A fuller description of the disease and why it is relevant locally.",
  },
  {
    label: "Genetic Architecture Summary",
    body: "A table of the genes and variants linked to the disease. Each row lists the gene, the variant (an rsID like rs7216389), the GWAS p-value, the type of evidence, and a strength score. Below it you may find a heritability estimate and notes on polygenic risk scores.",
  },
  {
    label: "Exposure Modifier Panel",
    body: "Environmental factors that change risk. The direction column reads amplify (raises risk), buffer (lowers risk), or unknown. Each row also carries a strength value, a confidence badge, and a short mechanism hypothesis.",
  },
  {
    label: "Population Equity Notes",
    body: "The honest caveats. Most GWAS data is European-ancestry, so findings can transfer poorly to Loudoun's South Asian, Black, and Latino residents. This section states the ancestry breakdown, transferability, and known data gaps.",
  },
  {
    label: "Tissue Context",
    body: "Which body tissues the disease's genes act in, ranked by how relevant each one is.",
  },
  {
    label: "Mechanism Brief Links",
    body: "Deeper write-ups of specific mechanisms behind the disease, where they exist.",
  },
  {
    label: "Visualizations",
    body: "The Risk Shift by Exposure Stratum chart shows genetic liability expressing more strongly as an exposure rises, measured across the whole population. Its caption says it plainly: population-level data only, not a prediction for you. A tissue relevance chart sits alongside it.",
  },
  {
    label: "Evidence, limitations, and references",
    body: "The receipts. An evidence-and-limitations box states what the page can and cannot support, and the reference list gives the full source behind every claim.",
  },
];

const LABELS: Part[] = [
  {
    label: "Confidence",
    body: "High means several independent methods agree. Medium means one main line of evidence plus support. Low means a single hint, flagged rather than settled.",
  },
  {
    label: "Strength",
    body: "How strong the support is, on a 0 to 1 scale. High confidence with only modest strength is normal and fine.",
  },
  {
    label: "Direction",
    body: "Amplify raises risk, buffer lowers it, unknown means the direction is unsettled. Across the site this maps to a color convention: red raises, green lowers, gray is unknown.",
  },
];

export default function HowToReadDiseasePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Breadcrumbs
          items={[
            { label: "Guide" },
            { label: "How to read a disease page" },
          ]}
        />
        <header>
          <h1 className="text-h1 text-surface-white">
            How to read a disease page
          </h1>
          <p className="mt-2 text-cool-light max-w-2xl leading-relaxed">
            Every disease page follows the same layout. Here is what each part
            tells you, top to bottom, and how to read the small labels without a
            genetics background. New to the terms? See the{" "}
            <Link
              href="/glossary"
              className="text-teal-primary hover:text-teal-soft hover:underline"
            >
              glossary
            </Link>
            .
          </p>
        </header>

        <section aria-labelledby="anatomy-heading">
          <h2
            id="anatomy-heading"
            className="text-h2 text-surface-white mb-4"
          >
            The anatomy of a page
          </h2>
          <dl className="space-y-4">
            {PARTS.map((p) => (
              <div key={p.label} className="card">
                <dt className="text-h3 text-surface-white mb-1">{p.label}</dt>
                <dd className="text-sm text-cool-light leading-relaxed">
                  {p.body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="labels-heading">
          <h2
            id="labels-heading"
            className="text-h2 text-surface-white mb-4"
          >
            Reading the labels quickly
          </h2>
          <dl className="space-y-3">
            {LABELS.map((l) => (
              <div key={l.label}>
                <dt className="text-teal-primary font-semibold">{l.label}</dt>
                <dd className="text-sm text-cool-light leading-relaxed">
                  {l.body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="border-l-4 border-l-teal-primary bg-navy-mid/50 rounded-md px-4 py-3 text-sm text-cool-light">
          One rule holds for the whole page: everything here describes
          populations, not individuals, and it is for learning, not diagnosis.
        </p>

        <Link
          href="/atlas/diseases"
          className="text-teal-primary hover:text-teal-soft hover:underline"
        >
          ← Browse the disease atlas
        </Link>
      </div>
    </div>
  );
}
