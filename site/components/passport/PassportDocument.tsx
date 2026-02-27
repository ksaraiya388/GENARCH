"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";

interface ItemSummary {
  name: string;
  summary: string;
  keyPoints: string[];
}

interface PassportDocumentProps {
  generatedDate: string;
  regionName?: string;
  ageBand?: string;
  ancestry?: string;
  diseases: ItemSummary[];
  exposures: ItemSummary[];
  resources: Array<{ name: string; url: string }>;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    lineHeight: 1.45
  },
  h1: {
    fontSize: 20,
    marginBottom: 10
  },
  h2: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 6
  },
  paragraph: {
    marginBottom: 6
  },
  bullet: {
    marginLeft: 10,
    marginBottom: 4
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 9,
    color: "#7c2d12",
    borderTop: "1 solid #f59e0b",
    paddingTop: 6
  },
  box: {
    border: "1 solid #d1d5db",
    padding: 8,
    marginBottom: 8
  }
});

function DisclaimerFooter(): JSX.Element {
  return (
    <Text style={styles.footer}>
      Educational purposes only — not medical advice • GENARCH v1.0 • No personal risk prediction
    </Text>
  );
}

export function PassportDocument({
  generatedDate,
  regionName,
  ageBand,
  ancestry,
  diseases,
  exposures,
  resources
}: PassportDocumentProps): JSX.Element {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Your GENARCH Educational Summary</Text>
        <View style={styles.box}>
          <Text style={styles.paragraph}>Generated: {generatedDate}</Text>
          <Text style={styles.paragraph}>Region: {regionName || "Not selected"}</Text>
          <Text style={styles.paragraph}>Age band: {ageBand || "Not selected"}</Text>
          <Text style={styles.paragraph}>Broad ancestry category: {ancestry || "Not selected"}</Text>
        </View>
        <Text style={styles.h2}>What GENARCH can and cannot tell you</Text>
        <Text style={styles.paragraph}>
          GENARCH summarizes public evidence on exposures, genetics, and pathways at a population level.
          It cannot diagnose conditions, estimate your personal risk, or replace clinician guidance.
        </Text>
        <Text style={styles.paragraph}>
          Use this document as an educational starting point for informed conversations and further learning.
        </Text>
        <DisclaimerFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Disease and exposure education summaries</Text>
        <Text style={styles.h2}>Diseases</Text>
        {diseases.length === 0 ? <Text style={styles.paragraph}>No disease topics selected.</Text> : null}
        {diseases.map((item) => (
          <View key={item.name} style={styles.box}>
            <Text>{item.name}</Text>
            <Text style={styles.paragraph}>{item.summary}</Text>
            {item.keyPoints.map((point) => (
              <Text key={point} style={styles.bullet}>
                • {point}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.h2}>Exposures</Text>
        {exposures.length === 0 ? <Text style={styles.paragraph}>No exposure topics selected.</Text> : null}
        {exposures.map((item) => (
          <View key={item.name} style={styles.box}>
            <Text>{item.name}</Text>
            <Text style={styles.paragraph}>{item.summary}</Text>
            {item.keyPoints.map((point) => (
              <Text key={point} style={styles.bullet}>
                • {point}
              </Text>
            ))}
          </View>
        ))}
        <DisclaimerFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Questions to ask your clinician</Text>
        <Text style={styles.bullet}>
          • What evidence-based prevention steps are relevant for my context?
        </Text>
        <Text style={styles.bullet}>
          • How should I interpret population-level exposure information for my environment?
        </Text>
        <Text style={styles.bullet}>
          • Which data limitations should I understand before drawing conclusions?
        </Text>

        <Text style={styles.h2}>Community resources</Text>
        {resources.map((resource) => (
          <Text key={resource.url} style={styles.bullet}>
            • {resource.name}: {resource.url}
          </Text>
        ))}
        <DisclaimerFooter />
      </Page>
    </Document>
  );
}
