import { replyText } from "../../../_shared/lineService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import { buildStatusMessage } from "../../lib/messages.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"

/**
 * Handles `สถานะ` — replies with the current session status and order number.
 * Works with or without an active session — replies gracefully when nothing is active.
 */
class StatusHandler implements KeywordHandler {
  matches(text: string): boolean {
    return text === KEYWORDS.STATUS
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`📋 Status requested${logCtx({ userId })}`)
    if (!session) {
      await replyText(replyToken, `ยังไม่มีคำสั่งซื้อที่ใช้งานอยู่นะคะ 😊 เลือกบริการจากเมนูได้เลยค่ะ`)
      return
    }
    await replyText(replyToken, buildStatusMessage(session))
  }
}

export default new StatusHandler()
