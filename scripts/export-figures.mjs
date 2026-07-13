// Figure export: build the static site, serve out/, and screenshot each figure
// inside its FigureFrame at 2x. Writes PNGs and a manifest to
// site/public/figures/. Exits non-zero if any figure fails to render or any
// expected output file is missing.
//
// The knowledge-graph figure renders from a committed deterministic layout, so
// running this twice produces a byte-identical knowledge-graph PNG. generatedAt
// lives only in the manifest, never in a PNG, so it does not affect that check.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "site");
const OUT_DIR = path.join(SITE, "out");
const PUBLIC_FIG = path.join(SITE, "public", "figures");
const SIZES = ["card", "square"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function buildSite() {
  if (process.env.SKIP_BUILD === "1") {
    console.log("SKIP_BUILD=1: reusing existing site/out");
    return;
  }
  console.log("Building static site (next build)...");
  const res = spawnSync("npm", ["run", "build"], {
    cwd: SITE,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PYTHONUTF8: "1" },
  });
  if (res.status !== 0) throw new Error("site build failed");
}

function startServer(dir) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath.endsWith("/")) urlPath += "index.html";
        let filePath = path.join(dir, urlPath);
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          const alt = path.join(dir, urlPath, "index.html");
          if (existsSync(alt)) filePath = alt;
          else if (existsSync(filePath + ".html")) filePath += ".html";
        }
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        res.setHeader(
          "Content-Type",
          MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream"
        );
        res.end(await readFile(filePath));
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function discoverFigureIds() {
  const figuresDir = path.join(OUT_DIR, "figures");
  if (!existsSync(figuresDir)) return [];
  return readdirSync(figuresDir)
    .filter((name) => {
      const p = path.join(figuresDir, name);
      return statSync(p).isDirectory() && existsSync(path.join(p, "index.html"));
    })
    .sort();
}

async function main() {
  buildSite();

  if (!existsSync(OUT_DIR)) throw new Error(`no build output at ${OUT_DIR}`);
  const ids = discoverFigureIds();
  if (ids.length === 0) throw new Error("no figures found in out/figures");
  console.log(`Figures to export: ${ids.join(", ")}`);

  mkdirSync(PUBLIC_FIG, { recursive: true });

  const server = await startServer(OUT_DIR);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  const manifest = [];
  const failures = [];

  for (const id of ids) {
    const entry = { id, files: {} };
    for (const size of SIZES) {
      const url = `${base}/figures/${id}/?size=${size}`;
      const outFile = path.join(PUBLIC_FIG, `${id}-${size}@2x.png`);
      try {
        await page.setViewportSize({
          width: size === "square" ? 1080 : 1200,
          height: (size === "square" ? 1080 : 675) + 240,
        });
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        const el = await page.waitForSelector("[data-figure-root]", { timeout: 15000 });
        await page.waitForSelector("[data-figure-root] svg", { timeout: 15000 });
        await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
        await page.waitForTimeout(600);

        if (size === "card") {
          entry.meta = await el.evaluate((node) => ({
            title: node.getAttribute("data-figure-title"),
            claim: node.getAttribute("data-figure-claim"),
            sourceLine: node.getAttribute("data-figure-source"),
            destination: node.getAttribute("data-figure-destination"),
            altText: node.getAttribute("data-figure-alt"),
          }));
        }

        await el.screenshot({ path: outFile });
        if (!existsSync(outFile) || statSync(outFile).size === 0) {
          throw new Error("output file missing or empty");
        }
        entry.files[size] = path.posix.join("figures", `${id}-${size}@2x.png`);
        console.log(`  ok  ${id} ${size} -> ${path.basename(outFile)}`);
      } catch (err) {
        failures.push(`${id} ${size}: ${err.message}`);
        console.error(`  FAIL ${id} ${size}: ${err.message}`);
      }
    }
    manifest.push({
      id: entry.id,
      title: entry.meta?.title ?? null,
      claim: entry.meta?.claim ?? null,
      altText: entry.meta?.altText ?? null,
      destination: entry.meta?.destination ?? null,
      sourceLine: entry.meta?.sourceLine ?? null,
      generatedAt: new Date().toISOString(),
      files: entry.files,
    });
  }

  await browser.close();
  await new Promise((resolve) => server.close(resolve));

  writeFileSync(
    path.join(PUBLIC_FIG, "manifest.json"),
    JSON.stringify({ figures: manifest }, null, 2) + "\n",
    "utf-8"
  );

  // Every shipped figure must have both sizes present and non-empty.
  for (const id of ids) {
    for (const size of SIZES) {
      const f = path.join(PUBLIC_FIG, `${id}-${size}@2x.png`);
      if (!existsSync(f) || statSync(f).size === 0) {
        failures.push(`${id} ${size}: missing final output ${f}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\nExport failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`\nExported ${ids.length * SIZES.length} PNGs + manifest.json to site/public/figures/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
