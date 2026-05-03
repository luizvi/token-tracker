import { readFile } from "node:fs/promises";
import { parseJsonlLine } from "@tracker/daemon/ingestor/jsonl-parser";
import type { TranscriptMessage } from "@tracker/shared";

export interface TranscriptSegment {
  jsonlPath: string;
  firstMessageUuid: string | null;
  lastMessageUuid: string | null;
}

async function readSegment(
  jsonlPath: string,
  firstMessageUuid: string | null,
  lastMessageUuid: string | null,
  maxMessages: number,
): Promise<TranscriptMessage[]> {
  let buf: string;
  try {
    buf = await readFile(jsonlPath, "utf8");
  } catch {
    return [];
  }
  const out: TranscriptMessage[] = [];
  let started = firstMessageUuid === null;
  for (const line of buf.split("\n")) {
    if (!line.trim()) continue;
    const msg = parseJsonlLine(line);
    if (!msg) continue;
    if (!started) {
      if (msg.uuid === firstMessageUuid) started = true;
      else continue;
    }
    const hasText = msg.text.trim().length > 0;
    const hasToolUses = (msg.toolUses?.length ?? 0) > 0;
    if (!hasText && !hasToolUses) {
      if (lastMessageUuid && msg.uuid === lastMessageUuid) break;
      continue;
    }
    out.push(msg);
    if (lastMessageUuid && msg.uuid === lastMessageUuid) break;
    if (out.length >= maxMessages) break;
  }
  return out;
}

export async function readTaskMessages(
  jsonlPath: string,
  firstMessageUuid: string | null,
  lastMessageUuid: string | null,
  maxMessages = 200,
): Promise<TranscriptMessage[]> {
  return readSegment(jsonlPath, firstMessageUuid, lastMessageUuid, maxMessages);
}

/** Lê e concatena múltiplos segmentos (resultado de merge cross-session). Ordena por timestamp. */
export async function readTaskMessagesFromSegments(
  segments: TranscriptSegment[],
  maxMessages = 500,
): Promise<TranscriptMessage[]> {
  const all: TranscriptMessage[] = [];
  for (const seg of segments) {
    const slice = await readSegment(seg.jsonlPath, seg.firstMessageUuid, seg.lastMessageUuid, maxMessages);
    all.push(...slice);
    if (all.length >= maxMessages) break;
  }
  all.sort((a, b) => a.timestampMs - b.timestampMs);
  // Dedup por uuid (caso segmentos se sobreponham).
  const seen = new Set<string>();
  return all.filter((m) => (seen.has(m.uuid) ? false : (seen.add(m.uuid), true))).slice(0, maxMessages);
}
