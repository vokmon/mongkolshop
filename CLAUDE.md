# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MongkolArt — "น้องมงคล" LINE OA Chatbot**

A LINE OA chatbot that collects fields from users via natural conversation (gpt-5.4-mini), takes payment via Stripe, then generates a personalized sacred art wallpaper (gpt-5.4-mini + gpt-image-1) and delivers it via LINE push message. No frontend — everything runs as Supabase Edge Functions (Deno/TypeScript).

LINE OA channel: `@652hgnwz`

## Tech Stack

- **Runtime:** Supabase Edge Functions (Deno/TypeScript)
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (generated PNG images, bucket: `images`, public)
- **AI:** gpt-5.4-mini via Responses API (chatbot + fortune + deity recommendation), gpt-image-1 (1024×1792 portrait)
- **Payment:** Stripe Checkout (supports PromptPay + cards, promotion codes enabled)
- **Messaging:** LINE Messaging API

## Commands

All Supabase commands use `bunx supabase` (not a global CLI install).

```bash
# Create a new migration file
bunx supabase migration new <name>

# Deploy a single function to dev
./scripts/deploy-function.sh dev <function-name>

# Deploy all functions to dev
./scripts/deploy-function.sh dev all

# Deploy to production (requires typing "YES" to confirm)
./scripts/deploy-function.sh prod <function-name>
```

## Project Structure

```
supabase/
  functions/
    line-webhook/       # Main LINE event handler — entry point for all LINE messages
    stripe-webhook/     # Handles payment success/expiry → triggers generate-wallpaper
    generate-wallpaper/ # Background job: GPT-4o → DALL-E 3 → Storage → LINE push
    reminder-check/     # Cron (every 2h): remind users who abandoned mid-flow
    stuck-order-check/  # Cron (every 5min): retry stuck/zombie orders, redeliver undelivered
    cleanup-sessions/   # Cron (02:00 daily): deactivate ghost sessions
    _shared/
      types.ts             # TypeScript interfaces — DB tables, GPT responses, product-specific data types
      lineService.ts       # LINE reply/push/quickReply/paymentButtonMessage(text, url, priceAmount) helpers
      configService.ts     # Loads prompts + pricing + settings from DB; getPrompt(), getSetting(key), getAllPricing() — all cached at instance level
      checkoutService.ts   # Stripe checkout session creation (allow_promotion_codes: true)
      generationRouter.ts  # Maps package_key → Edge Function name, fire-and-forget invoker
      ai/
        aiService.ts       # IAiService interface
        impl/
          openai.ts        # OpenAIService (gpt-5.4-mini Responses API + gpt-image-1)
          mock.ts          # MockAIService for testing without OpenAI key
      db/
        client.ts          # Supabase client factory
        userConsents.ts    # upsertConsent(lineUserId, accepted, displayName?)
        userSessions.ts    # getActiveSession, createSession(lineUserId, displayName, packageKey), updateSession, getSessionsForReminder, getGhostSessions
        orders.ts          # createOrder({lineUserId,sessionId,orderNo,packageKey}), updateOrder, getStuckGeneratingOrders, getAbandonedPaidOrders, getUndeliveredOrders
        pricing.ts         # getActivePricingByKey(packageKey), getAllActivePricing()
        prompts.ts         # getAllPrompts()
        settings.ts        # getAllSettings() — key/value store (bot_name, admin_contact)
        storage.ts         # uploadImage → Supabase Storage
      products/
        index.ts           # ProductModule interface, getProduct(packageKey), getProductKeyByEntryKeyword(text, allPricing)
        wallpaper.ts       # ProductModule default export — all wallpaper-specific logic + deliver(lineUserId, order)
  migrations/
    20260415_001_schema.sql   # All table definitions
    20260416_001_seed.sql     # Initial prompts + pricing data
    0000003_...               # Incremental migrations (format: {N}_{action}_{target}.sql)
  config.toml                 # Supabase config (no cron schedules — set up via Supabase dashboard)
scripts/
  deploy-function.sh    # Deploy Edge Function(s) + push secrets to dev or prod
  migrate.sh            # Run DB migrations against dev or prod
docs/                   # Planning documents (read-only reference)
```

## Architecture

### Core Flow
1. LINE sends webhook → `line-webhook/index.ts`
2. Check `user_consents` (PDPA) → if not accepted, send consent message + save `display_name` (consent acceptance does NOT create a session)
3. Check special keywords (`สถานะ`, `เริ่มใหม่`, `ช่วยด้วย`, `ติดต่อแอดมิน`, etc.) — `ติดต่อแอดมิน` works with or without a session; all others require an active session
4. If no active session → load `getAllPricing()` → match text against `entry_keywords` → create session with matched `package_key`
   - If no match + single product → auto-select
   - If no match + multiple products → show quick-reply menu (flat list of all `entry_keywords` across all products)
