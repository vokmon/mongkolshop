import { getClient } from "./client.ts"
import type { UserConsent } from "../types.ts"

export async function getConsent(lineUserId: string): Promise<UserConsent | null> {
  const { data } = await getClient()
    .from("user_consents")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle()
  return data
}

export async function upsertConsent(lineUserId: string, accepted: boolean): Promise<void> {
  const now = new Date().toISOString()
  await getClient().from("user_consents").upsert(
    {
      line_user_id: lineUserId,
      accepted,
      accepted_at: accepted ? now : null,
      withdrawn: !accepted,
      withdrawn_at: !accepted ? now : null,
      updated_at: now,
    },
    { onConflict: "line_user_id" },
  )
}
