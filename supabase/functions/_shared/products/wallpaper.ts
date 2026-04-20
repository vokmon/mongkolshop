import type { BotResponse, Order, UserSession, WallpaperCollectedData, WallpaperGeneratedContent } from "../types.ts"
import { KEYWORDS } from "../constants.ts"
import { getSetting } from "../configService.ts"
import { pushImageWithText } from "../lineService.ts"
import type { ProductModule } from "./index.ts"

const REMINDER_TEMPLATES: Array<(missing: string, productName: string, botName: string) => string> = [
  (missing, _productName, botName) =>
    `${botName}รอคุณอยู่นะคะ ✨ ยังขาด ${missing} อยู่เลยค่ะ มาทำต่อกันเลยนะคะ 🙏`,
  (missing, productName, botName) =>
    `สวัสดีอีกครั้งค่ะ 🙏 ${botName}ยังรอสร้าง${productName}ให้คุณอยู่นะคะ ✨ ยังขาด ${missing} ค่ะ`,
  (missing, productName, _botName) =>
    `ว่าไงคะ 😊 ยังนึกถึง${productName}อยู่ไหมคะ? ยังขาด ${missing} อยู่นะคะ 🙏`,
]

function fieldToThai(field: string): string {
  const map: Record<string, string> = {
    full_name: "ชื่อ",
    birthdate: "วันเกิด",
    wish: "ความปรารถนา",
    deity: "เทพ",
    color: "สีที่ชอบ",
    include_lucky_number: "ใส่เลขมงคลในรูป",
    include_name: "ใส่ชื่อในรูป",
  }
  return map[field] ?? field
}

function buildDeliveryText(content: WallpaperGeneratedContent): string {
  return (
    `✨ รูปมงคลของคุณมาแล้วค่ะ!\n\n` +
    `🙏 ${content.fortune_text}\n\n` +
    `📿 คาถาบูชา: ${content.mantra}\n` +
    `💡 ความหมาย: ${content.mantra_meaning}\n\n` +
    `🎨 สีมงคล: ${content.lucky_colors}\n` +
    `🔢 เลขมงคล: ${content.lucky_number}\n\n` +
    `หากต้องการสั่งใหม่ พิมพ์ว่า ${KEYWORDS.RESTART} ได้เลยค่ะ 🙏`
  )
}

