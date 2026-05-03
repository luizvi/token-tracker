import { describe, expect, it } from "vitest";
import { loadConfig, type DaemonConfig } from "./config.js";

describe("loadConfig", () => {
  it("usa defaults quando env vazio", () => {
    const cfg = loadConfig({ HOME: "/Users/luiz" });
    expect(cfg.claudeProjectsDir).toBe("/Users/luiz/.claude/projects");
    expect(cfg.dbPath.endsWith("data/tracker.db")).toBe(true);
    expect(cfg.tickIntervalMs).toBe(60_000);
    expect(cfg.anthropicApiKey).toBeUndefined();
  });

  it("respeita overrides", () => {
    const cfg = loadConfig({
      HOME: "/Users/luiz",
      CLAUDE_PROJECTS_DIR: "/custom/path",
      TRACKER_DB_PATH: "/custom/db.db",
      ANTHROPIC_API_KEY: "sk-ant-x",
      TRACKER_TICK_INTERVAL_MS: "30000",
    });
    expect(cfg.claudeProjectsDir).toBe("/custom/path");
    expect(cfg.dbPath).toBe("/custom/db.db");
    expect(cfg.anthropicApiKey).toBe("sk-ant-x");
    expect(cfg.tickIntervalMs).toBe(30_000);
  });
});
