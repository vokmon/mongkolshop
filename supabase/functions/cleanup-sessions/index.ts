import { deactivateSession, getGhostSessions } from "../_shared/db/userSessions.ts"
import type { UserSession } from "../_shared/types.ts"

const DEFAULT_GHOST_DAYS = 3

Deno.serve(async (req) => {
  let ghostDays = DEFAULT_GHOST_DAYS
  try {
    const body = await req.json()
    if (typeof body?.ghost_days === "number") ghostDays = body.ghost_days
  } catch { /* no body or invalid JSON — use default */ }

  EdgeRuntime.waitUntil(runCleanup(ghostDays))
  return new Response("OK", { status: 200 })
})

async function runCleanup(ghostDays: number): Promise<void> {
  console.log(`🧹 cleanup-sessions started | ghost_days: ${ghostDays}`)

  const ghosts = await getGhostSessions(ghostDays)
  console.log(`👻 ghost sessions found: ${ghosts.length}`)

  for (const session of ghosts) {
    EdgeRuntime.waitUntil(handleGhost(session))
  }
}

async function handleGhost(session: UserSession): Promise<void> {
  try {
    await deactivateSession(session.id, "no_activity")
    console.log(`✅ Deactivated ghost session: ${session.id} | user: ${session.line_user_id}`)
  } catch (err) {
    console.error(`❌ Failed to deactivate session ${session.id}:`, err)
  }
}
