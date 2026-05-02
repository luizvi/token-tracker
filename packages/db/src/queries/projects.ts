import { newId } from "@tracker/shared";
import { asc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { projects } from "../schema.js";

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectInput = {
  slug: string;
  name: string;
  cwdPath: string;
  claudeProjectDir?: string | null;
  clientId?: string | null;
  color?: string | null;
};

export function createProject(db: DbClient, input: NewProjectInput): ProjectRow {
  const now = Date.now();
  const row = {
    id: newId(),
    slug: input.slug,
    name: input.name,
    cwdPath: input.cwdPath,
    claudeProjectDir: input.claudeProjectDir ?? null,
    clientId: input.clientId ?? null,
    color: input.color ?? null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(projects).values(row).run();
  return row as ProjectRow;
}

export function listProjects(db: DbClient): ProjectRow[] {
  return db.select().from(projects).orderBy(asc(projects.name)).all();
}

export function getProjectBySlug(db: DbClient, slug: string): ProjectRow | null {
  return db.select().from(projects).where(eq(projects.slug, slug)).all()[0] ?? null;
}

export function getProjectByCwdPath(db: DbClient, cwdPath: string): ProjectRow | null {
  return db.select().from(projects).where(eq(projects.cwdPath, cwdPath)).all()[0] ?? null;
}

export function upsertProjectByCwdPath(db: DbClient, input: NewProjectInput): ProjectRow {
  const existing = getProjectByCwdPath(db, input.cwdPath);
  if (existing) return existing;
  return createProject(db, input);
}
