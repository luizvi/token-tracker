import type { TranscriptMessage } from "@tracker/shared";

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
}

export function parseJsonlLine(line: string): TranscriptMessage | null {
  if (!line || line.length < 2) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }

  const type = obj["type"];
  if (type !== "user" && type !== "assistant") return null;

  const uuid = obj["uuid"];
  const timestamp = obj["timestamp"];
  const message = obj["message"] as Record<string, unknown> | undefined;
  if (typeof uuid !== "string" || typeof timestamp !== "string" || !message) return null;

  const role = message["role"];
  if (role !== "user" && role !== "assistant") return null;

  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) return null;

  let text = "";
  const toolUses: Array<{ name: string; input: unknown }> = [];
  const content = message["content"];
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    const blocks = content as ContentBlock[];
    for (const b of blocks) {
      if (b.type === "text" && typeof b.text === "string") text += b.text;
      else if (b.type === "tool_use" && b.name) toolUses.push({ name: b.name, input: b.input });
    }
  }

  const usage = message["usage"] as Record<string, number> | undefined;
  const model = message["model"];

  const out: TranscriptMessage = {
    uuid,
    role,
    timestampMs: ts,
    text,
  };

  if (typeof model === "string") out.model = model;
  if (toolUses.length > 0) out.toolUses = toolUses;
  if (usage) {
    out.tokens = {
      input: Number(usage["input_tokens"] ?? 0),
      output: Number(usage["output_tokens"] ?? 0),
      cacheRead: Number(usage["cache_read_input_tokens"] ?? 0),
      cacheCreation: Number(usage["cache_creation_input_tokens"] ?? 0),
    };
  }

  return out;
}
