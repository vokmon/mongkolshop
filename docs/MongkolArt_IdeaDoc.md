**MongkolArt**

Idea Document — Original Concept (Historical)

> **หมายเหตุ:** เอกสารนี้คือแนวคิดเริ่มต้นของโปรเจกต์ (Web App + LINE LIFF) ซึ่งได้ pivot ไปเป็น **LINE OA Chatbot** แล้ว
> สถาปัตยกรรมและ flow ปัจจุบันอยู่ในไฟล์ `mongkolart_line_oa_project.docx.md`
> เก็บไฟล์นี้ไว้เป็น reference สำหรับ concept และ item pools เท่านั้น

*Personalized Sacred Art Web App*

*Web → LINE LIFF Mini App*

# **1\. Concept**

แอปสำหรับสร้างรูปมงคลแบบ custom เฉพาะบุคคล — ผู้ใช้ตอบคำถามสั้นๆ 4 ข้อ ระบบวิเคราะห์และแนะนำเทพที่เหมาะสม แล้วสร้างรูปด้วย AI ส่งให้ทันที พร้อมคาถาบูชาเฉพาะองค์

*จุดขาย: รูปที่ ‘ออกแบบเพื่อคุณโดยเฉพาะ’ — ไม่ใช่รูป stock ทั่วไป*

*เช่น เทรดเดอร์คริปโต → พระพิฆเนศถือ Bitcoin \+ กราฟขาขึ้น แทนที่จะถืออาวุธโบราณ*

*Phase 1: Web app → Phase 2: LINE LIFF Mini App (ใช้ codebase เดิม)*

# **2\. User Flow**

*Login ด้วย LINE → ตอบคำถาม 4 ข้อ → ดูสรุป \+ แนะนำเทพ → สร้างรูป → รับรูป \+ คาถา \+ share*

1. Login ด้วย LINE account

2. ตอบคำถาม 4 ข้อ (wizard แบบทีละ step)

3. ระบบแสดงสรุป: เทพที่แนะนำ \+ เหตุผล

4. กด ‘สร้างรูปมงคล’ — loading ขณะ AI กำลังสร้าง

5. รับรูป \+ คาถาบูชา \+ ปุ่ม Download \+ ปุ่ม Share

6. ระบบบันทึก session, รูป, และข้อมูลลงฐานข้อมูล

# **3\. คำถาม 4 ข้อ (Wizard)**

## **Q1 — วันนี้อยากเสริมด้านใด?**

ตัวเลือกปุ่ม — เลือกได้ 1 ข้อ

| ตัวเลือก | หัวข้อ | คำอธิบาย |
| :---- | :---- | :---- |
| การงาน / ธุรกิจ | ความสำเร็จ | เสริมโชคด้านอาชีพ ธุรกิจ โปรเจกต์ใหม่ เลื่อนขั้น |
| โชคลาภ / การเงิน | ทรัพย์สิน | เพิ่มพูนรายได้ โชคลาภ การลงทุน การค้าขาย |
| ความรัก / ครอบครัว | ความสัมพันธ์ | เสริมเสน่ห์ ความรัก ครอบครัวอบอุ่น มิตรภาพ |
| คุ้มครอง / ป้องกัน | ปัดเป่าภัย | ปัดเป่าสิ่งไม่ดี คุ้มครองตัวเอง ครอบครัว และทรัพย์สิน |
| สุขภาพ / พลังงาน | ความแข็งแรง | เสริมสุขภาพกาย-ใจ พลังงานชีวิต ความสมบูรณ์ |
| สติปัญญา / ความคิด | ปัญญา | เสริมไหวพริบ ความคิดสร้างสรรค์ การเรียนรู้ |
| ให้ระบบเลือกให้ ✨ | (auto) | ระบบวิเคราะห์จากข้อมูลทั้งหมดแล้วเลือกสิ่งที่เหมาะที่สุด |

## **Q2 — อาชีพหรือสิ่งที่สำคัญสำหรับคุณ?**

ตัวเลือกปุ่ม preset \+ ช่องพิมพ์เอง — ใช้สร้างสัญลักษณ์เฉพาะในรูป

