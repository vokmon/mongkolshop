import { getClient } from "./client.ts"
import type { CollectedData, UserSession } from "../types.ts"

export async function getActiveSession(lineUserId: string): Promise<UserSession | null> {
  const { data } = await getClient()
    .from("user_sessions")
    .select("*")
    .eq("line_user_id", lineUserId)
    .eq("is_active", true)
    .maybeSingle()
  return data
}

export async function createSession(lineUserId: string, displayName: string | null): Promise<UserSession> {
  const { data, error } = await getClient()
    .from("user_sessions")
    .insert({ line_user_id: lineUserId, display_name: displayName })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSession(
  sessionId: number,
  patch: Partial<Pick<UserSession,
    | "step"
    | "full_name"
    | "birthdate"
    | "wish"
    | "deity_key"
    | "deity_source"
    | "color"
    | "conversation_history"
    | "current_order_no"
    | "reminder_count"
    | "last_reminded_at"
    | "abandoned_reason"
    | "abandoned_at"
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

export async function getSessionsForReminder(): Promise<UserSession[]> {
  // Active sessions at steps 1–6 (collecting data) that haven't been reminded recently
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data } = await getClient()
    .from("user_sessions")
    .select("*")
    .eq("is_active", true)
    .gte("step", 1)
    .lte("step", 6)
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${oneHourAgo}`)
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

export function sessionToCollectedData(session: UserSession): CollectedData {
  return {
    full_name: session.full_name,
    birthdate: session.birthdate,
    wish: session.wish,
    deity_key: session.deity_key,
    color: session.color,
  }
}

export function getMissingFields(data: CollectedData): string[] {
  const missing: string[] = []
  if (!data.full_name) missing.push("full_name")
  if (!data.birthdate) missing.push("birthdate")
  if (!data.wish) missing.push("wish")
  if (!data.deity_key) missing.push("deity")
  if (!data.color) missing.push("color")
  return missing
}
