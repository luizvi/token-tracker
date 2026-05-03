#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , templatePath, outPath] = process.argv;
if (!templatePath || !outPath) {
  console.error("Usage: render-plist.js <template> <out>");
  process.exit(1);
}

const template = readFileSync(templatePath, "utf8");
const replacements = {
  HOME: process.env.HOME ?? "",
  TRACKER_ROOT: process.env.TRACKER_ROOT ?? resolve("."),
  NODE_BIN: process.env.NODE_BIN ?? process.execPath,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "",
};

let out = template;
for (const [k, v] of Object.entries(replacements)) {
  out = out.replaceAll(`{{${k}}}`, v);
}

writeFileSync(outPath, out, { mode: 0o644 });
console.log(`✓ ${outPath}`);