| อาชีพ / กลุ่ม | ตัวอย่างสัญลักษณ์ที่จะใส่ในรูป (ไม่จำกัด — AI เลือกให้) |
| :---- | :---- |
| เทรดเดอร์ / คริปโต | Bitcoin, Ethereum, gold bars, trading chart ขาขึ้น, laptop, smartphone trading app, candlestick chart |
| แม่ค้าออนไลน์ | กล่องพัสดุ, shopping bag, มือถือ, เหรียญทอง, ร้านออนไลน์, ดาว review, ลูกค้ายิ้ม |
| เจ้าของธุรกิจ | กุญแจทอง, เหรียญ, สัญญา, ตึกสำนักงาน, โต๊ะประชุม, มงกุฎ, เครื่องหมายถูก |
| นักเรียน / นักศึกษา | หนังสือ, หลอดไฟ, ปริญญาบัตร, ปากกา, กระดาน, สูตรคณิตศาสตร์, ดาวทอง |
| แพทย์ / สายสุขภาพ | ไม้เท้าแพทย์, หัวใจ, กากบาทการแพทย์, ยา, หูฟัง, พลังงานสีเขียว, มือรักษา |
| ศิลปิน / Creator | โน้ตดนตรี, แปรงและจานสี, ไมโครโฟน, กล้อง, ฟิล์ม, พู่กัน, แสงสีสร้างสรรค์ |
| นักกีฬา / ฟิตเนส | น้ำหนัก, ถ้วยรางวัล, รองเท้ากีฬา, เปลวไฟพลังงาน, กล้ามเนื้อ, สนาม |
| เกษตรกร / ธรรมชาติ | ต้นไม้, ผลผลิต, ดิน, แสงอาทิตย์, น้ำ, เมล็ดพืช, วัว, ผืนนา |
| ข้าราชการ / รัฐ | ตราสัญลักษณ์, ธง, กฎหมาย, ตาชั่ง, เครื่องแบบ, เอกสารราชการ |
| นักลงทุน / การเงิน | หุ้น, กราฟ, อสังหา, ทองคำ, เงินตรา, ตู้เซฟ, กระเป๋าเงิน |
| พิมพ์เอง (freetext) | ผู้ใช้พิมพ์อาชีพ/สิ่งสำคัญเอง → ระบบ AI แปลงเป็นสัญลักษณ์ให้ |

## **Q3 — มีเทพในใจไหม?**

ถ้าไม่มี → ระบบเลือกให้และแสดงเหตุผล | ถ้ามี → เลือกเทพที่ต้องการได้เลย

*Default ที่แนะนำ: ‘ให้ระบบเลือก’ — ระบบจะแสดง card: ‘แนะนำ \[เทพ\] เพราะ \[เหตุผล\]’ ก่อน proceed*

*ลูกค้าสามารถ override ได้เสมอ — ถ้ามีเทพในใจก็เลือกได้โดยตรง*

| เทพ | ความเชี่ยวชาญ | เหมาะกับ |
| :---- | :---- | :---- |
| ให้ระบบเลือก ✨ | (auto recommend) | ระบบวิเคราะห์จาก Q1+Q2 และแนะนำเทพที่ดีที่สุด |
| พระพิฆเนศ | ความสำเร็จ, อุปสรรค | การงาน ธุรกิจ ความก้าวหน้า สิ่งใหม่ๆ |
| ท้าวเวสสุวรรณ | ทรัพย์สิน, คุ้มครอง | โชคลาภ การเงิน ค้าขาย ป้องกันภัย |
| พระพรหม | ความเมตตา, สรรพสิ่ง | ความรัก ครอบครัว เมตตามหานิยม |
| พระแม่ลักษมี | ความมั่งคั่ง, ความงาม | ความอุดมสมบูรณ์ เงินทอง ความสุข |
| พระศิวะ | พลัง, การเปลี่ยนแปลง | ความแข็งแกร่ง ชัยชนะ เปลี่ยนชีวิต |
| พระวิษณุ | การรักษา, ความสมดุล | สุขภาพ ความมั่นคง การปกป้อง |
| พระแม่กาลี | ความกล้า, ปราบมาร | กำจัดศัตรู ปัดเป่าสิ่งชั่วร้าย พลังหญิง |
| เทพอื่น (พิมพ์เอง) | — | รองรับทุกองค์ที่ผู้ใช้ต้องการ |

## **Q4 — สไตล์รูปที่ชอบ?**

แสดง visual preview card แต่ละสไตล์ให้เห็นความแตกต่างก่อนเลือก

