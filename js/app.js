import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm";

const config = window.SITE_CONFIG ?? {};
const isConfigured = Boolean(
  config.supabaseUrl?.startsWith("https://") &&
  config.supabasePublishableKey &&
  !config.supabasePublishableKey.includes("YOUR_")
);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const supabase = isConfigured
  ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

const state = {
  session: null,
  isAdmin: false,
  notes: [],
  photos: [],
  tracks: [],
  settings: { netease_playlist: String(config.neteasePlaylistId || "") },
  publicComments: [],
  admin: { notes: [], photos: [], tracks: [], comments: [] },
  currentTrack: 0,
  activePhoto: null
};

const els = {
  menuToggle: $("#menuToggle"),
  siteNav: $("#siteNav"),
  loginButton: $("#loginButton"),
  adminButton: $("#adminButton"),
  loginDialog: $("#loginDialog"),
  loginForm: $("#loginForm"),
  loginMessage: $("#loginMessage"),
  adminDialog: $("#adminDialog"),
  adminIdentity: $("#adminIdentity"),
  logoutButton: $("#logoutButton"),
  notesList: $("#notesList"),
  notesEmpty: $("#notesEmpty"),
  photoGrid: $("#photoGrid"),
  photosEmpty: $("#photosEmpty"),
  photoCount: $("#photoCount"),
  guestbookForm: $("#guestbookForm"),
  guestbookList: $("#guestbookList"),
  commentsDialog: $("#commentsDialog"),
  commentsTitle: $("#commentsTitle"),
  commentsList: $("#commentsList"),
  commentForm: $("#commentForm"),
  photoDialog: $("#photoDialog"),
  lightboxImage: $("#lightboxImage"),
  lightboxTitle: $("#lightboxTitle"),
  lightboxCaption: $("#lightboxCaption"),
  lightboxMeta: $("#lightboxMeta"),
  photoCommentButton: $("#photoCommentButton"),
  playlist: $("#playlist"),
  audio: $("#audioPlayer"),
  albumCover: $("#albumCover"),
  trackTitle: $("#trackTitle"),
  trackArtist: $("#trackArtist"),
  currentTime: $("#currentTime"),
  duration: $("#duration"),
  progress: $("#progress"),
  playPause: $("#playPause"),
  prevTrack: $("#prevTrack"),
  nextTrack: $("#nextTrack"),
  noteForm: $("#noteForm"),
  photoForm: $("#photoForm"),
  trackForm: $("#trackForm"),
  adminNotesList: $("#adminNotesList"),
  adminPhotosList: $("#adminPhotosList"),
  adminTracksList: $("#adminTracksList"),
  adminCommentsList: $("#adminCommentsList"),
  pendingBadge: $("#pendingBadge"),
  refreshComments: $("#refreshComments"),
  toastRegion: $("#toastRegion")
};

Object.assign(els, {
  views: $$(".page-view"),
  routeLinks: $$('[data-route]'),
  homeNotePreview: $("#homeNotePreview"),
  homeNoteDate: $("#homeNoteDate"),
  homePhotoCount: $("#homePhotoCount"),
  homePhotoPreview: $("#homePhotoPreview"),
  homeTrackPreview: $("#homeTrackPreview"),
  neteasePanel: $("#neteasePanel"),
  neteaseEmpty: $("#neteaseEmpty"),
  neteasePlayer: $("#neteasePlayer"),
  neteaseOpen: $("#neteaseOpen"),
  neteaseForm: $("#neteaseForm"),
  photoFileLabel: $("#photoFileLabel"),
  photoUploadHint: $("#photoUploadHint"),
  photoUploadPreview: $("#photoUploadPreview")
});

function icon(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#icon-${id}`);
  svg.append(use);
  return svg;
}

function make(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.title) node.title = options.title;
  if (options.dataset) Object.assign(node.dataset, options.dataset);
  if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => node.setAttribute(key, value));
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child) node.append(child);
  }
  return node;
}

function toast(message, type = "") {
  const node = make("div", { className: `toast ${type}`.trim(), text: message });
  els.toastRegion.append(node);
  window.setTimeout(() => node.remove(), 4200);
}

