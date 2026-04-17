import Stripe from "npm:stripe"
import { getPricing } from "../../_shared/configService.ts"
import { createCheckoutSession, getPriceAmount } from "../../_shared/checkoutService.ts"
import { getOrderByOrderNo, updateOrder } from "../../_shared/db/orders.ts"
import { getSessionById } from "../../_shared/db/userSessions.ts"
import { paymentButtonMessage, pushMessages, pushText } from "../../_shared/lineService.ts"
import { logCtx } from "../../_shared/logger.ts"
import { BOT_NAME, KEYWORDS } from "../../_shared/constants.ts"

export async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const orderNo = session.metadata?.order_no
  const lineUserId = session.metadata?.line_user_id
  if (!orderNo || !lineUserId) return

  console.log(`⏰ Checkout expired — regenerating link${logCtx({ userId: lineUserId, orderNo })}`)

  const order = await getOrderByOrderNo(orderNo)
  if (!order || order.status !== "pending") return

  const userSession = await getSessionById(order.session_id)
  if (!userSession) {
    console.error(`❌ Session not found for order: ${orderNo}`)
    return
  }

  const pricing = await getPricing(userSession.package_key)
  if (!pricing.stripe_price_id) {
    console.error("❌ stripe_price_id is not set — cannot regenerate checkout link")
    await pushText(lineUserId, "ลิงก์ชำระเงินหมดอายุแล้วค่ะ 😅 พิมพ์ว่า เริ่มใหม่ เพื่อสั่งใหม่ได้เลยนะคะ 🙏")
    return
  }

  const [{ url: newCheckoutUrl, sessionId: newSessionId }, priceAmount] = await Promise.all([
    createCheckoutSession(lineUserId, orderNo, pricing.stripe_price_id),
    getPriceAmount(pricing.stripe_price_id),
  ])

  await updateOrder(order.id, {
    stripe_session_id: newSessionId,
    checkout_url: newCheckoutUrl,
  })

  console.log(`🔗 New checkout link generated${logCtx({ userId: lineUserId, orderNo })}`)

  await pushMessages(lineUserId, [
    {
      type: "text",
      text: `ลิงก์ชำระเงินหมดอายุแล้วค่ะ 😅 ${BOT_NAME}สร้างลิงก์ใหม่ให้แล้วนะคะ ✨\nหรือพิมพ์ว่า ${KEYWORDS.RESTART} หากต้องการเปลี่ยนข้อมูลค่ะ 🙏`,
    },
    paymentButtonMessage(`ชำระเงิน ${priceAmount} บาท เพื่อรับรูปมงคลของคุณค่ะ`, newCheckoutUrl),
  ])
}
