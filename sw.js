/* Punon pa internet: ruan aplikacionin dhe tekstet në telefon. */
const VERSION = "fs-v84";
const SHELL = [
  "./", "index.html", "css/app.css", "css/glass.css", "js/app.js", "js/share.js", "js/music.js",
  "data/psaltiri.js", "data/kuizi.js", "data/eterit.js", "data/ungjilli.js", "data/apostulli.js", "data/profecite.js", "data/tipikoja.js", "data/sherbesa.js", "data/imazhet.js", "data/jerontikoni.js", "data/himnet.js", "data/pasdarka.js", "js/cross.js", "js/radio.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Përditësimet e APK-së: kurrë nga cache-i, gjithmonë direkt nga interneti
  if (/netlify\.app$/.test(url.hostname) || /update\.json$/.test(url.pathname) || (/github\.io$/.test(url.hostname) && /\.json$/.test(url.pathname))) {
    e.respondWith(fetch(e.request, { cache: "no-store" }));
    return;
  }
  // Ikonat e ditës (ig_*, apostujt, listat mujore): kurrë në cache, gjithmonë direkt nga interneti
  if (/\/img\/apostujt\/|\/ig_[^/]*$|\/data\/imazhet_\d\d\.json/.test(url.pathname)) {
    e.respondWith(fetch(e.request, { cache: "no-store" }));
    return;
  }
  // YouTube luhet gjithmonë drejtpërdrejt nga rrjeti
  if (/youtube|ytimg|googlevideo/.test(url.hostname)) return;
  // fotot e lajmeve (UGO.al, KOASH, Orthodox Times): zero cache, as në disk as në memorien e shërbyesit
  if (/(^|\.)(ugo\.al|orthodoxalbania\.org|orthodoxtimes\.com)$/.test(url.hostname) || /lajme_bota\.json|shkolla\.json/.test(url.pathname)) {
    e.respondWith(fetch(e.request, { cache: "no-store" }).catch(() => new Response("", { status: 504 })));
    return;
  }
  const isFont = /fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;
  // Rrjeti së pari (që përditësimet të arrijnë), pastaj cache-i kur s'ka internet
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || (e.request.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
