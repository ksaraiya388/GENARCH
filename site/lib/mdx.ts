import { promises as fs } from "fs";
import path from "path";

import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";

const briefsDir = path.resolve(process.cwd(), "content", "briefs");
const reportsDir = path.resolve(process.cwd(), "..", "data", "reports");

export interface MdxFrontmatter {
  title: string;
  slug: string;
  summary: string;
  date: string;
  disease: string;
  exposure: string;
}

export async function listBriefSlugs(): Promise<string[]> {
  const files = await fs.readdir(briefsDir);
  return files.filter((file) => file.endsWith(".mdx")).map((file) => file.replace(/\.mdx$/, ""));
}

export async function loadBriefBySlug(slug: string): Promise<{
  frontmatter: MdxFrontmatter;
  content: JSX.Element;
} | null> {
  try {
    const raw = await fs.readFile(path.join(briefsDir, `${slug}.mdx`), "utf-8");
    const { data, content } = matter(raw);
    const compiled = await compileMDX<MdxFrontmatter>({
      source: content,
      options: { parseFrontmatter: false }
    });
    return {
      frontmatter: data as MdxFrontmatter,
      content: compiled.content
    };
  } catch {
    return null;
  }
}

export async function listReportSlugs(): Promise<string[]> {
  const files = await fs.readdir(reportsDir);
  return files.filter((file) => file.endsWith(".mdx")).map((file) => file.replace(/\.mdx$/, ""));
}

export async function loadReportBySlug(slug: string): Promise<{
  title: string;
  content: JSX.Element;
} | null> {
  try {
    const raw = await fs.readFile(path.join(reportsDir, `${slug}.mdx`), "utf-8");
    const { data, content } = matter(raw);
    const compiled = await compileMDX<{ title?: string }>({
      source: content,
      options: { parseFrontmatter: false }
    });
    return {
      title: String((data as { title?: string }).title ?? `GENARCH ${slug} Report`),
      content: compiled.content
    };
  } catch {
    return null;
  }
}
