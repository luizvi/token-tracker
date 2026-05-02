import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createProject } from "./projects.js";
import { upsertSession } from "./sessions.js";
import { createTask } from "./tasks.js";
import { createTag, listTags, attachTagToTask, listTagsForTask } from "./tags.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("tags", () => {
  it("createTag + listTags retorna ordenado por nome", () => {
    createTag(db, { name: "hotfix" });
    createTag(db, { name: "feature" });
    expect(listTags(db).map((t) => t.name)).toEqual(["feature", "hotfix"]);
    close();
  });

  it("attachTagToTask cria many-to-many", () => {
    const projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
    const sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
    const task = createTask(db, { projectId, sessionId, title: "T", startedAt: 1 });
    const tag = createTag(db, { name: "research" });
    attachTagToTask(db, task.id, tag.id);
    const tags = listTagsForTask(db, task.id);
    expect(tags).toHaveLength(1);
    expect(tags[0]!.name).toBe("research");
    close();
  });
});