const wallpaper: ProductModule = {
  sessionToCollectedData(session: UserSession): Record<string, unknown> {
    const d = session.collected_data as Partial<WallpaperCollectedData>
    return {
      full_name: d.full_name ?? null,
      birthdate: d.birthdate ?? null,
      wish: d.wish ?? null,
      deity_key: d.deity_key ?? null,
      deity_source: d.deity_source ?? null,
      color: d.color ?? null,
      include_lucky_number: d.include_lucky_number ?? null,
      include_name: d.include_name ?? null,
    }
  },

  getMissingFields(data: Record<string, unknown>): string[] {
    const d = data as Partial<WallpaperCollectedData>
    const missing: string[] = []
    if (!d.full_name) missing.push("full_name")
    if (!d.birthdate) missing.push("birthdate")
    if (!d.wish) missing.push("wish")
    if (!d.deity_key) missing.push("deity")
    if (!d.color) missing.push("color")
    if (d.include_lucky_number == null) missing.push("include_lucky_number")
    if (d.include_name == null) missing.push("include_name")
    return missing
  },

  buildMyDataMessage(session: UserSession): string {
    const d = session.collected_data as Partial<WallpaperCollectedData>
    const boolLabel = (v: boolean | null | undefined) =>
      v == null ? "-" : v ? "ใช่" : "ไม่ใส่"
    return "ข้อมูลของคุณที่เก็บไว้:\n\n" +
      `👤 ชื่อ: ${d.full_name ?? "-"}\n` +
      `🎂 วันเกิด: ${d.birthdate ?? "-"}\n` +
      `🙏 ความปรารถนา: ${d.wish ?? "-"}\n` +
      `✨ เทพ: ${d.deity_key ?? "-"}\n` +
      `🎨 สี: ${d.color ?? "-"}\n` +
      `🔢 ใส่เลขมงคลในรูป: ${boolLabel(d.include_lucky_number)}\n` +
      `📛 ใส่ชื่อในรูป: ${boolLabel(d.include_name)}`
  },

  formatCollectedData(data: Record<string, unknown>): string {
    const d = data as Partial<WallpaperCollectedData>
    const lines: string[] = []
    if (d.full_name) lines.push(`ชื่อ: ${d.full_name}`)
    if (d.birthdate) lines.push(`วันเกิด: ${d.birthdate}`)
    if (d.wish) lines.push(`ความปรารถนา: ${d.wish}`)
    if (d.deity_key) lines.push(`เทพ: ${d.deity_key}`)
    if (d.color) lines.push(`สี: ${d.color}`)
    return lines.length > 0 ? lines.join("\n") : "ยังไม่มีข้อมูล"
  },

  fieldToThai,

  async buildReminderMessage({ count, missing, productName, maxReminders }: { count: number; missing: string[]; productName: string; maxReminders: number }): Promise<string> {
    const botName = await getSetting("bot_name")
    const missingText = missing.map(fieldToThai).join(", ")
    if (count >= maxReminders - 1) {
      return `นี่คือการแจ้งเตือนครั้งสุดท้ายนะคะ 🙏 ถ้าไม่ตอบกลับ ${botName}จะปิดรายการนี้ไว้ก่อนนะคะ ยังขาด ${missingText} ค่ะ`
    }
    return REMINDER_TEMPLATES[count % REMINDER_TEMPLATES.length](missingText, productName, botName)
  },

  async buildSessionEndMessage(productName: string): Promise<string> {
    const botName = await getSetting("bot_name")
    return `ขออภัยค่ะ ${botName}ขอปิดรายการนี้ไว้ก่อนนะคะ 🙏 หากต้องการกลับมาสร้าง${productName} พิมพ์ว่า ${KEYWORDS.RESTART} ได้เลยค่ะ ✨`
  },

  getFieldLabels(): Record<string, [string, string]> {
    return {
      full_name: ["บอกชื่อ 👤", "ชื่อของฉันคือ"],
      birthdate: ["บอกวันเกิด 🎂", "วันเกิดของฉันคือ"],
      wish: ["บอกความปรารถนา 🙏", "ฉันอยากได้"],
      deity: ["เลือกเทพ ✨", "ขอเทพ"],
      color: ["เลือกสี 🎨", "สีที่ชอบคือ"],
      include_lucky_number: ["ใส่เลขมงคลในรูป 🔢", "อยากใส่เลขมงคลในรูป"],
      include_name: ["ใส่ชื่อในรูป 📛", "อยากให้ใส่ชื่อในรูป"],
    }
  },

  extractedToCollected(ex: BotResponse["extracted"]): Record<string, unknown> {
    const result: Partial<WallpaperCollectedData> = {}
    if (ex.full_name != null) result.full_name = ex.full_name
    if (ex.birthdate != null) result.birthdate = ex.birthdate
    if (ex.wish != null) result.wish = ex.wish
    if (ex.deity != null) {
      result.deity_key = ex.deity
      result.deity_source = "user"
    }
    if (ex.color != null) result.color = ex.color
    if (ex.include_lucky_number != null) result.include_lucky_number = ex.include_lucky_number
    if (ex.include_name != null) result.include_name = ex.include_name
    return result
  },

  buildDeliveryText(content: Record<string, unknown>): string {
    return buildDeliveryText(content as WallpaperGeneratedContent)
  },

  buildGenerationFailedMessage(): string {
    return "ขออภัยค่ะ เกิดข้อผิดพลาดในการสร้างรูปมงคล 😔 ทีมงานจะติดต่อกลับเร็วๆ นี้นะคะ 🙏"
  },

  async deliver(lineUserId: string, order: Order): Promise<void> {
    if (!order.image_url || !order.generated_content) {
      throw new Error(`Missing image_url or generated_content for order: ${order.order_no}`)
    }
    const text = buildDeliveryText(order.generated_content as WallpaperGeneratedContent)
    await pushImageWithText(lineUserId, order.image_url, text)
  },
}

export default wallpaper
