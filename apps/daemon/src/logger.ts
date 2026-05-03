type Level = "info" | "warn" | "error";

export interface Logger {
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

export function createLogger(prefix = "[daemon]"): Logger {
  const log = (level: Level) => (msg: string, meta?: unknown) => {
    const ts = new Date().toISOString();
    const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
    const line = `${ts} ${prefix} ${level.toUpperCase()} ${msg}${metaStr}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
  };
}
