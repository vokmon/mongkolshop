-- user_sessions: replace individual collected fields with collected_data jsonb
alter table user_sessions
  drop column if exists full_name,
  drop column if exists birthdate,
  drop column if exists wish,
  drop column if exists deity_key,
  drop column if exists deity_source,
  drop column if exists color,
  add column if not exists collected_data jsonb not null default '{}';

-- orders: replace individual generated content fields with generated_content jsonb
-- image_url stays as a top-level column (used for LINE delivery)
alter table orders
  drop column if exists image_prompt,
  drop column if exists fortune_text,
  drop column if exists mantra,
  drop column if exists mantra_meaning,
  drop column if exists worship_guide,
  drop column if exists lucky_colors,
  add column if not exists generated_content jsonb;
