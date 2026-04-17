import Stripe from "npm:stripe"
import { handleCheckoutCompleted } from "./handlers/checkoutCompleted.ts"
import { handleCheckoutExpired } from "./handlers/checkoutExpired.ts"

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
