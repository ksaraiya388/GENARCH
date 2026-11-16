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

/**
 * Gate 1: text contrast on the print route.
 *
 * Draft-1 printed its body text at #c7d2da on a white page, because the screen
 * theme's colours reached the PDF and nothing measured them. This walks every
 * visible text node on the route, takes its computed colour and the background it
 * actually sits on (the nearest painted ancestor, alpha-composited down to the
 * white page), and computes the WCAG contrast ratio. Body paragraphs and list items
 * must reach 7:1; everything else 4.5:1. A link inside a paragraph is an accent and
 * is held to 4.5:1, because its colour is a distinct ink chosen as one.
 *
 * Generated content (the printed URL after an external link) is not a text node and
 * is not measured; it inherits the link's colour, which is.
 */
async function contrastGate(page) {
  return page.evaluate(() => {
    const parse = (value) => {
      const m = /rgba?\(([^)]+)\)/.exec(value);
      if (!m) return null;
      const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    const over = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    });
    const channel = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const luminance = (c) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
    const ratio = (a, b) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const hex = (c) =>
      "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

    const background = (element) => {
      const layers = [];
      for (let el = element; el; el = el.parentElement) {
        const bg = parse(getComputedStyle(el).backgroundColor);
        if (bg && bg.a > 0) {
          layers.push(bg);
          if (bg.a >= 1) break;
        }
      }
      let result = { r: 255, g: 255, b: 255, a: 1 };
      for (const layer of layers.reverse()) result = over(layer, result);
      return result;
    };

    const root = document.querySelector(".report-print-page");
    if (!root) {
      return {
        checked: 0,
        offenders: [{ text: "no .report-print-page on the route", ratio: 0, floor: 7 }],
      };
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const offenders = [];
    let checked = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const el = node.parentElement;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (el.getClientRects().length === 0) continue;
      const bg = background(el);
      const fg = over(parse(style.color), bg);
      const body = el.closest(".report-p, .report-li") && !el.closest("a");
      const floor = body ? 7 : 4.5;
      const r = ratio(fg, bg);
      checked += 1;
      if (r < floor) {
        offenders.push({
          text: text.slice(0, 60),
          element: el.tagName.toLowerCase() + (el.className ? `.${el.className}` : ""),
          color: hex(fg),
          background: hex(bg),
          ratio: Math.round(r * 100) / 100,
          floor,
        });
      }
    }
    return { checked, offenders };
  });
}

/**
 * Gate 2: every table inside its container, and every element inside the measure.
 *
 * Draft-1 clipped two tables at the right page edge, and Chromium prints whatever
 * falls outside the page box as nothing at all, so the only symptom in the PDF is a
 * missing column. Measured on the print route under print media, where the measure
 * is the 6.5in the PDF lays out at.
 */
async function widthGate(page) {
  return page.evaluate(() => {
    const tolerance = 0.5;
    const root = document.querySelector(".report-print-page");
    const offenders = [];
    const label = (el) =>
      el.closest("[data-table-id]")?.getAttribute("data-table-id") ??
      el.closest("[data-figure-id]")?.getAttribute("data-figure-id") ??
      el.closest("[id]")?.id ??
      el.tagName.toLowerCase();
    let tables = 0;
    for (const table of root.querySelectorAll("table")) {
      tables += 1;
      const container = table.parentElement;
      const width = table.getBoundingClientRect().width;
      const available = container.clientWidth;
      if (width > available + tolerance) {
        offenders.push(
          `table ${label(table)}: ${width.toFixed(1)}px wide in a ${available.toFixed(1)}px container`
        );
      }
    }
    // A fixed-width table can hold its width while a word in one cell runs past the
    // cell edge and over its neighbour. That is the same defect at a smaller scale.
    for (const cell of root.querySelectorAll("th, td")) {
      if (cell.scrollWidth > cell.clientWidth + 1) {
        const column = cell.cellIndex;
        offenders.push(
          `cell in ${label(cell)}, column ${column + 1}: content ${cell.scrollWidth}px ` +
            `in a ${cell.clientWidth}px cell ("${cell.textContent.trim().slice(0, 40)}")`
        );
      }
    }
    // Only the outermost offender is reported: a table outside the measure takes its
    // rows and cells with it, and listing every one buries the table's own line.
    const measure = root.getBoundingClientRect();
    const outside = (el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      return rect.right > measure.right + tolerance || rect.left < measure.left - tolerance;
    };
    for (const el of root.querySelectorAll("*")) {
      const rect = el.getBoundingClientRect();
      if (!outside(el)) continue;
      if (el.parentElement && el.parentElement !== root && outside(el.parentElement)) continue;
      {
        offenders.push(
          `${el.tagName.toLowerCase()} in ${label(el)} sits outside the measure ` +
            `(${rect.left.toFixed(1)} to ${rect.right.toFixed(1)}px against ` +
            `${measure.left.toFixed(1)} to ${measure.right.toFixed(1)}px)`
        );
      }
    }
    return { tables, offenders };
  });
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

    // Only the report's figures are waited on. The wait used to cover every image on
    // the page, and the site footer's logo is lazy-loaded: it sits far below the
    // viewport, never comes into view, and so never loads, which held every build for
    // the full 30 seconds and then continued anyway. The figures are eager and resolve
    // in well under a second. A figure that loads with no natural width (a missing
    // file, a wrong media type) is a broken figure, and the build stops on it.
    const figureWait = await page
      .waitForFunction(
        () => {
          const figures = Array.from(document.querySelectorAll("img.report-figure-image"));
          return figures.length > 0 && figures.every((img) => img.complete);
        },
        undefined,
        { timeout: 30000 }
      )
      .then(() => true)
      .catch(() => false);
    const figureState = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img.report-figure-image")).map((img) => ({
        src: img.getAttribute("src"),
        complete: img.complete,
        width: img.naturalWidth,
      }))
    );
    const broken = figureState.filter((f) => !f.complete || f.width === 0);
    if (!figureWait || broken.length > 0) {
      throw new Error(
        "figure images did not load: " +
          (broken.length > 0
            ? broken.map((f) => `${f.src} (complete ${f.complete}, width ${f.width})`).join(", ")
            : "no figure image on the route")
      );
    }
    console.log(`[pdf] ${figureState.length} figure images loaded`);

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

    // The two gates run on the route exactly as it will print, before any file is
    // written, so a failing build leaves no PDF behind to be mistaken for a good one.
    const contrast = await contrastGate(page);
    if (contrast.offenders.length > 0) {
      const lines = contrast.offenders.map(
        (o) =>
          `  ${o.ratio}:1 < ${o.floor}:1  ${o.color} on ${o.background}  ${o.element}  "${o.text}"`
      );
      throw new Error(
        `contrast gate: ${contrast.offenders.length} text node(s) below the floor\n` +
          lines.join("\n")
      );
    }
    console.log(`[pdf] contrast gate: ${contrast.checked} text nodes, none below the floor`);

    const widths = await widthGate(page);
    if (widths.offenders.length > 0) {
      throw new Error(
        `width gate: ${widths.offenders.length} element(s) outside their container\n  ` +
          widths.offenders.join("\n  ")
      );
    }
    console.log(`[pdf] width gate: ${widths.tables} tables inside their containers`);

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
