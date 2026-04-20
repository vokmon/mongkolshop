import type { UserSession } from "../../_shared/types.ts"
import { getProduct } from "../../_shared/products/index.ts"
import { quickReplyItem } from "../../_shared/lineService.ts"
import { KEYWORDS } from "../../_shared/constants.ts"

export function buildStatusMessage(session: UserSession): string {
  const label =
    session.status === "awaiting_payment" ? "รอการชำระเงิน 💳" :
    session.status === "done"             ? "เสร็จสิ้น ✅" :
                                            "กำลังเก็บข้อมูล 📝"
  return `สถานะของคุณ: ${label}\nOrder: ${session.current_order_no ?? "-"}`
}

export function buildHelpQuickReply() {
  return [
    quickReplyItem(`📋 ${KEYWORDS.STATUS}`, KEYWORDS.STATUS),
    quickReplyItem(`🔄 ${KEYWORDS.RESTART}`, KEYWORDS.RESTART),
    quickReplyItem(`👤 ${KEYWORDS.VIEW_DATA}`, KEYWORDS.VIEW_DATA),
    quickReplyItem(`🗑️ ${KEYWORDS.DELETE_DATA}`, KEYWORDS.DELETE_DATA),
    quickReplyItem(`📞 ${KEYWORDS.ADMIN}`, KEYWORDS.ADMIN),
  ]
}

export function buildMyDataMessage(session: UserSession): string {
  return getProduct(session.package_key).buildMyDataMessage(session)
}
