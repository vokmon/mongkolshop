import OpenAI from "npm:openai"
import type { BotResponse, ChatMessage, DeityRecommendation, GeneratedContent } from "../../types.ts"
import type { IAiService } from "../aiService.ts"

const DEFAULT_CHAT_MODEL = "gpt-4o"
const WEB_SEARCH_MODEL = "gpt-4o-search-preview"
const IMAGE_MODEL = "dall-e-3"
const IMAGE_SIZE = "1024x1792" as const
const IMAGE_QUALITY = "hd" as const

export class OpenAIService implements IAiService {
  private readonly client: OpenAI

  constructor() {
    this.client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! })
  }

  /**
   * Core chat completion wrapper.
   *
   * Options:
   * - `model`          — defaults to "gpt-4o"
   * - `responseFormat` — "json" adds response_format: json_object (cannot be combined with webSearch)
   * - `webSearch`      — uses gpt-4o-search-preview + web_search_preview tool; returns plain text only
   */
  private async chatCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: {
      model?: string
      responseFormat?: "json"
      webSearch?: boolean
    } = {},
  ): Promise<string> {
    if (options.webSearch && options.responseFormat === "json") {
      throw new Error("webSearch and responseFormat:json cannot be used together (OpenAI limitation)")
    }

    const model = options.webSearch
      ? WEB_SEARCH_MODEL
      : (options.model ?? DEFAULT_CHAT_MODEL)

    const response = await this.client.chat.completions.create({
      model,
      messages,
      ...(options.responseFormat === "json"
        ? { response_format: { type: "json_object" } }
        : {}),
      ...(options.webSearch
        // deno-lint-ignore no-explicit-any
        ? { tools: [{ type: "web_search_preview" } as any] }
        : {}),
    })

    return response.choices[0].message.content ?? ""
  }

  async chatWithBot(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
  ): Promise<BotResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ]
    const raw = await this.chatCompletion(messages, { responseFormat: "json" })
    return JSON.parse(raw) as BotResponse
  }

  /**
   * Generate a DALL-E image prompt from a filled prompt template.
   * Web search is enabled so the model can look up deity iconography,
   * sacred colors, and symbol details before writing the prompt.
   */
  async generateImagePrompt(filledPrompt: string): Promise<string> {
    return await this.chatCompletion(
      [{ role: "user", content: filledPrompt }],
      { webSearch: true },
    )
  }

  async generateContent(filledPrompt: string): Promise<GeneratedContent> {
    const raw = await this.chatCompletion(
      [{ role: "user", content: filledPrompt }],
      { responseFormat: "json" },
    )
    return JSON.parse(raw) as GeneratedContent
  }

  async recommendDeity(filledPrompt: string): Promise<DeityRecommendation> {
    const raw = await this.chatCompletion(
      [{ role: "user", content: filledPrompt }],
      { responseFormat: "json" },
    )
    return JSON.parse(raw) as DeityRecommendation
  }

  async createImage(prompt: string): Promise<Uint8Array> {
    const response = await this.client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: IMAGE_SIZE,
      quality: IMAGE_QUALITY,
    })

    const tempUrl = response.data[0].url!
    const imgRes = await fetch(tempUrl)
    if (!imgRes.ok) throw new Error(`Failed to download image from DALL-E URL`)
    const buffer = await imgRes.arrayBuffer()
    return new Uint8Array(buffer)
  }
}
