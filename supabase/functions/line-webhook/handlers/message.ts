import { getUserProfile, markAsRead, quickReply, quickReplyItem, replyMessages, replyText } from "../../_shared/lineService.ts"
import { getConsent } from "../../_shared/db/userConsents.ts"
import { createSession, getActiveSession } from "../../_shared/db/userSessions.ts"
import { getAllPricing, getPricing, getSetting } from "../../_shared/configService.ts"
import { getProductKeyByEntryKeyword } from "../../_shared/products/index.ts"
import { logCtx } from "../../_shared/logger.ts"
import { handleConsentFlow } from "./consent.ts"
import { handleSpecialKeyword } from "./keywords.ts"
import { handleAwaitingPayment, handleChat } from "./chat.ts"

export async function handleMessage(userId: string, replyToken: string, text: string): Promise<void> {
  await markAsRead(userId)

  const consent = await getConsent(userId)
  const name = consent?.display_name ?? null

  console.log(`💬 New message received: "${text}"${logCtx({ userId, name })}`)

  if (!consent || !consent.accepted || consent.withdrawn) {
    console.log(`🔒 PDPA consent required — routing to consent flow${logCtx({ userId })}`)
    await handleConsentFlow(userId, replyToken, text)
    return
  }

  let session = await getActiveSession(userId)

  // Check special keywords before session creation — ADMIN works without a session
  if (await handleSpecialKeyword({ userId, replyToken, text, session })) return

  if (!session) {
    const allPricing = await getAllPricing()
    if (allPricing.length === 0) {
      console.error(`❌ No active pricing found${logCtx({ userId })}`)
      await replyText(replyToken, `ขออภัยค่ะ ระบบยังไม่พร้อมใช้งาน กรุณาติดต่อเราผ่าน LINE OA นี้นะคะ 🙏`)
      return
    }

    const packageKey = getProductKeyByEntryKeyword(text, allPricing)
    if (packageKey) {
      console.log(`🆕 Entry keyword matched — creating session${logCtx({ userId, name })} package:${packageKey}`)
      const profile = await getUserProfile(userId)
      session = await createSession(userId, profile?.displayName ?? null, packageKey)
    } else if (allPricing.length === 1) {
      // Only one product — auto-select and continue normally
      const singleKey = allPricing[0].package_key
      console.log(`🆕 Single product — auto-selecting${logCtx({ userId, name })} package:${singleKey}`)
      const profile = await getUserProfile(userId)
      session = await createSession(userId, profile?.displayName ?? null, singleKey)
    } else {
      // Multiple products — show flat list of all keywords as quick replies
      console.log(`🆕 No active session — showing product selection${logCtx({ userId, name })}`)
      const items = allPricing.flatMap((p) =>
        p.entry_keywords.map((kw) => quickReplyItem(kw, kw))
      )
      const botName = await getSetting("bot_name")
      await replyMessages(replyToken, [
        quickReply(`สวัสดีค่ะ ${botName}มีบริการดังนี้ค่ะ เลือกได้เลยนะคะ 😊`, items),
      ])
      return
    }
  } else {
    console.log(`📋 Active session found${logCtx({ userId, name, sessionId: session.id })} status:${session.status}`)
  }

  if (session.status === "awaiting_payment") {
    console.log(`💳 Session awaiting payment — showing reminder${logCtx({ userId, name, orderNo: session.current_order_no })}`)
    await handleAwaitingPayment(replyToken, session)
    return
  }

  if (session.status === "done") {
    console.log(`✅ Session complete — order already delivered${logCtx({ userId, name })}`)
    const pricing = await getPricing(session.package_key)
    await replyText(replyToken, `คุณได้รับ${pricing.name_th}แล้วนะคะ ✨ หากต้องการสั่งใหม่ พิมพ์ว่า เริ่มใหม่ ได้เลยค่ะ`)
    return
  }

  await handleChat(userId, replyToken, text, session)
}

