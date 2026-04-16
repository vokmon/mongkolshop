alter table user_sessions add column if not exists package_key text not null default 'wallpaper';
