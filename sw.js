const C = "tools-v6";
const ASSETS = ["./", "./index.html", "./sekigae.html", "./keisan.html", "./manifest.webmanifest", "./sekigae.webmanifest", "./keisan.webmanifest", "./icon-192.png", "./icon-512.png", "./hero.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // 外部（カウンター等）はキャッシュせず素通し
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const cp = resp.clone(); caches.open(C).then(c => c.put(e.request, cp)); return resp;
    }).catch(() => caches.match("./index.html")))
  );
});
