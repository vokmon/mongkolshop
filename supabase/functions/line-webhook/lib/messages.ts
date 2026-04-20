import type { UserSession } from "../../_shared/types.ts"
import { getProduct } from "../../_shared/products/index.ts"
import { KEYWORDS } from "../../_shared/constants.ts"

export function buildStatusMessage(session: UserSession): string {
  const label =
    session.status === "awaiting_payment" ? "รอการชำระเงิน 💳" :
    session.status === "done"             ? "เสร็จสิ้น ✅" :
                                            "กำลังเก็บข้อมูล 📝"
  return `สถานะของคุณ: ${label}\nOrder: ${session.current_order_no ?? "-"}`
}

export function buildHelpMessage(): string {
  return "คำสั่งที่ใช้ได้ค่ะ:\n\n" +
    `📋 ${KEYWORDS.STATUS} — ดูสถานะการสั่งซื้อ\n` +
    `🔄 ${KEYWORDS.RESTART} — เริ่มต้นใหม่\n` +
    `👤 ${KEYWORDS.VIEW_DATA} — ดูข้อมูลที่เก็บไว้\n` +
    `🗑️ ${KEYWORDS.DELETE_DATA} — ลบข้อมูลทั้งหมด\n` +
    `📞 ${KEYWORDS.ADMIN} — ติดต่อแอดมิน\n` +
    `❓ ${KEYWORDS.HELP[0]} — แสดงเมนูนี้`
}

export function buildMyDataMessage(session: UserSession): string {
  return getProduct(session.package_key).buildMyDataMessage(session)
}
