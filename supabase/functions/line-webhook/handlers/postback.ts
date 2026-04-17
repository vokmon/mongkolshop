import { replyText } from "../../_shared/lineService.ts"
import { getActiveSession, sessionToCollectedData, updateSession } from "../../_shared/db/userSessions.ts"

export async function handlePostback(
  userId: string,
  replyToken: string,
  data: string,
  params: Record<string, string>,
): Promise<void> {
  if (data === "action=select_birthdate" && params?.date) {
    const [year, month, day] = params.date.split("-")
    const birthdate = `${day}/${month}/${year}`

    const session = await getActiveSession(userId)
    if (!session) return

    const collected = sessionToCollectedData(session)
    await updateSession(session.id, {
      collected_data: { ...collected, birthdate },
      last_reminded_at: null,
    })

    await replyText(replyToken, `บันทึกวันเกิด ${birthdate} แล้วค่ะ ✨`)
  }
}
