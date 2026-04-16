import type { Order } from "./types.ts"

const FUNCTION_MAP: Record<string, string> = {
  wallpaper: "generate-wallpaper",
}

/** Fire-and-forget: invoke the correct generation function for the order's package_key */
export function invokeGenerationJob(order: Order): void {
  const fnName = FUNCTION_MAP[order.package_key]
  if (!fnName) {
    console.error(`❌ No generation function mapped for package_key: ${order.package_key}`)
    return
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ order_no: order.order_no, line_user_id: order.line_user_id }),
  }).then((res) => {
    console.log(`🖼️ ${fnName} invoked for ${order.order_no} | status: ${res.status}`)
  }).catch((err) => {
    console.error(`❌ Failed to invoke ${fnName} for ${order.order_no}:`, err)
  })
}
