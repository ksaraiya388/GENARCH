import { notFound } from "next/navigation";
import { getCommunityRegion, getCommunityRegionSlugs } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";
import Link from "next/link";
import { CommunityRegionDetail } from "@/components/CommunityRegionDetail";

export async function generateStaticParams() {
  const slugs = getCommunityRegionSlugs();
  return slugs.map((region) => ({ region }));
}

export default async function CommunityRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const data = getCommunityRegion(region);
  if (!data) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-10">
        <Breadcrumbs
          items={[
            { label: "Community Module", href: "/community/" },
            { label: data.name },
          ]}
        />

        <header>
          <h1 className="text-h1 text-surface-white">{data.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-cool-mid mt-2">
            <span className="capitalize">Geo level: {data.geo_level}</span>
            {data.fips_code && <span>FIPS: {data.fips_code}</span>}
            {data.last_updated && (
              <span>Last update: {new Date(data.last_updated).toLocaleDateString()}</span>
            )}
          </div>
        </header>

        <CommunityRegionDetail region={data} />

        <EvidenceLimitations>
          <p className="mb-2">
            Community estimates are population-level and do not imply individual
            risk. Model outputs have uncertainty; see model card for details.
          </p>
          <p>{data.limitations}</p>
        </EvidenceLimitations>
      </article>
    </div>
  );
}
