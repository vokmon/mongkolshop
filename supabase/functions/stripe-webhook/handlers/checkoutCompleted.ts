import Stripe from "npm:stripe";
import { getPricing, getSetting } from "../../_shared/configService.ts";
import { getOrderByOrderNo, updateOrder } from "../../_shared/db/orders.ts";
import { invokeGenerationJob } from "../../_shared/generationRouter.ts";
import { pushText } from "../../_shared/lineService.ts";
import { logCtx } from "../../_shared/logger.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const orderNo = session.metadata?.order_no;
  const lineUserId = session.metadata?.line_user_id;
  if (!orderNo || !lineUserId) {
    console.error("❌ Missing metadata on checkout session:", session.id);
    return;
  }

  console.log(`💳 Payment completed — processing${logCtx({ userId: lineUserId, orderNo })}`);

  const order = await getOrderByOrderNo(orderNo);
  if (!order) {
    console.error(`❌ Order not found: ${orderNo}`);
    return;
  }

  // Idempotency guard — Stripe may deliver the same event more than once
  if (order.status !== "pending") {
    console.log(
      `⚠️ Order already processed — skipping (idempotency)${logCtx({ userId: lineUserId, orderNo })} status:${order.status}`,
    );
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Extract discount info — only present if a promotion code was applied
  const discountAmount = session.total_details?.amount_discount ?? 0;
  let promotionCode: string | null = null;

  if (discountAmount > 0 && session.discounts?.length) {
    try {
      const discount = session.discounts[0];
      if (discount.promotion_code) {
        const promoId =
          typeof discount.promotion_code === "string"
            ? discount.promotion_code
            : discount.promotion_code.id;
        const promo = await stripe.promotionCodes.retrieve(promoId);
        promotionCode = promo.code;
      }
    } catch (err) {
      console.error(
        "⚠️ Failed to extract discount info — continuing without it:",
        err,
      );
    }
  }

  await updateOrder(order.id, {
    status: "paid",
    stripe_session_id: session.id,
    stripe_payment_id: paymentIntentId,
    price_paid: session.amount_subtotal ?? 0,
    paid_at: new Date().toISOString(),
    ...(discountAmount > 0 && {
      promotion_code: promotionCode,
      discount_amount: discountAmount,
    }),
  });

  console.log(`✅ Order marked as paid — invoking generation${logCtx({ userId: lineUserId, orderNo })}`);

  const [pricing, botName] = await Promise.all([
    getPricing(order.package_key),
    getSetting("bot_name"),
  ])
  await pushText(
    lineUserId,
    `ได้รับการชำระเงินแล้วค่ะ ✅ 💳 ${botName}กำลังสร้าง${pricing.name_th}สำหรับคุณอยู่นะคะ ✨ รอสักครู่นะคะ 🙏`,
  );

  // Fire-and-forget — do not await, return 200 to Stripe immediately
  invokeGenerationJob(order);
}
