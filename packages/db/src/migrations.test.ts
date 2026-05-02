import { describe, expect, it } from "vitest";
import { createClient } from "./client.js";
import { runMigrations } from "./migrate.js";
import { clients, settings } from "./schema.js";
import { eq } from "drizzle-orm";

describe("migrations", () => {
  it("aplica todas as migrations num DB em memória sem erro", () => {
    const { sqlite, db } = createClient(":memory:");
    expect(() => runMigrations(db)).not.toThrow();
    sqlite.close();
  });

  it("após migração, posso INSERT em clients", () => {
    const { sqlite, db } = createClient(":memory:");
    runMigrations(db);
    const now = Date.now();
    db.insert(clients).values({
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      name: "Test Client",
      billableFactor: 0.5,
      createdAt: now,
      updatedAt: now,
    }).run();
    const rows = db.select().from(clients).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Test Client");
    sqlite.close();
  });

  it("após migração, posso INSERT em settings (key/value)", () => {
    const { sqlite, db } = createClient(":memory:");
    runMigrations(db);
    db.insert(settings).values({ key: "foo", valueJson: JSON.stringify({ bar: 1 }), updatedAt: Date.now() }).run();
    const rows = db.select().from(settings).where(eq(settings.key, "foo")).all();
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!.valueJson)).toEqual({ bar: 1 });
    sqlite.close();
  });

  it("foreign keys são respeitadas", () => {
    const { sqlite, db } = createClient(":memory:");
    runMigrations(db);
    expect(() => {
      db.insert(clients).values({
        id: "client-1", name: "C1", billableFactor: 0.4, createdAt: 1, updatedAt: 1,
      }).run();
      sqlite.exec(
        `INSERT INTO projects (id, slug, name, cwd_path, client_id, active, created_at, updated_at)
         VALUES ('p1', 'x', 'X', '/x', 'NONEXISTENT', 1, 1, 1)`,
      );
    }).toThrow(/FOREIGN KEY/);
    sqlite.close();
  });
});
