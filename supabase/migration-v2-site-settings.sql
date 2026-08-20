-- 现有线上项目升级：让站主可以在后台保存网易云歌单。
-- 只需在 Supabase SQL Editor 中执行一次；重复执行也是安全的。

create table if not exists public.site_settings (
  key text primary key check (char_length(key) between 1 and 80),
  value text not null check (char_length(value) <= 2048),
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings"
on public.site_settings for select to anon, authenticated
using (true);

drop policy if exists "admin can create site settings" on public.site_settings;
create policy "admin can create site settings"
on public.site_settings for insert to authenticated
with check ((select public.is_site_admin()));

drop policy if exists "admin can update site settings" on public.site_settings;
create policy "admin can update site settings"
on public.site_settings for update to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));

drop policy if exists "admin can delete site settings" on public.site_settings;
create policy "admin can delete site settings"
on public.site_settings for delete to authenticated
using ((select public.is_site_admin()));

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

insert into public.site_settings (key, value)
values ('netease_playlist', '8618410306')
on conflict (key) do nothing;
