# MongkolArt — Deploy & Schema Management Guide

(updated 2026-04-17)

---

# 1. ภาพรวม Environment

แบ่งเป็น **2 ระดับ** เท่านั้น — ไม่มี local Supabase

| Environment | วัตถุประสงค์ | Supabase | LINE OA | Stripe |
| :---- | :---- | :---- | :---- | :---- |
| dev | พัฒนาและทดสอบ | cloud dev project | LINE OA dev channel | test mode |
| production | ใช้งานจริง | cloud prod project | @652hgnwz | live mode |

*Supabase และ LINE OA ต้องแยก project จริงๆ — เพราะ webhook URL ตั้งได้แค่อันเดียวต่อ channel*

Service ที่ไม่ต้องแยก (ใช้ account เดิม สลับแค่ key):
- Stripe — ใช้ test key ↔ live key
- OpenAI — ใช้ key เดิมได้เลย

# 2. โครงสร้าง Project

```
mongkolshop/
├── supabase/
│   ├── migrations/
│   │   ├── 20260415_001_schema.sql
│   │   ├── 20260416_001_seed.sql
│   │   └── 0000003_add_package_key.sql   ← format ใหม่ใช้ running number
│   ├── functions/
│   │   ├── line-webhook/
│   │   ├── stripe-webhook/
│   │   ├── generate-wallpaper/
│   │   ├── reminder-check/
│   │   ├── stuck-order-check/
│   │   ├── cleanup-sessions/
│   │   └── _shared/
│   └── config.toml
├── scripts/
│   ├── deploy-function.sh    ← deploy function(s) to dev or prod
│   └── migrate.sh            ← run migrations against dev or prod
└── env/
    ├── .env.example          ← commit อันนี้อย่างเดียว
    ├── .env.dev              ← gitignored
    └── .env.prod             ← gitignored
```

# 3. Environment Variables

## 3.1 env/.env.dev

```
LINE_CHANNEL_ACCESS_TOKEN=test_token_...
LINE_CHANNEL_SECRET=test_secret_...
LINE_OA_URL=https://line.me/R/ti/p/@<dev-channel-id>

OPENAI_API_KEY=sk-...
IMAGE_SIZE=1024x1792
IMAGE_QUALITY=medium

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

## 3.2 env/.env.prod

```
LINE_CHANNEL_ACCESS_TOKEN=prod_token_...
LINE_CHANNEL_SECRET=prod_secret_...
LINE_OA_URL=https://line.me/R/ti/p/@652hgnwz

OPENAI_API_KEY=sk-...
IMAGE_SIZE=1024x1792
IMAGE_QUALITY=medium

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

*ห้าม commit ไฟล์ .env.dev และ .env.prod ขึ้น git เด็ดขาด*

## 3.3 env/.env.example

Template ที่ commit ขึ้น git:

```
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_OA_URL=https://line.me/R/ti/p/@<channel-id>

OPENAI_API_KEY=
IMAGE_SIZE=1024x1792
IMAGE_QUALITY=medium

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Note: SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY Supabase inject ให้อัตโนมัติใน Edge Functions

## 3.4 .gitignore

```
env/.env.dev
env/.env.prod
env/.env.production
```

# 4. Schema Migration

ใช้ Supabase built-in migrations

## 4.1 สร้าง Migration ใหม่

ทุกครั้งที่ต้องการเปลี่ยน schema ให้สร้าง migration file ใหม่เสมอ **ห้ามแก้ไฟล์เก่า**

```bash
bunx supabase migration new <name>
```

## 4.2 Naming Convention

| Pattern | ตัวอย่าง |
| :---- | :---- |
| `{N}_{action}_{target}.sql` | `0000019_add_discount_to_orders.sql` |

ใช้ running number 7 หลัก (0000001, 0000002, ...) ต่อจาก migration ล่าสุดในโปรเจกต์

## 4.3 Deploy Migrations

```bash
./scripts/migrate.sh dev    # push ไป dev
./scripts/migrate.sh prod   # push ไป prod (ต้องพิมพ์ YES ยืนยัน)
```

# 5. Deploy Functions

## 5.1 commands

```bash
# deploy function เดียว
./scripts/deploy-function.sh dev line-webhook

# deploy ทุก function
./scripts/deploy-function.sh dev all

# deploy ไป prod (ต้องพิมพ์ YES)
./scripts/deploy-function.sh prod generate-wallpaper
```

## 5.2 สิ่งที่ script ทำ

1. Load env จาก `env/.env.{dev|prod}`
2. `bunx supabase functions deploy <function> --project-ref $REF --no-verify-jwt`
3. `bunx supabase secrets set --project-ref $REF --env-file env/.env.{dev|prod}`

# 6. Cron Jobs — ตั้งผ่าน Supabase Dashboard เท่านั้น

(config.toml schedule key ไม่รองรับใน CLI version ที่ใช้)

| Function | Schedule | Payload |
| :---- | :---- | :---- |
| stuck-order-check | `*/5 * * * *` | `{}` |
| reminder-check | `0 */2 * * *` | `{"inactive_hours": 2}` |
| cleanup-sessions | `0 2 * * *` | `{"ghost_days": 3, "data_retention_days": 90}` |

# 7. Workflow การพัฒนาและ Deploy

| ขั้นตอน | คำสั่ง | หมายเหตุ |
| :---- | :---- | :---- |
| 1. เขียนโค้ด + migration | `bunx supabase migration new <name>` | สร้างไฟล์ migration ใหม่ |
| 2. Deploy migration ไป dev | `./scripts/migrate.sh dev` | push schema ขึ้น cloud dev |
| 3. Deploy function ไป dev | `./scripts/deploy-function.sh dev <name>` | หรือ `all` |
| 4. ทดสอบบน dev | — | LINE OA dev channel + Stripe test |
| 5. Deploy ขึ้น prod | `./scripts/deploy-function.sh prod <name>` | ต้องพิมพ์ YES |

ไม่มี local Supabase — ทดสอบโดย deploy ไป dev project เสมอ

# 8. Webhook URLs

```
LINE:   https://<project-ref>.supabase.co/functions/v1/line-webhook
Stripe: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

# 9. Checklist ก่อน Deploy Prod

- ทดสอบ happy path บน dev ครบทุก step (consent → chat → payment → generate → delivery)
- ตรวจว่า .env.prod ใช้ `sk_live_` ไม่ใช่ `sk_test_`
- ตรวจว่า LINE_CHANNEL ใน .env.prod เป็น prod OA (@652hgnwz)
- Run migration บน dev ผ่านก่อนเสมอ ก่อน push prod
- ตรวจ Supabase logs ว่าไม่มี error ค้างอยู่
- ตรวจ cron payloads บน Supabase Dashboard ว่า cleanup-sessions มี `data_retention_days: 90`

# 10. Stripe Test Cards

| บัตร | ผลลัพธ์ |
| :---- | :---- |
| 4242 4242 4242 4242 | สำเร็จทุกครั้ง |
| 4000 0000 0000 0002 | ถูก decline |
| 4000 0025 0000 3155 | ต้องผ่าน 3D Secure |

Expiry / CVC: ใส่อะไรก็ได้ที่ valid format เช่น 12/28 / 123

---

*MongkolArt — Deploy Guide (updated 2026-04-17)*
