import { stat, readFile } from "node:fs/promises";
import { basename, dirname, extname } from "node:path";
import fg from "fast-glob";
import type { TranscriptDelta, TranscriptFileInfo, TranscriptSource } from "@tracker/shared";
import { parseJsonlLine } from "./jsonl-parser.js";

export class ClaudeCodeJsonlSource implements TranscriptSource {
  readonly name = "claude-code-jsonl";

  constructor(private readonly rootDir: string) {}

  async listFiles(): Promise<TranscriptFileInfo[]> {
    const matches = await fg("*/*.jsonl", { cwd: this.rootDir, absolute: true, suppressErrors: true });
    const out: TranscriptFileInfo[] = [];
    for (const path of matches) {
      const s = await stat(path);
      const sessionId = basename(path, extname(path));
      const projectDir = basename(dirname(path));
      out.push({
        path,
        sessionId,
        projectDir,
        sizeBytes: s.size,
        mtimeMs: s.mtimeMs,
      });
    }
    return out;
  }

  async readDelta(file: TranscriptFileInfo, fromOffset: number): Promise<TranscriptDelta> {
    const buf = await readFile(file.path);
    const slice = buf.subarray(fromOffset);
    const text = slice.toString("utf8");
    const messages = [];
    let consumed = fromOffset;
    let lineStart = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\n") {
        const line = text.slice(lineStart, i);
        const msg = parseJsonlLine(line);
        if (msg) messages.push(msg);
        consumed = fromOffset + Buffer.byteLength(text.slice(0, i + 1), "utf8");
        lineStart = i + 1;
      }
    }
    return {
      file,
      fromOffset,
      toOffset: consumed,
      messages,
    };
  }
}
