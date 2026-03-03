"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  slug: string;
  name: string;
}

interface PassportFormProps {
  regions: Option[];
  diseases: Option[];
  exposures: Option[];
}

const ageBands = ["10-14", "15-18", "19-24", "25+"];

export function PassportForm({ regions, diseases, exposures }: PassportFormProps): JSX.Element {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [ancestry, setAncestry] = useState("");
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [selectedExposures, setSelectedExposures] = useState<string[]>([]);

  const steps = useMemo(
    () => [
      { title: "Step 1", subtitle: "Location and age band" },
      { title: "Step 2", subtitle: "Optional ancestry context" },
      { title: "Step 3", subtitle: "Disease and exposure interests" }
    ],
    []
  );

  const toggle = (current: string[], slug: string): string[] =>
    current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];

  const submit = () => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (ageBand) params.set("ageBand", ageBand);
    if (ancestry) params.set("ancestry", ancestry);
    if (selectedDiseases.length) params.set("diseases", selectedDiseases.join(","));
    if (selectedExposures.length) params.set("exposures", selectedExposures.join(","));
    router.push(`/passport/pdf?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step, idx) => (
          <div key={step.title} className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase text-textSecondary">{step.title}</p>
            <p className="text-sm text-textPrimary">{step.subtitle}</p>
            <div className="mt-2 h-1 rounded bg-slate-100">
              <div className="h-1 rounded bg-action" style={{ width: `${(idx + 1) * 33}%` }} />
            </div>
          </div>
        ))}
      </div>

      <section className="content-card">
        <h2 className="section-title">Location and age band</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-textSecondary">
            Region / county / ZIP (optional)
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-textPrimary"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="">Not selected</option>
              {regions.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-textSecondary">
            Age band (optional)
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-textPrimary"
              value={ageBand}
              onChange={(event) => setAgeBand(event.target.value)}
            >
              <option value="">Not selected</option>
              {ageBands.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="content-card">
        <h2 className="section-title">Broad ancestry category (optional)</h2>
        <input
          value={ancestry}
          onChange={(event) => setAncestry(event.target.value)}
          maxLength={50}
          className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Optional broad category (e.g., Multi-ancestry, African ancestry, East Asian)"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="content-card">
          <h2 className="section-title">Disease interests</h2>
          <div className="mt-3 space-y-2 text-sm">
            {diseases.map((disease) => (
              <label key={disease.slug} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDiseases.includes(disease.slug)}
                  onChange={() => setSelectedDiseases((current) => toggle(current, disease.slug))}
                />
                <span>{disease.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="content-card">
          <h2 className="section-title">Exposure interests</h2>
          <div className="mt-3 space-y-2 text-sm">
            {exposures.map((exposure) => (
              <label key={exposure.slug} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedExposures.includes(exposure.slug)}
                  onChange={() => setSelectedExposures((current) => toggle(current, exposure.slug))}
                />
                <span>{exposure.name}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="content-card border-l-4 border-l-passport bg-yellow-50">
        <p className="text-sm text-textSecondary">
          Passport generation is stateless. No account is required, and selections are used only to render
          this educational summary.
        </p>
        <button
          type="button"
          onClick={submit}
          className="mt-3 rounded bg-action px-4 py-2 text-sm font-semibold text-white"
        >
          Continue to Passport Preview
        </button>
      </section>
    </div>
  );
}
