import type { UserSession } from "../../_shared/types.ts"
import { getProduct } from "../../_shared/products/index.ts"
import { quickReplyItem } from "../../_shared/lineService.ts"
import { KEYWORDS } from "../../_shared/constants.ts"

export function buildStatusMessage(session: UserSession): string {
  return getProduct(session.package_key).buildStatusMessage(session)
}

export function buildHelpMessage(hasSession: boolean): string {
  const sessionLines = hasSession
    ? `📋 ${KEYWORDS.STATUS} — ดูว่าคำสั่งซื้อไปถึงไหนแล้ว\n` +
      `🔄 ${KEYWORDS.RESTART} — ล้างข้อมูลและเริ่มต้นใหม่\n` +
      `❌ ${KEYWORDS.CANCEL} — ยกเลิกคำสั่งซื้อที่ค้างอยู่\n`
    : ""
  return "มีอะไรให้ช่วยไหมคะ? 😊 กดเลือกได้เลยนะคะ\n\n" +
    sessionLines +
    `👤 ${KEYWORDS.VIEW_DATA} — ข้อมูลที่น้องบันทึกไว้\n` +
    `🗑️ ${KEYWORDS.DELETE_DATA} — ลบข้อมูลส่วนตัวทั้งหมด\n` +
    `📞 ${KEYWORDS.ADMIN} — ให้ทีมงานช่วยโดยตรง`
}

export function buildHelpQuickReply(hasSession: boolean) {
  const sessionItems = hasSession
    ? [
        quickReplyItem(`📋 ${KEYWORDS.STATUS}`, KEYWORDS.STATUS),
        quickReplyItem(`🔄 ${KEYWORDS.RESTART}`, KEYWORDS.RESTART),
        quickReplyItem(`❌ ${KEYWORDS.CANCEL}`, KEYWORDS.CANCEL),
      ]
    : []
  return [
    ...sessionItems,
    quickReplyItem(`👤 ${KEYWORDS.VIEW_DATA}`, KEYWORDS.VIEW_DATA),
    quickReplyItem(`🗑️ ${KEYWORDS.DELETE_DATA}`, KEYWORDS.DELETE_DATA),
    quickReplyItem(`📞 ${KEYWORDS.ADMIN}`, KEYWORDS.ADMIN),
  ]
}

export function buildMyDataMessage(session: UserSession): string {
  return getProduct(session.package_key).buildMyDataMessage(session)
}
