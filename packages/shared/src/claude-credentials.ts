import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CLAUDE_CODE_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const KEYCHAIN_SERVICE = "Claude Code-credentials";
const OAUTH_TOKEN_ENDPOINT = "https://console.anthropic.com/v1/oauth/token";

interface ClaudeOAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface CredentialsFile {
  claudeAiOauth?: ClaudeOAuth;
}

interface CachedToken {
  accessToken: string;
  /** Quando, em ms epoch, devemos reler do keychain mesmo que ainda válido. */
  staleAt: number;
}

let cache: CachedToken | null = null;
const CACHE_TTL_MS = 60_000;
/** Margem de segurança: refresh quando faltar ≤ 2min pra expirar. */
const EXPIRY_MARGIN_MS = 2 * 60_000;

function readKeychain(): ClaudeOAuth | null {
  if (process.platform !== "darwin") return null;
  const debug = process.env["TRACKER_DEBUG_AUTH"];
  try {
    const raw = execFileSync("/usr/bin/security", [
      "find-generic-password",
      "-s", "Claude Code-credentials",
      "-w",
    ], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    if (debug) console.warn("[auth] keychain read OK, len=", raw.length);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CredentialsFile;
    return parsed.claudeAiOauth ?? null;
  } catch (err) {
    if (debug) {
      const e = err as { message?: string; stderr?: Buffer | string; status?: number };
      console.warn("[auth] keychain read failed:", e.message, "status=", e.status, "stderr=", String(e.stderr ?? ""));
    }
    return null;
  }
}

function readCredentialsFile(): ClaudeOAuth | null {
  const home = process.env["HOME"] ?? "";
  if (!home) return null;
  try {
    const raw = readFileSync(join(home, ".claude", ".credentials.json"), "utf8");
    const parsed = JSON.parse(raw) as CredentialsFile;
    return parsed.claudeAiOauth ?? null;
  } catch {
    return null;
  }
}

function readKeychainAccount(): string | null {
  if (process.platform !== "darwin") return null;
  try {
    // Saída do `security find-generic-password` (sem -w) inclui linhas como `"acct"<blob>="user@host"`.
    const out = execFileSync("/usr/bin/security", [
      "find-generic-password", "-s", KEYCHAIN_SERVICE,
    ], { stdio: ["ignore", "pipe", "pipe"] }).toString();
    const m = out.match(/"acct"<blob>="([^"]+)"/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function writeOAuthToStorage(next: ClaudeOAuth): void {
  const payload: CredentialsFile = { claudeAiOauth: next };
  const json = JSON.stringify(payload);
  if (process.platform === "darwin") {
    const acct = readKeychainAccount() ?? process.env["USER"] ?? "claude";
    try {
      execFileSync("/usr/bin/security", [
        "add-generic-password", "-U",
        "-s", KEYCHAIN_SERVICE,
        "-a", acct,
        "-w", json,
      ], { stdio: ["ignore", "ignore", "pipe"] });
      return;
    } catch (err) {
      if (process.env["TRACKER_DEBUG_AUTH"]) console.warn("[auth] keychain write failed:", String(err));
    }
  }
  // Fallback: arquivo
  const home = process.env["HOME"] ?? "";
  if (home) {
    try {
      writeFileSync(join(home, ".claude", ".credentials.json"), json, { mode: 0o600 });
    } catch (err) {
      if (process.env["TRACKER_DEBUG_AUTH"]) console.warn("[auth] file write failed:", String(err));
    }
  }
}

let inflightRefresh: Promise<ClaudeOAuth | null> | null = null;

async function refreshOAuth(refreshToken: string): Promise<ClaudeOAuth | null> {
  if (inflightRefresh) return inflightRefresh;
  const debug = process.env["TRACKER_DEBUG_AUTH"];
  inflightRefresh = (async () => {
    try {
      const res = await fetch(OAUTH_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: CLAUDE_CODE_CLIENT_ID,
        }),
      });
      if (!res.ok) {
        if (debug) console.warn("[auth] refresh failed:", res.status, await res.text().catch(() => ""));
        return null;
      }
      const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
      const next: ClaudeOAuth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        ...(data.expires_in !== undefined ? { expiresAt: Date.now() + data.expires_in * 1000 } : {}),
      };
      writeOAuthToStorage(next);
      if (debug) console.warn("[auth] refresh OK, new expiresAt=", next.expiresAt);
      return next;
    } catch (err) {
      if (debug) console.warn("[auth] refresh error:", String(err));
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();
  return inflightRefresh;
}

/**
 * Resolve o token OAuth do plano Max/Pro do Claude Code.
 * Ordem: keychain (macOS) → ~/.claude/.credentials.json → env CLAUDE_CODE_OAUTH_TOKEN/ANTHROPIC_AUTH_TOKEN.
 *
 * Faz refresh automático se o token está perto de expirar (≤2min) e há refreshToken disponível.
 * Cacheia o accessToken por 60s; após isso, relê — assim pegamos rotações que o CC fizer paralelamente.
 * Retorna null se não encontrar credencial nem conseguir refresh.
 */
export async function getClaudeOAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (cache && cache.staleAt > now) return cache.accessToken;

  let oauth = readKeychain() ?? readCredentialsFile();

  // Se está expirado/próximo, e temos refreshToken, faz refresh.
  if (oauth?.refreshToken && oauth.expiresAt && oauth.expiresAt <= now + EXPIRY_MARGIN_MS) {
    const refreshed = await refreshOAuth(oauth.refreshToken);
    if (refreshed) oauth = refreshed;
  }

  if (oauth?.accessToken) {
    cache = { accessToken: oauth.accessToken, staleAt: now + CACHE_TTL_MS };
    return oauth.accessToken;
  }

  const fromEnv =
    process.env["CLAUDE_CODE_OAUTH_TOKEN"] ?? process.env["ANTHROPIC_AUTH_TOKEN"];
  if (fromEnv) {
    cache = { accessToken: fromEnv, staleAt: now + CACHE_TTL_MS };
    return fromEnv;
  }
  return null;
}

/** Força refresh imediato (útil ao tratar 401 do servidor). Retorna o novo token ou null. */
export async function refreshClaudeOAuthToken(): Promise<string | null> {
  cache = null;
  const oauth = readKeychain() ?? readCredentialsFile();
  if (!oauth?.refreshToken) return null;
  const refreshed = await refreshOAuth(oauth.refreshToken);
  if (!refreshed) return null;
  cache = { accessToken: refreshed.accessToken, staleAt: Date.now() + CACHE_TTL_MS };
  return refreshed.accessToken;
}

/** Limpa cache — útil em testes ou após auth manual. */
export function clearClaudeCredentialsCache(): void {
  cache = null;
}
