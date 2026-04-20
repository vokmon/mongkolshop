import type { BotResponse, Order, Pricing, UserSession } from "../types.ts"
import wallpaper from "./wallpaper.ts"

export interface ProductModule {
  sessionToCollectedData(session: UserSession): Record<string, unknown>
  getMissingFields(data: Record<string, unknown>): string[]
  buildMyDataMessage(session: UserSession): string
  formatCollectedData(data: Record<string, unknown>): string
  fieldToThai(field: string): string
  buildReminderMessage(args: { count: number; missing: string[]; productName: string; maxReminders: number }): Promise<string>
  buildSessionEndMessage(productName: string): Promise<string>
  getFieldLabels(): Record<string, [string, string]>
  extractedToCollected(ex: BotResponse["extracted"]): Record<string, unknown>
  buildDeliveryText(content: Record<string, unknown>): string
  buildGenerationFailedMessage(): string
  deliver(lineUserId: string, order: Order): Promise<void>
}

const PRODUCTS: Record<string, ProductModule> = {
  wallpaper,
}

export function getProduct(packageKey: string): ProductModule {
  return PRODUCTS[packageKey] ?? wallpaper
}

/** Returns the package_key whose entry_keywords (from DB) contains the given text, or null if none. */
export function getProductKeyByEntryKeyword(text: string, allPricing: Pricing[]): string | null {
  const t = text.trim()
  for (const p of allPricing) {
    if (p.entry_keywords.includes(t)) return p.package_key
  }
  return null
}
