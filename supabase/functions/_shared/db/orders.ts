import { getClient } from "./client.ts"
import type { Order } from "../types.ts"

export async function createOrder(
  lineUserId: string,
  sessionId: number,
  orderNo: string,
): Promise<Order> {
  const { data, error } = await getClient()
    .from("orders")
    .insert({ order_no: orderNo, line_user_id: lineUserId, session_id: sessionId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getOrderByStripeSession(stripeSessionId: string): Promise<Order | null> {
  const { data } = await getClient()
    .from("orders")
    .select("*")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle()
  return data
}

export async function getOrderByOrderNo(orderNo: string): Promise<Order | null> {
  const { data } = await getClient()
    .from("orders")
    .select("*")
    .eq("order_no", orderNo)
    .maybeSingle()
  return data
}

export async function updateOrder(
  orderId: number,
  patch: Partial<Pick<Order,
    | "stripe_session_id"
    | "stripe_payment_id"
    | "status"
    | "image_prompt"
    | "image_url"
    | "fortune_text"
    | "mantra"
    | "mantra_meaning"
    | "worship_guide"
    | "lucky_colors"
    | "generate_attempts"
    | "last_error"
    | "paid_at"
    | "generating_at"
    | "completed_at"
    | "delivered_at"
  >>,
): Promise<void> {
  await getClient().from("orders").update(patch).eq("id", orderId)
}

export async function getStuckOrders(): Promise<Order[]> {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data } = await getClient()
    .from("orders")
    .select("*")
    .eq("status", "generating")
    .lt("generating_at", cutoff)
  return data ?? []
}
