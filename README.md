# MongkolArt — น้องมงคล LINE OA Chatbot

LINE OA Chatbot ที่สนทนากับผู้ใช้เป็นธรรมชาติ เก็บข้อมูล 5 อย่าง → รับชำระเงิน 159 บาทผ่าน Stripe → สร้างรูปมงคล AI เฉพาะบุคคลด้วย DALL-E 3 → ส่งกลับทาง LINE อัตโนมัติ

## Tech Stack

- **Runtime:** Supabase Edge Functions (Deno/TypeScript)
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage
- **AI:** OpenAI GPT-4o + DALL-E 3
- **Payment:** Stripe Checkout
- **Messaging:** LINE Messaging API

## Prerequisites

- [Bun](https://bun.sh) — ใช้ `bunx supabase` แทน global Supabase CLI
- Supabase account + 2 projects (dev + prod)
- LINE Developer account + 2 OA channels (dev + prod)
- OpenAI account (GPT-4o + DALL-E 3 access)
- Stripe account

## Project Structure

```
supabase/
  functions/
    line-webhook/       # รับ LINE events + chatbot logic
    stripe-webhook/     # รับ payment success → trigger generate-image
    generate-image/     # Background job: สร้างรูป + ส่ง LINE
    reminder-check/     # Cron: remind users ที่หายกลางทาง
    stuck-order-check/  # Cron: ตรวจ order ค้าง generating
    cleanup-sessions/   # Cron: archive + ล้าง ghost sessions
    _shared/            # Shared services (types, DB, LINE, OpenAI)
  migrations/           # SQL migration files
  config.toml           # Supabase config + cron schedules
scripts/
  migrate.sh            # รัน migrations ขึ้น dev/prod
  deploy-function.sh    # Deploy Edge Function ขึ้น dev/prod
env/
  .env.example          # Template สำหรับ app secrets
  .supabase.example     # Template สำหรับ CLI credentials
  .env.dev              # App secrets (gitignored)
  .env.prod             # App secrets (gitignored)
  .supabase.dev         # CLI credentials (gitignored)
  .supabase.prod        # CLI credentials (gitignored)
```

## Setup

### 1. Clone และติดตั้ง

```bash
git clone <repo-url>
cd mongkolshop
```

### 2. สร้าง env files

```bash
cp env/.env.example env/.env.dev
cp env/.env.example env/.env.prod
cp env/.supabase.example env/.supabase.dev
cp env/.supabase.example env/.supabase.prod
```

### 3. กรอก env files

**`env/.supabase.dev`** และ **`env/.supabase.prod`**
```
SUPABASE_ACCESS_TOKEN=   # supabase.com → Account → Access Tokens
SUPABASE_PROJECT_REF=    # supabase.com/dashboard/project/<ref>
SUPABASE_DB_URL=         # Supabase dashboard → Settings → Database → URI
```

**`env/.env.dev`** และ **`env/.env.prod`**
```
SUPABASE_URL=            # https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=  # Supabase dashboard → Settings → API → service_role

LINE_CHANNEL_ACCESS_TOKEN=  # LINE Developers → Messaging API → Channel access token
LINE_CHANNEL_SECRET=        # LINE Developers → Basic Settings → Channel secret

OPENAI_API_KEY=          # platform.openai.com → API keys

STRIPE_SECRET_KEY=       # Stripe dashboard → Developers → API keys (sk_test_ / sk_live_)
STRIPE_WEBHOOK_SECRET=   # Stripe dashboard → Developers → Webhooks → Signing secret
```

### 4. รัน migrations

```bash
./scripts/migrate.sh dev
```

### 5. อัปเดต Stripe price ID ใน database

หลังสร้าง product ใน Stripe แล้ว ให้ update `stripe_price_id` ใน `pricing` table ผ่าน Supabase dashboard

### 6. Deploy Edge Functions

```bash
./scripts/deploy-function.sh dev line-webhook
./scripts/deploy-function.sh dev stripe-webhook
```

### 7. ตั้งค่า Webhook URLs

**LINE:** LINE Developers → Messaging API → Webhook URL
```
https://<dev-ref>.supabase.co/functions/v1/line-webhook
```
- เปิด Use webhook ✅
- ปิด Auto-reply messages ❌

**Stripe:** Stripe dashboard → Developers → Webhooks → Add endpoint
```
https://<dev-ref>.supabase.co/functions/v1/stripe-webhook
```
Events: `checkout.session.completed`, `payment_intent.payment_failed`

## Deployment

### Deploy migration

```bash
# Dev
./scripts/migrate.sh dev

# Prod (ต้องพิมพ์ YES ยืนยัน)
./scripts/migrate.sh prod
```

### Deploy Edge Function

```bash
# Dev
./scripts/deploy-function.sh dev <function-name>

# Prod (ต้องพิมพ์ YES ยืนยัน)
./scripts/deploy-function.sh prod <function-name>
```

ตัวอย่าง:
```bash
./scripts/deploy-function.sh dev line-webhook
./scripts/deploy-function.sh prod generate-image
```

`deploy-function.sh` จะ deploy function และ push secrets จาก env file ให้อัตโนมัติ

### Migration naming convention

```
YYYYMMDD_NNN_description.sql
```

ตัวอย่าง: `20260415_001_schema.sql`, `20260416_001_seed.sql`

**ห้ามแก้ไข migration file เก่า** — ให้สร้างไฟล์ใหม่เสมอ

## Environments

| | Dev | Prod |
|---|---|---|
| Supabase | Dev project | Prod project |
| LINE OA | Dev channel | @652hgnwz |
| Stripe | Test mode (`sk_test_`) | Live mode (`sk_live_`) |

การทดสอบทำโดย deploy ขึ้น dev environment โดยตรง ไม่มี local Supabase
