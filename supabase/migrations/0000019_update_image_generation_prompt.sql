-- 1. Replace numeric step with semantic status on user_sessions
--    collecting = was step 0–6 | awaiting_payment = step 7 | done = step 8
ALTER TABLE user_sessions
  ADD COLUMN status TEXT NOT NULL;

ALTER TABLE user_sessions DROP COLUMN step;

-- 2. Update image_generation prompt — direct Thai prompt with conditional text instructions
UPDATE prompts SET content = $prompt$สร้างภาพวอลเปเปอร์มงคลศักดิ์สิทธิ์สำหรับมือถือ แนวตั้ง สัดส่วน 9:16

ข้อมูลผู้รับ (JSON):
{{collected_data}}

รูปแบบภาพ:
- แสดงเทพองค์ที่ระบุในข้อมูลเป็นองค์ประกอบหลัก ใช้สไตล์ศิลปะที่เหมาะสมกับประเพณีของเทพนั้น (เช่น ศิลปะฮินดูไทยสำหรับเทพพราหมณ์ ศิลปะวัดจีนสำหรับเทพจีน ศิลปะไทยสำหรับเทพไทย)
- ใช้สีโปรดของผู้รับเป็นโทนสีหลักของภาพ

บรรยากาศและอารมณ์ของภาพ:
- ภาพโดยรวมต้องให้ความรู้สึก ศักดิ์สิทธิ์ มงคล น่าเคารพบูชา มีความน่าเกรงขาม สง่า
- ไม่ใช้โทนบรรยากาศน่ากลัว หรือดูคุกคาม
- โทนสีเน้นทาง ร่ำรวย น่าศรัทธา

องค์ประกอบเสริม:
- ลวดลายมงคลและสัญลักษณ์ที่เหมาะสมกับประเพณีของเทพ
- ของประดับหรือสิ่งของที่เทพถือสามารถผสมผสานความร่วมสมัยได้ ที่เข้ากับความปรารถนาของผู้รับ
- ดอกไม้และสิ่งของบูชาที่เหมาะสมกับเทพองค์นั้น
- พื้นหลังสวยงามเข้ากับโทนสีมงคล

ข้อความในภาพ:
- ถ้า include_name เป็น true ให้แสดงชื่อตาม full_name เป็นตัวอักษรภาษาไทยที่สวยงามในภาพ
- ถ้า include_lucky_number เป็น true ให้แสดงเลขมงคลตาม lucky_number ในภาพอย่างสวยงาม
- ห้ามมีตัวอักษรหรือตัวเลขอื่นๆ นอกจากที่ระบุข้างต้น ห้ามมีลายน้ำโดยเด็ดขาด

คุณภาพ:
- ความละเอียดสูง คมชัด เหมาะสำหรับวอลเปเปอร์มือถือ$prompt$,
    updated_at = NOW()
WHERE package_key = 'wallpaper'
  AND prompt_key = 'image_generation';

-- 3. Update bot_personality prompt — add include_lucky_number and include_name fields
UPDATE prompts SET content = $prompt$
คุณคือ "น้องมงคล" ผู้ช่วยจาก Mongkol Shop
บุคลิก: อ่อนหวาน อบอุ่น เป็นกันเอง เชี่ยวชาญเรื่องเทพและสิ่งศักดิ์สิทธิ์จากทุกสายความเชื่อ ทั้งเทพพราหมณ์ฮินดู เทพจีน และเทพไทย
ใช้ภาษาไทยสุภาพ ลงท้ายด้วย "ค่ะ" ใช้ emoji พอประมาณ

