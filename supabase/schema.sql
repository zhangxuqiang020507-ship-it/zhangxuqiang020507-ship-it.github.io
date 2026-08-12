-- 张旭强的小站：数据库、鉴权和权限规则
-- 在全新的 Supabase 项目 SQL Editor 中执行一次。

create extension if not exists pgcrypto;

create table public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  mood text check (mood is null or char_length(mood) <= 8),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 80),
  caption text check (caption is null or char_length(caption) <= 800),
  image_url text not null check (char_length(image_url) <= 2048),
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  shot_at date,
  location text check (location is null or char_length(location) <= 80),
  published boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  artist text check (artist is null or char_length(artist) <= 120),
  audio_url text not null check (char_length(audio_url) <= 2048),
  audio_storage_path text check (audio_storage_path is null or char_length(audio_storage_path) <= 500),
  cover_url text check (cover_url is null or char_length(cover_url) <= 2048),
  cover_storage_path text check (cover_storage_path is null or char_length(cover_storage_path) <= 500),
  enabled boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('guestbook', 'note', 'photo')),
  target_id uuid,
  nickname text not null check (char_length(trim(nickname)) between 1 and 30),
  content text not null check (char_length(trim(content)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint comments_target_shape check (
    (target_type = 'guestbook' and target_id is null)
    or (target_type in ('note', 'photo') and target_id is not null)
  )
);

create index notes_public_order_idx on public.notes (published, created_at desc);
create index photos_public_order_idx on public.photos (published, sort_order, created_at desc);
create index tracks_public_order_idx on public.tracks (enabled, sort_order, created_at);
create index comments_public_target_idx on public.comments (status, target_type, target_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_set_updated_at before update on public.notes
for each row execute function public.set_updated_at();
create trigger photos_set_updated_at before update on public.photos
for each row execute function public.set_updated_at();
create trigger tracks_set_updated_at before update on public.tracks
for each row execute function public.set_updated_at();

create or replace function public.mark_comment_reviewed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at = now();
  end if;
  return new;
end;
$$;

create trigger comments_mark_reviewed before update on public.comments
for each row execute function public.mark_comment_reviewed();

create or replace function public.delete_note_comments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.comments where target_type = 'note' and target_id = old.id;
  return old;
end;
$$;

create or replace function public.delete_photo_comments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.comments where target_type = 'photo' and target_id = old.id;
  return old;
end;
$$;

create trigger notes_delete_comments after delete on public.notes
for each row execute function public.delete_note_comments();
create trigger photos_delete_comments after delete on public.photos
for each row execute function public.delete_photo_comments();

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.site_admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

alter table public.site_admins enable row level security;
alter table public.notes enable row level security;
alter table public.photos enable row level security;
alter table public.tracks enable row level security;
alter table public.comments enable row level security;

create policy "admin can read own membership"
on public.site_admins for select to authenticated
using (user_id = (select auth.uid()));

create policy "public can read published notes"
on public.notes for select to anon, authenticated
using (published or (select public.is_site_admin()));
create policy "admin can create notes"
on public.notes for insert to authenticated
with check ((select public.is_site_admin()));
create policy "admin can update notes"
on public.notes for update to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));
create policy "admin can delete notes"
on public.notes for delete to authenticated
using ((select public.is_site_admin()));

create policy "public can read published photos"
on public.photos for select to anon, authenticated
using (published or (select public.is_site_admin()));
create policy "admin can create photos"
on public.photos for insert to authenticated
with check ((select public.is_site_admin()));
create policy "admin can update photos"
on public.photos for update to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));
create policy "admin can delete photos"
on public.photos for delete to authenticated
using ((select public.is_site_admin()));

create policy "public can read enabled tracks"
on public.tracks for select to anon, authenticated
using (enabled or (select public.is_site_admin()));
create policy "admin can create tracks"
on public.tracks for insert to authenticated
with check ((select public.is_site_admin()));
create policy "admin can update tracks"
on public.tracks for update to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));
create policy "admin can delete tracks"
on public.tracks for delete to authenticated
using ((select public.is_site_admin()));

create policy "public can read approved comments"
on public.comments for select to anon, authenticated
using (status = 'approved' or (select public.is_site_admin()));
create policy "visitors can submit pending comments"
on public.comments for insert to anon, authenticated
with check (
  status = 'pending'
  and char_length(trim(nickname)) between 1 and 30
  and char_length(trim(content)) between 1 and 500
);
create policy "admin can moderate comments"
on public.comments for update to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));
create policy "admin can delete comments"
on public.comments for delete to authenticated
using ((select public.is_site_admin()));

revoke all on public.site_admins, public.notes, public.photos, public.tracks, public.comments from anon, authenticated;
grant select on public.site_admins to authenticated;
grant select on public.notes, public.photos, public.tracks to anon, authenticated;
grant insert, update, delete on public.notes, public.photos, public.tracks to authenticated;
grant select on public.comments to anon, authenticated;
grant insert (target_type, target_id, nickname, content) on public.comments to anon, authenticated;
grant update, delete on public.comments to authenticated;

-- Storage 中请手动创建两个 public bucket：photos 和 music。
-- Public bucket 只代表可以读取文件；以下策略仍会限制上传、替换和删除。
create policy "site admin can read media metadata"
on storage.objects for select to authenticated
using (
  bucket_id in ('photos', 'music')
  and (select public.is_site_admin())
);

create policy "site admin can upload media"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('photos', 'music')
  and (select public.is_site_admin())
);

create policy "site admin can update media"
on storage.objects for update to authenticated
using (
  bucket_id in ('photos', 'music')
  and (select public.is_site_admin())
)
with check (
  bucket_id in ('photos', 'music')
  and (select public.is_site_admin())
);

create policy "site admin can delete media"
on storage.objects for delete to authenticated
using (
  bucket_id in ('photos', 'music')
  and (select public.is_site_admin())
);
