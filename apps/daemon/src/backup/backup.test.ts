import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { backupSqlite } from "./backup.js";

let tmp: string;
afterEach(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

describe("backupSqlite", () => {
  it("gera arquivo gz no diretório de backup", async () => {
    tmp = mkdtempSync(join(tmpdir(), "tracker-bkp-"));
    const dbPath = join(tmp, "src.db");
    const sqlite = new Database(dbPath);
    sqlite.exec("CREATE TABLE x(i INTEGER); INSERT INTO x VALUES(1);");
    sqlite.close();

    const backupsDir = join(tmp, "backups");
    const out = await backupSqlite(dbPath, backupsDir);
    expect(existsSync(out)).toBe(true);
    expect(out).toMatch(/\.db\.gz$/);
  });
});
