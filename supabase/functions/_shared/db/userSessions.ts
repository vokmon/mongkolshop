import { getClient } from "./client.ts"
import type { UserSession, WallpaperCollectedData } from "../types.ts"

export async function getSessionById(id: number): Promise<UserSession | null> {
  const { data } = await getClient()
    .from("user_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return data
}

export async function getActiveSession(lineUserId: string): Promise<UserSession | null> {
  const { data } = await getClient()
    .from("user_sessions")
    .select("*")
    .eq("line_user_id", lineUserId)
    .eq("is_active", true)
    .maybeSingle()
  return data
}

export async function createSession(
  lineUserId: string,
  displayName: string | null,
  packageKey = "wallpaper",
): Promise<UserSession> {
  const { data, error } = await getClient()
    .from("user_sessions")
    .insert({ line_user_id: lineUserId, display_name: displayName, package_key: packageKey })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSession(
  sessionId: number,
  patch: Partial<Pick<UserSession,
    | "step"
    | "collected_data"
    | "conversation_history"
    | "current_order_no"
    | "reminder_count"
    | "last_reminded_at"
    | "abandoned_reason"
    | "abandoned_at"
    | "package_key"
    | "off_topic_count"
    | "chat_mode"
    | "is_active"
  >>,
): Promise<void> {
  await getClient()
    .from("user_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
}

export async function deactivateSession(sessionId: number, reason?: string): Promise<void> {
  await updateSession(sessionId, {
    is_active: false,
    ...(reason ? { abandoned_reason: reason, abandoned_at: new Date().toISOString() } : {}),
  })
}

export async function getGhostSessions(days: number): Promise<UserSession[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await getClient()
    .from("user_sessions")
    .select("*")
    .eq("is_active", true)
    .lt("created_at", cutoff)
  return data ?? []
}

export async function getSessionsForReminder(inactiveHours: number): Promise<UserSession[]> {
  // Active sessions that haven't completed data collection (no order yet)
  // Include reminder_count = 3 so we can deactivate those on this run
  const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString()
  const { data } = await getClient()
    .from("user_sessions")
    .select("*")
    .eq("is_active", true)
    .is("current_order_no", null)
    .lte("reminder_count", 3)
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${cutoff}`)
  return data ?? []
}

// ============================================================
// Helpers
// ============================================================

export function generateOrderNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6)
  return `MK-${date}-${rand}`
}

export function sessionToCollectedData(session: UserSession): WallpaperCollectedData {
  const d = session.collected_data as Partial<WallpaperCollectedData>
  return {
    full_name: d.full_name ?? null,
    birthdate: d.birthdate ?? null,
    wish: d.wish ?? null,
    deity_key: d.deity_key ?? null,
    deity_source: d.deity_source ?? null,
    color: d.color ?? null,
  }
}

export function getMissingFields(data: WallpaperCollectedData): string[] {
  const missing: string[] = []
  if (!data.full_name) missing.push("full_name")
  if (!data.birthdate) missing.push("birthdate")
  if (!data.wish) missing.push("wish")
  if (!data.deity_key) missing.push("deity")
  if (!data.color) missing.push("color")
  return missing
}
