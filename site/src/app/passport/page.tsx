import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  getAllCommunityRegions,
  getAllDiseases,
  getAllExposures,
} from "@/lib/data";
import { PassportForm } from "@/components/PassportForm";

const AGE_BANDS = [
  { value: "10-14", label: "10–14" },
  { value: "15-18", label: "15–18" },
  { value: "19-24", label: "19–24" },
  { value: "25+", label: "25+" },
];

const ANCESTRY_OPTIONS = [
  { value: "", label: "Prefer not to specify" },
  { value: "european", label: "European" },
  { value: "east-asian", label: "East Asian" },
  { value: "south-asian", label: "South Asian" },
  { value: "african", label: "African" },
  { value: "admixed", label: "Admixed/Multi-ancestry" },
  { value: "other", label: "Other/Unknown" },
];

export default function PassportPage() {
  const regions = getAllCommunityRegions();
  const diseases = getAllDiseases();
  const exposures = getAllExposures();

  const regionOptions = regions.map((r) => ({
    value: r.region_id,
    label: `${r.name} (${r.geo_level})`,
  }));
  const diseaseOptions = diseases.map((d) => ({
    value: d.slug,
    label: d.name,
  }));
  const exposureOptions = exposures.map((e) => ({
    value: e.slug,
    label: e.name,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Educational Passport" }]} />
        <header>
          <h1 className="text-h1 text-surface-white">Educational Passport</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Generate a personalized educational PDF summary. All inputs are
            optional. No data is stored. Population-level information only — never
            implies individual risk.
          </p>
        </header>

        <PassportForm
          regionOptions={regionOptions}
          ageBands={AGE_BANDS}
          ancestryOptions={ANCESTRY_OPTIONS}
          diseaseOptions={diseaseOptions}
          exposureOptions={exposureOptions}
        />

        <footer className="mt-12 pt-6 border-t border-white/[0.06]">
          <p className="text-sm text-amber-400 bg-amber-900/20 p-4 rounded-sm">
            <strong>Disclaimer:</strong> The Educational Passport provides
            population-level summaries for learning only. It does not constitute
            medical advice, predict individual risk, or replace professional
            guidance. No personal data is stored or transmitted.
          </p>
        </footer>
      </div>
    </div>
  );
}
