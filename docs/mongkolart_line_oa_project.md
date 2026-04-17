# MongkolArt — Project Document

Version: Current (updated 2026-04-17) | ราคา 159 บาท | Supabase + LINE OA + OpenAI + Stripe

---

# 1. Concept

LINE OA Chatbot "น้องมงคล" — คุยธรรมชาติเหมือนคนจริง เก็บข้อมูล 5 อย่าง → จ่าย Stripe 159 บาท → ได้รูปมงคล AI + คำทำนาย + คาถา อัตโนมัติ ไม่มี admin

# 2. Architecture & Tech Stack

| Component | Technology |
| :---- | :---- |
| Runtime | Supabase Edge Functions (Deno/TypeScript) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (รูป PNG, bucket: `images`, public) |
| Chatbot AI | gpt-5.4-mini via Responses API (conversation + extract ข้อมูล) |
| Image AI | gpt-image-1 (1024x1792 portrait, quality from env) |
| Fortune AI | gpt-5.4-mini via Responses API |
| Payment | Stripe Checkout (allow_promotion_codes: true) |
| Messaging | LINE Messaging API |

# 3. User Flow

## 3.1 Main Flow

1. user ทักครั้งแรก → เช็ค user_consents → ยังไม่ยอมรับ PDPA
2. ส่ง consent message + ปุ่ม [ยอมรับ] [ดูนโยบาย]
3. user กด "ยอมรับ" → บันทึก user_consents (ครั้งเดียวตลอดไป)
4. คุยอิสระกับน้องมงคล (gpt-5.4-mini + conversation history)
5. GPT extract ข้อมูล: full_name, birthdate, wish, deity, color
6. เมื่อครบ 5 อย่าง → bot สรุป + ขอ confirm
7. user confirm → bot ส่ง Stripe Payment Link (159 บาท)
8. Stripe webhook → trigger generate อัตโนมัติ (background)
9. gpt-5.4-mini แนะนำเทพ (ถ้าไม่ได้เลือก) + สร้างคำทำนาย JSON → gpt-image-1 สร้างรูปจาก template โดยตรง
10. upload รูปไป Supabase Storage → ส่งรูป + คำทำนาย + คาถา + เลขมงคล กลับ LINE

## 3.2 Order Status Flow

| Status | Description |
| :---- | :---- |
| pending | รอการชำระเงิน |
| paid | จ่ายแล้ว รอ generate |
| generating | กำลังสร้างรูปและคำทำนาย |
| done | เสร็จสมบูรณ์ ส่ง LINE แล้ว |
| failed | ล้มเหลว (retry max 5 ครั้ง) |

## 3.3 Session Step

| Step | Description |
| :---- | :---- |
| 0 | Session created, ยังไม่มีการคุย |
| 1–6 | กำลังคุยกับน้องมงคล (GPT ควบคุม) |
| 7 | รอ Stripe webhook (user จ่ายแล้ว) |
| 8 | Done — ส่งรูปและคำทำนายแล้ว |

# 4. Scenarios & Solutions

## 4.1 ระหว่างคุย

| Scenario | Solution |
| :---- | :---- |
| user ออกนอกเรื่อง | ดู Off-topic Escalation Flow |
| user ถามเรื่องที่ไม่รู้ | บอกตรงๆ สั้นๆ แล้วนำกลับ |
| user พูดวันเกิดไม่ชัด | GPT แปลงให้ ถามยืนยัน |
| ส่งไฟล์ / sticker | ตอบสั้นๆ คุยต่อ |
| พิมพ์ภาษาอังกฤษ | ตอบภาษาไทยเท่านั้น |

## 4.2 Off-topic Escalation Flow

user อาจพิมพ์เรื่องไม่เกี่ยวข้องจนเก็บข้อมูลไม่ได้ ใช้ 4 ระดับนี้:

| ครั้งที่ | ระดับ | วิธีจัดการ |
| :---- | :---- | :---- |
| 1–2 | นุ่มนวล | ตอบสั้นๆ อบอุ่น แล้วนำกลับมาเป็นธรรมชาติ |
| 3–4 | บอกตรงๆ | แจ้งว่าต้องการข้อมูลเพื่อสร้างรูป |
| 5+ | Quick Reply บังคับ | เปลี่ยนเป็น guided mode แสดงปุ่มให้กด |
| 10+ | หยุด | Deactivate session แจ้งให้พิมพ์ "เริ่มใหม่" |

