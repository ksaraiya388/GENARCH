"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 1.5,
  },
  disclaimer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#FEF3C7",
    fontSize: 9,
  },
});

function PassportPDF({
  region,
  ageBand,
  ancestry,
  diseases,
  exposures,
}: {
  region: string;
  ageBand: string;
  ancestry: string;
  diseases: string[];
  exposures: string[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>GENARCH Educational Passport</Text>
        <Text style={styles.paragraph}>
          Personalized summary generated from your selected interests. All
          information is population-level only.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Selections</Text>
          <Text style={styles.paragraph}>Region: {region || "Not specified"}</Text>
          <Text style={styles.paragraph}>Age band: {ageBand || "Not specified"}</Text>
          <Text style={styles.paragraph}>
            Ancestry category: {ancestry || "Not specified"}
          </Text>
          <Text style={styles.paragraph}>
            Disease interests: {diseases.length > 0 ? diseases.join(", ") : "None"}
          </Text>
          <Text style={styles.paragraph}>
            Exposure interests: {exposures.length > 0 ? exposures.join(", ") : "None"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About GENARCH</Text>
          <Text style={styles.paragraph}>
            GENARCH is a public educational atlas linking environmental
            exposures, genetic architecture, and molecular mechanisms. It provides
            population-level understanding for community health education.
          </Text>
        </View>

        <View style={styles.disclaimer}>
          <Text>
            DISCLAIMER: This passport does not predict individual risk or
            constitute medical advice. All content is for educational purposes
            only. No personal data is stored.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export default function PassportPdfPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const region = searchParams.get("region") ?? "";
  const ageBand = searchParams.get("age") ?? "";
  const ancestry = searchParams.get("ancestry") ?? "";
  const diseases = searchParams.getAll("disease");
  const exposures = searchParams.getAll("exposure");

  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const doc = (
      <PassportPDF
        region={region}
        ageBand={ageBand}
        ancestry={ancestry}
        diseases={diseases}
        exposures={exposures}
      />
    );
    pdf(doc)
      .toBlob()
      .then((blob) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      });
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [region, ageBand, ancestry, diseases, exposures]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "genarch-passport.pdf";
    a.click();
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Passport", href: "/passport/" },
          { label: "PDF" },
        ]}
      />
      <header>
        <h1 className="text-h1 text-genarch-text">Passport PDF</h1>
        <p className="mt-2 text-genarch-subtext">
          Your educational passport. Preview below and download. No data stored.
        </p>
      </header>

      <div className="card">
        <p className="text-genarch-text mb-4">
          Summary of selections: Region {region || "—"}, Age {ageBand || "—"},
          Ancestry {ancestry || "—"}, {diseases.length} disease(s),{" "}
          {exposures.length} exposure(s).
        </p>
        {blobUrl && (
          <div className="space-y-4">
            <iframe
              src={blobUrl}
              title="Passport PDF preview"
              className="w-full h-[600px] border border-gray-200 rounded-sm"
            />
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleDownload}
                className="btn-primary"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => router.push("/passport/")}
                className="btn-secondary"
              >
                Back to Form
              </button>
            </div>
          </div>
        )}
        {!blobUrl && (
          <p className="text-genarch-subtext">Generating PDF...</p>
        )}
      </div>

      <footer className="text-sm text-amber-800 bg-amber-50 p-4 rounded-sm">
        <strong>Disclaimer:</strong> Population-level only. Not medical advice.
        No individual risk. No data stored.
      </footer>
    </div>
  );
}
