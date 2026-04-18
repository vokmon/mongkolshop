ALTER TABLE pricing
  ADD COLUMN entry_keywords text[] NOT NULL DEFAULT '{}';

UPDATE pricing
SET entry_keywords = ARRAY[
  'วอลเปเปอร์',
  'รูปมงคล',
  'รูปมงคลส่วนตัว',
  'รูปเทพ',
  'รูปพื้นหลัง',
  'สั่งรูป',
  'สั่งวอลเปเปอร์',
  'อยากได้รูป',
  'ต้องการรูป'
]
WHERE package_key = 'wallpaper';