function formatDate(value, withTime = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

function formatClock(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function placeholderPhoto(title, colors) {
  const [sky, ground, accent] = colors;
  const safeTitle = title.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 900 675">
    <defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="#fff4dd"/></linearGradient></defs>
    <rect width="900" height="675" fill="url(#s)"/><circle cx="705" cy="145" r="60" fill="#ffe4a7" opacity=".9"/>
    <path d="M0 420 145 300 265 410 420 250 590 430 720 325 900 430V675H0Z" fill="${ground}" opacity=".9"/>
    <path d="M0 515Q170 475 330 530T650 520T900 500V675H0Z" fill="${accent}" opacity=".85"/>
    <text x="45" y="620" fill="#fff" font-size="30" font-family="sans-serif">${safeTitle} · 示例占位</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const previewData = {
  notes: [{
    id: "preview-note",
    body: "后台连接后，我就可以从这里发布碎碎念。",
    mood: "🌱",
    created_at: new Date().toISOString(),
    preview: true
  }],
  photos: [
    ["花与风", ["#b9d7e6", "#819b73", "#e5ba89"]],
    ["海边的光", ["#b6d9e9", "#6d8891", "#d8bd82"]],
    ["校园树影", ["#d9e5d2", "#6f8b62", "#a99a76"]],
    ["晚灯", ["#9eb0c4", "#4d5b52", "#c8895b"]]
  ].map(([title, colors], index) => ({
    id: `preview-photo-${index}`,
    title,
    caption: "示例占位，连接后台后会由真实摄影作品替换。",
    image_url: placeholderPhoto(title, colors),
    created_at: new Date(Date.now() - index * 86400000).toISOString(),
    preview: true
  }))
};

function setBusy(form, busy) {
  const button = $("button[type='submit']", form);
  if (!button) return;
  button.disabled = busy;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = "处理中……";
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

function requireBackend() {
  if (isConfigured) return true;
  toast("动态后台还没有连接，完成 Supabase 配置后即可使用。", "error");
  return false;
}

function setupNavigation() {
  els.menuToggle.addEventListener("click", () => {
    const open = els.siteNav.classList.toggle("open");
    els.menuToggle.setAttribute("aria-expanded", String(open));
  });
  els.routeLinks.forEach(link => link.addEventListener("click", () => {
    els.siteNav.classList.remove("open");
    els.menuToggle.setAttribute("aria-expanded", "false");
  }));

  const showRoute = () => {
    const requested = location.hash.replace(/^#\/?/, "").split(/[?&]/)[0] || "home";
    const route = ["home", "notes", "gallery", "guestbook", "music"].includes(requested) ? requested : "home";
    els.views.forEach(view => {
      const active = view.dataset.view === route;
      view.classList.toggle("active", active);
      view.hidden = !active;
    });
    $$("[data-route]", els.siteNav).forEach(link => link.classList.toggle("active", link.dataset.route === route));
    document.body.dataset.view = route;
    document.title = route === "home" ? "张旭强的小站" : `${({ notes: "碎碎念", gallery: "摄影作品", guestbook: "留言板", music: "听歌" })[route]} · 张旭强的小站`;
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  window.addEventListener("hashchange", showRoute);
  showRoute();
}

function setupDialogs() {
  $$('[data-close-dialog]').forEach(button => {
    button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog)?.close());
  });
  $$("dialog.modal").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });
}

function renderNotes() {
  els.notesList.replaceChildren();
  els.notesEmpty.hidden = state.notes.length > 0;
  for (const note of state.notes) {
    const item = make("article", { className: "note-item" });
    if (note.mood) item.append(make("span", { className: "note-mood", text: note.mood }));
    item.append(make("p", { text: note.body }));
    const count = state.publicComments.filter(comment => comment.target_type === "note" && comment.target_id === note.id).length;
    const commentButton = make("button", { className: "comment-link", type: "button", text: note.preview ? "示例内容" : `${count ? `${count} 条 · ` : ""}评论` });
    if (!note.preview) commentButton.addEventListener("click", () => openComments("note", note.id, "这张便签的评论"));
    else commentButton.disabled = true;
    item.append(make("footer", { className: "note-meta" }, [make("time", { text: formatDate(note.created_at) }), commentButton]));
    els.notesList.append(item);
  }
}

function renderPhotos() {
  els.photoGrid.replaceChildren();
  els.photosEmpty.hidden = state.photos.length > 0;
  els.photoCount.textContent = `${state.photos.filter(photo => !photo.preview).length} 张`;
  for (const photo of state.photos) {
    const figure = make("figure", { className: "photo-card", attrs: { tabindex: "0", role: "button", "aria-label": `查看照片：${photo.title}` } });
    const image = make("img", { attrs: { src: photo.image_url, alt: photo.title, loading: "lazy" } });
    const caption = make("figcaption", {}, [
      make("span", { text: photo.title }),
      make("small", { text: photo.preview ? "示例" : formatDate(photo.shot_at || photo.created_at) })
    ]);
    figure.append(image, caption);
    const open = () => openPhoto(photo);
    figure.addEventListener("click", open);
    figure.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
    els.photoGrid.append(figure);
  }
}

function renderGuestbook() {
  els.guestbookList.replaceChildren();
  const messages = state.publicComments.filter(comment => comment.target_type === "guestbook");
  if (!messages.length) {
    els.guestbookList.append(make("p", { className: "muted", text: "还没有公开留言，来留下第一个脚印吧。" }));
    return;
  }
  for (const message of messages) {
    const item = make("article", { className: "guestbook-item" }, [
      make("header", {}, [make("strong", { text: message.nickname }), make("time", { text: formatDate(message.created_at) })]),
      make("p", { text: message.content })
    ]);
    els.guestbookList.append(item);
  }
}

function parseNeteasePlaylist(value) {
  const text = String(value || "").trim();
  if (/^\d{4,20}$/.test(text)) return text;
  const directMatch = text.match(/[?&#]id=(\d{4,20})/i);
  if (directMatch) return directMatch[1];
  const pathMatch = text.match(/playlist\/(\d{4,20})/i);
  return pathMatch?.[1] || "";
}

function renderHomePreviews() {
  const note = state.notes[0];
  els.homeNotePreview.textContent = note?.body || "今天也捡到了一点好看的光";
  els.homeNoteDate.textContent = note ? formatDate(note.created_at) : "等第一张便签贴上来";
  els.homePhotoCount.textContent = `${state.photos.filter(photo => !photo.preview).length} 张`;
  const frames = $$('i', els.homePhotoPreview);
  frames.forEach((frame, index) => {
    const photo = state.photos[index];
    frame.style.backgroundImage = photo ? `url("${String(photo.image_url).replace(/["\\]/g, "")}")` : "";
    frame.classList.toggle("has-photo", Boolean(photo));
  });
  const playlistId = parseNeteasePlaylist(state.settings.netease_playlist);
  els.homeTrackPreview.textContent = playlistId
    ? "网易云歌单已连接"
    : state.tracks[0]?.title || "我的网易云与小站歌单";
}

function renderNetease() {
  const playlistId = parseNeteasePlaylist(state.settings.netease_playlist);
  els.neteasePanel.hidden = !playlistId;
  els.neteaseEmpty.hidden = Boolean(playlistId);
  if (!playlistId) {
    els.neteasePlayer.removeAttribute("src");
    return;
  }
  const embedUrl = `https://music.163.com/outchain/player?type=0&id=${playlistId}&auto=0&height=430`;
  if (els.neteasePlayer.src !== embedUrl) els.neteasePlayer.src = embedUrl;
  els.neteaseOpen.href = `https://music.163.com/#/playlist?id=${playlistId}`;
  if (els.neteaseForm) els.neteaseForm.elements.playlist.value = state.settings.netease_playlist || playlistId;
}

function openPhoto(photo) {
  state.activePhoto = photo;
  els.lightboxImage.src = photo.image_url;
  els.lightboxImage.alt = photo.title;
  els.lightboxTitle.textContent = photo.title;
  els.lightboxCaption.textContent = photo.caption || "";
  els.lightboxMeta.textContent = [photo.shot_at && formatDate(photo.shot_at), photo.location].filter(Boolean).join(" · ");
  els.photoCommentButton.hidden = Boolean(photo.preview);
  els.photoDialog.showModal();
}

async function openComments(targetType, targetId, title) {
  els.commentsTitle.textContent = title;
  els.commentsList.replaceChildren(make("p", { className: "muted", text: "正在打开评论……" }));
  els.commentForm.elements.targetType.value = targetType;
  els.commentForm.elements.targetId.value = targetId;
  els.commentsDialog.showModal();
  if (!isConfigured) {
    els.commentsList.replaceChildren(make("p", { className: "muted", text: "后台连接后开放评论。" }));
    return;
  }
  let query = supabase.from("comments").select("id,nickname,content,created_at,target_type,target_id").eq("target_type", targetType).order("created_at", { ascending: false });
  query = targetId ? query.eq("target_id", targetId) : query.is("target_id", null);
  const { data, error } = await query;
  if (error) {
    els.commentsList.replaceChildren(make("p", { className: "muted", text: "评论暂时没有加载出来。" }));
    return;
  }
  els.commentsList.replaceChildren();
  if (!data.length) els.commentsList.append(make("p", { className: "muted", text: "还没有评论。" }));
  data.forEach(comment => els.commentsList.append(make("article", { className: "comment-item" }, [
    make("header", {}, [make("strong", { text: comment.nickname }), make("time", { text: formatDate(comment.created_at) })]),
    make("p", { text: comment.content })
  ])));
}

function renderPlaylist() {
  els.playlist.replaceChildren();
  if (!state.tracks.length) {
    els.trackTitle.textContent = "歌单还是空的";
    els.trackArtist.textContent = "等站主放进第一首歌";
    els.playPause.disabled = true;
    els.prevTrack.disabled = true;
    els.nextTrack.disabled = true;
    return;
  }
  els.playPause.disabled = false;
  els.prevTrack.disabled = state.tracks.length < 2;
  els.nextTrack.disabled = state.tracks.length < 2;
  state.tracks.forEach((track, index) => {
    const row = make("li", { className: index === state.currentTrack ? "active" : "", dataset: { index: String(index) } }, [
      make("span", { className: "playlist-index", text: String(index + 1).padStart(2, "0") }),
      make("span", { text: track.title }),
      make("small", { text: track.artist || "" })
    ]);
    row.addEventListener("click", () => { loadTrack(index, true); });
    els.playlist.append(row);
  });
  loadTrack(Math.min(state.currentTrack, state.tracks.length - 1), false);
}

function loadTrack(index, autoplay = false) {
  if (!state.tracks.length) return;
  state.currentTrack = (index + state.tracks.length) % state.tracks.length;
  const track = state.tracks[state.currentTrack];
  els.audio.src = track.audio_url;
  els.trackTitle.textContent = track.title;
  els.trackArtist.textContent = track.artist || "未填写歌手";
  els.albumCover.replaceChildren();
  if (track.cover_url) els.albumCover.append(make("img", { attrs: { src: track.cover_url, alt: `${track.title}封面` } }));
  else els.albumCover.append(make("span", { text: "♫" }));
  $$("li", els.playlist).forEach((row, rowIndex) => row.classList.toggle("active", rowIndex === state.currentTrack));
  setPlayIcon(false);
  if (autoplay) els.audio.play().catch(() => toast("浏览器没有允许自动播放，请再点一次播放。"));
}

function setPlayIcon(playing) {
  els.playPause.replaceChildren(icon(playing ? "pause" : "play"));
  els.playPause.setAttribute("aria-label", playing ? "暂停" : "播放");
}

function setupPlayer() {
  els.playPause.addEventListener("click", () => {
    if (!state.tracks.length) return;
    if (els.audio.paused) els.audio.play().catch(() => toast("这首歌暂时无法播放。", "error"));
    else els.audio.pause();
  });
  els.prevTrack.addEventListener("click", () => loadTrack(state.currentTrack - 1, true));
  els.nextTrack.addEventListener("click", () => loadTrack(state.currentTrack + 1, true));
  els.audio.addEventListener("play", () => setPlayIcon(true));
  els.audio.addEventListener("pause", () => setPlayIcon(false));
  els.audio.addEventListener("ended", () => loadTrack(state.currentTrack + 1, true));
  els.audio.addEventListener("loadedmetadata", () => { els.duration.textContent = formatClock(els.audio.duration); });
  els.audio.addEventListener("timeupdate", () => {
    const percent = els.audio.duration ? (els.audio.currentTime / els.audio.duration) * 100 : 0;
    els.progress.value = String(percent);
    els.progress.style.setProperty("--progress", `${percent}%`);
    els.currentTime.textContent = formatClock(els.audio.currentTime);
  });
  els.progress.addEventListener("input", () => {
    if (els.audio.duration) els.audio.currentTime = (Number(els.progress.value) / 100) * els.audio.duration;
  });
}

async function loadPublicData() {
  if (!isConfigured) {
    state.notes = previewData.notes;
    state.photos = previewData.photos;
    state.tracks = [];
    state.publicComments = [];
    renderPublic();
    return;
  }
  const [notesResult, photosResult, tracksResult, commentsResult, settingsResult] = await Promise.all([
    supabase.from("notes").select("id,body,mood,published,created_at,updated_at").order("created_at", { ascending: false }),
    supabase.from("photos").select("id,title,caption,image_url,shot_at,location,published,sort_order,created_at").order("sort_order").order("created_at", { ascending: false }),
    supabase.from("tracks").select("id,title,artist,audio_url,cover_url,enabled,sort_order,created_at").order("sort_order").order("created_at"),
    supabase.from("comments").select("id,target_type,target_id,nickname,content,created_at").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("key,value")
  ]);
  const failure = [notesResult, photosResult, tracksResult, commentsResult].find(result => result.error);
  if (failure) toast("网站内容暂时没有加载完整，请稍后再试。", "error");
  state.notes = notesResult.data ?? [];
  state.photos = photosResult.data ?? [];
  state.tracks = tracksResult.data ?? [];
  state.settings = {
    netease_playlist: String(config.neteasePlaylistId || ""),
    ...Object.fromEntries((settingsResult.data ?? []).map(item => [item.key, item.value]))
  };
  state.publicComments = commentsResult.data ?? [];
  renderPublic();
}

function renderPublic() {
  renderNotes();
  renderPhotos();
  renderGuestbook();
  renderPlaylist();
  renderHomePreviews();
  renderNetease();
}

async function submitPublicComment(form, targetType, targetId = null) {
  if (!requireBackend()) return;
  const data = new FormData(form);
  if (data.get("website")) return;
  const nickname = String(data.get("nickname") || "").trim();
  const content = String(data.get("content") || "").trim();
  if (!nickname || !content) return;
  setBusy(form, true);
  const payload = { target_type: targetType, nickname, content };
  if (targetId) payload.target_id = targetId;
  const { error } = await supabase.from("comments").insert(payload);
  setBusy(form, false);
  if (error) {
    toast("没有提交成功，请稍后再试。", "error");
    return;
  }
  form.reset();
  toast("收到啦，通过审核后就会显示。", "success");
}

function setupPublicForms() {
  els.guestbookForm.addEventListener("submit", event => {
    event.preventDefault();
    submitPublicComment(els.guestbookForm, "guestbook");
  });
  els.commentForm.addEventListener("submit", async event => {
    event.preventDefault();
    const type = els.commentForm.elements.targetType.value;
    const id = els.commentForm.elements.targetId.value || null;
    await submitPublicComment(els.commentForm, type, id);
  });
  els.photoCommentButton.addEventListener("click", () => {
    const photo = state.activePhoto;
    if (!photo || photo.preview) return;
    els.photoDialog.close();
    openComments("photo", photo.id, `《${photo.title}》的评论`);
  });
}

async function checkAdmin(session) {
  state.session = session;
  state.isAdmin = false;
  if (session?.user && supabase) {
    const { data, error } = await supabase.from("site_admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    state.isAdmin = !error && Boolean(data);
  }
  els.adminButton.hidden = !state.isAdmin;
  els.loginButton.setAttribute("aria-label", state.isAdmin ? "已登录为站主" : "站主登录");
  els.loginButton.title = state.isAdmin ? "已登录为站主" : "站主登录";
  els.loginButton.style.color = state.isAdmin ? "var(--sage-dark)" : "";
  if (state.isAdmin) els.adminIdentity.textContent = `${config.ownerDisplayName || "站主"} · ${session.user.email}`;
}

function setupAuth() {
  els.loginButton.addEventListener("click", async () => {
    if (state.isAdmin) {
      await openAdmin();
      return;
    }
    const unsafeOrigin = !window.isSecureContext && !["localhost", "127.0.0.1"].includes(location.hostname);
    els.loginMessage.textContent = !isConfigured
      ? "动态后台尚未连接，暂时不能登录。"
      : unsafeOrigin
        ? "当前域名的 HTTPS 证书还未生效。为保护密码，请修复 HTTPS 后再登录。"
        : "";
    els.loginDialog.showModal();
  });
  els.adminButton.addEventListener("click", openAdmin);
  els.loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!requireBackend()) return;
    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(location.hostname)) {
      els.loginMessage.textContent = "已阻止在不安全的 HTTP 页面提交站长密码，请先修复 HTTPS。";
      return;
    }
    const form = new FormData(els.loginForm);
    setBusy(els.loginForm, true);
    els.loginMessage.textContent = "";
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || "")
    });
    if (error) {
      setBusy(els.loginForm, false);
      els.loginMessage.textContent = "邮箱或密码不正确。";
      return;
    }
    await checkAdmin(data.session);
    setBusy(els.loginForm, false);
    if (!state.isAdmin) {
      await supabase.auth.signOut();
      els.loginMessage.textContent = "这个账号没有站主管理权限。";
      return;
    }
    els.loginForm.reset();
    els.loginDialog.close();
    toast("登录成功，管理桌已经打开。", "success");
    await openAdmin();
  });
  els.logoutButton.addEventListener("click", async () => {
    await supabase?.auth.signOut();
    await checkAdmin(null);
    els.adminDialog.close();
    toast("已退出站主管理。", "success");
  });
}

