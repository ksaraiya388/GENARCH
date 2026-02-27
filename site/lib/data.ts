import { promises as fs } from "fs";
import path from "path";

import type {
  CommunityRegion,
  Disease,
  Exposure,
  Gene,
  GraphData,
  Pathway,
  ReleasesData
} from "./types";

const dataRoot = path.resolve(process.cwd(), "..", "data");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(dataRoot, relativePath);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function readEntityList<T extends { slug: string }>(folder: string): Promise<T[]> {
  const folderPath = path.join(dataRoot, folder);
  const files = await fs.readdir(folderPath);
  const jsonFiles = files.filter((file) => file.endsWith(".json") && file !== "index.json");
  const entities = await Promise.all(
    jsonFiles.map(async (file) => readJson<T>(path.join(folder, file)))
  );
  entities.sort((a, b) => a.slug.localeCompare(b.slug));
  return entities;
}

export async function getDisease(slug: string): Promise<Disease | null> {
  try {
    return await readJson<Disease>(`diseases/${slug}.json`);
  } catch {
    return null;
  }
}

export async function getExposure(slug: string): Promise<Exposure | null> {
  try {
    return await readJson<Exposure>(`exposures/${slug}.json`);
  } catch {
    return null;
  }
}

export async function getGene(slug: string): Promise<Gene | null> {
  try {
    return await readJson<Gene>(`genes/${slug}.json`);
  } catch {
    return null;
  }
}

export async function getPathway(slug: string): Promise<Pathway | null> {
  try {
    return await readJson<Pathway>(`pathways/${slug}.json`);
  } catch {
    return null;
  }
}

export async function getCommunityRegion(slug: string): Promise<CommunityRegion | null> {
  try {
    return await readJson<CommunityRegion>(`community/${slug}.json`);
  } catch {
    return null;
  }
}

export async function getGraph(): Promise<GraphData> {
  return readJson<GraphData>("graph/graph.json");
}

export async function listDiseases(): Promise<Disease[]> {
  return readEntityList<Disease>("diseases");
}

export async function listExposures(): Promise<Exposure[]> {
  return readEntityList<Exposure>("exposures");
}

export async function listGenes(): Promise<Gene[]> {
  return readEntityList<Gene>("genes");
}

export async function listPathways(): Promise<Pathway[]> {
  return readEntityList<Pathway>("pathways");
}

export async function listCommunityRegions(): Promise<CommunityRegion[]> {
  return readEntityList<CommunityRegion>("community");
}

export async function getReleases(): Promise<ReleasesData> {
  return readJson<ReleasesData>("reports/releases.json");
}

export async function getReportMdx(slug: string): Promise<string | null> {
  try {
    const reportPath = path.join(dataRoot, "reports", `${slug}.mdx`);
    return await fs.readFile(reportPath, "utf-8");
  } catch {
    return null;
  }
}

export async function getSynonyms(): Promise<Record<string, string[]>> {
  return readJson<Record<string, string[]>>("synonyms.json");
}
