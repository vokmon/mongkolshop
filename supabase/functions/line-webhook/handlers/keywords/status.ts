import { replyText } from "../../../_shared/lineService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import { buildStatusMessage } from "../../lib/messages.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"
import type { UserSession } from "../../../_shared/types.ts"

/**
 * Handles `สถานะ` — replies with the current session status and order number.
 * Requires an active session.
 */
class StatusHandler implements KeywordHandler {
  matches(text: string, session: UserSession | null): boolean {
    return session !== null && text === KEYWORDS.STATUS
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`📋 Status requested${logCtx({ userId })}`)
    await replyText(replyToken, buildStatusMessage(session!))
  }
}

export default new StatusHandler()
