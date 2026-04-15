import Stripe from "npm:stripe"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!)

export async function createCheckoutSession(
  lineUserId: string,
  orderNo: string,
  stripePriceId: string,
): Promise<string> {
  const lineOaUrl = Deno.env.get("LINE_OA_URL")!
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    payment_method_types: ["card", "promptpay"],
    metadata: { order_no: orderNo, line_user_id: lineUserId },
    success_url: lineOaUrl,
    cancel_url: lineOaUrl,
  })
  return session.url!
}
