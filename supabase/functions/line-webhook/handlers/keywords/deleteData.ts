import { replyText } from "../../../_shared/lineService.ts"
import { upsertConsent } from "../../../_shared/db/userConsents.ts"
import { deactivateSession, wipeUserSessionData } from "../../../_shared/db/userSessions.ts"
import { getOrderByOrderNo } from "../../../_shared/db/orders.ts"
import { getPricing } from "../../../_shared/configService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"

/**
 * Handles `ลบข้อมูลฉัน` — wipes all collected data, withdraws PDPA consent, and deactivates the session.
 * Blocked if the current order is already paid or generating.
 * Works with or without an active session — consent + data are wiped either way.
 */
class DeleteDataHandler implements KeywordHandler {
  matches(text: string): boolean {
    return text === KEYWORDS.DELETE_DATA
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`🗑️ Delete data requested${logCtx({ userId })}`)

    // Block deletion if order is paid or generating — data is needed to complete the job
    if (session?.current_order_no) {
      const order = await getOrderByOrderNo(session.current_order_no)
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(`⏳ Delete data blocked — order in progress${logCtx({ userId, orderNo: order.order_no })} status:${order.status}`)
        const pricing = await getPricing(session.package_key)
        await replyText(replyToken, `${pricing.name_th}ของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอรับก่อน แล้วค่อยลบข้อมูลได้เลยนะคะ 🙏`)
        return
      }
    }

    // Deactivate session if active, withdraw consent, and wipe all collected data
    if (session) await deactivateSession(session.id, "user_data_deletion")
    await Promise.all([
      upsertConsent(userId, false),
      wipeUserSessionData(userId),
    ])
    await replyText(replyToken, `ลบข้อมูลของคุณเรียบร้อยแล้วค่ะ 🙏 หากต้องการใช้บริการใหม่ พิมพ์ว่า ${KEYWORDS.CONSENT_ACCEPT} ได้เลยค่ะ`)
  }
}

export default new DeleteDataHandler()
