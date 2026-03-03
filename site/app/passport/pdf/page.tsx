import { PassportPdfClient } from "@/components/passport/PassportPdfClient";
import { listCommunityRegions, listDiseases, listExposures } from "@/lib/data";

function splitParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const text = Array.isArray(value) ? value[0] : value;
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function PassportPdfPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<JSX.Element> {
  const [regions, diseases, exposures] = await Promise.all([
    listCommunityRegions(),
    listDiseases(),
    listExposures()
  ]);

  const regionSlug = Array.isArray(searchParams.region) ? searchParams.region[0] : searchParams.region;
  const region = regions.find((entry) => entry.slug === regionSlug);
  const selectedDiseaseSlugs = splitParam(searchParams.diseases);
  const selectedExposureSlugs = splitParam(searchParams.exposures);
  const ageBand = Array.isArray(searchParams.ageBand) ? searchParams.ageBand[0] : searchParams.ageBand;
  const ancestry = Array.isArray(searchParams.ancestry) ? searchParams.ancestry[0] : searchParams.ancestry;

  const selectedDiseases = diseases.filter((entry) => selectedDiseaseSlugs.includes(entry.slug));
  const selectedExposures = exposures.filter((entry) => selectedExposureSlugs.includes(entry.slug));

  const diseaseSummaries = selectedDiseases.map((disease) => ({
    name: disease.name,
    summary: disease.summary,
    keyPoints: [
      `Key loci: ${disease.genetic_architecture.top_loci.map((entry) => entry.gene.toUpperCase()).join(", ")}`,
      `Top exposure modifiers: ${disease.exposure_modifiers.map((entry) => entry.exposure_slug).join(", ")}`,
      "Population-level interpretation only; not individual risk."
    ]
  }));

  const exposureSummaries = selectedExposures.map((exposure) => ({
    name: exposure.name,
    summary: exposure.definition,
    keyPoints: [
      `Systems affected: ${exposure.systems_affected.map((entry) => entry.system).join(", ")}`,
      `Sensitive windows: ${exposure.sensitive_windows.map((entry) => entry.period).join(", ")}`,
      "Use educationally; not a diagnostic output."
    ]
  }));

  const resources =
    region?.resources.map((resource) => ({ name: resource.name, url: resource.url })) ?? [
      { name: "CDC public health resources", url: "https://www.cdc.gov/" }
    ];

  return (
    <PassportPdfClient
      generatedDate={new Date().toISOString().slice(0, 10)}
      regionName={region?.name}
      ageBand={ageBand}
      ancestry={ancestry}
      diseases={diseaseSummaries}
      exposures={exposureSummaries}
      resources={resources}
    />
  );
}
