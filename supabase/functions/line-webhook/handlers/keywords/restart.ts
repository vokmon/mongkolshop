import { getUserProfile, replyText } from "../../../_shared/lineService.ts"
import { createSession, deactivateSession } from "../../../_shared/db/userSessions.ts"
import { getOrderByOrderNo } from "../../../_shared/db/orders.ts"
import { getPricing, getSetting } from "../../../_shared/configService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"
import type { UserSession } from "../../../_shared/types.ts"

/**
 * Handles `เริ่มใหม่` — deactivates the current session and starts a fresh one for the same product.
 * Blocked if the current order is already paid or generating.
 * Requires an active session.
 */
class RestartHandler implements KeywordHandler {
  matches(text: string, session: UserSession | null): boolean {
    return session !== null && text === KEYWORDS.RESTART
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`🔄 Restart requested${logCtx({ userId })}`)

    // Block restart if payment is in flight or generation is running — can't safely discard
    if (session!.current_order_no) {
      const order = await getOrderByOrderNo(session!.current_order_no)
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(`⏳ Restart blocked — order in progress${logCtx({ userId, orderNo: order.order_no })} status:${order.status}`)
        const pricing = await getPricing(session!.package_key)
        await replyText(replyToken, `${pricing.name_th}ของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอสักครู่ แล้วจะส่งให้ทาง LINE นี้เลยค่ะ 🙏`)
        return
      }
    }

    // Deactivate old session then open a fresh one for the same product
    await deactivateSession(session!.id, "user_reset")
    const profile = await getUserProfile(userId)
    await createSession(userId, profile?.displayName ?? null, session!.package_key)

    // Fetch product name for the confirmation message — fall back to generic if pricing row is missing
    let productName = ""
    try {
      const pricing = await getPricing(session!.package_key)
      productName = pricing.name_th
    } catch { /* pricing row missing — fall back to generic message */ }
    const botName = await getSetting("bot_name")
    await replyText(replyToken, `เริ่มต้นใหม่แล้วค่ะ ✨ ${botName}พร้อมช่วย${productName ? `สร้าง${productName}` : "เหลือคุณ"}ใหม่เลยนะคะ`)
  }
}

export default new RestartHandler()
