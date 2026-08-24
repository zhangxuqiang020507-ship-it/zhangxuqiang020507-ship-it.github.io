# 张旭强的小站

奶油手账风个人网站，部署在 GitHub Pages。首页使用四张入口卡片，四个板块分别打开独立的大界面。包括：

- 碎碎念
- 摄影作品与照片评论
- 访客留言板
- 小站自有歌单与无界面随机背景音乐
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

小站歌单和背景音乐复用现有 `tracks` 表与 `music` Storage bucket，不需要执行额外数据库迁移。站主可以在管理桌分别上传普通歌单和背景音乐，也可以一次多选一组本地音频批量导入；访客只能播放，不能修改。

背景音乐没有可见控制组件，会在页面加载后立即尝试播放；有声自动播放被浏览器拦截时，会在访客第一次点击或使用键盘操作页面时重试。多首已启用背景音乐按随机顺序连续播放，每轮结束后重新洗牌，并避免相邻重复。背景音量由 `js/config.js` 中的 `backgroundVolume` 控制。只应上传自己拥有或获准公开使用的音频文件。

当数据库没有启用的背景音乐时，网站从 `js/config.js` 的 `defaultBackgroundTracks` 读取内置背景曲目；后台上传并启用的背景音乐会自动优先。内置文件保存在 `assets/audio/background/`，不得加入没有公开使用授权的录音。

## 安全边界

- 网页中只允许放 Supabase Project URL 和 publishable/anon key。
- 禁止把 `service_role` key、数据库密码、站主密码提交到 GitHub。
- 谁能修改内容由 [`supabase/schema.sql`](./supabase/schema.sql) 的 RLS 决定，不依赖前端隐藏按钮。
- 所有访客留言与评论默认进入 `pending`，由站主审核后公开。
