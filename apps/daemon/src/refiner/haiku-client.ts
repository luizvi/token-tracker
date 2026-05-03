import Anthropic from "@anthropic-ai/sdk";
import pThrottle from "p-throttle";
import { redact } from "@tracker/shared";

export interface HaikuClientOptions {
  /** Chave normal `sk-ant-...`. Use isto OU authToken. */
  apiKey?: string;
  /** OAuth Bearer token do plano Max/Pro (gerado por `claude setup-token`). */
  authToken?: string;
  model: string;
  requestsPerSecond?: number;
  maxTokens?: number;
}

export interface CompleteRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

export class HaikuClient {
  private readonly anthropic: Anthropic;
  private readonly model: string;
  private readonly defaultMaxTokens: number;
  private readonly throttledSend: (req: CompleteRequest) => Promise<string>;

  constructor(options: HaikuClientOptions) {
    if (!options.apiKey && !options.authToken) {
      throw new Error("HaikuClient requires apiKey or authToken");
    }
    this.anthropic = options.authToken
      ? new Anthropic({
          authToken: options.authToken,
          // Plano Max/Pro via OAuth exige este beta header.
          defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" },
        })
      : new Anthropic({ apiKey: options.apiKey! });
    this.model = options.model;
    this.defaultMaxTokens = options.maxTokens ?? 1024;
    const limit = options.requestsPerSecond ?? 1;
    const throttle = pThrottle({ limit, interval: 1000 });
    this.throttledSend = throttle((req: CompleteRequest) => this.sendRaw(req));
  }

  async complete(req: CompleteRequest): Promise<string> {
    const safe: CompleteRequest = {
      system: redact(req.system),
      user: redact(req.user),
      ...(req.maxTokens !== undefined ? { maxTokens: req.maxTokens } : {}),
    };
    return this.throttledSend(safe);
  }

  private async sendRaw(req: CompleteRequest): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? this.defaultMaxTokens,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });
    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  }
}
