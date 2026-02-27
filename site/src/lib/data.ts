import fs from "fs";
import path from "path";
import type {
  Disease,
  Exposure,
  Gene,
  Pathway,
  GraphData,
  CommunityRegion,
  SearchItem,
  MechanismBrief,
  ReleaseItem,
  AnnualReport,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "..", "data");

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function readAllJsonFromDir<T>(dirPath: string): T[] {
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return [];
    }
    const files = fs.readdirSync(dirPath);
    const results: T[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const fullPath = path.join(dirPath, file);
      const item = readJsonFile<T>(fullPath);
      if (item !== null) {
        results.push(item);
      }
    }
    return results;
  } catch {
    return [];
  }
}

export function getDisease(slug: string): Disease | null {
  const filePath = path.join(DATA_DIR, "diseases", `${slug}.json`);
  return readJsonFile<Disease>(filePath);
}

export function getAllDiseases(): Disease[] {
  return readAllJsonFromDir<Disease>(path.join(DATA_DIR, "diseases"));
}

export function getExposure(slug: string): Exposure | null {
  const filePath = path.join(DATA_DIR, "exposures", `${slug}.json`);
  return readJsonFile<Exposure>(filePath);
}

export function getAllExposures(): Exposure[] {
  return readAllJsonFromDir<Exposure>(path.join(DATA_DIR, "exposures"));
}

export function getGene(slug: string): Gene | null {
  const filePath = path.join(DATA_DIR, "genes", `${slug}.json`);
  return readJsonFile<Gene>(filePath);
}

export function getAllGenes(): Gene[] {
  return readAllJsonFromDir<Gene>(path.join(DATA_DIR, "genes"));
}

export function getPathway(slug: string): Pathway | null {
  const filePath = path.join(DATA_DIR, "pathways", `${slug}.json`);
  return readJsonFile<Pathway>(filePath);
}

export function getAllPathways(): Pathway[] {
  return readAllJsonFromDir<Pathway>(path.join(DATA_DIR, "pathways"));
}

export function getGraphData(): GraphData | null {
  const graphPath = path.join(DATA_DIR, "graph", "graph.json");
  const data = readJsonFile<GraphData>(graphPath);
  if (data !== null) return data;
  const altPath = path.join(DATA_DIR, "graph.json");
  return readJsonFile<GraphData>(altPath);
}

export function getCommunityRegion(slug: string): CommunityRegion | null {
  const filePath = path.join(DATA_DIR, "community", `${slug}.json`);
  return readJsonFile<CommunityRegion>(filePath);
}

export function getAllCommunityRegions(): CommunityRegion[] {
  return readAllJsonFromDir<CommunityRegion>(
    path.join(DATA_DIR, "community")
  );
}

export function getCommunityRegionSlugs(): string[] {
  const dir = path.join(DATA_DIR, "community");
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.basename(f, ".json"));
}

export function getSearchIndex(): SearchItem[] {
  const indexPath = path.join(DATA_DIR, "search", "index.json");
  const data = readJsonFile<SearchItem[]>(indexPath);
  if (data !== null && Array.isArray(data)) return data;
  return [];
}

export function getMechanismBrief(slug: string): MechanismBrief | null {
  const filePath = path.join(DATA_DIR, "briefs", `${slug}.json`);
  return readJsonFile<MechanismBrief>(filePath);
}

export function getAllMechanismBriefs(): MechanismBrief[] {
  const briefsDir = path.join(DATA_DIR, "briefs");
  if (!fs.existsSync(briefsDir) || !fs.statSync(briefsDir).isDirectory()) {
    return [];
  }
  const files = fs.readdirSync(briefsDir);
  const briefs: MechanismBrief[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join(briefsDir, file);
    const item = readJsonFile<MechanismBrief>(fullPath);
    if (item !== null) {
      const slug = item.slug ?? path.basename(file, ".json");
      briefs.push({ ...item, slug });
    }
  }
  return briefs.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export function getReleases(): ReleaseItem[] {
  const filePath = path.join(DATA_DIR, "reports", "releases.json");
  const data = readJsonFile<ReleaseItem[]>(filePath);
  if (data !== null && Array.isArray(data)) {
    return [...data].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
  return [];
}

export function getReleaseBySlug(slug: string): ReleaseItem | null {
  const releases = getReleases();
  return releases.find((r) => r.slug === slug) ?? null;
}

export function getAnnualReports(): AnnualReport[] {
  const reportsDir = path.join(DATA_DIR, "reports");
  if (!fs.existsSync(reportsDir) || !fs.statSync(reportsDir).isDirectory()) {
    return [];
  }
  const items = fs.readdirSync(reportsDir);
  const reports: AnnualReport[] = [];
  for (const item of items) {
    if (item === "releases.json") continue;
    const fullPath = path.join(reportsDir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      const yearJson = path.join(fullPath, "index.json");
      const data = readJsonFile<AnnualReport>(yearJson);
      if (data) reports.push(data);
    } else if (item.endsWith(".json") && item !== "releases.json") {
      const data = readJsonFile<AnnualReport>(fullPath);
      if (data) reports.push(data);
    }
  }
  return reports.sort((a, b) => Number(b.year) - Number(a.year));
}

export function getAnnualReportByYear(year: string): AnnualReport | null {
  const yearDir = path.join(DATA_DIR, "reports", year);
  const indexPath = path.join(yearDir, "index.json");
  const data = readJsonFile<AnnualReport>(indexPath);
  if (data) return data;
  const filePath = path.join(DATA_DIR, "reports", `${year}.json`);
  return readJsonFile<AnnualReport>(filePath);
}
