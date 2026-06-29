const C = "tools-v10";
// 重要ファイル（小さい・確実に入れたい）：addAllと違い1つ失敗しても他は入る
const CORE = ["./", "./index.html", "./sekigae.html", "./keisan.html", "./timer.html",
  "./manifest.webmanifest", "./sekigae.webmanifest", "./keisan.webmanifest", "./timer.webmanifest",
  "./icon-192.png", "./icon-512.png"];
// 大きい画像はinstallをブロックしないよう裏で後追いキャッシュ
const EXTRA = ["./hero.png"];

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

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return; // 外部（カウンター等）は素通し
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      const cp = resp.clone();
      caches.open(C).then(c => c.put(req, cp));
      return resp;
    } catch (err) {
      // オフライン時：ページ遷移なら、その端末に残っているページを返す（白画面/エラーを避ける）
      if (req.mode === "navigate") {
        return (await caches.match(req)) ||
               (await caches.match("./keisan.html")) ||
               (await caches.match("./sekigae.html")) ||
               (await caches.match("./index.html")) ||
               (await caches.match("./")) ||
               Response.error();
      }
      throw err;
    }
  })());
});
