export interface TranscriptMessage {
  uuid: string;
  role: "user" | "assistant" | "system";
  timestampMs: number;
  text: string;
  model?: string;
  tokens?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  };
  toolUses?: Array<{ name: string; input: unknown }>;
}

export interface TranscriptFileInfo {
  path: string;
  sessionId: string;
  projectDir: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface TranscriptDelta {
  file: TranscriptFileInfo;
  fromOffset: number;
  toOffset: number;
  messages: TranscriptMessage[];
}

export interface TranscriptSource {
  readonly name: string;
  listFiles(): Promise<TranscriptFileInfo[]>;
  readDelta(file: TranscriptFileInfo, fromOffset: number): Promise<TranscriptDelta>;
}
