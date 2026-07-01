const C = "tools-v33";
// 重要ファイル（小さい・確実に入れたい）：addAllと違い1つ失敗しても他は入る
const CORE = ["./", "./index.html", "./sekigae.html", "./keisan.html", "./hyakumasu.html", "./kanji.html", "./timer.html", "./touban.html", "./shojo.html", "./roulette.html", "./waku.html", "./han.html", "./meibo.html",
  "./manifest.webmanifest", "./sekigae.webmanifest", "./keisan.webmanifest", "./hyakumasu.webmanifest", "./kanji.webmanifest", "./timer.webmanifest", "./touban.webmanifest", "./shojo.webmanifest", "./roulette.webmanifest", "./waku.webmanifest", "./han.webmanifest", "./meibo.webmanifest",
  "./icon-192.png", "./icon-512.png"];
// 大きい画像はinstallをブロックしないよう裏で後追いキャッシュ
const EXTRA = ["./logo.png", "./ogp.png", "./hero.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(C);
    await Promise.allSettled(CORE.map(u => c.add(u)));   // HTML等を最優先で確実に
    await self.skipWaiting();
    Promise.allSettled(EXTRA.map(u => c.add(u)));         // 大物は待たずに
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// HTML（ページ本体）はネットワーク優先＝オンラインなら常に最新が届く。
// 画像などの重い静的ファイルはキャッシュ優先＝速度を保つ。
// これにより「URLは同じまま・開くたび最新」を、バージョン番号の上げ忘れに依存せず担保する。
function isHtml(req) {
  if (req.mode === "navigate") return true;              // ページ遷移
  const p = new URL(req.url).pathname;
  return p.endsWith(".html") || p.endsWith("/") ||
         p.endsWith(".webmanifest") || p.endsWith("sw.js");
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return; // 外部（カウンター等）は素通し

  if (isHtml(req)) {
    // network-first：まず最新を取りに行き、成功したらキャッシュも更新。失敗時だけキャッシュへ退避
    e.respondWith((async () => {
      try {
        const resp = await fetch(req, { cache: "no-store" });
        const cp = resp.clone();
        caches.open(C).then(c => c.put(req, cp));
        return resp;
      } catch (err) {
        // オフライン時：残っているページを返して白画面/エラーを避ける
        return (await caches.match(req)) ||
               (req.mode === "navigate" &&
                 ((await caches.match("./index.html")) ||
                  (await caches.match("./")))) ||
               Response.error();
      }
    })());
    return;
  }

  // それ以外（画像・アイコン等）：cache-first
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      const cp = resp.clone();
      caches.open(C).then(c => c.put(req, cp));
      return resp;
    } catch (err) {
      throw err;
    }
  })());
});
