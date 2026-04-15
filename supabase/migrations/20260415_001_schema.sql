-- ============================================================
-- MongkolArt — Initial Schema
-- ============================================================

-- ------------------------------------------------------------
-- 1. user_consents
-- Tracks PDPA consent per LINE user (one row per user, forever)
-- ------------------------------------------------------------
CREATE TABLE user_consents (
  id             SERIAL PRIMARY KEY,
  line_user_id   TEXT        NOT NULL UNIQUE,
  accepted       BOOLEAN     NOT NULL DEFAULT FALSE,
  accepted_at    TIMESTAMPTZ,
  withdrawn      BOOLEAN     NOT NULL DEFAULT FALSE,
  withdrawn_at   TIMESTAMPTZ,
  policy_version TEXT        NOT NULL DEFAULT '1.0',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. user_sessions
-- One active session per user at a time
-- step: 0-6 = collecting info, 7 = awaiting payment, 8 = done
-- ------------------------------------------------------------
CREATE TABLE user_sessions (
  id                  SERIAL PRIMARY KEY,
  line_user_id        TEXT        NOT NULL,
  display_name        TEXT,
  step                SMALLINT    NOT NULL DEFAULT 0,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Collected fields
  full_name           TEXT,
  birthdate           DATE,
  wish                TEXT,
  deity_key           TEXT,
  deity_source        TEXT,                        -- 'auto' | 'user'
  color               TEXT,

  -- Conversation
  conversation_history  JSONB       NOT NULL DEFAULT '[]',
  current_order_no      TEXT,

  -- Reminder tracking
  reminder_count      SMALLINT    NOT NULL DEFAULT 0,
  last_reminded_at    TIMESTAMPTZ,

  -- Abandonment
  abandoned_reason    TEXT,
  abandoned_at        TIMESTAMPTZ,

  -- Off-topic tracking
  off_topic_count     SMALLINT    NOT NULL DEFAULT 0,
  chat_mode           TEXT        NOT NULL DEFAULT 'conversational', -- 'conversational' | 'guided'

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active session per user at a time
CREATE UNIQUE INDEX user_sessions_active_unique
  ON user_sessions (line_user_id)
  WHERE is_active = TRUE;

CREATE INDEX user_sessions_line_user_id_idx ON user_sessions (line_user_id);

-- ------------------------------------------------------------
-- 3. orders
-- Payment and image generation lifecycle per order
-- status: pending → paid → generating → done | failed
-- ------------------------------------------------------------
CREATE TABLE orders (
  id                  SERIAL PRIMARY KEY,
  order_no            TEXT        NOT NULL UNIQUE,
  line_user_id        TEXT        NOT NULL,
  session_id          INTEGER     NOT NULL REFERENCES user_sessions (id) ON DELETE RESTRICT,
  price_paid          INTEGER     NOT NULL DEFAULT 159,

  -- Stripe
  stripe_session_id   TEXT        UNIQUE,
  stripe_payment_id   TEXT,

  -- Generated content
  image_prompt        TEXT,
  image_url           TEXT,
  fortune_text        TEXT,
  mantra              TEXT,
  mantra_meaning      TEXT,
  worship_guide       TEXT,
  lucky_colors        TEXT,

  -- Lifecycle
  status              TEXT        NOT NULL DEFAULT 'pending',  -- pending | paid | generating | done | failed
  generate_attempts   SMALLINT    NOT NULL DEFAULT 0,
  last_error          TEXT,

  -- PDPA anonymization
  data_anonymized_at  TIMESTAMPTZ,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at             TIMESTAMPTZ,
  generating_at       TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ
);

CREATE INDEX orders_line_user_id_idx ON orders (line_user_id);
CREATE INDEX orders_status_idx       ON orders (status);

-- ------------------------------------------------------------
-- 4. prompts
-- AI prompt templates — editable from Supabase dashboard
-- without redeploying Edge Functions
-- ------------------------------------------------------------
CREATE TABLE prompts (
  id          SERIAL PRIMARY KEY,
  prompt_key  TEXT        NOT NULL UNIQUE,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. pricing
-- Package configuration — price and Stripe price ID
-- ------------------------------------------------------------
CREATE TABLE pricing (
  id              SERIAL PRIMARY KEY,
  package_key     TEXT        NOT NULL UNIQUE,
  name_th         TEXT        NOT NULL,
  price           INTEGER     NOT NULL,
  stripe_price_id TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
