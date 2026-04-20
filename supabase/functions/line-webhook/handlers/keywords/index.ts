import type { HandlerContext, KeywordHandler } from "./types.ts"
import adminHandler from "./admin.ts"
import statusHandler from "./status.ts"
import restartHandler from "./restart.ts"
import cancelHandler from "./cancel.ts"
import helpHandler from "./help.ts"
import viewDataHandler from "./viewData.ts"
import deleteDataHandler from "./deleteData.ts"

export type { HandlerContext, KeywordHandler }

const handlers: KeywordHandler[] = [
  adminHandler,
  statusHandler,
  restartHandler,
  cancelHandler,
  helpHandler,
  viewDataHandler,
  deleteDataHandler,
]

export async function handleSpecialKeyword(ctx: HandlerContext): Promise<boolean> {
  const t = ctx.text.trim()
  for (const handler of handlers) {
    if (handler.matches(t, ctx.session)) {
      await handler.handle({ ...ctx, text: t })
      return true
    }
  }
  return false
}
