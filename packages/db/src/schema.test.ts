import { describe, expect, it } from "vitest";
import {
  clients, projects, sessions, tasks, tags, taskTags, manualEvents,
  modelPricing, currencyRates, settings, daemonRuns, devs, goals, notes,
} from "./schema.js";

describe("schema exports", () => {
  it("exporta tabelas Fase 1", () => {
    for (const t of [clients, projects, sessions, tasks, tags, taskTags, manualEvents, modelPricing, currencyRates, settings, daemonRuns]) {
      expect(t).toBeDefined();
    }
  });

  it("exporta tabelas placeholder Fase 2", () => {
    expect(devs).toBeDefined();
    expect(goals).toBeDefined();
    expect(notes).toBeDefined();
  });

  it("tasks tem todas colunas chave do spec", () => {
    const cols = Object.keys(tasks);
    for (const expected of [
      "id", "sessionId", "projectId", "clientId", "title", "status",
      "tokensInput", "tokensOutput", "tokensCacheRead", "tokensCacheCreation",
      "primaryModel", "modelsUsed",
      "timeInputSeconds", "timeProcessingOutputSeconds", "timeReadingSeconds", "timeTotalSeconds",
      "humanHoursEstimate", "humanHoursSource", "billableHours", "billableHoursLocked",
      "costUsd", "isBackfilled", "refinedByHaiku", "confidence",
    ]) {
      expect(cols).toContain(expected);
    }
  });
});