async function initializeAuth() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  await checkAdmin(data.session);
  supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => checkAdmin(session), 0);
  });
}

function setupAdminTabs() {
  $$("[data-admin-tab]").forEach(button => button.addEventListener("click", () => {
    $$("[data-admin-tab]").forEach(tab => tab.classList.remove("active"));
    $$(".admin-section").forEach(section => section.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.adminTab).classList.add("active");
  }));
}

async function openAdmin() {
  if (!state.isAdmin) return;
  els.adminDialog.showModal();
  await loadAdminData();
}

async function loadAdminData() {
  if (!state.isAdmin) return;
  const [notesResult, photosResult, tracksResult, commentsResult, settingsResult] = await Promise.all([
    supabase.from("notes").select("*").order("created_at", { ascending: false }),
    supabase.from("photos").select("*").order("sort_order").order("created_at", { ascending: false }),
    supabase.from("tracks").select("*").order("sort_order").order("created_at"),
    supabase.from("comments").select("*").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("key,value")
  ]);
  const failure = [notesResult, photosResult, tracksResult, commentsResult].find(result => result.error);
  if (failure) {
    toast("管理数据没有加载完整，请检查站主权限。", "error");
    return;
  }
  state.admin.notes = notesResult.data;
  state.admin.photos = photosResult.data;
  state.admin.tracks = tracksResult.data;
  state.admin.comments = commentsResult.data;
  if (!settingsResult.error) {
    state.settings = {
      netease_playlist: String(config.neteasePlaylistId || ""),
      ...Object.fromEntries((settingsResult.data ?? []).map(item => [item.key, item.value]))
    };
  }
  els.neteaseForm.elements.playlist.value = state.settings.netease_playlist || "";
  renderAdmin();
}

