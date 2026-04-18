import {
  getAbandonedPaidOrders,
  getStuckGeneratingOrders,
  getUndeliveredOrders,
  updateOrder,
} from "../_shared/db/orders.ts"
import { invokeGenerationJob } from "../_shared/generationRouter.ts"
import { pushText } from "../_shared/lineService.ts"
import { getProduct } from "../_shared/products/index.ts"
import { updateSession } from "../_shared/db/userSessions.ts"
import { logCtx } from "../_shared/logger.ts"
import type { Order } from "../_shared/types.ts"

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
  console.log(`🔁 Retrying stuck order${logCtx({ userId: order.line_user_id, orderNo: order.order_no, attempt: order.generate_attempts })}`)
  invokeGenerationJob(order)
}

async function handleZombie(order: Order): Promise<void> {
  const ctx = logCtx({ userId: order.line_user_id, orderNo: order.order_no, attempt: order.generate_attempts })
  console.log(`💀 Zombie order — all retries exhausted, marking as failed${ctx}`)
  try {
    await updateOrder(order.id, { status: "failed" })
    await pushText(order.line_user_id, getProduct(order.package_key).buildGenerationFailedMessage())
    console.log(`🛑 Zombie order marked as failed${logCtx({ userId: order.line_user_id, orderNo: order.order_no })}`)
  } catch (err) {
    console.error(`❌ Failed to handle zombie order${ctx}:`, err)
  }
}

async function handleRedeliver(order: Order): Promise<void> {
  const ctx = logCtx({ userId: order.line_user_id, orderNo: order.order_no })
  console.log(`📲 Re-delivering undelivered order${ctx}`)
  try {
    await getProduct(order.package_key).deliver(order.line_user_id, order)
    await Promise.all([
      updateOrder(order.id, { delivered_at: new Date().toISOString() }),
      updateSession(order.session_id, { is_active: false }),
    ])
    console.log(`✅ Order re-delivered${ctx}`)
  } catch (err) {
    console.error(`❌ Failed to redeliver order${ctx}:`, err)
  }
}

