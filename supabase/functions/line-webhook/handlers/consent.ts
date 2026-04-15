import { getPrompt } from "../../_shared/configService.ts"
import { getUserProfile, quickReply, quickReplyItem, replyMessages, replyText } from "../../_shared/lineService.ts"
import { upsertConsent } from "../../_shared/db/userConsents.ts"
import { createSession } from "../../_shared/db/userSessions.ts"

export async function handleConsentFlow(userId: string, replyToken: string, text: string): Promise<void> {
  if (text.trim().includes("ยอมรับ") && !text.trim().includes("ไม่ยอมรับ")) {
    console.log(`✅ Consent accepted by ${userId}`)
    await upsertConsent(userId, true)
    const profile = await getUserProfile(userId)
    await createSession(userId, profile?.displayName ?? null)
    await replyText(replyToken, "ขอบคุณที่ยอมรับนโยบายค่ะ 🙏 เริ่มต้นได้เลย! น้องมงคลพร้อมช่วยสร้างรูปมงคลให้คุณค่ะ ✨")
    return
  }

  if (text.trim().includes("ไม่ยอมรับ")) {
    console.log(`🚫 Consent declined by ${userId}`)
    await upsertConsent(userId, false)
    await replyText(replyToken, "ไม่เป็นไรค่ะ หากเปลี่ยนใจสามารถพิมพ์ว่า ยอมรับ เพื่อเริ่มใช้บริการได้เลยนะคะ 🙏")
    return
  }

  console.log(`⏳ Awaiting consent from ${userId} — re-showing privacy policy`)
  const privacyPolicy = await getPrompt("privacy_policy")
  await replyMessages(replyToken, [
    { type: "text", text: privacyPolicy },
    quickReply("กรุณายืนยันการยอมรับนโยบายก่อนนะคะ 🙏", [
      quickReplyItem("ยอมรับ ✅", "ยอมรับ"),
      quickReplyItem("ไม่ยอมรับ ❌", "ไม่ยอมรับ"),
    ]),
  ])
}
