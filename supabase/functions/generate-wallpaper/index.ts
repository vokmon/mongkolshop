import { MockAIService } from "../_shared/ai/impl/mock.ts";
import { fillPrompt, getPrompt } from "../_shared/configService.ts";
import { getOrderByOrderNo, updateOrder } from "../_shared/db/orders.ts";
import { uploadImage } from "../_shared/db/storage.ts";
import {
  getSessionById,
  updateSession,
} from "../_shared/db/userSessions.ts";
import { pushImageWithText, pushText } from "../_shared/lineService.ts";
import { getProduct } from "../_shared/products/index.ts";
import { logCtx } from "../_shared/logger.ts";
import type { WallpaperGeneratedContent } from "../_shared/types.ts"; // used for generatedContent shape

const MAX_ATTEMPTS = 5;
const ai = new MockAIService();

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: { order_no: string; line_user_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { order_no: orderNo, line_user_id: lineUserId } = body;
  if (!orderNo || !lineUserId) {
    return new Response("Missing order_no or line_user_id", { status: 400 });
  }

  // Run generation in background — return 202 immediately
  EdgeRuntime.waitUntil(
    runGeneration(orderNo, lineUserId).catch((err) => {
      console.error("❌ Unhandled error in background generation:", err);
    }),
  );

  return new Response("Accepted", { status: 202 });
});

async function runGeneration(
  orderNo: string,
  lineUserId: string,
): Promise<void> {
  const ctx = logCtx({ userId: lineUserId, orderNo });
  console.log(`🎨 Starting wallpaper generation${ctx}`);

  // ── 1. Load order ────────────────────────────────────────────
  const order = await getOrderByOrderNo(orderNo);
  if (!order) {
    console.error(`❌ Order not found: ${orderNo}`);
    return;
  }
  if (order.status !== "paid") {
    console.log(`⚠️ Order not in paid status — skipping${ctx} status:${order.status}`);
    return;
  }

  // ── 2+3. Lock order + load session in parallel ───────────────
  const attempt = order.generate_attempts + 1;
  const ctxA = logCtx({ userId: lineUserId, orderNo, attempt });
  const [, session] = await Promise.all([
    updateOrder(order.id, {
      status: "generating",
      generate_attempts: attempt,
      generating_at: new Date().toISOString(),
    }),
    getSessionById(order.session_id),
  ]);

  try {
    if (!session) throw new Error(`Session not found: ${order.session_id}`);

    const product = getProduct(order.package_key);
    const collected = product.sessionToCollectedData(session);
    console.log(
      `📋 Session loaded${ctxA} deity:${collected.deity_key ?? "auto"} color:${collected.color}`,
    );

    // ── 4. Recommend deity if not set ─────────────────────────
    let deityKey = collected.deity_key;
    if (!deityKey) {
      console.log(`🔮 Deity not set — requesting recommendation${ctxA}`);
      const deityPrompt = fillPrompt(await getPrompt(order.package_key, "deity_recommendation"), {
        collected_data: JSON.stringify(collected, null, 2),
      });
      const recommendation = await ai.recommendDeity(deityPrompt);
      deityKey = recommendation.deity;
      console.log(`✨ Deity recommended: ${deityKey}${ctxA}`);
    }

    // ── 5. Generate fortune content ───────────────────────────
    console.log(`📖 Generating fortune content${ctxA}`);
    const collectedWithDeity = { ...collected, deity_key: deityKey };
    const fortunePrompt = fillPrompt(await getPrompt(order.package_key, "fortune_generation"), {
      collected_data: JSON.stringify(collectedWithDeity, null, 2),
    });
    const fortuneContent = await ai.generateContent(fortunePrompt);

    // ── 6. Fill image prompt ──────────────────────────────────
    const imageData = { ...collectedWithDeity, lucky_number: fortuneContent.lucky_number }
    const imagePrompt = fillPrompt(await getPrompt(order.package_key, "image_generation"), {
      collected_data: JSON.stringify(imageData, null, 2),
    });

    // ── 7. Generate image ─────────────────────────────────────
    console.log(`🖼️ Generating image${ctxA}`);
    const imageBytes = await ai.createImage(imagePrompt);

    // ── 8. Upload to Storage ──────────────────────────────────
    console.log(`☁️ Uploading image to storage${ctxA}`);
    const imageUrl = await uploadImage(lineUserId, orderNo, imageBytes);

    // ── 9+10+11. Save content + update session + push to LINE in parallel ──
    console.log(`📲 Delivering result to LINE${ctxA}`);
    const generatedContent: WallpaperGeneratedContent = {
      image_prompt: imagePrompt,
      fortune_text: fortuneContent.fortune_text,
      mantra: fortuneContent.mantra,
      mantra_meaning: fortuneContent.mantra_meaning,
      worship_guide: fortuneContent.worship_guide,
      lucky_colors: fortuneContent.lucky_colors,
      lucky_number: fortuneContent.lucky_number,
    };
    const deliveryText = product.buildDeliveryText(generatedContent);

    await Promise.all([
      updateOrder(order.id, {
        status: "done",
        generated_content: generatedContent,
        image_url: imageUrl,
        completed_at: new Date().toISOString(),
      }),
      updateSession(session.id, { status: "done", is_active: false }),
      pushImageWithText(lineUserId, imageUrl, deliveryText),
    ]);

    await updateOrder(order.id, { delivered_at: new Date().toISOString() });

    console.log(`✅ Generation complete${ctxA}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(
      `❌ Generation failed${ctxA} error: ${errorMessage}`,
    );

    if (attempt >= MAX_ATTEMPTS) {
      // All retries exhausted — mark as failed and notify user
      await updateOrder(order.id, {
        status: "failed",
        last_error: errorMessage,
      });
      await pushText(lineUserId, getProduct(order.package_key).buildGenerationFailedMessage());
      console.log(
        `🛑 All retries exhausted — marking as failed${ctx}`,
      );
    } else {
      // Leave in "generating" — stuck-order-check will retry
      await updateOrder(order.id, { last_error: errorMessage });
      console.log(
        `⏳ Will be retried by stuck-order-check${ctxA}/${MAX_ATTEMPTS}`,
      );
    }
  }
}
