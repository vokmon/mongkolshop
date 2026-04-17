import type { BotResponse, ChatMessage, DeityRecommendation, GeneratedContent } from "../types.ts"

export interface IAiService {
  /** Main chatbot turn — returns structured response with extracted fields and flags. */
  chatWithBot(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
  ): Promise<BotResponse>

  /** Generate fortune, mantra, and worship guide from the fortune_telling template. */
  generateContent(filledPrompt: string): Promise<GeneratedContent>

  /** Recommend a deity from the deity_recommendation template. */
  recommendDeity(filledPrompt: string): Promise<DeityRecommendation>

  /** Generate an image from a prompt and return the raw image bytes. */
  createImage(prompt: string): Promise<Uint8Array>
}
