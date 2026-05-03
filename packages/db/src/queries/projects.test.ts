import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createClientRow } from "./clients.js";
import {
  createProject, listProjects, getProjectBySlug, getProjectByCwdPath, upsertProjectByCwdPath,
  getProjectById, updateProject, deleteProject,
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

  it("getProjectById retorna null quando não existe", () => {
    expect(getProjectById(db, "nonexistent")).toBeNull();
    close();
  });

  it("getProjectById retorna o projeto pelo id", () => {
    const p = createProject(db, { slug: "myp", name: "My Project", cwdPath: "/myp" });
    expect(getProjectById(db, p.id)?.id).toBe(p.id);
    close();
  });

  it("updateProject altera campos passados, mantém o resto", () => {
    const p = createProject(db, { slug: "upd", name: "Update Me", cwdPath: "/upd" });
    const updated = updateProject(db, p.id, { name: "Updated Name" });
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.slug).toBe("upd");
    close();
  });

  it("updateProject retorna null quando projeto não existe", () => {
    expect(updateProject(db, "nonexistent", { name: "X" })).toBeNull();
    close();
  });

  it("deleteProject remove o projeto e retorna true; segunda chamada retorna false", () => {
    const p = createProject(db, { slug: "del", name: "Delete Me", cwdPath: "/del" });
    expect(deleteProject(db, p.id)).toBe(true);
    expect(getProjectById(db, p.id)).toBeNull();
    expect(deleteProject(db, p.id)).toBe(false);
    close();
  });
});
