interface LogCtxOptions {
  userId?: string | null
  name?: string | null
  sessionId?: string | null
  orderNo?: string | null
  attempt?: number
}

/** Builds a structured context prefix: [user:X | name:Y | session:Z | order:W | attempt:N] */
export function logCtx(opts: LogCtxOptions): string {
  const parts: string[] = []
  if (opts.userId) parts.push(`user:${opts.userId}`)
  if (opts.name) parts.push(`name:${opts.name}`)
  if (opts.sessionId) parts.push(`session:${opts.sessionId}`)
  if (opts.orderNo) parts.push(`order:${opts.orderNo}`)
  if (opts.attempt !== undefined) parts.push(`attempt:${opts.attempt}`)
  return parts.length > 0 ? ` [${parts.join(" | ")}]` : ""
}
