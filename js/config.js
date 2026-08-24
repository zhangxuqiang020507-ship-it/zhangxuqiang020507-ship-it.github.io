// Supabase 的 Project URL 和 publishable key 本来就是给浏览器使用的公开配置。
// 不要在这里放 service_role key、数据库密码或任何私密凭据。
window.SITE_CONFIG = Object.freeze({
  supabaseUrl: "https://wutwnfokgwjjpghlcpup.supabase.co",
  supabasePublishableKey: "sb_publishable_oMblIi6QX_xJhJJwG_McdA_o2R6ofAs",
  ownerDisplayName: "张旭强",
  backgroundVolume: 0.28,
  defaultBackgroundTracks: [
    { title: "初恋（月色真美 第三集插曲）", artist: "Kyle Xian", audioUrl: "./assets/audio/background/01-kyle-xian-first-love.mp3" },
    { title: "風花", artist: "MANYO", audioUrl: "./assets/audio/background/02-manyo-kazahana.mp3" },
    { title: "벚꽃", artist: "October", audioUrl: "./assets/audio/background/03-october-cherry-blossom.mp3" },
    { title: "창가에서", artist: "October", audioUrl: "./assets/audio/background/04-october-by-the-window.mp3" },
    { title: "Destiny (Piano Ver.)", artist: "Rainy Day", audioUrl: "./assets/audio/background/05-rainy-day-destiny.mp3" },
    { title: "니가 없는 시간 (Piano Ver.)", artist: "Rainy Day", audioUrl: "./assets/audio/background/06-rainy-day-time-without-you.mp3" },
    { title: "Send Me a Letter", artist: "Robin Spielberg", audioUrl: "./assets/audio/background/07-robin-spielberg-send-me-a-letter.mp3" },
    { title: "风居住的街道（Piano ver）", artist: "饭碗的彼岸", audioUrl: "./assets/audio/background/08-wind-lives-in-the-street.mp3" },
    { title: "一番星（钢琴 Cover）", artist: "昼夜", audioUrl: "./assets/audio/background/09-ichibanboshi-piano.mp3" }
  ]
});
