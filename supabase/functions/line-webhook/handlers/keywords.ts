import { getUserProfile, replyText } from "../../_shared/lineService.ts";
import { upsertConsent } from "../../_shared/db/userConsents.ts";
import {
  createSession,
  deactivateSession,
  wipeUserSessionData,
} from "../../_shared/db/userSessions.ts";
import { getOrderByOrderNo } from "../../_shared/db/orders.ts";
import { getPricing, getSetting } from "../../_shared/configService.ts";
import {
  buildHelpMessage,
  buildMyDataMessage,
  buildStatusMessage,
} from "../lib/messages.ts";
import { logCtx } from "../../_shared/logger.ts";
import { KEYWORDS } from "../../_shared/constants.ts";
import type { UserSession } from "../../_shared/types.ts";

export async function handleSpecialKeyword({
  userId,
  replyToken,
  text,
  session,
}: {
  userId: string
  replyToken: string
  text: string
  session: UserSession | null
}): Promise<boolean> {
  const t = text.trim();

  if (t === KEYWORDS.ADMIN) {
    console.log(`📞 Admin contact requested${logCtx({ userId })}`);
    const [adminContact, botName] = await Promise.all([
      getSetting("admin_contact"),
      getSetting("bot_name"),
    ])
    let followUp: string
    if (!session) {
      followUp = "หรือสำรวจบริการของเราได้จากเมนูด้านล่างได้เลยนะคะ 😊"
    } else if (session.status === "collecting") {
      const pricing = await getPricing(session.package_key)
      followUp = `ระหว่างรอแอดมินตอบ สามารถกรอกข้อมูล${pricing.name_th}ต่อกับ${botName}ได้เลยนะคะ ✨`
    } else if (session.status === "awaiting_payment") {
      followUp = "ระหว่างรอแอดมินตอบ ลิงก์ชำระเงินยังใช้งานได้อยู่นะคะ กดชำระได้เลยค่ะ 💳"
    } else {
      followUp = "ขอบคุณที่ติดต่อมานะคะ 🙏 แอดมินจะรีบตอบกลับเร็วๆ นี้ค่ะ"
    }
    await replyText(replyToken, `${adminContact}\n\n${followUp}`)
    return true;
  }

  // All remaining keywords require an active session
  if (!session) return false;

  if (t === KEYWORDS.STATUS) {
    console.log(`📋 Status requested${logCtx({ userId })}`);
    await replyText(replyToken, buildStatusMessage(session));
    return true;
  }

  if (t === KEYWORDS.RESTART) {
    console.log(`🔄 Restart requested${logCtx({ userId })}`);
    if (session.current_order_no) {
      const order = await getOrderByOrderNo(session.current_order_no);
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(
          `⏳ Restart blocked — order in progress${logCtx({ userId, orderNo: order.order_no })} status:${order.status}`,
        );
        const pricing = await getPricing(session.package_key);
        await replyText(
          replyToken,
          `${pricing.name_th}ของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอสักครู่ แล้วจะส่งให้ทาง LINE นี้เลยค่ะ 🙏`,
        );
        return true;
      }
    }
    await deactivateSession(session.id, "user_reset");
    const profile = await getUserProfile(userId);
    await createSession(userId, profile?.displayName ?? null, session.package_key);
    let productName = "";
    try {
      const pricing = await getPricing(session.package_key);
      productName = pricing.name_th;
    } catch { /* pricing row missing — fall back to generic message */ }
    const botName = await getSetting("bot_name")
    await replyText(
      replyToken,
      `เริ่มต้นใหม่แล้วค่ะ ✨ ${botName}พร้อมช่วย${productName ? `สร้าง${productName}` : "เหลือคุณ"}ใหม่เลยนะคะ`,
    );
    return true;
  }

  if (KEYWORDS.HELP.includes(t.trim().toLowerCase())) {
    console.log(`❓ Help requested${logCtx({ userId })}`);
    await replyText(replyToken, buildHelpMessage());
    return true;
  }

  if (t === KEYWORDS.VIEW_DATA) {
    console.log(`👤 View data requested${logCtx({ userId })}`);
    await replyText(replyToken, buildMyDataMessage(session));
    return true;
  }

  if (t === KEYWORDS.DELETE_DATA) {
    console.log(`🗑️ Delete data requested${logCtx({ userId })}`);
    if (session.current_order_no) {
      const order = await getOrderByOrderNo(session.current_order_no);
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(
          `⏳ Delete data blocked — order in progress${logCtx({ userId, orderNo: order.order_no })} status:${order.status}`,
        );
        const pricing = await getPricing(session.package_key);
        await replyText(
          replyToken,
          `${pricing.name_th}ของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอรับก่อน แล้วค่อยลบข้อมูลได้เลยนะคะ 🙏`,
        );
        return true;
      }
    }
    await deactivateSession(session.id, "user_data_deletion");
    await Promise.all([
      upsertConsent(userId, false),
      wipeUserSessionData(userId),
    ]);
    await replyText(
      replyToken,
      `ลบข้อมูลของคุณเรียบร้อยแล้วค่ะ 🙏 หากต้องการใช้บริการใหม่ พิมพ์ว่า ${KEYWORDS.CONSENT_ACCEPT} ได้เลยค่ะ`,
    );
    return true;
  }

  return false;
}
