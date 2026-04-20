import { quickReply, replyMessages } from "../../../_shared/lineService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import { buildHelpQuickReply } from "../../lib/messages.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"
import type { UserSession } from "../../../_shared/types.ts"

/**
 * Handles `ช่วยด้วย` / `ช่วยเหลือ` / `help` — replies with a quick reply menu of available commands.
 * Requires an active session.
 */
class HelpHandler implements KeywordHandler {
  matches(text: string, session: UserSession | null): boolean {
    return session !== null && KEYWORDS.HELP.includes(text.toLowerCase())
  }

  async handle({ userId, replyToken }: HandlerContext): Promise<void> {
    console.log(`❓ Help requested${logCtx({ userId })}`)
    await replyMessages(replyToken, [quickReply("มีอะไรให้ช่วยไหมคะ? 😊", buildHelpQuickReply())])
  }
}

export default new HelpHandler()
