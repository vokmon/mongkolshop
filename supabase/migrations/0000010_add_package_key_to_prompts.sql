-- Add package_key to prompts table
ALTER TABLE prompts
ADD COLUMN package_key text NOT NULL DEFAULT 'shared';

-- Set wallpaper-specific prompts
UPDATE prompts
SET
  package_key = 'wallpaper'
WHERE
  prompt_key IN (
    'bot_personality',
    'image_generation',
    'fortune_generation',
    'deity_recommendation'
  );

-- shared prompts (bot_personality, privacy_policy) keep default 'shared'
-- Enforce uniqueness per product + key combination
ALTER TABLE prompts ADD CONSTRAINT prompts_package_key_prompt_key_unique UNIQUE (package_key, prompt_key);