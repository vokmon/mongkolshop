# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MongkolArt — "น้องมงคล" LINE OA Chatbot**

A LINE OA chatbot that collects 5 fields from users via natural conversation (GPT-4o), takes a 159 THB payment via Stripe, then generates a personalized sacred art wallpaper (GPT-4o + DALL-E 3) and delivers it via LINE push message. No frontend — everything runs as Supabase Edge Functions (Deno/TypeScript).

LINE OA channel: `@652hgnwz`

## Tech Stack

- **Runtime:** Supabase Edge Functions (Deno/TypeScript)
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (generated PNG images, organized by user_id)
- **AI:** OpenAI GPT-4o (chatbot + image prompt + fortune), DALL-E 3 (1024×1792 HD)
- **Payment:** Stripe Checkout (159 THB, supports PromptPay + cards)
- **Messaging:** LINE Messaging API

## Commands

All Supabase commands use `bunx supabase` (not a global CLI install).

```bash
# Create a new migration file
bunx supabase migration new <name>

# Deploy to dev environment
./scripts/deploy-dev.sh

# Deploy to production (requires typing "YES" to confirm)
./scripts/deploy-prod.sh
```

## Project Structure

```
supabase/
  functions/
    line-webhook/     # Main LINE event handler — entry point for all LINE messages
    stripe-webhook/   # Handles payment success → triggers generate-image
    generate-image/   # Background job: GPT-4o → DALL-E 3 → Storage → LINE push
    reminder-check/   # Cron (every 1h): remind users who abandoned mid-flow
    stuck-order-check/ # Cron (every 5min): detect orders stuck in "generating"
    cleanup-sessions/ # Cron (02:00 daily): archive history, delete ghost sessions
    _shared/
      types.ts        # TypeScript interfaces for all DB tables and GPT responses
      lineService.ts  # LINE reply/push/quickReply helpers
      supabaseService.ts # All DB read/write operations
      configService.ts   # Loads prompts + pricing from DB (with caching)
      openaiService.ts   # chatWithBot(), generateContent(), createImage()
  migrations/
    001_schema.sql    # All table definitions
    002_seed.sql      # Initial prompts + pricing data
  config.toml         # Supabase config + cron schedules
scripts/
  deploy-test.sh
  deploy-prod.sh
docs/                 # Planning documents (read-only reference)
```

## Architecture

### Core Flow
1. LINE sends webhook → `line-webhook/index.ts`
2. Check `user_consents` (PDPA) → if not accepted, send consent message
3. Check special keywords (`สถานะ`, `เริ่มใหม่`, `ช่วยด้วย`, etc.) → handle immediately
4. If `step = 7` (awaiting Stripe payment) → reply status only, skip GPT
5. Send message + last 20 conversation history to GPT-4o with `bot_personality` prompt
6. GPT returns `{ message, extracted, is_complete, is_off_topic }` as JSON
7. Merge extracted fields into `user_sessions`, update `off_topic_count`
8. If `is_complete` → create order in `orders` table → send Stripe payment link via LINE
9. Save to `conversation_history`, reply to user

### Payment → Generation
- Stripe fires `checkout.session.completed` → `stripe-webhook/index.ts`
- Updates `orders.status = 'paid'`, invokes `generate-image` as background task
- `generate-image` pulls order + session data, fetches prompt templates from DB
- Calls GPT-4o to produce image prompt + fortune JSON
- Calls DALL-E 3 → uploads PNG to Supabase Storage → updates order → pushes to LINE

### Database Tables
| Table | Purpose |
|---|---|
| `user_consents` | PDPA — one row per LINE user, tracks acceptance/withdrawal |
| `user_sessions` | Conversation state — step (0–8), extracted fields, history, off_topic_count |
| `orders` | Payment + generation lifecycle — status: pending→paid→generating→done\|failed |
| `prompts` | All AI prompt templates stored in DB (editable without redeploy) |
| `pricing` | Package config — price 159 THB, stripe_price_id |

### Session Steps
- `0–6`: Conversational collection of 5 fields (GPT-controlled)
- `7`: Awaiting Stripe payment
- `8`: Done — image delivered

### Off-topic Escalation
- Count 1–2: soft redirect | 3–4: direct redirect | 5+: guided mode (quick reply buttons) | 10+: deactivate session

## Environment Variables

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
BASE_URL=
```

`.env.local`, `.env.test`, `.env.production` are all gitignored. Only `.env.example` is committed.

## Migration Conventions

- Never edit existing migration files — always create a new one
- Naming: `[timestamp]_[seq]_[action]_[target].sql` (e.g. `20260415_003_add_delivered_at_to_orders.sql`)
- Test locally with `bunx supabase db reset` before pushing to any environment

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