| สไตล์ | ลักษณะ | เหมาะกับ |
| :---- | :---- | :---- |
| ทองบนดำ (Luxury Dark) | พื้นดำ ลายทอง หรูหรา | ความจริงจัง หรูหรา ติดผนังบ้านหรือออฟฟิศ |
| สีสันสดใส (Thai Classic) | สีสดใส ลายไทยดั้งเดิม | บูชาดิจิทัล ใกล้ชิดวัฒนธรรม |
| พาสเทล (Watercolor) | สีอ่อน ละเอียดอ่อน | วอลเปเปอร์มือถือ ดูผ่อนคลาย |
| มินิมอล (Modern Minimal) | เส้นสะอาด พื้นที่ว่าง | ดูทันสมัย เรียบหรู ใช้ได้ทุกที่ |
| จักรวาล (Cosmic/Galaxy) | ดาวดำมืด แสงจักรวาล | ลึกลับ พลังจักรวาล ดูแปลกตา |

# **4\. หน้าผลลัพธ์ (Result)**

หลังจาก AI สร้างรูปเสร็จ — แสดงครบทุกอย่างในหน้าเดียว

## **สิ่งที่แสดงในหน้า Result**

* รูปมงคลที่สร้าง — แสดงใหญ่ พร้อมปุ่ม Download (PNG ความละเอียดสูง)

* Badge เทพ — ชื่อเทพ \+ เหตุผลที่ระบบแนะนำ (ถ้าเลือก auto)

* คาถาบูชา — ข้อความคาถา \+ คำอธิบายวิธีสวดและเวลาที่เหมาะ

* Share Buttons — Facebook, Twitter/X, LINE, Copy Link

* ปุ่ม ‘สร้างรูปใหม่’ — กลับไปเริ่ม wizard ใหม่

## **Share**

* Share link พา user มาที่หน้า result ของตัวเอง (URL unique ต่อ session)

* Share text: ‘ได้รูปมงคล \[เทพ\] custom จาก MongkolArt แล้ว\! ✨ ลองสร้างของคุณได้เลย’

* Platform: Facebook, Twitter/X, LINE, Instagram (save รูปแล้วโพสต์เอง)

# **5\. Features**

## **Authentication**

*Login ด้วย LINE account — ได้ user profile (ชื่อ, รูป, LINE user ID)*

## **Data ที่เก็บ (Supabase PostgreSQL)**

แบ่งเป็น 3 ส่วน:

**Chat Sessions Table**

เก็บทุก session หลังจบการสร้างรูป — ใช้สำหรับ research และพัฒนา feature ใหม่

* LINE user ID และ display name

* คำตอบของผู้ใช้ทุกข้อ (aspect, job, deity, style)

* เทพที่ระบบแนะนำ และ prompt ที่ใช้สร้างรูป

* URL รูปที่สร้าง

* timestamp ของ session

**Image Records Table**

เก็บ metadata ทุกครั้งที่มีการสร้างรูป

* URL รูปใน Storage

* ข้อมูล user (LINE ID)

* เทพที่เลือก (deity ID)

* ด้านที่เสริม, อาชีพ, สไตล์

* timestamp

**Image Storage**

เก็บไฟล์รูป PNG ทุกรูปที่สร้าง (Supabase Storage)

* จัดโฟลเดอร์แยกตาม user ID

* URL สาธารณะสำหรับ share

* เก็บไว้ใช้แสดงในหน้า result และ share link

**Deities Table (Master Data)**

*ข้อมูล Deity, คาถาบูชา, และรูปตัวอย่างเก็บใน database แทนการ hardcode ใน code*

*ง่ายต่อการเพิ่มเทพใหม่, แก้ไขคาถา, หรืออัปเดตรูปตัวอย่างในอนาคต*

* deity\_id, name\_th, name\_en (สำหรับ prompt)

* description, expertise\[\]

* suitable\_aspects\[\] (สำหรับ recommendation logic)

* mantra, mantra\_description, mantra\_time

* example\_image\_url (แสดงใน step 3 ให้ผู้ใช้ดู)

* prompt\_keywords\[\]

# **6\. ตาราง สีมงคลโหราศาสตร์ไทย (Supabase PostgreSQL)**

สีมงคลจากโหราศาสตร์ไทย ใช้สำหรับ: ปรับ color theme รูป, ใส่ใน image generation prompt, แนะนำสีเสื้อผ้า และแสดงข้อมูลเพิ่มเติมในหน้า result

**Table: day\_colors (สีประจำวัน)**

7 rows: อาทิตย์, จันทร์, อังคาร, พุธ, พฤหัส, ศุกร์, เสาร์

