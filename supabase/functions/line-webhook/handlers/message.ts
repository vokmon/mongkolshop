import { getUserProfile, markAsRead, replyText } from "../../_shared/lineService.ts"
import { getConsent } from "../../_shared/db/userConsents.ts"
import { createSession, getActiveSession } from "../../_shared/db/userSessions.ts"
import { handleConsentFlow } from "./consent.ts"
import { handleSpecialKeyword } from "./keywords.ts"
import { handleAwaitingPayment, handleChat } from "./chat.ts"

export async function handleMessage(userId: string, replyToken: string, text: string): Promise<void> {
  console.log(`💬 Message from ${userId}: "${text}"`)
  await markAsRead(userId)

  const consent = await getConsent(userId)

  if (!consent || !consent.accepted || consent.withdrawn) {
    console.log(`🔒 No consent — routing to consent flow`)
    await handleConsentFlow(userId, replyToken, text)
    return
  }

  let session = await getActiveSession(userId)
  if (!session) {
    console.log(`🆕 No active session — creating new session`)
    const profile = await getUserProfile(userId)
    session = await createSession(userId, profile?.displayName ?? null)
  } else {
    console.log(`📋 Active session found: id=${session.id} step=${session.step}`)
  }

  if (await handleSpecialKeyword(userId, replyToken, text, session)) return

  if (session.step === 7) {
    console.log(`💳 Step 7 — awaiting payment`)
    await handleAwaitingPayment(replyToken, session)
    return
  }

  if (session.step === 8) {
    console.log(`✅ Step 8 — order already done`)
    await replyText(replyToken, "คุณได้รับรูปมงคลแล้วนะคะ ✨ หากต้องการสั่งใหม่ พิมพ์ว่า เริ่มใหม่ ได้เลยค่ะ")
    return
  }

  await handleChat(userId, replyToken, text, session)
}
