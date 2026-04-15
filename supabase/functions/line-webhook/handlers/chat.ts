import { MockAIService } from "../../_shared/ai/impl/mock.ts";
import {
  fillPrompt,
  getPrompt,
  getPricing,
} from "../../_shared/configService.ts";
import {
  quickReply,
  replyMessages,
  replyText,
} from "../../_shared/lineService.ts";
import {
  deactivateSession,
  generateOrderNo,
  getMissingFields,
  sessionToCollectedData,
  updateSession,
} from "../../_shared/db/userSessions.ts";
import { createOrder } from "../../_shared/db/orders.ts";
import { createCheckoutSession } from "../lib/checkout.ts";
import {
  buildGuidedQuickReplies,
  extractedToCollected,
} from "../lib/guided.ts";
import { formatCollectedData } from "../lib/messages.ts";
import type {
  BotResponse,
  ChatMessage,
  UserSession,
} from "../../_shared/types.ts";

const MAX_CONVERSATION_HISTORY = 40;
const ai = new MockAIService();

export async function handleAwaitingPayment(
  replyToken: string,
  session: UserSession,
): Promise<void> {
  console.log(`💳 Resending payment link | order: ${session.current_order_no}`)
  if (!session.current_order_no) {
    await replyText(
      replyToken,
      "กำลังรอการชำระเงินอยู่นะคะ หากมีปัญหาพิมพ์ว่า เริ่มใหม่ ได้เลยค่ะ",
    );
    return;
  }
  const pricing = await getPricing();
  if (!pricing.stripe_price_id) {
    console.error("❌ stripe_price_id is not set in pricing table")
    await replyText(
      replyToken,
      "ขออภัยค่ะ ระบบชำระเงินยังไม่พร้อม กรุณาติดต่อเราผ่าน LINE OA นี้ได้เลยนะคะ 🙏",
    );
    return;
  }
  const checkoutUrl = await createCheckoutSession(
    session.line_user_id,
    session.current_order_no,
    pricing.stripe_price_id,
  );
  await replyText(
    replyToken,
    `กรุณาชำระเงินผ่านลิงก์นี้ได้เลยค่ะ 💳\n\n${checkoutUrl}`,
  );
}

export async function handleChat(
  userId: string,
  replyToken: string,
  userMessage: string,
  session: UserSession,
): Promise<void> {
  const collected = sessionToCollectedData(session);
  const missing = getMissingFields(collected);
  console.log(`🤖 Calling AI | session: ${session.id} | missing: [${missing.join(", ") || "none"}]`)

  const systemPrompt = fillPrompt(await getPrompt("bot_personality"), {
    off_topic_count: String(session.off_topic_count),
    current_data: formatCollectedData(collected),
    missing_fields: missing.join(", "),
  });

  const history = (session.conversation_history as ChatMessage[]).slice(-20);

  let botResponse: BotResponse;
  try {
    botResponse = await ai.chatWithBot(systemPrompt, history, userMessage);
    console.log(`✅ AI response | is_complete: ${botResponse.is_complete} | is_off_topic: ${botResponse.is_off_topic}`)
  } catch (err) {
    console.error("❌ AI error:", err);
    await replyText(
      replyToken,
      "ขออภัยค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งนะคะ 🙏",
    );
    return;
  }

  // Build session patch
  const patch: Partial<UserSession> = {};
  const ex = botResponse.extracted;
  if (ex.full_name != null) patch.full_name = ex.full_name;
  if (ex.birthdate != null) patch.birthdate = ex.birthdate;
  if (ex.wish != null) patch.wish = ex.wish;
  if (ex.deity != null) {
    patch.deity_key = ex.deity;
    patch.deity_source = "user";
  }
  if (ex.color != null) patch.color = ex.color;

  // Off-topic tracking
  if (botResponse.is_off_topic) {
    patch.off_topic_count = session.off_topic_count + 1;
    if (patch.off_topic_count >= 5) patch.chat_mode = "guided";
  }

  const currentOffTopicCount = patch.off_topic_count ?? session.off_topic_count;
  if (botResponse.is_off_topic) {
    console.log(`🚨 Off-topic count: ${currentOffTopicCount}${currentOffTopicCount >= 5 ? " — guided mode" : ""}`)
  }
  if (currentOffTopicCount >= 10) {
    console.log(`🛑 Off-topic limit reached — deactivating session`)
    await deactivateSession(session.id, "off_topic_limit");
    await replyText(
      replyToken,
      "ขออภัยค่ะ น้องมงคลขอจบการสนทนานี้ก่อนนะคะ หากต้องการเริ่มใหม่ พิมพ์ว่า เริ่มใหม่ ได้เลยค่ะ 🙏",
    );
    return;
  }

  // Update conversation history — keep last 40 messages in DB (20 sent to GPT)
  patch.conversation_history = [
    ...history,
    { role: "user", content: userMessage },
    { role: "assistant", content: botResponse.message },
  ].slice(-MAX_CONVERSATION_HISTORY);

  // Always save history + extracted fields before any branching
  await updateSession(session.id, patch);

  // Complete — verify all fields present server-side before creating order
  const mergedCollected = { ...collected, ...extractedToCollected(ex) }
  const stillMissing = getMissingFields(mergedCollected)
  if (botResponse.is_complete && stillMissing.length === 0) {
    console.log(`🎉 All fields collected — creating order`)
    const orderNo = generateOrderNo();
    const pricing = await getPricing();
    if (!pricing.stripe_price_id) {
      console.error("❌ stripe_price_id is not set in pricing table")
      await replyText(
        replyToken,
        "ขออภัยค่ะ ระบบชำระเงินยังไม่พร้อม กรุณาติดต่อเราผ่าน LINE OA นี้ได้เลยนะคะ 🙏",
      );
      return;
    }
    const checkoutUrl = await createCheckoutSession(
      userId,
      orderNo,
      pricing.stripe_price_id,
    );

    await createOrder(userId, session.id, orderNo);
    await updateSession(session.id, { step: 7, current_order_no: orderNo });
    console.log(`📦 Order created: ${orderNo} | Stripe checkout sent`)

    await replyMessages(replyToken, [
      { type: "text", text: botResponse.message },
      {
        type: "text",
        text: `ชำระเงิน ${pricing.price} บาท เพื่อรับรูปมงคลของคุณได้เลยค่ะ 💳\n\n${checkoutUrl}`,
      },
    ]);
    return;
  }

  // Guided mode — append quick reply buttons for missing fields
  const updatedMissing = stillMissing;
  if (session.chat_mode === "guided" || patch.chat_mode === "guided") {
    await replyMessages(replyToken, [
      quickReply(botResponse.message, buildGuidedQuickReplies(updatedMissing)),
    ]);
  } else {
    await replyText(replyToken, botResponse.message);
  }
}
