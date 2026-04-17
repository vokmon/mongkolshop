import { getClient } from "./client.ts"
import type { Order } from "../types.ts"

export async function createOrder(
  lineUserId: string,
  sessionId: number,
  orderNo: string,
  packageKey: string,
): Promise<Order> {
  const { data, error } = await getClient()
    .from("orders")
    .insert({ order_no: orderNo, line_user_id: lineUserId, session_id: sessionId, package_key: packageKey })
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
    | "checkout_url"
    | "promotion_code"
    | "discount_amount"
    | "price_paid"
    | "status"
    | "generated_content"
    | "image_url"
    | "generate_attempts"
    | "last_error"
    | "paid_at"
    | "generating_at"
    | "completed_at"
    | "delivered_at"
    | "package_key"
  >>,
): Promise<void> {
  await getClient().from("orders").update(patch).eq("id", orderId)
}

export async function getStuckGeneratingOrders(): Promise<Order[]> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data } = await getClient()
    .from("orders")
    .select("*")
    .eq("status", "generating")
    .lt("generating_at", cutoff)
  return data ?? []
}

export async function getAbandonedPaidOrders(): Promise<Order[]> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data } = await getClient()
    .from("orders")
    .select("*")
    .eq("status", "paid")
    .lt("paid_at", cutoff)
  return data ?? []
}

export async function getUndeliveredOrders(): Promise<Order[]> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data } = await getClient()
    .from("orders")
    .select("*")
    .eq("status", "done")
    .is("delivered_at", null)
    .lt("completed_at", cutoff)
  return data ?? []
}
