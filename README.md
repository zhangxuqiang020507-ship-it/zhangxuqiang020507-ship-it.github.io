# 张旭强的小站

奶油手账风个人网站，部署在 GitHub Pages。首页使用四张入口卡片，四个板块分别打开独立的大界面。包括：

- 碎碎念
- 摄影作品与照片评论
- 访客留言板
- 80 首小站歌单、随歌曲变化的封面、同步歌词与无界面随机背景音乐
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

当数据库歌单为空时，网站从 `js/library.js` 读取内置曲库。每首歌由 `assets/music/audio/` 中的原始 MP3、`assets/music/covers/` 中从 MP3 提取的 800×800 WebP 封面，以及 `assets/music/lyrics/` 中的 UTF-8 LRC 歌词组成。播放器按 LRC 时间轴把前后歌词拆成词组，铺成三层可点击的景深轨道：靠近边缘的词组放大、虚化并被裁切，靠近中心的词组缩小、变清晰，整条轨道在每句时长内持续横向漂移；当前句与上一句通过上下景深交接，并按本句时长显示连续光扫进度。沉浸全屏模式参考汽车风挡式天际屏的空间观感重新设计；这不是没有逐字时间戳时的伪逐字同步。切歌时首页卡片、播放器封面和歌词动态背景会同步更新。

歌词界面的控件文字使用按本站字符子集化的 Noto Sans CJK SC，歌词正文使用更细长的 Noto Serif CJK SC；两款可变字体均由本站本地加载，避免依赖外部字体服务。字体遵循 SIL Open Font License 1.1，许可证见 `assets/fonts/OFL.txt`。

[`scripts/build_music_library.ps1`](./scripts/build_music_library.ps1) 可以从本地 MP3 与同名 LRC 重新生成 80 首曲库、封面和 `js/library.js`。脚本复制音频而不转码，并用 SHA-256 核验复制结果；不要把无公开使用授权的音频或歌词加入曲库。

内置 MP3 在发布前由 [`scripts/optimize_web_audio.ps1`](./scripts/optimize_web_audio.ps1) 无损整理：脚本只复制原音频帧、保留文字元数据并移除已经单独提供的重复内嵌封面，然后逐首比对音频数据 SHA-256。播放器和背景音乐均使用 `preload="none"`；开始播放普通歌曲前会先暂停背景音乐，避免两个大文件竞争带宽。

背景音乐没有可见控制组件，会在页面加载后立即尝试播放；有声自动播放被浏览器拦截时，会在访客第一次点击或使用键盘操作页面时重试。多首已启用背景音乐按随机顺序连续播放，每轮结束后重新洗牌，并避免相邻重复。背景音量由 `js/config.js` 中的 `backgroundVolume` 控制。只应上传自己拥有或获准公开使用的音频文件。

当数据库没有启用的背景音乐时，网站从 `js/config.js` 的 `defaultBackgroundTracks` 读取内置背景曲目；后台上传并启用的背景音乐会自动优先。内置文件保存在 `assets/audio/background/`，不得加入没有公开使用授权的录音。

## 安全边界

- 网页中只允许放 Supabase Project URL 和 publishable/anon key。
- 禁止把 `service_role` key、数据库密码、站主密码提交到 GitHub。
- 谁能修改内容由 [`supabase/schema.sql`](./supabase/schema.sql) 的 RLS 决定，不依赖前端隐藏按钮。
- 所有访客留言与评论默认进入 `pending`，由站主审核后公开。
