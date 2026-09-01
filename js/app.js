import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm";

const config = window.SITE_CONFIG ?? {};
const builtInLibrary = Array.isArray(window.MUSIC_LIBRARY) ? window.MUSIC_LIBRARY : [];
const BACKGROUND_TRACK_PREFIX = "__SITE_BACKGROUND__:";
const SITE_SETTING_PREFIX = "__SITE_";
const BUILT_IN_AUDIO_VERSION = "20260831-startup1";
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
  backgroundTracks: [],
  publicComments: [],
  admin: { notes: [], photos: [], tracks: [], backgroundTracks: [], comments: [] },
  currentTrack: 0,
  backgroundTrack: -1,
  backgroundQueue: [],
  backgroundSignature: "",
  backgroundAutoplayAttempted: false,
  resumeBackgroundAfterTrack: false,
  lyrics: [],
  activeLyric: -1,
  lyricStreamAnimation: null,
  lyricOrbitAnimations: [],
  lyricLoadToken: 0,
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
  libraryCount: $("#libraryCount"),
  skylineLyrics: $("#skylineLyrics"),
  lyricsBackdrop: $("#lyricsBackdrop"),
  lyricsCover: $("#lyricsCover"),
  lyricsTrackName: $("#lyricsTrackName"),
  lyricsClock: $("#lyricsClock"),
  lyricsPosition: $("#lyricsPosition"),
  lyricsRibbon: $("#lyricsRibbon"),
  lyricsLines: $("#lyricsLines"),
  lyricCurrent: $("#lyricCurrent"),
  lyricCompanion: $("#lyricCompanion"),
  lyricLineProgress: $("#lyricLineProgress"),
  lyricsExpand: $("#lyricsExpand"),
  backgroundAudio: $("#backgroundAudio"),
  noteForm: $("#noteForm"),
  photoForm: $("#photoForm"),
  trackForm: $("#trackForm"),
  backgroundTrackForm: $("#backgroundTrackForm"),
  bulkTrackForm: $("#bulkTrackForm"),
  bulkTrackStatus: $("#bulkTrackStatus"),
  adminNotesList: $("#adminNotesList"),
  adminPhotosList: $("#adminPhotosList"),
  adminTracksList: $("#adminTracksList"),
  adminBackgroundTracksList: $("#adminBackgroundTracksList"),
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
  homeTrackCover: $("#homeTrackCover"),
  homeTrackCoverFallback: $(".mini-cover span"),
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

function partitionTracks(rows) {
  const tracks = [];
  const backgroundTracks = [];
  for (const track of rows) {
    const artist = String(track.artist || "");
    if (artist.startsWith(BACKGROUND_TRACK_PREFIX)) {
      backgroundTracks.push({ ...track, artist: artist.slice(BACKGROUND_TRACK_PREFIX.length) || null });
    } else if (!artist.startsWith(SITE_SETTING_PREFIX)) {
      tracks.push(track);
    }
  }
  return { tracks, backgroundTracks };
}

function versionBuiltInAudio(url) {
  const value = String(url || "");
  if (!value.startsWith("./assets/")) return value;
  return `${value}${value.includes("?") ? "&" : "?"}v=${BUILT_IN_AUDIO_VERSION}`;
}

function configuredTracks() {
  return builtInLibrary
    .filter(track => track?.audioUrl)
    .map((track, index) => ({
      id: String(track.id || `library-${index + 1}`),
      title: String(track.title || `歌曲 ${index + 1}`),
      artist: String(track.artist || "") || null,
      album: String(track.album || "") || null,
      duration: Number(track.duration || 0),
      audio_url: versionBuiltInAudio(track.audioUrl),
      cover_url: String(track.coverUrl || "") || null,
      lyrics_url: String(track.lyricsUrl || "") || null,
      timed_lyrics: track.timedLyrics !== false,
      enabled: true,
      sort_order: Number(track.sortOrder ?? index),
      built_in: true
    }));
}

function configuredBackgroundTracks() {
  const configured = Array.isArray(config.defaultBackgroundTracks)
    ? config.defaultBackgroundTracks
    : config.defaultBackgroundTrack
      ? [config.defaultBackgroundTrack]
      : [];
  return configured
    .filter(track => track?.audioUrl)
    .map((track, index) => ({
      id: `site-default-background-${index}`,
      title: String(track.title || "小站背景音乐"),
      artist: String(track.artist || "") || null,
      audio_url: versionBuiltInAudio(track.audioUrl),
      enabled: true,
      sort_order: index,
      built_in: true
    }));
}

