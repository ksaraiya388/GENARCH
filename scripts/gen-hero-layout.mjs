// Deterministic hero-graph layout generator.
//
// Reads data/graph/graph.json, selects the highest-degree subgraph, runs a
// seeded Fruchterman-Reingold force layout ONCE, and writes the finished node
// positions to data/graph/hero_layout.json. The layout is fully deterministic
// (fixed seed, fixed iteration count, deterministic ordering, rounded output),
// so re-running produces a byte-identical file and the hero figure renders the
// same pixels every time. The site reads the committed file; it never runs a
// live simulation.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "data", "graph", "graph.json");
// Written outside data/graph/ so the pipeline validator does not try to parse it
// as a GraphSchema. copy-data.js copies all of data/ recursively, so the site
// still picks it up under _data/figures/.
const OUT = path.join(ROOT, "data", "figures", "hero_layout.json");

const N_NODES = 30; // nodes shown in the hero
const N_LABELS = 8; // highest-degree nodes to label
const ITERS = 500;
const W = 1000;
const H = 1000;
const SEED = 0x9e3779b9;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const graph = JSON.parse(fs.readFileSync(GRAPH, "utf-8"));
const allNodes = graph.nodes ?? [];
const allEdges = graph.edges ?? [];

const degree = new Map(allNodes.map((n) => [n.id, 0]));
for (const e of allEdges) {
  if (degree.has(e.source)) degree.set(e.source, degree.get(e.source) + 1);
  if (degree.has(e.target)) degree.set(e.target, degree.get(e.target) + 1);
}

const selected = [...allNodes]
  .sort((a, b) => degree.get(b.id) - degree.get(a.id) || byId(a.id, b.id))
  .slice(0, N_NODES);
const selectedIds = new Set(selected.map((n) => n.id));

const subEdges = allEdges
  .filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
  .sort((a, b) => byId(a.id, b.id));

const nodes = [...selected].sort((a, b) => byId(a.id, b.id));
const idx = new Map(nodes.map((n, i) => [n.id, i]));

const rnd = mulberry32(SEED);
const pos = nodes.map(() => ({ x: rnd() * W, y: rnd() * H }));

const k = Math.sqrt((W * H) / nodes.length) * 0.8;
let temp = W / 6;
const cool = temp / (ITERS + 1);

for (let it = 0; it < ITERS; it++) {
  const disp = nodes.map(() => ({ x: 0, y: 0 }));

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = pos[i].x - pos[j].x;
      const dy = pos[i].y - pos[j].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const f = (k * k) / d;
      const ux = dx / d;
      const uy = dy / d;
      disp[i].x += ux * f;
      disp[i].y += uy * f;
      disp[j].x -= ux * f;
      disp[j].y -= uy * f;
    }
  }

  for (const e of subEdges) {
    const a = idx.get(e.source);
    const b = idx.get(e.target);
    const dx = pos[a].x - pos[b].x;
    const dy = pos[a].y - pos[b].y;
    const d = Math.hypot(dx, dy) || 0.01;
    const f = (d * d) / k;
    const ux = dx / d;
    const uy = dy / d;
    disp[a].x -= ux * f;
    disp[a].y -= uy * f;
    disp[b].x += ux * f;
    disp[b].y += uy * f;
  }

  for (let i = 0; i < nodes.length; i++) {
    disp[i].x += (W / 2 - pos[i].x) * 0.02;
    disp[i].y += (H / 2 - pos[i].y) * 0.02;
  }

  for (let i = 0; i < nodes.length; i++) {
    const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
    pos[i].x += (disp[i].x / d) * Math.min(d, temp);
    pos[i].y += (disp[i].y / d) * Math.min(d, temp);
    pos[i].x = Math.min(W, Math.max(0, pos[i].x));
    pos[i].y = Math.min(H, Math.max(0, pos[i].y));
  }
  temp -= cool;
}

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (const p of pos) {
  minX = Math.min(minX, p.x);
  minY = Math.min(minY, p.y);
  maxX = Math.max(maxX, p.x);
  maxY = Math.max(maxY, p.y);
}
const spanX = maxX - minX || 1;
const spanY = maxY - minY || 1;
const pad = 0.06;
const round = (v) => Math.round(v * 10000) / 10000;

const labeledIds = new Set(
  [...nodes]
    .sort((a, b) => degree.get(b.id) - degree.get(a.id) || byId(a.id, b.id))
    .slice(0, N_LABELS)
    .map((n) => n.id)
);

const outNodes = nodes.map((n, i) => ({
  id: n.id,
  type: n.type,
  label: n.label,
  degree: degree.get(n.id),
  x: round(pad + (1 - 2 * pad) * ((pos[i].x - minX) / spanX)),
  y: round(pad + (1 - 2 * pad) * ((pos[i].y - minY) / spanY)),
  labeled: labeledIds.has(n.id),
}));

const outEdges = subEdges.map((e) => ({
  source: e.source,
  target: e.target,
  direction: e.attrs?.direction ?? "unknown",
  strength: typeof e.attrs?.strength === "number" ? e.attrs.strength : 0.5,
}));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ nodes: outNodes, edges: outEdges }, null, 2) + "\n", "utf-8");
console.log(`hero_layout.json written: ${outNodes.length} nodes, ${outEdges.length} edges`);
