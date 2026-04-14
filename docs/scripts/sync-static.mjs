#!/usr/bin/env node
/**
 * Copies the hand-authored static site into public/ so Next dev/build can serve it.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(__dirname, "..");
const publicDir = path.join(docsRoot, "public");

const FILES = ["index.html", "styles.css", "script.js"];

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    const stat = fs.statSync(from);
    if (stat.isDirectory()) {
      copyDirRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

fs.mkdirSync(publicDir, { recursive: true });
for (const f of FILES) {
  const from = path.join(docsRoot, f);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(publicDir, f));
  }
}
copyDirRecursive(path.join(docsRoot, "assets"), path.join(publicDir, "assets"));