function actionButton(name, label, handler, danger = false) {
  const button = make("button", { className: "icon-button", type: "button", title: label, attrs: { "aria-label": label } }, icon(name));
  if (danger) button.style.color = "var(--danger)";
  button.addEventListener("click", handler);
  return button;
}

function renderAdmin() {
  renderAdminNotes();
  renderAdminPhotos();
  renderAdminTracks();
  renderAdminComments();
}

function renderAdminNotes() {
  els.adminNotesList.replaceChildren();
  if (!state.admin.notes.length) els.adminNotesList.append(make("p", { className: "muted", text: "还没有碎碎念。" }));
  state.admin.notes.forEach(note => {
    const media = make("div", { className: "admin-item-media", text: note.mood || "✎" });
    const copy = make("div", {}, [make("h4", { text: note.body.slice(0, 42) }), make("p", { text: `${formatDate(note.created_at, true)} · ${note.published ? "公开" : "未公开"}` })]);
    const actions = make("div", { className: "admin-item-actions" }, [
      actionButton("edit", "编辑", () => editNote(note)),
      actionButton("trash", "删除", () => deleteNote(note), true)
    ]);
    els.adminNotesList.append(make("article", { className: "admin-item" }, [media, copy, actions]));
  });
}

function editNote(note) {
  els.noteForm.elements.id.value = note.id;
  els.noteForm.elements.body.value = note.body;
  els.noteForm.elements.mood.value = note.mood || "";
  els.noteForm.elements.published.checked = note.published;
  els.noteForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteNote(note) {
  if (!window.confirm("删除这条碎碎念？相关评论也会一起删除。")) return;
  const { error } = await supabase.from("notes").delete().eq("id", note.id);
  if (error) return toast("删除失败。", "error");
  toast("碎碎念已删除。", "success");
  await refreshAll();
}

function setupNoteForm() {
  els.noteForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.isAdmin) return;
    const form = new FormData(els.noteForm);
    const id = form.get("id");
    const payload = {
      body: String(form.get("body") || "").trim(),
      mood: String(form.get("mood") || "").trim() || null,
      published: form.get("published") === "on"
    };
    setBusy(els.noteForm, true);
    const result = id
      ? await supabase.from("notes").update(payload).eq("id", id)
      : await supabase.from("notes").insert(payload);
    setBusy(els.noteForm, false);
    if (result.error) return toast("碎碎念没有保存成功。", "error");
    els.noteForm.reset();
    toast("碎碎念保存好了。", "success");
    await refreshAll();
  });
}

