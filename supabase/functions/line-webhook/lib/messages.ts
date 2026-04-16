import type { UserSession, WallpaperCollectedData } from "../../_shared/types.ts"

export function buildStatusMessage(session: UserSession): string {
  const stepLabel = session.step <= 6
    ? "กำลังเก็บข้อมูล 📝"
    : session.step === 7
    ? "รอการชำระเงิน 💳"
    : "เสร็จสิ้น ✅"
  return `สถานะของคุณ: ${stepLabel}\nOrder: ${session.current_order_no ?? "-"}`
}

export function buildHelpMessage(): string {
  return "คำสั่งที่ใช้ได้ค่ะ:\n\n" +
    "📋 สถานะ — ดูสถานะการสั่งซื้อ\n" +
    "🔄 เริ่มใหม่ — เริ่มต้นใหม่\n" +
    "👤 ดูข้อมูลฉัน — ดูข้อมูลที่เก็บไว้\n" +
    "🗑️ ลบข้อมูลฉัน — ลบข้อมูลทั้งหมด\n" +
    "❓ ช่วยด้วย — แสดงเมนูนี้"
}

export function buildMyDataMessage(session: UserSession): string {
  const d = session.collected_data as Partial<WallpaperCollectedData>
  return "ข้อมูลของคุณที่เก็บไว้:\n\n" +
    `👤 ชื่อ: ${d.full_name ?? "-"}\n` +
    `🎂 วันเกิด: ${d.birthdate ?? "-"}\n` +
    `🙏 ความปรารถนา: ${d.wish ?? "-"}\n` +
    `✨ เทพ: ${d.deity_key ?? "-"}\n` +
    `🎨 สี: ${d.color ?? "-"}`
}

export function formatCollectedData(data: WallpaperCollectedData): string {
  const lines: string[] = []
  if (data.full_name) lines.push(`ชื่อ: ${data.full_name}`)
  if (data.birthdate) lines.push(`วันเกิด: ${data.birthdate}`)
  if (data.wish) lines.push(`ความปรารถนา: ${data.wish}`)
  if (data.deity_key) lines.push(`เทพ: ${data.deity_key}`)
  if (data.color) lines.push(`สี: ${data.color}`)
  return lines.length > 0 ? lines.join("\n") : "ยังไม่มีข้อมูล"
}
