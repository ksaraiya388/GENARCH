import raw from "./frontmatter.json";

export interface ReportAuthor {
  name: string;
  orcid: string;
  affiliation: string;
}

export interface ReportFrontmatter {
  year: string;
  title: string;
  shortTitle: string;
  version: string;
  /** ISO date of this version. */
  date: string;
  /** A DOI, or the literal PENDING while none has been minted. */
  doi: string;
  /** DOI of the software release the report was produced from, or PENDING. */
  softwareDoi: string;
  status: string;
  license: string;
  licenseUrl: string;
  author: ReportAuthor;
  deqCredit: string;
}

export const frontmatter: ReportFrontmatter = raw as ReportFrontmatter;

export const PENDING = "PENDING";

/** Whether a frontmatter identifier has been filled in yet. */
export function isPending(value: string): boolean {
  return value.trim().toUpperCase() === PENDING;
}

/**
 * Whether the report may be indexed and linked.
 *
 * Until the DOI is real the report is noindex, nofollow and linked from nowhere: a
 * citable document that acquires its identifier after being indexed leaves search
 * results pointing at a version that cannot be cited by the identifier it now has.
 */
export function isCitable(): boolean {
  return !isPending(frontmatter.doi);
}

/** APA 7 reference for this report, as the cover's recommended citation. */
export function apaCitation(): string {
  const { author, date, title, version, doi } = frontmatter;
  const year = date.slice(0, 4);
  const identifier = isPending(doi) ? "DOI pending" : `https://doi.org/${doi}`;
  return (
    `${author.name}. (${year}). ${title} (Version ${version}). ` +
    `GENARCH. ${identifier}`
  );
}

/** BibTeX entry for this report. */
export function bibtexCitation(): string {
  const { author, date, title, version, doi, license } = frontmatter;
  const year = date.slice(0, 4);
  const lines = [
    "@techreport{saraiya2026genarch,",
    `  author      = {${author.name}},`,
    `  title       = {{${title}}},`,
    "  institution = {GENARCH},",
    `  year        = {${year}},`,
    `  month       = {${date.slice(5, 7)}},`,
    `  type        = {Annual Report},`,
    `  version     = {${version}},`,
    `  note        = {${frontmatter.status}. License ${license}.},`,
  ];
  if (!isPending(doi)) lines.push(`  doi         = {${doi}},`);
  lines.push("}");
  return lines.join("\n");
}
