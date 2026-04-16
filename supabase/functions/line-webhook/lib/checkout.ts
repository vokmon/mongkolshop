import Stripe from "npm:stripe"
import { updateOrder } from "../../_shared/db/orders.ts"
import type { Order } from "../../_shared/types.ts"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!)

export async function createCheckoutSession(
  lineUserId: string,
  orderNo: string,
  stripePriceId: string,
): Promise<{ url: string; sessionId: string }> {
  const lineOaUrl = Deno.env.get("LINE_OA_URL")!
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    payment_method_types: ["card", "promptpay"],
    metadata: { order_no: orderNo, line_user_id: lineUserId },
    success_url: lineOaUrl,
    cancel_url: lineOaUrl,
  })
  return { url: session.url!, sessionId: session.id }
}

/**
 * Returns the checkout URL for an order.
 * If the stored Stripe session has expired, creates a new one and updates the order.
 */
export async function getOrRefreshCheckoutUrl(
  order: Order,
  stripePriceId: string,
): Promise<string> {
  // Check if the stored session is still open
  if (order.stripe_session_id && order.checkout_url) {
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
    if (session.status === "open") {
      return order.checkout_url
    }
    console.log(`⏰ Stripe session ${order.stripe_session_id} is ${session.status} — creating new one`)
  }

  // Create a fresh session
  const { url, sessionId } = await createCheckoutSession(
    order.line_user_id,
    order.order_no,
    stripePriceId,
  )
  await updateOrder(order.id, { stripe_session_id: sessionId, checkout_url: url })
  return url
}
