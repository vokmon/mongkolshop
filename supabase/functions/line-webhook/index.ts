import { verifySignature } from "../_shared/lineService.ts"
import { getActiveSession, deactivateSession } from "../_shared/db/userSessions.ts"
import { handleFollow } from "./handlers/follow.ts"
import { handleMessage } from "./handlers/message.ts"

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const signature = req.headers.get("x-line-signature") ?? ""
  const body = await req.text()

  if (!(await verifySignature(body, signature))) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { events } = JSON.parse(body)
  console.log(`📨 Webhook received: ${events.length} event(s)`)
  for (const event of events) {
    try {
      console.log(`🔔 Event: ${event.type} | user: ${event.source?.userId}`)
      await handleEvent(event)
    } catch (err) {
      console.error(`❌ Unhandled error for event [${event.type}]:`, err)
    }
  }

  return new Response("OK", { status: 200 })
})

async function handleEvent(event: LineEvent): Promise<void> {
  if (event.type === "follow") {
    await handleFollow(event.replyToken)
    return
  }

  if (event.type === "unfollow") {
    const session = await getActiveSession(event.source.userId)
    if (session) await deactivateSession(session.id, "user_unfollowed")
    return
  }

  if (event.type === "message") {
    const text = event.message.type === "text"
      ? event.message.text
      : `[ผู้ใช้ส่ง ${event.message.type}]`
    await handleMessage(event.source.userId, event.replyToken, text)
    return
  }
}

interface LineEvent {
  type: string
  replyToken: string
  source: { userId: string }
  message: { type: string; text: string }
}
