import { quickReplyItem } from "../../_shared/lineService.ts"
import type { BotResponse, WallpaperCollectedData } from "../../_shared/types.ts"

export function buildGuidedQuickReplies(missingFields: string[]) {
  const labels: Record<string, [string, string]> = {
    full_name: ["บอกชื่อ 👤", "ชื่อของฉันคือ"],
    birthdate: ["บอกวันเกิด 🎂", "วันเกิดของฉันคือ"],
    wish: ["บอกความปรารถนา 🙏", "ฉันอยากได้"],
    deity: ["เลือกเทพ ✨", "ขอเทพ"],
    color: ["เลือกสี 🎨", "สีที่ชอบคือ"],
    include_lucky_number: ["ใส่เลขมงคลในรูป 🔢", "อยากใส่เลขมงคลในรูป"],
    include_name: ["ใส่ชื่อในรูป 📛", "อยากให้ใส่ชื่อในรูป"],
  }
  // LINE quick reply max 13 items; show only missing fields (max 5)
  return missingFields.slice(0, 5).map((field) => {
    const [label, text] = labels[field] ?? [field, field]
    return quickReplyItem(label, text)
  })
}

export function extractedToCollected(ex: BotResponse["extracted"]): Partial<WallpaperCollectedData> {
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
}