function setHomeTrackPreview(track) {
  els.homeTrackPreview.textContent = track?.title || "我的小站歌单与背景音乐";
  const coverUrl = track?.cover_url || "";
  els.homeTrackCover.hidden = !coverUrl;
  els.homeTrackCoverFallback.hidden = Boolean(coverUrl);
  if (coverUrl && els.homeTrackCover.src !== new URL(coverUrl, location.href).href) {
    els.homeTrackCover.src = coverUrl;
    els.homeTrackCover.alt = `${track.title}封面`;
  }
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
  setHomeTrackPreview(state.tracks[0] || state.backgroundTracks[0]);
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

function parseLrc(text) {
  const timestampPattern = /\[(\d{1,3}):(\d{2})(?:[\.:](\d{1,3}))?\]/g;
  const offsetMatch = text.match(/^\[offset:([+-]?\d+)\]/im);
  const offsetSeconds = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0;
  const parsed = [];

  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const timestamps = [...line.matchAll(timestampPattern)];
    if (!timestamps.length) continue;
    const lyric = line.replace(timestampPattern, "").replace(/\[[^\]]+\]/g, "").trim();
    if (!lyric) continue;
    for (const match of timestamps) {
      const fraction = String(match[3] || "0").padEnd(3, "0").slice(0, 3);
      const time = (Number(match[1]) * 60) + Number(match[2]) + (Number(fraction) / 1000) + offsetSeconds;
      parsed.push({ time: Math.max(0, time), text: lyric });
    }
  }

  parsed.sort((a, b) => a.time - b.time);
  const merged = [];
  for (const line of parsed) {
    const previous = merged.at(-1);
    if (previous && Math.abs(previous.time - line.time) < 0.01) {
      if (!previous.text.split("\n").includes(line.text)) previous.text += `\n${line.text}`;
    } else {
      merged.push({ ...line });
    }
  }
  return merged;
}

function splitLyricFragments(text) {
  const normalized = String(text || "").replace(/\s*\n\s*/g, " ").trim();
  if (!normalized) return [];

  let words = [];
  try {
    words = [...new Intl.Segmenter("zh-CN", { granularity: "word" }).segment(normalized)]
      .filter(segment => segment.isWordLike)
      .map(segment => segment.segment.trim())
      .filter(Boolean);
  } catch {
    words = normalized.split(/\s+/).filter(Boolean);
  }

  if (words.length < 2 && Array.from(normalized).length > 4) {
    const characters = Array.from(normalized.replace(/\s+/g, ""));
    words = [];
    for (let index = 0; index < characters.length; index += 2) words.push(characters.slice(index, index + 2).join(""));
  }
  if (words.length <= 5) return words.length ? words : [normalized];

  const groups = [];
  const groupSize = Math.ceil(words.length / 5);
  for (let index = 0; index < words.length; index += groupSize) groups.push(words.slice(index, index + groupSize).join(""));
  return groups.slice(0, 5);
}

function setLyricMessage(message) {
  state.lyrics = [];
  state.activeLyric = -1;
  state.lyricStreamAnimation?.cancel();
  state.lyricStreamAnimation = null;
  state.lyricOrbitAnimations.forEach(animation => animation.cancel());
  state.lyricOrbitAnimations = [];
  els.lyricsRibbon.replaceChildren();
  els.lyricCurrent.textContent = message;
  els.lyricCompanion.textContent = "";
  els.lyricCurrent.style.setProperty("--lyric-progress", "0%");
  els.lyricLineProgress.style.width = "0%";
  els.lyricsClock.textContent = formatClock(els.audio.currentTime || 0);
  els.lyricsPosition.textContent = "0 / 0";
}