| CREATE TABLE day\_colors (   id                SERIAL PRIMARY KEY,   day\_name\_th       VARCHAR(20)  NOT NULL,  \-- 'วันจันทร์'   day\_name\_en       VARCHAR(20)  NOT NULL,  \-- 'Monday' (ใช้ใน prompt เท่านั้น)   day\_number        SMALLINT     NOT NULL UNIQUE,  \-- 0=อาทิตย์ .. 6=เสาร์   planet\_th         VARCHAR(30),            \-- 'พระจันทร์'   planet\_en         VARCHAR(30),            \-- 'Moon' (ใช้ใน prompt เท่านั้น)   lucky\_colors      TEXT,                   \-- 'เหลืองทอง, ครีมนวล'   unlucky\_colors    TEXT,                   \-- 'ดำสนิท, แดงเข้ม'   outfit\_suggestion TEXT,                   \-- 'แนะนำสวมเสื้อโทนเหลืองทอง ครีมนวล'   description       TEXT,   created\_at        TIMESTAMPTZ  DEFAULT NOW() ); |
| :---- |

ตัวอย่างข้อมูล:

| day\_number | day\_name\_th | planet\_th | lucky\_colors | unlucky\_colors |
| :---- | :---- | :---- | :---- | :---- |
| 0 | วันอาทิตย์ | พระอาทิตย์ | แดงเข้ม, เหลืองขมิ้น | น้ำเงินเข้ม, เขียวป่า |
| 1 | วันจันทร์ | พระจันทร์ | เหลืองทอง, ครีมนวล | ดำสนิท, แดงเข้ม |
| 2 | วันอังคาร | พระอังคาร | ชมพูอ่อน, ชมพูฝุ่น | เหลืองซีด, ขาวบริสุทธิ์ |
| 3 | วันพุธ | พระพุธ | เขียวมรกต, เขียวมะนาว | ส้มเปลวไฟ, แดงจัด |
| 4 | วันพฤหัสบดี | พระพฤหัส | ส้มอำพัน, ส้มเผา | ม่วงเข้ม, แดงเลือดนก |
| 5 | วันศุกร์ | พระศุกร์ | ฟ้าใส, เขียวอมฟ้า | ดำสนิท, เทาเข้ม |
| 6 | วันเสาร์ | พระเสาร์ | ม่วงเข้ม, น้ำเงินดึก | ทองอ่อน, ส้มสด |

**Table: month\_colors (สีประจำเดือน)**

12 rows: มกราคม – ธันวาคม

| CREATE TABLE month\_colors (   id                SERIAL PRIMARY KEY,   month\_name\_th     VARCHAR(20)  NOT NULL,  \-- 'มกราคม'   month\_name\_en     VARCHAR(20)  NOT NULL,  \-- 'January' (ใช้ใน prompt เท่านั้น)   month\_number      SMALLINT     NOT NULL UNIQUE,  \-- 1-12   zodiac\_signs      TEXT,                   \-- 'มกร, กุมภ์'   lucky\_colors      TEXT,                   \-- 'เขียวมรกต, เหลืองทอง'   unlucky\_colors    TEXT,   gemstone\_th       VARCHAR(30),            \-- 'มรกต'   gemstone\_en       VARCHAR(30),            \-- 'Emerald' (ใช้ใน prompt เท่านั้น)   outfit\_suggestion TEXT,   description       TEXT,   created\_at        TIMESTAMPTZ  DEFAULT NOW() ); |
| :---- |

**Table: zodiac\_colors (สีตามราศี)**

12 rows: เมษ – มีน

| CREATE TABLE zodiac\_colors (   id                    SERIAL PRIMARY KEY,   zodiac\_name\_th        VARCHAR(20)  NOT NULL,  \-- 'เมษ'   zodiac\_name\_en        VARCHAR(20)  NOT NULL,  \-- 'Aries'   zodiac\_number         SMALLINT     NOT NULL UNIQUE,  \-- 1-12   start\_date            VARCHAR(5)   NOT NULL,  \-- 'MM-DD' เช่น '03-21'   end\_date              VARCHAR(5)   NOT NULL,  \-- '04-19'   ruling\_planet\_th      VARCHAR(30),   ruling\_planet\_en      VARCHAR(30),            \-- ใช้ใน prompt เท่านั้น   element\_th            VARCHAR(10),            \-- 'ไฟ'   element\_en            VARCHAR(10),            \-- 'Fire' (ใช้ใน prompt เท่านั้น)   lucky\_colors          TEXT,                   \-- 'แดงเข้ม, ส้มเปลวไฟ'   unlucky\_colors        TEXT,   lucky\_gemstone\_th     VARCHAR(30),   lucky\_gemstone\_en     VARCHAR(30),            \-- ใช้ใน prompt เท่านั้น   outfit\_suggestion     TEXT,   description           TEXT,   created\_at            TIMESTAMPTZ  DEFAULT NOW() ); |
| :---- |

