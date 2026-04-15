const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET")!
const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!

async function verifySignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return expected === signature
}

async function replyMessage(replyToken: string, text: string): Promise<void> {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  })
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const signature = req.headers.get("x-line-signature") ?? ""
  const body = await req.text()

  if (!(await verifySignature(body, signature))) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { events } = JSON.parse(body)

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text
      console.log("User said:", userMessage)
      await replyMessage(event.replyToken, `คุณพิมพ์ว่า: ${userMessage}`)
    }
  }

  return new Response("OK", { status: 200 })
})
