import type { UserSession } from "../../../_shared/types.ts"

export type HandlerContext = {
  userId: string
  replyToken: string
  text: string
  session: UserSession | null
}

export interface KeywordHandler {
  matches(text: string, session: UserSession | null): boolean
  handle(ctx: HandlerContext): Promise<void>
}