function renderAdminPhotos() {
  els.adminPhotosList.replaceChildren();
  if (!state.admin.photos.length) els.adminPhotosList.append(make("p", { className: "muted", text: "相册还空着。" }));
  state.admin.photos.forEach(photo => {
    const media = make("img", { className: "admin-item-media", attrs: { src: photo.image_url, alt: "" } });
    const copy = make("div", {}, [make("h4", { text: photo.title }), make("p", { text: `${photo.location || "未填写地点"} · ${photo.published ? "公开" : "未公开"}` })]);
    const actions = make("div", { className: "admin-item-actions" }, [
      actionButton("edit", "编辑", () => editPhoto(photo)),
      actionButton("trash", "删除", () => deletePhoto(photo), true)
    ]);
    els.adminPhotosList.append(make("article", { className: "admin-item" }, [media, copy, actions]));
  });
}

function editPhoto(photo) {
  const form = els.photoForm.elements;
  form.id.value = photo.id;
  form.existingImageUrl.value = photo.image_url;
  form.existingStoragePath.value = photo.storage_path || "";
  form.title.value = photo.title;
  form.caption.value = photo.caption || "";
  form.shotAt.value = photo.shot_at || "";
  form.location.value = photo.location || "";
  form.sortOrder.value = photo.sort_order || 0;
  form.published.checked = photo.published;
  els.photoForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makeUploadToken() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function fileExtension(file) {
  const fromName = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const fromType = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/ogg": "ogg", "audio/wav": "wav" })[file.type];
  return fromType || fromName || "bin";
}

async function compressBrowserImage(file, maxDimension = 3600, quality = .86) {
  let source;
  let release = () => {};
  if (typeof createImageBitmap === "function") {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
    release = () => source.close();
  } else {
    const url = URL.createObjectURL(file);
    source = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("浏览器无法读取这张照片"));
      image.src = url;
    });
    release = () => URL.revokeObjectURL(url);
  }
  try {
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("照片压缩失败，请换一张照片再试");
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    release();
  }
}

