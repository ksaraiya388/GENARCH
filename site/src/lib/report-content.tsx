import type { ReactNode } from "react";

import {
  ReportBody as Body2026,
  SECTIONS as SECTIONS_2026,
  frontmatter as frontmatter2026,
} from "@/content/reports/2026";
import type { ReportFrontmatter } from "@/content/reports/2026";

export interface ReportSectionRef {
  number?: string;
  id: string;
  title: string;
}

export interface ReportContent {
  frontmatter: ReportFrontmatter;
  sections: ReadonlyArray<ReportSectionRef>;
  Body: () => ReactNode;
}

/**
 * Years with an authored report body.
 *
 * Static imports rather than a dynamic path, because the site is a static export and
 * a dynamic import on a variable path cannot be bundled. One entry per authored
 * report; a year absent from here still routes, and falls back to the summary-level
 * content in its `index.json`, which is how the 2024 entry keeps working.
 */
const REPORTS: Record<string, ReportContent> = {
  "2026": {
    frontmatter: frontmatter2026,
    sections: SECTIONS_2026,
    Body: Body2026,
  },
};

export function reportContentFor(year: string): ReportContent | null {
  return REPORTS[year] ?? null;
}

export function authoredReportYears(): string[] {
  return Object.keys(REPORTS).sort((a, b) => Number(b) - Number(a));
}
