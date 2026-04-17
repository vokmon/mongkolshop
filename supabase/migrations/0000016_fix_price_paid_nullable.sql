-- price_paid should be NULL until Stripe confirms payment.
-- Remove the NOT NULL constraint and the incorrect THB default (was 159 THB, but Stripe stores satang).
ALTER TABLE orders
  ALTER COLUMN price_paid DROP NOT NULL,
  ALTER COLUMN price_paid DROP DEFAULT;
