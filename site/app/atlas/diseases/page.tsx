import Link from "next/link";

import { listDiseases } from "@/lib/data";

export default async function DiseasesIndexPage(): Promise<JSX.Element> {
  const diseases = await listDiseases();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Diseases</h1>
        <p className="mt-2 text-textSecondary">
          Atlas disease entries with genetic architecture, exposure modifiers, tissue context, and evidence tables.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {diseases.map((disease) => (
          <Link
            href={`/atlas/diseases/${disease.slug}`}
            key={disease.slug}
            className="content-card no-underline hover:-translate-y-0.5 transition-transform"
          >
            <h2 className="section-title">{disease.name}</h2>
            <p className="mt-2 text-sm text-textSecondary">{disease.summary.slice(0, 160)}...</p>
            <p className="mt-2 text-xs text-textSecondary">ICD-11: {disease.icd11_code}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
