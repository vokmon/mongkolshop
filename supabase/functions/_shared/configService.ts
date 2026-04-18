import { getAllPrompts } from "./db/prompts.ts"
import { getActivePricingByKey, getAllActivePricing } from "./db/pricing.ts"
import type { Pricing, Prompt } from "./types.ts"

// In-memory cache — lives for the lifetime of the Edge Function instance
// Cache key: "{package_key}:{prompt_key}"
let promptCache: Map<string, string> | null = null

export async function getPrompt(packageKey: string, key: string): Promise<string> {
  if (!promptCache) {
    const rows = await getAllPrompts()
    promptCache = new Map(rows.map((p) => [`${p.package_key}:${p.prompt_key}`, p.content]))
  }
  const content = promptCache.get(`${packageKey}:${key}`)
  if (!content) throw new Error(`Prompt not found: ${packageKey}:${key}`)
  return content
}

export async function getPricing(packageKey: string): Promise<Pricing> {
  // Not cached — stripe_price_id can be updated in DB without redeploying
  const row = await getActivePricingByKey(packageKey)
  if (!row) throw new Error(`No active pricing found for package: ${packageKey}`)
  return row
}

export async function getAllPricing(): Promise<Pricing[]> {
  return getAllActivePricing()
}

/** Fill {{placeholder}} variables in a prompt template */
export function fillPrompt(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "")
}

/** Force-clear prompt cache (useful after prompt updates in DB) */
export function clearCache(): void {
  promptCache = null
}
