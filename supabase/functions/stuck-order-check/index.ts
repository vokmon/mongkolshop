import {
  getAbandonedPaidOrders,
  getStuckGeneratingOrders,
  getUndeliveredOrders,
  updateOrder,
} from "../_shared/db/orders.ts"
import { invokeGenerationJob } from "../_shared/generationRouter.ts"
import { pushImageWithText, pushText } from "../_shared/lineService.ts"
import { buildWallpaperDeliveryText } from "../_shared/products/wallpaper.ts"
import type { Order, WallpaperGeneratedContent } from "../_shared/types.ts"

const MAX_ATTEMPTS = 5

Deno.serve(async (_req) => {
  EdgeRuntime.waitUntil(runChecks())
  return new Response("OK", { status: 200 })
})

async function runChecks(): Promise<void> {
  console.log("🔍 stuck-order-check started")

  const [stuckGenerating, abandonedPaid, undelivered] = await Promise.all([
    getStuckGeneratingOrders(),
    getAbandonedPaidOrders(),
    getUndeliveredOrders(),
  ])

  const retryable = stuckGenerating.filter((o) => o.generate_attempts < MAX_ATTEMPTS)
  const zombies = stuckGenerating.filter((o) => o.generate_attempts >= MAX_ATTEMPTS)

  console.log(
    `📊 retryable: ${retryable.length} | zombies: ${zombies.length} | abandoned paid: ${abandonedPaid.length} | undelivered: ${undelivered.length}`,
  )

  for (const order of retryable) {
    EdgeRuntime.waitUntil(handleRetry(order))
  }

  for (const order of abandonedPaid) {
    EdgeRuntime.waitUntil(handleRetry(order))
  }

  for (const order of zombies) {
    EdgeRuntime.waitUntil(handleZombie(order))
  }

  for (const order of undelivered) {
    EdgeRuntime.waitUntil(handleRedeliver(order))
  }
}

async function handleRetry(order: Order): Promise<void> {
  console.log(`🔁 Retrying order: ${order.order_no} (attempt ${order.generate_attempts})`)
  invokeGenerationJob(order)
}

async function handleZombie(order: Order): Promise<void> {
  console.log(`💀 Marking zombie order as failed: ${order.order_no}`)
  try {
    await updateOrder(order.id, { status: "failed" })
    await pushText(
      order.line_user_id,
      "ขออภัยค่ะ เกิดข้อผิดพลาดในการสร้างรูปมงคล 😔 ทีมงานจะติดต่อกลับเร็วๆ นี้นะคะ 🙏",
    )
    console.log(`🛑 Order ${order.order_no} marked as failed`)
  } catch (err) {
    console.error(`❌ Failed to handle zombie order ${order.order_no}:`, err)
  }
}

async function handleRedeliver(order: Order): Promise<void> {
  console.log(`📲 Re-delivering order: ${order.order_no}`)
  try {
    if (!order.image_url || !order.generated_content) {
      console.error(`❌ Order ${order.order_no} missing image_url or generated_content — cannot redeliver`)
      return
    }

    const content = order.generated_content as WallpaperGeneratedContent
    const deliveryText = buildWallpaperDeliveryText(content)

    await pushImageWithText(order.line_user_id, order.image_url, deliveryText)
    await updateOrder(order.id, { delivered_at: new Date().toISOString() })
    console.log(`✅ Order ${order.order_no} re-delivered`)
  } catch (err) {
    console.error(`❌ Failed to redeliver order ${order.order_no}:`, err)
  }
}

