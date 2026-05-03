import { readFile } from "node:fs/promises";
import { parseJsonlLine } from "@tracker/daemon/ingestor/jsonl-parser";
import type { TranscriptMessage } from "@tracker/shared";

export async function readTaskMessages(
  jsonlPath: string,
  firstMessageUuid: string | null,
  lastMessageUuid: string | null,
  maxMessages = 200,
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
    out.push(msg);
    if (lastMessageUuid && msg.uuid === lastMessageUuid) break;
    if (out.length >= maxMessages) break;
  }
  return out;
}
