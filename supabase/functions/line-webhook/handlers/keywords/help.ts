import { quickReply, replyMessages } from "../../../_shared/lineService.ts"
import { logCtx } from "../../../_shared/logger.ts"
import { KEYWORDS } from "../../../_shared/constants.ts"
import { buildHelpMessage, buildHelpQuickReply } from "../../lib/messages.ts"
import type { HandlerContext, KeywordHandler } from "./types.ts"
/**
 * Handles `ช่วยด้วย` / `ช่วยเหลือ` / `help` — replies with a quick reply menu of available commands.
 * Works with or without an active session.
 */
class HelpHandler implements KeywordHandler {
  matches(text: string): boolean {
    return KEYWORDS.HELP.includes(text.toLowerCase())
  }

  async handle({ userId, replyToken, session }: HandlerContext): Promise<void> {
    console.log(`❓ Help requested${logCtx({ userId })}`)
    const hasSession = session !== null
    await replyMessages(replyToken, [quickReply(buildHelpMessage(hasSession), buildHelpQuickReply(hasSession))])
  }
}

export default new HelpHandler()
