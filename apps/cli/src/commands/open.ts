import { execSync } from "node:child_process";
import { ui } from "../ui.js";

export function openCommand(): void {
  const url = "http://localhost:4833";
  ui.info(`Abrindo ${url}...`);
  try { execSync(`open "${url}"`); } catch { ui.warn("Falha ao abrir browser. URL: " + url); }
}