Schema ใน user_sessions:

```
off_topic_count  SMALLINT DEFAULT 0
chat_mode        TEXT DEFAULT 'conversational'  -- conversational | guided
```

## 4.3 Session & Order

| Scenario | Solution |
| :---- | :---- |
| มี active order อยู่ | บล็อกสั่งซ้อน แจ้งสถานะ |
| "เริ่มใหม่" ก่อนจ่าย | Deactivate session เก่า → สร้างใหม่ |
| "เริ่มใหม่" หลังจ่ายแล้ว | บล็อก order กำลังดำเนินการ |
| user block OA | จับ LINE error 410 → mark undeliverable |

## 4.4 Keywords พิเศษ (ทุกเวลา)

| Keyword | Action |
| :---- | :---- |
| สถานะ | แสดงสถานะ order ล่าสุด |
| เริ่มใหม่ | ถามยืนยัน → deactivate |
| ช่วยด้วย / ช่วยเหลือ / help | แสดง menu |
| ดูข้อมูลฉัน | แสดงข้อมูล collected_data ที่เก็บไว้ |
| ลบข้อมูลฉัน | ลบ conversation_history + collected_data ทันที + withdraw consent |

## 4.5 User หายกลางทาง

reminder-check cron ส่ง reminder ตาม inactive_hours (default 2h), max 1 ครั้ง:

| สถานะ | เงื่อนไข | Action |
| :---- | :---- | :---- |
| กำลังคุย (step 0–6, ยังไม่มี order) | inactive > inactive_hours | Reminder (max 1 ครั้ง) |
| reminder ครบแล้ว | ไม่ตอบสนอง | Deactivate (abandoned_reason = 'no_response') |
| รอจ่าย (step 7) | Stripe link หมดอายุ | stripe-webhook ส่ง link ใหม่อัตโนมัติ |

last_reminded_at reset เป็น null ทุกครั้งที่ user ส่งข้อความ

## 4.6 Payment & Generation

| Scenario | Solution |
| :---- | :---- |
| Payment link หมดอายุ | Stripe ยิง checkout.session.expired → ส่ง link ใหม่อัตโนมัติ |
| Generate ล้มเหลว | Auto retry สูงสุด 5 ครั้ง ผ่าน stuck-order-check |
| Order ค้าง generating > 5 นาที | stuck-order-check → retry |
| รูปส่ง LINE ไม่ถึง | Check delivered_at → resend |
| ใช้ promotion code | บันทึก promotion_code + discount_amount ใน orders |

## 4.7 PDPA

| Scenario | Solution |
| :---- | :---- |
| user ทักครั้งแรก | แสดง consent message + ปุ่ม [ยอมรับ] [ดูนโยบาย] |
| ยอมรับแล้ว | เช็คจาก user_consents — ข้ามได้เลย |
| ขอ "ลบข้อมูลฉัน" | ลบ conversation_history + collected_data ทันที + withdraw consent + deactivate session |
| กลับมาหลังลบ | ต้องยอมรับ PDPA ใหม่ |
| Data retention | cleanup-sessions ลบ conversation_history + collected_data ของ session ที่ deactivate แล้ว > 90 วัน |

# 5. Database — 5 Tables

## 5.1 user_consents

| Column | Type / Note |
| :---- | :---- |
| id | SERIAL PRIMARY KEY |
| line_user_id | TEXT UNIQUE NOT NULL |
| display_name | TEXT — บันทึกตอนยอมรับ ไม่ถูกลบแม้ขอลบข้อมูล |
| accepted | BOOLEAN DEFAULT FALSE |
| accepted_at | TIMESTAMPTZ |
| withdrawn | BOOLEAN DEFAULT FALSE |
| withdrawn_at | TIMESTAMPTZ |
| policy_version | TEXT DEFAULT '1.0' |
| created_at / updated_at | TIMESTAMPTZ DEFAULT NOW() |

## 5.2 user_sessions

