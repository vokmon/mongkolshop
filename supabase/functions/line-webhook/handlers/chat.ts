import { MockAIService } from "../../_shared/ai/impl/mock.ts";
import {
  fillPrompt,
  getPrompt,
  getPricing,
} from "../../_shared/configService.ts";
import {
  datetimePickerQuickReplyItem,
  paymentButtonMessage,
  quickReply,
  quickReplyItem,
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
import { createOrder, getOrderByOrderNo, updateOrder } from "../../_shared/db/orders.ts";
import { createCheckoutSession, getOrRefreshCheckoutUrl, getPriceAmount } from "../lib/checkout.ts";
import {
  buildGuidedQuickReplies,
  extractedToCollected,
} from "../lib/guided.ts";
import { formatCollectedData } from "../lib/messages.ts";
import { BOT_NAME, KEYWORDS } from "../../_shared/constants.ts";
import type { ChatMessage, UserSession } from "../../_shared/types.ts";

const MAX_CONVERSATION_HISTORY = 40;
const ai = new MockAIService();

export async function handleAwaitingPayment(
  replyToken: string,
  session: UserSession,
): Promise<void> {
  console.log(`💳 Awaiting payment reminder | order: ${session.current_order_no}`)
  if (!session.current_order_no) {
    await replyText(replyToken, "กำลังรอการชำระเงินอยู่นะคะ หากมีปัญหาพิมพ์ว่า เริ่มใหม่ ได้เลยค่ะ")
    return
  }

  const order = await getOrderByOrderNo(session.current_order_no)
  if (!order) {
    await replyText(replyToken, "ไม่พบคำสั่งซื้อนะคะ กรุณาพิมพ์ว่า เริ่มใหม่ เพื่อเริ่มใหม่ได้เลยค่ะ 🙏")
    return
  }

  const pricing = await getPricing(session.package_key)
  if (!pricing.stripe_price_id) {
    console.error("❌ stripe_price_id is not set in pricing table")
    await replyText(replyToken, "ขออภัยค่ะ ระบบชำระเงินยังไม่พร้อม กรุณาติดต่อเราผ่าน LINE OA นี้ได้เลยนะคะ 🙏")
    return
  }

  const [checkoutUrl, priceAmount] = await Promise.all([
    getOrRefreshCheckoutUrl(order, pricing.stripe_price_id),
    getPriceAmount(pricing.stripe_price_id),
  ])
  await replyMessages(replyToken, [
    { type: "text", text: `${BOT_NAME}ยังรอการชำระเงินอยู่นะคะ 🙏 เมื่อชำระเรียบร้อยแล้ว น้องจะสร้างรูปมงคลให้ทันทีเลยค่ะ ✨` },
    paymentButtonMessage(`ชำระเงิน ${priceAmount} บาท เพื่อรับรูปมงคลของคุณค่ะ`, checkoutUrl),
  ])
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

  const systemPrompt = fillPrompt(await getPrompt("wallpaper", "bot_personality"), {
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

  // Build session patch — merge extracted fields into collected_data JSONB
  // Reset last_reminded_at so the 2h reminder cooldown restarts from this message
  const patch: Partial<UserSession> = { last_reminded_at: null };
  const ex = botResponse.extracted;
  const extractedFields = extractedToCollected(ex)
  if (Object.keys(extractedFields).length > 0) {
    patch.collected_data = { ...collected, ...extractedFields }
  }

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
      `ขออภัยค่ะ ${BOT_NAME}ขอจบการสนทนานี้ก่อนนะคะ หากต้องการเริ่มใหม่ พิมพ์ว่า ${KEYWORDS.RESTART} ได้เลยค่ะ 🙏`,
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
    const pricing = await getPricing(session.package_key);
    if (!pricing.stripe_price_id) {
      console.error("❌ stripe_price_id is not set in pricing table")
      await replyText(
        replyToken,
        "ขออภัยค่ะ ระบบชำระเงินยังไม่พร้อม กรุณาติดต่อเราผ่าน LINE OA นี้ได้เลยนะคะ 🙏",
      );
      return;
    }
    const [{ url: checkoutUrl, sessionId: stripeSessionId }, priceAmount] = await Promise.all([
      createCheckoutSession(userId, orderNo, pricing.stripe_price_id),
      getPriceAmount(pricing.stripe_price_id),
    ])

    const order = await createOrder(userId, session.id, orderNo, session.package_key)
    await updateOrder(order.id, { stripe_session_id: stripeSessionId, checkout_url: checkoutUrl })
    await updateSession(session.id, { status: "awaiting_payment", current_order_no: orderNo })
    console.log(`📦 Order created: ${orderNo} | Stripe checkout sent`)

    await replyMessages(replyToken, [
      { type: "text", text: botResponse.message },
      paymentButtonMessage(`ชำระเงิน ${priceAmount} บาท เพื่อรับรูปมงคลของคุณค่ะ`, checkoutUrl),
    ])
    return;
  }

  // Guided mode — append quick reply buttons for missing fields
  if (session.chat_mode === "guided" || patch.chat_mode === "guided") {
    await replyMessages(replyToken, [
      quickReply(botResponse.message, buildGuidedQuickReplies(stillMissing)),
    ]);
  } else if (botResponse.quick_replies?.length) {
    const items = botResponse.quick_replies.flatMap((qr) => {
      if (qr.type === "message") return [quickReplyItem(qr.label, qr.text)]
      if (qr.type === "datetimepicker") return [datetimePickerQuickReplyItem(qr.label, "action=select_birthdate")]
      return []  // unknown type — skip silently
    })
    if (items.length > 0) {
      await replyMessages(replyToken, [quickReply(botResponse.message, items)])
    } else {
      await replyText(replyToken, botResponse.message)
    }
  } else {
    await replyText(replyToken, botResponse.message);
  }
}
