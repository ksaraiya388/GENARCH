"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface PassportFormProps {
  regionOptions: { value: string; label: string }[];
  ageBands: { value: string; label: string }[];
  ancestryOptions: { value: string; label: string }[];
  diseaseOptions: { value: string; label: string }[];
  exposureOptions: { value: string; label: string }[];
}

const STEPS = 6;

export function PassportForm({
  regionOptions,
  ageBands,
  ancestryOptions,
  diseaseOptions,
  exposureOptions,
}: PassportFormProps) {
  const [step, setStep] = useState(1);
  const [region, setRegion] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [ancestry, setAncestry] = useState("");
  const [diseases, setDiseases] = useState<string[]>([]);
  const [exposures, setExposures] = useState<string[]>([]);
  const router = useRouter();

  const toggleMultiSelect = (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (ageBand) params.set("age", ageBand);
    if (ancestry) params.set("ancestry", ancestry);
    diseases.forEach((d) => params.append("disease", d));
    exposures.forEach((e) => params.append("exposure", e));
    return params.toString();
  };

  const handleGenerate = () => {
    const q = buildQuery();
    router.push(`/passport/pdf/${q ? `?${q}` : ""}`);
  };

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="flex gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={STEPS} aria-label="Form progress">
        {Array.from({ length: STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm ${
              i + 1 <= step ? "bg-teal-primary" : "bg-white/[0.06]"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="card">
          <h2 className="text-h2 text-surface-white mb-4">
            Step 1: Region (optional)
          </h2>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full max-w-md border border-white/[0.06] bg-navy-deep rounded-sm px-4 py-2 text-surface-white"
            aria-label="Select region"
          >
            <option value="">— Select region (optional) —</option>
            {regionOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {regionOptions.length === 0 && (
            <p className="text-sm text-cool-mid mt-2">
              No regions available. Leave blank to skip.
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="card">
          <h2 className="text-h2 text-surface-white mb-4">
            Step 2: Age band (optional)
          </h2>
          <div className="flex flex-wrap gap-3">
            {ageBands.map((b) => (
              <label
                key={b.value}
                className="flex items-center gap-2 cursor-pointer text-cool-light"
              >
                <input
                  type="radio"
                  name="ageBand"
                  value={b.value}
                  checked={ageBand === b.value}
                  onChange={() => setAgeBand(b.value)}
                  className="border-white/[0.06]"
                />
                <span>{b.label}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card">
          <h2 className="text-h2 text-surface-white mb-4">
            Step 3: Ancestry category (optional)
          </h2>
          <select
            value={ancestry}
            onChange={(e) => setAncestry(e.target.value)}
            className="w-full max-w-md border border-white/[0.06] bg-navy-deep rounded-sm px-4 py-2 text-surface-white"
            aria-label="Select ancestry category"
          >
            {ancestryOptions.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </section>
      )}

      {step === 4 && (
        <section className="card">
          <h2 className="text-h2 text-surface-white mb-4">
            Step 4: Disease interests (optional)
          </h2>
          <p className="text-sm text-cool-mid mb-3">
            Select diseases you want to learn about. Multi-select.
          </p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border border-white/[0.06] rounded-sm p-3">
            {diseaseOptions.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 cursor-pointer text-cool-light"
              >
                <input
                  type="checkbox"
                  checked={diseases.includes(o.value)}
                  onChange={() => toggleMultiSelect(o.value, diseases, setDiseases)}
                  className="rounded border-white/[0.06]"
                />
                <span className="text-sm">{o.label}</span>
              </label>
            ))}
            {diseaseOptions.length === 0 && (
              <p className="text-cool-mid italic text-sm">
                No diseases in atlas yet.
              </p>
            )}
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="card">
          <h2 className="text-h2 text-surface-white mb-4">
            Step 5: Exposure interests (optional)
          </h2>
          <p className="text-sm text-cool-mid mb-3">
            Select exposures you want to learn about. Multi-select.
          </p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border border-white/[0.06] rounded-sm p-3">
            {exposureOptions.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 cursor-pointer text-cool-light"
              >
                <input
                  type="checkbox"
                  checked={exposures.includes(o.value)}
                  onChange={() => toggleMultiSelect(o.value, exposures, setExposures)}
                  className="rounded border-white/[0.06]"
                />
                <span className="text-sm">{o.label}</span>
              </label>
            ))}
            {exposureOptions.length === 0 && (
              <p className="text-cool-mid italic text-sm">
                No exposures in atlas yet.
              </p>
            )}
          </div>
        </section>
      )}

      {step === 6 && (
        <section className="card">
          <h2 className="text-h2 text-surface-white mb-4">
            Summary & Generate
          </h2>
          <dl className="space-y-2 mb-6">
            <dt className="text-cool-mid">Region</dt>
            <dd className="text-surface-white">{region || "—"}</dd>
            <dt className="text-cool-mid mt-2">Age band</dt>
            <dd className="text-surface-white">{ageBand || "—"}</dd>
            <dt className="text-cool-mid mt-2">Ancestry</dt>
            <dd className="text-surface-white">
              {ancestry
                ? ancestryOptions.find((o) => o.value === ancestry)?.label ?? ancestry
                : "—"}
            </dd>
            <dt className="text-cool-mid mt-2">Disease interests</dt>
            <dd className="text-surface-white">
              {diseases.length > 0
                ? diseases
                    .map((d) => diseaseOptions.find((o) => o.value === d)?.label ?? d)
                    .join(", ")
                : "—"}
            </dd>
            <dt className="text-cool-mid mt-2">Exposure interests</dt>
            <dd className="text-surface-white">
              {exposures.length > 0
                ? exposures
                    .map((e) => exposureOptions.find((o) => o.value === e)?.label ?? e)
                    .join(", ")
                : "—"}
            </dd>
          </dl>
          <button
            type="button"
            onClick={handleGenerate}
            className="btn-primary"
          >
            Generate Passport PDF
          </button>
        </section>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {step < STEPS ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary"
          >
            Next
          </button>
        ) : null}
      </div>
    </div>
  );
}
