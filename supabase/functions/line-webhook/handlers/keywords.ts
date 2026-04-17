import { getUserProfile, replyText } from "../../_shared/lineService.ts";
import { upsertConsent } from "../../_shared/db/userConsents.ts";
import {
  createSession,
  deactivateSession,
} from "../../_shared/db/userSessions.ts";
import { getOrderByOrderNo } from "../../_shared/db/orders.ts";
import {
  buildHelpMessage,
  buildMyDataMessage,
  buildStatusMessage,
} from "../lib/messages.ts";
import { BOT_NAME, KEYWORDS } from "../../_shared/constants.ts";
import type { UserSession } from "../../_shared/types.ts";

export async function handleSpecialKeyword(
  userId: string,
  replyToken: string,
  text: string,
  session: UserSession,
): Promise<boolean> {
  const t = text.trim();

  if (t === KEYWORDS.STATUS) {
    console.log(`📋 Keyword: ${KEYWORDS.STATUS} | user: ${userId}`);
    await replyText(replyToken, buildStatusMessage(session));
    return true;
  }

  if (t === KEYWORDS.RESTART) {
    console.log(`🔄 Keyword: ${KEYWORDS.RESTART} | user: ${userId}`);
    if (session.current_order_no) {
      const order = await getOrderByOrderNo(session.current_order_no);
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(
          `⏳ Reset blocked — order ${order.order_no} is ${order.status}`,
        );
        await replyText(
          replyToken,
          "รูปมงคลของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอสักครู่ แล้วจะส่งให้ทาง LINE นี้เลยค่ะ 🙏",
        );
        return true;
      }
    }
    await deactivateSession(session.id, "user_reset");
    const profile = await getUserProfile(userId);
    await createSession(userId, profile?.displayName ?? null);
    await replyText(
      replyToken,
      `เริ่มต้นใหม่แล้วค่ะ ✨ ${BOT_NAME}พร้อมช่วยสร้างรูปมงคลให้คุณใหม่เลยนะคะ`,
    );
    return true;
  }

  if (KEYWORDS.HELP.includes(t.trim().toLowerCase())) {
    console.log(`❓ Keyword: ${KEYWORDS.HELP[0]} | user: ${userId}`);
    await replyText(replyToken, buildHelpMessage());
    return true;
  }

  if (t === KEYWORDS.VIEW_DATA) {
    console.log(`👤 Keyword: ${KEYWORDS.VIEW_DATA} | user: ${userId}`);
    await replyText(replyToken, buildMyDataMessage(session));
    return true;
  }

  if (t === KEYWORDS.DELETE_DATA) {
    console.log(`🗑️ Keyword: ${KEYWORDS.DELETE_DATA} | user: ${userId}`);
    if (session.current_order_no) {
      const order = await getOrderByOrderNo(session.current_order_no);
      if (order && (order.status === "paid" || order.status === "generating")) {
        console.log(
          `⏳ Deletion blocked — order ${order.order_no} is ${order.status}`,
        );
        await replyText(
          replyToken,
          "รูปมงคลของคุณกำลังถูกสร้างอยู่นะคะ ✨ กรุณารอรับรูปก่อน แล้วค่อยลบข้อมูลได้เลยนะคะ 🙏",
        );
        return true;
      }
    }
    await deactivateSession(session.id, "user_data_deletion");
    await upsertConsent(userId, false);
    await replyText(
      replyToken,
      `ลบข้อมูลของคุณเรียบร้อยแล้วค่ะ 🙏 หากต้องการใช้บริการใหม่ พิมพ์ว่า ${KEYWORDS.CONSENT_ACCEPT} ได้เลยค่ะ`,
    );
    return true;
  }

  return false;
}