function renderLyric(index, direction = 1, previousIndex = -1) {
  if (!state.lyrics.length) return;
  const visibleIndex = index < 0 ? 0 : index;
  const currentLine = state.lyrics[visibleIndex];
  const outgoingLine = previousIndex >= 0 ? state.lyrics[previousIndex] : null;
  els.lyricCurrent.textContent = currentLine?.text || "";
  els.lyricCompanion.textContent = outgoingLine?.text || state.lyrics[visibleIndex + 1]?.text || "";
  els.lyricCurrent.style.setProperty("--lyric-progress", "0%");
  els.lyricsPosition.textContent = `${visibleIndex + 1} / ${state.lyrics.length}`;
  els.skylineLyrics.dataset.lyricDirection = direction < 0 ? "backward" : "forward";

  const orbit = [];
  const orbitMotion = [];
  const xByDistance = [0, 24, 41, 59];
  const yByDistance = [50, 49.5, 51, 53];
  const widthByDistance = [0, 30, 40, 54];
  const opacityByDistance = [1, 0.78, 0.57, 0.33];
  const scaleByDistance = [1, 0.86, 1.03, 1.24];
  const blurByDistance = [0, 0, 1.6, 4.8];
  const tiltByDistance = [0, 6, 14, 22];
  const baseFontByDistance = [0, 0.72, 1.05, 1.48];
  const fragmentScale = [0.72, 1.3, 0.86, 1.5, 0.68];
  const fragmentOpacity = [0.46, 1, 0.68, 0.84, 0.4];
  const fragmentShift = [5, -6, 2, -4, 7];
  for (const offset of [-3, -2, -1, 1, 2, 3]) {
    const lyricIndex = visibleIndex + offset;
    const line = state.lyrics[lyricIndex];
    if (!line) continue;
    const distance = Math.abs(offset);
    const side = offset < 0 ? "past" : "future";
    const fragments = splitLyricFragments(line.text).map((fragment, fragmentIndex) => {
      const scale = fragmentScale[fragmentIndex % fragmentScale.length];
      const fragmentNode = make("span", { className: "lyric-fragment", text: fragment });
      fragmentNode.style.setProperty("--fragment-size", `${(baseFontByDistance[distance] * scale).toFixed(3)}rem`);
      fragmentNode.style.setProperty("--fragment-full-size", `${(baseFontByDistance[distance] * scale * 1.55).toFixed(3)}rem`);
      fragmentNode.style.setProperty("--fragment-opacity", String(fragmentOpacity[fragmentIndex % fragmentOpacity.length]));
      fragmentNode.style.setProperty("--fragment-shift", `${fragmentShift[fragmentIndex % fragmentShift.length]}px`);
      return fragmentNode;
    });
    const node = make("button", {
      className: `lyric-orbit-line is-${side}`,
      type: "button",
      title: `${formatClock(line.time)} · ${line.text}`,
      dataset: { lyricIndex: String(lyricIndex), distance: String(distance) },
      attrs: { "aria-label": `跳转到 ${formatClock(line.time)}，${line.text}` }
    }, fragments);
    const sideSign = offset < 0 ? -1 : 1;
    const tilt = sideSign * -tiltByDistance[distance];
    const roll = sideSign * Math.max(0, distance - 1) * 0.6;
    node.style.setProperty("--lyric-x", `${sideSign * xByDistance[distance]}%`);
    node.style.setProperty("--lyric-y", `${yByDistance[distance]}%`);
    node.style.setProperty("--lyric-width", `${widthByDistance[distance]}vw`);
    node.style.setProperty("--lyric-opacity", String(opacityByDistance[distance]));
    node.style.setProperty("--lyric-scale", String(scaleByDistance[distance]));
    node.style.setProperty("--lyric-blur", `${blurByDistance[distance]}px`);
    node.style.setProperty("--lyric-tilt", `${tilt}deg`);
    node.style.setProperty("--lyric-roll", `${roll}deg`);
    orbit.push(node);
    orbitMotion.push({
      node,
      side,
      sideSign,
      distance,
      opacity: opacityByDistance[distance],
      scale: scaleByDistance[distance],
      blur: blurByDistance[distance],
      tilt,
      roll
    });
  }
  state.lyricStreamAnimation?.cancel();
  state.lyricStreamAnimation = null;
  state.lyricOrbitAnimations.forEach(animation => animation.cancel());
  state.lyricOrbitAnimations = [];
  els.lyricsRibbon.replaceChildren(...orbit);

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.lyricsRibbon.getAnimations().forEach(animation => animation.cancel());
    els.lyricCurrent.getAnimations().forEach(animation => animation.cancel());
    els.lyricCompanion.getAnimations().forEach(animation => animation.cancel());
    const travel = direction < 0 ? -1 : 1;
    const lineEnd = state.lyrics[visibleIndex + 1]?.time ?? ((currentLine?.time || 0) + 5);
    const streamDuration = Math.max(1800, Math.min(9000, (lineEnd - (currentLine?.time || 0)) * 1000));
    const currentTransitionDuration = Math.max(1350, Math.min(2200, streamDuration * 0.72));
    const streamAnimation = els.lyricsRibbon.animate([
      { opacity: 0.72, transform: `translate3d(${travel * 24}px,0,0) rotateY(${travel * -1.1}deg)` },
      { offset: 0.3, opacity: 1, transform: `translate3d(${travel * 7}px,0,0) rotateY(${travel * -.28}deg)` },
      { offset: 0.78, opacity: 1, transform: `translate3d(${travel * -13}px,0,0) rotateY(${travel * .4}deg)` },
      { opacity: 0.94, transform: `translate3d(${travel * -23}px,0,0) rotateY(${travel * .72}deg)` }
    ], { duration: streamDuration, easing: "cubic-bezier(.37,0,.63,1)", fill: "both" });
    const streamPosition = Math.max(0, Math.min(streamDuration, ((els.audio.currentTime || 0) - (currentLine?.time || 0)) * 1000));
    streamAnimation.currentTime = streamPosition;
    if (els.audio.paused) streamAnimation.pause();
    state.lyricStreamAnimation = streamAnimation;
    state.lyricOrbitAnimations = orbitMotion.map(item => {
      const transformAt = (scale, drift) => `translate(-50%,-50%) translate3d(${drift}px,0,0) scale(${scale.toFixed(3)}) rotateY(${item.tilt}deg) rotateZ(${item.roll}deg)`;
      const keyframes = item.side === "future"
        ? [
            { opacity: Math.max(0.04, item.opacity * 0.38), filter: `blur(${(item.blur + 5).toFixed(2)}px)`, transform: transformAt(item.scale * 0.82, item.sideSign * 18) },
            { offset: 0.34, opacity: Math.min(0.96, item.opacity * 0.82), filter: `blur(${(item.blur + 1.25).toFixed(2)}px)`, transform: transformAt(item.scale * 0.96, item.sideSign * 5) },
            { opacity: Math.min(0.96, item.opacity * 1.18), filter: `blur(${Math.max(0.08, item.blur * 0.32).toFixed(2)}px)`, transform: transformAt(item.scale * 1.07, item.sideSign * -8) }
          ]
        : [
            { opacity: Math.min(0.96, item.opacity * 1.16), filter: `blur(${Math.max(0, item.blur * 0.2).toFixed(2)}px)`, transform: transformAt(item.scale * 1.06, item.sideSign * -5) },
            { offset: 0.38, opacity: Math.min(0.9, item.opacity * 0.84), filter: `blur(${(item.blur + 0.85).toFixed(2)}px)`, transform: transformAt(item.scale * 0.96, item.sideSign * 6) },
            { opacity: Math.max(0.05, item.opacity * 0.28), filter: `blur(${(item.blur + 5).toFixed(2)}px)`, transform: transformAt(item.scale * 0.82, item.sideSign * 18) }
          ];
      const animation = item.node.animate(keyframes, {
        duration: streamDuration,
        easing: "cubic-bezier(.37,0,.63,1)",
        fill: "both"
      });
      animation.currentTime = streamPosition;
      if (els.audio.paused) animation.pause();
      return animation;
    });
    els.lyricCurrent.animate([
      { opacity: 0.2, filter: "blur(2.8px) drop-shadow(0 4px 10px rgba(0,0,0,.24))", transform: `translate(-50%,-50%) translateY(${travel * 12}px) translateZ(12px) scale(.95)` },
      { offset: 0.34, opacity: 0.54, filter: "blur(1.35px) drop-shadow(0 4px 11px rgba(0,0,0,.28))", transform: `translate(-50%,-50%) translateY(${travel * 6}px) translateZ(18px) scale(.975)` },
      { offset: 0.72, opacity: 0.9, filter: "blur(.28px) drop-shadow(0 5px 13px rgba(0,0,0,.34))", transform: `translate(-50%,-50%) translateY(${travel}px) translateZ(23px) scale(.996)` },
      { opacity: 1, filter: "blur(0) drop-shadow(0 4px 10px rgba(0,0,0,.34))", transform: "translate(-50%,-50%) translateZ(24px) scale(1)" }
    ], { duration: currentTransitionDuration, easing: "cubic-bezier(.42,0,.58,1)" });
    if (outgoingLine) {
      els.lyricCompanion.animate([
        { opacity: 0.58, filter: "blur(.15px)", transform: "translate(-50%,calc(-50% - 12px)) translateZ(8px) scale(1.06)" },
        { offset: 0.58, opacity: 0.4, filter: "blur(.8px)", transform: "translate(-50%,calc(-50% - 3px)) translateZ(2px) scale(.985)" },
        { opacity: 0.32, filter: "blur(1.25px)", transform: "translate(-50%,-50%) translateZ(0) scale(.96)" }
      ], { duration: currentTransitionDuration, easing: "cubic-bezier(.42,0,.58,1)", fill: "forwards" });
    }
  }
}

