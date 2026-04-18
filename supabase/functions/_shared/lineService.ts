const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply"
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"
const LINE_PROFILE_URL = "https://api.line.me/v2/bot/profile"

function getToken(): string {
  return Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`,
  }
}

// ============================================================
// Signature verification
// ============================================================

export async function verifySignature(body: string, signature: string): Promise<boolean> {
  const secret = Deno.env.get("LINE_CHANNEL_SECRET")!
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return expected === signature
}

// ============================================================
// Reply (uses replyToken — works within 30s of webhook)
// ============================================================

export async function replyText(replyToken: string, text: string): Promise<void> {
  await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  })
}

export async function replyMessages(replyToken: string, messages: LineMessage[]): Promise<void> {
  await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ replyToken, messages }),
  })
}

// ============================================================
// Push (uses userId — works anytime, needs push permission)
// ============================================================

export async function pushText(lineUserId: string, text: string): Promise<void> {
  await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }],
    }),
  })
}

export async function pushMessages(lineUserId: string, messages: LineMessage[]): Promise<void> {
  await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to: lineUserId, messages }),
  })
}

/** Push an image, optionally followed by a text message — counts as one quota hit. */
export async function pushImageWithText(
  lineUserId: string,
  imageUrl: string,
  text?: string,
): Promise<void> {
  const messages: LineMessage[] = [
    { type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl },
    ...(text ? [{ type: "text", text }] : []),
  ]
  await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to: lineUserId, messages }),
  })
}

// ============================================================
// Button template
// ============================================================

/** A card message with a single tappable button that opens a URL. */
export function paymentButtonMessage(text: string, checkoutUrl: string, priceAmount: number | string): LineMessage {
  return {
    type: "template",
    altText: text,
    template: {
      type: "buttons",
      text,
      actions: [
        { type: "uri", label: `💳 ชำระ ${priceAmount} บาท`, uri: checkoutUrl },
      ],
    },
  }
}

// ============================================================
// Quick reply helper
// ============================================================

export function quickReply(text: string, items: QuickReplyItem[]): LineMessage {
  return {
    type: "text",
    text,
    quickReply: { items },
  }
}

export function quickReplyItem(label: string, text: string): QuickReplyItem {
  return {
    type: "action",
    action: { type: "message", label, text },
  }
}


// ============================================================
// Mark as read
// ============================================================

export async function markAsRead(lineUserId: string): Promise<void> {
  await fetch("https://api.line.me/v2/bot/message/markAsRead", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ chat: { type: "user", userId: lineUserId } }),
  })
}

// ============================================================
// Profile
// ============================================================

export async function getUserProfile(lineUserId: string): Promise<{ displayName: string } | null> {
  const res = await fetch(`${LINE_PROFILE_URL}/${lineUserId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  const data = await res.json()
  return { displayName: data.displayName }
}

// ============================================================
// Types
// ============================================================

export interface LineMessage {
  type: string
  text?: string
  altText?: string
  template?: {
    type: string
    text?: string
    actions?: { type: string; label: string; uri?: string; text?: string }[]
  }
  originalContentUrl?: string
  previewImageUrl?: string
  quickReply?: { items: QuickReplyItem[] }
}

export interface QuickReplyItem {
  type: "action"
  action: {
    type: "message"
    label: string
    text: string
  }
}
