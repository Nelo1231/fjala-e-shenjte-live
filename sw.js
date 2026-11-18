/* Punon pa internet: ruan aplikacionin dhe tekstet në telefon. */
const VERSION = "fs-v111";
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
  if (/\/img\/apostujt\/|\/images\/shenjtoret\/|\/ig_[^/]*$|\/data\/imazhet_\d\d\.json|\/data\/shenjtoret_dites\.json/.test(url.pathname)) {
    e.respondWith(fetch(e.request, { cache: "no-store" }));
    return;
  }
  // YouTube luhet gjithmonë drejtpërdrejt nga rrjeti
  if (/youtube|ytimg|googlevideo/.test(url.hostname)) return;
  // fotot e lajmeve (UGO.al, KOASH, Orthodox Times): zero cache, as në disk as në memorien e shërbyesit
  if (/(^|\.)(ugo\.al|orthodoxalbania\.org|orthodoxtimes\.com|vaticannews\.va)$/.test(url.hostname) || /lajme_bota\.json|shkolla\.json|mitropolite\.json|vatikan\.json/.test(url.pathname)) {
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

/* ---------- Njoftimet për versionin web (pa Android): Gazeta 20:00, Gazetat e javës të dielën 12:00, lajme të reja ---------- */
const NKEY = "fs-notify-state";
async function nState(set) {
  const c = await caches.open("fs-notify");
  if (set) return c.put(NKEY, new Response(JSON.stringify(set)));
  const r = await c.match(NKEY);
  return r ? r.json() : {};
}
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
async function notifyCheck() {
  if (self.Notification && Notification.permission !== "granted") return;
  const st = await nState(), now = new Date(), day = isoDay(now);
  const show = (tag, title, body, route) => self.registration.showNotification(title, { body, tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { route } });
  if (now.getHours() >= 20 && st.gz !== day) { st.gz = day; await show("gazeta", "🗞 Gazeta e ditës gati", "Fjala e Shenjtë · lajmet e sotme", "#/gazeta"); }
  if (now.getDay() === 0 && now.getHours() >= 12 && st.wk !== day) { st.wk = day; await show("javore", "⛪ Gazetat e javës dolën", "Mitropolitë, Fanari dhe Vatikani · lajmet e kësaj jave", "#/gazetat"); }
  try {
    const r = await fetch("data/lajme_bota.json?t=" + Date.now(), { cache: "no-store" });
    if (r.ok) {
      const items = ((await r.json()).items || []).filter((n) => (n.lang || "sq") === "sq");
      const top = items[0];
      if (top && st.news && st.news !== top.link) await show("lajme", "📰 Lajm i ri", top.title, "#/kisha");
      if (top) st.news = top.link;
    }
  } catch (e) { /* pa internet */ }
  await nState(st);
}
self.addEventListener("periodicsync", (e) => { if (e.tag === "fs-check") e.waitUntil(notifyCheck()); });
self.addEventListener("message", (e) => { if (e.data === "fs-check") e.waitUntil ? e.waitUntil(notifyCheck()) : notifyCheck(); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const route = (e.notification.data && e.notification.data.route) || "#/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => "focus" in x);
    if (c) { c.navigate ? c.navigate(new URL("./" + route, self.registration.scope).href) : null; return c.focus(); }
    return self.clients.openWindow("./" + route);
  }));
});

