import { replyText } from "../../../_shared/lineService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import { buildMyDataMessage } from "../../lib/messages.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"

/**
 * Handles `ดูข้อมูลฉัน` — shows the user's currently collected data for the active session.
 * Works with or without an active session — replies gracefully when nothing is active.
 */
class ViewDataHandler implements KeywordHandler {
  matches(text: string): boolean {
    return text === KEYWORDS.VIEW_DATA
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`👤 View data requested${logCtx({ userId })}`)
    if (!session) {
      await replyText(replyToken, `ยังไม่มีข้อมูลที่บันทึกไว้นะคะ 😊 เลือกบริการจากเมนูได้เลยค่ะ`)
      return
    }
    await replyText(replyToken, buildMyDataMessage(session))
  }
}

export default new ViewDataHandler()