function updateLyricProgress(currentTime, activeIndex = state.activeLyric) {
  els.lyricsClock.textContent = formatClock(currentTime || 0);
  if (!state.lyrics.length || activeIndex < 0) {
    els.lyricCurrent.style.setProperty("--lyric-progress", "0%");
    els.lyricLineProgress.style.width = "0%";
    return;
  }
  const start = state.lyrics[activeIndex]?.time ?? currentTime;
  const fallbackEnd = Number.isFinite(els.audio.duration) ? els.audio.duration : start + 6;
  const end = state.lyrics[activeIndex + 1]?.time ?? fallbackEnd;
  const progress = Math.max(0, Math.min(1, (currentTime - start) / Math.max(0.35, end - start)));
  const progressPercent = `${(progress * 100).toFixed(2)}%`;
  els.lyricCurrent.style.setProperty("--lyric-progress", progressPercent);
  els.lyricLineProgress.style.width = progressPercent;
  const lyricMotion = [state.lyricStreamAnimation, ...state.lyricOrbitAnimations].filter(Boolean);
  for (const animation of lyricMotion) {
    const duration = Number(animation.effect?.getTiming().duration) || 0;
    const targetPosition = progress * duration;
    const animationPosition = Number(animation.currentTime) || 0;
    if (els.audio.paused || Math.abs(animationPosition - targetPosition) > 650) animation.currentTime = targetPosition;
  }
}

