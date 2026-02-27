import { getAllExposures } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import Link from "next/link";

export default function AtlasExposuresPage() {
  const exposures = getAllExposures();

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Atlas", href: "/atlas" },
          { label: "Exposures", href: "/atlas/exposures" },
        ]}
      />
      <h1 className="text-h1 text-genarch-text">Exposures</h1>
      <p className="text-genarch-subtext max-w-2xl">
        Browse environmental exposures in the GENARCH atlas — definitions,
        proxies, biological systems affected, sensitive developmental windows,
        and gene–environment interaction highlights. Population-level summaries
        only; not for individual risk assessment.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {exposures.map((exposure) => (
          <Link
            key={exposure.slug}
            href={`/atlas/exposures/${exposure.slug}`}
            className="card block no-underline transition-shadow hover:shadow-md"
          >
            <h2 className="text-h3 text-genarch-text mb-2">{exposure.name}</h2>
            <p className="text-sm text-genarch-subtext line-clamp-2 mb-4">
              {exposure.definition}
            </p>
            <div className="text-xs text-genarch-subtext">
              {exposure.proxies?.length ?? 0} proxy/proxies ·{" "}
              {exposure.systems_affected?.length ?? 0} systems affected
            </div>
          </Link>
        ))}
      </div>
      {exposures.length === 0 && (
        <p className="text-genarch-subtext italic">No exposures in the atlas yet.</p>
      )}
    </div>
  );
}
