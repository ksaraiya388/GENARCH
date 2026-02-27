"use client";

import { Suspense } from "react";
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
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#92400E",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
    paddingTop: 8,
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
  const disclaimerText =
    "GENARCH Educational Passport v1.0 — This document does not predict individual risk or constitute medical advice. All content is for educational purposes only. No personal data has been stored.";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Your GENARCH Educational Summary</Text>
        <Text style={styles.paragraph}>
          Generated on {new Date().toISOString().split("T")[0]}. All information
          is population-level only and based on publicly available data.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            What GENARCH Can and Cannot Tell You
          </Text>
          <Text style={styles.paragraph}>
            GENARCH provides population-level educational summaries about
            gene-environment interactions. It CANNOT predict your individual
            disease risk, diagnose conditions, or replace clinical guidance.
            The information below is based on aggregated scientific evidence
            from public datasets.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Selections</Text>
          <Text style={styles.paragraph}>
            Region: {region || "Not specified"}
          </Text>
          <Text style={styles.paragraph}>
            Age band: {ageBand || "Not specified"}
          </Text>
          <Text style={styles.paragraph}>
            Ancestry category: {ancestry || "Not specified"}
          </Text>
          <Text style={styles.paragraph}>
            Disease interests:{" "}
            {diseases.length > 0 ? diseases.join(", ") : "None selected"}
          </Text>
          <Text style={styles.paragraph}>
            Exposure interests:{" "}
            {exposures.length > 0 ? exposures.join(", ") : "None selected"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Questions to Ask Your Clinician
          </Text>
          <Text style={styles.paragraph}>
            • What environmental factors are most relevant to my health in my
            area?
          </Text>
          <Text style={styles.paragraph}>
            • Are there screening recommendations based on my family history?
          </Text>
          <Text style={styles.paragraph}>
            • How can I reduce exposures that may interact with genetic
            susceptibility?
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Resources</Text>
          <Text style={styles.paragraph}>
            Visit genarch.org/community for region-specific educational
            resources and local health organizations.
          </Text>
        </View>

        <View style={styles.disclaimer}>
          <Text>{disclaimerText}</Text>
        </View>

        <Text style={styles.footer}>{disclaimerText}</Text>
      </Page>
    </Document>
  );
}

function PassportPdfContent() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, ageBand, ancestry, JSON.stringify(diseases), JSON.stringify(exposures)]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "genarch-passport.pdf";
    a.click();
  };

  return (
    <>
      <div className="card">
        <p className="text-genarch-text mb-4">
          Summary: Region {region || "—"}, Age {ageBand || "—"}, Ancestry{" "}
          {ancestry || "—"}, {diseases.length} disease(s),{" "}
          {exposures.length} exposure(s).
        </p>
        {blobUrl ? (
          <div className="space-y-4">
            <iframe
              src={blobUrl}
              title="Passport PDF preview"
              className="w-full h-[600px] border border-gray-200 rounded-sm"
            />
            <div className="flex gap-4">
              <button type="button" onClick={handleDownload} className="btn-primary">
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
        ) : (
          <p className="text-genarch-subtext">Generating PDF…</p>
        )}
      </div>

      <footer className="text-sm text-amber-800 bg-amber-50 p-4 rounded-sm">
        <strong>Disclaimer:</strong> Population-level data only. This document
        does not constitute medical advice. No individual risk prediction. No
        data has been stored.
      </footer>
    </>
  );
}

export default function PassportPdfPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Passport", href: "/passport/" },
          { label: "PDF" },
        ]}
      />
      <header>
        <h1 className="text-h1 text-genarch-text">Educational Passport PDF</h1>
        <p className="mt-2 text-genarch-subtext">
          Your stateless educational passport. Preview and download below. No
          data is stored at any point.
        </p>
      </header>

      <Suspense fallback={<div className="card"><p className="text-genarch-subtext">Loading passport…</p></div>}>
        <PassportPdfContent />
      </Suspense>
    </div>
  );
}