| Column | Type / Note |
| :---- | :---- |
| id | SERIAL PRIMARY KEY |
| line_user_id | TEXT NOT NULL (INDEX) |
| package_key | TEXT DEFAULT 'wallpaper' — รองรับ multi-product |
| step | SMALLINT DEFAULT 0 (0=ยังไม่คุย, 1–6=คุย, 7=รอStripe, 8=done) |
| is_active | BOOLEAN DEFAULT TRUE |
| collected_data | JSONB DEFAULT '{}' — ข้อมูลจาก conversation (full_name, birthdate, wish, deity_key, color) |
| conversation_history | JSONB DEFAULT [] — เก็บครบ ส่ง GPT แค่ last 20 |
| current_order_no | TEXT |
| reminder_count | SMALLINT DEFAULT 0 |
| last_reminded_at | TIMESTAMPTZ — reset เป็น null เมื่อ user ส่งข้อความ |
| off_topic_count | SMALLINT DEFAULT 0 |
| chat_mode | TEXT DEFAULT 'conversational' — conversational \| guided |
| abandoned_reason | TEXT |
| abandoned_at | TIMESTAMPTZ |
| created_at / updated_at | TIMESTAMPTZ DEFAULT NOW() |

*UNIQUE INDEX: (line_user_id) WHERE is_active = TRUE — active session ได้แค่ 1 ต่อ user*

## 5.3 orders

| Column | Type / Note |
| :---- | :---- |
| id | SERIAL PRIMARY KEY |
| order_no | TEXT UNIQUE NOT NULL |
| line_user_id | TEXT NOT NULL |
| session_id | INTEGER REFERENCES user_sessions(id) |
| package_key | TEXT NOT NULL — 'wallpaper' |
| price_paid | INTEGER (satang) — nullable จนกว่าจะจ่ายจริง |
| promotion_code | TEXT — promotion code ที่ใช้ (ถ้ามี) |
| discount_amount | INTEGER — ส่วนลดในหน่วย satang (ถ้ามี) |
| stripe_session_id | TEXT UNIQUE |
| stripe_payment_id | TEXT |
| generated_content | JSONB — { image_prompt, fortune_text, mantra, mantra_meaning, worship_guide, lucky_colors, lucky_number } |
| image_url | TEXT — URL รูปใน Supabase Storage |
| status | TEXT DEFAULT 'pending' — pending\|paid\|generating\|done\|failed |
| generate_attempts | SMALLINT DEFAULT 0 |
| last_error | TEXT |
| created_at, paid_at, generating_at, completed_at, delivered_at | TIMESTAMPTZ |

## 5.4 prompts

| package_key | prompt_key | ใช้ทำอะไร |
| :---- | :---- | :---- |
| shared | bot_personality | บุคลิกน้องมงคล + extract logic + off-topic rules |
| shared | privacy_policy | ข้อความนโยบาย (ส่งเมื่อ user ขอ) |
| wallpaper | fortune_generation | คำทำนาย + คาถา + วิธีบูชา + เลขมงคล (JSON) |
| wallpaper | image_generation | prompt ภาษาไทยส่งตรงไป gpt-image-1 (ไม่มี AI step กลาง) |
| wallpaper | deity_recommendation | แนะนำเทพ (กรณี user ไม่ได้เลือก) |

*admin แก้ content ใน Supabase Dashboard ได้เลย ไม่ต้อง redeploy*

## 5.5 pricing

| Column | Value |
| :---- | :---- |
| package_key | wallpaper |
| name_th | รูปมงคล AI |
| price | 159 (satang: 15900) |
| stripe_price_id | price_xxx |
| is_active | TRUE |

## 5.6 Cleanup Rules (cleanup-sessions cron)

- **Ghost deactivation**: session ที่ is_active=true, ไม่มี current_order_no, updated_at > ghost_days (default 3 วัน) → deactivate
- **Data retention wipe**: session ที่ is_active=false, updated_at > data_retention_days (default 90 วัน) → ลบ conversation_history + collected_data

# 6. AI Generation Flow (generate-wallpaper)

1. โหลด order + session
2. Lock order (status = generating)
3. แนะนำเทพด้วย gpt-5.4-mini ถ้า user ไม่ได้เลือก
4. สร้างคำทำนาย JSON ด้วย gpt-5.4-mini (fortune_text, mantra, mantra_meaning, worship_guide, lucky_colors, lucky_number)
5. Fill image_generation template โดยตรง (ไม่มี AI step กลาง) — ใส่ collected_data เท่านั้น
6. เรียก gpt-image-1 ด้วย filled prompt → รูป PNG (b64_json)
7. Upload รูปไป Supabase Storage
8. อัปเดต order (generated_content, image_url, status=done) + deactivate session + push LINE พร้อมกัน
9. อัปเดต delivered_at

