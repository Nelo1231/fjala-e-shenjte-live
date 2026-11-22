/* Punon pa internet: ruan aplikacionin dhe tekstet në telefon. */
const VERSION = "fs-v154";
const SHELL = [
  "./", "index.html", "css/app.css", "css/glass.css", "js/app.js", "js/lexime.js", "js/share.js", "js/music.js",
  "data/psaltiri.js", "data/kuizi.js", "data/eterit.js", "data/ungjilli.js", "data/apostulli.js", "data/profecite.js", "data/flipbooks.js", "data/tipikoja.js", "data/sherbesa.js", "data/imazhet.js", "data/jerontikoni.js", "data/himnet.js", "data/pasdarka.js", "js/cross.js", "js/radio.js", "manifest.webmanifest",
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
  // librat e Kishës (pdf/…): shfletuesi i merr vetë, me pjesë (Range); nuk ruhen në cache
  if (/\/pdf\/.+\.pdf$/i.test(url.pathname)) return;
  // YouTube luhet gjithmonë drejtpërdrejt nga rrjeti
  if (/youtube|ytimg|googlevideo/.test(url.hostname)) return;
  // fotot e lajmeve (UGO.al, KOASH, Orthodox Times): zero cache, as në disk as në memorien e shërbyesit
  if (/(^|\.)(ugo\.al|orthodoxalbania\.org|orthodoxtimes\.com|vaticannews\.va)$/.test(url.hostname) || /lajme_bota\.json|shkolla\.json|mitropolite\.json|vatikan\.json|transmetimet\.json|kinema\.json/.test(url.pathname)) {
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

/* ---------- Njoftimet për versionin web (pa Android): Gazeta 20:00, Gazetat e javës të dielën 20:00, lajme të reja ---------- */
const NKEY = "fs-notify-state";
async function nState(set) {
  const c = await caches.open("fs-notify");
  if (set) return c.put(NKEY, new Response(JSON.stringify(set)));
  const r = await c.match(NKEY);
  return r ? r.json() : {};
}
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// secili lloj njoftimi ndizet / fiket te Cilësimet e aplikacionit (st.prefs)
const getJson = async (u) => { try { const r = await fetch(u + "?t=" + Date.now(), { cache: "no-store" }); return r.ok ? await r.json() : null; } catch (e) { return null; } };
// një kontroll në një kohë: ping-u çdo 5 min, kthimi në aplikacion dhe periodicsync mund të vijnë njëkohësisht
// dhe pa këtë do lexonin të njëjtën gjendje e do jepnin të njëjtin njoftim dy herë
let nBusy = null;
function notifyCheck() {
  if (!nBusy) nBusy = notifyRun().catch(() => {}).finally(() => { nBusy = null; });
  return nBusy;
}
// mban mend çfarë është parë (jo vetëm të fundit), që një lajm/video i vjetër që rikthehet në krye të mos njoftohet sërish
const remember = (arr, add, max) => [...new Set([...(arr || []), ...add])].slice(-max);
async function notifyRun() {
  if (self.Notification && Notification.permission !== "granted") return;
  const st = await nState(), now = new Date(), day = isoDay(now);
  const on = (k) => !st.prefs || st.prefs[k] !== false;
  const show = (tag, title, body, route) => self.registration.showNotification(title, { body, tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { route } });
  if (now.getHours() >= 20 && st.gz !== day) { st.gz = day; if (on("gazeta")) await show("gazeta", "🗞 Gazeta e ditës gati", "Fjala e Shenjtë · lajmet e sotme", "#/gazeta"); }
  if (now.getDay() === 0 && now.getHours() >= 20 && st.wk !== day) { st.wk = day; if (on("javore")) await show("javore", "⛪ Gazetat e javës dolën", "Mitropolitë, Fanari dhe Vatikani · lajmet e kësaj jave", "#/gazetat"); }
  const news = await getJson("data/lajme_bota.json");
  if (news) {
    const sq = (news.items || []).filter((n) => n && n.link && (n.lang || "sq") === "sq");
    if (st.newsSeen) {
      const seen = new Set(st.newsSeen);
      // vetëm lajme vërtet të reja: të papara dhe (kur kanë datë) jo më të vjetra se 2 ditë
      const fresh = sq.filter((n) => !seen.has(n.link) && (!n.date || Date.now() - Date.parse(n.date) < 2 * 864e5 || isNaN(Date.parse(n.date))));
      if (fresh.length && on("news")) await show("lajme", "📰 Lajm i ri", fresh[0].title + (fresh.length > 1 ? ` (+${fresh.length - 1})` : ""), "#/kisha");
    }
    st.newsSeen = remember(st.newsSeen || (st.news ? [st.news] : []), sq.map((n) => n.link), 600);
  }
  // Shërbesat live: shërbesa më e re e Radio Ngjallja (kur ka nisur ose po nis)
  const lv = await getJson("data/transmetimet.json");
  if (lv) {
    const svcs = (lv.videos || []).filter((v) => v && v.id && v.svc && Date.parse(v.date) <= Date.now() + 15 * 6e4);
    const svc = svcs[0];
    if (svc && st.liveSeen && !st.liveSeen.includes(svc.id) && Date.now() - Date.parse(svc.date) < 3 * 36e5 && on("live")) await show("live", "🔴 LIVE · Radio Ngjallja", svc.title, "#/transmetime");
    st.liveSeen = remember(st.liveSeen || (st.live ? [st.live] : []), svcs.map((v) => v.id), 300);
  }
  // Kinemaja: film, seri ose episod i ri + premierat që ke ruajtur
  const kn = await getJson("data/kinema.json");
  if (kn) {
    const keys = [], names = {};
    (kn.items || []).forEach((x) => {
      if (!x || !x.id || x.statusi === "së shpejti") return;
      keys.push("t:" + x.id); names["t:" + x.id] = (x.tipi === "seri" || x.tipi === "serial" ? "Seri e re: " : "Film i ri: ") + x.titulli;
      (x.episodet || []).forEach((e) => { const k = "e:" + x.id + ":" + (e.id || e.nr); keys.push(k); names[k] = "Episod i ri: " + (e.titulli || "") + " · " + x.titulli; });
    });
    if (st.kn) {
      const old = new Set(st.kn), fresh = keys.filter((k) => !old.has(k));
      if (fresh.length && on("kinema")) await show("kinema", "🎬 E re në Kinema", names[fresh[0]] + (fresh.length > 1 ? ` (+${fresh.length - 1})` : ""), "#/kinema");
    }
    st.kn = remember(st.kn, keys, 4000);   // bashkim: një titull që mungon përkohësisht s'njoftohet sërish kur kthehet
  }
  if (on("kinema")) for (const r of st.knRemind || []) {
    if (r.d === day && now.getHours() >= 9 && !(st.knDone || []).includes(r.id)) { st.knDone = (st.knDone || []).concat(r.id).slice(-60); await show("kn-" + r.id, "🎬 Premiera sot në Kinema", r.t || "", "#/kinema/t/" + encodeURIComponent(r.id)); }
  }
  await nState(st);
}
async function savePrefs(d) { const st = await nState(); st.prefs = d.fsPrefs; if (Array.isArray(d.knRemind)) st.knRemind = d.knRemind; await nState(st); }
self.addEventListener("periodicsync", (e) => { if (e.tag === "fs-check") e.waitUntil(notifyCheck()); });
self.addEventListener("message", (e) => {
  const job = e.data === "fs-check" ? notifyCheck() : e.data && e.data.fsPrefs ? savePrefs(e.data) : null;
  if (job && e.waitUntil) e.waitUntil(job);
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const route = (e.notification.data && e.notification.data.route) || "#/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => "focus" in x);
    if (c) { c.navigate ? c.navigate(new URL("./" + route, self.registration.scope).href) : null; return c.focus(); }
    return self.clients.openWindow("./" + route);
  }));
});

