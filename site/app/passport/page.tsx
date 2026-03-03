import { PassportForm } from "@/components/passport/PassportForm";
import { listCommunityRegions, listDiseases, listExposures } from "@/lib/data";

export default async function PassportPage(): Promise<JSX.Element> {
  const [regions, diseases, exposures] = await Promise.all([
    listCommunityRegions(),
    listDiseases(),
    listExposures()
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Educational Passport</h1>
        <p className="mt-2 text-textSecondary">
          Generate a downloadable educational summary from optional selections only. No login, no storage, and
          no personal risk output.
        </p>
      </section>

      <PassportForm
        regions={regions.map((region) => ({ slug: region.slug, name: region.name }))}
        diseases={diseases.map((disease) => ({ slug: disease.slug, name: disease.name }))}
        exposures={exposures.map((exposure) => ({ slug: exposure.slug, name: exposure.name }))}
      />
    </div>
  );
}