ตัวอย่างข้อมูล:

| zodiac\_number | zodiac\_name\_th | element\_th | lucky\_colors | ruling\_planet\_th |
| :---- | :---- | :---- | :---- | :---- |
| 1 | เมษ | ไฟ | แดงเข้ม, ส้มเปลวไฟ | อังคาร |
| 2 | พฤษภ | ดิน | เขียวป่าเข้ม, ชมพูฝุ่น | ศุกร์ |
| 3 | เมถุน | ลม | เหลืองทอง, เขียวมะนาว | พุธ |
| 4 | กรกฎ | น้ำ | ขาวงาช้าง, เงินเย็น | จันทร์ |
| 5 | สิงห์ | ไฟ | ทองโบราณ, ส้มอำพัน | อาทิตย์ |
| 6 | กันย์ | ดิน | น้ำตาลดิน, เขียวมะกอก | พุธ |
| 7 | ตุล | ลม | ฟ้าใส, ชมพูอ่อน | ศุกร์ |
| 8 | พิจิก | น้ำ | แดงเข้ม, ดำสนิท | อังคาร |
| 9 | ธนู | ไฟ | ม่วงเข้ม, น้ำเงินราชวงศ์ | พฤหัส |
| 10 | มกร | ดิน | น้ำตาลถ่าน, ดำสนิท | เสาร์ |
| 11 | กุมภ์ | ลม | ฟ้าแป้ง, เทาเย็น | เสาร์/ยูเรนัส |
| 12 | มีน | น้ำ | เขียวมหาสมุทร, ม่วงลาเวนเดอร์ | พฤหัส/เนปจูน |

**การใช้งานสีในแอป MongkolArt**

| Use Case | ดึงจาก Table | Logic |
| :---- | :---- | :---- |
| Color theme รูป | day\_colors \+ zodiac\_colors | ดึง lucky\_colors (TEXT) → ใส่ใน Gemini prompt ตรงๆ |
| แนะนำสีเสื้อผ้า | day\_colors | ดึง outfit\_suggestion แสดงในหน้า result |
| ข้อมูล result page | ทุก table | แสดง lucky\_colors ของวัน/เดือน/ราศีให้ user เห็น |
| Image prompt | ทุก table | "lucky colors: เหลืองทอง, เขียวมรกต" ใส่ใน prompt |

ตัวอย่าง combined prompt:

| "Ganesha, Thai sacred art, Bitcoin symbols, luxury dark style,  divine aura,  lucky colors: warm gold (วันจันทร์),                rich emerald green (มกราคม),                soft powder blue (ราศีกุมภ์),  4K, no text, no watermark" |
| :---- |

# **7\. ตาราง Aspect Items (สิ่งของที่เทพถือ)**

สิ่งของที่เทพถือในรูป ผูกกับ aspect เป็น single source of truth — reuse ได้ทุกเทพ ไม่ต้อง maintain per-deity

## **Flow การทำงาน**

| Q1 (aspect)  ─────────────────────────────────────────────►  aspect\_items\[aspect\]\[era\]                                                                       │ Q2 (job)  ──►  derive aspect (ถ้า Q1 \= auto)                random 2-3 items                job\_symbols\[job\]  ──►  background symbols             │                                                                       ▼                                                         prompt: 'holding \[items.nameEN\]'                                                                  \+ 'surrounded by \[symbols\]' |
| :---- |

era mapping ตาม Q4 style ที่ user เลือก:

| Q4 Style | era ที่ใช้ | เหตุผล |
| :---- | :---- | :---- |
| ทองบนดำ (Luxury Dark) | traditional | ให้ความรู้สึกโบราณ ศักดิ์สิทธิ์ |
| สีสันสดใส (Thai Classic) | traditional | ใกล้ชิดวัฒนธรรมดั้งเดิม |
| พาสเทล (Watercolor) | both | mix ได้ทั้งสองแบบ |
| มินิมอล (Modern Minimal) | modern | สิ่งของดูร่วมสมัย |
| จักรวาล (Cosmic/Galaxy) | modern | เน้น sci-fi / futuristic |

## **Schema: aspect\_items**

items เก็บเป็น JSONB array — admin เห็น nameTH, ระบบใช้ nameEN ใส่ใน prompt

