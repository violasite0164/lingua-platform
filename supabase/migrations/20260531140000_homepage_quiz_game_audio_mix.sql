-- 英語大冒險：全站遊戲 BGM／音效音量（homepage_config 單列，公開讀、管理員寫）

alter table public.homepage_config
  add column if not exists quiz_game_bgm_volume_pct integer not null default 100,
  add column if not exists quiz_game_sfx_volume_pct integer not null default 100;

alter table public.homepage_config
  drop constraint if exists homepage_config_quiz_game_bgm_volume_pct_check;

alter table public.homepage_config
  add constraint homepage_config_quiz_game_bgm_volume_pct_check
  check (quiz_game_bgm_volume_pct between 0 and 200);

alter table public.homepage_config
  drop constraint if exists homepage_config_quiz_game_sfx_volume_pct_check;

alter table public.homepage_config
  add constraint homepage_config_quiz_game_sfx_volume_pct_check
  check (quiz_game_sfx_volume_pct between 0 and 200);

comment on column public.homepage_config.quiz_game_bgm_volume_pct is
  '英語大冒險 BGM 主音量百分比（100 = 預設；全站生效）';
comment on column public.homepage_config.quiz_game_sfx_volume_pct is
  '英語大冒險音效主音量百分比（100 = 預設；全站生效）';
