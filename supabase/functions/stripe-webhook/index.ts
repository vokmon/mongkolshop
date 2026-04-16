import Stripe from "npm:stripe"
import { createCheckoutSession } from "../_shared/checkoutService.ts"
import { getOrderByOrderNo, updateOrder } from "../_shared/db/orders.ts"
import { getSessionById } from "../_shared/db/userSessions.ts"
import { invokeGenerationJob } from "../_shared/generationRouter.ts"
import { paymentButtonMessage, pushMessages, pushText } from "../_shared/lineService.ts"
import { getPricing } from "../_shared/configService.ts"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!)

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const signature = req.headers.get("stripe-signature") ?? ""
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    )
  } catch (err) {
    console.error("❌ Stripe signature verification failed:", err.message)
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }

  console.log(`📨 Stripe event: ${event.type}`)

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break
      default:
        console.log(`⏭️ Ignored event: ${event.type}`)
    }
  } catch (err) {
    console.error(`❌ Error handling ${event.type}:`, err)
    // Still return 200 — non-2xx causes Stripe to retry the same event
  }

  return new Response("OK", { status: 200 })
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orderNo = session.metadata?.order_no
  const lineUserId = session.metadata?.line_user_id
  if (!orderNo || !lineUserId) {
    console.error("❌ Missing metadata on checkout session:", session.id)
    return
  }

  console.log(`💳 Payment completed | order: ${orderNo} | user: ${lineUserId}`)

  const order = await getOrderByOrderNo(orderNo)
  if (!order) {
    console.error(`❌ Order not found: ${orderNo}`)
    return
  }

  // Idempotency guard — Stripe may deliver the same event more than once
  if (order.status !== "pending") {
    console.log(`⚠️ Order ${orderNo} already in status: ${order.status} — skipping`)
    return
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent?.id ?? null)

  // Extract discount info — only present if a promotion code was applied
  const discountAmount = session.total_details?.amount_discount ?? 0
  let promotionCode: string | null = null

  if (discountAmount > 0 && session.discounts?.length) {
    try {
      const discount = session.discounts[0]
      if (discount.promotion_code) {
        const promoId = typeof discount.promotion_code === "string"
          ? discount.promotion_code
          : discount.promotion_code.id
        const promo = await stripe.promotionCodes.retrieve(promoId)
        promotionCode = promo.code
      }
    } catch (err) {
      console.error("⚠️ Failed to extract discount info — continuing without it:", err)
    }
  }

  await updateOrder(order.id, {
    status: "paid",
    stripe_session_id: session.id,
    stripe_payment_id: paymentIntentId,
    paid_at: new Date().toISOString(),
    ...(discountAmount > 0 && {
      promotion_code: promotionCode,
      discount_amount: discountAmount,
    }),
  })

  console.log(`✅ Order ${orderNo} marked as paid — invoking generation job`)

  // Fire-and-forget — do not await, return 200 to Stripe immediately
  invokeGenerationJob(order)
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const orderNo = session.metadata?.order_no
  const lineUserId = session.metadata?.line_user_id
  if (!orderNo || !lineUserId) return

  console.log(`⏰ Checkout expired | order: ${orderNo} | user: ${lineUserId}`)

  const order = await getOrderByOrderNo(orderNo)
  if (!order || order.status !== "pending") return

  // Load session to get package_key for pricing
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

  // Regenerate a fresh checkout link — keep order in "pending"
  const { url: newCheckoutUrl, sessionId: newSessionId } = await createCheckoutSession(
    lineUserId,
    orderNo,
    pricing.stripe_price_id,
  )

  await updateOrder(order.id, {
    stripe_session_id: newSessionId,
    checkout_url: newCheckoutUrl,
  })

  console.log(`🔗 New checkout link generated for order: ${orderNo}`)

  await pushMessages(lineUserId, [
    {
      type: "text",
      text: "ลิงก์ชำระเงินหมดอายุแล้วค่ะ 😅 น้องมงคลสร้างลิงก์ใหม่ให้แล้วนะคะ ✨\nหรือพิมพ์ว่า เริ่มใหม่ หากต้องการเปลี่ยนข้อมูลค่ะ 🙏",
    },
    paymentButtonMessage(`ชำระเงิน ${pricing.price} บาท เพื่อรับรูปมงคลของคุณค่ะ`, newCheckoutUrl),
  ])
}

