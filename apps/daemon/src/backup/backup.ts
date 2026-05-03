import { createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { join } from "node:path";
import Database from "better-sqlite3";

export async function backupSqlite(dbPath: string, backupsDir: string, retentionDays = 30): Promise<string> {
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const targetGz = join(backupsDir, `tracker-${today}.db.gz`);

  const sqlite = new Database(dbPath, { readonly: true });
  const tmpPath = join(backupsDir, `.tracker-backup-${today}.db`);
  await sqlite.backup(tmpPath);
  sqlite.close();

  // Gzip
  const { createReadStream } = await import("node:fs");
  await pipeline(createReadStream(tmpPath), createGzip(), createWriteStream(targetGz));
  unlinkSync(tmpPath);

  // Rotação: manter últimos N
  const cutoffMs = Date.now() - retentionDays * 86400000;
  for (const file of readdirSync(backupsDir)) {
    if (!file.startsWith("tracker-") || !file.endsWith(".db.gz")) continue;
    const datePart = file.slice("tracker-".length, "tracker-".length + 10);
    const ts = Date.parse(datePart);
    if (Number.isFinite(ts) && ts < cutoffMs) {
      unlinkSync(join(backupsDir, file));
    }
  }

  return targetGz;
}
