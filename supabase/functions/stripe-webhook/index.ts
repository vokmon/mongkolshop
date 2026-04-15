import Stripe from "npm:stripe"

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
    console.error("Stripe signature verification failed:", err.message)
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }

  console.log("Stripe event received:", event.type)

  switch (event.type) {
    case "checkout.session.completed":
      // TODO: trigger generate-image
      break
    case "payment_intent.payment_failed":
      // TODO: notify user via LINE
      break
    default:
      console.log("Unhandled event type:", event.type)
  }

  return new Response("OK", { status: 200 })
})