async function preparePhotoFile(file) {
  if (!file || file.size === 0) return null;
  if (file.size > 60 * 1024 * 1024) throw new Error("原始照片不能超过 60 MB");
  const extension = fileExtension(file);
  const isHeic = ["heic", "heif"].includes(extension) || ["image/heic", "image/heif"].includes(file.type);
  let prepared = file;
  if (isHeic) {
    els.photoUploadHint.textContent = "正在把 HEIC 转成网页可显示的 JPG……";
    const module = await import("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/+esm");
    const converted = await module.default({ blob: file, toType: "image/jpeg", quality: .9 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    prepared = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!allowed.includes(prepared.type)) throw new Error("暂不支持这种照片格式；相机 RAW/NEF 请先导出为 JPG");
  if (prepared.size > 11 * 1024 * 1024) {
    els.photoUploadHint.textContent = "照片较大，正在自动压缩……";
    prepared = await compressBrowserImage(prepared);
  }
  if (prepared.size > 12 * 1024 * 1024) throw new Error("自动压缩后仍超过 12 MB，请先导出较小尺寸的 JPG");
  return prepared;
}

function friendlyUploadError(error) {
  const message = String(error?.message || "");
  if (/row-level security|unauthorized|jwt|token/i.test(message)) return "站长登录状态可能已经过期，请退出后重新登录";
  if (/bucket.*not found/i.test(message)) return "照片存储桶不存在，请检查 Supabase Storage 设置";
  if (/mime|content.?type/i.test(message)) return "存储桶不允许这种图片格式";
  if (/maximum|too large|payload/i.test(message)) return "照片超过存储空间的单文件限制";
  return message || "照片没有保存成功";
}

async function uploadFile(bucket, file, folder, maxBytes, allowedTypes) {
  if (!file || file.size === 0) return null;
  if (file.size > maxBytes) throw new Error(`文件不能超过 ${Math.round(maxBytes / 1024 / 1024)} MB`);
  if (!allowedTypes.includes(file.type)) throw new Error("不支持这种文件格式");
  const extension = fileExtension(file);
  const path = `${state.session.user.id}/${folder}/${makeUploadToken()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function removeStoredFile(bucket, path) {
  if (!path) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn(`Could not remove ${bucket}/${path}`, error.message);
}

function setupPhotoForm() {
  const fileInput = els.photoForm.elements.file;
  let previewUrl = "";
  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    els.photoUploadPreview.removeAttribute("src");
    els.photoUploadPreview.hidden = true;
    els.photoFileLabel.textContent = "选择照片，或拖到这里";
    els.photoUploadHint.textContent = "支持 JPG、PNG、WebP、AVIF、HEIC；大图自动压缩";
  };
  fileInput.addEventListener("change", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    const file = fileInput.files?.[0];
    if (!file) return clearPreview();
    els.photoFileLabel.textContent = file.name;
    els.photoUploadHint.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · 保存时自动检查并处理`;
    const extension = fileExtension(file);
    if (["heic", "heif"].includes(extension) || ["image/heic", "image/heif"].includes(file.type)) {
      els.photoUploadPreview.hidden = true;
      return;
    }
    if (file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
      els.photoUploadPreview.src = previewUrl;
      els.photoUploadPreview.hidden = false;
    }
  });
  els.photoForm.addEventListener("reset", () => window.setTimeout(clearPreview, 0));
  els.photoForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.isAdmin) return;
    const form = new FormData(els.photoForm);
    const id = String(form.get("id") || "");
    const oldPath = String(form.get("existingStoragePath") || "");
    let uploaded = null;
    setBusy(els.photoForm, true);
    try {
      const file = await preparePhotoFile(form.get("file"));
      uploaded = await uploadFile("photos", file, "images", 12 * 1024 * 1024, ["image/jpeg", "image/png", "image/webp", "image/avif"]);
      const imageUrl = uploaded?.url || String(form.get("existingImageUrl") || "");
      if (!imageUrl) throw new Error("请选择一张照片");
      const payload = {
        title: String(form.get("title") || "").trim(),
        caption: String(form.get("caption") || "").trim() || null,
        image_url: imageUrl,
        storage_path: uploaded?.path || oldPath || null,
        shot_at: String(form.get("shotAt") || "") || null,
        location: String(form.get("location") || "").trim() || null,
        sort_order: Number(form.get("sortOrder") || 0),
        published: form.get("published") === "on"
      };
      const result = id
        ? await supabase.from("photos").update(payload).eq("id", id)
        : await supabase.from("photos").insert(payload);
      if (result.error) throw result.error;
      if (uploaded && oldPath && oldPath !== uploaded.path) await removeStoredFile("photos", oldPath);
      els.photoForm.reset();
      toast("照片已经放进相册。", "success");
      await refreshAll();
    } catch (error) {
      if (uploaded) await removeStoredFile("photos", uploaded.path);
      toast(friendlyUploadError(error), "error");
    } finally {
      setBusy(els.photoForm, false);
    }
  });
}

