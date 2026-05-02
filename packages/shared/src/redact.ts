import { REDACT_PATTERNS } from "./redact-patterns.js";

export function redact(text: string): string {
  let result = text;
  for (const { kind, regex } of REDACT_PATTERNS) {
    result = result.replace(regex, (match) => {
      if (kind === "ENV_PASSWORD") {
        const eqIdx = match.indexOf("=");
        return `${match.slice(0, eqIdx)}=[REDACTED:${kind}]`;
      }
      return `[REDACTED:${kind}]`;
    });
  }
  return result;
}
