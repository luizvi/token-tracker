import { HaikuClient } from "@tracker/daemon/refiner/haiku-client";
import { setRefinerPrompts } from "@tracker/daemon/refiner/prompts";
import { getSetting, type DbClient } from "@tracker/db";
import { getClaudeOAuthToken } from "@tracker/shared";

export class HaikuUnavailableError extends Error {
  constructor() {
    super("Sem credencial: rode `claude setup-token`, configure ANTHROPIC_API_KEY no .env, ou faça login via Claude Code");
  }
}

export async function makeHaikuClient(
  db: DbClient,
  opts?: { model?: string },
): Promise<HaikuClient> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const authToken = await getClaudeOAuthToken();
  if (!apiKey && !authToken) throw new HaikuUnavailableError();
  setRefinerPrompts({
    refine: getSetting<string>(db, "haiku.refinePrompt") ?? null,
    estimate: getSetting<string>(db, "haiku.estimatePrompt") ?? null,
  });
  return new HaikuClient({
    ...(apiKey ? { apiKey } : {}),
    ...(authToken ? { authToken } : {}),
    model: opts?.model ?? getSetting<string>(db, "haiku.model") ?? "claude-haiku-4-5-20251001",
    requestsPerSecond: getSetting<number>(db, "haiku.requestsPerSecond") ?? 1,
  });
}
