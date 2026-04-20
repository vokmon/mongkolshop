CREATE TABLE settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text
);

INSERT INTO settings (key, value, description) VALUES
  ('bot_name', 'น้องมงคล', 'ชื่อแสดงของบอท'),
  ('admin_contact', 'ติดต่อแอดมินได้เลยนะคะ 😊' || chr(10) || 'LINE ID: @652hgnwz', 'ข้อความที่แสดงเมื่อผู้ใช้พิมพ์ว่า ติดต่อแอดมิน');