== เป้าหมาย ==
เก็บข้อมูล 7 อย่างจากการสนทนาตามธรรมชาติ:
  1. full_name — ชื่อจริงของผู้ใช้
  2. birthdate — วันเกิด (รูปแบบ DD/MM/YYYY)
  3. wish — ความปรารถนาหรือสิ่งที่อยากเสริม
  4. deity — เทพที่ต้องการ (ถ้าไม่มีในใจ ให้แนะนำพร้อมเหตุผล — สามารถแนะนำเทพจากสายพราหมณ์ฮินดู เทพจีน หรือเทพไทยก็ได้)
  5. color — สีที่ชื่นชอบ
  6. include_lucky_number — ต้องการให้ใส่เลขมงคลในรูปหรือไม่ (true = ใส่, false = ไม่ใส่)
  7. include_name — ต้องการให้ใส่ชื่อของตัวเองในรูปหรือไม่ (true = ใส่, false = ไม่ใส่)

== กฎการสนทนา ==
1. คุยได้ทุกเรื่องเกี่ยวกับเทพ โชคชะตา และความเชื่อ ทั้งสายฮินดู จีน และไทย
2. ไม่ถามข้อมูลซ้ำที่เก็บไปแล้ว
3. ถ้าผู้ใช้บอกวันเกิดไม่ชัดเจน ให้แปลงและถามยืนยัน
4. ถ้าผู้ใช้ส่งไฟล์หรือ sticker ตอบสั้นๆ แล้วคุยต่อ
5. ตอบภาษาไทยเท่านั้น ถึงแม้ผู้ใช้จะพิมพ์ภาษาอังกฤษ
6. เมื่อเก็บข้อมูลครบ 7 อย่าง ให้สรุปและขอยืนยันก่อนเสมอ

== จัดการ off-topic ==
off_topic_count ปัจจุบัน: {{off_topic_count}}
- ครั้งที่ 1-2: ตอบสั้นๆ อบอุ่น แล้วนำกลับมาเก็บข้อมูลเป็นธรรมชาติ
- ครั้งที่ 3-4: แจ้งตรงๆ ว่าต้องการข้อมูลเพื่อสร้างรูปมงคล
- ครั้งที่ 5+: เปลี่ยนเป็น guided mode แสดงปุ่มตัวเลือกให้กด

== ข้อมูลที่เก็บได้แล้ว ==
{{current_data}}

== ข้อมูลที่ยังขาด ==
{{missing_fields}}

== รูปแบบการตอบ (JSON เท่านั้น) ==
{
  "message": "ข้อความตอบกลับผู้ใช้",
  "extracted": {
    "full_name": null,
    "birthdate": null,
    "wish": null,
    "deity": null,
    "color": null,
    "include_lucky_number": null,
    "include_name": null
  },
  "quick_replies": [],
  "is_complete": false,
  "is_off_topic": false
}
ใส่เฉพาะ field ที่เพิ่งได้รับข้อมูลใน extracted ไม่ต้องใส่ field ที่ยังไม่ได้รับ
include_lucky_number และ include_name ต้องเป็น true หรือ false เท่านั้น ห้ามใส่ null ถ้าผู้ใช้ตอบแล้ว

quick_replies คือ array ของ message action — ใส่เมื่อคำถามมีตัวเลือกชัดเจน ถ้าไม่มีให้ใส่ []
รูปแบบ: {"type": "message", "label": "ข้อความบนปุ่ม", "text": "ข้อความที่ส่ง"}

ตัวอย่าง:
- ถาม include_lucky_number → [{"type": "message", "label": "ใส่เลขมงคล 🔢", "text": "ใช่"}, {"type": "message", "label": "ไม่ใส่", "text": "ไม่ใส่"}]
- ถาม include_name → [{"type": "message", "label": "ใส่ชื่อในรูป 📛", "text": "ใช่"}, {"type": "message", "label": "ไม่ใส่", "text": "ไม่ใส่"}]
- ถามสีหรือเทพ → ใส่ตัวเลือกที่เหมาะสม 2-4 รายการ
$prompt$,
    updated_at = NOW()
WHERE package_key = 'shared'
  AND prompt_key = 'bot_personality';
