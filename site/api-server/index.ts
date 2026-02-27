import { readFile } from "fs/promises";
import path from "path";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express, { type Request } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createClient } from "redis";
import { RedisStore } from "rate-limit-redis";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

type AnyRecord = Record<string, unknown>;

const dataRoot = path.resolve(process.cwd(), "..", "data");

const envSchema = z
  .object({
    PORT: z.coerce.number().default(4000),
    SITE_ORIGIN: z.string().default("http://localhost:3000"),
    REDIS_URL: z.string().optional(),
    GENARCH_INTERNAL_API_KEY: z.string().optional()
  })
  .strict();

const env = envSchema.parse(process.env);

function sanitizeObject(input: unknown): unknown {
  if (typeof input === "string") {
    return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item));
  }
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as AnyRecord).map(([key, value]) => [key, sanitizeObject(value)])
    );
  }
  return input;
}

async function readJson<T>(relativePath: string): Promise<T> {
  const raw = await readFile(path.join(dataRoot, relativePath), "utf-8");
  return JSON.parse(raw) as T;
}

async function readEntities(folder: string): Promise<AnyRecord[]> {
  const index = (await readJson<Array<{ slug: string }>>(`${folder}/index.json`)).map(
    (entry) => entry.slug
  );
  return Promise.all(index.map((slug) => readJson<AnyRecord>(`${folder}/${slug}.json`)));
}

function toRoute(type: string, slug: string): string {
  if (type === "Disease") return `/atlas/diseases/${slug}`;
  if (type === "Exposure") return `/atlas/exposures/${slug}`;
  if (type === "Gene") return `/atlas/genes/${slug}`;
  if (type === "Pathway") return `/atlas/pathways/${slug}`;
  return "/";
}

async function buildContext() {
  const [diseases, exposures, genes, pathways, graph, releases, regions] = await Promise.all([
    readEntities("diseases"),
    readEntities("exposures"),
    readEntities("genes"),
    readEntities("pathways"),
    readJson<AnyRecord>("graph/graph.json"),
    readJson<{ releases: AnyRecord[] }>("reports/releases.json"),
    readEntities("community")
  ]);
  return { diseases, exposures, genes, pathways, graph, releases: releases.releases, regions };
}

const typeDefs = `#graphql
  type Query {
    disease(id: ID, slug: String): Disease
    diseases(filter: String, page: Int): [Disease!]!
    exposure(id: ID, slug: String): Exposure
    exposures(filter: String, page: Int): [Exposure!]!
    gene(symbol: String, slug: String): Gene
    genes(filter: String, page: Int): [Gene!]!
    pathway(id: ID, slug: String): Pathway
    pathways(filter: String, page: Int): [Pathway!]!
    graph(filter: String): GraphResult!
    community(regionSlug: String!): CommunityRegion
    updates(page: Int): [Report!]!
  }

  type Disease { id: ID!, slug: String!, name: String!, summary: String }
  type Exposure { id: ID!, slug: String!, name: String!, definition: String }
  type Gene { id: ID!, slug: String!, symbol: String!, name: String!, summary: String, confidence: String }
  type Pathway { id: ID!, slug: String!, name: String!, summary: String }

  type GraphNode { id: ID!, type: String!, label: String!, slug: String!, route: String! }
  type GraphEdge {
    id: ID!, source: String!, target: String!, type: String!,
    evidence_type: String!, direction: String!, tissue: [String!]!, strength: Float!, confidence: String!, ancestry_rep: String!
  }
  type GraphResult { nodes: [GraphNode!]!, edges: [GraphEdge!]! }

  type CommunityRegion { region_id: ID!, slug: String!, name: String!, geo_level: String!, limitations: String! }
  type Report { slug: String!, title: String!, summary: String!, date: String!, pdf_path: String!, report_path: String! }
`;

const resolvers = {
  Query: {
    disease: (_: unknown, args: { id?: string; slug?: string }, ctx: Awaited<ReturnType<typeof buildContext>>) =>
      ctx.diseases.find((item) => item.id === args.id || item.slug === args.slug) ?? null,
    diseases: (_: unknown, _args: unknown, ctx: Awaited<ReturnType<typeof buildContext>>) => ctx.diseases,
    exposure: (_: unknown, args: { id?: string; slug?: string }, ctx: Awaited<ReturnType<typeof buildContext>>) =>
      ctx.exposures.find((item) => item.id === args.id || item.slug === args.slug) ?? null,
    exposures: (_: unknown, _args: unknown, ctx: Awaited<ReturnType<typeof buildContext>>) => ctx.exposures,
    gene: (
      _: unknown,
      args: { symbol?: string; slug?: string },
      ctx: Awaited<ReturnType<typeof buildContext>>
    ) =>
      ctx.genes.find((item) => item.slug === args.slug || item.symbol === args.symbol) ?? null,
    genes: (_: unknown, _args: unknown, ctx: Awaited<ReturnType<typeof buildContext>>) => ctx.genes,
    pathway: (_: unknown, args: { id?: string; slug?: string }, ctx: Awaited<ReturnType<typeof buildContext>>) =>
      ctx.pathways.find((item) => item.id === args.id || item.slug === args.slug) ?? null,
    pathways: (_: unknown, _args: unknown, ctx: Awaited<ReturnType<typeof buildContext>>) => ctx.pathways,
    graph: (_: unknown, _args: unknown, ctx: Awaited<ReturnType<typeof buildContext>>) => ({
      nodes: (ctx.graph.nodes as AnyRecord[]).map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        slug: node.slug,
        route: toRoute(String(node.type), String(node.slug))
      })),
      edges: (ctx.graph.edges as AnyRecord[]).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        evidence_type: (edge.attrs as AnyRecord).evidence_type,
        direction: (edge.attrs as AnyRecord).direction,
        tissue: (edge.attrs as AnyRecord).tissue,
        strength: (edge.attrs as AnyRecord).strength,
        confidence: (edge.attrs as AnyRecord).confidence,
        ancestry_rep: (edge.attrs as AnyRecord).ancestry_rep
      }))
    }),
    community: (
      _: unknown,
      args: { regionSlug: string },
      ctx: Awaited<ReturnType<typeof buildContext>>
    ) => ctx.regions.find((item) => item.slug === args.regionSlug) ?? null,
    updates: (_: unknown, _args: unknown, ctx: Awaited<ReturnType<typeof buildContext>>) => ctx.releases
  }
};

