import type { BotResponse, ChatMessage, DeityRecommendation, GeneratedContent } from "../../types.ts"
import type { IAiService } from "../aiService.ts"

export class OpenAIService implements IAiService {
  private readonly apiUrl = "https://api.openai.com/v1"
  private readonly apiKey: string

  constructor() {
    this.apiKey = Deno.env.get("OPENAI_API_KEY")!
  }

  private authHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
    }
  }

  private async chatCompletion(
    messages: ChatMessage[],
    options: { model?: string; responseFormat?: "json" } = {},
  ): Promise<string> {
    const res = await fetch(`${this.apiUrl}/chat/completions`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({
        model: options.model ?? "gpt-4o",
        messages,
        ...(options.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI chat error ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.choices[0].message.content as string
  }

  async chatWithBot(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
  ): Promise<BotResponse> {
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ]
    const raw = await this.chatCompletion(messages, { responseFormat: "json" })
    return JSON.parse(raw) as BotResponse
  }

  async generateImagePrompt(filledPrompt: string): Promise<string> {
    return await this.chatCompletion([{ role: "user", content: filledPrompt }])
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
    const genRes = await fetch(`${this.apiUrl}/images/generations`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1792",
        quality: "hd",
      }),
    })
    if (!genRes.ok) {
      const err = await genRes.text()
      throw new Error(`DALL-E error ${genRes.status}: ${err}`)
    }
    const data = await genRes.json()
    const tempUrl = data.data[0].url as string

    const imgRes = await fetch(tempUrl)
    if (!imgRes.ok) throw new Error(`Failed to download image from DALL-E URL`)
    const buffer = await imgRes.arrayBuffer()
    return new Uint8Array(buffer)
  }
}
