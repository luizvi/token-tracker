import {
  upsertProjectByCwdPath, upsertSession, updateSessionOffset,
  type DbClient,
} from "@tracker/db";
import type { TranscriptDelta, TranscriptSource } from "@tracker/shared";
import { getSessionByJsonlPath } from "@tracker/db";

function deriveProjectFromDir(projectDir: string): { slug: string; name: string; cwdPath: string } {
  // "-Users-luiz-dev-csp" → cwdPath="/Users/luiz/dev/csp"
  // slug = último segmento
  const cwdPath = projectDir.startsWith("-") ? projectDir.slice(1).replace(/-/g, "/") : projectDir;
  const slug = cwdPath.split("/").filter(Boolean).pop() ?? "unknown";
  const name = slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { slug, name, cwdPath: "/" + cwdPath };
}

export async function ingestAllPending(
  db: DbClient,
  source: TranscriptSource,
): Promise<TranscriptDelta[]> {
  const files = await source.listFiles();
  const deltas: TranscriptDelta[] = [];

  for (const file of files) {
    const existing = getSessionByJsonlPath(db, file.path);
    const offset = existing?.lastProcessedOffset ?? 0;

    if (existing && offset >= file.sizeBytes) continue;

    if (!existing) {
      const proj = deriveProjectFromDir(file.projectDir);
      const project = upsertProjectByCwdPath(db, {
        slug: proj.slug,
        name: proj.name,
        cwdPath: proj.cwdPath,
        claudeProjectDir: file.projectDir,
      });
      upsertSession(db, {
        id: file.sessionId,
        projectId: project.id,
        jsonlPath: file.path,
      });
    }

    const delta = await source.readDelta(file, offset);
    if (delta.messages.length === 0 && delta.toOffset === offset) continue;

    updateSessionOffset(db, file.sessionId, delta.toOffset);
    deltas.push(delta);
  }

  return deltas;
}