const app = express();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: env.SITE_ORIGIN,
    methods: ["GET", "POST"],
    credentials: false
  })
);
app.use(express.json({ limit: "1mb" }));

const redisClient = env.REDIS_URL ? createClient({ url: env.REDIS_URL }) : null;
if (redisClient) {
  redisClient.connect().catch(() => {
    // Fallback to in-memory limiter if Redis is unreachable.
  });
}

const limiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `${req.ip}:${req.header("x-api-key") ?? "anon"}`,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests. Please retry shortly." });
  },
  store:
    redisClient != null
      ? new RedisStore({
          sendCommand: (...args: string[]) => redisClient.sendCommand(args)
        })
      : undefined
});

app.use(limiter);

const searchSchema = z.object({ q: z.string().min(2).max(80) }).strict();
app.get("/search", async (req, res) => {
  const parsed = searchSchema.safeParse(sanitizeObject({ q: req.query.q }));
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid search query." });
  }
  const query = parsed.data.q.toLowerCase();
  const ctx = await buildContext();
  const results = [...ctx.diseases, ...ctx.exposures, ...ctx.genes, ...ctx.pathways]
    .filter((item) => JSON.stringify(item).toLowerCase().includes(query))
    .slice(0, 12);
  return res.json({ results });
});

const passportSchema = z
  .object({
    region: z.string().max(100).optional(),
    ageBand: z.enum(["10-14", "15-18", "19-24", "25+"]).optional(),
    ancestry: z.string().max(60).optional(),
    diseases: z.array(z.string().max(100)).max(15).optional(),
    exposures: z.array(z.string().max(100)).max(15).optional()
  })
  .strict();

app.post("/passport", (req, res) => {
  const parsed = passportSchema.safeParse(sanitizeObject(req.body));
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid passport payload." });
  }
  return res.json({
    generated_at: new Date().toISOString(),
    educational_only: true,
    payload: parsed.data
  });
});

app.get("/reports/:year/pdf", async (req, res) => {
  const paramsSchema = z.object({ year: z.string().regex(/^\d{4}$/) }).strict();
  const parsed = paramsSchema.safeParse(sanitizeObject(req.params));
  if (!parsed.success) return res.status(400).json({ error: "Invalid year parameter." });

  const reportPath = path.join(dataRoot, "reports", `${parsed.data.year}.pdf`);
  try {
    const file = await readFile(reportPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="genarch-${parsed.data.year}.pdf"`);
    return res.send(file);
  } catch {
    return res.status(404).json({ error: "Report not found." });
  }
});

app.get("/community/:regionSlug/exposures", async (req, res) => {
  const paramsSchema = z.object({ regionSlug: z.string().min(2).max(120) }).strict();
  const parsed = paramsSchema.safeParse(sanitizeObject(req.params));
  if (!parsed.success) return res.status(400).json({ error: "Invalid region." });

  const ctx = await buildContext();
  const region = ctx.regions.find((entry) => entry.slug === parsed.data.regionSlug);
  if (!region) return res.status(404).json({ error: "Region not found." });
  return res.json({ region: region.slug, exposures: region.exposure_layers });
});

app.get("/healthstats/:regionSlug", async (req, res) => {
  const paramsSchema = z.object({ regionSlug: z.string().min(2).max(120) }).strict();
  const parsed = paramsSchema.safeParse(sanitizeObject(req.params));
  if (!parsed.success) return res.status(400).json({ error: "Invalid region." });

  const ctx = await buildContext();
  const region = ctx.regions.find((entry) => entry.slug === parsed.data.regionSlug);
  if (!region) return res.status(404).json({ error: "Region not found." });
  return res.json({ region: region.slug, health_stats: region.health_stats });
});

const apollo = new ApolloServer({
  typeDefs,
  resolvers
});
await apollo.start();

app.use(
  "/api/graphql",
  expressMiddleware(apollo, {
    context: async () => buildContext()
  })
);

app.listen(env.PORT, () => {
  console.log(`GENARCH API server listening on http://localhost:${env.PORT}`);
});
