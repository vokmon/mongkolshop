import { getClient } from "./client.ts"
import type { Pricing } from "../types.ts"

export async function getActivePricing(): Promise<Pricing | null> {
  const { data } = await getClient()
    .from("pricing")
    .select("*")
    .eq("is_active", true)
    .maybeSingle()
  return data
}
