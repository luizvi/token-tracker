import { describe, expect, it, afterEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "./client.js";

const tempDbPath = join(tmpdir(), `tracker-test-${Date.now()}.db`);

afterEach(() => {
  if (existsSync(tempDbPath)) rmSync(tempDbPath, { force: true });
  if (existsSync(`${tempDbPath}-shm`)) rmSync(`${tempDbPath}-shm`, { force: true });
  if (existsSync(`${tempDbPath}-wal`)) rmSync(`${tempDbPath}-wal`, { force: true });
});

describe("createClient", () => {
  it("cria DB SQLite no path especificado", () => {
    const { sqlite, db } = createClient(tempDbPath);
    expect(existsSync(tempDbPath)).toBe(true);
    sqlite.close();
    expect(db).toBeDefined();
  });

  it("habilita WAL mode", () => {
    const { sqlite } = createClient(tempDbPath);
    const journalMode = sqlite.pragma("journal_mode", { simple: true });
    expect(journalMode).toBe("wal");
    sqlite.close();
  });

  it("habilita foreign_keys", () => {
    const { sqlite } = createClient(tempDbPath);
    const fk = sqlite.pragma("foreign_keys", { simple: true });
    expect(fk).toBe(1);
    sqlite.close();
  });

  it("aceita ':memory:' para testes", () => {
    const { sqlite, db } = createClient(":memory:");
    expect(db).toBeDefined();
    sqlite.close();
  });
});
