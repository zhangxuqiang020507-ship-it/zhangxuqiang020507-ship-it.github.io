# Supabase 设置清单

这个网站继续使用免费的 GitHub Pages。Supabase 只负责登录、数据库、照片/音乐文件，以及真正的权限控制。

## 1. 创建项目

1. 登录 Supabase，创建一个 Free 项目。
2. 保存好项目的数据库密码；这个密码不应写进网站文件。
3. 等项目初始化完成，进入 **SQL Editor**。

## 2. 建表和权限

1. 打开 [`schema.sql`](./schema.sql)。
2. 复制全部内容到 SQL Editor，执行一次。
3. 这会创建碎碎念、照片、歌单、留言/评论和站主名单，并给所有表开启 RLS。

权限结果：

- 未登录访客：只能读取公开内容、提交等待审核的留言或评论。
- 普通登录账号：仍然不能管理网站。
- `site_admins` 中的账号：才能新增、修改、删除内容和审核评论。
- 前端隐藏按钮不是安全边界；数据库 RLS 才是最终安全边界。

## 3. 创建唯一的站主账号

1. 进入 **Authentication > Users**。
2. 手动创建自己的邮箱和密码账号，并确认该账号。
3. 复制该用户的 **User UID**。
4. 打开 [`bootstrap-admin.sql`](./bootstrap-admin.sql)，把占位 UUID 换成真实 UID 后，在 SQL Editor 执行。
5. 进入 **Authentication > Providers > Email**，关闭允许新用户自行注册的选项。网站本身也没有注册入口。

不要把密码写进 GitHub、`config.js` 或任何网页文件。

## 4. 创建两个公开文件桶

进入 **Storage**，手动创建：

### `photos`

- Public bucket：开启
- File size limit：12 MB
- Allowed MIME types：`image/jpeg,image/png,image/webp,image/avif`

### `music`

- Public bucket：开启
- File size limit：30 MB
- Allowed MIME types：`audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,image/jpeg,image/png,image/webp,image/avif`

公开桶允许别人通过文件 URL 查看作品，但 `schema.sql` 中的 Storage RLS 会阻止访客上传、替换或删除文件。只上传自己拥有或获准使用的音乐。

## 5. 连接网页

在 Supabase 的 Project Settings / API 页面复制：

- Project URL
- Publishable key（或旧项目中的 `anon` public key）

把它们填进 [`../js/config.js`](../js/config.js)：

```js
window.SITE_CONFIG = Object.freeze({
  supabaseUrl: "https://你的项目.supabase.co",
  supabasePublishableKey: "sb_publishable_...",
  ownerDisplayName: "张旭强"
});
```

Publishable/anon key 是给浏览器公开使用的，不是密码。绝不能填写 `service_role` key。

## 6. 站点地址

在 **Authentication > URL Configuration** 中设置：

- Site URL：`https://zhangxuqiang.top`
- Redirect URL：`https://zhangxuqiang.top/**`

本网站使用邮箱和密码直接登录，不依赖公开注册。

小站歌单和背景音乐直接复用现有 `tracks` 表、`music` bucket 与 RLS 权限，不需要运行额外迁移。背景音乐记录会与普通歌单分开显示；未登录访客只能读取已启用的音频。

只上传自己拥有或获准公开使用的音频。现代浏览器可能阻止首次加载时的有声自动播放，网站会在访客第一次点击页面后重试，并提供播放、暂停和音量控制。

## 7. 验收顺序

1. 未登录打开网站：看不到管理按钮。
2. 尝试留言：数据库中应新增 `pending` 评论，但网页上还不可见。
3. 用站主账号登录：能打开管理桌。
4. 审核留言为 `approved`：刷新后访客可见。
5. 上传照片、发布碎碎念、加入普通歌曲和背景音乐；用批量导入测试多选音频。
6. 退出登录：新增/编辑/删除入口全部消失。
