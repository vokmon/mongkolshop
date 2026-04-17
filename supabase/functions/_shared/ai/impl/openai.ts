import OpenAI from "npm:openai";
import type {
  BotResponse,
  ChatMessage,
  DeityRecommendation,
  GeneratedContent,
} from "../../types.ts";
import type { IAiService } from "../aiService.ts";

const CHAT_MODEL = "gpt-5.4-mini";
const IMAGE_MODEL = "gpt-image-1";

const MAX_RETRIES = 2;
const TEXT_TIMEOUT_MS = 90_000;
const IMAGE_TIMEOUT_MS = 5 * 60 * 1000;

type ImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1024x1792"
  | "1792x1024";
type ImageQuality = "low" | "medium" | "high";

// deno-lint-ignore no-explicit-any
function isRetryable(err: any): boolean {
  const status = err?.status;
  const code = err?.code;
  return (
    (status === undefined && !!code) ||
    status >= 500 ||
    status === 429 ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET"
  );
}

export class OpenAIService implements IAiService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
  }

  private currentDatetime(): string {
    return new Date().toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      dateStyle: "full",
      timeStyle: "short",
    });
  }

  private parseJson<T>(raw: string, context: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(
        `❌ Invalid JSON from model [${context}]: ${raw.slice(0, 200)}`,
      );
    }
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    context: string,
  ): Promise<T> {
    const requestId = crypto.randomUUID().slice(0, 8);
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (!isRetryable(err) || attempt === MAX_RETRIES) throw err;
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `⚠️ [${context}] [${requestId}] Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error("unreachable");
  }

  async chatWithBot(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
  ): Promise<BotResponse> {
    const raw = await this.withRetry(async () => {
      const response = await this.client.responses.create(
        {
          model: CHAT_MODEL,
          instructions: `${systemPrompt}\n\nวันและเวลาปัจจุบัน: ${this.currentDatetime()}`,
          input: [
            ...history.map((m) => ({
              role: m.role,
              content: [{ type: "text", text: m.content }],
            })),
            { role: "user", content: [{ type: "text", text: userMessage }] },
          ],
          text: { format: { type: "json_object" } },
        },
        { timeout: TEXT_TIMEOUT_MS },
      );
      return response.output_text ?? "";
    }, "chatWithBot");
    return this.parseJson<BotResponse>(raw, "chatWithBot");
  }

  async generateContent(filledPrompt: string): Promise<GeneratedContent> {
    const raw = await this.withRetry(async () => {
      const response = await this.client.responses.create(
        {
          model: CHAT_MODEL,
          instructions: `วันและเวลาปัจจุบัน: ${this.currentDatetime()}`,
          input: filledPrompt,
          text: { format: { type: "json_object" } },
        },
        { timeout: TEXT_TIMEOUT_MS },
      );
      return response.output_text ?? "";
    }, "generateContent");
    return this.parseJson<GeneratedContent>(raw, "generateContent");
  }

  async recommendDeity(filledPrompt: string): Promise<DeityRecommendation> {
    const raw = await this.withRetry(async () => {
      const response = await this.client.responses.create(
        {
          model: CHAT_MODEL,
          instructions: `วันและเวลาปัจจุบัน: ${this.currentDatetime()}`,
          input: filledPrompt,
          text: { format: { type: "json_object" } },
        },
        { timeout: TEXT_TIMEOUT_MS },
      );
      return response.output_text ?? "";
    }, "recommendDeity");
    return this.parseJson<DeityRecommendation>(raw, "recommendDeity");
  }

  async createImage(prompt: string): Promise<Uint8Array> {
    const size = (Deno.env.get("IMAGE_SIZE") ?? "1024x1792") as ImageSize;
    const quality = (Deno.env.get("IMAGE_QUALITY") ?? "medium") as ImageQuality;
    return await this.withRetry(async () => {
      const response = await this.client.images.generate(
        {
          model: IMAGE_MODEL,
          prompt,
          size,
          quality,
        },
        { timeout: IMAGE_TIMEOUT_MS },
      );
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image returned from model");
      return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }, "createImage");
  }
}
