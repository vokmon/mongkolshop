ALTER TABLE orders
  ADD COLUMN promotion_code text NULL,
  ADD COLUMN coupon_name text NULL,
  ADD COLUMN discount_amount int NULL;
