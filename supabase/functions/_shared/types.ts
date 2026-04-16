// ============================================================
// Database row types
// ============================================================

export interface UserConsent {
  id: number
  line_user_id: string
  accepted: boolean
  accepted_at: string | null
  withdrawn: boolean
  withdrawn_at: string | null
  policy_version: string
  created_at: string
  updated_at: string
}

export interface UserSession {
  id: number
  line_user_id: string
  display_name: string | null
  step: number
  is_active: boolean

  // Collected fields — stored as JSONB, cast to product-specific type (e.g. WallpaperCollectedData)
  collected_data: Record<string, unknown>

  // Conversation
  conversation_history: ChatMessage[]
  current_order_no: string | null

  // Reminder tracking
  reminder_count: number
  last_reminded_at: string | null

  // Abandonment
  abandoned_reason: string | null
  abandoned_at: string | null

  // Product
  package_key: string

  // Off-topic tracking
  off_topic_count: number
  chat_mode: "conversational" | "guided"

  created_at: string
  updated_at: string
}

export type OrderStatus = "pending" | "paid" | "generating" | "done" | "failed"

export interface Order {
  id: number
  order_no: string
  line_user_id: string
  session_id: number
  price_paid: number

  // Stripe
  stripe_session_id: string | null
  stripe_payment_id: string | null
  checkout_url: string | null

  // Generated content — stored as JSONB, cast to product-specific type (e.g. WallpaperGeneratedContent)
  generated_content: Record<string, unknown> | null
  image_url: string | null

  // Lifecycle
  status: OrderStatus
  generate_attempts: number
  last_error: string | null

  // PDPA
  data_anonymized_at: string | null

  // Timestamps
  created_at: string
  paid_at: string | null
  generating_at: string | null
  completed_at: string | null
  delivered_at: string | null
}

export interface Prompt {
  id: number
  prompt_key: string
  content: string
  created_at: string
  updated_at: string
}

export interface Pricing {
  id: number
  package_key: string
  name_th: string
  price: number
  stripe_price_id: string | null
  is_active: boolean
  created_at: string
}

// ============================================================
// Conversation types
// ============================================================

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

// ============================================================
// GPT response types
// ============================================================

export interface BotResponse {
  message: string
  extracted: {
    full_name?: string | null
    birthdate?: string | null
    wish?: string | null
    deity?: string | null
    color?: string | null
  }
  is_complete: boolean
  is_off_topic: boolean
}

export interface GeneratedContent {
  fortune_text: string
  mantra: string
  mantra_meaning: string
  worship_guide: string
  lucky_colors: string
}

export interface DeityRecommendation {
  deity: string
  reason: string
}

// ============================================================
// Wallpaper product — collected + generated types
// ============================================================

export interface WallpaperCollectedData {
  full_name: string | null
  birthdate: string | null
  wish: string | null
  deity_key: string | null
  deity_source: "auto" | "user" | null
  color: string | null
}

export interface WallpaperGeneratedContent {
  image_prompt: string
  fortune_text: string
  mantra: string
  mantra_meaning: string
  worship_guide: string
  lucky_colors: string
}
