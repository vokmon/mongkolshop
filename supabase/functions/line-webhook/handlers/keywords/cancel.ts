import { replyText } from "../../../_shared/lineService.ts"
import { deactivateSession } from "../../../_shared/db/userSessions.ts"
import { getOrderByOrderNo, updateOrder } from "../../../_shared/db/orders.ts"
import { getPricing } from "../../../_shared/configService.ts"
import { cancelCheckoutSession } from "../../lib/checkout.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"
import type { UserSession } from "../../../_shared/types.ts"

/**
 * Handles `ยกเลิก` — cancels the current session and pending Stripe order without starting a new one.
 * Blocked if the order is already paid or generating.
 * Works with or without an active session — replies gracefully when nothing is active.
 */
class CancelHandler implements KeywordHandler {
  matches(text: string, _session: UserSession | null): boolean {
    return text === KEYWORDS.CANCEL
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`❌ Cancel requested${logCtx({ userId })}`)

    // No active session — nothing to cancel
    if (!session) {
      console.log(`ℹ️ Cancel requested but no active session${logCtx({ userId })}`)
      await replyText(replyToken, `ไม่มีคำสั่งที่ต้องยกเลิกนะคะ 😊 หากต้องการเริ่มใหม่ เลือกบริการจากเมนูได้เลยค่ะ`)
      return
    }

    // Block if payment already made or generation is running
    if (session.current_order_no) {
      const order = await getOrderByOrderNo(session.current_order_no)
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(`⏳ Cancel blocked — order in progress${logCtx({ userId, orderNo: order.order_no })} status:${order.status}`)
        const pricing = await getPricing(session.package_key)
        await replyText(replyToken, `${pricing.name_th}ของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอรับก่อนนะคะ 🙏`)
        return
      }

      // Cancel the pending Stripe session so the payment link becomes invalid
      if (order && order.status === "pending" && order.stripe_session_id) {
        await cancelCheckoutSession(order.stripe_session_id)
        await updateOrder(order.id, { status: "cancelled" })
        console.log(`🚫 Pending order cancelled${logCtx({ userId, orderNo: order.order_no })}`)
      }
    }

    await deactivateSession(session.id, "user_cancelled")
    await replyText(replyToken, `ยกเลิกแล้วนะคะ 🙏 หากต้องการสั่งใหม่ พิมพ์ว่า ${KEYWORDS.RESTART} หรือเลือกบริการจากเมนูได้เลยนะคะ ✨`)
  }
}

export default new CancelHandler()
