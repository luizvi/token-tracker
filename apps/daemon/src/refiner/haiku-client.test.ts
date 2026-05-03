import { describe, expect, it, vi } from "vitest";
import { HaikuClient } from "./haiku-client.js";

describe("HaikuClient.complete", () => {
  it("redige texto antes de enviar para a API", async () => {
    const client = new HaikuClient({ apiKey: "sk-ant-test", model: "claude-haiku-4-5-20251001" });
    const sendSpy = vi.spyOn(client as unknown as { sendRaw: () => Promise<string> }, "sendRaw")
      .mockResolvedValue("response");
    await client.complete({
      system: "system has AKIAIOSFODNN7EXAMPLE",
      user: "user has ANTHROPIC_API_KEY=sk-ant-api03-secret123secret123secret123secret123",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentArgs = (sendSpy.mock.calls as unknown as Array<[{ system: string; user: string }]>)[0]![0];
    expect(sentArgs.system).toContain("[REDACTED:AWS_ACCESS_KEY]");
    expect(sentArgs.user).toContain("[REDACTED:");
  });

  it("respeita throttle (não estoura requestsPerSecond)", async () => {
    const client = new HaikuClient({
      apiKey: "sk-ant-test",
      model: "claude-haiku-4-5-20251001",
      requestsPerSecond: 2,
    });
    vi.spyOn(client as unknown as { sendRaw: () => Promise<string> }, "sendRaw").mockResolvedValue("ok");

    const t0 = Date.now();
    await Promise.all([
      client.complete({ system: "s", user: "u" }),
      client.complete({ system: "s", user: "u" }),
      client.complete({ system: "s", user: "u" }),
    ]);
    const elapsed = Date.now() - t0;
    // 3 requests a 2/s => mínimo ~1000ms (3rd waits 1s)
    expect(elapsed).toBeGreaterThanOrEqual(400); // tolerância
  });
});
