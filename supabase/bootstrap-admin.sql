-- 张旭强的小站：将已创建的网站账号设为唯一站长。
-- 该 UUID 是 Supabase Auth 的公开用户标识，不包含密码或登录令牌。

insert into public.site_admins (user_id)
values ('446563e3-3e8f-4c25-8cee-8b4f4552a5f5')
on conflict (user_id) do nothing;