| CREATE TABLE aspect\_items (   id           SERIAL PRIMARY KEY,   aspect       TEXT    NOT NULL,  \-- 'wealth' | 'protection' | 'career'                                  \-- 'love' | 'health' | 'wisdom'   era          TEXT    NOT NULL,  \-- 'modern' | 'traditional'   items        TEXT    NOT NULL,  \-- 'บิทคอยน์, แท่งทอง, กราฟหุ้นขาขึ้น, ...'                                  \-- random 2-3 items ตอน generate   prompt\_desc  TEXT    NOT NULL,  \-- template เช่น 'ถือ \[items\] ด้วยพระหัตถ์'   created\_at   TIMESTAMPTZ DEFAULT NOW() ); CREATE INDEX ON aspect\_items (aspect, era); |
| :---- |

## **Item Pool (120 items · 12 กลุ่ม)**

**โชคลาภ (wealth) — modern**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| บิทคอยน์, แท่งทอง, กราฟหุ้นขาขึ้น, สมาร์ทโฟนแอปหุ้น, มัดธนบัตร, กองเหรียญทอง, กระเป๋าคริปโต, กราฟกองทุน ETF, แบงก์ดอลลาร์, กระปุกออมสิน, ใบหุ้น, เช็คเงินปันผล |

**โชคลาภ (wealth) — traditional**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| เรือทองจีน, แจกันอุดมสมบูรณ์, คทาหยกรู่อี้, ชามข้าวล้นเต็ม, น้ำเต้ามงคล, ไข่มุกแห่งความมั่งคั่ง, ดอกบัวกับเหรียญทอง, ชามประดับอัญมณี, ถาดเหรียญนางกวัก, ม้วนคาถาเบญจมงคล |

**คุ้มครอง (protection) — modern**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| โล่ดิจิทัล, กุญแจล็อก, บัตรรักษาความปลอดภัย, กระเป๋าเอกสารเกราะ, เครื่องสแกนชีวมาตร, ทรงกลมเฝ้าระวัง, โดมป้องกันพลังงาน, สัญญาณฉุกเฉิน, แผ่นเกราะไทเทเนียม, กริดไฟร์วอลล์ |

**คุ้มครอง (protection) — traditional**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| โล่ศักดิ์สิทธิ์, พระขรรค์ศักดิ์สิทธิ์, ยันต์มงคล, ผ้ายันต์สักยันต์, กริชพิธีกรรม, ดวงตาที่สามลุกโชน, ธรรมจักร, กำแพงนาคพันรอบ, รัศมีเปลวเพลิง, เครื่องรางคุ้มครอง |

**การงาน (career) — modern**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| กุญแจทอง, ม้วนสัญญา, โน้ตบุ๊ก, กราฟแท่งเติบโต, นามบัตรทอง, จรวดพุ่งขึ้น, แผนผังองค์กร, กระดานเป้าหมาย, ไอคอนจับมือ, ลูกศรพุ่งขึ้น |

**การงาน (career) — traditional**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| คทาหยกนักปราชญ์, พู่กันนักวิชาการ, ตราประทับทองคำ, แผ่นเกียรติยศ, พระราชโองการสวรรค์, บันไดทองแห่งความก้าวหน้า, ขนนกฟีนิกซ์ลุกโชน, ก้าวบนเมฆมงคล, ธงแห่งการเลื่อนขั้น, เข็มทิศทองคำ |

**ความรัก (love) — modern**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| กล่องแหวนทอง, บอลลูนรูปหัวใจ, กรอบรูปคู่รัก, กล่องของขวัญผูกริบบิ้น, ซองจดหมายรัก, โคมไฟดาวคืนโรแมนติก, กำไลคู่รัก, ช่อดอกกุหลาบ, ดอกไม้ไฟรูปหัวใจ, ชุดเทียนโรแมนติก |

**ความรัก (love) — traditional**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| เส้นด้ายแดงแห่งโชคชะตา, คู่ดอกบัว, สัญลักษณ์ความสุขคู่, คู่เป็ดแมนดาริน, พวงมาลัยมะลิ, ไข่มุกแสงจันทร์, หอยสังข์แห่งพร, กิ่งดอกท้อ, จี้รูปหัวใจ, ขวดยาความรัก |

**สุขภาพ (health) — modern**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| สายดีเอ็นเอเรืองแสง, นาฬิกาติดตามสุขภาพ, เครื่องวัดอัตราการเต้นหัวใจ, สมูทตี้สีเขียว, แคปซูลวิตามินเรืองแสง, กากบาทการแพทย์ทอง, รองเท้าวิ่งเรืองแสง, เสื่อโยคะ, ตะกร้าผลไม้สด, ทรงกลมพลังงานรักษา |

