
//
// The three exported strings below are VERBATIM QUOTATIONS attributed to a state agency.
// Before this page ships, diff each one character-by-character against the live source named
// in DEQ_SOURCES. Do not retype them and do not copy them from a chat transcript: copy from
// the browser and from the PDF. A transcription error inside a verbatim quote attributed to
// Virginia DEQ is not recoverable.
//
// Four rules govern these strings, all absolute:
//
//   1. Quote verbatim. Do not paraphrase, shorten, or soften.
//   2. DEQ_DASHBOARD_LIMITATION reads "designed" where "designated" is meant. That is DEQ's
//      typo, reproduced deliberately. Do not correct it and do not add [sic]. Note that
//      DEQ_REPORT_LIMITATION, from the PDF, reads "designated" -- the two sources genuinely
//      differ on this word, and both are correct as transcribed.
//   3. The closing sentence of DEQ_DASHBOARD_LIMITATION -- that the sensors remain useful for
//      general trends and concentrations -- is load-bearing. Omitting it is selective quoting,
//      and DEQ's own statement that the data are useful is why this page exists.
//   4. Render these through a blockquote with attribution. Never inline them into prose,
//      never interleave GENARCH's own wording with them.

/**
 * Virginia DEQ, Data Center Air Monitoring Project public dashboard, Information tab.
 * Published-as-detected notice.
 */
export const DEQ_DASHBOARD_NOTICE = `Important: This information is published as soon as the values are detected, and does not imply that the data have passed quality assurance validation procedures.`;

/**
 * Virginia DEQ, Data Center Air Monitoring Project public dashboard, Information tab.
 * Regulatory-instrument limitation. Contains DEQ's "designed" typo; see rule 2 above.
 */
export const DEQ_DASHBOARD_LIMITATION = `The sensors displayed on this page are not regulatory instruments as specified in the Code of Federal Regulations (CFR), that is, they cannot be used in determining attainment or non-attainment of the National Ambient Air Quality Standards (NAAQS). Only Federal Reference/Equivalent Method designed monitors can. However, they are still useful to get a general idea of pollutant trends and general concentrations.`;

/**
 * Virginia DEQ, Office of Air Quality Monitoring, "Data Center Air Quality Analysis",
 * August 7, 2026, Section 1. The same limitation, stated in the agency's own report.
 */
export const DEQ_REPORT_LIMITATION = `These sensors are capable of collecting pollutant concentration data and establishing pollutant concentration trends, but they are not regulatory instruments as specified in the Code of Federal Regulations (CFR). They cannot be used in determining attainment or non-attainment of the National Ambient Air Quality Standards (NAAQS). Only Federal Reference/Equivalent Method designated monitors can.`;

export interface DeqSource {
  /** Full citation as rendered beneath the quotation. */
  citation: string;
  sourceUrl: string | null;
  /** ISO date the quotation was retrieved from the source named above. */
  retrieved: string;
}

export const DEQ_SOURCES: Record<
  "dashboard" | "report" | "reportAug14" | "reportAug21" | "reportAug28" | "project" | "foia",
  DeqSource
> = {
  dashboard: {
    citation:
      "Virginia DEQ, Data Center Air Monitoring Project public dashboard, Information tab",
    sourceUrl: "https://kunakcloud.com/websites/VirginiaDEQ.html",
    retrieved: "2026-08-11",
  },
  report: {
    citation:
      'Virginia DEQ, Office of Air Quality Monitoring, "Data Center Air Quality Analysis", August 7, 2026',
    sourceUrl:
      "https://www.deq.virginia.gov/news-info/shortcuts/topics-of-interest/data-center-air-monitoring-project",
    retrieved: "2026-08-11",
  },
  // DEQ reissues this analysis weekly, so the edition date is part of the citation, not a
  // detail. The August 7, 14 and 21 editions are archived under docs/deq-reports/ and the
  // August 28 edition under pipeline/sources/deq/, because DEQ's published page carries only
  // the current one.
  reportAug14: {
    citation:
      'Virginia DEQ, Office of Air Quality Monitoring, "Data Center Air Quality Analysis", August 14, 2026',
    sourceUrl:
      "https://www.deq.virginia.gov/news-info/shortcuts/topics-of-interest/data-center-air-monitoring-project",
    retrieved: "2026-08-14",
  },
  reportAug21: {
    citation:
      'Virginia DEQ, Office of Air Quality Monitoring, "Data Center Air Quality Analysis", August 21, 2026',
    sourceUrl:
      "https://www.deq.virginia.gov/news-info/shortcuts/topics-of-interest/data-center-air-monitoring-project",
    retrieved: "2026-08-21",
  },
  reportAug28: {
    citation:
      'Virginia DEQ, Office of Air Quality Monitoring, "Data Center Air Quality Analysis", August 28, 2026',
    sourceUrl:
      "https://www.deq.virginia.gov/news-info/shortcuts/topics-of-interest/data-center-air-monitoring-project",
    retrieved: "2026-08-28",
  },
  project: {
    citation: "Virginia DEQ, Data Center Air Monitoring Project",
    sourceUrl:
      "https://www.deq.virginia.gov/news-info/shortcuts/topics-of-interest/data-center-air-monitoring-project",
    retrieved: "2026-08-11",
  },
  foia: {
    citation:
      "Virginia FOIA request 26-4646, released in full 2026-08-11, no redactions, no cost",
    sourceUrl: "https://vadeq.nextrequest.com/requests/26-4646",
    retrieved: "2026-08-11",
  },
};

/**
 * Licence line for the sensor export, per DEQ staff on 2026-08-10. The preferred attribution
 * wording is still pending from DEQ Communications; DEQ_ATTRIBUTION_PENDING carries that gap
 * so it is disclosed on the page rather than quietly omitted.
 */
export const DEQ_SENSOR_LICENSE = `Fully redistributable with credit that the data belong to Virginia DEQ (per DEQ staff, 2026-08-10).`;

export const DEQ_ATTRIBUTION_PENDING = `A preferred attribution line is pending from DEQ Communications and will be added here when it is received.`;
