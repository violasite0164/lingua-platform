-- 首頁背景圖／影片設定（單列 id = 1）
-- 公開唯讀；僅 admin 可寫入

create table public.homepage_config (
  id smallint primary key default 1 check (id = 1),
  background_image_url text,
  background_video_url text,
  overlay_opacity real not null default 0.45
    check (overlay_opacity >= 0 and overlay_opacity <= 1),
  updated_at timestamptz not null default now()
);

comment on table public.homepage_config is '首頁全幅背景：圖片 URL、影片 URL（可並存，影片可沿用圖為 poster）、遮罩濃度';

insert into public.homepage_config (id) values (1)
on conflict (id) do nothing;

alter table public.homepage_config enable row level security;

create policy "homepage_config_select_all"
  on public.homepage_config for select
  using (true);

create policy "homepage_config_insert_admin"
  on public.homepage_config for insert
  with check (public.is_admin());

create policy "homepage_config_update_admin"
  on public.homepage_config for update
  using (public.is_admin())
  with check (public.is_admin());
