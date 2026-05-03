import { join } from "node:path";

export interface DaemonConfig {
  claudeProjectsDir: string;
  dbPath: string;
  trackerRoot: string;
  anthropicApiKey: string | undefined;
  tickIntervalMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv): DaemonConfig {
  const home = env["HOME"] ?? process.env["HOME"] ?? "";
  const trackerRoot = env["TRACKER_ROOT"] ?? join(home, "dev", "tracker");
  return {
    claudeProjectsDir: env["CLAUDE_PROJECTS_DIR"] ?? join(home, ".claude", "projects"),
    dbPath: env["TRACKER_DB_PATH"] ?? join(trackerRoot, "data", "tracker.db"),
    trackerRoot,
    anthropicApiKey: env["ANTHROPIC_API_KEY"],
    tickIntervalMs: Number(env["TRACKER_TICK_INTERVAL_MS"] ?? 60_000),
  };
}
