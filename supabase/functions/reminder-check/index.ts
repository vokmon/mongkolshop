import {
  deactivateSession,
  getMissingFields,
  getSessionsForReminder,
  sessionToCollectedData,
  updateSession,
} from "../_shared/db/userSessions.ts"
import { pushText } from "../_shared/lineService.ts"
import type { UserSession } from "../_shared/types.ts"

const MAX_REMINDERS = 3
const DEFAULT_INACTIVE_HOURS = 2

Deno.serve(async (req) => {
  let inactiveHours = DEFAULT_INACTIVE_HOURS
  try {
    const body = await req.json()
    if (typeof body?.inactive_hours === "number") inactiveHours = body.inactive_hours
  } catch { /* no body or invalid JSON — use default */ }

  EdgeRuntime.waitUntil(runReminders(inactiveHours))
  return new Response("OK", { status: 200 })
})

async function runReminders(inactiveHours: number): Promise<void> {
  console.log(`🔔 reminder-check started | inactive_hours: ${inactiveHours}`)

  const sessions = await getSessionsForReminder(inactiveHours)
  const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000)

  const eligible = sessions.filter((s) => {
    if (s.last_reminded_at === null) {
      // First reminder: user hasn't been active for INACTIVE_HOURS
      return new Date(s.updated_at) < cutoff
    } else {
      // Subsequent: INACTIVE_HOURS since last reminder
      // last_reminded_at being non-null means user hasn't replied since (line-webhook resets it to null on any message)
      return new Date(s.last_reminded_at) < cutoff
    }
  })

  console.log(`📊 eligible for reminder: ${eligible.length}`)

  for (const session of eligible) {
    EdgeRuntime.waitUntil(handleReminder(session))
  }
}

async function handleReminder(session: UserSession): Promise<void> {
  try {
    if (session.reminder_count >= MAX_REMINDERS) {
      console.log(`🛑 Deactivating session ${session.id} after ${MAX_REMINDERS} reminders`)
      await deactivateSession(session.id, "no_response")
      await pushText(
        session.line_user_id,
        "ขออภัยค่ะ น้องมงคลขอปิดรายการนี้ไว้ก่อนนะคะ 🙏 หากต้องการกลับมาสร้างรูปมงคล พิมพ์ว่า เริ่มใหม่ ได้เลยค่ะ ✨",
      )
      return
    }

    const collected = sessionToCollectedData(session)
    const missing = getMissingFields(collected)
    const message = buildReminderMessage(session.reminder_count, missing)

    await pushText(session.line_user_id, message)
    await updateSession(session.id, {
      reminder_count: session.reminder_count + 1,
      last_reminded_at: new Date().toISOString(),
    })

    console.log(`✅ Reminder ${session.reminder_count + 1}/${MAX_REMINDERS} sent | session: ${session.id}`)
  } catch (err) {
    console.error(`❌ Failed to send reminder for session ${session.id}:`, err)
  }
}

function buildReminderMessage(count: number, missing: string[]): string {
  const missingText = missing.map(fieldToThai).join(", ")

  if (count === 0) {
    return `น้องมงคลรอคุณอยู่นะคะ ✨ ยังขาดข้อมูลอีกนิดหน่อยเลยค่ะ (${missingText}) มาทำต่อกันเลยนะคะ 🙏`
  } else if (count === 1) {
    return `สวัสดีอีกครั้งค่ะ 🙏 น้องมงคลยังรอสร้างรูปมงคลให้คุณอยู่นะคะ ✨ ยังขาด ${missingText} อยู่เลยค่ะ`
  } else {
    return `นี่คือการแจ้งเตือนครั้งสุดท้ายนะคะ 🙏 ถ้าไม่ตอบกลับ น้องมงคลจะปิดรายการนี้ไว้ก่อนนะคะ ยังขาด ${missingText} ค่ะ`
  }
}

function fieldToThai(field: string): string {
  const map: Record<string, string> = {
    full_name: "ชื่อ",
    birthdate: "วันเกิด",
    wish: "ความปรารถนา",
    deity: "เทพ",
    color: "สีที่ชอบ",
  }
  return map[field] ?? field
}
