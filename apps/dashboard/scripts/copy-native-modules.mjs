#!/usr/bin/env node
// Post-build: copia native modules (better-sqlite3) para o output standalone.
// Necessário porque Next.js standalone não rastreia .node bindings em monorepos pnpm.

import { existsSync, mkdirSync, cpSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashRoot = resolve(__dirname, "..");
const repoRoot = resolve(dashRoot, "..", "..");
const standaloneDashboardRoot = join(dashRoot, ".next", "standalone", "apps", "dashboard");

const NATIVE_PACKAGES = ["better-sqlite3", "bindings", "file-uri-to-path"];

function findPackageInPnpmStore(pkgName) {
  const pnpmDir = join(repoRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;
  const dirs = readdirSync(pnpmDir);
  const match = dirs.find((d) => d.startsWith(`${pkgName}@`));
  return match ? join(pnpmDir, match, "node_modules", pkgName) : null;
}

function main() {
  if (!existsSync(standaloneDashboardRoot)) {
    console.error("✗ standalone dashboard root not found:", standaloneDashboardRoot);
    process.exit(1);
  }

  const targetNodeModules = join(standaloneDashboardRoot, "node_modules");
  mkdirSync(targetNodeModules, { recursive: true });

  for (const pkg of NATIVE_PACKAGES) {
    const src = findPackageInPnpmStore(pkg);
    if (!src) {
      console.warn(`⚠ ${pkg} not found in pnpm store`);
      continue;
    }
    const dest = join(targetNodeModules, pkg);
    cpSync(src, dest, { recursive: true, dereference: true });
    console.log(`✓ Copied ${pkg} → standalone`);
  }

  // Next standalone NÃO copia .next/static nem public/ automaticamente.
  // Sem isso, o servidor retorna 404 para todos os assets (CSS, JS chunks, fonts).
  const staticSrc = join(dashRoot, ".next", "static");
  const staticDest = join(standaloneDashboardRoot, ".next", "static");
  if (existsSync(staticSrc)) {
    cpSync(staticSrc, staticDest, { recursive: true, dereference: true });
    console.log("✓ Copied .next/static → standalone");
  }

  const publicSrc = join(dashRoot, "public");
  const publicDest = join(standaloneDashboardRoot, "public");
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, publicDest, { recursive: true, dereference: true });
    console.log("✓ Copied public/ → standalone");
  }
}

main();
