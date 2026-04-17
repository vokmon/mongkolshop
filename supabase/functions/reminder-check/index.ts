import {
  deactivateSession,
  getMissingFields,
  getSessionsForReminder,
  sessionToCollectedData,
  updateSession,
} from "../_shared/db/userSessions.ts";
import { pushText } from "../_shared/lineService.ts";
import { logCtx } from "../_shared/logger.ts";
import { BOT_NAME, KEYWORDS } from "../_shared/constants.ts";
import type { UserSession } from "../_shared/types.ts";

const MAX_REMINDERS = 1;
const DEFAULT_INACTIVE_HOURS = 2;

Deno.serve(async (req) => {
  let inactiveHours = DEFAULT_INACTIVE_HOURS;
  try {
    const body = await req.json();
    if (typeof body?.inactive_hours === "number")
      inactiveHours = body.inactive_hours;
  } catch {
    /* no body or invalid JSON — use default */
  }

  EdgeRuntime.waitUntil(runReminders(inactiveHours));
  return new Response("OK", { status: 200 });
});

async function runReminders(inactiveHours: number): Promise<void> {
  console.log(`🔔 reminder-check started | inactive_hours: ${inactiveHours}`);

  const sessions = await getSessionsForReminder(inactiveHours, MAX_REMINDERS);
  const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000);

  const eligible = sessions.filter((s) => {
    if (s.last_reminded_at === null) {
      // First reminder: user hasn't been active for INACTIVE_HOURS
      return new Date(s.updated_at) < cutoff;
    } else {
      // Subsequent: INACTIVE_HOURS since last reminder
      // last_reminded_at being non-null means user hasn't replied since (line-webhook resets it to null on any message)
      return new Date(s.last_reminded_at) < cutoff;
    }
  });

  console.log(`📊 eligible for reminder: ${eligible.length}`);

  for (const session of eligible) {
    EdgeRuntime.waitUntil(handleReminder(session));
  }
}

async function handleReminder(session: UserSession): Promise<void> {
  const ctx = logCtx({ userId: session.line_user_id, sessionId: session.id })
  try {
    if (session.reminder_count >= MAX_REMINDERS) {
      console.log(`🛑 Max reminders reached — deactivating session${ctx}`);
      await deactivateSession(session.id, "no_response");
      await pushText(
        session.line_user_id,
        `ขออภัยค่ะ ${BOT_NAME}ขอปิดรายการนี้ไว้ก่อนนะคะ 🙏 หากต้องการกลับมาสร้างรูปมงคล พิมพ์ว่า ${KEYWORDS.RESTART} ได้เลยค่ะ ✨`,
      );
      return;
    }

    const collected = sessionToCollectedData(session);
    const missing = getMissingFields(collected);
    const message = buildReminderMessage(
      session.reminder_count,
      missing,
      MAX_REMINDERS,
    );

    await pushText(session.line_user_id, message);
    await updateSession(session.id, {
      reminder_count: session.reminder_count + 1,
      last_reminded_at: new Date().toISOString(),
    });

    console.log(`✅ Reminder ${session.reminder_count + 1}/${MAX_REMINDERS} sent${ctx}`);
  } catch (err) {
    console.error(`❌ Failed to send reminder${ctx}:`, err);
  }
}

const REMINDER_MESSAGES: Array<(missing: string) => string> = [
  (missing) =>
    `${BOT_NAME}รอคุณอยู่นะคะ ✨ ยังขาด ${missing} อยู่เลยค่ะ มาทำต่อกันเลยนะคะ 🙏`,
  (missing) =>
    `สวัสดีอีกครั้งค่ะ 🙏 ${BOT_NAME}ยังรอสร้างรูปมงคลให้คุณอยู่นะคะ ✨ ยังขาด ${missing} ค่ะ`,
  (missing) =>
    `ว่าไงคะ 😊 ยังนึกถึงรูปมงคลอยู่ไหมคะ? ยังขาด ${missing} อยู่นะคะ 🙏`,
];

const LAST_WARNING = (missing: string) =>
  `นี่คือการแจ้งเตือนครั้งสุดท้ายนะคะ 🙏 ถ้าไม่ตอบกลับ ${BOT_NAME}จะปิดรายการนี้ไว้ก่อนนะคะ ยังขาด ${missing} ค่ะ`;

function buildReminderMessage(
  count: number,
  missing: string[],
  maxReminders: number,
): string {
  const missingText = missing.map(fieldToThai).join(", ");
  if (count >= maxReminders - 1) return LAST_WARNING(missingText);
  return REMINDER_MESSAGES[count % REMINDER_MESSAGES.length](missingText);
}

function fieldToThai(field: string): string {
  const map: Record<string, string> = {
    full_name: "ชื่อ",
    birthdate: "วันเกิด",
    wish: "ความปรารถนา",
    deity: "เทพ",
    color: "สีที่ชอบ",
    include_lucky_number: "ใส่เลขมงคลในรูป",
    include_name: "ใส่ชื่อในรูป",
  };
  return map[field] ?? field;
}
