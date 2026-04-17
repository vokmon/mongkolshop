import { getUserProfile, markAsRead, replyText } from "../../_shared/lineService.ts"
import { getConsent } from "../../_shared/db/userConsents.ts"
import { createSession, getActiveSession } from "../../_shared/db/userSessions.ts"
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
  if (!session) {
    console.log(`🆕 No active session — creating new${logCtx({ userId, name })}`)
    const profile = await getUserProfile(userId)
    session = await createSession(userId, profile?.displayName ?? null)
  } else {
    console.log(`📋 Active session found${logCtx({ userId, name, sessionId: session.id })} status:${session.status}`)
  }

  if (await handleSpecialKeyword(userId, replyToken, text, session)) return

  if (session.status === "awaiting_payment") {
    console.log(`💳 Session awaiting payment — showing reminder${logCtx({ userId, name, orderNo: session.current_order_no })}`)
    await handleAwaitingPayment(replyToken, session)
    return
  }

  if (session.status === "done") {
    console.log(`✅ Session complete — order already delivered${logCtx({ userId, name })}`)
    await replyText(replyToken, "คุณได้รับรูปมงคลแล้วนะคะ ✨ หากต้องการสั่งใหม่ พิมพ์ว่า เริ่มใหม่ ได้เลยค่ะ")
    return
  }

  await handleChat(userId, replyToken, text, session)
}
