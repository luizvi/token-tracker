import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createClientRow } from "./clients.js";
import { createEvent, listEvents, getEventById, deleteEvent } from "./events.js";

let db: DbClient;
let close: () => void;
let clientId: string;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  clientId = createClientRow(db, { name: "C" }).id;
});

describe("events", () => {
  it("createEvent insere com defaults", () => {
    const e = createEvent(db, { clientId, title: "Reunião kickoff", durationMinutes: 60, startAt: 1_000_000 });
    expect(e.kind).toBe("other");
    expect(e.durationMinutes).toBe(60);
    close();
  });

  it("listEvents filtra por clientId", () => {
    const c2 = createClientRow(db, { name: "C2" });
    createEvent(db, { clientId, title: "A", durationMinutes: 30, startAt: 1 });
    createEvent(db, { clientId: c2.id, title: "B", durationMinutes: 30, startAt: 2 });
    expect(listEvents(db, { clientId })).toHaveLength(1);
    close();
  });

  it("listEvents ordena por startAt DESC", () => {
    createEvent(db, { clientId, title: "old", durationMinutes: 1, startAt: 100 });
    createEvent(db, { clientId, title: "new", durationMinutes: 1, startAt: 200 });
    expect(listEvents(db, {}).map((e) => e.title)).toEqual(["new", "old"]);
    close();
  });

  it("deleteEvent remove e retorna true", () => {
    const e = createEvent(db, { clientId, title: "X", durationMinutes: 1, startAt: 1 });
    expect(deleteEvent(db, e.id)).toBe(true);
    expect(getEventById(db, e.id)).toBeNull();
    close();
  });
});