function updateLyric(currentTime) {
  if (!state.lyrics.length) return;
  let low = 0;
  let high = state.lyrics.length - 1;
  let active = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (state.lyrics[middle].time <= currentTime + 0.04) {
      active = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (active !== state.activeLyric) {
    const previousActive = state.activeLyric;
    state.activeLyric = active;
    renderLyric(active, previousActive > active ? -1 : 1, previousActive);
  }
  updateLyricProgress(currentTime, active);
}

async function loadLyrics(track) {
  const token = state.lyricLoadToken + 1;
  state.lyricLoadToken = token;
  els.lyricsTrackName.textContent = [track.title, track.artist].filter(Boolean).join(" · ");
  if (track.cover_url) {
    els.lyricsBackdrop.src = track.cover_url;
    els.lyricsCover.src = track.cover_url;
  }
  setLyricMessage("正在读取同步歌词…");
  if (!track.lyrics_url) {
    setLyricMessage("这首歌暂时没有同步歌词");
    return;
  }

  try {
    const response = await fetch(track.lyrics_url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const lyrics = parseLrc(await response.text());
    if (token !== state.lyricLoadToken) return;
    if (!lyrics.length) {
      setLyricMessage("这首歌暂无可显示的同步歌词");
      return;
    }
    state.lyrics = lyrics;
    state.activeLyric = -2;
    updateLyric(els.audio.currentTime || 0);
  } catch (error) {
    if (token !== state.lyricLoadToken) return;
    console.warn("歌词加载失败", error);
    setLyricMessage("歌词暂时没有加载出来");
  }
}

function setupLyrics() {
  els.lyricsRibbon.addEventListener("click", event => {
    const target = event.target.closest("[data-lyric-index]");
    if (!target) return;
    const lyricIndex = Number(target.dataset.lyricIndex);
    const line = state.lyrics[lyricIndex];
    if (!line) return;
    els.audio.currentTime = line.time;
    updateLyric(line.time);
  });
  els.lyricsExpand.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === els.skylineLyrics) await document.exitFullscreen();
      else await els.skylineLyrics.requestFullscreen();
    } catch {
      toast("当前浏览器暂时不支持全屏歌词。", "error");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const expanded = document.fullscreenElement === els.skylineLyrics;
    els.lyricsExpand.setAttribute("aria-label", expanded ? "退出全屏天际歌词" : "打开全屏天际歌词");
    const label = $("span", els.lyricsExpand);
    if (label) label.textContent = expanded ? "退出沉浸" : "沉浸歌词";
  });
}

function renderPlaylist() {
  els.playlist.replaceChildren();
  els.libraryCount.textContent = String(state.tracks.length);
  if (!state.tracks.length) {
    els.trackTitle.textContent = "歌单还是空的";
    els.trackArtist.textContent = "等站主放进第一首歌";
    els.playPause.disabled = true;
    els.prevTrack.disabled = true;
    els.nextTrack.disabled = true;
    setLyricMessage("歌单还没有歌曲");
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
  if (autoplay) pauseBackgroundForPlaylist();
  state.currentTrack = (index + state.tracks.length) % state.tracks.length;
  const track = state.tracks[state.currentTrack];
  els.audio.src = track.audio_url;
  els.currentTime.textContent = "0:00";
  els.duration.textContent = track.duration ? formatClock(track.duration) : "0:00";
  els.progress.value = "0";
  els.progress.style.setProperty("--progress", "0%");
  els.trackTitle.textContent = track.title;
  els.trackArtist.textContent = track.artist || "未填写歌手";
  els.albumCover.replaceChildren();
  if (track.cover_url) els.albumCover.append(make("img", { attrs: { src: track.cover_url, alt: `${track.title}封面` } }));
  else els.albumCover.append(make("span", { text: "♫" }));
  setHomeTrackPreview(track);
  $$("li", els.playlist).forEach((row, rowIndex) => {
    const active = rowIndex === state.currentTrack;
    row.classList.toggle("active", active);
    if (active && autoplay) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  void loadLyrics(track);
  if ("mediaSession" in navigator && "MediaMetadata" in window) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || "张旭强的小站",
      album: track.album || "小站歌单",
      artwork: track.cover_url ? [{ src: new URL(track.cover_url, location.href).href, sizes: "800x800", type: "image/webp" }] : []
    });
  }
  setPlayIcon(false);
  if (autoplay) els.audio.play().catch(() => toast("浏览器没有允许自动播放，请再点一次播放。"));
}

function setPlayIcon(playing) {
  els.playPause.replaceChildren(icon(playing ? "pause" : "play"));
  els.playPause.setAttribute("aria-label", playing ? "暂停" : "播放");
}

function pauseBackgroundForPlaylist() {
  if (!state.backgroundTracks.length) return;
  state.resumeBackgroundAfterTrack = true;
  if (!els.backgroundAudio.paused) els.backgroundAudio.pause();
}

function shuffleBackgroundOrder(indices) {
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  if (indices.length > 1 && indices[0] === state.backgroundTrack) {
    [indices[0], indices[1]] = [indices[1], indices[0]];
  }
  return indices;
}

function refillBackgroundQueue() {
  state.backgroundQueue = shuffleBackgroundOrder(state.backgroundTracks.map((_track, index) => index));
}

function loadBackgroundTrack(index, autoplay = false) {
  if (!state.backgroundTracks.length) return;
  state.backgroundTrack = (index + state.backgroundTracks.length) % state.backgroundTracks.length;
  const track = state.backgroundTracks[state.backgroundTrack];
  if (els.backgroundAudio.dataset.trackId !== String(track.id) || els.backgroundAudio.dataset.trackUrl !== track.audio_url) {
    els.backgroundAudio.src = track.audio_url;
    els.backgroundAudio.dataset.trackId = String(track.id);
    els.backgroundAudio.dataset.trackUrl = track.audio_url;
  }
  els.backgroundAudio.loop = state.backgroundTracks.length === 1;
  if (autoplay) attemptBackgroundPlayback();
}

