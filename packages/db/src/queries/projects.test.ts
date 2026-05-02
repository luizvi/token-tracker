import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createClientRow } from "./clients.js";
import {
  createProject, listProjects, getProjectBySlug, getProjectByCwdPath, upsertProjectByCwdPath,
} from "./projects.js";

let db: DbClient;
let close: () => void;

beforeEach(() => {
  const handles = createDb(":memory:");
  db = handles.db;
  close = () => handles.sqlite.close();
  runMigrations(db);
});

describe("projects queries", () => {
  it("createProject insere com slug e cwd_path", () => {
    const p = createProject(db, {
      slug: "sinusal-legado",
      name: "Sinusal Legado",
      cwdPath: "/Users/luiz/dev/sinusal/sinusal-legado",
    });
    expect(p.slug).toBe("sinusal-legado");
    expect(p.cwdPath).toBe("/Users/luiz/dev/sinusal/sinusal-legado");
    close();
  });

  it("getProjectBySlug e getProjectByCwdPath retornam o mesmo project", () => {
    const p = createProject(db, { slug: "csp", name: "CSP", cwdPath: "/Users/luiz/dev/csp" });
    expect(getProjectBySlug(db, "csp")?.id).toBe(p.id);
    expect(getProjectByCwdPath(db, "/Users/luiz/dev/csp")?.id).toBe(p.id);
    close();
  });

  it("upsertProjectByCwdPath cria se não existe, retorna existente se existe", () => {
    const path = "/Users/luiz/dev/foo";
    const a = upsertProjectByCwdPath(db, { slug: "foo", name: "Foo", cwdPath: path });
    const b = upsertProjectByCwdPath(db, { slug: "foo", name: "Foo", cwdPath: path });
    expect(a.id).toBe(b.id);
    close();
  });

  it("createProject pode associar a um client", () => {
    const c = createClientRow(db, { name: "Acme" });
    const p = createProject(db, { slug: "acme-app", name: "Acme App", cwdPath: "/x", clientId: c.id });
    expect(p.clientId).toBe(c.id);
    close();
  });

  it("listProjects retorna ordenado por nome ascendente", () => {
    createProject(db, { slug: "b", name: "Beta", cwdPath: "/b" });
    createProject(db, { slug: "a", name: "Alpha", cwdPath: "/a" });
    expect(listProjects(db).map((p) => p.name)).toEqual(["Alpha", "Beta"]);
    close();
  });
});
