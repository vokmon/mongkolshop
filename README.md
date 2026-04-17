# MongkolArt — น้องมงคล LINE OA Chatbot

LINE OA Chatbot ที่สนทนากับผู้ใช้เป็นธรรมชาติ เก็บข้อมูล 7 อย่าง → รับชำระเงิน 159 บาทผ่าน Stripe → สร้างรูปมงคลเฉพาะบุคคลด้วย gpt-image-1 → ส่งกลับทาง LINE อัตโนมัติ

## Tech Stack

- **Runtime:** Supabase Edge Functions (Deno/TypeScript)
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (bucket: `images`, public)
- **AI:** OpenAI gpt-5.4-mini (chatbot + fortune) + gpt-image-1 (image generation)
- **Payment:** Stripe Checkout (รองรับ PromptPay + บัตร + โค้ดส่วนลด)
- **Messaging:** LINE Messaging API

## Prerequisites

- [Bun](https://bun.sh) — ใช้ `bunx supabase` แทน global Supabase CLI
- Supabase account + 2 projects (dev + prod)
- LINE Developer account + 2 OA channels (dev + prod)
- OpenAI account (gpt-5.4-mini + gpt-image-1 access)
- Stripe account

## Project Structure

```
supabase/
  functions/
    line-webhook/         # รับ LINE events + chatbot logic
    stripe-webhook/       # รับ payment success/expiry → trigger generate-wallpaper
    generate-wallpaper/   # Background job: สร้างรูปมงคล + ส่ง LINE
    reminder-check/       # Cron (ทุก 2h): remind users ที่หายกลางทาง
    stuck-order-check/    # Cron (ทุก 5min): ตรวจ order ค้าง + redeliver
    cleanup-sessions/     # Cron (02:00 ทุกวัน): ล้าง ghost sessions
    _shared/              # Shared services (types, DB, LINE, AI, router)
  migrations/             # SQL migration files
  config.toml             # Supabase config
scripts/
  deploy-function.sh      # Deploy Edge Function(s) + push secrets
  migrate.sh              # รัน migrations ขึ้น dev/prod
env/
  .env.example            # Template สำหรับ app secrets
  .supabase.example       # Template สำหรับ CLI credentials
  .env.dev                # App secrets (gitignored)
  .env.prod               # App secrets (gitignored)
  .supabase.dev           # CLI credentials (gitignored)
  .supabase.prod          # CLI credentials (gitignored)
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
SUPABASE_URL=               # https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=  # Supabase dashboard → Settings → API → service_role

LINE_CHANNEL_ACCESS_TOKEN=  # LINE Developers → Messaging API → Channel access token
LINE_CHANNEL_SECRET=        # LINE Developers → Basic Settings → Channel secret
LINE_OA_URL=                # LINE OA URL for redirect after payment

OPENAI_API_KEY=             # platform.openai.com → API keys

STRIPE_SECRET_KEY=          # Stripe dashboard → Developers → API keys
STRIPE_WEBHOOK_SECRET=      # Stripe dashboard → Developers → Webhooks → Signing secret
```

### 4. สร้าง Storage bucket

ใน Supabase dashboard → Storage → สร้าง bucket ชื่อ `images` ตั้งค่าเป็น **public**

### 5. รัน migrations

```bash
./scripts/migrate.sh dev
```

### 6. อัปเดต Stripe price ID ใน database

หลังสร้าง product ใน Stripe แล้ว ให้ update `stripe_price_id` ใน `pricing` table ผ่าน Supabase dashboard

### 7. Deploy Edge Functions

```bash
./scripts/deploy-function.sh dev all
```

### 8. ตั้งค่า Webhook URLs

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

Events: `checkout.session.completed`, `checkout.session.expired`

### 9. ตั้งค่า Cron Jobs

ใน Supabase dashboard → Database → Cron Jobs → Add job:

| Name                | Schedule      | Body                    |
| ------------------- | ------------- | ----------------------- |
| `stuck-order-check` | `*/5 * * * *` | `{"inactive_hours": 2}` |
| `reminder-check`    | `0 */2 * * *` | `{"inactive_hours": 2}` |
| `cleanup-sessions`  | `0 2 * * *`   | `{"ghost_days": 3}`     |

SQL สำหรับแต่ละ job:

```sql
select net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/<function-name>',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
  ),
  body := '<body>'::jsonb
)
```

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
# Deploy function เดียว
./scripts/deploy-function.sh dev <function-name>

# Deploy ทุก function
./scripts/deploy-function.sh dev all

# Prod (ต้องพิมพ์ YES ยืนยัน)
./scripts/deploy-function.sh prod all
```

`deploy-function.sh` จะ deploy function และ push secrets จาก env file ให้อัตโนมัติ

### Migration naming convention

```
{running_number}_{action}_{target}.sql
```

ตัวอย่าง: `0000009_add_package_key_to_orders.sql`

**ห้ามแก้ไข migration file เก่า** — ให้สร้างไฟล์ใหม่เสมอ

## Environments

|          | Dev                    | Prod                   |
| -------- | ---------------------- | ---------------------- |
| Supabase | Dev project            | Prod project           |
| LINE OA  | Dev channel            | @652hgnwz              |
| Stripe   | Test mode (`sk_test_`) | Live mode (`sk_live_`) |

การทดสอบทำโดย deploy ขึ้น dev environment โดยตรง ไม่มี local Supabase
