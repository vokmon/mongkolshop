import {
  deactivateSession,
  getGhostSessions,
  getStaleDeactivatedSessions,
  wipeUserSessionData,
} from "../_shared/db/userSessions.ts"
import type { UserSession } from "../_shared/types.ts"

const DEFAULT_GHOST_DAYS = 3
const DEFAULT_DATA_RETENTION_DAYS = 90

Deno.serve(async (req) => {
  let ghostDays = DEFAULT_GHOST_DAYS
  let dataRetentionDays = DEFAULT_DATA_RETENTION_DAYS
  try {
    const body = await req.json()
    if (typeof body?.ghost_days === "number") ghostDays = body.ghost_days
    if (typeof body?.data_retention_days === "number") dataRetentionDays = body.data_retention_days
  } catch { /* no body or invalid JSON — use defaults */ }

  EdgeRuntime.waitUntil(runCleanup(ghostDays, dataRetentionDays))
  return new Response("OK", { status: 200 })
})

async function runCleanup(ghostDays: number, dataRetentionDays: number): Promise<void> {
  console.log(`🧹 cleanup-sessions started | ghost_days: ${ghostDays} | data_retention_days: ${dataRetentionDays}`)

  const [ghosts, stale] = await Promise.all([
    getGhostSessions(ghostDays),
    getStaleDeactivatedSessions(dataRetentionDays),
  ])

  console.log(`👻 ghost sessions: ${ghosts.length} | 🗑️ stale for data wipe: ${stale.length}`)

  for (const session of ghosts) {
    EdgeRuntime.waitUntil(handleGhost(session))
  }

  for (const session of stale) {
    EdgeRuntime.waitUntil(handleDataWipe(session))
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

async function handleDataWipe(session: UserSession): Promise<void> {
  try {
    await wipeUserSessionData(session.line_user_id)
    console.log(`🗑️ Wiped data for user: ${session.line_user_id}`)
  } catch (err) {
    console.error(`❌ Failed to wipe data for session ${session.id}:`, err)
  }
}
