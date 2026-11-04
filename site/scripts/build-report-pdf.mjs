#!/usr/bin/env node
/**
 * Build the annual report PDF from the print route, with Playwright.
 *
 *   node site/scripts/build-report-pdf.mjs --draft
 *   node site/scripts/build-report-pdf.mjs --final
 *
 * The PDF is a print rendering of a page the site already serves, rather than a second
 * document assembled from the same data. That is the whole point: there is one body,
 * one set of components and one source for every number, so the PDF cannot disagree
 * with the page. A separate PDF renderer was removed for exactly this reason
 * (docs/report-2026/DECISIONS.md D21).
 *
 * Two flags, and they are not interchangeable:
 *
 *   --draft  Allows a pending identifier, stamps DRAFT in the footer, writes to
 *            docs/report-2026/drafts/ and leaves data/reports/<year>/index.json alone.
 *            A draft is for review and is never served.
 *   --final  Refuses to build while any identifier is pending, writes into
 *            site/public/reports/<year>/ and records the path, size and SHA-256 in
 *            index.json so the page can offer the download with a checksum.
 *
 * Note on the server: `next start` cannot serve this site, because the site is an
 * `output: "export"` static build. The pages are plain files under site/out, so this
 * serves that directory itself, the same way scripts/export-figures.mjs does.
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, "..");
const ROOT = path.resolve(SITE, "..");
const OUT_DIR = path.join(SITE, "out");
const PORT = 3100;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".csv": "text/csv; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

function parseArgs(argv) {
  const args = { mode: null, year: "2026", skipBuild: false };
  for (const arg of argv) {
    if (arg === "--draft") args.mode = "draft";
    else if (arg === "--final") args.mode = "final";
    else if (arg === "--skip-build") args.skipBuild = true;
    else if (arg.startsWith("--year=")) args.year = arg.slice("--year=".length);
    else throw new Error(`unrecognised argument: ${arg}`);
  }
  if (args.mode === null) {
    throw new Error("pass --draft or --final; there is no default, deliberately");
  }
  return args;
}

function readFrontmatter(year) {
  const file = path.join(SITE, "src", "content", "reports", year, "frontmatter.json");
  if (!existsSync(file)) throw new Error(`no frontmatter for report ${year}: ${file}`);
  return JSON.parse(readFileSync(file, "utf-8"));
}

function isPending(value) {
  return !value || String(value).trim().toUpperCase() === "PENDING";
}

function buildSite(skipBuild) {
  if (skipBuild) {
    if (!existsSync(OUT_DIR)) throw new Error("--skip-build but site/out does not exist");
    console.log("[pdf] --skip-build: reusing the existing site/out");
    return;
  }
  const res = spawnSync("npm", ["run", "build"], {
    cwd: SITE,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PYTHONUTF8: "1" },
  });
  if (res.status !== 0) throw new Error("site build failed");
}

function startServer(dir, port) {
  return new Promise((resolve, reject) => {
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
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

/** Next draft number, so a review round never overwrites the round before it. */
function nextDraftNumber(dir, stem) {
  if (!existsSync(dir)) return 1;
  let highest = 0;
  for (const name of readdirSync(dir)) {
    const m = new RegExp(`^${stem}_draft-(\\d+)\\.pdf$`).exec(name);
    if (m) highest = Math.max(highest, Number(m[1]));
  }
  return highest + 1;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function headerTemplate(fm) {
  return (
    '<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7pt;' +
    'color:#555;padding:0 0.6in;display:flex;justify-content:space-between;">' +
    `<span>${escapeHtml(fm.shortTitle)}</span>` +
    `<span>Version ${escapeHtml(fm.version)}</span>` +
    "</div>"
  );
}

function footerTemplate(fm, mode) {
  const doi = isPending(fm.doi) ? "doi:pending" : `doi:${fm.doi}`;
  const draft =
    mode === "draft"
      ? '<div style="color:#b00;font-weight:bold;">DRAFT ' +
        "&ndash; not for citation or distribution</div>"
      : "";
  return (
    '<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7pt;' +
    'color:#555;padding:0 0.6in;text-align:center;">' +
    draft +
    `<div>${escapeHtml(doi)} &middot; Page <span class="pageNumber"></span> of ` +
    '<span class="totalPages"></span></div>' +
    "</div>"
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fm = readFrontmatter(args.year);

  if (args.mode === "final") {
    const stillPending = ["doi", "softwareDoi"].filter((k) => isPending(fm[k]));
    if (stillPending.length > 0) {
      throw new Error(
        `--final refuses to build: ${stillPending.join(" and ")} still pending in ` +
          `site/src/content/reports/${args.year}/frontmatter.json. A final PDF carries ` +
          "identifiers a reader can resolve, or it is a draft."
      );
    }
  }

  buildSite(args.skipBuild);

  const stem = `GENARCH_Annual_Report_${args.year}_v${fm.version}`;
  let target;
  if (args.mode === "final") {
    target = path.join(SITE, "public", "reports", args.year, `${stem}.pdf`);
  } else {
    const dir = path.join(ROOT, "docs", "report-2026", "drafts");
    target = path.join(dir, `${stem}_draft-${nextDraftNumber(dir, stem)}.pdf`);
  }
  mkdirSync(path.dirname(target), { recursive: true });

  const server = await startServer(OUT_DIR, PORT);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const url = `http://127.0.0.1:${PORT}/reports/${args.year}/print/`;
    console.log(`[pdf] rendering ${url}`);
    const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
    if (!response || !response.ok()) {
      throw new Error(`print route returned ${response ? response.status() : "nothing"}`);
    }

    // Then let the network settle, but on a budget. The site's global stylesheet pulls
    // its typeface from a remote origin, and a request that stalls rather than fails
    // means "network idle" never arrives: waiting for it unconditionally hangs the
    // build with an idle browser and no output. What the artifact actually needs is
    // the figures decoded and the fonts resolved, and those are waited on explicitly
    // below, so a quiet network is a nicety here rather than a requirement.
    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 });
    } catch {
      console.log("[pdf] network did not go idle in 15s; continuing to the explicit waits");
    }

    // The report embeds every figure as an SVG and the global stylesheet pulls its
    // typeface over the network. Printing before either has settled produces a PDF
    // with blank figure frames or fallback metrics, and neither failure shows up in
    // the exit code, so both are waited on explicitly.
    //
    // Every wait here is bounded, and none is fatal. An unbounded wait on
    // `document.fonts.ready` hung this build three times: a remote font request that
    // stalls rather than fails leaves that promise pending forever, and the browser
    // sits at zero CPU with no output. Whether the figures actually rendered is
    // checked against the finished file by tests/test_report_pdf.py, which is a check
    // on the artifact rather than on a timer.
    await page.waitForSelector(".report-figure-image", { timeout: 30000 });

    await page
      .waitForFunction(
        () => Array.from(document.images).every((img) => img.complete),
        undefined,
        { timeout: 30000 }
      )
      .catch(() => {
        console.log("[pdf] not every image reported complete in 30s; continuing");
      });

    const fontsSettled = await page.evaluate(async () => {
      if (!document.fonts) return true;
      return Promise.race([
        document.fonts.ready.then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 8000)),
      ]);
    });
    if (!fontsSettled) {
      console.log("[pdf] fonts did not settle in 8s; printing with what is loaded");
    }

    await page.waitForTimeout(600);

    await page.emulateMedia({ media: "print" });

    const pdfOptions = {
      path: target,
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerTemplate(fm),
      footerTemplate: footerTemplate(fm, args.mode),
      margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      tagged: true,
      outline: true,
    };
    try {
      await page.pdf(pdfOptions);
    } catch (err) {
      // `tagged` and `outline` are what make the PDF navigable and readable by
      // assistive technology. If the installed Playwright rejects either, that is a
      // reason to upgrade Playwright rather than to ship an untagged report, so this
      // says so instead of retrying without them.
      throw new Error(
        "page.pdf() rejected the accessibility options (tagged, outline). Upgrade " +
          `Playwright rather than dropping them. Original error: ${err.message}`
      );
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const bytes = statSync(target).size;
  const sha256 = createHash("sha256").update(readFileSync(target)).digest("hex");
  console.log(`[pdf] wrote ${path.relative(ROOT, target)} (${bytes} bytes)`);
  console.log(`[pdf] sha256 ${sha256}`);

  if (args.mode === "final") {
    // Only a final build records the path. A draft is not served, and a `pdf_path`
    // pointing at a file the deployment does not carry would offer the reader a
    // download that 404s.
    const indexPath = path.join(ROOT, "data", "reports", args.year, "index.json");
    const index = JSON.parse(readFileSync(indexPath, "utf-8"));
    index.pdf_path = `/reports/${args.year}/${path.basename(target)}`;
    index.pdf_bytes = bytes;
    index.pdf_sha256 = sha256;
    writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", {
      encoding: "utf-8",
    });
    console.log(`[pdf] recorded pdf_path in ${path.relative(ROOT, indexPath)}`);
  }

  console.log(
    "[pdf] next: python -m pipeline.report_pdf_post " +
      `"${path.relative(ROOT, target)}"${args.mode === "final" ? " --final" : ""}`
  );
}

main().catch((err) => {
  console.error(`[pdf] ${err.message}`);
  process.exit(1);
});
