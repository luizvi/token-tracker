import { jaccardSimilarity } from "@tracker/shared";
import { isInNightWindow } from "../time.js";

export interface BoundaryDecisionInput {
  newUser: { ts: number; text: string };
  prevAssistantTs: number | null;
  lastUserText: string | null;
  lastSkill: string | null;
  currentSkill: string | null;
  settings: {
    gapMinutesBase: number;
    nightHoursStart: number;
    nightHoursEnd: number;
    semanticThreshold: number;
    resumeKeywords: readonly string[];
    newTopicKeywords: readonly string[];
  };
}

export type BoundaryAction = "start" | "continue" | "close-and-start" | "pause";

export interface BoundaryDecision {
  action: BoundaryAction;
  confidence: number;
  reason: string;
}

function matchesAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.slice(0, 200).toLowerCase();
  return keywords.some((kw) => {
    const kwLower = kw.toLowerCase().trim();
    const idx = lower.indexOf(kwLower);
    if (idx === -1) return false;
    // word-boundary check: char before and after must not be a letter/digit
    const before = idx === 0 ? true : !/\w/.test(lower[idx - 1]!);
    const after = idx + kwLower.length >= lower.length ? true : !/\w/.test(lower[idx + kwLower.length]!);
    return before && after;
  });
}

export function decideBoundary(input: BoundaryDecisionInput): BoundaryDecision {
  if (input.prevAssistantTs === null || input.lastUserText === null) {
    return { action: "start", confidence: 1, reason: "no-prev-task" };
  }

  if (matchesAny(input.newUser.text, input.settings.resumeKeywords)) {
    return { action: "continue", confidence: 1, reason: "explicit-resume" };
  }

  const gapMs = input.newUser.ts - input.prevAssistantTs;
  const gapBaseMs = input.settings.gapMinutesBase * 60_000;
  const inNight = isInNightWindow(input.newUser.ts, input.settings.nightHoursStart, input.settings.nightHoursEnd);

  if (inNight && gapMs > gapBaseMs) {
    return { action: "pause", confidence: 1, reason: "night-window-pause" };
  }

  // Skill change is always a boundary signal
  if (input.lastSkill !== null && input.currentSkill !== null && input.lastSkill !== input.currentSkill) {
    return { action: "close-and-start", confidence: 1, reason: "explicit-new-topic-or-skill" };
  }

  if (gapMs > gapBaseMs) {
    // Only check newTopicKeywords when gap is large enough
    if (matchesAny(input.newUser.text, input.settings.newTopicKeywords)) {
      return { action: "close-and-start", confidence: 1, reason: "explicit-new-topic-or-skill" };
    }
    const sim = jaccardSimilarity(input.newUser.text.slice(0, 500), input.lastUserText.slice(0, 500));
    if (sim < input.settings.semanticThreshold) {
      return { action: "close-and-start", confidence: 0.7, reason: "gap-and-low-similarity" };
    }
    return { action: "continue", confidence: 0.6, reason: "gap-but-high-similarity" };
  }

  return { action: "continue", confidence: 1, reason: "default" };
}
