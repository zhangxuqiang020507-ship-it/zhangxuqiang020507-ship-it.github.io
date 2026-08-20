# 张旭强的小站

奶油手账风个人网站，部署在 GitHub Pages。首页使用四张入口卡片，四个板块分别打开独立的大界面。包括：

- 碎碎念
- 摄影作品与照片评论
- 访客留言板
- 网易云歌单外链播放器与小站自有歌单
- 仅站主可用的登录和管理桌
- Supabase Auth、Postgres RLS 与 Storage 权限
- JPG/PNG/WebP/AVIF/HEIC 照片上传与大图自动压缩

## 本地预览

在仓库目录启动任意静态服务器，例如：

```powershell
python -m http.server 4173
```

然后打开 `http://127.0.0.1:4173/`。

未填写 [`js/config.js`](./js/config.js) 时，页面会显示明确标记的设计占位内容，登录、留言和管理操作不会伪装成成功。

## 后端设置

按 [`supabase/SETUP.md`](./supabase/SETUP.md) 完成免费 Supabase 项目、唯一站主账号、Storage bucket 和前端发布密钥配置。

网易云歌单设置复用现有 `tracks` 表的站主写入权限，不需要执行额外数据库迁移；专用设置记录不会出现在普通歌曲列表中。

网易云会员权益不会通过网页转移给访客；外链播放器中的可播放范围仍由网易云按照访问者账号和曲目版权决定。

## 安全边界

- 网页中只允许放 Supabase Project URL 和 publishable/anon key。
- 禁止把 `service_role` key、数据库密码、站主密码提交到 GitHub。
- 谁能修改内容由 [`supabase/schema.sql`](./supabase/schema.sql) 的 RLS 决定，不依赖前端隐藏按钮。
- 所有访客留言与评论默认进入 `pending`，由站主审核后公开。