function playNextRandomBackgroundTrack(autoplay = true) {
  if (!state.backgroundTracks.length) return;
  if (state.backgroundTracks.length === 1) {
    loadBackgroundTrack(0, autoplay);
    return;
  }
  if (!state.backgroundQueue.length) refillBackgroundQueue();
  loadBackgroundTrack(state.backgroundQueue.shift(), autoplay);
}

async function attemptBackgroundPlayback() {
  if (!state.backgroundTracks.length || !els.audio.paused) return false;
  try {
    await els.backgroundAudio.play();
    return true;
  } catch {
    return false;
  }
}

function renderBackgroundPlayer() {
  if (!state.backgroundTracks.length) {
    els.backgroundAudio.pause();
    els.backgroundAudio.removeAttribute("src");
    delete els.backgroundAudio.dataset.trackId;
    delete els.backgroundAudio.dataset.trackUrl;
    state.backgroundTrack = -1;
    state.backgroundQueue = [];
    state.backgroundSignature = "";
    return;
  }

  const signature = state.backgroundTracks.map(track => `${track.id}:${track.audio_url}`).join("|");
  const activeId = els.backgroundAudio.dataset.trackId;
  const activeIndex = state.backgroundTracks.findIndex(track => String(track.id) === activeId);
  if (signature !== state.backgroundSignature) {
    state.backgroundSignature = signature;
    state.backgroundQueue = [];
    state.backgroundTrack = activeIndex;
    state.backgroundAutoplayAttempted = false;
  }
  if (activeIndex < 0) playNextRandomBackgroundTrack(false);
  else state.backgroundTrack = activeIndex;

  if (!state.backgroundAutoplayAttempted) {
    state.backgroundAutoplayAttempted = true;
    attemptBackgroundPlayback();
  }
}