async function deletePhoto(photo) {
  if (!window.confirm(`删除《${photo.title}》？相关评论也会一起删除。`)) return;
  const { error } = await supabase.from("photos").delete().eq("id", photo.id);
  if (error) return toast("照片删除失败。", "error");
  await removeStoredFile("photos", photo.storage_path);
  toast("照片已经删除。", "success");
  await refreshAll();
}

function renderAdminTracks() {
  els.adminTracksList.replaceChildren();
  if (!state.admin.tracks.length) els.adminTracksList.append(make("p", { className: "muted", text: "歌单还空着。" }));
  state.admin.tracks.forEach(track => {
    const media = track.cover_url
      ? make("img", { className: "admin-item-media", attrs: { src: track.cover_url, alt: "" } })
      : make("div", { className: "admin-item-media", text: "♫" });
    const copy = make("div", {}, [make("h4", { text: track.title }), make("p", { text: `${track.artist || "未填写歌手"} · ${track.enabled ? "显示" : "隐藏"}` })]);
    const actions = make("div", { className: "admin-item-actions" }, [
      actionButton("edit", "编辑", () => editTrack(track)),
      actionButton("trash", "删除", () => deleteTrack(track), true)
    ]);
    els.adminTracksList.append(make("article", { className: "admin-item" }, [media, copy, actions]));
  });
}

function editTrack(track) {
  const form = els.trackForm.elements;
  form.id.value = track.id;
  form.existingAudioUrl.value = track.audio_url;
  form.existingAudioStoragePath.value = track.audio_storage_path || "";
  form.existingCoverUrl.value = track.cover_url || "";
  form.existingCoverStoragePath.value = track.cover_storage_path || "";
  form.title.value = track.title;
  form.artist.value = track.artist || "";
  form.audioUrl.value = track.audio_storage_path ? "" : track.audio_url;
  form.sortOrder.value = track.sort_order || 0;
  form.enabled.checked = track.enabled;
  els.trackForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupTrackForm() {
  els.trackForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.isAdmin) return;
    const form = new FormData(els.trackForm);
    const id = String(form.get("id") || "");
    const oldAudioPath = String(form.get("existingAudioStoragePath") || "");
    const oldCoverPath = String(form.get("existingCoverStoragePath") || "");
    let uploadedAudio = null;
    let uploadedCover = null;
    setBusy(els.trackForm, true);
    try {
      uploadedAudio = await uploadFile("music", form.get("audioFile"), "audio", 30 * 1024 * 1024, ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/wav"]);
      uploadedCover = await uploadFile("music", form.get("coverFile"), "covers", 8 * 1024 * 1024, ["image/jpeg", "image/png", "image/webp", "image/avif"]);
      const typedAudioUrl = String(form.get("audioUrl") || "").trim();
      const audioUrl = uploadedAudio?.url || typedAudioUrl || String(form.get("existingAudioUrl") || "");
      if (!audioUrl) throw new Error("请上传音频文件，或者填写音频直链");
      const payload = {
        title: String(form.get("title") || "").trim(),
        artist: String(form.get("artist") || "").trim() || null,
        audio_url: audioUrl,
        audio_storage_path: uploadedAudio?.path || (typedAudioUrl ? null : oldAudioPath || null),
        cover_url: uploadedCover?.url || String(form.get("existingCoverUrl") || "") || null,
        cover_storage_path: uploadedCover?.path || oldCoverPath || null,
        sort_order: Number(form.get("sortOrder") || 0),
        enabled: form.get("enabled") === "on"
      };
      const result = id
        ? await supabase.from("tracks").update(payload).eq("id", id)
        : await supabase.from("tracks").insert(payload);
      if (result.error) throw result.error;
      if ((uploadedAudio || typedAudioUrl) && oldAudioPath && oldAudioPath !== uploadedAudio?.path) await removeStoredFile("music", oldAudioPath);
      if (uploadedCover && oldCoverPath && oldCoverPath !== uploadedCover.path) await removeStoredFile("music", oldCoverPath);
      els.trackForm.reset();
      toast("歌单已经更新。", "success");
      await refreshAll();
    } catch (error) {
      if (uploadedAudio) await removeStoredFile("music", uploadedAudio.path);
      if (uploadedCover) await removeStoredFile("music", uploadedCover.path);
      toast(error.message || "歌单没有保存成功。", "error");
    } finally {
      setBusy(els.trackForm, false);
    }
  });
}

