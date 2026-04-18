import { quickReplyItem } from "../../_shared/lineService.ts"
import { getProduct } from "../../_shared/products/index.ts"
import type { BotResponse } from "../../_shared/types.ts"

export function buildGuidedQuickReplies(missingFields: string[], packageKey: string) {
  const labels = getProduct(packageKey).getFieldLabels()
  // LINE quick reply max 13 items; show only missing fields (max 5)
  return missingFields.slice(0, 5).map((field) => {
    const [label, text] = labels[field] ?? [field, field]
    return quickReplyItem(label, text)
  })
}

export function extractedToCollected(ex: BotResponse["extracted"], packageKey: string): Record<string, unknown> {
  return getProduct(packageKey).extractedToCollected(ex)
}