# 7. File Structure

```
mongkolshop/
├── supabase/
│   ├── functions/
│   │   ├── line-webhook/       # รับ LINE events + chatbot logic
│   │   ├── stripe-webhook/     # payment success/expiry → trigger generate
│   │   ├── generate-wallpaper/ # สร้างรูป + คำทำนาย (background)
│   │   ├── reminder-check/     # remind user หายกลางทาง
│   │   ├── stuck-order-check/  # ตรวจ order ค้าง
│   │   ├── cleanup-sessions/   # deactivate ghost + wipe stale data
│   │   └── _shared/
│   │       ├── types.ts             # TypeScript interfaces
│   │       ├── constants.ts         # BOT_NAME, KEYWORDS
│   │       ├── lineService.ts       # reply / push / quickReply / paymentButton
│   │       ├── configService.ts     # getPrompt / getPricing (cache) / fillPrompt
│   │       ├── checkoutService.ts   # Stripe checkout session creation
│   │       ├── generationRouter.ts  # maps package_key → Edge Function
│   │       ├── ai/
│   │       │   ├── aiService.ts     # IAiService interface
│   │       │   └── impl/
│   │       │       ├── openai.ts    # OpenAIService (gpt-5.4-mini + gpt-image-1)
│   │       │       └── mock.ts      # MockAIService (ทดสอบไม่ต้องใช้ key)
│   │       ├── db/
│   │       │   ├── client.ts        # Supabase client factory
│   │       │   ├── userConsents.ts
│   │       │   ├── userSessions.ts
│   │       │   ├── orders.ts
│   │       │   ├── pricing.ts
│   │       │   ├── prompts.ts
│   │       │   └── storage.ts
│   │       └── products/
│   │           └── wallpaper.ts     # buildWallpaperDeliveryText
│   ├── migrations/
│   │   └── (numbered format: 0000001_action_target.sql)
│   └── config.toml              # Supabase config (cron ตั้งผ่าน Dashboard)
├── scripts/
│   ├── deploy-function.sh       # deploy function(s) to dev or prod
│   └── migrate.sh               # run migrations against dev or prod
└── env/
    ├── .env.example
    ├── .env.dev    (gitignored)
    └── .env.prod   (gitignored)
```

# 8. Cron Schedule (ตั้งผ่าน Supabase Dashboard — ไม่ใช่ config.toml)

| Function | Schedule | Payload |
| :---- | :---- | :---- |
| stuck-order-check | `*/5 * * * *` | `{}` |
| reminder-check | `0 */2 * * *` | `{"inactive_hours": 2}` |
| cleanup-sessions | `0 2 * * *` | `{"ghost_days": 3, "data_retention_days": 90}` |

# 9. Key Implementation Notes

## 9.1 line-webhook/index.ts — Logic หลัก

1. ตรวจ user_consents → ยังไม่ยอมรับ → ส่ง consent message
2. ตรวจ keyword พิเศษ (constants.ts KEYWORDS) → handle ทันที
3. step 7 (รอ Stripe) → แจ้งสถานะเท่านั้น ไม่ส่งไป GPT
4. ส่ง message + last 20 history ไป gpt-5.4-mini
5. รับ { message, extracted, is_complete, is_off_topic } กลับมา
6. merge extracted เข้า collected_data + reset last_reminded_at = null
7. ถ้า is_complete → สร้าง order + ส่ง Stripe payment button
8. บันทึก history + reply user

## 9.2 generate-wallpaper/index.ts — Background Job

1. ดึง order → ตรวจ status=paid
2. Lock order (status=generating, generate_attempts++)
3. ดึง session → sessionToCollectedData
4. ถ้าไม่มี deity_key → เรียก ai.recommendDeity
5. เรียก ai.generateContent → fortune JSON (fortune_text, mantra, mantra_meaning, worship_guide, lucky_colors, lucky_number)
6. fillPrompt(image_generation template, { collected_data }) → imagePrompt (ไม่มี AI step กลาง)
7. เรียก ai.createImage(imagePrompt) → Uint8Array
8. uploadImage → Supabase Storage → imageUrl
9. updateOrder(done) + updateSession(step=8, is_active=false) + pushImageWithText — parallel
10. updateOrder(delivered_at)

