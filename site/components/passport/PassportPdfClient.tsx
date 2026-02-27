"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";

import { PassportDocument } from "@/components/passport/PassportDocument";

interface ItemSummary {
  name: string;
  summary: string;
  keyPoints: string[];
}

interface PassportPdfClientProps {
  generatedDate: string;
  regionName?: string;
  ageBand?: string;
  ancestry?: string;
  diseases: ItemSummary[];
  exposures: ItemSummary[];
  resources: Array<{ name: string; url: string }>;
}

export function PassportPdfClient(props: PassportPdfClientProps): JSX.Element {
  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">Passport preview</h1>
        <p className="mt-2 text-textSecondary">
          Your selections are only embedded in this URL-rendered preview and client-side PDF file.
        </p>
        <div className="mt-3 rounded border border-passport bg-yellow-50 p-3 text-sm text-textSecondary">
          <p>Region: {props.regionName ?? "Not selected"}</p>
          <p>Age band: {props.ageBand ?? "Not selected"}</p>
          <p>Ancestry category: {props.ancestry ?? "Not selected"}</p>
        </div>
        <div className="mt-4">
          <PDFDownloadLink
            document={<PassportDocument {...props} />}
            fileName={`genarch-passport-${props.generatedDate}.pdf`}
            className="rounded bg-action px-4 py-2 text-sm font-semibold text-white no-underline"
          >
            {({ loading }) => (loading ? "Preparing PDF..." : "Download Passport PDF")}
          </PDFDownloadLink>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="content-card">
          <h2 className="section-title">Disease summaries included</h2>
          {props.diseases.length === 0 ? (
            <p className="mt-2 text-sm text-textSecondary">No disease topics selected.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-textSecondary">
              {props.diseases.map((item) => (
                <li key={item.name}>{item.name}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="content-card">
          <h2 className="section-title">Exposure summaries included</h2>
          {props.exposures.length === 0 ? (
            <p className="mt-2 text-sm text-textSecondary">No exposure topics selected.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-textSecondary">
              {props.exposures.map((item) => (
                <li key={item.name}>{item.name}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="content-card border-l-4 border-l-passport bg-yellow-50">
        <p className="text-sm text-textSecondary">
          Educational purposes only — not medical advice. This output is population-level context and does not
          provide personal risk prediction or clinical recommendation.
        </p>
      </section>
    </div>
  );
}
