import { newId } from "@tracker/shared";
import { asc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { tags, taskTags } from "../schema.js";

export type TagRow = typeof tags.$inferSelect;

export function createTag(db: DbClient, input: { name: string; color?: string | null }): TagRow {
  const row = { id: newId(), name: input.name, color: input.color ?? null, createdAt: Date.now() };
  db.insert(tags).values(row).run();
  return row as TagRow;
}

export function listTags(db: DbClient): TagRow[] {
  return db.select().from(tags).orderBy(asc(tags.name)).all();
}

export function attachTagToTask(db: DbClient, taskId: string, tagId: string): void {
  db.insert(taskTags).values({ taskId, tagId }).onConflictDoNothing().run();
}

export function listTagsForTask(db: DbClient, taskId: string): TagRow[] {
  return db.select({
    id: tags.id, name: tags.name, color: tags.color, createdAt: tags.createdAt,
  }).from(taskTags).innerJoin(tags, eq(tags.id, taskTags.tagId)).where(eq(taskTags.taskId, taskId)).all();
}