## 9.3 OpenAI Service (_shared/ai/impl/openai.ts)

```
CHAT_MODEL = "gpt-5.4-mini" (Responses API)
IMAGE_MODEL = "gpt-image-1"
MAX_RETRIES = 2 (exponential backoff)
TEXT_TIMEOUT_MS = 90s
IMAGE_TIMEOUT_MS = 5min
```

- `chatWithBot` → Responses API, instructions + input array, json_object format
- `generateContent` → Responses API, returns GeneratedContent JSON
- `recommendDeity` → Responses API, returns DeityRecommendation JSON
- `createImage` → images.generate, b64_json response, size/quality from env

Retry logic: selective — retry เฉพาะ status >= 500, 429, network errors (ETIMEDOUT, ECONNRESET)

## 9.4 stuck-order-check — 4 Scenarios

| Scenario | เงื่อนไข | Action |
| :---- | :---- | :---- |
| Stuck generating | status=generating, generating_at < now-5min, attempts < 5 | Re-invoke generate-wallpaper |
| Zombie | status=generating, generating_at < now-5min, attempts >= 5 | Mark failed + notify LINE |
| Abandoned paid | status=paid, paid_at < now-5min | Invoke generate-wallpaper |
| Done not delivered | status=done, delivered_at IS NULL, completed_at < now-5min | Re-push image to LINE + deactivate session |

# 10. Environment Variables

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_OA_URL=
OPENAI_API_KEY=
IMAGE_SIZE=1024x1792
IMAGE_QUALITY=medium         # low | medium | high
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

# 11. Cost per Order (ประมาณ)

| รายการ | ค่าใช้จ่าย |
| :---- | :---- |
| OpenAI chatbot (gpt-5.4-mini) | ~฿1.5 |
| OpenAI generate (gpt-5.4-mini + gpt-image-1) | ~฿4.0 |
| Stripe fee (159 บาท) | ~฿21 |
| รวมต้นทุน | ~฿26.5 |
| รายได้ | ฿159 |
| Gross Margin | ~83% |

# 12. Deity Traditions

Prompt รองรับ 3 ประเพณี (GPT อาจแนะนำนอกรายการนี้ได้):

- **พราหมณ์ฮินดู**: พระพิฆเนศ, พระแม่ลักษมี, พระพรหม, พระวิษณุ, พระศิวะ, พระแม่กาลี, พระแม่ทุรคา, พระแม่สรัสวดี, ท้าวเวสสุวรรณ, พระราหู, หนุมาน
- **จีน**: เจ้าแม่กวนอิม, ไฉ่สิ้งเอี้ย, กวนอู, เจ้าแม่ทับทิม, ตี่จู้เอี้ย, พระสังกัจจาย, ง็อกอ๊วง, เทพนาจา, เจ้าพ่อเสือ, ฮกลกซิ่ว
- **ไทย**: พระภูมิเจ้าที่, แม่ย่านาง, นางกวัก, พระแม่ธรณี, พระแม่คงคา, พ่อปู่ฤๅษีชีวก, พ่อปู่ศรีสุทโธ (พญานาค), เจ้าพ่อหลักเมือง

output ทุกอย่างรวมถึง mantra ต้องเป็นภาษาไทย (phonetic transliteration สำหรับ script ที่ไม่ใช่ไทย)

# 13. Stripe

## Stripe Checkout

- Payment Link สร้างด้วย `createCheckoutSession` (allow_promotion_codes: true)
- Link หมดอายุ → Stripe ยิง `checkout.session.expired` → stripe-webhook สร้าง link ใหม่ push ไป LINE อัตโนมัติ

## Stripe Test Cards

| บัตร | ผลลัพธ์ |
| :---- | :---- |
| 4242 4242 4242 4242 | สำเร็จทุกครั้ง |
| 4000 0000 0000 0002 | ถูก decline |
| 4000 0025 0000 3155 | ต้องผ่าน 3D Secure |

Expiry / CVC: ใส่อะไรก็ได้ที่ valid format เช่น 12/28 / 123

## LINE OA

- @652hgnwz (prod)
- Webhook URL: `https://<project-ref>.supabase.co/functions/v1/line-webhook`

---

*MongkolArt — Project Document (updated 2026-04-17)*