5. If `status = 'awaiting_payment'` → reply with payment reminder + refresh link if expired
6. Send message + last 20 conversation history to gpt-5.4-mini with `bot_personality` prompt
7. GPT returns `{ message, extracted, is_complete, is_off_topic }` as JSON
8. Merge extracted fields into `user_sessions.collected_data` JSONB, reset `last_reminded_at = null`
9. If `is_complete` → create order in `orders` table → send Stripe payment button via LINE
10. Save to `conversation_history`, reply to user

### Payment → Generation
- Stripe fires `checkout.session.completed` → `stripe-webhook/index.ts`
- Extracts promotion code + discount amount if applied
- Updates `orders.status = 'paid'`, calls `invokeGenerationJob(order)` from `generationRouter.ts`
- Router maps `order.package_key` → correct Edge Function (`wallpaper` → `generate-wallpaper`)
- `generate-wallpaper` pulls order + session data, fetches prompt templates from DB by `package_key`
- Calls gpt-5.4-mini to recommend deity (if not set) → generate fortune JSON → fill image prompt template
- Calls gpt-image-1 → uploads PNG to Supabase Storage → updates order → pushes to LINE

### Stripe Checkout Expiry
- Stripe fires `checkout.session.expired` → `stripe-webhook/index.ts`
- Auto-regenerates a new checkout link, updates order, pushes new payment button to LINE

### Cron Jobs (set up via Supabase Dashboard)
| Function | Schedule | Payload |
|---|---|---|
| `stuck-order-check` | `*/5 * * * *` | `{}` |
| `reminder-check` | `0 */2 * * *` | `{"inactive_hours": 2}` |
| `cleanup-sessions` | `0 2 * * *` | `{"ghost_days": 3, "data_retention_days": 90}` |

### stuck-order-check Scenarios
| Scenario | Condition | Action |
|---|---|---|
| Stuck generating (retryable) | `status=generating`, `generating_at < now-5min`, `attempts < 5` | Re-invoke `generate-wallpaper` |
| Zombie | `status=generating`, `generating_at < now-5min`, `attempts >= 5` | Mark `failed` + notify LINE |
| Abandoned paid | `status=paid`, `paid_at < now-5min` | Invoke `generate-wallpaper` |
| Done but not delivered | `status=done`, `delivered_at IS NULL`, `completed_at < now-5min` | `product.deliver(lineUserId, order)` — product-specific re-delivery |

### Database Tables
| Table | Purpose |
|---|---|
| `user_consents` | PDPA — one row per LINE user, tracks acceptance/withdrawal, stores `display_name` |
| `user_sessions` | Conversation state — `status` (collecting/awaiting_payment/done), `collected_data` JSONB, history, `package_key`, reminder tracking |
| `orders` | Payment + generation lifecycle — `generated_content` JSONB, `image_url`, `package_key`, `promotion_code`, `discount_amount`, status: pending→paid→generating→done\|failed |
| `prompts` | AI prompt templates — scoped by `package_key` (`shared` or `wallpaper`), unique on `(package_key, prompt_key)` |
| `pricing` | Package config per `package_key` — stripe_price_id, name_th, entry_keywords (text[]) |
| `settings` | App-level key/value config — `bot_name`, `admin_contact`; editable from DB without redeploy |

### Multi-product Design
- `_shared/products/index.ts` — `ProductModule` interface + `getProduct(packageKey)` registry + `getProductKeyByEntryKeyword(text, allPricing)`
- `_shared/products/wallpaper.ts` — implements `ProductModule` as a default export (explicit object, not loose functions)
- `ProductModule` methods: `sessionToCollectedData`, `getMissingFields`, `buildStatusMessage`, `buildMyDataMessage`, `formatCollectedData`, `fieldToThai`, `buildReminderMessage`, `buildSessionEndMessage`, `getFieldLabels`, `extractedToCollected`, `buildDeliveryText`, `buildGenerationFailedMessage`, `deliver(lineUserId, order)`
- `user_sessions.collected_data` — JSONB, cast to product-specific type inside product module
- `orders.generated_content` — JSONB, cast to product-specific type inside product module
- `user_sessions.package_key` + `orders.package_key` — determines which product module, function, pricing, and prompts to use
- `pricing.entry_keywords text[]` — keywords that trigger session creation for this product (stored in DB, no redeploy needed to change)
- `prompts.package_key` — `'shared'` (bot_personality, privacy_policy) or product-specific (`'wallpaper'`)
- `generationRouter.ts` — maps `package_key` to the correct generation Edge Function
- Adding a new product = new `products/<name>.ts` + register in `PRODUCTS` map + new `pricing` row with `entry_keywords` + new prompt rows + new Edge Function + entry in `FUNCTION_MAP`

