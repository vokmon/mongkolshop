import type { BotResponse, ChatMessage, DeityRecommendation, GeneratedContent } from "../../types.ts"
import type { IAiService } from "../aiService.ts"

const FIELD_LABELS: Record<string, string> = {
  full_name: "ชื่อจริง",
  birthdate: "วันเกิด (DD/MM/YYYY)",
  wish: "ความปรารถนา",
  deity: "เทพที่ต้องการ",
  color: "สีที่ชอบ",
}

export class MockAIService implements IAiService {
  /** Parse missing fields list from the filled bot_personality system prompt */
  private getMissingFields(systemPrompt: string): string[] {
    const match = systemPrompt.match(/== ข้อมูลที่ยังขาด ==\n(.+)/)
    if (!match || !match[1].trim()) return []
    return match[1].split(", ").map((f) => f.trim()).filter(Boolean)
  }

  async chatWithBot(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
  ): Promise<BotResponse> {
    const missing = this.getMissingFields(systemPrompt)

    // All fields already collected — confirm and complete
    if (missing.length === 0) {
      return {
        message: "[MOCK] ✨ ได้รับข้อมูลครบแล้วค่ะ ขอยืนยันข้อมูลของคุณด้วยนะคะ",
        extracted: {},
        is_complete: true,
        is_off_topic: false,
      }
    }

    // First message — greet and ask for first field, don't extract yet
    if (history.length === 0) {
      return {
        message: `[MOCK] สวัสดีค่ะ ยินดีต้อนรับ! 🙏 เริ่มต้นเลยนะคะ ขอทราบ${FIELD_LABELS[missing[0]]}ของคุณด้วยค่ะ`,
        extracted: {},
        is_complete: false,
        is_off_topic: false,
      }
    }

    // Extract the first missing field from the user's message
    const field = missing[0]
    const isLastField = missing.length === 1
    const nextField = missing[1]

    const extracted: BotResponse["extracted"] = {}
    if (field === "full_name") extracted.full_name = userMessage
    else if (field === "birthdate") extracted.birthdate = userMessage
    else if (field === "wish") extracted.wish = userMessage
    else if (field === "deity") extracted.deity = userMessage
    else if (field === "color") extracted.color = userMessage

    const message = isLastField
      ? `[MOCK] ✨ ขอบคุณค่ะ ได้รับข้อมูลครบแล้ว! กำลังสรุปให้นะคะ`
      : `[MOCK] ขอบคุณค่ะ 😊 ขอทราบ${FIELD_LABELS[nextField]}ของคุณด้วยนะคะ`

    return {
      message,
      extracted,
      is_complete: isLastField,
      is_off_topic: false,
    }
  }

  async generateImagePrompt(_filledPrompt: string): Promise<string> {
    return "[MOCK] A golden Ganesha deity in Thai sacred art style, portrait orientation, divine aura, ultra detailed"
  }

  async generateContent(_filledPrompt: string): Promise<GeneratedContent> {
    return {
      fortune_text: "[MOCK] ดวงชะตาของคุณสุกสว่างเหมือนทอง การงานและการเงินจะก้าวหน้าอย่างมั่นคงค่ะ",
      mantra: "[MOCK] โอม คัม คณปตะเย นะมะฮา",
      mantra_meaning: "[MOCK] ข้าพเจ้าน้อมบูชาพระพิฆเนศ ผู้ขจัดอุปสรรคทั้งปวง",
      worship_guide: "[MOCK] สวดคาถา 9 จบ ทุกเช้าวันพุธ จุดธูป 3 ดอก และดอกดาวเรือง",
      lucky_colors: "[MOCK] ทอง เหลือง เขียว",
    }
  }

  async recommendDeity(_filledPrompt: string): Promise<DeityRecommendation> {
    return {
      deity: "พระพิฆเนศ",
      reason: "[MOCK] เหมาะกับผู้ที่ต้องการความสำเร็จและขจัดอุปสรรคในชีวิต",
    }
  }

  async createImage(_prompt: string): Promise<Uint8Array> {
    // Return a minimal 1x1 transparent PNG
    const PNG_1X1 = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ])
    return PNG_1X1
  }
}