function setupBackgroundPlayer() {
  const configuredVolume = Number(config.backgroundVolume ?? 0.28);
  els.backgroundAudio.volume = Number.isFinite(configuredVolume)
    ? Math.min(1, Math.max(0, configuredVolume))
    : 0.28;
  els.backgroundAudio.addEventListener("ended", () => {
    if (state.backgroundTracks.length > 1) playNextRandomBackgroundTrack(true);
  });
  els.backgroundAudio.addEventListener("error", () => {
    if (state.backgroundTracks.length > 1) playNextRandomBackgroundTrack(true);
  });

  const unlockBackground = event => {
    if (event.type === "keydown" && !["Enter", " ", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    if (state.backgroundTracks.length && els.backgroundAudio.paused && els.audio.paused) {
      attemptBackgroundPlayback();
    }
  };
  document.addEventListener("pointerdown", unlockBackground, { passive: true });
  document.addEventListener("keydown", unlockBackground);
}

function setupPlayer() {
  const lyricMotionAnimations = () => [state.lyricStreamAnimation, ...state.lyricOrbitAnimations].filter(Boolean);
  const playLyricMotion = () => lyricMotionAnimations().forEach(animation => animation.play());
  const pauseLyricMotion = () => lyricMotionAnimations().forEach(animation => animation.pause());
  els.playPause.addEventListener("click", () => {
    if (!state.tracks.length) return;
    if (els.audio.paused) {
      pauseBackgroundForPlaylist();
      els.audio.play().catch(() => toast("这首歌暂时无法播放。", "error"));
    }
    else els.audio.pause();
  });
  els.prevTrack.addEventListener("click", () => loadTrack(state.currentTrack - 1, true));
  els.nextTrack.addEventListener("click", () => loadTrack(state.currentTrack + 1, true));
  els.audio.addEventListener("play", () => {
    setPlayIcon(true);
    els.skylineLyrics.classList.add("is-playing");
    playLyricMotion();
    if (state.backgroundTracks.length) {
      state.resumeBackgroundAfterTrack = true;
      if (!els.backgroundAudio.paused) els.backgroundAudio.pause();
    }
  });
  els.audio.addEventListener("pause", () => {
    setPlayIcon(false);
    els.skylineLyrics.classList.remove("is-playing");
    pauseLyricMotion();
    window.setTimeout(() => {
      if (els.audio.paused && state.resumeBackgroundAfterTrack) {
        state.resumeBackgroundAfterTrack = false;
        attemptBackgroundPlayback();
      }
    }, 180);
  });
  els.audio.addEventListener("waiting", pauseLyricMotion);
  els.audio.addEventListener("seeking", pauseLyricMotion);
  els.audio.addEventListener("playing", playLyricMotion);
  els.audio.addEventListener("seeked", () => {
    updateLyric(els.audio.currentTime);
    if (!els.audio.paused) playLyricMotion();
  });
  els.audio.addEventListener("ended", () => loadTrack(state.currentTrack + 1, true));
  els.audio.addEventListener("loadedmetadata", () => { els.duration.textContent = formatClock(els.audio.duration); });
  els.audio.addEventListener("timeupdate", () => {
    const percent = els.audio.duration ? (els.audio.currentTime / els.audio.duration) * 100 : 0;
    els.progress.value = String(percent);
    els.progress.style.setProperty("--progress", `${percent}%`);
    els.currentTime.textContent = formatClock(els.audio.currentTime);
    updateLyric(els.audio.currentTime);
  });
  els.progress.addEventListener("input", () => {
    if (els.audio.duration) {
      els.audio.currentTime = (Number(els.progress.value) / 100) * els.audio.duration;
      updateLyric(els.audio.currentTime);
    }
  });
}

async function loadPublicData() {
  if (!isConfigured) {
    state.notes = previewData.notes;
    state.photos = previewData.photos;
    state.tracks = configuredTracks();
    state.backgroundTracks = configuredBackgroundTracks();
    state.publicComments = [];
    renderPublic();
    return;
  }
  const [notesResult, photosResult, tracksResult, commentsResult] = await Promise.all([
    supabase.from("notes").select("id,body,mood,published,created_at,updated_at").order("created_at", { ascending: false }),
    supabase.from("photos").select("id,title,caption,image_url,shot_at,location,published,sort_order,created_at").order("sort_order").order("created_at", { ascending: false }),
    supabase.from("tracks").select("id,title,artist,audio_url,cover_url,enabled,sort_order,created_at").order("sort_order").order("created_at"),
    supabase.from("comments").select("id,target_type,target_id,nickname,content,created_at").order("created_at", { ascending: false })
  ]);
  const failure = [notesResult, photosResult, tracksResult, commentsResult].find(result => result.error);
  if (failure) toast("网站内容暂时没有加载完整，请稍后再试。", "error");
  state.notes = notesResult.data ?? [];
  state.photos = photosResult.data ?? [];
  const partitionedTracks = partitionTracks(tracksResult.data ?? []);
  state.tracks = partitionedTracks.tracks.length ? partitionedTracks.tracks : configuredTracks();
  state.backgroundTracks = partitionedTracks.backgroundTracks.length
    ? partitionedTracks.backgroundTracks
    : configuredBackgroundTracks();
  state.publicComments = commentsResult.data ?? [];
  renderPublic();
}

function renderPublic() {
  renderNotes();
  renderPhotos();
  renderGuestbook();
  renderPlaylist();
  renderHomePreviews();
  renderBackgroundPlayer();
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
  const [notesResult, photosResult, tracksResult, commentsResult] = await Promise.all([
    supabase.from("notes").select("*").order("created_at", { ascending: false }),
    supabase.from("photos").select("*").order("sort_order").order("created_at", { ascending: false }),
    supabase.from("tracks").select("*").order("sort_order").order("created_at"),
    supabase.from("comments").select("*").order("created_at", { ascending: false })
  ]);
  const failure = [notesResult, photosResult, tracksResult, commentsResult].find(result => result.error);
  if (failure) {
    toast("管理数据没有加载完整，请检查站主权限。", "error");
    return;
  }
  state.admin.notes = notesResult.data;
  state.admin.photos = photosResult.data;
  const partitionedTracks = partitionTracks(tracksResult.data);
  state.admin.tracks = partitionedTracks.tracks;
  state.admin.backgroundTracks = partitionedTracks.backgroundTracks;
  state.admin.comments = commentsResult.data;
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
  renderAdminBackgroundTracks();
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

function renderAdminBackgroundTracks() {
  els.adminBackgroundTracksList.replaceChildren();
  if (!state.admin.backgroundTracks.length) {
    els.adminBackgroundTracksList.append(make("p", { className: "muted", text: "还没有背景音乐。" }));
  }
  state.admin.backgroundTracks.forEach(track => {
    const media = make("div", { className: "admin-item-media", text: "♪" });
    const copy = make("div", {}, [
      make("h4", { text: track.title }),
      make("p", { text: `${track.artist || "未填写歌手"} · ${track.enabled ? "启用" : "停用"}` })
    ]);
    const actions = make("div", { className: "admin-item-actions" }, [
      actionButton("edit", "编辑", () => editBackgroundTrack(track)),
      actionButton("trash", "删除", () => deleteBackgroundTrack(track), true)
    ]);
    els.adminBackgroundTracksList.append(make("article", { className: "admin-item" }, [media, copy, actions]));
  });
}

function editBackgroundTrack(track) {
  const form = els.backgroundTrackForm.elements;
  form.id.value = track.id;
  form.existingAudioUrl.value = track.audio_url;
  form.existingAudioStoragePath.value = track.audio_storage_path || "";
  form.title.value = track.title;
  form.artist.value = track.artist || "";
  form.audioUrl.value = track.audio_storage_path ? "" : track.audio_url;
  form.sortOrder.value = track.sort_order || 0;
  form.enabled.checked = track.enabled;
  els.backgroundTrackForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupBackgroundTrackForm() {
  els.backgroundTrackForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.isAdmin) return;
    const form = new FormData(els.backgroundTrackForm);
    const id = String(form.get("id") || "");
    const oldAudioPath = String(form.get("existingAudioStoragePath") || "");
    let uploadedAudio = null;
    setBusy(els.backgroundTrackForm, true);
    try {
      uploadedAudio = await uploadFile("music", form.get("audioFile"), "background", 30 * 1024 * 1024, ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/wav"]);
      const typedAudioUrl = String(form.get("audioUrl") || "").trim();
      const audioUrl = uploadedAudio?.url || typedAudioUrl || String(form.get("existingAudioUrl") || "");
      if (!audioUrl) throw new Error("请上传背景音乐文件，或者填写音频直链");
      const artist = String(form.get("artist") || "").trim();
      const payload = {
        title: String(form.get("title") || "").trim(),
        artist: `${BACKGROUND_TRACK_PREFIX}${artist}`,
        audio_url: audioUrl,
        audio_storage_path: uploadedAudio?.path || (typedAudioUrl ? null : oldAudioPath || null),
        cover_url: null,
        cover_storage_path: null,
        sort_order: Number(form.get("sortOrder") || 0),
        enabled: form.get("enabled") === "on"
      };
      const result = id
        ? await supabase.from("tracks").update(payload).eq("id", id)
        : await supabase.from("tracks").insert(payload);
      if (result.error) throw result.error;
      if ((uploadedAudio || typedAudioUrl) && oldAudioPath && oldAudioPath !== uploadedAudio?.path) {
        await removeStoredFile("music", oldAudioPath);
      }
      els.backgroundTrackForm.reset();
      state.backgroundAutoplayAttempted = false;
      toast("背景音乐已经更新。", "success");
      await refreshAll();
    } catch (error) {
      if (uploadedAudio) await removeStoredFile("music", uploadedAudio.path);
      toast(error.message || "背景音乐没有保存成功。", "error");
    } finally {
      setBusy(els.backgroundTrackForm, false);
    }
  });
}

async function deleteBackgroundTrack(track) {
  if (!window.confirm(`删除背景音乐《${track.title}》？`)) return;
  const { error } = await supabase.from("tracks").delete().eq("id", track.id);
  if (error) return toast("背景音乐删除失败。", "error");
  await removeStoredFile("music", track.audio_storage_path);
  state.backgroundAutoplayAttempted = false;
  toast("背景音乐已经删除。", "success");
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

function trackTitleFromFileName(name) {
  return String(name || "未命名歌曲")
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .trim()
    .slice(0, 120) || "未命名歌曲";
}

function setupBulkTrackForm() {
  els.bulkTrackForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.isAdmin) return;
    const form = new FormData(els.bulkTrackForm);
    const files = form.getAll("audioFiles").filter(file => file instanceof File && file.size > 0);
    if (!files.length) return toast("请先选择要导入的音频文件。", "error");
    const startOrder = Number(form.get("sortOrder") || 0);
    const enabled = form.get("enabled") === "on";
    const failures = [];
    let saved = 0;
    setBusy(els.bulkTrackForm, true);
    for (const [index, file] of files.entries()) {
      let uploadedAudio = null;
      els.bulkTrackStatus.textContent = `正在上传 ${index + 1}/${files.length}：${file.name}`;
      try {
        uploadedAudio = await uploadFile("music", file, "audio", 30 * 1024 * 1024, ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/wav"]);
        const { error } = await supabase.from("tracks").insert({
          title: trackTitleFromFileName(file.name),
          artist: null,
          audio_url: uploadedAudio.url,
          audio_storage_path: uploadedAudio.path,
          cover_url: null,
          cover_storage_path: null,
          sort_order: startOrder + index,
          enabled
        });
        if (error) throw error;
        saved += 1;
      } catch (error) {
        if (uploadedAudio) await removeStoredFile("music", uploadedAudio.path);
        failures.push(`${file.name}：${error.message || "上传失败"}`);
      }
    }
    setBusy(els.bulkTrackForm, false);
    els.bulkTrackForm.reset();
    if (saved) await refreshAll();
    if (failures.length) {
      els.bulkTrackStatus.textContent = `${saved} 首成功，${failures.length} 首失败。${failures.slice(0, 2).join("；")}`;
      toast(`${saved} 首已导入，${failures.length} 首没有成功。`, "error");
    } else {
      els.bulkTrackStatus.textContent = `${saved} 首歌曲已经全部导入，可以在右侧继续编辑歌名、歌手和封面。`;
      toast(`${saved} 首歌曲已经导入。`, "success");
    }
  });
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

function setupAdminForms() {
  setupNoteForm();
  setupPhotoForm();
  setupTrackForm();
  setupBackgroundTrackForm();
  setupBulkTrackForm();
  els.refreshComments.addEventListener("click", loadAdminData);
  [els.photoForm, els.trackForm, els.backgroundTrackForm].forEach(form => form.addEventListener("reset", () => {
    window.setTimeout(() => $$('input[type="hidden"]', form).forEach(input => { input.value = ""; }), 0);
  }));
}

async function init() {
  setupNavigation();
  setupDialogs();
  setupPlayer();
  setupLyrics();
  setupBackgroundPlayer();
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
