import { getClient } from "./client.ts"
import type { Pricing } from "../types.ts"

export async function getActivePricingByKey(packageKey: string): Promise<Pricing | null> {
  const { data } = await getClient()
    .from("pricing")
    .select("*")
    .eq("is_active", true)
    .eq("package_key", packageKey)
    .maybeSingle()
  return data
}

export async function getAllActivePricing(): Promise<Pricing[]> {
  const { data } = await getClient()
    .from("pricing")
    .select("*")
    .eq("is_active", true)
    .order("id")
  return data ?? []
}
