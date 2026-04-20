import { replyText } from "../../../_shared/lineService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import { buildMyDataMessage } from "../../lib/messages.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"
import type { UserSession } from "../../../_shared/types.ts"

/**
 * Handles `ดูข้อมูลฉัน` — shows the user's currently collected data for the active session.
 * Requires an active session.
 */
class ViewDataHandler implements KeywordHandler {
  matches(text: string, session: UserSession | null): boolean {
    return session !== null && text === KEYWORDS.VIEW_DATA
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`👤 View data requested${logCtx({ userId })}`)
    await replyText(replyToken, buildMyDataMessage(session!))
  }
}

export default new ViewDataHandler()
