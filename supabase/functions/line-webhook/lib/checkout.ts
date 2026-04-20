import Stripe from "npm:stripe"
import { createCheckoutSession, getPriceAmount } from "../../_shared/checkoutService.ts"
import { updateOrder } from "../../_shared/db/orders.ts"
import type { Order } from "../../_shared/types.ts"

export { createCheckoutSession, getPriceAmount }

/**
 * Expires a Stripe checkout session so the payment link becomes invalid.
 * Safe to call even if the session is already expired — Stripe ignores it.
 */
export async function cancelCheckoutSession(stripeSessionId: string): Promise<void> {
  try {
    await stripe.checkout.sessions.expire(stripeSessionId)
  } catch (err: unknown) {
    // Ignore "already expired" errors — session is already invalid, goal achieved
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes("already expired") && !msg.includes("cannot be expired")) throw err
  }
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!)

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