**สุขภาพ (health) — traditional**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| ลูกท้อแห่งอายุยืน, น้ำเต้าอมฤต, เห็ดหลินจือ, มัดสมุนไพรศักดิ์สิทธิ์, เข็มฝังเข็มทอง, วังวนพลังชี่, ไม้เท้าคาดูเซียส, ยาอมฤต, นกกระเรียนแห่งอายุยืน, มือรักษาเปล่งแสง |

**สติปัญญา (wisdom) — modern**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| โครงข่ายประสาทเรืองแสง, ทรงกลมวงจร AI, หนังสือเปิดเรืองแสง, กลุ่มหลอดไฟ, กล้องจุลทรรศน์วิจัย, ม้วนสิทธิบัตร, ลูกบาศก์ข้อมูล, ม้วนโค้ด, แผนที่โลกพร้อมหมุด, สมองเชื่อมต่อคลาวด์ |

**สติปัญญา (wisdom) — traditional**

| items (TEXT — ใส่ใน prompt ได้ตรงๆ) |
| :---- |
| คัมภีร์พระสูตรดอกบัว, ระฆังธรรม, ลูกประคำมาลา, ใบโพธิ์, อัญมณีดวงตาที่สาม, งาช้างแห่งปัญญา, คัมภีร์โบราณ, เข็มทิศสวรรค์, กระดูกพยากรณ์, ภูเขาแห่งปัญญา |

## **ตัวอย่าง Combined Prompt**

user: เทรดเดอร์คริปโต \+ โชคลาภ \+ พระพิฆเนศ \+ Luxury Dark

| "พระพิฆเนศ, ศิลปะไทยศักดิ์สิทธิ์,  ถือแท่งทองและบิทคอยน์ (random จาก aspect: โชคลาภ, era: traditional),  ล้อมรอบด้วยกราฟหุ้นและสมาร์ทโฟน (job symbols: เทรดเดอร์),  สีมงคล: เหลืองทอง (วันจันทร์), เขียวมรกต (มกราคม),  สไตล์ทองบนดำ, รัศมีศักดิ์สิทธิ์, ลวดลายไทย, 4K, ไม่มีตัวอักษร" |
| :---- |

# **8\. LINE LIFF Mini App (Phase 2\)**

*Web app เดิม (Next.js) สามารถเปิดเป็น LINE LIFF Mini App ได้โดยไม่ต้อง rewrite*

*LIFF คือ web app ที่รันใน LINE browser — ใช้ URL เดิม เพิ่มแค่ LIFF SDK*

*ใช้ LINE Login เดิมได้เลย — เพิ่ม liff.shareTargetPicker() สำหรับส่งรูปเข้าแชท LINE*

## **สิ่งที่เพิ่มใน Phase 2**

* เพิ่ม LIFF SDK — init และใช้งาน LINE-specific features

* Share รูปเข้าแชท LINE โดยตรง (ไม่ต้อง save และโพสต์เอง)

* ระบบชำระเงิน — LINE Pay หรือ PromptPay

* UI ปรับให้เหมาะกับ mobile-first มากขึ้น

# **9\. Claude Code Prompt**

*วาง prompt ด้านล่างนี้ตอนเริ่ม project ใหม่ใน Claude Code*