async function deleteTrack(track) {
  if (!window.confirm(`从歌单中删除《${track.title}》？`)) return;
  const { error } = await supabase.from("tracks").delete().eq("id", track.id);
  if (error) return toast("歌曲删除失败。", "error");
  await Promise.all([removeStoredFile("music", track.audio_storage_path), removeStoredFile("music", track.cover_storage_path)]);
  toast("已经从歌单中删除。", "success");
  await refreshAll();
}

function targetName(comment) {
  if (comment.target_type === "guestbook") return "留言板";
  if (comment.target_type === "note") {
    const note = state.admin.notes.find(item => item.id === comment.target_id);
    return note ? `碎碎念：${note.body.slice(0, 18)}` : "已删除的碎碎念";
  }
  const photo = state.admin.photos.find(item => item.id === comment.target_id);
  return photo ? `照片：${photo.title}` : "已删除的照片";
}

function renderAdminComments() {
  els.adminCommentsList.replaceChildren();
  const order = { pending: 0, approved: 1, rejected: 2 };
  const comments = [...state.admin.comments].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(b.created_at) - new Date(a.created_at));
  const pending = comments.filter(comment => comment.status === "pending").length;
  els.pendingBadge.textContent = pending ? String(pending) : "";
  if (!comments.length) els.adminCommentsList.append(make("p", { className: "muted", text: "还没有留言或评论。" }));
  comments.forEach(comment => {
    const media = make("div", { className: "admin-item-media", text: comment.target_type === "guestbook" ? "💬" : "✎" });
    const copy = make("div", {}, [
      make("h4", { text: `${comment.nickname} · ${targetName(comment)}` }),
      make("p", { text: comment.content }),
      make("span", { className: `status-chip ${comment.status}`, text: ({ pending: "等待审核", approved: "已公开", rejected: "未通过" })[comment.status] || comment.status })
    ]);
    const actions = make("div", { className: "admin-item-actions" });
    if (comment.status !== "approved") actions.append(actionButton("home", "通过并公开", () => moderateComment(comment.id, "approved")));
    if (comment.status !== "rejected") actions.append(actionButton("close", "不通过", () => moderateComment(comment.id, "rejected")));
    actions.append(actionButton("trash", "删除", () => deleteComment(comment), true));
    els.adminCommentsList.append(make("article", { className: "admin-item" }, [media, copy, actions]));
  });
}

async function moderateComment(id, status) {
  const { error } = await supabase.from("comments").update({ status }).eq("id", id);
  if (error) return toast("审核状态没有保存。", "error");
  toast(status === "approved" ? "评论已经公开。" : "评论已标记为不通过。", "success");
  await refreshAll();
}

async function deleteComment(comment) {
  if (!window.confirm("彻底删除这条留言或评论？")) return;
  const { error } = await supabase.from("comments").delete().eq("id", comment.id);
  if (error) return toast("删除失败。", "error");
  toast("留言或评论已删除。", "success");
  await refreshAll();
}

async function refreshAll() {
  await Promise.all([loadPublicData(), loadAdminData()]);
}

function setupNeteaseForm() {
  els.neteaseForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.isAdmin) return;
    const raw = String(new FormData(els.neteaseForm).get("playlist") || "").trim();
    const playlistId = parseNeteasePlaylist(raw);
    if (raw && !playlistId) return toast("没有识别出歌单 ID，请粘贴歌单分享链接或输入纯数字 ID。", "error");
    setBusy(els.neteaseForm, true);
    const result = await supabase
      .from("site_settings")
      .upsert({ key: "netease_playlist", value: playlistId }, { onConflict: "key" });
    setBusy(els.neteaseForm, false);
    if (result.error) {
      const missingTable = /site_settings|schema cache|could not find/i.test(result.error.message || "");
      return toast(missingTable ? "网易云设置表还没有创建，需要先执行本次数据库升级。" : "网易云歌单没有保存成功。", "error");
    }
    state.settings.netease_playlist = playlistId;
    els.neteaseForm.elements.playlist.value = playlistId;
    renderNetease();
    renderHomePreviews();
    toast(playlistId ? "网易云歌单已经连接。" : "网易云歌单连接已经清除。", "success");
  });
}

function setupAdminForms() {
  setupNoteForm();
  setupPhotoForm();
  setupTrackForm();
  setupNeteaseForm();
  els.refreshComments.addEventListener("click", loadAdminData);
  [els.photoForm, els.trackForm].forEach(form => form.addEventListener("reset", () => {
    window.setTimeout(() => $$('input[type="hidden"]', form).forEach(input => { input.value = ""; }), 0);
  }));
}

async function init() {
  setupNavigation();
  setupDialogs();
  setupPlayer();
  setupPublicForms();
  setupAuth();
  setupAdminTabs();
  setupAdminForms();
  await initializeAuth();
  await loadPublicData();
}

init().catch(error => {
  console.error(error);
  toast("页面初始化时遇到问题，请刷新后重试。", "error");
});
