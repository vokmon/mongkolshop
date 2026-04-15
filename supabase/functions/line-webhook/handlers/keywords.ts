import { getUserProfile, replyText } from "../../_shared/lineService.ts"
import { upsertConsent } from "../../_shared/db/userConsents.ts"
import { createSession, deactivateSession } from "../../_shared/db/userSessions.ts"
import { getOrderByOrderNo } from "../../_shared/db/orders.ts"
import { buildHelpMessage, buildMyDataMessage, buildStatusMessage } from "../lib/messages.ts"
import type { UserSession } from "../../_shared/types.ts"

export async function handleSpecialKeyword(
  userId: string,
  replyToken: string,
  text: string,
  session: UserSession,
): Promise<boolean> {
  const t = text.trim()

  if (t === "สถานะ") {
    console.log(`📋 Keyword: สถานะ | user: ${userId}`)
    await replyText(replyToken, buildStatusMessage(session))
    return true
  }

  if (t === "เริ่มใหม่") {
    console.log(`🔄 Keyword: เริ่มใหม่ | user: ${userId}`)
    if (session.current_order_no) {
      const order = await getOrderByOrderNo(session.current_order_no)
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(`⏳ Reset blocked — order ${order.order_no} is ${order.status}`)
        await replyText(replyToken, "รูปมงคลของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอสักครู่ แล้วจะส่งให้ทาง LINE นี้เลยค่ะ 🙏")
        return true
      }
    }
    await deactivateSession(session.id, "user_reset")
    const profile = await getUserProfile(userId)
    await createSession(userId, profile?.displayName ?? null)
    await replyText(replyToken, "เริ่มต้นใหม่แล้วค่ะ ✨ น้องมงคลพร้อมช่วยสร้างรูปมงคลให้คุณใหม่เลยนะคะ")
    return true
  }

  if (t === "ช่วยด้วย" || t.toLowerCase() === "help") {
    console.log(`❓ Keyword: ช่วยด้วย | user: ${userId}`)
    await replyText(replyToken, buildHelpMessage())
    return true
  }

  if (t === "ดูข้อมูลฉัน") {
    console.log(`👤 Keyword: ดูข้อมูลฉัน | user: ${userId}`)
    await replyText(replyToken, buildMyDataMessage(session))
    return true
  }

  if (t === "ลบข้อมูลฉัน") {
    console.log(`🗑️ Keyword: ลบข้อมูลฉัน | user: ${userId}`)
    if (session.current_order_no) {
      const order = await getOrderByOrderNo(session.current_order_no)
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(`⏳ Deletion blocked — order ${order.order_no} is ${order.status}`)
        await replyText(replyToken, "รูปมงคลของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอรับรูปก่อน แล้วค่อยลบข้อมูลได้เลยนะคะ 🙏")
        return true
      }
    }
    await deactivateSession(session.id, "user_data_deletion")
    await upsertConsent(userId, false)
    await replyText(replyToken, "ลบข้อมูลของคุณเรียบร้อยแล้วค่ะ 🙏 หากต้องการใช้บริการใหม่ พิมพ์ว่า ยอมรับ ได้เลยค่ะ")
    return true
  }

  return false
}
