import { replyText } from "../../../_shared/lineService.ts"
import { getPricing, getSetting } from "../../../_shared/configService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"

/**
 * Handles `ติดต่อแอดมิน` — shows admin contact info from the `settings` table.
 * Works with or without an active session. Follow-up message adapts to session status:
 * collecting → invite to continue, awaiting_payment → remind payment link, done/no session → generic.
 */
class AdminHandler implements KeywordHandler {
  matches(text: string): boolean {
    return text === KEYWORDS.ADMIN
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`📞 Admin contact requested${logCtx({ userId })}`)
    const [adminContact, botName] = await Promise.all([
      getSetting("admin_contact"),
      getSetting("bot_name"),
    ])

    // Append a context-aware follow-up so the user knows they can continue without losing progress
    let followUp: string
    if (!session) {
      followUp = "หรือสำรวจบริการของเราได้จากเมนูด้านล่างได้เลยนะคะ 😊"
    } else if (session.status === "collecting") {
      const pricing = await getPricing(session.package_key)
      followUp = `ระหว่างรอแอดมินตอบ สามารถกรอกข้อมูล${pricing.name_th}ต่อกับ${botName}ได้เลยนะคะ ✨`
    } else if (session.status === "awaiting_payment") {
      followUp = "ระหว่างรอแอดมินตอบ ลิงก์ชำระเงินยังใช้งานได้อยู่นะคะ กดชำระได้เลยค่ะ 💳"
    } else {
      // done or unknown status
      followUp = "ขอบคุณที่ติดต่อมานะคะ 🙏 แอดมินจะรีบตอบกลับเร็วๆ นี้ค่ะ"
    }
    await replyText(replyToken, `${adminContact}\n\n${followUp}`)
  }
}

export default new AdminHandler()
