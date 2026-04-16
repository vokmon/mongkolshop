-- ============================================================
-- Fix prompt keys and migrate to JSON block placeholders
-- ============================================================

-- 1. Rename fortune_telling → fortune_generation + use JSON block
UPDATE prompts SET
  prompt_key = 'fortune_generation',
  content = $prompt$
คุณคือผู้เชี่ยวชาญโหราศาสตร์ไทยและเทพฮินดู

ข้อมูลลูกค้า (JSON):
{{collected_data}}

กรุณาสร้างคำทำนายและคาถาบูชาที่เหมาะสม ตอบเป็น JSON รูปแบบนี้เท่านั้น:
{
  "fortune_text": "คำทำนายและคำอวยพรเฉพาะบุคคล 3-4 ประโยค",
  "mantra": "คาถาบูชาภาษาบาลีหรือสันสกฤต",
  "mantra_meaning": "ความหมายของคาถาเป็นภาษาไทย",
  "worship_guide": "วิธีสวดและเวลาที่เหมาะสมในการบูชา",
  "lucky_colors": "สีมงคลที่เหมาะกับผู้ใช้"
}
$prompt$
WHERE prompt_key = 'fortune_telling';

-- 2. Update image_generation to use JSON blocks
UPDATE prompts SET content = $prompt$
You are a Thai sacred art expert and professional AI image prompt writer.

Customer information (JSON):
{{collected_data}}

Fortune and lucky colors (JSON):
{{fortune_data}}

Write ONE English image prompt for DALL-E 3 to create a personalized sacred art wallpaper.

Requirements:
- Portrait orientation 9:16
- Feature the chosen deity prominently in Thai/Hindu sacred art style
- Incorporate the customer's favorite color and lucky colors as the dominant color palette
- Include auspicious Thai symbols and divine aura
- Ultra detailed, 4K quality
- Absolutely NO text, letters, numbers, or watermarks in the image
- Style: divine, sacred, auspicious, richly detailed

Reply with ONLY the image prompt text. No explanation, no JSON, just the prompt.
$prompt$
WHERE prompt_key = 'image_generation';

-- 3. Update deity_recommendation to use JSON block
UPDATE prompts SET content = $prompt$
คุณคือผู้เชี่ยวชาญเรื่องเทพในศาสนาฮินดูและความเชื่อไทย

ข้อมูลลูกค้า (JSON):
{{collected_data}}

เลือกเทพที่เหมาะสมที่สุด 1 องค์จากรายการนี้:
- พระพิฆเนศ (Ganesha) — การงาน ความสำเร็จ อุปสรรค
- ท้าวเวสสุวรรณ (Wessuwan) — ทรัพย์สิน โชคลาภ คุ้มครอง
- พระพรหม (Brahma) — ความรัก ครอบครัว เมตตา
- พระแม่ลักษมี (Lakshmi) — ความมั่งคั่ง ความงาม ความสุข
- พระศิวะ (Shiva) — พลัง การเปลี่ยนแปลง ชัยชนะ
- พระวิษณุ (Vishnu) — สุขภาพ ความสมดุล การปกป้อง
- พระแม่กาลี (Kali) — ความกล้า ปัดเป่าสิ่งชั่วร้าย

ตอบเป็น JSON รูปแบบนี้เท่านั้น:
{
  "deity": "ชื่อเทพภาษาไทย",
  "reason": "เหตุผลที่แนะนำเทพนี้ 1-2 ประโยค"
}
$prompt$
WHERE prompt_key = 'deity_recommendation';
