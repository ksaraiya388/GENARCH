import { getAllDiseases } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import Link from "next/link";

function summarizeConfidence(
  disease: { exposure_modifiers: Array<{ confidence?: string }> }
): "LOW" | "MEDIUM" | "HIGH" {
  const confs = disease.exposure_modifiers
    ?.map((m) => m.confidence?.toUpperCase())
    .filter(Boolean) ?? [];
  if (confs.includes("HIGH")) return "HIGH";
  if (confs.includes("MEDIUM")) return "MEDIUM";
  return "LOW";
}

export default function AtlasDiseasesPage() {
  const diseases = getAllDiseases();

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Atlas", href: "/atlas" },
          { label: "Diseases", href: "/atlas/diseases" },
        ]}
      />
      <h1 className="text-h1 text-genarch-text">Diseases</h1>
      <p className="text-genarch-subtext max-w-2xl">
        Browse diseases in the GENARCH atlas with population-level genetic
        architecture, exposure modifiers, and tissue context. This information
        is for educational purposes and does not imply individual risk.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {diseases.map((disease) => (
          <Link
            key={disease.slug}
            href={`/atlas/diseases/${disease.slug}`}
            className="card block no-underline transition-shadow hover:shadow-md"
          >
            <h2 className="text-h3 text-genarch-text mb-2">{disease.name}</h2>
            <p className="text-sm text-genarch-subtext line-clamp-2 mb-4">
              {disease.summary}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-genarch-subtext">
                {disease.exposure_modifiers?.length ?? 0} exposure modifier
                {(disease.exposure_modifiers?.length ?? 0) !== 1 ? "s" : ""}
              </span>
              <ConfidenceBadge
                tier={summarizeConfidence(disease)}
              />
            </div>
          </Link>
        ))}
      </div>
      {diseases.length === 0 && (
        <p className="text-genarch-subtext italic">No diseases in the atlas yet.</p>
      )}
    </div>
  );
}
