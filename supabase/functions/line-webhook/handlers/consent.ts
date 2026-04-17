import { getPrompt } from "../../_shared/configService.ts"
import { getUserProfile, quickReply, quickReplyItem, replyMessages, replyText } from "../../_shared/lineService.ts"
import { upsertConsent } from "../../_shared/db/userConsents.ts"
import { createSession } from "../../_shared/db/userSessions.ts"
import { BOT_NAME, KEYWORDS } from "../../_shared/constants.ts"

export async function handleConsentFlow(userId: string, replyToken: string, text: string): Promise<void> {
  if (text.trim().includes(KEYWORDS.CONSENT_ACCEPT) && !text.trim().includes(KEYWORDS.CONSENT_REJECT)) {
    console.log(`✅ Consent accepted by ${userId}`)
    const profile = await getUserProfile(userId)
    await upsertConsent(userId, true, profile?.displayName ?? null)
    await createSession(userId, profile?.displayName ?? null)
    await replyText(replyToken, `ขอบคุณที่ยอมรับนโยบายค่ะ 🙏 เริ่มต้นได้เลย! ${BOT_NAME}พร้อมช่วยสร้างรูปมงคลให้คุณค่ะ ✨`)
    return
  }

  if (text.trim().includes(KEYWORDS.CONSENT_REJECT)) {
    console.log(`🚫 Consent declined by ${userId}`)
    await upsertConsent(userId, false)
    await replyText(replyToken, `ไม่เป็นไรค่ะ หากเปลี่ยนใจสามารถพิมพ์ว่า ${KEYWORDS.CONSENT_ACCEPT} เพื่อเริ่มใช้บริการได้เลยนะคะ 🙏`)
    return
  }

  console.log(`⏳ Awaiting consent from ${userId} — re-showing privacy policy`)
  const privacyPolicy = await getPrompt("shared", "privacy_policy")
  await replyMessages(replyToken, [
    { type: "text", text: privacyPolicy },
    quickReply("กรุณายืนยันการยอมรับนโยบายก่อนนะคะ 🙏", [
      quickReplyItem(`${KEYWORDS.CONSENT_ACCEPT} ✅`, KEYWORDS.CONSENT_ACCEPT),
      quickReplyItem(`${KEYWORDS.CONSENT_REJECT} ❌`, KEYWORDS.CONSENT_REJECT),
    ]),
  ])
}
