import Link from "next/link";

import { listExposures } from "@/lib/data";

export default async function ExposureIndexPage(): Promise<JSX.Element> {
  const exposures = await listExposures();
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Exposures</h1>
        <p className="mt-2 text-textSecondary">
          Environmental modifiers with measurable proxies, systems affected, and GxE highlights.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exposures.map((exposure) => (
          <Link
            href={`/atlas/exposures/${exposure.slug}`}
            key={exposure.slug}
            className="content-card no-underline hover:-translate-y-0.5 transition-transform"
          >
            <h2 className="section-title">{exposure.name}</h2>
            <p className="mt-2 text-sm text-textSecondary">{exposure.definition.slice(0, 180)}...</p>
            <p className="mt-2 text-xs text-textSecondary">{exposure.exposure_category}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
