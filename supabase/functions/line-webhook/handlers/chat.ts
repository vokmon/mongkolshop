import { MockAIService } from "../../_shared/ai/impl/mock.ts";
import {
  fillPrompt,
  getPrompt,
  getPriceAmountByPackageKey,
  getPricing,
  getSetting,
} from "../../_shared/configService.ts";
import {
  paymentButtonMessage,
  quickReply,
  quickReplyItem,
  replyMessages,
  replyText,
  withQuickReply,
} from "../../_shared/lineService.ts"
import { KEYWORDS } from "../../_shared/constants.ts";
import {
  deactivateSession,
  generateOrderNo,
  updateSession,
} from "../../_shared/db/userSessions.ts";
import { createOrder, getOrderByOrderNo, updateOrder } from "../../_shared/db/orders.ts";
import { createCheckoutSession, getOrRefreshCheckoutUrl, getPriceAmount } from "../lib/checkout.ts";
import {
  buildGuidedQuickReplies,
  extractedToCollected,
} from "../lib/guided.ts";
import { getProduct } from "../../_shared/products/index.ts";
import { logCtx } from "../../_shared/logger.ts";
import type { ChatMessage, UserSession } from "../../_shared/types.ts";


const ai = new MockAIService();

export async function handleAwaitingPayment(
  replyToken: string,
  session: UserSession,
): Promise<void> {
  console.log(`💳 Sending payment reminder${logCtx({ userId: session.line_user_id, orderNo: session.current_order_no })}`)
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
  const botName = await getSetting("bot_name")
  const paymentCard = paymentButtonMessage(
    `รอการชำระเงินอยู่นะคะ 🙏 กรุณาชำระ ${priceAmount} บาท เพื่อดำเนินการสร้าง${pricing.name_th}ของคุณได้เลยค่ะ ✨`,
    checkoutUrl,
    priceAmount,
  )

  // Show cancel/restart quick replies only while order is still pending (not yet paid)
  const card = order.status === "pending"
    ? withQuickReply(paymentCard, [
        quickReplyItem(`🔄 ${KEYWORDS.RESTART}`, KEYWORDS.RESTART),
        quickReplyItem(`❌ ${KEYWORDS.CANCEL}`, KEYWORDS.CANCEL),
      ])
    : paymentCard

  await replyMessages(replyToken, [
    { type: "text", text: `${botName}ยังรอการชำระเงินอยู่นะคะ 🙏 เมื่อชำระเรียบร้อยแล้ว ${botName}จะดำเนินการทันทีเลยค่ะ ✨` },
    card,
  ])
}

export async function handleChat(
  userId: string,
  replyToken: string,
  userMessage: string,
  session: UserSession,
): Promise<void> {
  const product = getProduct(session.package_key)
  const collected = product.sessionToCollectedData(session);
  const missing = product.getMissingFields(collected);
  console.log(`🤖 Calling AI — missing fields: [${missing.join(", ") || "none"}]${logCtx({ userId, sessionId: session.id })}`)

  const [botPersonality, price, adminContact] = await Promise.all([
    getPrompt(session.package_key, "bot_personality"),
    getPriceAmountByPackageKey(session.package_key),
    getSetting("admin_contact"),
  ])
  const history = session.conversation_history as ChatMessage[];
  const isPrefilled = history.length === 0 && !!collected.full_name && !!collected.birthdate
  const systemPrompt = fillPrompt(botPersonality, {
    off_topic_count: String(session.off_topic_count),
    current_data: getProduct(session.package_key).formatCollectedData(collected),
    missing_fields: missing.join(", "),
    price: String(price),
    admin_contact: adminContact,
    is_prefilled: isPrefilled ? "true" : "false",
  });

  let botResponse: BotResponse;
  try {
    botResponse = await ai.chatWithBot(systemPrompt, history, userMessage);
    console.log(`✅ AI responded — complete:${botResponse.is_complete} off_topic:${botResponse.is_off_topic}${logCtx({ userId })}`)
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
  const extractedFields = extractedToCollected(ex, session.package_key)
  if (Object.keys(extractedFields).length > 0) {
    patch.collected_data = { ...collected, ...extractedFields }
  }

  // Off-topic tracking
  if (botResponse.is_off_topic) {
    patch.off_topic_count = session.off_topic_count + 1;
    if (patch.off_topic_count >= 9) patch.chat_mode = "guided";
  }

  const currentOffTopicCount = patch.off_topic_count ?? session.off_topic_count;
  if (botResponse.is_off_topic) {
    console.log(`🚨 Off-topic detected${logCtx({ userId })} count:${currentOffTopicCount}${currentOffTopicCount >= 9 ? " — guided mode" : ""}`)
  }
  if (currentOffTopicCount >= 10) {
    console.log(`🛑 Off-topic limit reached — deactivating session${logCtx({ userId })}`)
    await deactivateSession(session.id, "off_topic_limit");
    const botName = await getSetting("bot_name")
    await replyText(
      replyToken,
      `ขออภัยค่ะ ${botName}ขอจบการสนทนานี้ก่อนนะคะ หากต้องการเริ่มใหม่ พิมพ์ว่า ${KEYWORDS.RESTART} ได้เลยค่ะ 🙏`,
    );
    return;
  }

  patch.conversation_history = [
    ...(session.conversation_history as ChatMessage[]),
    { role: "user", content: userMessage },
    { role: "assistant", content: botResponse.message },
  ];

  // Always save history + extracted fields before any branching
  await updateSession(session.id, patch);

  // Complete — verify all fields present server-side before creating order
  const mergedCollected = { ...collected, ...extractedToCollected(ex, session.package_key) }
  const stillMissing = product.getMissingFields(mergedCollected)
  if (botResponse.is_complete && stillMissing.length === 0) {
    console.log(`🎉 All fields collected — creating order${logCtx({ userId, sessionId: session.id })}`)
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

    const order = await createOrder({ lineUserId: userId, sessionId: session.id, orderNo, packageKey: session.package_key })
    await updateOrder(order.id, { stripe_session_id: stripeSessionId, checkout_url: checkoutUrl })
    await updateSession(session.id, { status: "awaiting_payment", current_order_no: orderNo })
    console.log(`📦 Order created — Stripe checkout sent${logCtx({ userId, orderNo })}`)

    await replyMessages(replyToken, [
      { type: "text", text: botResponse.message },
      paymentButtonMessage(`ข้อมูลครบแล้วค่ะ ✨ กรุณาชำระ ${priceAmount} บาท เพื่อเริ่มสร้าง${pricing.name_th}ของคุณได้เลยนะคะ 🙏`, checkoutUrl, priceAmount),
    ])
    return;
  }

  // Guided mode — append quick reply buttons for missing fields
  if (session.chat_mode === "guided" || patch.chat_mode === "guided") {
    await replyMessages(replyToken, [
      quickReply(botResponse.message, buildGuidedQuickReplies(stillMissing, session.package_key)),
    ]);
  } else if (botResponse.quick_replies?.length) {
    const items = botResponse.quick_replies.map((qr) => quickReplyItem(qr.label, qr.text))
    if (items.length > 0) {
      await replyMessages(replyToken, [quickReply(botResponse.message, items)])
    } else {
      await replyText(replyToken, botResponse.message)
    }
  } else {
    await replyText(replyToken, botResponse.message);
  }
}
