#!/usr/bin/env node
/**
 * Copies ../data into ./_data so the Next.js build can access it
 * regardless of how the working directory is configured (Vercel, CI, local).
 */
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "..", "..", "data");
const dest = path.resolve(__dirname, "..", "_data");

if (!fs.existsSync(src)) {
  console.log(`[copy-data] Source ${src} not found — skipping.`);
  process.exit(0);
}

function copyRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Remove stale copy
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

copyRecursive(src, dest);
console.log(`[copy-data] Copied ${src} → ${dest}`);
