import {
  deactivateSession,
  getSessionsForReminder,
  updateSession,
} from "../_shared/db/userSessions.ts";
import { getPricing } from "../_shared/configService.ts";
import { pushText } from "../_shared/lineService.ts";
import { logCtx } from "../_shared/logger.ts";
import { getProduct } from "../_shared/products/index.ts";
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
  const product = getProduct(session.package_key)

  try {
    const pricing = await getPricing(session.package_key)

    if (session.reminder_count >= MAX_REMINDERS) {
      console.log(`🛑 Max reminders reached — deactivating session${ctx}`);
      await deactivateSession(session.id, "no_response");
      await pushText(session.line_user_id, await product.buildSessionEndMessage(pricing.name_th));
      return;
    }

    const collected = product.sessionToCollectedData(session);
    const missing = product.getMissingFields(collected);
    const message = await product.buildReminderMessage({
      count: session.reminder_count,
      missing,
      productName: pricing.name_th,
      maxReminders: MAX_REMINDERS,
    });

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
