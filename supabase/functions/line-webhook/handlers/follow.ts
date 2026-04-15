import { getPrompt } from "../../_shared/configService.ts"
import { quickReply, quickReplyItem, replyMessages } from "../../_shared/lineService.ts"

export async function handleFollow(replyToken: string): Promise<void> {
  console.log("👋 New follower — sending privacy policy")
  const privacyPolicy = await getPrompt("privacy_policy")
  await replyMessages(replyToken, [
    {
      type: "text",
      text: "สวัสดีค่ะ ยินดีต้อนรับสู่ Mongkol Shop! 🙏\nก่อนเริ่มต้น ขอให้อ่านนโยบายความเป็นส่วนตัวก่อนนะคะ",
    },
    quickReply(privacyPolicy, [
      quickReplyItem("ยอมรับ ✅", "ยอมรับ"),
      quickReplyItem("ไม่ยอมรับ ❌", "ไม่ยอมรับ"),
    ]),
  ])
}
