import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import {
  createClientRow, listClients, getClientById, updateClient, deleteClient,
} from "./clients.js";

let db: DbClient;
let close: () => void;

beforeEach(() => {
  const handles = createDb(":memory:");
  db = handles.db;
  close = () => handles.sqlite.close();
  runMigrations(db);
});

describe("clients queries", () => {
  it("createClientRow insere e retorna a row", () => {
    const c = createClientRow(db, { name: "Sinusal Laudos", billableFactor: 0.5 });
    expect(c.id).toBeDefined();
    expect(c.name).toBe("Sinusal Laudos");
    expect(c.billableFactor).toBe(0.5);
    close();
  });

  it("listClients retorna em ordem alfabética", () => {
    createClientRow(db, { name: "Zebra Co" });
    createClientRow(db, { name: "Alpha Co" });
    const rows = listClients(db);
    expect(rows.map((r) => r.name)).toEqual(["Alpha Co", "Zebra Co"]);
    close();
  });

  it("getClientById retorna null quando não existe", () => {
    expect(getClientById(db, "nonexistent")).toBeNull();
    close();
  });

  it("updateClient altera campos passados, mantém o resto", () => {
    const c = createClientRow(db, { name: "Foo", billableFactor: 0.4 });
    const updated = updateClient(db, c.id, { billableFactor: 0.6 });
    expect(updated?.billableFactor).toBe(0.6);
    expect(updated?.name).toBe("Foo");
    close();
  });

  it("deleteClient remove a row e retorna true; segunda chamada retorna false", () => {
    const c = createClientRow(db, { name: "Foo" });
    expect(deleteClient(db, c.id)).toBe(true);
    expect(getClientById(db, c.id)).toBeNull();
    expect(deleteClient(db, c.id)).toBe(false);
    close();
  });

  it("createClientRow valida nome único (lança em duplicata)", () => {
    createClientRow(db, { name: "Same" });
    expect(() => createClientRow(db, { name: "Same" })).toThrow();
    close();
  });
});