| สร้าง web app ชื่อ MongkolArt สำหรับสร้างรูปมงคล custom ด้วย AI เป็น prototype ยังไม่มีระบบชำระเงิน \== Concept \== ผู้ใช้ตอบคำถาม 4 ข้อ \-\> ระบบแนะนำเทพ \-\> AI สร้างรูป \-\> รับรูป \+ คาถา \+ share \== Authentication \== Login ด้วย LINE (LINE Login / LIFF) \== Wizard: 4 คำถาม \== Q1 ด้านที่อยากเสริม: \- การงาน/ธุรกิจ, โชคลาภ/การเงิน, ความรัก/ครอบครัว \- คุ้มครอง/ป้องกัน, สุขภาพ/พลังงาน, สติปัญญา/ความคิด \- ให้ระบบเลือก (auto) Q2 อาชีพ/สิ่งสำคัญ (มี freetext ด้วย): \- เทรดเดอร์/คริปโต \-\> symbols: Bitcoin, gold bars, trading chart, smartphone \- แม่ค้าออนไลน์ \-\> symbols: parcel, shopping bag, coins, phone \- เจ้าของธุรกิจ \-\> symbols: golden key, coins, contract, building \- นักเรียน \-\> symbols: books, light bulb, graduation scroll \- แพทย์/สุขภาพ \-\> symbols: caduceus, heart, medical cross \- ศิลปิน/Creator \-\> symbols: musical notes, paintbrush, mic, camera \- นักกีฬา \-\> symbols: trophy, weights, fire, stadium \- นักลงทุน \-\> symbols: stocks, property, gold, safe \- พิมพ์เอง \-\> AI แปลง freetext เป็น symbols Q3 เทพ (มี auto recommend): \- auto \-\> ระบบเลือกจาก Q1+Q2 พร้อมเหตุผล \- พระพิฆเนศ, ท้าวเวสสุวรรณ, พระพรหม, พระแม่ลักษมี \- พระศิวะ, พระวิษณุ, พระแม่กาลี, พิมพ์เอง Recommendation logic: work \-\> ganesha | wealth \-\> wessuwan | protect \-\> wessuwan love \-\> brahma | health \-\> brahma | business+wealth \-\> lakshmi default \-\> ganesha Q4 สไตล์: \- ทองบนดำ (Luxury Dark), สีสันสดใส (Thai Classic) \- พาสเทล (Watercolor), มินิมอล (Modern Minimal), จักรวาล (Cosmic) \== Image Generation \== ใช้ Google Gemini API สร้างรูป portrait 9:16 Prompt: "\[deity EN name\], Thai sacred art, \[job symbols\], \[style desc\],          auspicious symbols, divine aura, Thai patterns,          lucky colors: \[day\_colors\], \[month\_colors\], \[zodiac\_colors\], \[chinese\_zodiac\_colors\],          4K, no text, no watermark" \== Result Page \== \- แสดงรูปใหญ่ \+ Download button \- Badge: เทพที่แนะนำ \+ เหตุผล \- คาถาบูชา \+ วิธีสวด (ดึงจาก database) \- สีมงคลวันนี้ \+ สีตามราศี/นักษัตร \+ แนะนำสีเสื้อผ้า \- Share: Facebook, Twitter/X, LINE, Copy Link \== Database (Supabase PostgreSQL) \== \-- Transactional tables \-- chat\_sessions: id, user\_id, display\_name, aspect, job, job\_free\_text,                deity, style, prompt, image\_url, created\_at image\_records: id, image\_url, user\_id, deity, aspect, job, style, created\_at \-- Master data tables \-- deities: id, name\_th, name\_en, description, expertise\[\],          suitable\_aspects\[\], mantra, mantra\_desc, mantra\_time,          example\_image\_url, prompt\_keywords\[\] aspect\_items: id, aspect, era, items(TEXT), prompt\_desc   \-- aspect: wealth | protection | career | love | health | wisdom   \-- era: modern | traditional   \-- items: ชื่อสิ่งของภาษาไทยคั่นด้วยจุลภาค ใส่ใน prompt ได้ตรงๆ   \-- random 2-3 items ตอน generate \-- Astrological color tables \-- day\_colors: id, day\_name\_th, day\_name\_en, day\_number, planet\_th, planet\_en,             lucky\_colors(TEXT), unlucky\_colors(TEXT),             outfit\_suggestion, description month\_colors: id, month\_name\_th, month\_name\_en, month\_number, zodiac\_signs(TEXT),               lucky\_colors(TEXT), unlucky\_colors(TEXT),               gemstone\_th, gemstone\_en, outfit\_suggestion, description zodiac\_colors: id, zodiac\_name\_th, zodiac\_name\_en, zodiac\_number,                start\_date, end\_date, ruling\_planet\_th, ruling\_planet\_en,                element\_th, element\_en, lucky\_colors(TEXT), unlucky\_colors(TEXT),                lucky\_gemstone\_th, lucky\_gemstone\_en, outfit\_suggestion, description \== Storage \== Supabase Storage: เก็บรูป PNG แยกโฟลเดอร์ตาม user\_id \== Environment \== GEMINI\_API\_KEY LINE\_CHANNEL\_ID, LINE\_CHANNEL\_SECRET NEXT\_PUBLIC\_LIFF\_ID SUPABASE\_URL, SUPABASE\_SERVICE\_ROLE\_KEY NEXT\_PUBLIC\_SUPABASE\_URL, NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY plan การพัฒนาและ file structure ก่อน แล้วค่อย implement |
| :---- |

*MongkolArt — Idea Document v10.0*