### Prompt Keys
| package_key | prompt_key | Used by |
|---|---|---|
| `shared` | `bot_personality` | line-webhook |
| `shared` | `privacy_policy` | line-webhook |
| `wallpaper` | `fortune_generation` | generate-wallpaper |
| `wallpaper` | `image_generation` | generate-wallpaper |
| `wallpaper` | `deity_recommendation` | generate-wallpaper |

### Deity Traditions
Prompts support three traditions — examples only, GPT may recommend beyond the list:
- **เทพพราหมณ์ฮินดู**: พระพิฆเนศ, พระแม่ลักษมี, พระพรหม, พระวิษณุ, พระศิวะ, พระแม่กาลี, พระแม่ทุรคา, พระแม่สรัสวดี, ท้าวเวสสุวรรณ, พระราหู, หนุมาน
- **เทพจีน**: เจ้าแม่กวนอิม, ไฉ่สิ้งเอี้ย, กวนอู, เจ้าแม่ทับทิม, ตี่จู้เอี้ย, พระสังกัจจาย, ง็อกอ๊วง, เทพนาจา, เจ้าพ่อเสือ, ฮกลกซิ่ว
- **เทพไทย**: พระภูมิเจ้าที่, แม่ย่านาง, นางกวัก, พระแม่ธรณี, พระแม่คงคา, พ่อปู่ฤๅษีชีวก, พ่อปู่ศรีสุทโธ (พญานาค), เจ้าพ่อหลักเมือง

All output including mantra must be in Thai (phonetic transliteration for non-Thai scripts).

### Session Status
- `collecting`: GPT is collecting data (default)
- `awaiting_payment`: all fields collected, Stripe payment pending
- `done`: image delivered, session deactivated

### Off-topic Escalation
- Count 1–2: soft redirect | 3–4: direct redirect | 5+: guided mode (quick reply buttons) | 10+: deactivate session

### Reminder Flow
- Triggers when `current_order_no IS NULL` (data collection not complete) and inactive for `inactive_hours`
- Max 1 reminder (MAX_REMINDERS = 1), then session deactivated with `abandoned_reason = 'no_response'`
- `last_reminded_at` reset to `null` on every user message (restarts cooldown)

## Environment Variables

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_OA_URL=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
IMAGE_SIZE=1024x1792
IMAGE_QUALITY=medium         # low | medium | high
```

`.env.dev`, `.env.prod` are gitignored. Only `.env.example` is committed.

## Coding Conventions

- **Functions with more than 3 parameters must use an object argument** instead of positional args. Example: `createOrder({ lineUserId, sessionId, orderNo, packageKey })` not `createOrder(lineUserId, sessionId, orderNo, packageKey)`
- **Handler and module implementations use TypeScript class style** — `class FooHandler implements KeywordHandler { ... }` with `export default new FooHandler()`. No plain object literals or factory functions for this pattern.
- `BOT_NAME` is NOT a constant — fetch via `getSetting("bot_name")` from `configService.ts` (cached)
- `admin_contact` message is stored in `settings` table — edit from DB, no redeploy needed

## Migration Conventions

- Never edit existing migration files — always create a new one
- Naming: `{running_number}_{action}_{target}.sql` (e.g. `0000009_add_package_key_to_orders.sql`)
- Run against remote dev: `./scripts/migrate.sh dev`

## Environments

Two environments only — no local Supabase. Testing is done by deploying to dev.

| Env | Supabase | LINE OA | Stripe |
|---|---|---|---|
| dev | cloud dev project | LINE OA dev channel | test keys |
| production | cloud prod project | @652hgnwz | live keys |

Supabase and LINE OA **must** be separate projects per environment (webhook URL can only be set to one endpoint per channel).

## MCP Servers (project-scoped)

Configured in `.mcp.json`:
- **Stripe** — manage products, prices, trigger test webhook events
- **Notion** — business documentation page

Supabase MCP to be added once project refs are confirmed:
```bash
claude mcp add supabase --scope project --transport stdio \
  -- bunx @supabase/mcp-server-supabase@latest \
  --project-ref <REF> --access-token <PAT>
```
