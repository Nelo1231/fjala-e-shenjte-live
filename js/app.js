/* Fjala e Shenjtë — si Reels / TikTok: rrëshqit lart për fjalën tjetër. */
(function () {
  "use strict";

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  // Emrat sipas traditës ortodokse: Joani, Jisui, Pavli (edhe në tekstet që vijnë nga faqet e tjera)
  const L = "\\p{L}";
  const ORTHO = [
    [new RegExp(`(?<!${L})Gjon(?=(i|it|in|a|)(?!${L}))`, "gu"), "Joan"], [new RegExp(`(?<!${L})GJON(?=(I|IT|IN|)(?!${L}))`, "gu"), "JOAN"],
    [new RegExp(`(?<!${L})Jezu(?=(s|si|sit|sin)(?!${L}))`, "gu"), "Jisu"], [new RegExp(`(?<!${L})JEZU(?=(S|SI|SIT|SIN)(?!${L}))`, "gu"), "JISU"],
    [new RegExp(`(?<!${L})Jisus(?=(i|it|in|)(?!${L}))`, "gu"), "Jisu"], [new RegExp(`(?<!${L})JISUS`, "gu"), "JISU"],
    [new RegExp(`(?<!${L})Pal(i|it|in)(?!${L})`, "gu"), "Pavl$1"], [new RegExp(`(?<!${L})Pal(?!${L})`, "gu"), "Pavël"],
    [new RegExp(`(?<!${L})PAL(I|IT|IN)(?!${L})`, "gu"), "PAVL$1"],
  ];
  const ortho = (s) => { let t = String(s == null ? "" : s); for (const [re, to] of ORTHO) t = t.replace(re, to); return t; };
  const esc = (s) => ortho(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (id) => `<svg><use href="#i-${id}"/></svg>`;
  // ndan fjalinë në rreshta sipas kuptimit (te pikësimi dhe para lidhëzave), jo rastësisht
  function senseLines(text) {
    const t = ortho(String(text || "")).replace(/\s+/g, " ").trim();
    if (t.includes("\n") || t.length < 46) return esc(t);
    let parts = t.split(/(?<=[,;:.!?»”])\s+(?=\S)/);
    const out = [];
    parts.forEach((p) => {
      // pjesët e gjata: ndaji para lidhëzave kryesore
      if (p.length > 58) {
        const sub = p.split(/\s+(?=(?:dhe|edhe|por|sepse|se|që|kur|nëse|si|ashtu|ndërsa|aq|pa|deri)\s)/);
        let cur = "";
        sub.forEach((w) => { if (cur && (cur + " " + w).length > 52) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; });
        if (cur) out.push(cur);
      } else out.push(p);
    });
    // bashko copat shumë të shkurtra me fqinjin
    const merged = [];
    out.forEach((p) => { if (merged.length && (p.length < 16 || merged[merged.length - 1].length < 16) && (merged[merged.length - 1] + " " + p).length <= 60) merged[merged.length - 1] += " " + p; else merged.push(p); });
    return merged.map((l, i) => `<span class="ln">${i === 0 ? "“" : ""}${esc(l)}${i === merged.length - 1 ? "”" : ""}</span>`).join("");
  }
  const rand = (n) => Math.floor(Math.random() * n);
  const NL = String.fromCharCode(10);
  let focusNext = null;   // pasazhi i reel-it që hapet te "Lexo" (për ta theksuar)

  // thekso saktësisht pjesën e reel-it brenda paragrafit të plotë
  function markExcerpt(el, excerpt) {
    if (!el || !excerpt) return;
    const full = el.textContent;
    let ex = excerpt.trim();
    let at = full.indexOf(ex);
    if (at < 0) { ex = ex.replace(/[.,;:]$/, ""); at = full.indexOf(ex); }
    if (at < 0) { ex = ex.slice(0, 40); at = full.indexOf(ex); if (at >= 0) ex = full.slice(at, at + excerpt.length); }
    if (at < 0) return;
    const who = el.querySelector(".who, sup");
    const pre = who ? who.outerHTML : "";
    const body = who ? full.slice(who.textContent.length) : full;
    const k = body.indexOf(ex);
    if (k < 0) return;
    el.innerHTML = pre + esc(body.slice(0, k)) + `<mark class="hl">${esc(ex)}</mark>` + esc(body.slice(k + ex.length));
  }

  const app = $("#app");
  const listPane = $("#paneList");
  const mainPane = $("#paneMain");
  const feedEl = $("#feed");
  const android = window.FSAndroid || null;

  /* =====================================================================
     RUAJTJA + PROFILET (secili person ka pëlqimet dhe shënimet e veta)
     ===================================================================== */
  // ikonë e Sinaksarit: ka datë "MM-DD", është shënuar sinaksari, ose është ig_* e apostujve
  // Ftesë për të papagëzuarit — vargje të sakta nga Ungjilli dhe Veprat (tekst i KOASh-it në aplikacion)
  const INVITE = [
    ["Ejani tek unë gjithë sa jeni të lodhur e të ngarkuar, edhe unë do t'ju preh ju.", "Mattheu 11:28"],
    ["Unë jam udha edhe e vërteta edhe jeta. Asnjë s'vjen tek Ati, veçse me anën time.", "Joani 14:6"],
    ["Unë jam drita e botës. Ai që më vjen pas, nuk do të ecë në errësirë, por do të ketë dritën e jetës.", "Joani 8:12"],
    ["Pendohuni, edhe gjithësecili prej jush le të pagëzohet në emrin e Jisu Krishtit, për ndjesën e mëkateve; edhe do të merrni dhuratën e Frymës së Shenjtë.", "Veprat 2:38"],
    ["Pendohuni, sepse u afrua mbretëria e qiejve.", "Mattheu 4:17"],
  ];
  // Ngushëllim për kohën e kanonit (pa Kungim)
  const COMFORT = [
    ["S'kam ardhur të thërres të drejtë, por mëkatarë në pendim.", "Lluka 5:32"],
    ["Po ju them juve, se kështu do të jetë më tepër gëzim në qiell për një mëkatar që pendohet, se për nëntëdhjetë e nëntë të drejtë, të cilët s'kanë nevojë për pendim.", "Lluka 15:7"],
    ["Zoti është pranë atyre që kanë zemër të dërrmuar; dhe shpëton të përulurit në frymë.", "ps:33:18"],
    ["Therore ndaj Perëndisë është shpirti i dërrmuar; zemrën e dërrmuar dhe të përulur Perëndia nuk do ta përbuzë.", "ps:50:16"],
    ["Krijo zemër të pastër tek unë, o Perëndi, dhe përtëri frymë të drejtë në thellësitë e zemrës sime.", "ps:50:10"],
  ];
  const unbaptized = () => store.get("me.unbaptized", false);
  const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  // kanoni (epitimia): data kur mund të kungohesh përsëri (ruhet vetëm data)
  const canonUntil = () => { const u = store.get("rr.canonUntil", ""); return u && u > isoToday() ? u : ""; };
  const daysTo = (iso) => Math.max(0, Math.round((new Date(iso + "T12:00:00") - new Date(isoToday() + "T12:00:00")) / 864e5));
  const fmtIso = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"][m - 1]} ${y}`; };
  const refTxt = (r) => (/^ps:/.test(r) ? (() => { const [, n, v] = r.split(":"); return psalmRef(+n, +v); })() : r);
  function isDayIcon(im) { return !!(im && (im.sinaksari || im.date || /img\/apostujt\/ig_/.test(im.file || ""))); }
  const store = {
    get(k, d) { try { const v = localStorage.getItem("fs." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("fs." + k, JSON.stringify(v)); } catch (e) { /* */ } },
  };
  let profiles = store.get("profiles", null);
  if (!profiles) {
    profiles = [{ id: "p1", name: "Unë" }];
    store.set("profiles", profiles);
    const old = store.get("likes", null);          // pëlqimet e versionit të vjetër
    if (old) store.set("likes.p1", old);
  }
  let pid = store.get("profile", profiles[0].id);
  if (!profiles.some((p) => p.id === pid)) pid = profiles[0].id;
  let likes = store.get("likes." + pid, {});
  let notes = store.get("notes." + pid, []);
  const profileName = () => (profiles.find((p) => p.id === pid) || profiles[0]).name;

  function switchProfile(id) {
    pid = id;
    store.set("profile", id);
    likes = store.get("likes." + pid, {});
    notes = store.get("notes." + pid, []);
    toast("Profili: " + profileName());
    route();
  }

  let readSize = store.get("readSize", 21);
  document.documentElement.style.setProperty("--read-size", readSize + "px");

  function isLiked(id) { return !!likes[id]; }
  function toggleLike(item, quiet) {
    if (likes[item.id]) delete likes[item.id];
    else likes[item.id] = { text: item.text, ref: item.ref, link: item.link || "", at: Date.now(),
      kind: item.kind || (item.id.startsWith("ps:") ? "psaltiri" : item.id.split(":")[0]), photo: item.photo || "", photoCat: item.photoCat || "" };
    store.set("likes." + pid, likes);
    if (!quiet) toast(likes[item.id] ? "U ruajt te të pëlqyerat ♥" : "U hoq nga të pëlqyerat");
    return !!likes[item.id];
  }
  function saveNotes() { store.set("notes." + pid, notes); }

  /* ---------- Të dhënat: ngarkohen si <script>, punon edhe pa server ---------- */
  const data = {};
  let sharedPick = null;   // zgjedhësi i fotove të Kreut, edhe për Ndaj
  const loading = {};
  function load(name) {
    if (data[name] !== undefined) return Promise.resolve(data[name]);
    if (loading[name]) return loading[name];
    loading[name] = new Promise((resolve) => {
      window.FS_DATA = window.FS_DATA || {};
      if (window.FS_DATA[name]) { data[name] = window.FS_DATA[name]; return resolve(data[name]); }
      const s = document.createElement("script");
      s.src = `data/${name}.js`;
      s.onload = () => { data[name] = window.FS_DATA[name] || null; resolve(data[name]); };
      s.onerror = () => { data[name] = null; resolve(null); };
      document.head.appendChild(s);
    });
    return loading[name];
  }

  /* =====================================================================
     REFERENCAT E SAKTA: "Mattheu 15:29-31", "Romakëve 8:28-39", "Psalmi 22:1"
     ===================================================================== */
  const GOSPEL = { joanit: "Joani", mattheut: "Mattheu", mateut: "Mattheu", llukait: "Lluka", markut: "Marku" };
  const EPISTLE = [
    [/veprat/, "Veprat"],
    [/parë katholike e petro/, "1 Petri"], [/dytë katholike e petro/, "2 Petri"],
    [/parë katholike e joanit/, "1 Joanit"], [/dytë katholike e joanit/, "2 Joanit"], [/tretë katholike e joanit/, "3 Joanit"],
    [/jakovit/, "Jakovi"], [/judh/, "Juda"],
    [/parë e pavlit\s+për korinth/, "1 Korinthianëve"], [/dytë e pavlit\s+për korinth/, "2 Korinthianëve"],
    [/parë e pavlit\s+për thesalonik/, "1 Thesalonikasve"], [/dytë e pavlit\s+për thesalonik/, "2 Thesalonikasve"],
    [/parë e pavlit\s+për timothe/, "1 Timotheut"], [/dytë e pavlit\s+për timothe/, "2 Timotheut"],
    [/romak/, "Romakëve"], [/galat/, "Galatianëve"], [/efes/, "Efesianëve"], [/filipian/, "Filipianëve"],
    [/kolos/, "Kolosianëve"], [/titin/, "Titit"], [/filimon/, "Filimonit"], [/hebre/, "Hebrenjve"],
  ];
  function chapterPart(ref) {
    const m = String(ref || "").match(/(\d+\s*:\s*\d[\d\s,;:\-–.]*)$/);
    return m ? m[1].replace(/\s+/g, " ").replace(/\s*([,;:\-–])\s*/g, (x, c) => (c === "," || c === ";" ? c + " " : c)).replace(/[.\s]+$/, "") : null;
  }
  function niceRef(key, ref) {
    const ch = chapterPart(ref);
    const low = String(ref || "").toLowerCase();
    let book = null;
    if (key === "ungjilli") {
      const m = low.match(/sipas\s+(\w+)/);
      book = m ? GOSPEL[m[1]] : null;
    } else if (key === "apostulli") {
      const hit = EPISTLE.find(([re]) => re.test(low));
      book = hit ? hit[1] : null;
    }
    if (book && ch) return `${book} ${ch}`;
    return ref || "";
  }
  const psalmRef = (n, v) => (v ? `Psalmi ${n}:${v}` : `Psalmi ${n}`);

  /* ---------- Ndihmës ---------- */
  function shortText(t, max = 300) {
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "), cut.lastIndexOf(": "));
    return (end > 80 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(" ")) + " …").trim();
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  const wide = () => window.matchMedia("(min-width: 640px), (horizontal-viewport-segments: 2), (vertical-viewport-segments: 2), (device-posture: folded)").matches || app.classList.contains("flex-mode");
  function setMode(mode) { app.dataset.mode = mode; }
  function dayIndex() {
    const d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  const MUAJT = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
  const fmtDate = (d) => { d = new Date(d); return `${d.getDate()} ${MUAJT[d.getMonth()]} ${d.getFullYear()}`; };
  // animacion i butë kur ndërrohet përmbajtja
  function enter(el) { el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }
  // dridhje e fortë: në Android me amplitudë të plotë nga vibratori i telefonit
  function haptic(p, strong) {
    const arr = Array.isArray(p) ? p : [p];
    try {
      if (android && android.haptic) { android.haptic(JSON.stringify(arr), strong ? 255 : 160); return; }
      if (navigator.vibrate) navigator.vibrate(arr);
    } catch (e) { /* */ }
  }
  function longPress(el, fn, ms = 550) {
    let t = null, x = 0, y = 0;
    el.addEventListener("pointerdown", (e) => { x = e.clientX; y = e.clientY; t = setTimeout(() => { t = null; fn(e); }, ms); });
    const cancel = () => { clearTimeout(t); t = null; };
    el.addEventListener("pointermove", (e) => { if (Math.abs(e.clientX - x) + Math.abs(e.clientY - y) > 12) cancel(); });
    el.addEventListener("pointerup", cancel);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* =====================================================================
     REELS — gjithmonë të përziera; "inteligjente": mësojnë nga ♥ dhe ora e ditës
     ===================================================================== */
  const Feed = (() => {
    const WEIGHTS = { eterit: 0.50, psaltiri: 0.26, ungjilli: 0.18, apostulli: 0.04, profecite: 0.02 };
    // vetëm fjalë të fuqishme e të plota (jo pjesë rrëfimi): fjalë kyçe shpirtërore, pa lidhëza në fillim
    const STRONG = /(Zot|Perëndi|zemr|shpirt|dashuri|dashur|Lum |paqe|mëshir|shpres|dritë|drita|besim|besoj|lut|lavd|shpëto|shpëtim|ngushëll|fal|ndihm|bekua|bekoft|mbretëri|jet[ëa]|frik|gëzim|gëzo|mëkat|pendo|e vërtet)/i;
    const WEAK_START = /^(Dhe|Edhe|Por|Sepse|Se |Atëherë|Kur |E |Pra|Pastaj|Prandaj|Ndërsa|Kështu|Ja |Mirëpo|Si |Ata |Ai |Ajo |Këto|Kjo |Këta|Ky |Nga |Në |Me |Për |Mbasi|Pasi|Ndërkaq|Ndaj|Domethënë|Gjithashtu|Andaj)/;
    const NARRATIVE = /(\b(i tha|u tha|thanë|thotë|tha atyre|u përgjigj|shkoi|erdhi|hyri|doli|zbriti|u ngrit|pyeti|iu afrua|ndodhi|ishte duke)\b)/i;
    // pa mallkime e fjalë të errëta (psalmet e gjyqit), pa pyetje: vetëm ngushëllim, lutje, lavdërim, mësim
    const DARK = /(kundër|padrejt|armiq|armik|zemërim|përpij|errësir|humbj|trondit|shkatërro|dënim|turpër|gjak|shpat|zjarr|mallkua|thyej|dërrmo|vrasë|vdekj|zhduk|ndëshk|hakmarr|i ligu|të ligjt|mëkatarët do)/i;
    const pithy = (t) => t.length >= 30 && t.length <= 165 && STRONG.test(t) && !WEAK_START.test(t) && !NARRATIVE.test(t) && !DARK.test(t)
      && /^[A-ZËÇ“«"]/.test(t) && /[.!»”]$/.test(t.trim()) && !/\?/.test(t);
    let items = [], active = -1, ready = false, seen = new Set(), lastPhoto = "";
    let bgImages = null;

    function backgrounds() {
      if (bgImages) return bgImages;
      bgImages = Share.BACKGROUNDS.map((bg) => {
        const c = document.createElement("canvas");
        c.width = 540; c.height = 960;
        bg.paint(c.getContext("2d"), 540, 960);
        return { url: c.toDataURL("image/jpeg", 0.85), bg };
      });
      return bgImages;
    }

    function taste() {
      const kinds = {}, cats = {};
      Object.values(likes).forEach((l) => {
        if (l.kind) kinds[l.kind] = (kinds[l.kind] || 0) + 1;
        if (l.photoCat) cats[l.photoCat] = (cats[l.photoCat] || 0) + 1;
      });
      return { kinds, cats };
    }
    function pickKind() {
      const ks = Object.keys(WEIGHTS);
      const t = taste().kinds;
      const w = ks.map((k) => WEIGHTS[k] * (1 + Math.min(3, (t[k] || 0) * 0.25)));
      let r = Math.random() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < ks.length; i++) { r -= w[i]; if (r <= 0) return ks[i]; }
      return ks[0];
    }

    let psPool = null;
    function makePsalm(ps) {
      if (!psPool) { psPool = []; ps.psalms.forEach((p) => p.v.forEach((t, vi) => { if (pithy(t)) psPool.push([p, vi]); })); }
      if (!psPool.length) return null;
      const [p, vi] = psPool[rand(psPool.length)];
      return { kind: "psaltiri", id: `ps:${p.n}:${vi + 1}`, text: p.v[vi], ref: psalmRef(p.n, vi + 1), link: `#/psaltiri/${p.n}`, ctx: { n: p.n, vi } };
    }

    function sentences(t) { return t.match(/[^.!?;:]+[.!?;:]+["'”»]?\s*|[^.!?;:]+$/g) || [t]; }

    // Vetëm lexime me referencë të saktë (libri + kreu:vargjet)
    const exactCache = {};
    function exactItems(key, book) {
      if (exactCache[key]) return exactCache[key];
      const out = [];
      book.sections.forEach((sec, si) => sec.items.forEach((it, ii) => {
        if (it.see || !it.v || !it.v.length) return;
        const r = niceRef(key, it.ref);
        if (r && /\d+:\d/.test(r) && r !== it.ref) out.push([si, ii, r]);
      }));
      return (exactCache[key] = out);
    }

    // Ungjilli: vetëm fjalë të fuqishme (sidomos fjalët e Krishtit), me referencën e saktë
    const pithyCache = {};
    function pithyPool(key, book) {
      if (pithyCache[key]) return pithyCache[key];
      const out = [];
      exactItems(key, book).forEach(([si, ii, ref]) => {
        const it = book.sections[si].items[ii];
        it.v.forEach((para, pi) => sentences(para).forEach((raw) => {
          let t = raw.trim();
          const sp = /^(?:[^:“"«]{0,40}?\b(?:tha|thotë|i tha|u tha)(?: [^:]{0,25})?:\s*)(.+)$/.exec(t);   // “Tha Zoti: …” → vetëm fjala
          if (sp && /Zot|Jisu|Krisht/.test(t.slice(0, t.indexOf(":")))) t = sp[1].trim();
          t = t.replace(/^[“"«]|[”"»]$/g, "").trim();
          if (pithy(t) && /[.!?]$/.test(t)) out.push([si, ii, pi, t, ref]);
        }));
      });
      return (pithyCache[key] = out);
    }
    function makeBook(key, book) {
      {
        const pp = pithyPool(key, book);
        if (pp.length) {
          const [si, ii, pi, text, ref] = pp[rand(pp.length)];
          return { kind: key, id: `${key}:${si}:${ii}:${pi}:${text.length}`, text, ref, link: `#/${key}/${si}/${ii}`, ctx: { si, ii, pi } };
        }
      }
      const pool = exactItems(key, book);
      for (let tries = 0; tries < 30 && pool.length; tries++) {
        const [si, ii, ref] = pool[rand(pool.length)];
        const it = book.sections[si].items[ii];
        const pi = rand(it.v.length);
        const ss = sentences(it.v[pi]);
        const start = rand(Math.max(1, ss.length - 1));
        let text = "";
        for (let k = start; k < ss.length && (text + ss[k]).length < 185; k++) text += ss[k];
        text = text.trim();
        if (text.length < 40) continue;
        return { kind: key, id: `${key}:${si}:${ii}:${pi}:${start}`, text, ref, link: `#/${key}/${si}/${ii}`, ctx: { si, ii, pi } };
      }
      return null;
    }

    // Profecitë (Dhiata e Vjetër): disa vargje nga një lexim, me referencën e saktë
    let prophPool = null;
    function makeProphecy(pf) {
      if (!pf) return null;
      if (!prophPool) {
        prophPool = [];
        pf.sections.forEach((sec, si) => sec.items.forEach((it, ii) => it.blocks.forEach((b, bi) => {
          if (b.t === "ref" && /\d+:\d/.test(b.x)) {
            const nx = it.blocks[bi + 1];
            if (nx && (nx.t === "verse" || nx.t === "p")) prophPool.push([si, ii, bi + 1, b.x]);
          }
        })));
      }
      for (let tries = 0; tries < 20 && prophPool.length; tries++) {
        const [si, ii, bi, ref] = prophPool[rand(prophPool.length)];
        const b = pf.sections[si].items[ii].blocks[bi];
        let text = "";
        if (b.t === "verse") {
          const lines = b.x.split(NL);
          const start = rand(Math.max(1, lines.length - 3));
          for (let k = start; k < lines.length && (text + lines[k]).length < 170; k++) text += (text ? NL : "") + lines[k];
        } else {
          const ss = sentences(b.x);
          const start = rand(Math.max(1, ss.length - 1));
          for (let k = start; k < ss.length && (text + ss[k]).length < 185; k++) text += ss[k];
        }
        text = text.trim().replace(/[,;:]$/, ".");
        if (text.length < 50 || !pithy(text.replace(new RegExp(NL, "g"), " "))) continue;
        return { kind: "profecite", id: `pf:${si}:${ii}:${bi}:${text.length}`, text, ref, link: `#/profecite/${si}/${ii}`, ctx: { si, ii, pi: bi } };
      }
      return null;
    }

    function makeQuote(et) {
      let i = rand(et.quotes.length);
      for (let k = 0; k < 12 && et.quotes[i].t.length > 200; k++) i = rand(et.quotes.length);
      const q = et.quotes[i];
      return { kind: "eterit", id: `et:${i}`, text: q.t, ref: q.a, link: "#/eterit" };
    }

    /* ---------- Imazhi sipas kuptimit të tekstit ---------- */
    const W = (words) => new RegExp("(^|[^a-zëç])(" + words + ")", "i");
    const IMG_RULES = [
      [W("qiej|qiell|qiejve|qiellit|kupa e qiellit|firmament"), ["hapesira", "rruga_qumeshtit", "yjet"]],
      [W("yje|yjet|yll|yjeve"), ["rruga_qumeshtit", "yjet", "hapesira"]],
      [W("hëna|hënë|hënën"), ["hena", "yjet"]],
      [W("det|dete|detit|valë|valët|ujëra|ujërave|thellësi|thellësitë"), ["deti"]],
      [W("lumenj|lumi|lumit|burim|burimet|përrua|ujë|uji|ujin"), ["lumi", "deti"]],
      [W("mal|male|malin|malit|malet|kodra|kodrat|shkëmb|shkëmbi"), ["malet"]],
      [W("dele|delet|deleve|qengj|qengji|bariu|barinj|kope|kullot"), ["delet"]],
      [W("zog|zogj|zogjtë|shqiponj|pëllumb|krahë|krahëve|fole|dallëndysh"), ["zogjte"]],
      [W("dre|drenush|luan|luanë|kafsh|bisha|egërsira|peshk|peshq|bletë|mjaltë|kalë|kuaj"), ["kafshet"]],
      [W("dru|druri|drurët|pem|fryt|frytet|gjethe|ulli|ullinj|fik|cedr|kedr|palm"), ["bimet", "pyjet"]],
      [W("pyll|pyje|drurët e pyllit"), ["pyjet"]],
      [W("lule|lulet|zambak|bari i fushës|fushë|fushës|lulëzo|bar"), ["lulet"]],
      [W("grur|bukë|bukën|buka|farë|farën|mbjell|korr|kallinj|drithë"), ["gruri"]],
      [W("hardhi|rrush|vresht|verë|verën"), ["hardhia"]],
      [W("shkretëtir|shkreti|shkretë"), ["shkretetira"]],
      [W("shi|shiun|retë|reve|re|vesë|ylber|bubullim|vetëtim"), ["shiu"]],
      [W("dritë|drita|dritën|agim|mëngjes|ndriç|diell|diellit"), ["agimi"]],
      [W("dheu|dheun|dheut|toka|tokën|tokës|botë|bota|botën|kombe|kombet|krijes"), ["toka", "malet"]],
      [W("tempull|tempullin|kishë|kishën|kishës|altar|shtëpinë e zotit|shtëpia e zotit"), ["kishat_shqiperi", "kishat_bota", "kishat"]],
    ];
    const KIND_IMG = {
      psaltiri: ["agimi", "malet", "deti", "pyjet", "lulet", "yjet", "rruga_qumeshtit", "hapesira", "toka", "lumi", "delet", "zogjte", "kafshet", "bimet", "hena"],
      ungjilli: ["krishti", "festat", "hyjlindesja", "ikonat_shqiptare", "kishat_shqiperi", "krishti", "festat"],
      apostulli: ["apostujt", "festat", "ikonat_shqiptare", "kishat_bota", "kishat_shqiperi"],
      eterit: ["eterit", "ikonat_shqiptare", "kishat_bota", "kishat_shqiperi"],
      profecite: ["shkretetira", "malet", "agimi", "toka", "hapesira", "rruga_qumeshtit", "deti", "lumi", "festat"],
    };
    let photos = null;
    // fotot e shfaqura ruhen edhe pas mbylljes: asnjë nuk përsëritet pa dalë të gjitha të tjerat
    const usedPhotos = new Set(store.get("photos.used", []));
    const markUsed = (f) => { usedPhotos.add(f); clearTimeout(markUsed.t); markUsed.t = setTimeout(() => store.set("photos.used", [...usedPhotos]), 400); };
    sharedPick = (it) => pickPhoto(it);
    /* FS_REMOTE_IMAGES */
(function syncRemoteImages() {
  const REMOTE_BASE = 'https://nelo1231.github.io/fjala-e-shenjte-live';   // GitHub Pages
  const isRemoteHost = location.origin === REMOTE_BASE;
  function applyRemote(obj) {
    if (!obj || !Array.isArray(obj.images)) return;
    data.imazhet = data.imazhet || { images: [] };
    const list = data.imazhet.images;
    const norm = (s) => String(s || '').replace(REMOTE_BASE + '/', '');
    const remoteApostujt = new Set(obj.images.map((im) => norm(im.file)).filter((r) => r.startsWith('img/apostujt/')));
    let changed = false;
    if (remoteApostujt.size) {
      for (let i = list.length - 1; i >= 0; i--) {
        const rel = norm(list[i].file);
        if (rel.startsWith('img/apostujt/') && !remoteApostujt.has(rel)) { list.splice(i, 1); changed = true; }
      }
    }
    const seen = new Set(list.map((x) => norm(x.file)));
    // fotot e reja nga serveri hyjnë në listë vetëm pasi ngarkohen me sukses (asnjë sfond i zi nga foto që mungojnë)
    obj.images.forEach((im) => {
      if (isDayIcon(im)) return;          // ikonat e ditës lexohen vetëm te “Ikona e ditës”, pa u ruajtur
      const rel = norm(im.file);
      if (!rel || seen.has(rel)) return;
      seen.add(rel);
      const file = isRemoteHost ? rel : REMOTE_BASE + '/' + rel;
      const probe = new Image();
      probe.onload = () => { list.push(Object.assign({}, im, { file })); photos = null; };
      probe.src = file;
    });
    if (changed) photos = null;
  }
  // gjithmonë së pari lista e fotove brenda aplikacionit; ajo nga serveri vetëm shton foto të reja
  load('imazhet').then(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('fs.imazhet.remote') || 'null');
      if (cached) applyRemote(cached);
    } catch (e) {}
    return fetch(REMOTE_BASE + '/data/imazhet.json?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j || !Array.isArray(j.images)) return;
        try { localStorage.setItem('fs.imazhet.remote', JSON.stringify(j)); } catch (e) {}
        applyRemote(j);
      });
  }).catch(() => {});
})();
function pickPhoto(it) {
      if (!photos) {
        photos = {};
        // ikonat e Sinaksarit (me datë) dalin VETËM te “Ikona e ditës”, kurrë te shprehjet
        ((data.imazhet || {}).images || []).filter((im) => !isDayIcon(im)).forEach((im) => (photos[im.cat] = photos[im.cat] || []).push(im.file));
      }
      // të përziera nga TË GJITHA dosjet e img/: çdo kartë merr një kategori tjetër me radhë të rastësishme,
      // dhe asnjë foto nuk përsëritet derisa të jenë shfaqur të gjitha
      const all = Object.keys(photos).filter((c) => c !== "nota" && photos[c].length);
      if (!all.length) return null;
      const fresh = (c) => photos[c].filter((f) => !usedPhotos.has(f));
      let cands = all.filter((c) => fresh(c).length);
      if (!cands.length) { usedPhotos.clear(); cands = all; }   // u shfaqën të gjitha → kuvertë e re
      // mos e përsërit kategorinë e kartave të fundit (sa të jetë e mundur)
      const recent = pickPhoto.recent || (pickPhoto.recent = []);
      const varied = cands.filter((c) => !recent.includes(c));
      if (varied.length) cands = varied;
      const c = cands[rand(cands.length)];
      recent.push(c);
      if (recent.length > Math.min(8, all.length - 1)) recent.shift();
      const opts = fresh(c).filter((f) => f !== lastPhoto);
      const f = (opts.length ? opts : photos[c])[rand((opts.length ? opts : photos[c]).length)];
      markUsed(f);
      it.photoCat = c; lastPhoto = f;
      return f;
    }

    let made = 0;
    function likedReminder() {
      const ids = Object.keys(likes).filter((id) => likes[id].text);
      if (ids.length < 3) return null;
      const id = ids[rand(ids.length)];
      const l = likes[id];
      return { kind: l.kind || "psaltiri", id, text: l.text, ref: l.ref, link: l.link || "#/pelqyerat", photo: l.photo || null, photoCat: l.photoCat || "", reminder: true };
    }
    function make() {
      made++;
      let it = null;
      if (made % 11 === 0) it = likedReminder();
      // të papagëzuarit: çdo e 6-ta kartë është një ftesë drejt Krishtit dhe Pagëzimit
      if (!it && unbaptized() && made % 6 === 3) {
        const [t, r] = INVITE[(made / 6 | 0) % INVITE.length];
        it = { kind: "ungjilli", id: "ftese:" + made, text: t, ref: r, link: "#/biblioteka/pagezimi", invite: true };
      }
      if (!it) {
        const kind = pickKind();
        if (kind === "psaltiri") it = makePsalm(data.psaltiri);
        else if (kind === "eterit") it = makeQuote(data.eterit);
        else if (kind === "profecite") it = makeProphecy(data.profecite);
        else if (data[kind]) it = makeBook(kind, data[kind]);
        if (!it) it = makePsalm(data.psaltiri);
        if (seen.has(it.id) && seen.size < 3000) return make();
        seen.add(it.id);
      }
      const bgs = backgrounds();
      it.bg = bgs[rand(bgs.length)];
      if (!it.photo) it.photo = pickPhoto(it);
      return it;
    }

    function fontSize(t) {
      const n = t.length;
      return n < 70 ? 34 : n < 120 ? 30 : n < 170 ? 27 : n < 220 ? 25 : 23;
    }

    function reelHtml(it, idx) {
      const on = isLiked(it.id);
      const bg = it.bg.bg;
      const vars = it.photo ? "--ink:#fffaf0;--acc:#f1cc72" : `--ink:${bg.ink};--acc:${bg.accent}`;
      return `
      <article class="reel${it.photo ? " photo" : ""}" data-idx="${idx}" style="${vars};--fs:${fontSize(it.text)}px">
        <div class="reel-bg" style="background-image:url('${it.photo || it.bg.url}')"></div>
        <div class="reel-shade"></div>
        <div class="reel-body">
          <svg class="reel-cross"><use href="#i-cross"/></svg>
          <blockquote class="reel-text">${senseLines(it.text)}</blockquote>
          <p class="reel-ref">${esc(it.ref)}</p>
          ${it.reminder ? `<p class="reel-note">♥ E pëlqeve më parë</p>` : ""}
          ${it.today ? `<p class="reel-note today">✦ Ungjilli i ditës</p>` : ""}
        </div>
        <div class="reel-rail">
          <button class="rail-btn${on ? " on" : ""}" data-act="like" aria-pressed="${on}" aria-label="Pëlqej">${icon(on ? "heart-fill" : "heart")}<span>Pëlqej</span></button>
          <a class="rail-btn" data-act="read" href="${it.link}" aria-label="Lexo të plotë">${icon("book")}<span>Lexo</span></a>
          <button class="rail-btn" data-act="share" aria-label="Ndaj">${icon("send")}<span>Ndaj</span></button>
        </div>
        <div class="burst" aria-hidden="true">${icon("heart-fill")}</div>
      </article>`;
    }

    function append(n) {
      const frag = document.createElement("div");
      let html = "";
      for (let k = 0; k < n; k++) { const it = make(); items.push(it); html += reelHtml(it, items.length - 1); }
      frag.innerHTML = html;
      Array.from(frag.children).forEach((node) => {
        feedEl.appendChild(node);
        longPress(node, (e) => { if (!e.target.closest(".reel-rail")) Notes.edit(null, items[+node.dataset.idx]); });
      });
      // ngarko paraprakisht imazhet e radhës, që rrëshqitja të jetë e rrjedhshme
      items.slice(-n).forEach((it) => { if (it.photo) { const im = new Image(); im.src = it.photo; } });
    }

    function setActive(idx) {
      if (idx === active || idx < 0) return;
      active = idx;
      $$(".reel.active", feedEl).forEach((r) => r.classList.remove("active"));
      const el = feedEl.children[idx];
      if (el) el.classList.add("active");
      if (idx >= items.length - 4) append(8);
      if (wide() && app.dataset.view === "feed") showContext(items[idx]);
    }
    function current() { return items[active] || items[0]; }

    let lastTap = 0;
    function onTap(e) {
      if (e.target.closest(".reel-rail, button, a")) return;
      const reel = e.target.closest(".reel");
      if (!reel) return;
      const now = Date.now();
      if (now - lastTap < 300) {     // dy prekje = ♥ (si në Instagram)
        lastTap = 0;
        const it = items[+reel.dataset.idx];
        if (!isLiked(it.id)) { toggleLike(it, true); markLike(reel, true); }
        const b = $(".burst", reel);
        b.classList.remove("go"); void b.offsetWidth; b.classList.add("go");
        return;
      }
      lastTap = now;
    }
    function markLike(reel, on) {
      const b = $('[data-act="like"]', reel);
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
      b.querySelector("use").setAttribute("href", "#i-" + (on ? "heart-fill" : "heart"));
      b.querySelector("span").textContent = on ? "Pëlqyer" : "Pëlqej";
    }
    function onRail(e) {
      const b = e.target.closest(".rail-btn");
      if (!b) return;
      const reel = b.closest(".reel");
      const it = items[+reel.dataset.idx];
      const act = b.dataset.act;
      if (act === "like") { e.preventDefault(); markLike(reel, toggleLike(it, true)); }
      else if (act === "share") { e.preventDefault(); ShareSheet.open(it); }
      else if (act === "read") focusNext = { kind: it.kind, ctx: it.ctx, text: it.text };
    }

    async function init() {
      await Promise.all(["psaltiri", "eterit", "ungjilli", "apostulli", "profecite", "imazhet"].map(load));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting && en.intersectionRatio > 0.6) setActive(+en.target.dataset.idx); });
      }, { root: feedEl, threshold: [0.6] });
      new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && io.observe(n)))).observe(feedEl, { childList: true });
      let st = null;
      feedEl.addEventListener("scroll", () => {
        clearTimeout(st);
        st = setTimeout(() => setActive(Math.round(feedEl.scrollTop / Math.max(1, feedEl.clientHeight))), 90);
      }, { passive: true });
      feedEl.addEventListener("click", onRail);
      feedEl.addEventListener("pointerup", onTap);
      document.addEventListener("keydown", (e) => {
        if (app.dataset.view !== "feed" || document.querySelector(".sheet:not([hidden])")) return;
        if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "j") { e.preventDefault(); go(1); }
        if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "k") { e.preventDefault(); go(-1); }
      });
      ready = true;
      try {
        const td = await Promise.race([Today.load(), new Promise((r) => setTimeout(() => r(null), 2500))]);
        const strip = (t) => { const m = /^[^:“"«]{0,40}?\b(?:tha|thotë|i tha|u tha)(?: [^:]{0,25})?:\s*(.+)$/.exec(t); return (m ? m[1] : t).replace(/^[“"«]|[”"»]$/g, "").trim(); };
        const rd = td && td.gospel && td.gospel.verses.map((v) => Object.assign({}, v, { t: strip(v.t) })).filter((v) => pithy(v.t));
        if (rd && rd.length) {
          const v = rd[rand(rd.length)];
          const it = { kind: "ungjilli", id: `dita:ungjilli:${v.c}:${v.v}`, text: v.t, ref: `${td.gospel.book} ${v.c}:${v.v}`, link: "#/dita/ungjilli", today: true };
          it.bg = backgrounds()[0]; it.photo = pickPhoto(it);
          items.push(it);
          const box = document.createElement("div"); box.innerHTML = reelHtml(it, 0); feedEl.appendChild(box.firstElementChild);
        }
      } catch (e) { /* pa internet */ }
      append(8);
      setActive(0);
    }
    function go(d) {
      const el = feedEl.children[Math.max(0, active + d)];
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
    function refreshActive() {
      if (!ready) return;
      requestAnimationFrame(() => { feedEl.scrollTop = Math.max(0, active) * feedEl.clientHeight; });
      if (wide()) showContext(current());
    }
    function refreshLikes() {
      $$(".reel", feedEl).forEach((r) => markLike(r, isLiked(items[+r.dataset.idx].id)));
    }
    return { init, current, refreshActive, refreshLikes, get ready() { return ready; } };
  })();

  // Në Fold/Duo/tablet: djathtas shfaqet leximi i plotë i reel-it aktual
  function showContext(it) {
    if (!it) return;
    if (!it.ctx) {
      mainPane.innerHTML = `<article class="reader"><blockquote class="quote-big">${esc(it.text)}</blockquote><p class="super">${esc(it.ref)}</p></article>`;
      return;
    }
    if (it.kind === "psaltiri") showPsalm(data.psaltiri, it.ctx.n, it.ctx.vi, true);
    else if (it.kind === "ungjilli" || it.kind === "apostulli" || it.kind === "profecite") renderBookItem(it.kind, data[it.kind], it.ctx.si, it.ctx.ii, it.ctx.pi, true, it.text);
  }

  /* =====================================================================
     NDAJ — Instagram (foto), Story, Facebook, WhatsApp, Messenger, Email…
     ===================================================================== */
  const ShareSheet = (() => {
    const el = $("#shareSheet");
    let item = null, photoImg = null, photoReady = Promise.resolve(null);
    const PKG = { instagram: "com.instagram.android", facebook: "com.facebook.katana", whatsapp: "com.whatsapp", messenger: "com.facebook.orca", telegram: "org.telegram.messenger", viber: "com.viber.voip" };

    const message = (it) => `“${it.text}”\n— ${it.ref}\n\nFjala e Shenjtë`;
    const fileBase = (it) => "fjala-e-shenjte-" + (it.ref || "varg").toLowerCase().replace(/[^a-z0-9ëç]+/gi, "-").replace(/^-|-$/g, "");

    function loadPhoto(src) {
      return new Promise((res) => {
        if (!src) return res(null);
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = src;
      });
    }

    async function image(format) {
      const ph = await photoReady;          // prit foton: pa të imazhi do dilte vetëm me tekst
      if (ph) photoImg = ph;
      const c = document.createElement("canvas");
      const bg = (item.bg && item.bg.bg) || Share.BACKGROUNDS[0];
      if (document.fonts) await document.fonts.ready;
      Share.render(c, { text: item.text, ref: item.ref, source: "" }, { format, background: bg, photo: photoImg }, 1);
      return Share.canvasBlob(c);
    }

    async function open(it) {
      item = it;
      $("#shareText").textContent = `“${it.text}”`;
      $("#shareRef").textContent = it.ref;
      el.hidden = false;
      photoImg = null;
      // çdo varg ndahet si foto + tekst: edhe kartat pa foto marrin një foto të bukur
      if (!it.photo) {
        await load("imazhet");
        if (sharedPick) it.photo = sharedPick(it);
        if (!it.photo) { const ims = ((data.imazhet && data.imazhet.images) || []).filter((im) => !isDayIcon(im)); if (ims.length) it.photo = ims[rand(ims.length)].file; }
      }
      photoReady = loadPhoto(it.photo);
      photoImg = await photoReady;
      const prev = document.createElement("canvas");
      Share.render(prev, { text: it.text, ref: it.ref, source: "" }, { format: "post", background: (it.bg && it.bg.bg) || Share.BACKGROUNDS[0], photo: photoImg }, 1);
      $("#sharePreview").style.backgroundImage = `url(${prev.toDataURL("image/jpeg", 0.6)})`;
    }
    function close() { el.hidden = true; }

    async function toImageApp(format, pkg, label) {
      toast("Po përgatitet imazhi…");
      const blob = await image(format);
      const name = fileBase(item) + ".jpg";
      if (android) {
        const b64 = await toB64(blob);
        if (format === "story" && pkg === PKG.instagram && android.instagramStory) android.instagramStory(b64);
        else android.shareFileTo(b64, "image/jpeg", name, message(item), pkg || "");
        return;
      }
      const file = new File([blob], name, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); } catch (e) { /* anuluar */ }
      } else {
        Share.download(blob, name);
        toast(`Imazhi u ruajt — hape ${label} dhe zgjidhe nga Galeria`);
      }
    }

    function toText(pkg, webUrl) {
      const text = message(item);
      if (android) { android.shareTextTo(text, pkg || ""); return; }
      if (webUrl) { window.open(webUrl + encodeURIComponent(text), "_blank", "noopener"); return; }
      if (navigator.share) navigator.share({ text }).catch(() => {});
      else copy();
    }
    async function copy() {
      try { await navigator.clipboard.writeText(message(item)); toast("Teksti u kopjua"); } catch (e) { toast("Nuk u kopjua"); }
    }
    const toB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.readAsDataURL(blob); });

    el.addEventListener("click", async (e) => {
      if (e.target === el) return close();
      const b = e.target.closest("[data-to]");
      if (!b) return;
      const to = b.dataset.to;
      if (to === "close") return close();
      close();
      switch (to) {
        case "instagram": return toImageApp("post", PKG.instagram, "Instagram");
        case "story": return toImageApp("story", PKG.instagram, "Instagram");
        case "facebook": return toImageApp("post", PKG.facebook, "Facebook");
        // çdo ndarje është foto (si Instagram); teksti merret vetëm me "Kopjo"
        case "whatsapp": return toImageApp("post", PKG.whatsapp, "WhatsApp");
        case "messenger": return toImageApp("post", PKG.messenger, "Messenger");
        case "telegram": return toImageApp("post", PKG.telegram, "Telegram");
        case "email": return toImageApp("post", "", "Email");
        case "more": return toImageApp("post", "", "aplikacionin");
        case "save": {
          const blob = await image("story");
          Share.download(blob, fileBase(item) + ".jpg");
          if (!android) toast("U ruajt");
          return;
        }
        case "copy": return copy();
      }
    });
    return { open, close };
  })();

  /* =====================================================================
     SHËNIMET — secili person shkruan për veten
     ===================================================================== */
  const Notes = (() => {
    const el = $("#noteSheet");
    let editing = null, passage = null;
    function edit(note, psg) {
      editing = note || null;
      passage = note ? (note.text ? { text: note.text, ref: note.ref, link: note.link } : null) : psg || null;
      $("#notePassage").hidden = !passage;
      if (passage) {
        $("#notePassageText").textContent = `“${shortText(passage.text, 220)}”`;
        $("#notePassageRef").textContent = passage.ref || "";
      }
      $("#noteWho").textContent = profileName();
      $("#noteText").value = note ? note.note : "";
      $("#noteDelete").hidden = !note;
      el.hidden = false;
      setTimeout(() => $("#noteText").focus(), 250);
    }
    function close() { el.hidden = true; }
    function save() {
      const txt = $("#noteText").value.trim();
      if (!txt) { toast("Shkruaj diçka"); return; }
      if (editing) { editing.note = txt; editing.at = Date.now(); }
      else notes.unshift({ id: "n" + Date.now(), note: txt, at: Date.now(), text: passage ? passage.text : "", ref: passage ? passage.ref : "", link: passage ? passage.link || "" : "" });
      saveNotes();
      close();
      toast("Shënimi u ruajt ✎");
      if (location.hash.startsWith("#/shenime")) viewNotes();
    }
    function remove() {
      if (!editing || !confirm("Ta fshij këtë shënim?")) return;
      notes = notes.filter((n) => n !== editing);
      saveNotes();
      close();
      if (location.hash.startsWith("#/shenime")) viewNotes();
    }
    $("#noteSave").addEventListener("click", save);
    $("#noteDelete").addEventListener("click", remove);
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest('[data-act="close"]')) close(); });
    return { edit, close };
  })();

  const Profiles = (() => {
    const el = $("#profileSheet");
    function render() {
      $("#profileList").innerHTML = profiles.map((p) => `
        <li><button class="profile-row${p.id === pid ? " on" : ""}" data-id="${p.id}">
          <span class="avatar">${esc(p.name.slice(0, 1).toUpperCase())}</span><span class="pname">${esc(p.name)}</span>
          ${p.id === pid ? "<span class=\"check\">✓</span>" : ""}</button>
          ${profiles.length > 1 ? `<button class="icon-btn small" data-del="${p.id}" aria-label="Fshi ${esc(p.name)}">${icon("close")}</button>` : ""}</li>`).join("");
    }
    function open() { render(); el.hidden = false; }
    function close() { el.hidden = true; }
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest('[data-act="close"]')) return close();
      const row = e.target.closest("[data-id]");
      if (row) { close(); if (row.dataset.id !== pid) switchProfile(row.dataset.id); return; }
      const del = e.target.closest("[data-del]");
      if (del) {
        const p = profiles.find((x) => x.id === del.dataset.del);
        if (!p || !confirm(`Ta fshij profilin “${p.name}” me shënimet dhe pëlqimet e tij?`)) return;
        profiles = profiles.filter((x) => x.id !== p.id);
        store.set("profiles", profiles);
        try { localStorage.removeItem("fs.likes." + p.id); localStorage.removeItem("fs.notes." + p.id); } catch (x) { /* */ }
        if (pid === p.id) switchProfile(profiles[0].id);
        render();
      }
    });
    $("#profileAdd").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#profileName").value.trim();
      if (!name) return;
      const p = { id: "p" + Date.now(), name: name.slice(0, 30) };
      profiles.push(p);
      store.set("profiles", profiles);
      $("#profileName").value = "";
      close();
      switchProfile(p.id);
    });
    return { open, close };
  })();

  /* =====================================================================
     KISHA — lidhja me orthodoxalbania.org (lajmet e fundit + faqet kryesore)
     ===================================================================== */
  const SITE = "https://orthodoxalbania.org/2026/";
  const SITE_LINKS = [
    ["Lajme", "lajme-blog-shqip/", "news"], ["Sot në Kishë", "sot-ne-kishe/", "sun"],
    ["Kalendari kishtar", "kalendari-kishtar/", "calendar"], ["Besimi ynë", "besimi-jone/", "cross"],
    ["Këndi i Lutjes", "kendi-i-lutjes/", "candle"], ["Dhjata e Re", "dhjata-e-re/", "book"],
    ["Jerontikon", "gerontiko/", "quote"], ["Katekizmi", "katekizmi-besimi-orthodhoks/", "letter"],
    ["Muzika Bizantine", "muzika-bizantine/", "music"], ["Tekste liturgjike", "tekste-liturgjike/", "scroll"],
    ["Pyetje e përgjigje", "pyetje-pergjigje-praktike-per-besimtaret/", "help"], ["Historia e Kishës", "kisha-jone/historia-e-kishes/", "church"],
    ["Katedralja", "kisha-jone/katedralja-ngjallja-e-krishtit/", "church"], ["Arkivi i videove", "video-arkivi/", "video"],
    ["Gazeta “Ngjallja”", "arkivi-ngjallja/", "news"], ["Kontakt", "contact-us/", "mail"],
  ];
  function openSite(url) { window.open(url, "_blank", "noopener"); }

  async function fetchNews() {
    const url = SITE + "wp-json/wp/v2/posts?per_page=40&_embed=wp:featuredmedia&_fields=id,date,link,title,excerpt,content,_links,_embedded";
    const r = await fetch(url, { credentials: "omit" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const posts = await r.json();
    const strip = (h) => { const d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || "").replace(/\s+/g, " ").trim(); };
    return posts
      .filter((p) => !/\/2026\/(en|el|fr|it|de|es|ro|sr|bg|ar|ko)\//.test(p.link))
      .slice(0, 20)
      .map((p) => {
        const m = p._embedded && p._embedded["wp:featuredmedia"] && p._embedded["wp:featuredmedia"][0];
        const sizes = (m && m.media_details && m.media_details.sizes) || {};
        // shumë postime të reja s'kanë "foto kryesore": merr foton e parë brenda artikullit
        const inBody = ((p.content && p.content.rendered) || "").match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
        const img = (sizes.medium_large || sizes.large || sizes.medium || {}).source_url || (m && m.source_url) || (inBody ? inBody[1].replace(/&amp;/g, "&") : "");
        return { id: p.id, title: strip(p.title && p.title.rendered), excerpt: strip(p.excerpt && p.excerpt.rendered), date: p.date, link: p.link, img };
      });
  }

  /* ---------- Radio Ngjallja: media.ngjallja.org (lajme) + radio live ---------- */
  const NGJ = "https://media.ngjallja.org/";
  const NGJ_LINKS = [
    ["Predikime", "predikime-nga-kryepiskopi-joan", "quote"], ["Leximet e ditës", "leximet-biblike-te-dites", "book"],
    ["Shenjtori i ditës", "shenjtori-i-dites", "candle"], ["YouTube", "https://www.youtube.com/@radiongjallja/featured", "video"],
  ];
  // Faqja nuk lejon lexim nga shfletuesi (CORS); në aplikacionin Android e lexon Android-i.
  const pending = {};
  window.FSFetch = (id, ok, text) => { const p = pending[id]; delete pending[id]; if (p) (ok ? p.res(text) : p.rej(new Error("fetch"))); };
  function fetchHtml(url) {
    if (android && android.fetchText) {
      return new Promise((res, rej) => {
        const id = "f" + Date.now() + rand(1000);
        pending[id] = { res, rej };
        android.fetchText(id, url);
        setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error("timeout")); } }, 15000);
      });
    }
    return fetch(url, { credentials: "omit" }).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); });
  }
  const MUAJT_EN = { janar: 0, shkurt: 1, mars: 2, prill: 3, maj: 4, qershor: 5, korrik: 6, gusht: 7, shtator: 8, tetor: 9, nëntor: 10, dhjetor: 11 };
  async function fetchNgjallja() {
    const html = await fetchHtml(NGJ);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const out = [], seen = new Set();
    doc.querySelectorAll(".post-item-horizontal, .post-item").forEach((el) => {
      const a = el.querySelector("h3.title a, .title a");
      if (!a) return;
      const link = a.getAttribute("href");
      if (!link || seen.has(link)) return;
      seen.add(link);
      const img = el.querySelector("img[data-src]");
      const cat = el.querySelector(".category-label");
      const dt = el.querySelector(".small-post-meta span, .post-meta span");
      let date = null;
      const m = dt && dt.textContent.trim().match(/^(\p{L}+)\s+(\d{1,2}),\s*(\d{4})/u);
      if (m && MUAJT_EN[m[1].toLowerCase()] != null) date = new Date(+m[3], MUAJT_EN[m[1].toLowerCase()], +m[2]).toISOString();
      out.push({
        title: (img && img.getAttribute("alt")) || a.textContent.trim(), link,
        img: img ? img.getAttribute("data-src") : "", date, excerpt: (el.querySelector(".description")?.textContent || "").trim(),
        cat: cat ? cat.textContent.trim() : "",
      });
    });
    return out.slice(0, 24);
  }

  let churchTab = store.get("churchTab", "kisha");
  async function viewChurch() {
    const src = churchTab;
    const cached = store.get(src === "kisha" ? "news" : "news.ngj", null);
    const radioOn = window.Radio && Radio.playing;
    listPane.innerHTML = `
      <header class="page-head"><h1>Kisha</h1><button class="icon-btn" id="newsRefresh" aria-label="Rifresko">${icon("refresh")}</button></header>
      <section class="radio-card${radioOn ? " on" : ""}" id="radioCard">
        <div class="rc-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <div class="rc-info"><p class="rc-live"><span class="rp-dot"></span>LIVE</p><h2>Radio Ngjallja</h2><p class="rc-sub">Radioja e Kishës, drejtpërdrejt</p></div>
        <button class="rc-btn" id="radioBtn" aria-label="${radioOn ? "Ndal radion" : "Dëgjo radion"}">${icon(radioOn ? "stop" : "play")}</button>
      </section>
      <div class="seg news-seg" role="tablist">
        <button role="tab" data-src="kisha" aria-checked="${src === "kisha"}">Kisha</button>
        <button role="tab" data-src="ngjallja" aria-checked="${src === "ngjallja"}">Radio Ngjallja</button>
      </div>
      ${src === "kisha"
        ? `<div class="site-links">${SITE_LINKS.map(([t, u, ic]) => `<button class="site-link" data-url="${SITE + u}">${icon(ic)}<span>${t}</span></button>`).join("")}</div>`
        : `<div class="site-links">${NGJ_LINKS.map(([t, u, ic]) => `<button class="site-link" data-url="${u.startsWith("http") ? u : NGJ + u}">${icon(ic)}<span>${t}</span></button>`).join("")}</div>`}
      <h2 class="section-title">Lajmet e fundit</h2>
      <div id="newsList" class="news-list">${cached ? newsHtml(cached.items) : `<p class="muted">Po ngarkohen lajmet…</p>`}</div>
      <p style="text-align:center;margin:18px 0"><button class="btn" data-url="${src === "kisha" ? SITE : NGJ}">${icon("globe")}<span>${src === "kisha" ? "Hap faqen e Kishës" : "Hap media.ngjallja.org"}</span></button></p>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    listPane.onclick = (e) => {
      const tab = e.target.closest("[data-src]");
      if (tab) { churchTab = tab.dataset.src; store.set("churchTab", churchTab); viewChurch(); return; }
      if (e.target.closest("#radioBtn")) { Radio.toggle(); return; }
      const b = e.target.closest("[data-url]");
      if (b) { e.preventDefault(); openSite(b.dataset.url); }
    };
    $("#newsRefresh").addEventListener("click", () => refreshNews(true));
    if (!cached || Date.now() - cached.at > 30 * 60 * 1000) refreshNews(false);
  }
  // karta e radios ndryshon menjëherë kur niset / ndalet
  if (window.Radio) Radio.onChange(({ playing }) => {
    const card = $("#radioCard"), btn = $("#radioBtn");
    if (!card || !btn) return;
    card.classList.toggle("on", playing);
    btn.innerHTML = icon(playing ? "stop" : "play");
    btn.setAttribute("aria-label", playing ? "Ndal radion" : "Dëgjo radion");
  });

  async function refreshNews(force) {
    const box = $("#newsList");
    if (!box) return;
    const src = churchTab;
    if (force) box.classList.add("loading");
    try {
      const items = src === "kisha" ? await fetchNews() : await fetchNgjallja();
      if (!items.length) throw new Error("bosh");
      store.set(src === "kisha" ? "news" : "news.ngj", { at: Date.now(), items });
      if ($("#newsList") && churchTab === src) { $("#newsList").innerHTML = newsHtml(items); enter($("#newsList")); }
    } catch (e) {
      const has = store.get(src === "kisha" ? "news" : "news.ngj", null);
      if (!has && $("#newsList")) {
        $("#newsList").innerHTML = src === "kisha" || android
          ? `<p class="muted">Lajmet shfaqen kur ka internet.</p>`
          : `<p class="muted">Lajmet e Radio Ngjallja shfaqen brenda aplikacionit në telefon. Këtu mund t'i lexosh në faqen e tyre.</p>`;
      } else if (force) toast("Pa internet");
    } finally {
      if ($("#newsList")) $("#newsList").classList.remove("loading");
    }
  }
  function newsHtml(items) {
    return items.map((n) => `
      <a class="news-card" href="${n.id ? `#/lajm/kisha/${n.id}` : n.link.startsWith(NGJ) ? `#/lajm/ngj/${encodeURIComponent(n.link.slice(NGJ.length))}` : esc(n.link)}">
        ${n.img ? `<div class="news-img" style="background-image:url('${esc(n.img)}')">${n.cat ? `<span class="news-cat">${esc(n.cat)}</span>` : ""}</div>` : ""}
        <div class="news-body">${n.date ? `<p class="news-date">${fmtDate(n.date)}</p>` : ""}<h3>${esc(n.title)}</h3>${n.excerpt ? `<p class="news-ex">${esc(shortText(n.excerpt, 160))}</p>` : ""}</div>
      </a>`).join("");
  }


  /* =====================================================================
     LUTJA — Ndiz një qiri · Komboskini (Lutja e Jisuit)
     ===================================================================== */
  const CANDLE_MS = 24 * 3600 * 1000;
  const JESUS_PRAYER = "Zot Jisu Krisht, Biri i Perëndisë, mëshiromë mua mëkatarin.";
  let prayerTab = store.get("prayerTab", "qiri");
  let candleTimer = null;

  let candleKind = store.get("candleKind", "gjalle");
  // qiri prej dylli bletësh që digjet vërtet: shkurtohet sipas kohës, pikon dyll, shuhet pas 24 orësh
  function realCandle(c, big) {
    const burn = Math.min(1, Math.max(0, (Date.now() - c.at) / CANDLE_MS));
    const seed = Math.floor(c.at / 1000);
    const rnd = (k) => ((Math.sin(seed * 9301 + k * 49297) + 1) / 2);
    const n = 2 + Math.floor(burn * 7);
    const drips = Array.from({ length: n }, (_, k) => {
      const side = rnd(k) < 0.5 ? "l" : "r";
      const len = 8 + rnd(k + 20) * (14 + burn * 70);
      return `<i class="rc-drip ${side}" style="--len:${len.toFixed(0)}px;--off:${(rnd(k + 40) * 30).toFixed(0)}%"></i>`;
    }).join("");
    return `<div class="rc${big ? " big" : ""}${c.kind === "fjetur" ? " dead" : ""}" style="--burn:${burn.toFixed(4)}" title="${esc(c.for || "")}">
      <div class="rc-top"><div class="flame"><i></i></div><div class="wick"></div></div>
      <div class="rc-body"><div class="rc-img"></div><div class="rc-pool"></div>${drips}<i class="rc-drop"></i></div></div>`;
  }
  function candles() {
    const all = store.get("candles." + pid, []);
    const live = all.filter((c) => Date.now() - c.at < CANDLE_MS);
    if (live.length !== all.length) store.set("candles." + pid, live);
    return live;
  }
  // widget-i i qirinjve dhe njoftimet (shuhet pas 24 orësh)
  function syncCandles() {
    if (!android) return;
    const live = candles();
    try { if (android.updateCandles) android.updateCandles(JSON.stringify(live.map((c) => ({ for: c.for || "", at: c.at, kind: c.kind || "gjalle" })))); } catch (e) { /* */ }
    Persons.schedule();
  }
  const flameHtml = (big) => `<div class="candle${big ? " big" : ""}"><div class="flame"><i></i></div><div class="wick"></div><div class="wax"></div></div>`;
  function leftText(c) {
    const ms = CANDLE_MS - (Date.now() - c.at);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `edhe ${h} orë e ${m} min` : `edhe ${m} min`;
  }

  // Qiriri dhe Temjanica: një faqe e vetme (pa skeda, pa përsëritje)
  async function viewPrayer() {
    clearInterval(candleTimer);
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Qiriri & Temjanica</h1>${profileChip()}</header>
      <div class="seg glass-jump"><button data-jump="candleBody" aria-checked="true">🕯 Qiriri</button><button data-jump="censerH" aria-checked="false">Temjanica</button></div>
      <div id="candleBody"></div>
      <h2 class="hub-h" id="censerH">Temjanica</h2>
      <div id="censerBody"></div>`;
    $("#profileChip").addEventListener("click", Profiles.open);
    $$("[data-jump]", listPane).forEach((b) => b.addEventListener("click", () => {
      $$("[data-jump]", listPane).forEach((x) => x.setAttribute("aria-checked", x === b));
      const t = $("#" + b.dataset.jump);
      if (t) listPane.scrollTo({ top: t.offsetTop - 70, behavior: "smooth" });
    }));
    renderCandles();
    renderCenser();
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }
  function viewRope() {
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Komboskini</h1>${profileChip()}</header>
      <div id="ropeBody"></div>`;
    $("#profileChip")?.addEventListener("click", Profiles.open);
    renderRope();
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  function renderCandles() {
    const box = $("#candleBody");
    if (!box) return;
    const list = candles();
    box.innerHTML = `
      <section class="candle-stand">
        ${Array.from({ length: 8 }, (_, k) => `<i class="spark" style="left:${18 + rand(64)}%;animation-delay:${(k * 0.55).toFixed(2)}s;--dx:${rand(40) - 20}px"></i>`).join("")}
        ${Array.from({ length: 3 }, (_, k) => `<i class="smoke" style="left:${40 + rand(20)}%;animation-delay:${k * 2}s;--dx:${rand(40) - 20}px"></i>`).join("")}
        ${(() => {
          const live = list.filter((c) => c.kind !== "fjetur"), dead = list.filter((c) => c.kind === "fjetur");
          if (!list.length) return `<div class="candle-row rc-row">${realCandle({ at: Date.now(), kind: candleKind }, true)}</div><div class="stand-base"></div>`;
          return `${live.length ? `<p class="stand-lbl">Për të gjallët</p><div class="candle-row rc-row">${live.slice(0, 9).map((c, i) => realCandle(c, live.length === 1 && i === 0)).join("")}</div><div class="stand-base"></div>` : ""}
            ${dead.length ? `<p class="stand-lbl dead">Për të fjeturit</p><div class="candle-row rc-row sand">${dead.slice(0, 9).map((c, i) => realCandle(c, dead.length === 1 && i === 0)).join("")}</div><div class="stand-base sand"></div>` : ""}`;
        })()}
      </section>
      <form class="candle-form" id="candleForm">
        <div class="seg candle-kind" role="radiogroup">
          <button type="button" data-ck="gjalle" aria-checked="${candleKind === "gjalle"}">Për të gjallët</button>
          <button type="button" data-ck="fjetur" aria-checked="${candleKind === "fjetur"}">Për të fjeturit</button>
        </div>
        <label for="candleFor">${candleKind === "fjetur" ? "Për prehjen e kujt?" : "Për kë lutesh?"}</label>
        <textarea id="candleFor" rows="2" maxlength="400" placeholder="${candleKind === "fjetur" ? "P.sh. gjyshi Kristo, nëna Maria…" : "P.sh. për nënën time, për shëndetin e Gjergjit…"}" autocomplete="off"></textarea>
        <div class="row">
          <button class="btn primary grow" type="submit">${icon("candle")}<span>Ndiz qirin</span></button>
        </div>
        <p class="candle-hint">Digjet 24 orë.</p>
      </form>
      <ul class="candle-list">${list.map((c, i) => `
        <li><div class="mini-flame"><i></i></div>
          <div class="cl-body"><p class="cl-for">${c.kind === "fjetur" ? "✝ " : ""}${esc(c.for || (c.kind === "fjetur" ? "Për të gjithë të fjeturit" : "Për të gjithë"))}</p>
            <div class="cl-burn"><i style="width:${(100 - Math.min(100, (Date.now() - c.at) / CANDLE_MS * 100)).toFixed(1)}%"></i></div>
            <p class="cl-left" data-i="${i}">${leftText(c)}</p></div>
          <button class="icon-btn small" data-pray="${i}" aria-label="Lutu">${icon("cross")}</button></li>`).join("")}</ul>`;
    $("#candleForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const who = $("#candleFor").value.replace(/\s+/g, " ").trim().slice(0, 400);
      $("#candleFor").blur();
      matchLight(() => {
        const all = store.get("candles." + pid, []);
        all.unshift({ for: who, at: Date.now(), kind: candleKind });
        store.set("candles." + pid, all);
        toast("🕯 Qiri u ndez");
        syncCandles();
        if (location.hash.startsWith("#/lutja")) renderCandles();
      });
    });
    $$("[data-pray]", box).forEach((b) => b.addEventListener("click", () => {
      const c = list[+b.dataset.pray];
      const name = c.for ? c.for.replace(/^për\s+/i, "") : (c.kind === "fjetur" ? "të gjithë të fjeturit tanë" : "të gjithë ne");
      const text = c.kind === "fjetur"
        ? `Prehe, o Zot, shpirtin e shërbëtorit tënd ${name}, në vend të ndritur, në vend të gjelbëruar, në vend prehjeje, ku nuk ka dhimbje, as trishtim, as psherëtimë. Përjetë kujtimi i tij. Amin.`
        : `Kujto, o Zot, ${name}, dhe dhuroji shëndet, paqe dhe shpëtim me hirin tënd. Amin.`;
      Notes.edit(null, { text, ref: "Lutje te qiri", link: "#/lutja" });
    }));
    $$("[data-ck]", box).forEach((b) => b.addEventListener("click", () => { candleKind = b.dataset.ck; store.set("candleKind", candleKind); renderCandles(); }));
    candleTimer = setInterval(() => {
      const l = candles();
      if (l.length !== list.length) return renderCandles();   // një qiri u shua
      $$(".cl-left", box).forEach((p) => { const c = l[+p.dataset.i]; if (c) p.textContent = leftText(c); });
      // qiriri shkurtohet në kohë reale
      const rows = $$(".rc", box), order = [...l.filter((c) => c.kind !== "fjetur").slice(0, 9), ...l.filter((c) => c.kind === "fjetur").slice(0, 9)];
      rows.forEach((el, k) => { const c = order[k]; if (c) el.style.setProperty("--burn", Math.min(1, (Date.now() - c.at) / CANDLE_MS).toFixed(4)); });
      $$(".cl-burn i", box).forEach((el, k) => { const c = l[k]; if (c) el.style.width = (100 - Math.min(100, (Date.now() - c.at) / CANDLE_MS * 100)).toFixed(1) + "%"; });
    }, 20000);
  }

  const JP_VIDEO = "oNvyAI1WLMU";
  function renderRope() {
    const box = $("#ropeBody");
    if (!box) return;
    const target = store.get("ropeTarget", 33);
    let count = store.get("rope." + pid, 0);
    const knots = Array.from({ length: Math.min(target, 100) }, (_, i) => i);
    box.innerHTML = `
      <section class="rope">
        <p class="rope-prayer">${JESUS_PRAYER}</p>
        <button class="rope-ring" id="ropeTap" aria-label="Një nyje lutjeje">
          <svg viewBox="0 0 200 200" class="rope-svg">${knots.map((i) => {
            const a = (i / knots.length) * Math.PI * 2 - Math.PI / 2;
            return `<circle cx="${100 + 84 * Math.cos(a)}" cy="${100 + 84 * Math.sin(a)}" r="${knots.length > 50 ? 3.2 : 4.6}" class="knot${i < count % target || (count && count % target === 0) ? " done" : ""}"/>`;
          }).join("")}</svg>
          <span class="rope-halo" aria-hidden="true"></span>
          <span class="rope-count"><b id="ropeNum">${count % target || (count ? target : 0)}</b><small>/ ${target}</small></span>
          <svg class="rope-cross"><use href="#i-cross"/></svg>
        </button>
        <div class="rope-audio"><button class="btn glass" id="ropeListen">${icon("play")}<span>Dëgjo Lutjen e Jisuit</span></button>
          <div class="rope-yt" id="ropeYt" hidden></div></div>
        <p class="rope-total">Gjithsej: <b id="ropeTotal">${count}</b> lutje</p>
        <div class="seg rope-seg">${[33, 50, 100].map((n) => `<button data-target="${n}" aria-checked="${n === target}">${n}</button>`).join("")}</div>
        <button class="btn ghost" id="ropeReset">${icon("refresh")}<span>Fillo nga e para</span></button>
      </section>`;
    $("#ropeTap").addEventListener("click", () => {
      count++;
      store.set("rope." + pid, count);
      const inRound = count % target || target;
      $("#ropeNum").textContent = inRound;
      $("#ropeTotal").textContent = count;
      const ks = $$(".knot", box);
      ks.forEach((k, i) => k.classList.toggle("done", i < inRound));
      const k = ks[inRound - 1];
      if (k) { k.classList.remove("pop"); void k.getBBox; k.classList.add("pop"); }
      const ring = $("#ropeTap"); ring.classList.remove("tap"); void ring.offsetWidth; ring.classList.add("tap");
      haptic(inRound === target ? [90, 70, 90, 70, 280] : 55, true);   // dridhje e fortë në çdo nyje
      if (inRound === target) { toast("☦ Një rreth i plotë. Lavdi Perëndisë!"); const r = ring.getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top + r.height / 2); }
    });
    // zëri që të shoqëron në Lutjen e Jisuit
    const yt = $("#ropeYt"), lb = $("#ropeListen");
    const setL = (on) => { lb.classList.toggle("on", on); lb.innerHTML = `${icon(on ? "pause" : "play")}<span>${on ? "Ndalo zërin" : "Dëgjo Lutjen e Jisuit"}</span>`; };
    lb.addEventListener("click", () => {
      if (yt.firstChild) { yt.innerHTML = ""; yt.hidden = true; setL(false); return; }
      try { if (window.Music && Music.pause) Music.pause(); if (window.Radio && Radio.playing) Radio.stop(); } catch (e) { /* */ }
      yt.hidden = false;
      yt.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${JP_VIDEO}?autoplay=1&loop=1&playlist=${JP_VIDEO}&playsinline=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media" title="Lutja e Jisuit"></iframe>`;
      setL(true);
      haptic(20);
    });
    $$("[data-target]", box).forEach((b) => b.addEventListener("click", () => { if (yt.firstChild) return toast("Ndalo zërin para se të ndryshosh"); store.set("ropeTarget", +b.dataset.target); renderRope(); }));
    $("#ropeReset").addEventListener("click", () => { store.set("rope." + pid, 0); renderRope(); });
  }


  /* =====================================================================
     LAJMET BRENDA APLIKACIONIT — lexuesi i artikujve + rifreskimi i vazhdueshëm
     ===================================================================== */
  const ALLOWED = new Set(["P", "H2", "H3", "H4", "STRONG", "B", "EM", "I", "U", "BLOCKQUOTE", "UL", "OL", "LI", "BR", "FIGURE", "FIGCAPTION", "IMG", "A", "SPAN", "DIV", "IFRAME", "HR"]);
  function cleanHtml(html, base) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1 || /^(SCRIPT|STYLE|NOSCRIPT|FORM|INPUT|BUTTON|SVG)$/.test(n.tagName)) { n.remove(); return; }
        if (!ALLOWED.has(n.tagName)) { walk(n); n.replaceWith(...n.childNodes); return; }
        const keep = {};
        if (n.tagName === "IMG") keep.src = n.getAttribute("data-src") || n.getAttribute("data-lazy-src") || n.getAttribute("src") || "";
        if (n.tagName === "A") keep.href = n.getAttribute("href") || "";
        if (n.tagName === "IFRAME") keep.src = n.getAttribute("src") || "";
        [...n.attributes].forEach((a) => n.removeAttribute(a.name));
        if (n.tagName === "IFRAME" && !/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//.test(keep.src)) { n.remove(); return; }
        Object.entries(keep).forEach(([k, v]) => { if (v) n.setAttribute(k, new URL(v, base).href); });
        if (n.tagName === "IMG") { n.setAttribute("loading", "lazy"); n.setAttribute("alt", ""); }
        if (n.tagName === "A") { n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener"); }
        if (n.tagName === "IFRAME") { n.setAttribute("allowfullscreen", ""); n.setAttribute("loading", "lazy"); }
        walk(n);
      });
    };
    const root = doc.body.firstElementChild;
    walk(root);
    root.querySelectorAll("p, div").forEach((el) => { if (!el.textContent.trim() && !el.querySelector("img, iframe")) el.remove(); });
    return root.innerHTML;
  }

  async function loadArticle(src, id) {
    const key = `art.${src}.${id}`;
    const cached = store.get(key, null);
    if (cached) return { ...cached, html: ortho(cached.html) };
    let art;
    if (src === "kisha") {
      const r = await fetch(`${SITE}wp-json/wp/v2/posts/${id}?_embed=wp:featuredmedia&_fields=title,content,date,link,_links,_embedded`, { credentials: "omit" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const p = await r.json();
      const m = p._embedded && p._embedded["wp:featuredmedia"] && p._embedded["wp:featuredmedia"][0];
      art = { title: new DOMParser().parseFromString(p.title.rendered, "text/html").body.textContent, date: p.date, link: p.link,
        img: (m && m.source_url) || "", html: cleanHtml(p.content.rendered, p.link) };
    } else if (src === "shenjt") {
      const url = SITE + "?ods_saint=" + id;
      const doc = new DOMParser().parseFromString(await fetchHtml(url), "text/html");
      const body = doc.querySelector(".ods-full-life") || doc.querySelector(".ods-biography") || doc.querySelector(".ods-reading");
      if (!body) throw new Error("bosh");
      const img = doc.querySelector(".ods-saint-banner img");
      const t = doc.querySelector(".ods-name-panel h1, h1");
      const dt = doc.querySelector(".ods-reading-date");
      art = { title: t ? t.textContent.trim() : "", date: null, dateText: dt ? dt.textContent.trim() : "", link: url,
        img: img ? img.getAttribute("src") : "", html: cleanHtml(body.innerHTML, url) };
    } else {
      const url = NGJ + id;
      const doc = new DOMParser().parseFromString(await fetchHtml(url), "text/html");
      const body = doc.querySelector(".post-text") || doc.querySelector(".post-content");
      if (!body) throw new Error("bosh");
      const img = doc.querySelector(".post-image img, .post-content img");
      const t = doc.querySelector("h1.title, h1.post-title, h1");
      const dt = doc.querySelector(".post-details-meta-date, .post-meta span");
      art = { title: t ? t.textContent.trim() : "", date: null, dateText: dt ? dt.textContent.trim() : "", link: url,
        img: img ? (img.getAttribute("data-src") || img.getAttribute("src")) : "", html: cleanHtml(body.innerHTML, url) };
    }
    try { store.set(key, art); } catch (e) { /* hapësira */ }
    return { ...art, html: ortho(art.html) };
  }

  async function viewArticle(src, id) {
    setNav("kisha");
    mainPane.innerHTML = `
      <header class="page-head art-head"><a class="back-btn art-back" href="#/kisha" aria-label="Kthehu">${icon("back")}</a><h2 style="font-size:15px">${src === "kisha" ? "Kisha" : src === "shenjt" ? "Jeta e shenjtorit" : "Radio Ngjallja"}</h2></header>
      <article class="article skeleton"><div class="sk sk-img"></div><div class="sk sk-t"></div><div class="sk sk-l"></div><div class="sk sk-l"></div><div class="sk sk-l short"></div></article>`;
    mainPane.classList.add("art-open");
    enter(mainPane);
    setMode("read");
    mainPane.scrollTop = 0;
    $(".art-back", mainPane).addEventListener("click", (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } });
    try {
      const a = await loadArticle(src, id);
      if (!location.hash.startsWith("#/lajm/")) return;
      mainPane.innerHTML = `
        <header class="page-head art-head"><a class="back-btn art-back" href="#/kisha" aria-label="Kthehu">${icon("back")}</a><h2 style="font-size:15px">${src === "kisha" ? "Kisha" : src === "shenjt" ? "Jeta e shenjtorit" : "Radio Ngjallja"}</h2>
          <button class="icon-btn" id="artShare" aria-label="Ndaj">${icon("send")}</button></header>
        <article class="article">
          ${a.img ? `<div class="art-hero" style="background-image:url('${esc(a.img)}')"></div>` : ""}
          <p class="news-date">${a.date ? fmtDate(a.date) : esc(a.dateText || "")}</p>
          <h1 class="art-title">${esc(a.title)}</h1>
          <div class="art-body" lang="sq">${a.html}</div>
          <p class="art-src"><a href="${esc(a.link)}" target="_blank" rel="noopener">${icon("globe")} Lexoje në faqen origjinale</a></p>
        </article>`;
      enter(mainPane);
      $(".art-back", mainPane).addEventListener("click", (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } });
      $("#artShare").addEventListener("click", () => {
        const text = `${a.title}\n${a.link}`;
        if (android) android.shareTextTo(text, ""); else if (navigator.share) navigator.share({ title: a.title, url: a.link }).catch(() => {}); else navigator.clipboard.writeText(text);
      });
    } catch (e) {
      mainPane.innerHTML = `<header class="page-head"><a class="back-btn" href="#/kisha" aria-label="Kthehu">${icon("back")}</a><h2 style="font-size:15px">Lajmi</h2></header>
        <div class="empty">${icon("news")}<h3>Nuk u hap</h3><p>${navigator.onLine ? "Ky lajm nuk mund të lexohet këtu." : "Pa internet."}</p>
        <p><button class="btn" data-open="${esc(src === "kisha" ? SITE + "?p=" + id : NGJ + id)}">${icon("globe")}<span>Hap në faqe</span></button></p></div>`;
      $("[data-open]", mainPane)?.addEventListener("click", (ev) => openSite(ev.currentTarget.dataset.open));
    }
  }

  // Rifreskim i vazhdueshëm: çdo 5 minuta dhe sa herë rikthehesh në aplikacion
  const NewsLive = (() => {
    let timer = null;
    async function check() {
      if (!navigator.onLine) return;
      const sources = [["kisha", "news", fetchNews]].concat(android ? [["ngjallja", "news.ngj", fetchNgjallja]] : []);
      for (const [src, key, fn] of sources) {
        try {
          const items = await fn();
          if (!items.length) continue;
          const old = store.get(key, null);
          const known = new Set((old && old.items || []).map((n) => n.link));
          const fresh = items.filter((n) => !known.has(n.link));
          store.set(key, { at: Date.now(), items });
          if (old && fresh.length) {
            document.querySelector('.nav-btn[data-go="kisha"]')?.classList.add("has-new");
            toast(`🔔 ${src === "kisha" ? "Kisha" : "Radio Ngjallja"}: ${shortText(fresh[0].title, 70)}`);
          }
          if (location.hash.replace(/^#\/?/, "") === "kisha" && churchTab === src && $("#newsList")) $("#newsList").innerHTML = newsHtml(items);
        } catch (e) { /* pa internet ose burim jashtë funksionit */ }
      }
    }
    function start() {
      clearInterval(timer);
      timer = setInterval(() => { if (!document.hidden && navigator.onLine) check(); }, 5 * 60 * 1000);
      setTimeout(check, 8000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
      window.addEventListener("online", check);
    }
    return { start, check };
  })();


  /* =====================================================================
     SOT NË KISHË — shenjtorët, sinaksari, Apostulli dhe Ungjilli i ditës (nga Kisha)
     ===================================================================== */
  /* =====================================================================
     KALENDARI: Liturgjia Hyjnore (✝), të kremtet e mëdha dhe kreshmët
     ===================================================================== */
  const Fast = (() => {
    const DAYMS = 864e5;
    const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
    function pascha(y) {
      const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
      const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
      return new Date(y, m - 1, day + 13, 12);
    }
    const LEVELS = {
      free: { cls: "free", name: "Pa kreshmë", eat: "Hahen të gjitha", avoid: "" },
      dairy: { cls: "dairy", name: "Pa mish", eat: "Bulmet, vezë, peshk, vaj e verë", avoid: "Mish" },
      fish: { cls: "fish", name: "Lejohet peshku", eat: "Peshk, vaj, verë, perime, fruta", avoid: "Mish, bulmet, vezë" },
      oil: { cls: "oil", name: "Vaj e verë", eat: "Perime, fruta, bishtajore, fruta deti, vaj e verë", avoid: "Mish, bulmet, vezë, peshk" },
      strict: { cls: "strict", name: "Kreshmë e rreptë", eat: "Bukë, perime, fruta, bishtajore pa vaj", avoid: "Mish, bulmet, vezë, peshk, vaj, verë" },
      total: { cls: "strict", name: "Kreshmë e plotë", eat: "Sipas mundësisë, asgjë deri në mbrëmje", avoid: "Çdo ushqim" },
      day: { cls: "strict", name: "Ditë kreshme", eat: "Bukë, perime, fruta, bishtajore pa vaj", avoid: "Mish, bulmet, vezë, peshk, vaj, verë" },
    };
    // shënimet e kreshmës nga Tipikoja zyrtare 2026 kanë fjalën e fundit
    function tipikonFast(d) {
      const tp = (window.FS_DATA || {}).tipikoja;
      if (!tp || d.getFullYear() !== 2026) return null;
      const it = tp.sections[d.getMonth()].items.find((x) => parseInt(x.title, 10) === d.getDate());
      const t = it ? it.blocks.filter((b) => b.t === "fast").map((b) => b.x).join(" ") : "";
      if (/hahen të gjitha/i.test(t)) return "free";
      if (/bulmet/i.test(t)) return "dairy";
      if (/peshk/i.test(t)) return "fish";
      if (/vaj/i.test(t)) return "oil";
      if (/ditë kreshme/i.test(t)) return "day";
      return null;
    }
    // të kremtet e mëdha me datë të palëvizshme: [muaji, dita, emri, lejon peshkun në kreshmë]
    const FIXED = [
      [1, 1, "Rrethprerja e Zotit · Shën Vasili i Madh"], [1, 6, "Theofania · Pagëzimi i Zotit", 1], [2, 2, "Ipapandia", 1],
      [3, 25, "Ungjillëzimi i Hyjlindëses", 1], [6, 24, "Lindja e Joan Pagëzorit", 1], [6, 29, "Apostujt Petro dhe Pavël", 1],
      [8, 6, "Shndërrimi i Zotit", 1], [8, 15, "Fjetja e Hyjlindëses", 1], [8, 29, "Prerja e kokës së Joan Pagëzorit"],
      [9, 8, "Lindja e Hyjlindëses", 1], [9, 14, "Lartësimi i Kryqit të Nderuar"], [11, 21, "Hyrja në Tempull e Hyjlindëses", 1],
      [12, 25, "Lindja e Krishtit"],
    ];
    const MOV = { "-7": "E Diela e Vaieve · Hyrja në Jerusalem", "0": "PASHKA · Ngjallja e Krishtit", "39": "Ngjitja e Zotit në qiell (Analipsi)", "49": "Pendikostia" };
    function info(date) {
      const d = noon(date || new Date()), y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate(), wd = d.getDay();
      const P = pascha(y), off = Math.round((d - P) / DAYMS);
      const md = (a, b) => m === a && dd === b;
      const between = (m1, d1, m2, d2) => { const v = m * 100 + dd; return v >= m1 * 100 + d1 && v <= m2 * 100 + d2; };
      const wf = wd === 3 || wd === 5, weekend = wd === 0 || wd === 6;
      const fx = FIXED.find((f) => md(f[0], f[1]));
      const feast = MOV[off] || (fx && fx[2]) || "";
      const great = !!feast && !/Prerja e kokës/.test(feast);
      let period = "", lv = null, note = "";
      if (between(12, 25, 12, 31) || between(1, 1, 1, 4)) { period = "Dymbëdhjetë ditët e Krishtlindjes"; lv = "free"; }
      else if (off >= -69 && off <= -64) { period = "Java e Tagrambledhësit dhe Farisenjtë"; lv = "free"; }
      else if (off >= -55 && off <= -49) { period = "Java e Djathit"; lv = "dairy"; }
      else if (off >= 0 && off <= 6) { period = "Java e Ripërtëritjes (e Bardhë)"; lv = "free"; }
      else if (off >= 49 && off <= 55) { period = "Java pas Pendikostisë"; lv = "free"; }
      else if (off >= -48 && off <= -1) {
        period = off >= -6 ? "Java e Madhe" : "Kreshma e Madhe";
        lv = weekend ? "oil" : "strict";
        if (off === -48) { lv = "total"; note = "E Hëna e Pastër"; }
        if (off === -8) { lv = "oil"; note = "E Shtuna e Llazarit (lejohet havjari)"; }
        if (off === -7) lv = "fish";
        if (md(3, 25) && off < -6) lv = "fish";
        if (off === -3) lv = "oil";
        if (off === -2) { lv = "total"; note = "E Premtja e Madhe"; }
        if (off === -1) { lv = "strict"; note = "E Shtuna e Madhe (lejohet vera)"; }
      }
      else if (off >= 57 && between(1, 1, 6, 28)) { period = "Kreshma e Apostujve"; lv = wf ? "day" : "fish"; }
      else if (between(8, 1, 8, 14)) { period = "Kreshma e Fjetjes së Hyjlindëses"; lv = md(8, 6) ? "fish" : weekend ? "oil" : "strict"; }
      else if (between(11, 15, 12, 24)) {
        period = "Kreshma e Krishtlindjes";
        if (md(12, 24)) { lv = "strict"; note = "Kërshëndella"; }
        else if (between(12, 18, 12, 23)) lv = weekend ? "oil" : "strict";
        else lv = wf && !md(11, 21) ? (md(11, 25) || md(12, 9) ? "oil" : "day") : "fish";
      }
      else if (md(1, 5) || md(8, 29) || md(9, 14)) { lv = "day"; note = md(1, 5) ? "Nata e Theofanisë" : md(8, 29) ? "Prerja e kokës së Pagëzorit" : "Lartësimi i Kryqit"; }
      else if (wf) {
        lv = (fx && fx[3]) || off === 24 || off === 38 ? "fish" : "day";
        note = wd === 3 ? "E mërkurë: kujtojmë tradhtinë e Zotit" : "E premte: kujtojmë Kryqëzimin e Zotit";
      }
      if (fx && fx[3] && (lv === "oil" || lv === "strict" || lv === "day") && !(off >= -6 && off <= -1)) lv = "fish";
      const tf = tipikonFast(d);
      if (tf) lv = tf;
      const kd = calDay(d);       // Kalendari zyrtar i Kishës ka fjalën e fundit
      if (kd) lv = kd.free ? "free" : kd.k ? (kd.f === "#" ? "fish" : kd.f === "*" ? "oil" : "day") : null;
      if (kd && kd.k && !period) period = lv === "day" ? "Ditë kreshme" : "";
      if (kd && lv === "day" && !note) note = "Sipas kalendarit të Kishës";
      const saranta = between(11, 15, 12, 24);   // Sarandaliturgjia: Liturgji çdo ditë deri në Krishtlindje
      return { period, level: lv ? LEVELS[lv] : null, note, feast, great, liturgy: kd ? !!kd.lit : wd === 0 || !!feast, fromCal: !!kd, offset: off, saranta };
    }
    const hasLiturgy = (it) => !!(it && it.blocks && it.blocks.some((b) => b.t === "h" && /Liturgji/i.test(b.x)));
    return { info, pascha, hasLiturgy, LEVELS };
  })();

  // a ka Liturgji: kalendari zyrtar > Tipikoja > të dielat dhe të kremtet
  const litDay = (f, it) => (f.saranta && store.get("saranta", true)) || (f.fromCal ? f.liturgy : f.liturgy || !!(it && Fast.hasLiturgy(it)));
  function fastCardHtml(f, opts = {}) {
    const lv = f.level;
    return `<section class="fast-card ${lv ? "lv-" + lv.cls : "lv-none"}">
      ${opts.liturgy || f.feast ? `<div class="fast-top">
        ${opts.liturgy ? `<span class="lit-chip${f.great ? " great" : ""}"><i class="cal-x">✝</i><span>Liturgji Hyjnore</span></span>` : ""}
        ${f.feast ? `<span class="feast-chip">${esc(f.feast)}</span>` : ""}</div>` : ""}
      ${f.period ? `<p class="fast-period">${esc(f.period)}</p>` : ""}
      <div class="fast-row"><span class="fast-dot"></span><b>${esc(lv ? lv.name : "Nuk ka kreshmë")}</b>${f.note ? `<small>${esc(f.note)}</small>` : ""}</div>
      <dl class="fast-food">
        <div><dt>Hahen</dt><dd>${esc(lv ? lv.eat : "Të gjitha")}</dd></div>
        ${lv && lv.avoid ? `<div><dt>Nuk hahen</dt><dd>${esc(lv.avoid)}</dd></div>` : ""}
      </dl>
      ${opts.tip ? `<p class="fast-tip">${esc(opts.tip)}</p>` : ""}
    </section>`;
  }

  // Kalendari mujor me kryqe (Liturgji) dhe ngjyrat e kreshmës
  let calMonth = null;
  const MUAJ = ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"];
  function calendarHtml(book, y, mo) {
    const days = new Date(y, mo + 1, 0).getDate();
    const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    const now = new Date();
    const sec = y === 2026 ? book.sections[mo] : null;
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(`<span class="cal-c cal-e"></span>`);
    for (let dd = 1; dd <= days; dd++) {
      const dt = new Date(y, mo, dd), f = Fast.info(dt);
      const ii = sec ? sec.items.findIndex((it) => parseInt(it.title, 10) === dd) : -1;
      const lit = litDay(f, ii >= 0 ? sec.items[ii] : null);
      const today = dt.toDateString() === now.toDateString();
      const href = ii >= 0 ? `#/tipikoja/${mo}/${ii}` : "";
      const cls = `cal-c${today ? " today" : ""}${f.level && f.level.cls !== "free" ? " lv-" + f.level.cls : ""}${f.great ? " great" : ""}${dt.getDay() === 0 ? " sun" : ""}`;
      const title = [f.feast, f.period, f.level && f.level.name].filter(Boolean).join(" · ");
      const tag = href ? `a href="${href}"` : "span";
      cells.push(`<${tag} class="${cls}" title="${esc(title)}"><b>${dd}</b>${lit ? `<i class="cal-x">✝</i>` : ""}</${href ? "a" : "span"}>`);
    }
    return `<section class="cal">
      <header class="cal-head"><button class="icon-btn" data-cal="-1" aria-label="Muaji i mëparshëm">${icon("back")}</button>
        <h3>${MUAJ[mo]} ${y}</h3><button class="icon-btn" data-cal="1" aria-label="Muaji tjetër"><svg style="transform:scaleX(-1)"><use href="#i-back"/></svg></button></header>
      <div class="cal-grid">${["H", "M", "M", "E", "P", "Sh", "D"].map((w) => `<span class="cal-w">${w}</span>`).join("")}${cells.join("")}</div>
      <div class="cal-legend"><span><i class="cal-x">✝</i>Liturgji</span><span><i class="lg lv-fish"></i>Peshk</span><span><i class="lg lv-oil"></i>Vaj e verë</span><span><i class="lg lv-strict"></i>E rreptë</span><span><i class="lg lv-dairy"></i>Pa mish</span></div>
    </section>`;
  }
  function mountCalendar(book) {
    const slot = $("#calSlot");
    if (!slot) return;
    if (!calMonth) { const n = new Date(); calMonth = [n.getFullYear(), n.getMonth()]; }
    slot.innerHTML = calendarHtml(book, calMonth[0], calMonth[1]);
    $$("[data-cal]", slot).forEach((b) => b.addEventListener("click", () => {
      let [y, mo] = calMonth;
      mo += +b.dataset.cal;
      if (mo < 0) { mo = 11; y--; }
      if (mo > 11) { mo = 0; y++; }
      calMonth = [y, mo];
      mountCalendar(book);
      $(".cal-grid", slot).classList.add(+b.dataset.cal > 0 ? "flip-l" : "flip-r");
    }));
  }

  const Today = (() => {
    let data = null, loading = null;
    const dkey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
    function parseReading(r) {
      if (!r || !r.html) return null;
      const m = r.html.match(/data-scripture='([^']+)'/);
      if (!m) return { display: r.display, verses: [] };
      const ta = document.createElement("textarea");
      ta.innerHTML = m[1];
      try {
        const sd = JSON.parse(ta.value);
        return {
          display: r.display,
          book: (sd.book && sd.book.name && sd.book.name.sq) || "",
          ref: sd.reference || r.display,
          verses: (sd.verses || []).map((v) => ({ c: v.chapter, v: v.verse, t: (v.text && (v.text.sq || v.text.en)) || "" })).filter((v) => v.t),
        };
      } catch (e) { return { display: r.display, verses: [] }; }
    }
    function niceDisplay(rd) {
      if (!rd) return "";
      if (!rd.verses.length || !rd.book) return rd.display;
      const a = rd.verses[0], b = rd.verses[rd.verses.length - 1];
      return a.c === b.c ? `${rd.book} ${a.c}:${a.v}-${b.v}` : `${rd.book} ${a.c}:${a.v}–${b.c}:${b.v}`;
    }
    async function load(force) {
      const cached = store.get("today", null);
      if (!force && cached && cached.key === dkey()) { data = JSON.parse(ortho(JSON.stringify(cached))); return data; }
      if (loading) return loading;
      loading = (async () => {
        try {
          const r = await fetch(SITE + "wp-json/oa/v1/today-church/", { credentials: "omit" });
          if (!r.ok) throw new Error("HTTP " + r.status);
          const j = await r.json();
          data = {
            key: dkey(), date: j.date, title: j.title, fasting: j.fasting,
            commemorations: j.commemorations || [],
            saints: ((j.saints_posts_i18n && j.saints_posts_i18n.sq) || j.saints_posts || []).map((p) => ({ title: p.title, link: p.permalink, img: p.image })),
            epistle: parseReading(j.epistle), gospel: parseReading(j.gospel),
            geron: j.gerontikon ? { section: j.gerontikon.section, text: j.gerontikon.text } : null,
          };
          data = JSON.parse(ortho(JSON.stringify(data)));
          store.set("today", data);
        } catch (e) { data = cached || null; }
        loading = null;
        return data;
      })();
      return loading;
    }
    return { load, get data() { return data; }, niceDisplay };
  })();

  function todayCardHtml(t) {
    if (!t) return "";
    const ep = t.epistle, gs = t.gospel;
    return `
      <section class="today-card">
        <p class="eyebrow">Sot në Kishë · ${esc(t.date || "")}</p>
        <h2 class="today-title">${esc(t.title || "")}</h2>
        ${t.commemorations.length ? `<p class="today-comm">${t.commemorations.map(esc).join(" · ")}</p>` : ""}
        ${(() => { const f = Fast.info(new Date()); const FC = { fish_permitted: "Lejohet peshku", oil_wine: "Lejohen vaj e verë", strict: "Kreshmë e rreptë", no_fast: "Pa kreshmë", fast_free: "Pa kreshmë", dairy_permitted: "Lejohen bulmeti dhe peshku", wine_oil: "Lejohen vaj e verë" };
          const tip = t.fasting ? (FC[t.fasting] || (/^[a-z_]+$/.test(t.fasting) ? "" : t.fasting)) : "";
          return fastCardHtml(f, { liturgy: litDay(f, null), tip: tip && f.level && tip === f.level.name ? "" : tip }); })()}
        <div class="today-reads">
          ${ep && ep.verses.length ? `<a class="today-read" href="#/dita/apostulli">${icon("letter")}<span><b>Apostulli</b><small>${esc(Today.niceDisplay(ep))}</small></span></a>` : ""}
          ${gs && gs.verses.length ? `<a class="today-read" href="#/dita/ungjilli">${icon("book")}<span><b>Ungjilli</b><small>${esc(Today.niceDisplay(gs))}</small></span></a>` : ""}
          <a class="today-read" href="#/sinaksari/sot">${icon("calendar")}<span><b>Sinaksari</b><small>Shenjtorët e sotëm</small></span></a>
        </div>
        ${t.saints.length ? `<div class="today-saints">${t.saints.map((s) => `
          <a class="saint-chip" href="#/lajm/shenjt/${encodeURIComponent((s.link.split("ods_saint=")[1] || "").split("&")[0])}">
            ${s.img ? `<span class="saint-img" style="background-image:url('${esc(s.img)}')"></span>` : ""}<span>${esc(s.title)}</span></a>`).join("")}</div>` : ""}
        ${t.geron ? `<a class="today-geron" href="#/dita/jerontikon">${icon("quote")}<span><b>Historia e ditës</b><small>${esc(shortText(t.geron.text, 90))}</small></span></a>` : ""}
      </section>`;
  }

  async function viewDay(which) {
    const t = Today.data || (await Today.load());
    setNav("lexo");
    if (!t) { mainPane.innerHTML = `<div class="empty">${icon("calendar")}<h3>Pa internet</h3><p>Leximet e ditës shfaqen kur ka internet.</p></div>`; setMode("read"); return; }
    if (which === "jerontikon" && t.geron) {
      mainPane.innerHTML = `<header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h2 style="font-size:15px">Jerontikoni</h2></header>
        <article class="reader"><p class="eyebrow">Historia e ditës · ${esc(t.geron.section || "")}</p>
        <div class="verses"><p class="verse para" data-i="0" tabindex="0" role="button">${esc(t.geron.text)}</p></div></article>`;
      $(".verse", mainPane).addEventListener("click", (e) => VerseSheet.open({ kind: "eterit", id: "geron:" + t.key, text: shortText(t.geron.text, 260), ref: "Jerontikoni", link: "#/dita/jerontikon" }, e.currentTarget));
    } else {
      const rd = which === "apostulli" ? t.epistle : t.gospel;
      const label = which === "apostulli" ? "Apostulli i ditës" : "Ungjilli i ditës";
      if (!rd) return;
      const disp = Today.niceDisplay(rd);
      mainPane.innerHTML = `<header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h2 style="font-size:15px">${esc(t.date || "")}</h2></header>
        <article class="reader"><h2 class="reading-title">${label}</h2><p class="super ref-exact">${esc(disp)}</p>
        <div class="verses" lang="sq">${rd.verses.map((v, i) => `<p class="verse" data-i="${i}" tabindex="0" role="button"><sup>${v.v}</sup>${esc(v.t)}</p>`).join("")}</div></article>`;
      $$(".verse", mainPane).forEach((el) => el.addEventListener("click", () => {
        const v = rd.verses[+el.dataset.i];
        VerseSheet.open({ kind: which === "apostulli" ? "apostulli" : "ungjilli", id: `dita:${which}:${v.c}:${v.v}`, text: v.t, ref: `${rd.book} ${v.c}:${v.v}`, link: `#/dita/${which}` }, el);
      }));
    }
    enter(mainPane);
    setMode("read");
    mainPane.scrollTop = 0;
  }


  /* =====================================================================
     BIBLA E PLOTË — BiblaPro (me origjinalin greqisht/hebraisht) dhe bible.com (Shoqëria Biblike)
     Hapen live brenda aplikacionit: gjithmonë të përditësuara, pa kopjuar tekstet e tyre.
     ===================================================================== */
  const BIBLE_BOOKS = [
    ["GEN", "Zanafilla", 50], ["EXO", "Eksodi", 40], ["LEV", "Levitiku", 27], ["NUM", "Numrat", 36], ["DEU", "Ligji i Përtërirë", 34],
    ["JOS", "Jozueu", 24], ["JDG", "Gjyqtarët", 21], ["RUT", "Ruthi", 4], ["1SA", "1 Samuelit", 31], ["2SA", "2 Samuelit", 24],
    ["1KI", "1 Mbretërve", 22], ["2KI", "2 Mbretërve", 25], ["1CH", "1 Kronikave", 29], ["2CH", "2 Kronikave", 36], ["EZR", "Esdra", 10],
    ["NEH", "Nehemia", 13], ["EST", "Ester", 10], ["JOB", "Jobi", 42], ["PSA", "Psalmet", 150], ["PRO", "Fjalët e Urta", 31],
    ["ECC", "Predikuesi", 12], ["SNG", "Kantiku i Kantikëve", 8], ["ISA", "Isaia", 66], ["JER", "Jeremia", 52], ["LAM", "Vajtimet", 5],
    ["EZK", "Ezekieli", 48], ["DAN", "Danieli", 12], ["HOS", "Osea", 14], ["JOL", "Joeli", 3], ["AMO", "Amosi", 9], ["OBA", "Abdia", 1],
    ["JON", "Jona", 4], ["MIC", "Mikea", 7], ["NAM", "Nahumi", 3], ["HAB", "Habakuku", 3], ["ZEP", "Sofonia", 3], ["HAG", "Hagai", 2],
    ["ZEC", "Zakaria", 14], ["MAL", "Malakia", 4],
    ["MAT", "Mateu", 28], ["MRK", "Marku", 16], ["LUK", "Lluka", 24], ["JHN", "Joani", 21], ["ACT", "Veprat", 28], ["ROM", "Romakëve", 16],
    ["1CO", "1 Korintasve", 16], ["2CO", "2 Korintasve", 13], ["GAL", "Galatasve", 6], ["EPH", "Efesianëve", 6], ["PHP", "Filipianëve", 4],
    ["COL", "Kolosianëve", 4], ["1TH", "1 Thesalonikasve", 5], ["2TH", "2 Thesalonikasve", 3], ["1TI", "1 Timoteut", 6], ["2TI", "2 Timoteut", 4],
    ["TIT", "Titi", 3], ["PHM", "Filemoni", 1], ["HEB", "Hebrenjve", 13], ["JAS", "Jakobi", 5], ["1PE", "1 Pjetrit", 5], ["2PE", "2 Pjetrit", 3],
    ["1JN", "1 Joanit", 5], ["2JN", "2 Joanit", 1], ["3JN", "3 Joanit", 1], ["JUD", "Juda", 1], ["REV", "Zbulesa", 22],
  ];
  const BIBLE_SOURCES = {
    biblapro: { label: "Bibla PRO", note: "Përkthimi i Ri nga Origjinali · me tekstin grek/hebraisht", home: "https://biblapro.com/read?book=Zan&chapter=1&verse=1" },
    albb: { label: "Shoqëria Biblike", note: "Bibla Shqip 1994 · bible.com", ver: 7, abbr: "ALBB" },
  };
  let bibleSrc = store.get("bibleSrc", "biblapro");
  if (!BIBLE_SOURCES[bibleSrc]) bibleSrc = "biblapro";

  function bibleUrl(src, book, ch, q) {
    const s = BIBLE_SOURCES[src];
    if (src === "biblapro") return store.get("bp.last", s.home);
    if (q) return `https://www.bible.com/sq/search/bible?q=${encodeURIComponent(q)}&version_id=${s.ver}`;
    return `https://www.bible.com/sq/bible/${s.ver}/${book}.${ch}.${s.abbr}`;
  }

  async function viewBible() {
    const s = BIBLE_SOURCES[bibleSrc];
    const loc = store.get("bible.loc." + bibleSrc, { book: s.nt ? "MAT" : "GEN", ch: 1 });
    const books = BIBLE_BOOKS.filter((b, i) => !s.nt || i >= 39);
    const cur = BIBLE_BOOKS.find((b) => b[0] === loc.book) || books[0];
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Bibla</h1></header>
      <div class="seg bible-seg" role="tablist">${Object.entries(BIBLE_SOURCES).map(([k, v]) => `<button data-bsrc="${k}" aria-checked="${k === bibleSrc}">${esc(v.label)}</button>`).join("")}</div>
      <p class="bible-note">${esc(s.note)}</p>
      ${bibleSrc !== "biblapro" ? `
      <div class="bible-nav">
        <select id="bBook" aria-label="Libri">${books.map((b) => `<option value="${b[0]}"${b[0] === cur[0] ? " selected" : ""}>${esc(b[1])}</option>`).join("")}</select>
        <select id="bCh" aria-label="Kapitulli">${Array.from({ length: cur[2] }, (_, i) => `<option${i + 1 === loc.ch ? " selected" : ""}>${i + 1}</option>`).join("")}</select>
        <button class="icon-btn" id="bPrev" aria-label="Kapitulli i mëparshëm">${icon("back")}</button>
        <button class="icon-btn" id="bNext" aria-label="Kapitulli tjetër"><svg style="transform:scaleX(-1)"><use href="#i-back"/></svg></button>
      </div>
      <form class="search bible-search" id="bSearch"><span>${icon("search")}</span><input id="bQ" type="search" placeholder="Kërko në Bibël…" enterkeyhint="search"></form>` : ""}
      <div class="bible-frame-wrap"><button class="icon-btn bible-fs" aria-label="Ekran i plotë">⤢</button><div class="bible-loading">${icon("book")}<span>Po hapet…</span></div>
        <iframe id="bibleFrame" title="Bibla" src="${esc(bibleUrl(bibleSrc, cur[0], loc.ch))}" referrerpolicy="no-referrer-when-downgrade" allow="autoplay; fullscreen"></iframe></div>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    const frame = $("#bibleFrame");
    frame.addEventListener("load", () => {
      $(".bible-loading", listPane)?.remove();
      try { if (bibleSrc === "biblapro" && frame.contentWindow.location.href) store.set("bp.last", frame.contentWindow.location.href); } catch (e) { /* faqe e huaj */ }
    });
    $(".bible-fs", listPane).addEventListener("click", (e) => { const w = e.currentTarget.parentElement; const on = w.classList.toggle("full"); e.currentTarget.textContent = on ? "✕" : "⤢"; document.body.classList.toggle("bible-full", on); haptic(10); });
    $$("[data-bsrc]", listPane).forEach((b) => b.addEventListener("click", () => { bibleSrc = b.dataset.bsrc; store.set("bibleSrc", bibleSrc); viewBible(); }));
    if (bibleSrc === "biblapro") return;
    const go = (book, ch) => {
      const bk = BIBLE_BOOKS.find((b) => b[0] === book);
      ch = Math.max(1, Math.min(bk[2], ch));
      store.set("bible.loc." + bibleSrc, { book, ch });
      frame.src = bibleUrl(bibleSrc, book, ch);
      $("#bCh").innerHTML = Array.from({ length: bk[2] }, (_, i) => `<option${i + 1 === ch ? " selected" : ""}>${i + 1}</option>`).join("");
      $("#bBook").value = book;
    };
    $("#bBook").addEventListener("change", (e) => go(e.target.value, 1));
    $("#bCh").addEventListener("change", (e) => go($("#bBook").value, +e.target.value));
    $("#bPrev").addEventListener("click", () => {
      const l = store.get("bible.loc." + bibleSrc, { book: cur[0], ch: 1 });
      if (l.ch > 1) return go(l.book, l.ch - 1);
      const i = BIBLE_BOOKS.findIndex((b) => b[0] === l.book);
      if (i > (s.nt ? 39 : 0)) go(BIBLE_BOOKS[i - 1][0], BIBLE_BOOKS[i - 1][2]);
    });
    $("#bNext").addEventListener("click", () => {
      const l = store.get("bible.loc." + bibleSrc, { book: cur[0], ch: 1 });
      const bk = BIBLE_BOOKS.find((b) => b[0] === l.book);
      if (l.ch < bk[2]) return go(l.book, l.ch + 1);
      const i = BIBLE_BOOKS.findIndex((b) => b[0] === l.book);
      if (i < BIBLE_BOOKS.length - 1) go(BIBLE_BOOKS[i + 1][0], 1);
    });
    $("#bSearch").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#bQ").value.trim();
      if (q) frame.src = bibleUrl(bibleSrc, null, null, q);
    });
  }

  /* =====================================================================
     v1.6 — RRUGA IME (seria ditore) · FJALA PËR TY · DITA E EMRIT
     ===================================================================== */
  const dkey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  // ---------- Rruga ime: sa ditë rresht me Fjalën ----------
  const Streak = (() => {
    const MILE = { 3: "3 ditë rresht — fillim i bekuar!", 7: "Një javë e plotë me Fjalën!", 12: "12 ditë — sa Apostujt!",
      30: "Një muaj me Fjalën e Shenjtë!", 40: "40 ditë — si Kreshma e Madhe!", 50: "50 ditë — si Pendikostia!",
      100: "100 ditë! Zoti të bekoftë!", 365: "Një vit i tërë me Fjalën!" };
    const days = () => store.get("streak.days", []);
    function count() {
      const set = new Set(days()), d = new Date();
      if (!set.has(dkey(d))) d.setDate(d.getDate() - 1);
      let n = 0;
      while (set.has(dkey(d))) { n++; d.setDate(d.getDate() - 1); }
      return n;
    }
    function mark() {
      const k = dkey(new Date()), ds = days();
      if (ds.includes(k)) return null;
      ds.push(k);
      while (ds.length > 400) ds.shift();
      store.set("streak.days", ds);
      const n = count();
      if (n > store.get("streak.best", 0)) store.set("streak.best", n);
      return MILE[n] ? { n, msg: MILE[n] } : null;
    }
    function html() {
      const n = count(), best = Math.max(n, store.get("streak.best", 0)), set = new Set(days());
      const goals = Object.keys(MILE).map(Number);
      const next = goals.find((m) => m > n) || n + 1, prev = [...goals].reverse().find((m) => m <= n) || 0;
      const pct = Math.round(((n - prev) / (next - prev)) * 100);
      const dots = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dots.push(`<i class="${set.has(dkey(d)) ? "on" : ""}${i === 0 ? " now" : ""}"></i>`);
      }
      return `<section class="streak${n >= 7 ? " hot" : ""}" id="streakCard">
        <div class="sf" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="streak-main">
          <p class="streak-n"><b>${n}</b> ${n === 1 ? "ditë" : "ditë rresht"} me Fjalën</p>
          <div class="streak-bar"><i style="width:${pct}%"></i></div>
          <p class="streak-sub">Synimi: ${next} ditë · Rekordi: ${best}</p>
          <div class="streak-dots">${dots.join("")}</div>
        </div></section>`;
    }
    return { mark, count, html };
  })();

  // shkëndija ari për çastet e veçanta
  function goldBurst(x, y) {
    const box = document.createElement("div");
    box.className = "burst";
    box.style.left = (x == null ? innerWidth / 2 : x) + "px";
    box.style.top = (y == null ? innerHeight / 2 : y) + "px";
    for (let i = 0; i < 28; i++) {
      const s = document.createElement("i");
      const a = (i / 28) * Math.PI * 2 + Math.random() * 0.4, r = 70 + Math.random() * 110;
      s.style.setProperty("--dx", Math.cos(a) * r + "px");
      s.style.setProperty("--dy", Math.sin(a) * r + "px");
      s.style.animationDelay = Math.random() * 0.12 + "s";
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 1600);
  }

  // ---------- Fjala për ty: tërhiq një kartë (prek ose tunde telefonin) ----------
  let drawItem = null;
  // fjalë që prekin shpirtin: vargje të sakta nga Ungjilli e Psaltiri i aplikacionit dhe fjalë të shenjtorëve
  const POWER = [
    ["Ejani tek unë gjithë sa jeni të lodhur e të ngarkuar, edhe unë do t'ju preh ju.", "Mattheu 11:28", "Fjala e Krishtit"],
    ["Paqe po ju lë, paqen time po ju jap juve, jua jap juve jo siç e jep bota.", "Joani 14:27", "Fjala e Krishtit"],
    ["Unë jam drita e botës.", "Joani 8:12", "Fjala e Krishtit"],
    ["Unë jam udha edhe e vërteta edhe jeta.", "Joani 14:6", "Fjala e Krishtit"],
    ["Unë jam ngjallja dhe jeta.", "Joani 11:25", "Fjala e Krishtit"],
    ["Lum ata që nuk panë dhe besuan.", "Joani 20:29", "Fjala e Krishtit"],
    ["Lum ata që vajtojnë, sepse ata do të ngushëllohen.", "Mattheu 5:4", "Fjala e Krishtit"],
    ["Mos u shqetësoni, pra, për të nesërmen, sepse e nesërmja do të shqetësohet për punët e saj.", "Mattheu 6:34", "Fjala e Krishtit"],
    ["Mos kini frikë, pra, ju vleni më tepër se shumë harabela.", "Mattheu 10:31", "Fjala e Krishtit"],
    ["Unë jam bariu i mirë, bariu i mirë vë jetën e tij për dhentë.", "Joani 10:11", "Fjala e Krishtit"],
    ["Unë jam buka e gjallë që zbriti nga qielli.", "Joani 6:51", "Fjala e Krishtit"],
    ["O Atë, në duart e tua jap shpirtin tim.", "Llukai 23:46", "Fjala e Krishtit"],
    ["Zoti është bariu im dhe asgjë nuk do të më mungojë.", "Psalmi 22:1", "Psaltiri"],
    ["Edhe nëse shkoj përmes hijes së vdekjes, nuk do të kem frikë nga ndonjë e keqe, se ti je bashkë me mua.", "Psalmi 22:4", "Psaltiri"],
    ["Zoti është ndriçimi im edhe shpëtimtari im, nga kush do të trembem?", "Psalmi 26:1", "Psaltiri"],
    ["Perëndia ynë është strehë dhe fuqi, ndihmë në shtrëngimet e mëdha që na gjetën.", "Psalmi 45:1", "Psaltiri"],
    ["Ndihma ime vjen nga Zoti, që bëri qiellin dhe dheun.", "Psalmi 120:2", "Psaltiri"],
    ["Zoti është pranë atyre që kanë zemër të dërrmuar; dhe shpëton të përulurit në frymë.", "Psalmi 33:18", "Psaltiri"],
    ["Krijo zemër të pastër tek unë, o Perëndi, dhe përtëri frymë të drejtë në thellësitë e zemrës sime.", "Psalmi 50:10", "Psaltiri"],
    ["Hidhe përkujdesjen tënde mbi Zotin, edhe ai do të të ushqejë.", "Psalmi 54:22", "Psaltiri"],
    ["Zbuloja udhën tënde Zotit dhe shpreso tek ai, edhe ai do të veprojë.", "Psalmi 36:5", "Psaltiri"],
    ["Përse je i hidhëruar, o shpirti im, dhe përse më trondit? Shpreso në Perëndinë.", "Psalmi 41:5", "Psaltiri"],
    ["Zotin e shoh gjithnjë përpara syve, se është në të djathtën time, që të mos lëkundem.", "Psalmi 15:8", "Psaltiri"],
    ["Fito paqen e shpirtit, dhe mijëra rreth teje do të shpëtohen.", "Shën Serafimi i Sarovit", "Etërit e Kishës"],
    ["Lavdi Perëndisë për të gjitha!", "Shën Joan Gojarti", "Etërit e Kishës"],
    ["Mbaje mendjen tënde në ferr dhe mos u dëshpëro.", "Shën Siluani i Athosit", "Etërit e Kishës"],
    ["Bëj paqe me veten, dhe qielli e toka do të bëjnë paqe me ty.", "Shën Isaku i Sirisë", "Etërit e Kishës"],
    ["Krishti është gëzimi, drita e vërtetë, lumturia. Krishti është shpresa jonë.", "Shën Porfiri i Kavsokalivisë", "Etërit e Kishës"],
    ["Na krijove për Ty, o Zot, dhe zemra jonë nuk gjen prehje derisa të prehet te Ti.", "Shën Augustini", "Etërit e Kishës"],
    ["Zbrit me mendjen në zemër dhe qëndro aty përpara Zotit.", "Shën Theofani i Vetmuar", "Etërit e Kishës"],
  ];
  function drawPool() {
    if (Math.random() < 0.7) {
      const k = rand(POWER.length), [t, r, l] = POWER[k];
      const ps = /^Psalmi (\d+):/.exec(r);
      return { kind: ps ? "psaltiri" : l === "Etërit e Kishës" ? "eterit" : "ungjilli", id: "fuqi:" + k, text: t, ref: r,
        link: ps ? `#/psaltiri/${ps[1]}` : l === "Etërit e Kishës" ? "#/eterit" : "", label: l };
    }
    const out = [];
    const ps = data.psaltiri, et = data.eterit;
    for (let k = 0; k < 40 && ps; k++) {
      const p = ps.psalms[rand(ps.psalms.length)], vi = rand(p.v.length), t = p.v[vi];
      if (t.length < 45 || t.length > 200) continue;
      out.push({ kind: "psaltiri", id: `ps:${p.n}:${vi + 1}`, text: t, ref: psalmRef(p.n, vi + 1), link: `#/psaltiri/${p.n}`, label: "Psaltiri" });
      break;
    }
    if (et) {
      for (let k = 0; k < 12; k++) {
        const i = rand(et.quotes.length), q = et.quotes[i];
        if (q.t.length > 210) continue;
        out.push({ kind: "eterit", id: `et:${i}`, text: q.t, ref: q.a, link: "#/eterit", label: "Etërit e Kishës" });
        break;
      }
    }
    return out[rand(out.length)];
  }
  async function viewDraw() {
    await Promise.all(["psaltiri", "eterit", "imazhet"].map(load));
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Fjala për ty</h1></header>
      <p class="draw-hint">Prek kartën ose tunde telefonin.</p>
      <div class="draw-left"></div>
      <div class="draw-stage">
        <div class="draw-rays" aria-hidden="true"></div>
        <button class="draw-card" id="drawCard" aria-label="Tërhiq një fjalë">
          <span class="dc-inner">
            <span class="dc-back">${icon("cross")}<b>Fjala e Shenjtë</b><small>Prek për të marrë fjalën tënde</small></span>
            <span class="dc-front"><span class="dc-photo"></span><span class="dc-text"><small class="dc-label"></small><q></q><cite></cite></span></span>
          </span>
        </button>
      </div>
      <div class="draw-actions" hidden>
        <button class="btn" data-dact="like">${icon("heart")}<span>Pëlqej</span></button>
        <button class="btn primary" data-dact="share">${icon("send")}<span>Ndaj</span></button>
        <button class="btn" data-dact="again">${icon("refresh")}<span>Tjetër</span></button>
      </div>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    const cardEl = $("#drawCard"), acts = $(".draw-actions", listPane);
    const MAX = 3, dk = "draw." + dkey(new Date());
    const todays = () => store.get(dk, []);
    const leftEl = $(".draw-left", listPane);
    const showLeft = () => {
      const n = MAX - todays().length;
      leftEl.innerHTML = n > 0 ? Array.from({ length: MAX }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("") + `<span>${n} ${n === 1 ? "fjalë" : "fjalë"} për sot</span>`
        : `<span>Kthehu nesër 🌅</span>`;
      $('[data-dact="again"]', acts).hidden = n <= 0;
    };
    let busy = false;
    let viewIdx = -1;   // pa limit: rishiko fjalët e marra sot
    const reveal = () => {
      if (busy) return;
      const got = todays();
      if (got.length >= MAX && cardEl.classList.contains("flipped")) { toast("Kthehu nesër 🙏"); return; }
      busy = true;
      const flip = () => {
        if (got.length >= MAX) { viewIdx = (viewIdx + 1) % got.length; drawItem = got[viewIdx]; }
        else { drawItem = drawPool(); if (drawItem) { const l = todays(); l.push(drawItem); store.set(dk, l); } }
        if (!drawItem) { busy = false; return; }
        if (sharedPick && !drawItem.photo) drawItem.photo = sharedPick(drawItem);
        $(".dc-photo", cardEl).style.backgroundImage = drawItem.photo ? `url('${drawItem.photo}')` : "";
        $(".dc-label", cardEl).textContent = drawItem.label;
        $("q", cardEl).textContent = ortho(drawItem.text);
        $("cite", cardEl).textContent = drawItem.ref;
        const lk = $('[data-dact="like"]', acts), on = isLiked(drawItem.id);
        lk.classList.toggle("on", on);
        lk.querySelector("use").setAttribute("href", "#i-" + (on ? "heart-fill" : "heart"));
        cardEl.classList.add("flipped");
        $(".draw-stage", listPane).classList.add("lit");
        showLeft();
        const r = cardEl.getBoundingClientRect();
        setTimeout(() => { goldBurst(r.left + r.width / 2, r.top + r.height / 2); acts.hidden = false; enter(acts); busy = false; }, 520);
        if (navigator.vibrate) try { navigator.vibrate([12, 40, 18]); } catch (e) { /* */ }
      };
      if (cardEl.classList.contains("flipped")) {
        cardEl.classList.remove("flipped");
        $(".draw-stage", listPane).classList.remove("lit");
        setTimeout(flip, 480);
      } else flip();
    };
    cardEl.addEventListener("click", reveal);
    showLeft();
    if (todays().length >= MAX) { acts.hidden = false; }
    $$("[data-dact]", acts).forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.dact;
      if (a === "again") return reveal();
      if (!drawItem) return;
      if (a === "share") return ShareSheet.open(drawItem);
      const on = toggleLike(drawItem);
      b.classList.toggle("on", on);
      b.querySelector("use").setAttribute("href", "#i-" + (on ? "heart-fill" : "heart"));
    }));
    // tunde telefonin
    let lastShake = 0;
    const onMotion = (e) => {
      if (!location.hash.startsWith("#/fjala")) { removeEventListener("devicemotion", onMotion); return; }
      const g = e.accelerationIncludingGravity || e.acceleration;
      if (!g) return;
      const m = Math.sqrt((g.x || 0) ** 2 + (g.y || 0) ** 2 + (g.z || 0) ** 2);
      if (m > 24 && Date.now() - lastShake > 1500) { lastShake = Date.now(); reveal(); }
    };
    addEventListener("devicemotion", onMotion);
  }

  // ---------- Shërbesat e GOARCH (Digital Chant Stand) ----------
  async function viewDcs() {
    const DCS = "https://dcs.goarch.org/goa/dcs/dcs.html";
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Shërbesat · DCS</h1>
        <button class="icon-btn" id="dcsHome" aria-label="Fillimi">${icon("home")}</button></header>
      <div class="bible-frame-wrap"><div class="bible-loading">${icon("candle")}<span>Po hapen shërbesat…</span></div>
        <iframe id="dcsFrame" title="Shërbesat" src="${DCS}" referrerpolicy="no-referrer" allow="fullscreen"></iframe></div>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    const fr = $("#dcsFrame");
    fr.addEventListener("load", () => $(".bible-loading", listPane)?.remove());
    $("#dcsHome").addEventListener("click", () => { fr.src = DCS + "?t=" + Date.now(); });
  }

  // ---------- Diptikët: emrat e të gjallëve dhe të fjeturve për lutje ----------
  async function viewDiptychs(mode) {
    const L = store.get("dipt.living", []), D = store.get("dipt.dead", []);
    if (mode === "lutu") {
      const prayLiving = L.length ? `<section class="dp-pray"><p class="eyebrow">Për të gjallët</p>
          <p class="dp-text">Kujto, o Zot, shërbëtorët e tu <b>${L.map(esc).join(", ")}</b>; dhuroju shëndet e shpëtim, paqe e mëshirë, dhe ruaji nën strehën e hirit tënd. Amin.</p></section>` : "";
      const prayDead = D.length ? `<section class="dp-pray dead"><p class="eyebrow">Për të fjeturit</p>
          <p class="dp-text">Prehi, o Zot, shpirtrat e shërbëtorëve të tu të fjetur <b>${D.map(esc).join(", ")}</b>, në vend të ndritur, në vend të gjelbëruar, në vend prehjeje, ku nuk ka dhimbje, as trishtim, as psherëtimë. Përjetë kujtimi i tyre. Amin.</p></section>` : "";
      listPane.innerHTML = `
        <header class="page-head"><a class="back-btn" href="#/diptiket" aria-label="Kthehu">${icon("back")}</a><h1>Lutu për ta</h1></header>
        <div class="dp-stage"><div class="dp-candle">${realCandle({ at: Date.now() - 3600e3, kind: "gjalle" }, true)}</div>
          ${prayLiving}${prayDead}
          ${!L.length && !D.length ? `<p class="draw-hint">Shto emra te Diptikët që të lutesh për ta.</p>` : ""}
          <a class="btn primary" href="#/lutja" id="dpCandle">${icon("candle")}<span>Ndiz një qiri për ta</span></a></div>`;
      enter(listPane);
      $("#dpCandle").addEventListener("click", () => { prayerTab = "qiri"; store.set("prayerTab", "qiri"); });
      mainPane.innerHTML = emptyMain();
      setMode("list");
      return;
    }
    const list = (arr, key, dead) => `<section class="dp-list${dead ? " dead" : ""}">
        <h3>${dead ? "✝ Për të fjeturit" : "Për të gjallët"} <small>${arr.length}</small></h3>
        <form class="dp-add" data-key="${key}"><input maxlength="40" placeholder="${dead ? "p.sh. gjyshi Kristo" : "p.sh. nëna Eleni"}" autocomplete="off"><button class="btn" type="submit">${icon("plus")}</button></form>
        <ul>${arr.map((n, i) => `<li><span>${esc(n)}</span><button class="icon-btn small" data-del="${key}:${i}" aria-label="Hiq">${icon("close")}</button></li>`).join("")}</ul></section>`;
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Diptikët</h1></header>
      ${list(L, "dipt.living", false)}${list(D, "dipt.dead", true)}
      <div class="dp-go"><a class="btn primary" href="#/diptiket/lutu">${icon("cross")}<span>Lutu për ta tani</span></a></div>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    $$(".dp-add", listPane).forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = f.querySelector("input").value.trim();
      if (!v) return;
      const arr = store.get(f.dataset.key, []); arr.push(v); store.set(f.dataset.key, arr.slice(-60));
      viewDiptychs();
    }));
    $$("[data-del]", listPane).forEach((b) => b.addEventListener("click", () => {
      const [k, i] = b.dataset.del.split(":"); const arr = store.get(k, []); arr.splice(+i, 1); store.set(k, arr); viewDiptychs();
    }));
  }

  // ---------- Plotëso vargun: loja e Psaltirit ----------
  const STOP = new Set("edhe dhe është janë sepse ashtu atëherë kështu prandaj mbi nga për tek në që por ose nuk mos asnjë gjithë cilët cili cila atij asaj tyre tona tuaj tënde tënd tim time sime sime".split(" "));
  async function viewQuiz() {
    const ps = await load("psaltiri");
    // ---- të dhënat e lojtarit: rekorde, XP, medalje, sfida e ditës ----
    const best = Object.assign({ gap: 0, order: 0, which: 0, cont: 0, odd: 0, blitz: 0, daily: 0 }, store.get("quiz2", {}));
    const prof = Object.assign({ xp: 0, games: 0, wins: 0, maxCombo: 0, maxLevel: 0, played: {}, badges: {}, daily: {}, dstreak: 0, dlast: "" }, store.get("quiz.prof", {}));
    const saveProf = () => store.set("quiz.prof", prof);
    const RANKS = [[0, "Lexues"], [400, "Psalt"], [1200, "Kantor"], [3000, "Domestik"], [6000, "Protopsalt"], [11000, "Mjeshtër i Psaltirit"]];
    const rankOf = (xp) => { let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++; return { i, name: RANKS[i][1], from: RANKS[i][0], to: (RANKS[i + 1] || [RANKS[i][0]])[0] }; };
    const MODES = {
      gap: ["Fjalët që mungojnë", "Gjej me radhë fjalët e fshehura të vargut", "✍️"],
      order: ["Rendit vargun", "Vargu u copëtua: vendosi pjesët në rregull", "🧩"],
      which: ["Cili Psalm?", "Lexo vargun dhe gjej nga cili psalm është", "📜"],
      cont: ["Vazhdo vargun", "Zgjidh si vazhdon vargu i nisur", "➡️"],
      odd: ["Fjala e huaj", "Një fjalë është ndërruar: gjeje dhe preke", "🔎"],
      blitz: ["Maratona 60\"", "Sa më shumë pyetje të përziera në 60 sekonda", "⚡"],
    };
    const BADGES = [
      ["first", "🕊", "Hapi i parë", "Fito raundin e parë"],
      ["combo5", "🔥", "Zjarr i shenjtë", "5 përgjigje radhazi"],
      ["lvl5", "⛰", "Ngjitja", "Arrij nivelin 5"],
      ["k1", "🏆", "Një mijë", "1000 pikë në një lojë"],
      ["all", "🎼", "Gjithë Psaltiri", "Luaj të 6 mënyrat"],
      ["d3", "📅", "Besnik", "Sfida e ditës 3 ditë radhazi"],
      ["d7", "✝", "Javë e shenjtë", "Sfida e ditës 7 ditë radhazi"],
      ["perfect", "⭐", "Pa gabim", "Sfida e ditës 7/7"],
    ];
    const award = (k) => { if (prof.badges[k]) return; prof.badges[k] = Date.now(); saveProf(); const b = BADGES.find((x) => x[0] === k); if (b) setTimeout(() => toast(`${b[1]} Medalje e re: ${b[2]}`), 600); };
    // ---- rastësia: e zakonshme, ose e njëjta për të gjithë në sfidën e ditës ----
    let R = Math.random;
    const seeded = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const rnd = (n) => Math.floor(R() * n), shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const words = (v) => [...v.matchAll(/[\p{L}’']{4,}/gu)].filter((m) => !STOP.has(m[0].toLowerCase()));
    const pickVerse = (min, max) => { for (let t = 0; t < 160; t++) { const p = ps.psalms[rnd(ps.psalms.length)], vi = rnd(p.v.length), v = p.v[vi]; if (v.length >= min && v.length <= max) return { p, vi, v }; } return null; };
    const todayKey = isoToday();
    let G = null, timer = 0, blitzT = 0;
    const alive = () => location.hash.startsWith("#/kuiz");
    const stop = () => { clearInterval(timer); clearInterval(blitzT); };

    function home() {
      stop(); R = Math.random;
      const rk = rankOf(prof.xp), pct = rk.to > rk.from ? Math.min(100, (prof.xp - rk.from) / (rk.to - rk.from) * 100) : 100;
      const dDone = prof.daily[todayKey];
      const nb = Object.keys(prof.badges).length;
      listPane.innerHTML = `
        <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Loja e Psaltirit</h1></header>
        <section class="qz-home">
          <div class="qz-rank glass">
            <div class="qz-orb">${icon("lyre")}</div>
            <div class="qz-rank-t"><small>Grada jote</small><b>${rk.name}</b>
              <div class="qz-xp"><i style="width:${pct.toFixed(1)}%"></i></div>
              <small>${prof.xp} XP${rk.to > rk.from ? ` · edhe ${rk.to - prof.xp} për «${RANKS[rk.i + 1][1]}»` : " · grada më e lartë"}</small></div>
          </div>
          <button class="qz-daily${dDone ? " done" : ""}" data-mode="daily">
            <span class="qz-daily-i">${dDone ? "✓" : "☀️"}</span>
            <span><b>Sfida e ditës</b><small>${dDone ? `Sot: ${dDone.ok}/7 · ${dDone.score} pikë · kthehu nesër` : "7 vargje, të njëjtat për të gjithë sot"}</small></span>
            <em>${prof.dstreak ? `🔥 ${prof.dstreak}` : ""}</em>
          </button>
          <div class="qz-modes">${Object.entries(MODES).map(([k, [t, d, e]], i) => `
            <button class="qz-mode2 glass" data-mode="${k}" style="--i:${i}"><span class="qz-m-e">${e}</span><b>${t}</b><small>${d}</small><em>🏆 ${best[k] || 0}</em></button>`).join("")}</div>
          <details class="qz-badges glass"${nb ? "" : " open"}><summary>Medaljet · ${nb}/${BADGES.length}</summary>
            <div class="qz-bgrid">${BADGES.map(([k, e, n, d]) => `<div class="qz-b${prof.badges[k] ? " on" : ""}"><span>${e}</span><b>${n}</b><small>${d}</small></div>`).join("")}</div></details>
          <p class="qz-stats">${prof.games} lojëra · ${prof.wins} vargje të gjetura · kombinimi më i gjatë ${prof.maxCombo}</p>
        </section>`;
      enter(listPane);
      $$("[data-mode]", listPane).forEach((x) => x.addEventListener("click", () => {
        const m = x.dataset.mode;
        if (m === "daily" && prof.daily[todayKey]) { haptic(8); toast("Sfidën e sotme e ke bërë. Kthehu nesër ☀️"); return; }
        haptic(18); start(m);
      }));
    }
    function start(mode) {
      stop();
      R = mode === "daily" ? seeded([...todayKey].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) : Math.random;
      G = { mode, score: 0, lives: mode === "blitz" ? Infinity : 3, level: 1, streak: 0, combo: 0, n: 0, ok: 0, hint: 1, plus: 1, t0: Date.now() };
      prof.played[mode] = 1; if (Object.keys(MODES).every((k) => prof.played[k])) award("all"); saveProf();
      if (mode === "blitz") { G.end = Date.now() + 60000; blitzT = setInterval(() => { if (!alive()) return stop(); const left = (G.end - Date.now()) / 1000; const b = $("#qzBar"); if (b) { b.style.width = Math.max(0, left / 60 * 100) + "%"; b.classList.toggle("hurry", left < 10); } const s = $("#qzSec"); if (s) s.textContent = Math.max(0, Math.ceil(left)); if (left <= 0) { stop(); if (G.q) G.q.done = true; over(); } }, 200); }
      round();
    }
    const title = () => G.mode === "daily" ? "Sfida e ditës" : MODES[G.mode][0];
    const livesH = () => G.mode === "blitz" ? `<span class="qz-sec">⏱ <b id="qzSec">60</b></span>` : G.mode === "daily" ? `<span class="qz-sec">${G.n + 1}/7</span>` : `<span class="qz-lives">${"❤".repeat(G.lives)}<i>${"❤".repeat(3 - G.lives)}</i></span>`;
    const hud = () => `<div class="qz-hud glass">${livesH()}<span class="qz-lvl">Niveli ${G.level}</span><span class="qz-pts"><b>${G.score}</b>${G.combo > 1 ? `<small>×${G.combo}</small>` : ""}</span></div><div class="qz-time"><i id="qzBar"></i></div>`;
    const tools = () => G.mode === "blitz" ? "" : `<div class="qz-tools"><button class="qz-tool" id="qzHint"${G.hint ? "" : " disabled"}>💡 Ndihmë</button><button class="qz-tool" id="qzPlus"${G.plus && G.mode !== "daily" ? "" : " disabled"}>⏳ +8 sek</button></div>`;
    const head = () => `<header class="page-head"><button class="back-btn" id="qzQuit" aria-label="Dil">${icon("back")}</button><h1>${title()}</h1></header>`;
    const card = (vv, inner, cls = "") => `<section class="qz-card glass ${cls}"><p class="eyebrow">${vv ? esc(psalmRef(vv.p.n, vv.vi + 1)) : "Psalmi ?"}</p>${inner}</section>`;
    function typeFor() {
      if (G.mode === "blitz" || G.mode === "daily") { const ts = ["gap", "which", "cont", "odd", "order"]; return ts[(G.n + (G.mode === "daily" ? 0 : rnd(5))) % ts.length]; }
      return G.mode;
    }
    function round() {
      clearInterval(timer);
      if (!alive()) return;
      const L = G.level, type = typeFor();
      const secs = G.mode === "blitz" ? 0 : Math.max(9, 26 - L * 1.6) + (type === "order" ? 6 : 0);
      let q = { type };
      if (type === "gap") {
        const gaps = L < 3 ? 1 : L < 6 ? 2 : 3;
        let vv = null;
        for (let t = 0; t < 60; t++) { vv = pickVerse(50, 200); if (vv && words(vv.v).length >= gaps + 1) break; }
        const ws = words(vv.v);
        const chosen = shuffle(ws.slice()).slice(0, gaps).sort((x, y) => x.index - y.index);
        const nOpt = Math.min(8, 3 + gaps + Math.floor(L / 3));
        const opts = new Set(chosen.map((m) => m[0]));
        for (let k = 0; k < 400 && opts.size < nOpt; k++) {
          const w = words(pickVerse(20, 300).v); if (!w.length) continue;
          const c = w[rnd(w.length)][0], ref = chosen[rnd(chosen.length)][0];
          if (L >= 4 && Math.abs(c.length - ref.length) > 2) continue;
          if (L >= 7 && c[0].toLowerCase() !== ref[0].toLowerCase() && R() < 0.7) continue;
          if (!chosen.some((m) => m[0].toLowerCase() === c.toLowerCase())) opts.add(c);
        }
        Object.assign(q, vv, { chosen, next: 0 });
        let html = "", pos = 0;
        chosen.forEach((m, i) => { html += esc(vv.v.slice(pos, m.index)) + `<span class="qz-gap${i === 0 ? " cur" : ""}" data-g="${i}">${"＿".repeat(Math.min(7, m[0].length))}</span>`; pos = m.index + m[0].length; });
        html += esc(vv.v.slice(pos));
        listPane.innerHTML = head() + hud() + card(vv, `<p class="qz-verse">${html}</p>`) + `<div class="qz-opts">${shuffle([...opts]).map((o, i) => `<button class="btn qz-opt" style="--i:${i}" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>` + tools();
        q.answer = () => q.chosen[q.next][0];
        $$(".qz-opt", listPane).forEach((x) => x.addEventListener("click", () => {
          if (x.disabled || q.done) return;
          if (x.dataset.o === q.answer()) {
            x.disabled = true; x.classList.add("right");
            const g = $(`.qz-gap[data-g="${q.next}"]`, listPane); g.textContent = q.answer(); g.classList.remove("cur"); g.classList.add("ok");
            haptic(16); q.next++;
            if (q.next >= q.chosen.length) win(x); else $(`.qz-gap[data-g="${q.next}"]`, listPane).classList.add("cur");
          } else bad(x);
        }));
      } else if (type === "order") {
        const vv = pickVerse(60, 170);
        const ws = vv.v.split(/\s+/);
        const nChunks = Math.min(ws.length, 3 + Math.min(5, Math.floor(L / 1.5)));
        const per = Math.ceil(ws.length / nChunks), chunks = [];
        for (let i = 0; i < ws.length; i += per) chunks.push(ws.slice(i, i + per).join(" "));
        const order = chunks.map((_, i) => i);
        do { shuffle(order); } while (order.length > 1 && order.every((x, i) => x === i));
        Object.assign(q, vv, { chunks, next: 0 });
        listPane.innerHTML = head() + hud() + card(vv, `<p class="qz-verse qz-built"><span class="qz-caret"></span></p>`) + `<div class="qz-chunks">${order.map((ci, k) => `<button class="btn qz-chunk" style="--i:${k}" data-c="${ci}">${esc(chunks[ci])}</button>`).join("")}</div>` + tools();
        q.answer = () => String(q.next);
        $$(".qz-chunk", listPane).forEach((x) => x.addEventListener("click", () => {
          if (x.disabled || q.done) return;
          if (+x.dataset.c === q.next) {
            x.disabled = true; x.classList.add("used");
            $(".qz-caret", listPane).insertAdjacentHTML("beforebegin", `<span class="qz-piece">${esc(q.chunks[q.next])} </span>`);
            haptic(14); q.next++;
            if (q.next >= q.chunks.length) win(x);
          } else bad(x);
        }));
      } else if (type === "which" || type === "cont") {
        // Cili Psalm? — opsione me numra psalmesh (në nivele të larta: psalme fqinjë)
        // Vazhdo vargun — gjysma e dytë e vargut midis gjysmave të vargjeve të tjera
        const vv = pickVerse(type === "cont" ? 70 : 40, 230);
        Object.assign(q, vv);
        let opts, right, inner;
        if (type === "which") {
          const n = +vv.p.n; right = String(n);
          const set = new Set([right]);
          for (let k = 0; k < 200 && set.size < 4; k++) { const d = L >= 4 ? (rnd(11) - 5) : (rnd(150) + 1 - n); const m = n + d; if (m >= 1 && m <= 151 && m !== n) set.add(String(m)); }
          opts = shuffle([...set]).map((x) => [x, `Psalmi ${x}`]);
          inner = `<p class="qz-verse">${esc(vv.v)}</p>`;
          q.hide = true;
        } else {
          const cut = (v) => { const ws = v.split(/\s+/), h = Math.max(3, Math.floor(ws.length * 0.5)); return [ws.slice(0, h).join(" "), ws.slice(h).join(" ")]; };
          const [a, b] = cut(vv.v); right = b;
          const set = new Set([b]);
          for (let k = 0; k < 200 && set.size < (L >= 5 ? 5 : 4); k++) { const o = pickVerse(70, 230); if (o && o.v !== vv.v) set.add(cut(o.v)[1]); }
          opts = shuffle([...set]).map((x) => [x, x.length > 90 ? x.slice(0, 88) + "…" : x]);
          inner = `<p class="qz-verse">${esc(a)} <span class="qz-gap cur">…</span></p>`;
        }
        listPane.innerHTML = head() + hud() + card(type === "which" ? null : vv, inner) + `<div class="qz-opts${type === "cont" ? " wide" : ""}">${opts.map(([k, t], i) => `<button class="btn qz-opt" style="--i:${i}" data-o="${esc(k)}">${esc(t)}</button>`).join("")}</div>` + tools();
        q.answer = () => right;
        $$(".qz-opt", listPane).forEach((x) => x.addEventListener("click", () => {
          if (x.disabled || q.done) return;
          if (x.dataset.o === right) {
            x.classList.add("right");
            if (type === "which") $(".qz-card .eyebrow", listPane).textContent = psalmRef(vv.p.n, vv.vi + 1);
            else { const g = $(".qz-gap", listPane); g.textContent = right; g.classList.remove("cur"); g.classList.add("ok"); }
            win(x);
          } else bad(x);
        }));
      } else if (type === "odd") {
        // një fjalë e vargut zëvendësohet me një fjalë nga një varg tjetër: gjeje
        let vv = null, ws = [];
        for (let t = 0; t < 60; t++) { vv = pickVerse(60, 190); ws = vv ? words(vv.v) : []; if (ws.length >= 4) break; }
        const target = ws[1 + rnd(ws.length - 2)];
        let rep = null;
        for (let k = 0; k < 300 && !rep; k++) { const w = words(pickVerse(20, 300).v); if (!w.length) continue; const c = w[rnd(w.length)][0]; if (c.toLowerCase() !== target[0].toLowerCase() && (L < 4 || Math.abs(c.length - target[0].length) <= 2)) rep = c; }
        Object.assign(q, vv);
        const tokens = []; let pos = 0;
        for (const m of [...vv.v.matchAll(/[\p{L}’']+/gu)]) { tokens.push([vv.v.slice(pos, m.index), null]); const isT = m.index === target.index; tokens.push([isT ? rep : m[0], isT ? "x" : "w"]); pos = m.index + m[0].length; }
        tokens.push([vv.v.slice(pos), null]);
        listPane.innerHTML = head() + hud() + card(vv, `<p class="qz-verse qz-odd">${tokens.map(([t, k], i) => k ? `<button class="qz-w" data-k="${k}" data-i="${i}">${esc(t)}</button>` : esc(t)).join("")}</p><p class="qz-sub">Prek fjalën që nuk është e Psalmit</p>`) + tools();
        q.answer = () => "x"; q.real = target[0];
        $$(".qz-w", listPane).forEach((x) => x.addEventListener("click", () => {
          if (q.done || x.classList.contains("no")) return;
          if (x.dataset.k === "x") { x.classList.add("fixed"); x.textContent = q.real; win(x); }
          else { x.classList.add("no"); bad(x); }
        }));
      }
      G.q = q; q.t0 = Date.now(); q.secs = secs;
      enter(listPane);
      $("#qzQuit").addEventListener("click", () => { if (G.mode === "blitz" || G.score > 0) over(); else home(); });
      bindTools();
      const bar = $("#qzBar");
      if (G.mode === "blitz") { const left = (G.end - Date.now()) / 1000; bar.style.width = Math.max(0, left / 60 * 100) + "%"; const s = $("#qzSec"); if (s) s.textContent = Math.max(0, Math.ceil(left)); return; }
      bar.style.transition = "none"; bar.style.width = "100%"; void bar.offsetWidth;
      bar.style.transition = `width ${secs}s linear`; bar.style.width = "0%";
      timer = setInterval(() => {
        if (!alive()) return clearInterval(timer);
        const left = q.secs - (Date.now() - q.t0) / 1000;
        bar.classList.toggle("hurry", left < 5);
        if (left <= 0) { clearInterval(timer); lose("Koha mbaroi ⏳"); }
      }, 250);
    }
    function bindTools() {
      $("#qzHint")?.addEventListener("click", (e) => {
        const q = G.q; if (!G.hint || q.done) return; G.hint = 0; e.currentTarget.disabled = true; haptic(10);
        // ndihma: hiq gjysmën e opsioneve të gabuara, ose shëno pjesën / fjalën e radhës
        if (q.type === "odd") { const w = $$('.qz-w[data-k="w"]:not(.no)', listPane); shuffle(w).slice(0, Math.ceil(w.length * 0.6)).forEach((x) => x.classList.add("dim")); return; }
        if (q.type === "order") { const nx = $(`.qz-chunk[data-c="${q.next}"]`, listPane); nx && nx.classList.add("glow"); return; }
        const wrong = $$(".qz-opt:not(.right):not([disabled])", listPane).filter((x) => x.dataset.o !== q.answer());
        shuffle(wrong).slice(0, Math.max(1, Math.floor(wrong.length / 2))).forEach((x) => { x.disabled = true; x.classList.add("gone"); });
      });
      $("#qzPlus")?.addEventListener("click", (e) => {
        const q = G.q; if (!G.plus || q.done) return; G.plus = 0; e.currentTarget.disabled = true; haptic(10);
        q.secs += 8; const bar = $("#qzBar"), left = q.secs - (Date.now() - q.t0) / 1000;
        bar.style.transition = "none"; bar.style.width = Math.min(100, left / q.secs * 100) + "%"; void bar.offsetWidth;
        bar.style.transition = `width ${left}s linear`; bar.style.width = "0%";
      });
    }
    function setHud() { const h = $(".qz-hud", listPane); if (h) h.outerHTML = hud().split('<div class="qz-time">')[0]; if (G.mode === "blitz") { const s = $("#qzSec"); if (s) s.textContent = Math.max(0, Math.ceil((G.end - Date.now()) / 1000)); } }
    function bad(x) {
      if (x) { x.classList.remove("wrong"); void x.offsetWidth; x.classList.add("wrong"); }
      G.combo = 0;
      haptic([50, 40, 90], true);
      const c = $(".qz-card", listPane); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake");
      if (G.mode === "blitz") { G.end -= 4000; setHud(); return; }
      if (G.mode === "daily") { G.q.done = true; clearInterval(timer); reveal(); setHud(); next(`<span class="qz-miss">Jo kësaj radhe</span>`); return; }
      G.lives--; setHud();
      if (G.lives <= 0) { clearInterval(timer); G.q.done = true; reveal(); setTimeout(over, 1100); }
    }
    function reveal() {
      const q = G.q;
      if (q.type === "gap") q.chosen.forEach((m, i) => { const g = $(`.qz-gap[data-g="${i}"]`, listPane); if (g && !g.classList.contains("ok")) { g.textContent = m[0]; g.classList.add("no"); } });
      else if (q.type === "order") { const v = $(".qz-built", listPane); if (v) v.innerHTML = `<span class="qz-piece no">${esc(q.v)}</span>`; }
      else if (q.type === "odd") { const x = $('.qz-w[data-k="x"]', listPane); if (x) { x.classList.add("reveal"); x.textContent = q.real; } }
      else { $$(".qz-opt", listPane).forEach((x) => { if (x.dataset.o === q.answer()) x.classList.add("right"); }); if (q.type === "which") $(".qz-card .eyebrow", listPane).textContent = psalmRef(q.p.n, q.vi + 1); }
      $$(".qz-opt, .qz-chunk", listPane).forEach((x) => (x.disabled = true));
    }
    function next(html) {
      const q = G.q;
      G.n++;
      if (G.mode === "daily" && G.n >= 7) { setTimeout(over, 1300); listPane.insertAdjacentHTML("beforeend", `<div class="qz-after">${html}</div>`); return; }
      if (G.mode === "blitz") { setTimeout(() => { if (alive() && Date.now() < G.end) round(); }, 650); listPane.insertAdjacentHTML("beforeend", `<div class="qz-after">${html}</div>`); return; }
      listPane.insertAdjacentHTML("beforeend", `<div class="qz-after">${html}<a class="btn" href="#/psaltiri/${q.p.n}">${icon("book")}<span>Psalmi</span></a><button class="btn primary" id="qzNext">Tjetri ›</button></div>`);
      $("#qzNext").addEventListener("click", () => { haptic(12); round(); });
    }
    function win(btn) {
      clearInterval(timer);
      const q = G.q; q.done = true;
      const left = G.mode === "blitz" ? 3 : Math.max(0, q.secs - (Date.now() - q.t0) / 1000);
      G.combo++; G.streak++; G.ok++;
      prof.wins++; award("first");
      if (G.combo > prof.maxCombo) prof.maxCombo = G.combo;
      if (G.combo >= 5) award("combo5");
      const pts = Math.round(10 * G.level * (1 + (G.combo - 1) * 0.25) + left * 2);
      G.score += pts;
      let up = false;
      if (G.streak % 3 === 0) { G.level++; up = true; if (G.level > prof.maxLevel) prof.maxLevel = G.level; if (G.level >= 5) award("lvl5"); }
      if (G.score >= 1000) award("k1");
      saveProf();
      const r = btn.getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top);
      haptic(up ? [30, 50, 30, 50, 120] : [20, 40, 40], true);
      $(".qz-card", listPane).classList.add("won");
      setHud();
      next(`<span class="qz-plus">+${pts}</span>${up ? `<span class="qz-up">Niveli ${G.level}!</span>` : ""}`);
    }
    function lose(msg) {
      const q = G.q; if (q.done) return; q.done = true;
      G.combo = 0;
      haptic([60, 50, 120], true);
      reveal();
      if (G.mode === "daily") { setHud(); next(`<span class="qz-miss">${esc(msg)}</span>`); return; }
      G.lives--; setHud();
      if (G.lives <= 0) return setTimeout(over, 1100);
      next(`<span class="qz-miss">${esc(msg)}</span>`);
    }
    function over() {
      stop();
      if (!alive()) return;
      const mode = G.mode, rec = G.score > (best[mode] || 0);
      if (rec) { best[mode] = G.score; store.set("quiz2", best); }
      const xp = G.score + G.ok * 5;
      const before = rankOf(prof.xp).i;
      prof.xp += xp; prof.games++;
      let dmsg = "";
      if (mode === "daily") {
        const y = new Date(); y.setDate(y.getDate() - 1); const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
        prof.dstreak = prof.dlast === yk ? prof.dstreak + 1 : 1; prof.dlast = todayKey;
        prof.daily[todayKey] = { ok: G.ok, score: G.score };
        if (prof.dstreak >= 3) award("d3"); if (prof.dstreak >= 7) award("d7"); if (G.ok === 7) award("perfect");
        dmsg = `<p class="qz-dres">${"⭐".repeat(Math.ceil(G.ok / 7 * 5))}${"☆".repeat(5 - Math.ceil(G.ok / 7 * 5))}<br>${G.ok}/7 të sakta · 🔥 ${prof.dstreak} ditë radhazi</p>`;
      }
      saveProf();
      const rk = rankOf(prof.xp), upRank = rk.i > before;
      listPane.innerHTML = `
        <header class="page-head"><button class="back-btn" id="qzQuit" aria-label="Dil">${icon("back")}</button><h1>Loja mbaroi</h1></header>
        <section class="qz-over glass">
          <p class="eyebrow">${esc(mode === "daily" ? "Sfida e ditës" : MODES[mode][0])}</p>
          <b class="qz-final">${G.score}</b>
          ${dmsg}
          <p>${rec ? "🏆 Rekord i ri!" : `Rekordi: ${best[mode]}`} · Niveli ${G.level} · +${xp} XP</p>
          ${upRank ? `<p class="qz-uprank">Grada e re: <b>${rk.name}</b> ✨</p>` : ""}
          <p class="qz-verse-s">“Fjala jote është llambë për këmbët e mia.”<small>Psalmi 118:105</small></p>
          <div class="row"><button class="btn" id="qzHome">Mënyrat</button>${mode === "daily" ? "" : `<button class="btn primary grow" id="qzAgain">${icon("refresh")}<span>Luaj përsëri</span></button>`}</div>
        </section>`;
      enter(listPane);
      if (rec || upRank) goldBurst();
      $("#qzQuit").addEventListener("click", home);
      $("#qzHome").addEventListener("click", home);
      $("#qzAgain")?.addEventListener("click", () => start(mode));
    }
    home();
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  // ---------- Ikona e ditës: lëviz telefonin dhe ikona merr jetë ----------
  // ================= Ikona e ditës — “shiko dhe fshi” =================
  // Ikonat NUK janë në APK dhe NUK ruhen në telefon: lista lexohet vetëm për muajin që shikon
  // (data/imazhet_MM.json), çdo foto merret me fetch(..., {cache:"no-store"}) → blob → URL e përkohshme,
  // dhe fshihet nga memoria (revokeObjectURL) sapo kalon te tjetra, del nga faqja ose app shkon në sfond.
  const ICON_BASE = "https://nelo1231.github.io/fjala-e-shenjte-live";
  const onIconHost = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.href.startsWith(ICON_BASE);
  const iconUrl = (f) => (/^https?:/.test(f) ? f : onIconHost() ? f : ICON_BASE + "/" + String(f).replace(/^\/+/, ""));
  const dayMonths = {};
  async function loadDayMonth(mm) {
    if (dayMonths[mm]) return dayMonths[mm];
    let j = null;
    for (const u of [`${onIconHost() ? "" : ICON_BASE + "/"}data/imazhet_${mm}.json?t=${Date.now()}`, `data/imazhet_${mm}.json`]) {
      try { const r = await fetch(u, { cache: "no-store" }); if (r.ok) { j = await r.json(); break; } } catch (e) { /* pa internet */ }
    }
    return (dayMonths[mm] = (j && j.images) || []);
  }
  const blobs = new Set();
  async function iconBlob(file) {
    const r = await fetch(iconUrl(file), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const u = URL.createObjectURL(await r.blob());
    blobs.add(u);
    return u;
  }
  function freeIcons(keep) {
    blobs.forEach((u) => { if (!keep || !keep.includes(u)) { URL.revokeObjectURL(u); blobs.delete(u); } });
  }
  // vendos foton (blob) te çdo element me data-ic="<skedari>"
  function hydrateIcons(root) {
    $$("[data-ic]", root).forEach((el) => {
      iconBlob(el.dataset.ic).then((u) => { if (el.isConnected) { el.style.backgroundImage = `url('${u}')`; el.classList.add("ld"); } else { URL.revokeObjectURL(u); blobs.delete(u); } })
        .catch(() => el.classList.add("err"));
    });
  }
  addEventListener("visibilitychange", () => { if (document.hidden) freeIcons(); else if (/^#\/ikona/.test(location.hash) && !$(".icv")) route(); });
  addEventListener("pagehide", () => freeIcons());
  // në nisje: fshi çdo gjurmë të vjetër të ikonave nga cache-t e shfletuesit
  if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.open(k).then((c) => c.keys().then((reqs) => reqs.forEach((q) => { if (/ig_|apostujt/.test(q.url)) c.delete(q); }))))).catch(() => {});

  const pad2 = (n) => String(n).padStart(2, "0");
  const isoDay2 = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const keyOfIcon = (im) => {
    if (im.dita) return im.dita;
    const m = String(im.file || "").match(/(20\d\d)[-_.]?(\d\d)[-_.]?(\d\d)/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return im.date ? `${new Date().getFullYear()}-${im.date}` : "";
  };
  async function monthIcons(mm) {
    const groups = {};
    (await loadDayMonth(mm)).forEach((im) => { const k = keyOfIcon(im); if (k) (groups[k] = groups[k] || []).push(im); });
    const days = Object.keys(groups).sort().reverse();
    return { groups, days };
  }
  // muaji i fundit që ka ikona (nga ky muaj mbrapa, deri në 12 muaj)
  async function latestIconMonth() {
    const d = new Date();
    for (let k = 0; k < 12; k++) {
      const mm = pad2(((d.getMonth() - k + 12) % 12) + 1);
      const r = await monthIcons(mm);
      if (r.days.length) return { mm, ...r };
    }
    return null;
  }
  const fmtDay = (k, short) => {
    const [y, m, d] = k.split("-").map(Number); const dt = new Date(y, m - 1, d);
    return short ? `${d} ${MUAJ_G[m - 1].slice(0, 3)} ${y}` : `${["E diel", "E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë"][dt.getDay()]}, ${d} ${MUAJ_G[m - 1]} ${y}`;
  };
  // shikuesi në ekran të plotë: vetëm ikonat e një dite; në fund → faqja me datat
  async function iconViewer(dayKey) {
    const mm = dayKey.slice(5, 7);
    const { groups } = await monthIcons(mm);
    const seq = groups[dayKey] || [];
    if (!seq.length) return;
    const today = isoDay2(new Date());
    let i = 0, cur = null, nextU = null;
    const el = document.createElement("div");
    el.className = "icv";
    el.innerHTML = `<div class="icv-bg"></div><div class="icv-card"><div class="icv-img"></div><span class="icv-spin"></span></div>
      <div class="icv-top"><span class="icv-date"></span><button class="icv-x" aria-label="Mbyll">${icon("close")}</button></div>
      <p class="icv-cap"></p><div class="icv-bar"></div><p class="icv-hint">Prek për ikonën tjetër</p>`;
    document.body.appendChild(el);
    const show = async (dir) => {
      const it = seq[i];
      $(".icv-date", el).textContent = fmtDay(dayKey) + (dayKey === today ? " · sot" : "") + (seq.length > 1 ? ` · ${i + 1}/${seq.length}` : "");
      const c = $(".icv-cap", el); c.textContent = it.pershkrimi || ""; c.hidden = !it.pershkrimi;
      $(".icv-bar", el).innerHTML = seq.length <= 40 ? seq.map((_, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("") : `<b>${i + 1} / ${seq.length}</b>`;
      el.classList.add("loading");
      let u;
      try { u = nextU && nextU.i === i ? await nextU.p : await iconBlob(it.file); } catch (e) { u = null; }
      if (!el.isConnected) { if (u) { URL.revokeObjectURL(u); blobs.delete(u); } return; }
      const card = $(".icv-card", el);
      card.classList.remove("in", "next"); void card.offsetWidth; card.classList.add(dir ? "next" : "in");
      $(".icv-img", el).style.backgroundImage = u ? `url('${u}')` : "";
      $(".icv-bg", el).style.backgroundImage = u ? `url('${u}')` : "";
      el.classList.remove("loading");
      const prev = cur; cur = u;
      if (prev) { URL.revokeObjectURL(prev); blobs.delete(prev); }          // e mëparshmja fshihet nga memoria
      nextU = seq[i + 1] ? { i: i + 1, p: iconBlob(seq[i + 1].file).catch(() => null) } : null;   // tjetra paraprakisht
    };
    const close = (toDates) => {
      el.classList.remove("open");
      setTimeout(() => { el.remove(); freeIcons(); }, 320);
      if (nextU) nextU.p.then((u) => { if (u) { URL.revokeObjectURL(u); blobs.delete(u); } });
      if (toDates) location.hash = "#/ikona/datat/" + mm;
    };
    requestAnimationFrame(() => el.classList.add("open"));
    show(false);
    el.addEventListener("click", (e) => {
      if (e.target.closest(".icv-x")) return close(false);
      haptic(12);
      if (i < seq.length - 1) { i++; show(true); } else close(true);
    });
    let y0 = null;
    el.addEventListener("pointerdown", (e) => { y0 = e.clientY; });
    el.addEventListener("pointerup", (e) => { if (y0 != null && e.clientY - y0 > 120) close(false); y0 = null; });
  }
  async function viewIcon(sub, mmArg) {
    freeIcons();
    const today = isoDay2(new Date());
    const head = (extra) => `<header class="page-head"><a class="back-btn" href="${sub === "datat" ? "#/ikona" : "#/lexo"}" aria-label="Kthehu">${icon("back")}</a><h1>${sub === "datat" ? "Të gjitha ditët" : "Ikona e ditës"}</h1>${extra || ""}</header>`;
    listPane.innerHTML = head() + `<div class="icv-wait"><span class="icv-spin"></span></div>`;
    mainPane.innerHTML = emptyMain();
    setMode("list");
    if (sub === "datat") {
      const L = mmArg ? null : await latestIconMonth();
      const mm = mmArg || (L ? L.mm : pad2(new Date().getMonth() + 1));
      const { groups, days } = L && L.mm === mm ? L : await monthIcons(mm);
      if (!location.hash.startsWith("#/ikona")) return;
      const prevM = pad2(((+mm + 10) % 12) + 1), nextM = pad2((+mm % 12) + 1);
      listPane.innerHTML = head() + `
        <div class="icd-month"><a class="btn" href="#/ikona/datat/${prevM}">${icon("back")}</a><b>${MUAJ_G[+mm - 1].replace(/^./, (c) => c.toUpperCase())}</b><a class="btn" href="#/ikona/datat/${nextM}"><svg class="ic-fwd"><use href="#i-back"/></svg></a></div>
        ${days.length ? `<div class="icd-grid">${days.map((k, di) => `<button class="icd" data-day="${k}" style="--i:${di}"><span class="icd-img" data-ic="${esc(groups[k][0].file)}">${groups[k].length > 1 ? `<em>${groups[k].length}</em>` : ""}</span><b>${esc(fmtDay(k, true))}</b>${k === today ? "<small>sot</small>" : ""}</button>`).join("")}</div>`
          : `<div class="empty">${icon("image")}<h3>Asnjë ikonë këtë muaj</h3></div>`}`;
      enter(listPane);
      hydrateIcons(listPane);
      $$(".icd", listPane).forEach((b) => b.addEventListener("click", () => { haptic(12); iconViewer(b.dataset.day); }));
      return;
    }
    const L = await latestIconMonth();
    if (!location.hash.startsWith("#/ikona")) return;
    if (!L) {
      listPane.innerHTML = head() + `<div class="empty">${icon("image")}<h3>Ende asnjë ikonë</h3><p>Ikonat e çdo dite do të dalin këtu, secila me datën e vet. Duhet internet.</p></div>`;
      enter(listPane); return;
    }
    const k = L.days[0], dayList = L.groups[k];
    listPane.innerHTML = head(`<a class="icon-btn" href="#/ikona/datat/${L.mm}" aria-label="Të gjitha ditët">${icon("calendar")}</a>`) + `
      <section class="ics-wrap">
        <p class="ic-date ic-date-top">${esc(fmtDay(k))}${k === today ? " · sot" : ""}</p>
        <button class="ics" id="icStack" aria-label="Hap ikonat">
          ${dayList.slice(0, 3).map((x, j) => `<span class="ics-card" style="--k:${j}" data-ic="${esc(x.file)}"></span>`).reverse().join("")}
          ${dayList.length > 1 ? `<em class="ics-n">${dayList.length}</em>` : ""}
        </button>
        <p class="ics-hint">${dayList.length > 1 ? `Prek kartën · ${dayList.length} ikona të kësaj dite` : "Prek kartën"}</p>
        <a class="btn ics-all" href="#/ikona/datat/${L.mm}">${icon("calendar")}<span>Të gjitha ditët</span></a>
      </section>`;
    enter(listPane);
    hydrateIcons(listPane);
    $("#icStack").addEventListener("click", () => { haptic(14); iconViewer(k); });
  }

  // ---------- Deri në festë: numërimi i gjallë ----------
  let cdTimer = null;
  function nextFeasts() {
    const now = new Date(), y = now.getFullYear(), list = [];
    // c: "z" = Zotërore, "h" = Hyjlindësore, "t" = Triodi, "p" = Pentikostari, "s" = shenjtorë
    for (const yy of [y, y + 1]) {
      const P = Fast.pascha(yy);
      const add = (d, name, big, c, note) => { if (d > now) list.push({ d, name, big, c, note }); };
      const mv = (off, name, big, c, note) => { const t = new Date(P.getFullYear(), P.getMonth(), P.getDate() + off); add(t, name, big, c, note); };
      add(new Date(yy, 0, 1), "Rrethprerja e Zotit", 0, "z", "dhe Shën Vasili i Madh");
      add(new Date(yy, 0, 6), "Theofania", 0, "z", "Pagëzimi i Zotit");
      add(new Date(yy, 1, 2), "Ipapandia", 0, "z", "Kushtimi i Zotit në Tempull");
      add(new Date(yy, 2, 25), "Ungjillëzimi i Hyjlindëses", 0, "h");
      add(new Date(yy, 5, 29), "Apostujt Petro dhe Pavël", 0, "s");
      add(new Date(yy, 7, 6), "Shndërrimi i Zotit", 0, "z");
      add(new Date(yy, 7, 15), "Fjetja e Hyjlindëses", 1, "h");
      add(new Date(yy, 8, 8), "Lindja e Hyjlindëses", 0, "h");
      add(new Date(yy, 8, 14), "Lartësimi i Kryqit të Nderuar", 0, "z", "ditë agjërimi");
      add(new Date(yy, 10, 21), "Hyrja në Tempull e Hyjlindëses", 0, "h");
      add(new Date(yy, 11, 25), "Krishtlindja", 1, "z");
      // Triodi dhe Pentikostari (lëvizin me Pashkën)
      mv(-70, "Fillon Triodi: e Diela e Tagrambledhësit dhe e Fariseut", 0, "t", "java pa agjërim");
      mv(-63, "E Diela e Djalit Plëngprishës", 0, "t");
      mv(-56, "E Diela e Gjykimit (e Mishit)", 0, "t", "dita e fundit e mishit");
      mv(-49, "E Diela e Faljes (e Djathit)", 0, "t", "Mbrëmja e Faljes");
      mv(-48, "E Hëna e Pastër · fillon Kreshma e Madhe", 0, "t");
      mv(-42, "E Diela e Orthodhoksisë", 0, "t");
      mv(-35, "E Diela e Shën Grigor Pallamait", 0, "t");
      mv(-28, "E Diela e Kryqit", 0, "t");
      mv(-21, "E Diela e Shën Joan Klimakut", 0, "t");
      mv(-14, "E Diela e Shën Marisë së Egjiptit", 0, "t");
      mv(-8, "E Shtuna e Llazarit", 0, "t");
      mv(-7, "E Diela e Dafinave (Hyrja në Jerusalem)", 0, "z");
      mv(-2, "E Premtja e Madhe", 0, "t");
      mv(0, "Pashka · Ngjallja e Krishtit", 1, "z");
      mv(7, "E Diela e Thomait", 0, "p");
      mv(24, "Mesi i Pendikostisë", 0, "p");
      mv(39, "Ngjitja e Zotit (Analipsi)", 0, "z");
      mv(49, "Pendikostia", 0, "z");
      mv(50, "E Hëna e Shpirtit të Shenjtë", 0, "p");
      mv(56, "E Diela e të Gjithë Shenjtorëve", 0, "p", "mbaron Pentikostari");
    }
    return list.sort((a, b) => a.d - b.d);
  }
  function viewCountdown() {
    clearInterval(cdTimer);
    const fs = nextFeasts(), main = fs[0], pascha = fs.find((f) => f.name.startsWith("Pashka"));
    const tri = fs.find((f) => f.name.startsWith("Fillon Triodi"));
    const yearEnd = Date.now() + 366 * 864e5, CAT = { z: "Zotërore", h: "Hyjlindësore", t: "Triodi", p: "Pentikostari", s: "Shenjtorët" };
    const tag = (f) => `<span class="cd-tag cd-${f.c}">${CAT[f.c] || ""}</span>`;
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Deri në festë</h1></header>
      <section class="cd-hero"><p class="eyebrow">E kremtja e ardhshme</p><h2>${esc(main.name)}</h2>
        <div class="cd-digits" id="cdMain"></div><p class="cd-date">${main.d.getDate()} ${MUAJ_G[main.d.getMonth()]} ${main.d.getFullYear()}</p></section>
      ${pascha && pascha !== main ? `<section class="cd-hero pascha"><p class="eyebrow">Krishti u Ngjall!</p><h2>Pashka</h2><div class="cd-digits" id="cdPascha"></div>
        <p class="cd-date">${pascha.d.getDate()} ${MUAJ_G[pascha.d.getMonth()]} ${pascha.d.getFullYear()}</p></section>` : ""}
      ${tri && tri !== main ? `<section class="cd-tri"><p class="eyebrow">Triodi ${tri.d.getFullYear()}</p><b>Fillon të dielën e Tagrambledhësit dhe të Fariseut</b>
        <span>${tri.d.getDate()} ${MUAJ_G[tri.d.getMonth()]} ${tri.d.getFullYear()} · pas ${Math.ceil((tri.d - Date.now()) / 864e5)} ditësh</span>
        <small>Kreshma e Madhe fillon më ${(() => { const k = fs.find((f) => f.name.startsWith("E Hëna e Pastër")); return k ? k.d.getDate() + " " + MUAJ_G[k.d.getMonth()] : ""; })()}</small></section>` : ""}
      <h2 class="hub-h">Të kremtet e vitit</h2>
      <ul class="list cd-list">${fs.slice(1).filter((f) => f.d < yearEnd).map((f) => `<li class="list-item${f.big ? " big" : ""}"><span class="name-d"><b>${f.d.getDate()}</b><small>${MUAJ_G[f.d.getMonth()].slice(0, 3)}</small></span>
        <span class="lbl">${esc(f.name)}<span class="sub">${tag(f)}${f.note ? esc(f.note) + " · " : ""}pas ${Math.ceil((f.d - Date.now()) / 864e5)} ditësh</span></span></li>`).join("")}</ul>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    const fmt = (t) => {
      const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
      const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
      return [[d, "ditë"], [h, "orë"], [m, "min"], [ss, "sek"]].map(([v, l]) => `<span><b>${String(v).padStart(2, "0")}</b><small>${l}</small></span>`).join("");
    };
    const tick = () => {
      if (!location.hash.startsWith("#/numerimi")) { clearInterval(cdTimer); return; }
      if (document.hidden) return;
      $("#cdMain").innerHTML = fmt(main.d);
      if ($("#cdPascha")) $("#cdPascha").innerHTML = fmt(pascha.d);
    };
    tick();
    cdTimer = setInterval(tick, 1000);
  }

  /* =====================================================================
     v2.0 — SHKREPSJA · TEMJANICA · SFIDA 40 DITËSHE · LAVDI PËR TË GJITHA
     ===================================================================== */
  // tinguj të sintetizuar (pa skedarë): shkrepja e shkrepses dhe zilet e temjanicës
  const Sfx = (() => {
    let ctx = null;
    const ac = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) { ctx = null; } return ctx; };
    function strike() {
      const c = ac(); if (!c) return;
      const len = 0.35, buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const t = i / d.length; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * (t < 0.15 ? 1 : 0.45); }
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = 0.8;
      const g = c.createGain(); g.gain.value = 0.5;
      src.connect(bp).connect(g).connect(c.destination); src.start();
    }
    function bell(delay = 0, pitch = 1) {
      const c = ac(); if (!c) return;
      const t0 = c.currentTime + delay, f = (2600 + Math.random() * 900) * pitch;
      [1, 2.76, 5.4].forEach((m, k) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.value = f * m;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.09 / (k + 1), t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3 / (k + 1));
        o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + 1.4);
      });
    }
    const bells = (n = 7, vol = 1) => { for (let i = 0; i < n; i++) bell(i * 0.07 + Math.random() * 0.05, (0.9 + Math.random() * 0.25) * (vol < 0.6 ? 1.08 : 1)); };
    // kërcitje e qymyrit: disa klikime të shkurtra zhurme
    function crackle(n = 9) {
      const c = ac(); if (!c) return;
      for (let i = 0; i < n; i++) {
        const t0 = c.currentTime + Math.random() * 1.2, len = 0.012 + Math.random() * 0.02;
        const b = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 3);
        const src = c.createBufferSource(); src.buffer = b;
        const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200 + Math.random() * 2500;
        const g = c.createGain(); g.gain.value = 0.18 + Math.random() * 0.25;
        src.connect(hp).connect(g).connect(c.destination); src.start(t0);
      }
    }
    // temjani mbi qymyr: cërcërimë e butë që shuhet
    function sizzle(sec = 1.6) {
      const c = ac(); if (!c) return;
      const b = c.createBuffer(1, Math.ceil(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.25);
      const src = c.createBufferSource(); src.buffer = b;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 5200; bp.Q.value = 0.6;
      const g = c.createGain(), t0 = c.currentTime;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t0 + sec);
      src.connect(bp).connect(g).connect(c.destination); src.start(t0);
    }
    return { strike, bells, crackle, sizzle };
  })();

  // ---------- Ndezja me shkrepse ----------
  function matchLight(onLit) {
    // Shkrepsja: fërkohet në kuti → flaka ndizet → afrohet saktë te fitili → fitili kap zjarrin → shkrepsja shuhet me tym
    const el = document.createElement("div");
    el.className = "match-ov m2";
    el.innerHTML = `<div class="match-scene">
        <div class="mb-box"><span class="mb-lid"></span><i class="mb-strip"></i></div>
        <div class="m2-match"><div class="m2-hand"><span class="m2-stick"><b class="m2-head"></b><b class="m2-char"></b></span><span class="m2-flame"><i></i><em></em></span><span class="m2-smoke"><i></i><i></i><i></i></span></div></div>
        <div class="m-candle">${realCandle({ at: Date.now(), kind: candleKind }, true).replace('class="rc', 'class="rc unlit')}</div>
        <p class="m-hint">Tërhiqe shkrepsen mbi kuti<br><small>ose prek</small></p></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    const scene = $(".match-scene", el), M = $(".m2-match", el), rc = $(".m-candle .rc", el);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, T = reduce ? 0.45 : 1;
    // pozicionet (në pikselat e skenës): koka e shkrepses është origjina e elementit .m2-match
    const rel = (r) => { const s = scene.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; };
    const stripPt = (f) => { const b = rel($(".mb-strip", el).getBoundingClientRect()); return { x: b.x + b.w * f, y: b.y + b.h / 2 }; };
    const wickPt = () => { const w = rel($(".m-candle .wick", el).getBoundingClientRect()); return { x: w.x + w.w / 2, y: w.y + Math.min(4, w.h * 0.3) }; };
    const place = (x, y, a) => { M.style.transform = `translate(${x}px, ${y}px)`; M.style.setProperty("--a", a + "deg"); };
    const rest = () => { const p = stripPt(0); place(p.x - 12, p.y - 6, -12); };
    rest();
    let done = false, drag = null;
    const anim = (from, to, ms, ease) => new Promise((res) => {
      const t0 = performance.now(), E = ease || ((t) => 1 - Math.pow(1 - t, 3));
      const step = (now) => {
        const t = Math.min(1, (now - t0) / (ms * T)), e = E(t), k = {};
        for (const key in to) k[key] = from[key] + (to[key] - from[key]) * e;
        // hark i butë në lëvizje (si dorë e vërtetë)
        place(k.x, k.y - (to.arc || 0) * Math.sin(Math.PI * t), k.a);
        t < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
    const sparks = (p) => {
      for (let i = 0; i < 14; i++) {
        const s = document.createElement("i"); s.className = "m2-spark";
        s.style.left = p.x + "px"; s.style.top = p.y + "px";
        s.style.setProperty("--dx", (Math.random() * 90 + 10) + "px"); s.style.setProperty("--dy", (-Math.random() * 70 - 10) + "px");
        s.style.animationDelay = (Math.random() * 0.12) + "s";
        scene.appendChild(s); setTimeout(() => s.remove(), 900);
      }
    };
    const cur = () => { const m = M.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/) || [0, 0, 0]; return { x: +m[1], y: +m[2], a: parseFloat(M.style.getPropertyValue("--a")) || 0 }; };
    async function go() {
      if (done) return; done = true;
      el.classList.add("striking");
      // 1) fërkimi mbi shiritin e kutisë
      const a = stripPt(0.12), b = stripPt(0.88);
      await anim(cur(), { x: a.x - 4, y: a.y - 3, a: -20 }, 160);
      Sfx.strike(); haptic([8, 30, 14]);
      const sweep = anim({ x: a.x - 4, y: a.y - 3, a: -20 }, { x: b.x + 18, y: b.y - 12, a: -14 }, 190, (t) => t);
      setTimeout(() => sparks(stripPt(0.6)), 90);
      await sweep;
      // 2) flaka shpërthen, pastaj qetësohet
      el.classList.add("flare");
      await anim(cur(), { x: b.x + 34, y: b.y - 60, a: -32 }, 420);
      el.classList.remove("flare"); el.classList.add("burning");
      await new Promise((r) => setTimeout(r, 380 * T));
      // 3) afrohu saktë te fitili: flaka (mbi kokë) mbështjell majën e fitilit
      const w = wickPt();
      await anim(cur(), { x: w.x - 3, y: w.y + 13, a: -38, arc: 46 }, 1050, (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      el.classList.add("touch");
      // dridhje e vogël e dorës ndërsa fitili kap
      await anim(cur(), { x: w.x - 1, y: w.y + 11, a: -35 }, 260, (t) => Math.sin(t * Math.PI));
      await new Promise((r) => setTimeout(r, 380 * T));
      rc.classList.add("catching");
      await new Promise((r) => setTimeout(r, 420 * T));
      rc.classList.remove("unlit"); rc.classList.add("igniting");
      haptic([10, 40, 20]);
      { const r = $(".m-candle .wick", el).getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top - 6); }
      // 4) tërhiq shkrepsen dhe shuaje me një lëvizje dore
      await new Promise((r) => setTimeout(r, 300 * T));
      el.classList.remove("touch");
      const p = cur();
      await anim(p, { x: p.x - 70, y: p.y + 70, a: -55 }, 500);
      el.classList.add("shake");
      await new Promise((r) => setTimeout(r, 420 * T));
      el.classList.remove("burning", "shake"); el.classList.add("out");
      await new Promise((r) => setTimeout(r, 900 * T));
      el.classList.remove("open"); setTimeout(() => el.remove(), 420); onLit();
    }
    // tërhiqe vetë shkrepsen mbi shirit, ose thjesht prek
    M.addEventListener("pointerdown", (e) => { if (done) return; drag = { x: e.clientX, y: e.clientY }; M.setPointerCapture(e.pointerId); e.stopPropagation(); });
    M.addEventListener("pointermove", (e) => { if (!drag || done) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 26) { drag = null; go(); } });
    M.addEventListener("pointerup", () => { if (drag && !done) { drag = null; go(); } });
    el.addEventListener("click", (e) => { if (!done && !e.target.closest(".m2-match")) go(); });
  }

  // ---------- Temjanica ----------
  const Smoke = (() => {
    let cv = null, ctx = null, parts = [], raf = 0, srcEl = null, emitUntil = 0, sprite = null;
    function setup() {
      if (cv) return;
      cv = document.createElement("canvas");
      cv.className = "smoke-cv";
      document.body.appendChild(cv);
      ctx = cv.getContext("2d");
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      const fit = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
      fit(); addEventListener("resize", fit);
      sprite = document.createElement("canvas"); sprite.width = sprite.height = 128;
      const s = sprite.getContext("2d"), g = s.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(214,214,222,.5)"); g.addColorStop(0.4, "rgba(196,198,210,.2)"); g.addColorStop(1, "rgba(190,192,205,0)");
      s.fillStyle = g; s.fillRect(0, 0, 128, 128);
    }
    let dens = 0.85;
    function emit(el, seconds) { addMode = false; setup(); srcEl = el; dens = 0.85; emitUntil = Date.now() + seconds * 1000; if (!raf) raf = requestAnimationFrame(loop); }
    // temjani: çdo kokërr shton kohë tymi; sa më shumë kohë mbetet, aq më i dendur tymi
    let addMode = false;
    function add(el, seconds) { addMode = true; setup(); srcEl = el; emitUntil = Math.max(Date.now(), emitUntil) + seconds * 1000; if (!raf) raf = requestAnimationFrame(loop); }
    function loop() {
      raf = 0;
      if (document.hidden) { raf = requestAnimationFrame(loop); return; }
      const now = Date.now();
      if (srcEl && now < emitUntil && srcEl.isConnected) {
        const r = srcEl.getBoundingClientRect();
        const left = (emitUntil - now) / 5000, d = dens === 0.85 && addMode ? Math.min(3.2, 0.45 + left * 0.42) : dens;
        for (let n = Math.floor(d) + (Math.random() < d % 1 ? 1 : 0); n > 0; n--) parts.push({ x: r.left + r.width / 2 + (Math.random() - 0.5) * (10 + d * 6), y: r.top + 6, vx: (Math.random() - 0.5) * 0.5, vy: -0.7 - Math.random() * 0.8,
          s: 10 + Math.random() * 8, a: 0.3 + Math.random() * 0.2, life: 0, max: 380 + Math.random() * 260, rot: Math.random() * 6, sw: Math.random() * 6 });
      }
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const t = now / 1000;
      parts = parts.filter((p) => p.life < p.max);
      for (const p of parts) {
        p.life++;
        const k = p.life / p.max;
        p.vx += Math.sin(t * 0.9 + p.sw + p.y * 0.015) * 0.018;   // vija të lëkundura
        p.vy *= 0.997; p.x += p.vx; p.y += p.vy;
        p.s += 0.25 + k * 0.55;                                     // përhapet në gjithë ekranin
        ctx.globalAlpha = p.a * Math.sin(Math.PI * Math.min(1, k * 1.2)) * (1 - k * 0.6);
        ctx.drawImage(sprite, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      }
      ctx.globalAlpha = 1;
      if (parts.length || now < emitUntil) raf = requestAnimationFrame(loop);
      else { cv.remove(); cv = null; }
    }
    const stop = () => { emitUntil = 0; };
    function puff(el, n = 26) {
      setup(); const r = el.getBoundingClientRect();
      for (let i = 0; i < n; i++) parts.push({ x: r.left + (Math.random() - 0.5) * 40, y: r.top + 4 + Math.random() * 6, vx: (Math.random() - 0.5) * 1.6, vy: -0.6 - Math.random() * 1.6,
        s: 12 + Math.random() * 14, a: 0.35 + Math.random() * 0.25, life: 0, max: 260 + Math.random() * 240, rot: Math.random() * 6, sw: Math.random() * 6 });
      if (!raf) raf = requestAnimationFrame(loop);
    }
    const remaining = () => Math.max(0, emitUntil - Date.now()) / 1000;
    return { emit, add, stop, puff, remaining };
  })();
  // ---- ari dhe argjendi i përbashkët për temjanicën dhe kacinë ----
  const CS_DEFS = `
    <linearGradient id="csGold" x1="0" x2="1"><stop offset="0" stop-color="#5a3a0e"/><stop offset=".16" stop-color="#a87a22"/><stop offset=".36" stop-color="#ffeaa8"/><stop offset=".52" stop-color="#e5b84c"/><stop offset=".78" stop-color="#9a6a1c"/><stop offset="1" stop-color="#4e320b"/></linearGradient>
    <linearGradient id="csGoldV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#d9a93f"/><stop offset="1" stop-color="#6b4612"/></linearGradient>
    <linearGradient id="csSilver" x1="0" x2="1"><stop offset="0" stop-color="#5d6369"/><stop offset=".18" stop-color="#b9bfc6"/><stop offset=".36" stop-color="#ffffff"/><stop offset=".55" stop-color="#d8dce1"/><stop offset=".8" stop-color="#8a9097"/><stop offset="1" stop-color="#555b61"/></linearGradient>
    <radialGradient id="csBellG" cx=".34" cy=".3" r=".75"><stop offset="0" stop-color="#fff7cf"/><stop offset=".3" stop-color="#f3cd62"/><stop offset=".7" stop-color="#b3821f"/><stop offset="1" stop-color="#5e3d0c"/></radialGradient>
    <radialGradient id="csCoalG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2b0"/><stop offset=".35" stop-color="#ff8a1a"/><stop offset=".75" stop-color="#b3260a"/><stop offset="1" stop-color="#3a0d05" stop-opacity="0"/></radialGradient>
    <radialGradient id="csShine" cx=".3" cy=".35" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  const csBell = (x, y, r, k) => `<g class="cs-bell" style="--d:${(k * 0.05).toFixed(2)}s"><path d="M${x} ${y - r - 4} v4" stroke="#b8862a" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#csBellG)" stroke="#6b4612" stroke-width=".5"/>
    <path d="M${x - r * .75} ${y + r * .15} Q${x} ${y + r * .5} ${x + r * .75} ${y + r * .15}" stroke="#4a2e08" stroke-width="${(r * .22).toFixed(1)}" fill="none" stroke-linecap="round"/><circle cx="${x}" cy="${y + r * .62}" r="${(r * .2).toFixed(1)}" fill="#3a2406"/></g>`;
  const csChain = (x1, y1, x2, y2) => `<path class="cs-chain" d="M${x1} ${y1} L${x2} ${y2}"/><path class="cs-chain2" d="M${x1} ${y1} L${x2} ${y2}"/>`;
  // Temjanica: kupë argjendi me brinjë ari, kapak i shpuar me medalione kryqi, kube argjendi e kapitonuar, kryq në majë, 4 zinxhirë me 12 zile
  function censerSvg() {
    const lugs = [46, 72, 128, 154], RIM = 174;
    const bells = [];
    lugs.forEach((x, c) => [0.13, 0.27, 0.41].forEach((t, j) => { const px = 100 + (x - 100) * t, py = 10 + (RIM - 10) * t; bells.push(csBell(+(px + (c < 2 ? -6 : 6)).toFixed(1), +(py + 6).toFixed(1), 6.4, c * 3 + j)); }));
    const ribs = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => `<path d="M${100 + i * 11.5} 180 Q${100 + i * 14} 214 ${100 + i * 6.5} 246" stroke="url(#csGoldV)" stroke-width="2.6" fill="none"/>`).join("");
    const quilt = [];
    for (let k = -6; k <= 6; k++) { quilt.push(`M${100 + k * 9 - 40} 70 l40 52`, `M${100 + k * 9 + 40} 70 l-40 52`); }
    const holes = [[62, 152, 4.5, 8], [80, 146, 4, 7.5], [120, 146, 4, 7.5], [138, 152, 4.5, 8], [70, 163, 3, 3], [130, 163, 3, 3]];
    return `<svg class="censer temj" data-coal="171" data-drop="40" data-cx="100" viewBox="0 0 200 340" aria-hidden="true">
      <defs>${CS_DEFS}
        <clipPath id="csBowlC"><path d="M50 178 C46 204 58 238 86 247 L114 247 C142 238 154 204 150 178 Z"/></clipPath>
        <clipPath id="csDomeC"><path d="M82 120 C70 108 74 84 100 78 C126 84 130 108 118 120 Q100 125 82 120 Z"/></clipPath>
      </defs>
      <circle cx="100" cy="9" r="6" fill="none" stroke="url(#csGold)" stroke-width="3"/>
      ${csChain(100, 12, 72, RIM)}${csChain(100, 12, 128, RIM)}
      <ellipse cx="100" cy="${RIM - 1}" rx="46" ry="8" fill="#140b05"/>
      <g class="cs-coals">${[[84, 170, 10, 5], [100, 167, 11, 6], [116, 170, 10, 5], [92, 173, 9, 4], [108, 174, 9, 4], [72, 173, 6, 3], [128, 173, 6, 3]].map(([x, y, rx, ry], k) => `<ellipse class="cs-lump" style="--k:${k}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join("")}</g>
      <ellipse class="cs-coal" cx="100" cy="170" rx="40" ry="10" fill="url(#csCoalG)"/>
      <g class="cs-grains"></g>
      <path d="M50 178 C46 204 58 238 86 247 L114 247 C142 238 154 204 150 178 Z" fill="url(#csSilver)"/>
      <g clip-path="url(#csBowlC)">${ribs}<ellipse cx="78" cy="204" rx="14" ry="26" fill="url(#csShine)"/></g>
      <path d="M46 ${RIM} Q100 ${RIM + 12} 154 ${RIM} L153 ${RIM + 7} Q100 ${RIM + 19} 47 ${RIM + 7} Z" fill="url(#csGold)"/>
      <path d="M48 ${RIM + 3.5} Q100 ${RIM + 15} 152 ${RIM + 3.5}" stroke="#fff3c4" stroke-width=".7" fill="none" opacity=".7"/>
      ${lugs.map((x) => `<circle cx="${x}" cy="${RIM + 1}" r="4.2" fill="none" stroke="url(#csGold)" stroke-width="2.2"/>`).join("")}
      <path d="M86 247 Q100 251 114 247 L110 258 Q100 261 90 258 Z" fill="url(#csGold)"/>
      <ellipse cx="100" cy="262" rx="11" ry="4" fill="url(#csGold)"/>
      <path d="M93 264 L107 264 L109 280 L91 280 Z" fill="url(#csGold)"/>
      <path d="M91 279 C88 292 72 300 60 308 L140 308 C128 300 112 292 109 279 Z" fill="url(#csGold)"/>
      <path d="M70 302 Q100 292 130 302" stroke="url(#csSilver)" stroke-width="5" fill="none"/>
      ${[74, 86, 100, 114, 126].map((x, k) => `<circle cx="${x}" cy="${299 - (k === 2 ? 2.5 : k % 2 ? 1.6 : 0)}" r="1.7" fill="#7a5418"/>`).join("")}
      <ellipse cx="100" cy="309" rx="42" ry="4.5" fill="url(#csGold)"/>
      ${csChain(100, 12, 46, RIM)}${csChain(100, 12, 154, RIM)}
      <g class="cs-lidg">
        <path d="M48 172 C44 152 60 132 80 128 L120 128 C140 132 156 152 152 172 Q100 160 48 172 Z" fill="url(#csGold)"/>
        ${holes.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#2a1607"/>`).join("")}
        <g class="cs-holes">${holes.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ff8a2a"/>`).join("")}</g>
        <path d="M56 160 q6 -14 16 -10 q-8 4 -4 12 M144 160 q-6 -14 -16 -10 q8 4 4 12 M86 136 q-10 4 -8 14 M114 136 q10 4 8 14" stroke="#fff0b8" stroke-width="1.1" fill="none" opacity=".75"/>
        <circle cx="100" cy="149" r="13" fill="url(#csSilver)" stroke="url(#csGold)" stroke-width="2.4"/>
        <path d="M100 139 V159 M90 149 H110" stroke="url(#csGoldV)" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M84 128 Q100 123 116 128 L113 119 Q100 115 87 119 Z" fill="url(#csGold)"/>
        <path d="M82 120 C70 108 74 84 100 78 C126 84 130 108 118 120 Q100 125 82 120 Z" fill="url(#csSilver)"/>
        <g clip-path="url(#csDomeC)"><path d="${quilt.join(" ")}" stroke="#c8962e" stroke-width="1.1" fill="none"/><ellipse cx="91" cy="94" rx="9" ry="13" fill="url(#csShine)"/></g>
        <ellipse cx="100" cy="78" rx="8" ry="4" fill="url(#csGold)"/>
        <ellipse cx="100" cy="72" rx="4.5" ry="5" fill="url(#csGold)"/>
        <path d="M100 68 V44 M92 54 H108" stroke="url(#csGold)" stroke-width="3" stroke-linecap="round"/>
        ${[[100, 42], [90, 54], [110, 54]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="url(#csGold)"/>`).join("")}
        <path d="M100 62 q-9 -2 -11 4 q7 1 11 -2 q4 3 11 2 q-2 -6 -11 -4" fill="url(#csSilver)"/>
      </g>
      ${bells.join("")}
    </svg>`;
  }
  // Kacia: temjanica e dorës, me dorezë të gdhendur me ikonë dhe 7 zile
  function kaciaSvg() {
    const bells = [138, 162, 186, 210, 234, 258].map((x, k) => csBell(x, 186, 7.4, k)).join("") + csBell(26, 156, 7, 6);
    return `<svg class="censer kac" data-coal="139" data-drop="16" data-cx="78" viewBox="0 0 320 270" aria-hidden="true">
      <defs>${CS_DEFS}<clipPath id="kcBowlC"><path d="M36 142 C34 170 52 192 78 196 C104 192 122 170 120 142 Z"/></clipPath></defs>
      <ellipse cx="78" cy="140" rx="42" ry="7" fill="#140b05"/>
      <g class="cs-coals">${[[66, 138, 8, 4], [80, 136, 9, 5], [93, 139, 8, 4], [72, 142, 7, 3], [88, 143, 7, 3]].map(([x, y, rx, ry], k) => `<ellipse class="cs-lump" style="--k:${k}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join("")}</g>
      <ellipse class="cs-coal" cx="78" cy="139" rx="36" ry="9" fill="url(#csCoalG)"/>
      <g class="cs-grains"></g>
      <path d="M36 142 C34 170 52 192 78 196 C104 192 122 170 120 142 Z" fill="url(#csGold)"/>
      <g clip-path="url(#kcBowlC)">
        ${[[52, 166], [78, 172], [104, 166]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="12" fill="url(#csSilver)" opacity=".9"/><path d="M${x} ${y - 8} V${y + 8} M${x - 6} ${y} H${x + 6}" stroke="#a87a22" stroke-width="2"/>`).join("")}
        <ellipse cx="56" cy="160" rx="8" ry="18" fill="url(#csShine)"/></g>
      <path d="M34 140 Q78 152 122 140 L121 147 Q78 159 35 147 Z" fill="url(#csGold)"/>
      <path d="M68 196 L88 196 L84 214 L72 214 Z" fill="url(#csGold)"/>
      <ellipse cx="78" cy="216" rx="10" ry="3.5" fill="url(#csGold)"/>
      <path d="M72 218 C70 232 56 240 46 248 L110 248 C100 240 86 232 84 218 Z" fill="url(#csSilver)"/>
      <path d="M52 244 Q78 234 104 244" stroke="url(#csGold)" stroke-width="3" fill="none"/>
      <ellipse cx="78" cy="249" rx="34" ry="4" fill="url(#csGold)"/>
      <path d="M112 136 C132 124 150 130 168 128 L250 128 C268 126 282 132 296 138 L312 141 L296 146 C282 152 268 160 250 162 L168 162 C150 162 134 166 116 154 Z" fill="url(#csSilver)" stroke="url(#csGold)" stroke-width="3"/>
      <path d="M122 140 C136 134 150 138 164 136 M122 152 C136 158 150 154 164 156 M256 134 C270 134 282 138 292 141 M256 156 C270 156 282 148 292 143" stroke="#c8962e" stroke-width="1.5" fill="none"/>
      <rect x="176" y="131" width="68" height="28" rx="3" fill="url(#csSilver)" stroke="url(#csGold)" stroke-width="2.2"/>
      <path d="M210 136 V154 M201 145 H219" stroke="url(#csGoldV)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="270" cy="145" r="6" fill="none" stroke="url(#csGold)" stroke-width="2"/>
      <path d="M262 160 L262 212 Q268 216 274 212 L274 160 Z" fill="url(#csGold)"/>
      <g class="cs-lidg">
        <path d="M38 140 C30 116 52 96 64 84 C70 76 72 64 78 56 C84 64 86 76 92 84 C104 96 126 116 118 140 Q78 130 38 140 Z" fill="url(#csGold)"/>
        <path d="M50 124 C56 108 70 100 78 86 C86 100 100 108 106 124" stroke="#fff0b8" stroke-width="1.2" fill="none" opacity=".7"/>
        ${[[56, 122], [78, 112], [100, 122]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#csSilver)" stroke="#a87a22" stroke-width="1"/>`).join("")}
        <g class="cs-holes">${[[56, 122], [78, 112], [100, 122]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#ff8a2a"/>`).join("")}</g>
        <ellipse cx="66" cy="100" rx="5" ry="10" fill="url(#csShine)"/>
        <ellipse cx="78" cy="56" rx="5" ry="3" fill="url(#csGold)"/>
        <path d="M78 54 V30 M71 40 H85" stroke="url(#csGold)" stroke-width="2.8" stroke-linecap="round"/>
        <circle cx="78" cy="28" r="2.6" fill="url(#csGold)"/>
      </g>
      <path d="M26 146 V140 Q30 138 36 140" stroke="#b8862a" stroke-width="1.6" fill="none"/>
      ${bells}
    </svg>`;
  }
  function renderCenser() {
    const box = $("#censerBody");
    if (!box) return;
    const st = { coal: 0, incense: 0 };
    const kind = store.get("censer.kind", "t") === "k" ? "k" : "t";
    try { Smoke.stop(); } catch (e) {}
    box.innerHTML = `
      <div class="seg cs-kind" role="tablist"><button data-ck="t" aria-checked="${kind === "t"}">Temjanica</button><button data-ck="k" aria-checked="${kind === "k"}">Kacia</button></div>
      <section class="cs-stage cs2 kind-${kind}" id="csStage">
        <div class="cs-glow" id="csGlow"></div>
        <div class="cs-swing" id="csSwing">${kind === "k" ? kaciaSvg() : censerSvg()}<span class="cs-src" id="csSrc"></span><span class="cs-embers" id="csEmb"></span></div>
        <p class="cs-hint" id="csHint">Ndiz qymyrin dhe hidh temjan. Pastaj tërhiqe ${kind === "k" ? "kacinë" : "temjanicën"} me gisht, ose prek për bekimin me tri tundje.</p>
        <p class="cs-count" id="csCount" hidden></p>
      </section>
      <div class="cs-actions">
        <button class="btn" id="csCoal">${icon("candle")}<span>Ndiz qymyrin</span></button>
        <button class="btn primary" id="csInc" disabled>${icon("plus")}<span>Hidh temjan</span></button>
      </div>
      <p class="cs-prayer">“Le të drejtohet lutja ime si temjan përpara teje.” <small>Psalmi 140:2</small></p>`;
    const stage = $("#csStage"), sw = $("#csSwing"), svg = $(".censer", box), hint = $("#csHint"), emb = $("#csEmb");
    $$("[data-ck]", box).forEach((b) => b.addEventListener("click", () => { if (b.dataset.ck === kind) return; haptic(8); store.set("censer.kind", b.dataset.ck); renderCenser(); }));
    const CY = +svg.dataset.coal, DY = +svg.dataset.drop, CX = +svg.dataset.cx;
    // ---- qymyri: nxehet ngadalë, kërcet, nxjerr xixa ----
    $("#csCoal").addEventListener("click", (e) => {
      if (st.coal) return;
      st.coal = 1; e.currentTarget.disabled = true;
      Sfx.strike(); setTimeout(() => Sfx.crackle(12), 250);
      svg.classList.add("lid-open", "coal-lighting"); stage.classList.add("warm1");
      hint.textContent = "Qymyri po ndizet…";
      setTimeout(() => svg.classList.remove("lid-open"), 2600);
      setTimeout(() => { svg.classList.remove("coal-lighting"); svg.classList.add("coal-on"); stage.classList.add("warm"); st.coal = 2; $("#csInc").disabled = false; hint.textContent = "Qymyri u ndez. Hidh temjan."; }, 1600);
      // xixa që ngrihen herë pas here nga qymyri
      const spark = () => { if (!emb.isConnected || !st.coal) return; const i = document.createElement("i"); i.style.left = (40 + Math.random() * 20) + "%"; i.style.setProperty("--dx", (Math.random() * 30 - 15) + "px"); emb.appendChild(i); setTimeout(() => i.remove(), 1600); setTimeout(spark, 260 + Math.random() * 700); };
      spark();
    });
    // ---- temjani: një kokërr bie mbi qymyr → kapaku hapet → tym ----
    $("#csInc").addEventListener("click", () => {
      if (st.coal < 2) return;
      st.incense++;
      const G = $(".cs-grains", svg), NS = "http://www.w3.org/2000/svg";
      svg.classList.add("lid-open", "smoking");
      [0].forEach((k) => {
        const g = document.createElementNS(NS, "ellipse");
        const x = CX - 8 + Math.random() * 16;
        g.setAttribute("cx", x); g.setAttribute("cy", DY); g.setAttribute("rx", 3.2); g.setAttribute("ry", 2.4);
        g.setAttribute("class", "cs-g2"); g.style.animationDelay = (0.35 + k * 0.12) + "s";
        g.style.setProperty("--land", ((CY - 6 + Math.random() * 5 - DY)) + "px");
        G.appendChild(g);
        setTimeout(() => g.classList.add("melt"), 1150 + k * 120);
        setTimeout(() => g.remove(), 4200);
      });
      setTimeout(() => svg.classList.remove("lid-open"), 2300);
      setTimeout(() => { Sfx.sizzle(1.8); Smoke.puff($("#csSrc"), 14 + Math.min(30, Math.round(Smoke.remaining() * 1.5))); Smoke.add($("#csSrc"), 5); haptic(8); }, 1000);
      const c = $("#csCount"); c.hidden = false;
      clearInterval(st.cT); const upd = () => { const r = Smoke.remaining(); c.textContent = `Kokrra: ${st.incense} · tym edhe ${Math.ceil(r)} sek`; if (r <= 0 && st.cT) { clearInterval(st.cT); c.textContent = `Kokrra: ${st.incense} · temjani u dogj`; } };
      setTimeout(() => { upd(); st.cT = setInterval(() => { if (!c.isConnected) return clearInterval(st.cT); upd(); }, 500); }, 1050);
      hint.textContent = `Tërhiqe ${kind === "k" ? "kacinë" : "temjanicën"} me gisht ose prek për bekimin.`;
    });
    // ---- lavjerrësi: θ'' = −(g/L)·sin θ − b·θ' ----
    const P = { th: 0, w: 0, drag: null, raf: 0, lastSign: 0, lastT: 0, kicks: [] };
    const KAC = kind === "k", K = KAC ? 30 : 15.4, DAMP = KAC ? 1.1 : 0.42, MAX = KAC ? 0.55 : 1.2;
    const pivot = () => { const r = sw.getBoundingClientRect(); return KAC ? { x: r.left + r.width * 0.94, y: r.top + r.height * 0.54 } : { x: r.left + r.width / 2, y: r.top + 4 }; };
    const draw = () => { sw.style.transform = `rotate(${(-P.th * 180 / Math.PI).toFixed(2)}deg)`; };
    function ring(amp) {
      if (amp < 0.1) return;
      const n = Math.min(8, Math.round(2 + amp * 7));
      Sfx.bells(n, amp);
      sw.classList.remove("jingle"); void sw.offsetWidth; sw.classList.add("jingle");
      if (amp > 0.35) haptic(6);
    }
    function tick(now) {
      P.raf = 0;
      if (!sw.isConnected) return;
      const dt = Math.min(0.033, (now - (P.lastT || now)) / 1000); P.lastT = now;
      if (!P.drag) {
        while (P.kicks.length && P.kicks[0].at <= now) { const k = P.kicks.shift(); P.w += (Math.sign(P.w) || 1) * k.dv; }
        const acc = -K * Math.sin(P.th) - DAMP * P.w;
        P.w += acc * dt; P.th += P.w * dt;
        P.th = Math.max(-MAX, Math.min(MAX, P.th));
        const sgn = Math.sign(P.w);
        if (sgn && P.lastSign && sgn !== P.lastSign) ring(Math.abs(P.th));   // zilet në skajin e lëkundjes
        P.lastSign = sgn;
      }
      draw();
      if (P.drag || P.kicks.length || Math.abs(P.th) > 0.002 || Math.abs(P.w) > 0.003) P.raf = requestAnimationFrame(tick);
      else { P.th = 0; P.w = 0; P.lastT = 0; draw(); }
    }
    const run = () => { if (!P.raf) { P.lastT = 0; P.raf = requestAnimationFrame(tick); } };
    sw.addEventListener("pointerdown", (e) => {
      sw.setPointerCapture(e.pointerId);
      P.drag = { x0: e.clientX, y0: e.clientY, t: performance.now(), moved: 0, th: P.th };
      P.kicks = []; run();
    });
    sw.addEventListener("pointermove", (e) => {
      const d = P.drag; if (!d) return;
      const pv = pivot(), dx = e.clientX - pv.x, dy = e.clientY - pv.y;
      const th = Math.max(-MAX, Math.min(MAX, KAC ? Math.atan2(dy, Math.max(30, -dx)) : Math.atan2(dx, Math.max(30, dy))));
      const now = performance.now(), dtt = Math.max(0.008, (now - d.t) / 1000);
      P.w = (th - P.th) / dtt * 0.6 + P.w * 0.4; P.th = th; d.t = now;
      d.moved += Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0); d.x0 = e.clientX; d.y0 = e.clientY;
    });
    const end = () => {
      const d = P.drag; if (!d) return; P.drag = null;
      if (d.moved < 10) {
        // prekje: bekimi me tri tundje
        haptic([6, 90, 6, 90, 6]);
        const t = performance.now(); P.w += KAC ? 3.4 : 2.6;
        P.kicks = KAC ? [{ at: t + 560, dv: 2.4 }, { at: t + 1120, dv: 2.4 }] : [{ at: t + 800, dv: 1.6 }, { at: t + 1600, dv: 1.6 }];
      }
      P.lastSign = Math.sign(P.w); run();
    };
    sw.addEventListener("pointerup", end); sw.addEventListener("pointercancel", end);
  }

  // ---------- Udhëtimi në Shkrim: kuiz me 1000 nivele, 3 jetë (1 kthehet çdo 3 orë), ndihma, talanta ----------
  // Çdo pyetje ndërtohet VETËM nga fjali fjalë për fjalë të teksteve të aplikacionit (data/kuizi.json).
  async function viewJourney() {
    const K = await load("kuizi");
    if (!K) { listPane.innerHTML = `<div class="empty"><h3>Kuizi nuk u hap</h3></div>`; enter(listPane); return; }
    const H3 = 3 * 3600e3, MAXL = 1000, MAXLIVES = 5;
    const WORLDS = ["Kopshti i Edenit", "Arka e Noesë", "Mali Moria", "Egjipti", "Deti i Kuq", "Mali Sinai", "Shkretëtira", "Lumi Jordan", "Jeriko", "Betlehemi",
      "Nazareti", "Kana e Galilesë", "Liqeni i Gjenisaretit", "Mali Tabor", "Betania", "Jerusalemi", "Gjetsemania", "Golgota", "Varri i Zbrazët", "Jerusalemi Qiellor"];
    const WCOL = ["#6f9a52", "#7d6a4f", "#9a7d55", "#c49a4a", "#3f7fa6", "#8a6d5a", "#c08a50", "#4f8fa0", "#a0794a", "#b07a3d",
      "#7a8a5a", "#9b4a5a", "#3f86a8", "#6a8a6a", "#8a7a5a", "#b8963f", "#4d6a4a", "#8e3a3a", "#c9a24a", "#d6b056"];
    const today = isoToday();
    const S = Object.assign({ lvl: 1, stars: {}, lives: 3, lifeAt: 0, tal: 30, inv: { h: 3, s: 2, t: 3 }, gift: "", amen: "", games: 0, right: 0 }, store.get("bq", {}));
    S.inv = Object.assign({ h: 0, s: 0, t: 0 }, S.inv);
    const save = () => store.set("bq", S);
    function regen() {
      if (S.lives >= 3) { S.lifeAt = 0; return; }
      const now = Date.now(); if (!S.lifeAt) S.lifeAt = now;
      const n = Math.floor((now - S.lifeAt) / H3);
      if (n > 0) { S.lives = Math.min(3, S.lives + n); S.lifeAt = S.lives >= 3 ? 0 : S.lifeAt + n * H3; save(); }
    }
    const lifeIn = () => (S.lives >= 3 || !S.lifeAt ? 0 : Math.max(0, S.lifeAt + H3 - Date.now()));
    const hms = (ms) => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
    const alive = () => location.hash.startsWith("#/udhetimi");
    let tick = 0, timer = 0;
    const stopAll = () => { clearInterval(tick); clearInterval(timer); };

    // ---- të dhënat ----
    const B = K.books, V = K.v;
    const noQuote = (s) => !/[“”«»"]/.test(s);
    const byCat = [[], [], [], []], byBook = {};
    V.forEach((r, i) => { byCat[B[r[1]][2]].push(i); (byBook[r[1]] = byBook[r[1]] || []).push(i); });
    const rnd = (n) => Math.floor(Math.random() * n);
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const WRE = /[\p{L}’']+/gu;
    const goodWord = (w, min) => w.length >= min && !STOP.has(w.toLowerCase());
    // fjalor fjalësh sipas gjatësisë, për zgjedhjet e gabuara
    const lex = {};
    for (let i = 0; i < V.length; i += 3) for (const m of V[i][0].matchAll(WRE)) { const w = m[0]; if (w.length >= 4 && !STOP.has(w.toLowerCase()) && w[0] === w[0].toLowerCase()) (lex[w.length] = lex[w.length] || new Set()).add(w); }
    const lexArr = {}; Object.keys(lex).forEach((k) => (lexArr[k] = [...lex[k]]));
    function similarWords(w, n) {
      const out = new Set(), low = w.toLowerCase(), cap = w[0] !== low[0];
      for (let t = 0; t < 200 && out.size < n; t++) {
        const len = w.length + rnd(3) - 1, arr = lexArr[len]; if (!arr) continue;
        let c = arr[rnd(arr.length)]; if (c.toLowerCase() === low) continue;
        if (cap) c = c[0].toUpperCase() + c.slice(1);
        out.add(c);
      }
      return [...out];
    }

    // ---- vështirësia sipas nivelit ----
    function cfg(L) {
      const boss = L % 10 === 0;
      const cats = L < 15 ? [0, 2] : L < 40 ? [0, 1, 2] : [0, 1, 2, 3];
      const types = ["cat", "gap"];
      if (L >= 6) types.push("cont"); if (L >= 16) types.push("tf"); if (L >= 28) types.push("book");
      if (L >= 45) types.push("odd"); if (L >= 70) types.push("order"); if (L >= 120) types.push("psn");
      return {
        boss, cats, types,
        nq: Math.min(10, 5 + Math.floor(L / 150)) + (boss ? 2 : 0),
        time: Math.max(8, Math.round(24 - L / 45)) - (boss ? 2 : 0),
        opts: L < 25 ? 3 : 4,
        minW: 4 + Math.min(4, Math.floor(L / 140)),
        errs: boss ? 2 : 3,
      };
    }
    const pickRow = (C, pred) => { for (let t = 0; t < 300; t++) { const cat = C.cats[rnd(C.cats.length)], pool = byCat[cat], i = pool[rnd(pool.length)]; if (!pred || pred(V[i])) return i; } return rnd(V.length); };
    const refOf = (i) => K.refs[V[i][2]];
    const bookShort = (i) => B[V[i][1]][1];

    // ---- pyetjet ----
    function makeQ(C, type) {
      if (type === "cat") {
        const i = pickRow(C, (r) => noQuote(r[0]));
        const all = K.cats.map((c, k) => k), ans = B[V[i][1]][2];
        const opts = shuffle([ans, ...shuffle(all.filter((k) => k !== ans)).slice(0, C.opts - 1)]);
        return { type, i, q: "Nga cila pjesë e Shkrimit është ky varg?", text: V[i][0], opts: opts.map((k) => K.cats[k]), ans: opts.indexOf(ans) };
      }
      if (type === "book") {
        const i = pickRow(C, (r) => noQuote(r[0]) && B[r[1]][2] !== 2);
        const cat = B[V[i][1]][2], same = Object.keys(byBook).map(Number).filter((b) => b !== V[i][1] && B[b][2] === cat);
        const others = shuffle(same).slice(0, C.opts - 1).map((b) => B[b][1]);
        if (others.length < C.opts - 1) return makeQ(C, "cat");
        const opts = shuffle([bookShort(i), ...others]);
        return { type, i, q: "Nga cili libër është ky varg?", text: V[i][0], opts, ans: opts.indexOf(bookShort(i)) };
      }
      if (type === "psn") {
        const pool = byCat[2], i = pool[rnd(pool.length)], n = +(/Psalmi (\d+)/.exec(refOf(i)) || [0, 1])[1];
        const set = new Set([n]); while (set.size < C.opts) { const d = n + (rnd(2) ? 1 : -1) * (1 + rnd(12)); if (d >= 1 && d <= 151) set.add(d); }
        const opts = shuffle([...set]);
        return { type, i, q: "Nga cili psalm është ky varg?", text: V[i][0], opts: opts.map((x) => "Psalmi " + x), ans: opts.indexOf(n) };
      }
      if (type === "tf") {
        const i = pickRow(C, (r) => noQuote(r[0])), truth = Math.random() < 0.5;
        let b = B[V[i][1]][0];
        if (!truth) { const cands = Object.keys(byBook).map(Number).filter((k) => B[k][0] !== b); b = B[cands[rnd(cands.length)]][0]; }
        return { type, i, q: `A është ky varg nga ${b}?`, text: V[i][0], opts: ["Po, është", "Jo, nuk është"], ans: truth ? 0 : 1 };
      }
      if (type === "gap") {
        for (let t = 0; t < 40; t++) {
          const i = pickRow(C), ws = [...V[i][0].matchAll(WRE)].filter((m) => goodWord(m[0], C.minW));
          if (!ws.length) continue;
          const m = ws[rnd(ws.length)], wrong = similarWords(m[0], C.opts - 1);
          if (wrong.length < C.opts - 1) continue;
          const opts = shuffle([m[0], ...wrong]), s = V[i][0];
          return { type, i, q: "Cila fjalë mungon?", html: esc(s.slice(0, m.index)) + `<span class="bq-gap">＿＿＿</span>` + esc(s.slice(m.index + m[0].length)), opts, ans: opts.indexOf(m[0]), word: m[0] };
        }
        return makeQ(C, "cat");
      }
      if (type === "cont") {
        for (let t = 0; t < 40; t++) {
          const i = pickRow(C, (r) => r[0].length > 70), s = V[i][0], cut = s.indexOf(" ", Math.floor(s.length * 0.45));
          if (cut < 0) continue;
          const tail = (x) => { const c = x.indexOf(" ", Math.floor(x.length * 0.45)); return c < 0 ? null : x.slice(c + 1); };
          const pool = byBook[V[i][1]], wrong = new Set();
          for (let k = 0; k < 60 && wrong.size < C.opts - 1; k++) { const j = pool[rnd(pool.length)]; if (j === i) continue; const tl = tail(V[j][0]); if (tl && tl.length < 130 && tl !== s.slice(cut + 1)) wrong.add(tl); }
          if (wrong.size < C.opts - 1) continue;
          const right = s.slice(cut + 1), opts = shuffle([right, ...wrong]);
          return { type, i, q: "Si vazhdon vargu?", html: esc(s.slice(0, cut)) + " …", opts, ans: opts.indexOf(right), wide: true };
        }
        return makeQ(C, "gap");
      }
      if (type === "odd") {
        for (let t = 0; t < 40; t++) {
          const i = pickRow(C), s = V[i][0], toks = s.split(/(\s+)/), idx = [];
          toks.forEach((tk, k) => { const w = (tk.match(WRE) || [""])[0]; if (goodWord(w, 5) && w === tk.replace(/[^\p{L}’']/gu, "")) idx.push(k); });
          if (idx.length < 3) continue;
          const k = idx[rnd(idx.length)], w = (toks[k].match(WRE) || [""])[0], rep = similarWords(w, 1)[0];
          if (!rep) continue;
          const orig = toks[k]; toks[k] = toks[k].replace(w, rep);
          return { type, i, q: "Një fjalë është ndërruar. Preke!", toks, odd: k, orig };
        }
        return makeQ(C, "gap");
      }
      if (type === "order") {
        for (let t = 0; t < 40; t++) {
          const i = pickRow(C, (r) => r[0].length > 60 && r[0].length < 170), ws = V[i][0].split(" ");
          const n = Math.min(5, 3 + Math.floor(Math.random() * 2) + (C.opts > 3 ? 1 : 0)); if (ws.length < n * 2) continue;
          const parts = []; for (let p = 0; p < n; p++) parts.push(ws.slice(Math.round(p * ws.length / n), Math.round((p + 1) * ws.length / n)).join(" "));
          const ord = shuffle(parts.map((_, k) => k)); if (ord.every((v, k) => v === k)) ord.reverse();
          return { type, i, q: "Rendit pjesët e vargut", parts, ord, next: 0 };
        }
        return makeQ(C, "cont");
      }
      return makeQ(C, "cat");
    }

    // ---- harta e botës ----
    let world = Math.min(19, Math.floor((S.lvl - 1) / 50));
    function home() {
      stopAll(); regen();
      const w0 = world * 50 + 1, done = Object.keys(S.stars).filter((l) => +l >= w0 && +l < w0 + 50).length;
      const totStars = Object.values(S.stars).reduce((a, b) => a + b, 0);
      const giftOk = S.gift !== today, amenOk = S.amen !== today;
      const nodes = [];
      for (let k = 49; k >= 0; k--) {
        const L = w0 + k, st = S.stars[L] || 0, cur = L === S.lvl, lock = L > S.lvl, boss = L % 10 === 0;
        const x = 50 + Math.sin(k * 0.78) * 32;
        nodes.push(`<button class="bq-node${cur ? " cur" : ""}${lock ? " lock" : ""}${boss ? " boss" : ""}${st ? " done" : ""}" data-l="${L}" style="--x:${x.toFixed(1)}%;--y:${(49 - k) * 74 + 40}px"${lock ? " disabled" : ""}>
          ${boss ? `<em>👑</em>` : ""}<b>${lock ? "🔒" : L}</b>${st ? `<span class="bq-st">${"★".repeat(st)}<i>${"★".repeat(3 - st)}</i></span>` : ""}</button>`);
      }
      listPane.innerHTML = `
        <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Udhëtimi në Shkrim</h1></header>
        <section class="bq-home" style="--wc:${WCOL[world]}">
          <div class="bq-bar glass">
            <span class="bq-lives" id="bqLives">${"❤".repeat(Math.min(S.lives, MAXLIVES))}<i>${"❤".repeat(Math.max(0, 3 - S.lives))}</i></span>
            <small class="bq-regen" id="bqRegen"></small>
            <span class="bq-tal">🪙 <b>${S.tal}</b></span>
          </div>
          <div class="bq-inv"><span>💡 ${S.inv.h}</span><span>⏭ ${S.inv.s}</span><span>⏳ ${S.inv.t}</span><span>★ ${totStars}</span><button class="btn" id="bqShop">🛒 Dyqani</button></div>
          ${giftOk || amenOk ? `<div class="bq-daily">
            ${giftOk ? `<button class="bq-gift glass" id="bqGift"><span>🎁</span><b>Dhurata e ditës</b><small>Hape!</small></button>` : ""}
            ${amenOk ? `<button class="bq-amen glass" id="bqAmen"><span>🙏</span><b>Vargu i ditës</b><small>Lexoje · +1 ❤</small></button>` : ""}
          </div>` : ""}
          <div class="bq-world glass">
            <button class="icon-btn" id="bqPrev"${world ? "" : " disabled"} aria-label="Bota e mëparshme">${icon("back")}</button>
            <div><small>Bota ${world + 1} nga 20 · nivelet ${w0}–${w0 + 49}</small><b>${WORLDS[world]}</b><div class="bq-wprog"><i style="width:${done * 2}%"></i></div></div>
            <button class="icon-btn" id="bqNext"${world < 19 && S.lvl >= w0 + 50 ? "" : " disabled"} aria-label="Bota tjetër"><svg style="transform:scaleX(-1)"><use href="#i-back"/></svg></button>
          </div>
          <div class="bq-map" style="height:${50 * 74 + 60}px"><svg class="bq-path" viewBox="0 0 100 ${50 * 74 + 60}" preserveAspectRatio="none"><path d="${Array.from({ length: 50 }, (_, k) => `${k ? "L" : "M"}${(50 + Math.sin((49 - k) * 0.78) * 32).toFixed(1)} ${k * 74 + 40 + 26}`).join(" ")}"/></svg>${nodes.join("")}</div>
          <p class="bq-foot">${S.games} lojëra · ${S.right} përgjigje të sakta · niveli ${Math.min(S.lvl, MAXL)} nga ${MAXL}</p>
        </section>`;
      enter(listPane);
      const cur = $(".bq-node.cur", listPane) || $(".bq-node.done", listPane);
      if (cur) setTimeout(() => cur.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
      const upd = () => { if (!alive() || !$("#bqRegen")) return clearInterval(tick); regen(); const ms = lifeIn(); $("#bqRegen").textContent = ms ? `+1 ❤ pas ${hms(ms)}` : S.lives >= 3 ? "Jetët plot" : ""; };
      upd(); tick = setInterval(upd, 1000);
      $("#bqPrev").onclick = () => { world--; haptic(8); home(); };
      $("#bqNext").onclick = () => { world++; haptic(8); home(); };
      $("#bqShop").onclick = shop;
      $("#bqGift")?.addEventListener("click", (e) => {
        const g = [["h", "💡 Ndihmë"], ["s", "⏭ Kalim"], ["t", "⏳ Kohë"]][rnd(3)], tal = 10 + rnd(16);
        S.inv[g[0]]++; S.tal += tal; S.gift = today; save();
        const r = e.currentTarget.getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top + r.height / 2); Sfx.bells(5, 0.6); haptic([10, 40, 10]);
        toast(`🎁 ${g[1]} + ${tal} talanta`); setTimeout(home, 700);
      });
      $("#bqAmen")?.addEventListener("click", amen);
      $$(".bq-node", listPane).forEach((b) => b.addEventListener("click", () => { haptic(12); preview(+b.dataset.l); }));
    }
    // vargu i ditës: lexohet, thuhet "Amin" → +1 jetë
    function amen() {
      const seed = [...today].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0, i = seed % V.length;
      listPane.innerHTML = `<header class="page-head"><button class="back-btn" id="bqBack" aria-label="Kthehu">${icon("back")}</button><h1>Vargu i ditës</h1></header>
        <section class="bq-amen-card glass"><p class="eyebrow">${esc(refOf(i))}</p><blockquote>${esc(V[i][0])}</blockquote>
        <p class="bq-amen-h">Lexoje ngadalë, me zemër. Pastaj thuaj:</p><button class="btn primary bq-amin" id="bqAmin">☦ Amin</button></section>`;
      enter(listPane);
      $("#bqBack").onclick = home;
      $("#bqAmin").onclick = (e) => {
        S.amen = today; S.lives = Math.min(MAXLIVES, S.lives + 1); if (S.lives >= 3) S.lifeAt = 0; save();
        const r = e.currentTarget.getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top); Sfx.bells(4, 0.5); haptic(14);
        toast("+1 ❤ · Lavdi Perëndisë!"); setTimeout(home, 800);
      };
    }
    function shop() {
      const items = [["h", "💡", "Ndihmë", "Heq gjysmën e përgjigjeve të gabuara", 20], ["s", "⏭", "Kalim", "Kalon pyetjen si të saktë", 30], ["t", "⏳", "Kohë", "+10 sekonda për pyetjen", 15], ["life", "❤", "Jetë", `Një jetë (deri në ${MAXLIVES})`, 45]];
      listPane.innerHTML = `<header class="page-head"><button class="back-btn" id="bqBack" aria-label="Kthehu">${icon("back")}</button><h1>Dyqani</h1><span class="bq-tal">🪙 <b id="bqTal">${S.tal}</b></span></header>
        <p class="bq-shop-n">Talantat fitohen me yje (★), me nivelet 👑 dhe me dhuratën e ditës.</p>
        <div class="bq-shop">${items.map(([k, e, n, d, p]) => `<button class="bq-item glass" data-k="${k}" data-p="${p}"><span>${e}</span><b>${n}</b><small>${d}</small><em>🪙 ${p}</em><i>${k === "life" ? S.lives : S.inv[k]}</i></button>`).join("")}</div>`;
      enter(listPane);
      $("#bqBack").onclick = home;
      $$(".bq-item", listPane).forEach((b) => b.addEventListener("click", () => {
        const k = b.dataset.k, p = +b.dataset.p;
        if (S.tal < p) { haptic(30); toast("Nuk ke mjaft talanta"); return; }
        if (k === "life" && S.lives >= MAXLIVES) { toast("Jetët janë plot"); return; }
        S.tal -= p; if (k === "life") { S.lives++; if (S.lives >= 3) S.lifeAt = 0; } else S.inv[k]++; save();
        haptic(10); $("#bqTal").textContent = S.tal; $("i", b).textContent = k === "life" ? S.lives : S.inv[k];
        b.classList.remove("got"); void b.offsetWidth; b.classList.add("got");
      }));
    }
    function preview(L) {
      const C = cfg(L), st = S.stars[L] || 0;
      const TN = { cat: "Pjesa e Shkrimit", gap: "Fjala që mungon", cont: "Vazhdo vargun", tf: "Po apo Jo", book: "Cili libër?", odd: "Fjala e huaj", order: "Rendit vargun", psn: "Cili psalm?" };
      const sh = $("#bqSheet") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "bqSheet", className: "bq-sheet" }));
      sh.innerHTML = `<div class="bq-pv glass" style="--wc:${WCOL[Math.floor((L - 1) / 50)]}">
        <small>${WORLDS[Math.floor((L - 1) / 50)]}</small><h2>${C.boss ? "👑 " : ""}Niveli ${L}</h2>
        <div class="bq-pv-st">${"★".repeat(st)}<i>${"★".repeat(3 - st)}</i></div>
        <ul><li>${C.nq} pyetje · ${C.time} sek secila</li><li>${C.errs - 1 ? `Deri në ${C.errs - 1} gabime` : "Pa asnjë gabim"}${C.boss ? " · nivel sfide" : ""}</li><li>${C.types.map((t) => TN[t]).join(" · ")}</li></ul>
        ${S.lives > 0 ? `<button class="btn primary" id="bqGo">Fillo · −❤ vetëm nëse humb</button>` : `<button class="btn" disabled>Pa jetë · +1 ❤ pas ${hms(lifeIn())}</button>`}
        <button class="btn" id="bqX">Mbyll</button></div>`;
      sh.hidden = false; requestAnimationFrame(() => sh.classList.add("on"));
      const close = () => { sh.classList.remove("on"); setTimeout(() => (sh.hidden = true), 250); };
      sh.onclick = (e) => { if (e.target === sh) close(); };
      $("#bqX").onclick = close;
      $("#bqGo")?.addEventListener("click", () => { close(); haptic(18); play(L); });
    }

    // ---- loja ----
    let G = null;
    function play(L) {
      stopAll();
      const C = cfg(L);
      G = { L, C, n: 0, ok: 0, errs: 0, combo: 0, best: 0, q: null, plus: 0 };
      next();
    }
    function hud() {
      const C = G.C;
      return `<header class="page-head"><button class="back-btn" id="bqQuit" aria-label="Dil">${icon("back")}</button><h1>${C.boss ? "👑 " : ""}Niveli ${G.L}</h1></header>
        <div class="bq-hud glass"><span class="bq-err">${"✕".repeat(G.errs)}<i>${"○".repeat(C.errs - G.errs)}</i></span>
          <span class="bq-dots">${Array.from({ length: C.nq }, (_, k) => `<i class="${k < G.n ? "ok" : k === G.n ? "now" : ""}"></i>`).join("")}</span>
          <span class="bq-combo">${G.combo > 1 ? `🔥×${G.combo}` : ""}</span></div>
        <div class="qz-time"><i id="bqBarT"></i></div>`;
    }
    const tools = () => `<div class="qz-tools bq-tools"><button class="qz-tool" id="bqH"${S.inv.h ? "" : " disabled"}>💡 ${S.inv.h}</button><button class="qz-tool" id="bqS"${S.inv.s ? "" : " disabled"}>⏭ ${S.inv.s}</button><button class="qz-tool" id="bqT"${S.inv.t ? "" : " disabled"}>⏳ ${S.inv.t}</button></div>`;
    function next() {
      clearInterval(timer);
      if (!alive()) return;
      if (G.errs >= G.C.errs) return finish(false);
      if (G.n >= G.C.nq) return finish(true);
      const C = G.C, type = C.types[(G.n + rnd(C.types.length)) % C.types.length], q = G.q = makeQ(C, type);
      q.done = false;
      let body = "";
      if (q.type === "odd") body = `<p class="qz-verse bq-odd">${q.toks.map((tk, k) => /\s/.test(tk) ? tk : `<button class="qz-w" data-k="${k}">${esc(tk)}</button>`).join("")}</p>`;
      else if (q.type === "order") body = `<p class="qz-verse bq-built" id="bqBuilt"><span class="bq-ph">Prek pjesët me radhë…</span></p><div class="bq-chunks">${q.ord.map((k) => `<button class="qz-chunk" data-k="${k}">${esc(q.parts[k])}</button>`).join("")}</div>`;
      else body = `<p class="qz-verse">${q.html || esc(q.text)}</p><div class="qz-opts${q.wide || q.opts.some((o) => o.length > 22) ? " wide" : ""}">${q.opts.map((o, k) => `<button class="qz-opt" data-k="${k}">${esc(o)}</button>`).join("")}</div>`;
      listPane.innerHTML = hud() + `<section class="qz-card glass bq-card"><p class="eyebrow">${esc(q.q)}</p>${body}</section>${tools()}<div id="bqAfter"></div>`;
      $("#bqQuit").onclick = () => { if (confirm("Të dalësh nga niveli? Nuk humb jetë.")) { stopAll(); home(); } };
      // koha
      let left = C.time * 1000; const t0 = Date.now(); let base = left;
      const bar = $("#bqBarT");
      timer = setInterval(() => {
        if (!alive()) return stopAll();
        const rem = base - (Date.now() - t0) + G.plus * 1000;
        bar.style.width = Math.max(0, rem / (C.time * 1000 + G.plus * 1000) * 100) + "%"; bar.classList.toggle("hurry", rem < 4000);
        if (rem <= 0 && !q.done) answer(false, "Koha mbaroi");
      }, 100);
      G.plus = 0;
      // përgjigjet
      if (q.opts) $$(".qz-opt", listPane).forEach((b) => b.addEventListener("click", () => { if (q.done) return; const ok = +b.dataset.k === q.ans; b.classList.add(ok ? "right" : "wrong"); answer(ok); }));
      if (q.type === "odd") $$(".qz-w", listPane).forEach((b) => b.addEventListener("click", () => { if (q.done) return; const ok = +b.dataset.k === q.odd; b.classList.add(ok ? "fixed" : "no"); if (ok) b.textContent = q.orig; answer(ok); }));
      if (q.type === "order") $$(".qz-chunk", listPane).forEach((b) => b.addEventListener("click", () => {
        if (q.done || b.disabled) return;
        if (q.parts[+b.dataset.k] === q.parts[q.next]) { b.disabled = true; b.classList.add("used"); const bu = $("#bqBuilt"); $(".bq-ph", bu)?.remove(); bu.insertAdjacentHTML("beforeend", `<span>${esc(q.parts[q.next])} </span>`); q.next++; haptic(6); if (q.next >= q.parts.length) answer(true); }
        else { b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); answer(false); }
      }));
      // ndihmat
      $("#bqH").onclick = () => {
        if (!S.inv.h || q.done || q.usedH) return; q.usedH = 1; S.inv.h--; save(); haptic(8); $("#bqH").innerHTML = "💡 " + S.inv.h; $("#bqH").disabled = true;
        if (q.opts) { const wrong = $$(".qz-opt", listPane).filter((b) => +b.dataset.k !== q.ans); shuffle(wrong).slice(0, Math.max(1, Math.floor(wrong.length / 2))).forEach((b) => b.classList.add("gone")); }
        else if (q.type === "odd") { const ws = $$(".qz-w", listPane).filter((b) => +b.dataset.k !== q.odd); shuffle(ws).slice(0, Math.floor(ws.length * 0.6)).forEach((b) => b.classList.add("dim")); }
        else if (q.type === "order") { const b = $(`.qz-chunk[data-k="${q.next}"]`, listPane); b?.classList.add("glow"); }
      };
      $("#bqS").onclick = () => { if (!S.inv.s || q.done) return; S.inv.s--; save(); haptic(8); toast("⏭ U kalua"); answer(true, null, true); };
      $("#bqT").onclick = () => { if (!S.inv.t || q.done) return; S.inv.t--; save(); haptic(8); base += 10000; $("#bqT").innerHTML = "⏳ " + S.inv.t; toast("+10 sekonda"); };
    }
    function answer(ok, why, skipped) {
      const q = G.q; if (q.done) return; q.done = true; clearInterval(timer);
      if (ok) { G.ok++; G.combo++; G.best = Math.max(G.best, G.combo); S.right++; haptic(10); }
      else { G.errs++; G.combo = 0; haptic([30, 40, 30]); }
      // trego të saktën
      if (q.opts) $$(".qz-opt", listPane).forEach((b) => { b.disabled = true; if (+b.dataset.k === q.ans) b.classList.add("right"); });
      if (q.type === "odd") { const b = $(`.qz-w[data-k="${q.odd}"]`, listPane); if (b && !b.classList.contains("fixed")) { b.classList.add("reveal"); b.textContent = q.orig; } }
      if (q.type === "order" && !ok) { $("#bqBuilt").innerHTML = esc(V[q.i][0]); $$(".qz-chunk", listPane).forEach((b) => (b.disabled = true)); }
      if (q.type === "gap") { const g = $(".bq-gap", listPane); if (g) { g.textContent = q.word; g.classList.add(ok ? "ok" : "no"); } }
      $$(".qz-tool", listPane).forEach((b) => (b.disabled = true));
      G.n++;
      const last = G.errs >= G.C.errs || G.n >= G.C.nq;
      $("#bqAfter").innerHTML = `<div class="qz-after bq-after"><p class="bq-src">${ok ? (skipped ? "⏭" : "✓") : "✕ " + (why || "")} <span>${esc(V[q.i][0].length > 0 ? refOf(q.i) : "")}</span></p><button class="btn primary" id="bqNx">${last ? "Përfundo" : "Tjetra ›"}</button></div>`;
      $("#bqNx").onclick = next;
      $(".bq-hud .bq-err", listPane).innerHTML = `${"✕".repeat(G.errs)}<i>${"○".repeat(Math.max(0, G.C.errs - G.errs))}</i>`;
      $(".bq-hud .bq-combo", listPane).textContent = G.combo > 1 ? `🔥×${G.combo}` : "";
    }
    function finish(won) {
      stopAll(); S.games++;
      const L = G.L, C = G.C;
      let html;
      if (won) {
        const stars = G.errs === 0 ? 3 : G.errs === 1 ? 2 : 1, prev = S.stars[L] || 0;
        const gain = Math.max(0, stars - prev) * 5 + (C.boss && !prev ? 25 : 0) + 2;
        S.stars[L] = Math.max(prev, stars); S.tal += gain;
        const first = L === S.lvl; if (first && S.lvl < MAXL) S.lvl++;
        let bonus = "";
        if (C.boss && !prev) { const g = ["h", "s", "t"][rnd(3)]; S.inv[g]++; bonus = `<p class="bq-bonus">👑 Shpërblimi i sfidës: ${g === "h" ? "💡 Ndihmë" : g === "s" ? "⏭ Kalim" : "⏳ Kohë"}</p>`; }
        const newWorld = first && (L % 50 === 0);
        save();
        html = `<section class="bq-res win glass"><div class="bq-res-st">${[0, 1, 2].map((k) => `<span class="${k < stars ? "on" : ""}" style="--k:${k}">★</span>`).join("")}</div>
          <h2>${L >= MAXL ? "Udhëtimi u plotësua! Lavdi Perëndisë!" : newWorld ? `Bota e re: ${WORLDS[Math.min(19, L / 50)]}` : "Bravo!"}</h2>
          <p>${G.ok}/${C.nq} të sakta · kombinimi ${G.best} · 🪙 +${gain}</p>${bonus}
          <div class="row"><button class="btn" id="bqMap">${icon("back")}<span>Harta</span></button>${L < MAXL ? `<button class="btn primary" id="bqNext2">Niveli ${L + 1} ›</button>` : ""}</div></section>`;
      } else {
        if (S.lives >= 3) S.lifeAt = Date.now();
        S.lives = Math.max(0, S.lives - 1); save();
        html = `<section class="bq-res lose glass"><div class="bq-res-h">💔</div><h2>Niveli ${L} nuk u kalua</h2>
          <p>Humbe një jetë. Të mbeten ${S.lives} ❤${S.lives < 3 ? ` · +1 pas ${hms(lifeIn())}` : ""}</p>
          <p class="bq-res-v">«${esc(V[G.q.i][0])}»<small>${esc(refOf(G.q.i))}</small></p>
          <div class="row"><button class="btn" id="bqMap">${icon("back")}<span>Harta</span></button>${S.lives ? `<button class="btn primary" id="bqAgain">Provo përsëri</button>` : `<button class="btn primary" id="bqAm2">🙏 Vargu i ditës</button>`}</div></section>`;
      }
      listPane.innerHTML = `<header class="page-head"><button class="back-btn" id="bqQuit" aria-label="Kthehu">${icon("back")}</button><h1>Niveli ${L}</h1></header>` + html;
      enter(listPane);
      if (won) { const r = $(".bq-res-st", listPane).getBoundingClientRect(); setTimeout(() => goldBurst(r.left + r.width / 2, r.top + 20), 300); Sfx.bells(G.errs ? 4 : 7, 0.6); }
      $("#bqQuit").onclick = home; $("#bqMap").onclick = home;
      $("#bqNext2")?.addEventListener("click", () => { world = Math.min(19, Math.floor(L / 50)); preview(L + 1); home(); preview(L + 1); });
      $("#bqAgain")?.addEventListener("click", () => play(L));
      $("#bqAm2")?.addEventListener("click", () => (S.amen === today ? (toast("Vargun e sotëm e ke lexuar. Prit jetën që kthehet."), home()) : amen()));
    }
    home();
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  // ---------- Për fëmijët: Superlibri (episodet zyrtare në shqip, CBN · superbookkids.com) ----------
  // [sezoni, [[slug, titulli, emoji, numri i episodit, id e luajtësit në faqen shqip], …]] — vetëm episodet e publikuara në shqip.
  // Sezoni 1–2: faqja shqip e CBN (sq.superbook.cbn.com, kërkon llogari falas). Sezoni 3–4: vetëm superbookkids.com.
  const SUPERBOOK = [[1, [["ne-fillim", "Në fillim", "🌍", 101, "5768135065001"], ["prova", "Prova!", "⛰", 102, "5768124419001"], ["jakobi-dhe-esau", "Jakobi dhe Esau", "🍲", 103, "5768130784001"], ["lere-popullin-tim-te-shkoje", "Lëre popullin tim të shkojë!", "🌊", 104, "5768130785001"], ["dhjete-urdherimet", "Dhjetë urdhërimet", "📜", 105, "5768130157001"], ["aventure-me-gjigant", "Aventurë me Gjigant", "🪨", 106, "5768130158001"], ["vrumbullima-e-luanit", "Vrumbullima e Luanit!", "🦁", 107, "5768124420001"], ["krishtlindja-e-pare", "Krishtlindja e parë", "⭐", 108, "5768129460001"], ["mrekullite-e-jezusit", "Mrekullitë e Jezusit", "✨", 109, "5768129961001"], ["darka-e-fundit", "Darka e fundit", "🍞", 110, "5768130786001"], ["ai-eshte-ngritur", "Ai është ngritur!", "✝", 111, "5768133075001"], ["rruga-damask", "Rruga për Damask", "💡", 112, "5768135066001"], ["zbulesa-beteja-e-fundit", "Zbulesa: Beteja e fundit!", "🌟", 113, "5768129962001"]]], [2, [["jona", "Jona", "🐋", 201, "6205010280001"], ["jozefi-dhe-endrra-e-faraonit", "Jozefi dhe ëndrra e Faraonit", "🌾", 202, "6205010762001"], ["sprova-e-zjarrit", "Sprova e zjarrit", "🔥", 203, "6205006790001"], ["rahabi-dhe-muret-e-jerikos", "Rahabi dhe muret e Jerikos", "🧱", 204, "6205008354001"], ["esteri-nje-kohe-te-tille", "Esteri: Për një kohë të tillë", "👸", 205, "6205008353001"], ["gjon-pagezori", "Gjon Pagëzori", "💧", 206, "6205006473001"], ["pali-dhe-mbytja-e-anijes", "Pali dhe mbytja e anijes", "⛵", 207, "6205010475001"], ["jobi", "Jobi", "🙏", 208, "6205010055001"], ["noeu-dhe-arka", "Noeu dhe arka", "🌈", 209, "6205006576001"], ["gedeoni-nje-hero-i-pazakonte", "Gedeoni, një hero i pazakontë", "🏺", 210, "6205008355001"], ["mohimi-i-pjetrit", "Mohimi i Pjetrit", "🐓", 211, "6205005632001"], ["djali-plangprishes", "Djali plangprishës", "🏡", 212, "6205010476001"], ["elia-dhe-profetet-e-baalit", "Elia dhe profetët e Baalit", "🔥", 213, "6205008356001"]]], [3, [["kulla-e-babelit-dhe-dita-e-pesedhjete-pentekosti", "Kulla e Babelit dhe Dita e Pesëdhjetë (Pentekosti)", "🗼", 302, ""], ["lindja-e-gjon-pagezuesit", "Lindja e Gjon Pagëzuesit", "👶", 303, ""], ["isak-dhe-rebeka", "Isak dhe Rebeka", "💧", 304, ""], ["samuel-dhe-thirrje-e-zotit", "Samueli dhe thirrja e Zotit", "🕯", 306, ""], ["david-dhe-saul", "David dhe Saul", "🎵", 307, ""], ["nehemia", "Nehemia", "🧱", 308, ""], ["elisha-dhe-sirian", "Elisha dhe sirianët", "🐎", 309, ""], ["lazari", "Lazari", "🌅", 310, ""], ["mbreti-solomon", "Mbreti Solomon", "👑", 311, ""], ["endrra-e-nebukadnezarit", "Ëndrra e Nebukadnezarit", "🗿", 312, ""], ["samaritani-i-mire", "Samaritani i mirë", "🫶", 313, ""]]], [4, [["jezusi-ushqen-te-uriturit", "Jezusi ushqen të uriturit", "🐟", 401, ""], ["pjetri-dhe-korneliu", "Pjetri dhe Korneliu", "🕊", 402, ""], ["pali-dhe-sila", "Pali dhe Sila", "🎶", 403, ""], ["tempulli-i-solominit", "Tempulli i Solomonit", "🏛", 404, ""], ["arratisja-e-pjetrit", "Arratisja e Pjetrit", "⛓", 405, ""], ["jezusi-sheron-te-verberin", "Jezusi shëron të verbërin", "👁", 406, ""], ["jozua-dhe-kalebi", "Jozua dhe Kalebi", "🍇", 407, ""], ["elia-dhe-veja", "Elia dhe veja", "🫓", 408, ""], ["me-meso-te-lutem", "Më mëso të lutem", "🙏", 409, ""], ["jeremia-alb", "Jeremia", "🏺", 410, ""], ["jezusi-ne-shkretetire", "Jezusi në shkretëtirë", "🏜", 411, ""], ["pali-dhe-barnaba", "Pali dhe Barnaba", "🚶", 412, ""]]]];
  const SB_SEASON = { 1: "#c0392b", 2: "#2e86c1", 3: "#7d3c98", 4: "#1e8449" };
  function viewKids() {
    const seen = store.get("sb.seen", {});
    const all = SUPERBOOK.reduce((n, g) => n + g[1].length, 0), nSeen = Object.keys(seen).filter((k) => SUPERBOOK.some((g) => g[1].some((e) => e[0] === k))).length;
    const tab = Math.max(0, Math.min(SUPERBOOK.length, +store.get("sb.tab", 1) || 0));
    const open = (slug, title) => {
      const ep = SUPERBOOK.flatMap((g) => g[1]).find((e) => e[0] === slug);
      const url = ep && ep[4] ? "https://sq.superbook.cbn.com/episode_player?v=" + ep[4] : "https://www.superbookkids.com/sq/video/episode/" + slug;
      seen[slug] = Date.now(); store.set("sb.seen", seen);
      if (android && android.openVideo) android.openVideo(url, title);
      else if (android && android.openExternal) android.openExternal(url);
      else window.open(url, "_blank", "noopener");
    };
    const list = tab ? SUPERBOOK.filter((g) => g[0] === tab) : SUPERBOOK;
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Superlibri</h1></header>
      <section class="sb-hero glass"><span class="sb-book">📖</span><div><b>Histori nga Bibla për fëmijë</b><small>${all} episode në shqip · ${SUPERBOOK.length} sezone${nSeen ? ` · parë ${nSeen}/${all}` : ""}</small>
        <div class="bq-wprog"><i style="width:${(nSeen / all * 100).toFixed(1)}%"></i></div></div></section>
      <div class="sb-tabs" role="tablist">${SUPERBOOK.map(([k]) => `<button role="tab" data-st="${k}" aria-selected="${tab === k}" style="--sc:${SB_SEASON[k]}">Sezoni ${k}</button>`).join("")}<button role="tab" data-st="0" aria-selected="${!tab}">Të gjitha</button></div>
      ${list.map(([k, eps]) => `<h2 class="hub-h sb-sh" style="--sc:${SB_SEASON[k]}">Sezoni ${k} <small>${eps.length} episode · ${eps[0][3]}–${eps[eps.length - 1][3]}${k > 2 ? " · vetëm në superbookkids.com" : ""}</small></h2>
        ${k > 2 ? `<p class="sb-warn">Ky sezon është dubluar në shqip, por gjendet vetëm në faqen e re superbookkids.com. Nga Shqipëria, faqja zakonisht të çon te faqja shqip e Superlibrit, ku ky sezon ende nuk është.</p>` : ""}
        <div class="sb-grid">${eps.map(([slug, t, e, n]) => `<button class="sb-ep${seen[slug] ? " seen" : ""}" data-sb="${slug}" data-t="${esc(t)}" style="--h:${(n * 47) % 360}"><span class="sb-n">${n}</span><span class="sb-e">${e}</span><b>${esc(t)}</b><i>${seen[slug] ? "✓ Parë" : "▶ Shiko"}</i></button>`).join("")}</div>`).join("")}
      <p class="sb-note">Episodet janë të serisë «Superbook» (Superlibri) të CBN-së dhe luhen nga faqja e tyre zyrtare${android && android.openVideo ? ", brenda aplikacionit" : ""}. Për episodet e plota faqja shqip kërkon një llogari Superbook falas: hyn një herë dhe aplikacioni të mban të identifikuar. Për prindërit: shihini bashkë me fëmijët dhe lexoni pastaj ngjarjen në Shkrimin e Shenjtë.</p>`;
    $$("[data-st]", listPane).forEach((b) => b.addEventListener("click", () => { haptic(6); store.set("sb.tab", +b.dataset.st); viewKids(); }));
    $$("[data-sb]", listPane).forEach((b) => b.addEventListener("click", () => { haptic(10); open(b.dataset.sb, b.dataset.t); b.classList.add("seen"); $("i", b).textContent = "✓ Parë"; }));
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  // =====================================================================
  //  ORA BIZANTINE — koha sipas Kishës: 12 orë dite (nga lindja në perëndim të diellit)
  //  dhe 12 orë nate, me gjatësi që ndryshon sipas stinës; shërbesa e orës.
  // =====================================================================
  const SunCalc = (() => {
    const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, J0 = 0.0009;
    const toDays = (ms) => ms / dayMs - 0.5 + J1970 - J2000, fromJulian = (j) => (j + 0.5 - J1970) * dayMs;
    const M = (d) => rad * (357.5291 + 0.98560028 * d);
    const L = (m) => m + rad * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m)) + rad * 102.9372 + Math.PI;
    const dec = (l) => Math.asin(Math.sin(e) * Math.sin(l));
    const transit = (ds, m, l) => J2000 + ds + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l);
    function times(dayMs0, lat, lng) {
      const lw = rad * -lng, phi = rad * lat, d = toDays(dayMs0), n = Math.round(d - J0 - lw / (2 * Math.PI));
      const ds = J0 + lw / (2 * Math.PI) + n, m = M(ds), l = L(m), dc = dec(l), Jn = transit(ds, m, l);
      const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dc)) / (Math.cos(phi) * Math.cos(dc)));
      if (isNaN(w)) { const nn = fromJulian(Jn); return { rise: nn - 6 * 36e5, set: nn + 6 * 36e5, noon: nn }; }
      const Js = transit(J0 + (w + lw) / (2 * Math.PI) + n, m, l);
      return { rise: fromJulian(Jn - (Js - Jn)), set: fromJulian(Js), noon: fromJulian(Jn) };
    }
    // mosha e hënës në ditë (0 = hënë e re, ~14.8 = hënë e plotë)
    const moonAge = (ms) => { const s = 29.530588853, a = ((ms - Date.UTC(2000, 0, 6, 18, 14)) / dayMs) % s; return a < 0 ? a + s : a; };
    return { times, moonAge };
  })();
  const CANON_HOURS = [
    // [fillimi, mbarimi] në shkallën 0–24 të orëve bizantine (0 = lindja e diellit, 12 = perëndimi)
    { a: 0, b: 2, n: "Ora e Parë", d: "Fillimi i ditës: kërkojmë që Zoti të drejtojë veprat e duarve tona.", ic: "🌅" },
    { a: 2, b: 5, n: "Ora e Tretë", d: "Kujton zbritjen e Shpirtit të Shenjtë mbi Apostujt.", ref: "Veprat e Apostujve 2:15", ic: "🕊" },
    { a: 5, b: 8, n: "Ora e Gjashtë", d: "Kujton Kryqëzimin e Zotit, kur errësira mbuloi dheun.", ref: "Ungjilli sipas Llukait 23:44", ic: "✝" },
    { a: 8, b: 10.5, n: "Ora e Nëntë", d: "Kujton vdekjen e Zotit mbi Kryq.", ref: "Ungjilli sipas Markut 15:34", ic: "🕯" },
    { a: 10.5, b: 13, n: "Mbrëmësorja", d: "Falënderimi në mbarim të ditës. Me perëndimin e diellit nis dita liturgjike e re.", go: "#/sherbesa", ic: "🌇" },
    { a: 13, b: 17, n: "Pasdarka", d: "Lutja para gjumit, që Zoti të na ruajë gjatë natës.", go: "#/pasdarka", ic: "🌙" },
    { a: 17, b: 20, n: "Mesnata", d: "Zgjimi në mesnatë, në pritje të Dhëndrit që vjen.", ref: "Ungjilli sipas Mattheut 25:6", ic: "✨" },
    { a: 20, b: 24, n: "Mëngjesorja", d: "Lavdërimi para agimit, për dritën që vjen.", go: "#/sherbesa", ic: "☀️" },
  ];
  const DITET_J = ["e Diela", "e Hëna", "e Marta", "e Mërkura", "e Enjtja", "e Premtja", "e Shtuna"];
  const ORDINAL = ["", "e parë", "e dytë", "e tretë", "e katërt", "e pestë", "e gjashtë", "e shtatë", "e tetë", "e nëntë", "e dhjetë", "e njëmbëdhjetë", "e dymbëdhjetë"];
  function byzNow(now, lat, lng) {
    const day0 = new Date(now); day0.setHours(12, 0, 0, 0);
    const T = SunCalc.times(day0.getTime(), lat, lng), Ty = SunCalc.times(day0.getTime() - 864e5, lat, lng), Tt = SunCalc.times(day0.getTime() + 864e5, lat, lng);
    let isDay, from, to;
    if (now >= T.rise && now < T.set) { isDay = true; from = T.rise; to = T.set; }
    else if (now >= T.set) { isDay = false; from = T.set; to = Tt.rise; }
    else { isDay = false; from = Ty.set; to = T.rise; }
    const unit = (to - from) / 12, x = (now - from) / unit;            // 0–12
    const pos = isDay ? x : 12 + x;                                     // 0–24
    const cur = CANON_HOURS.find((c) => pos >= c.a && pos < c.b) || CANON_HOURS[0];
    return { T, Ty, Tt, isDay, from, to, unit, h: Math.floor(x) + 1, frac: x % 1, pos, cur };
  }
  function viewByzClock() {
    let loc = store.get("ora.loc", { lat: 41.3275, lng: 19.8187, name: "Tiranë" });
    let raf = 0, lastMin = -1;
    const alive = () => location.hash.startsWith("#/ora");
    const fmt = (ms) => new Date(ms).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" });
    const R = 118, C = 150;
    const ang = (ms) => { const d = new Date(ms), h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; return (h / 24) * 2 * Math.PI + Math.PI / 2; };
    const pt = (a, r) => [C + Math.cos(a) * r, C + Math.sin(a) * r];
    const arc = (a1, a2, r1, r2) => {
      while (a2 < a1) a2 += 2 * Math.PI;
      const big = a2 - a1 > Math.PI ? 1 : 0, [x1, y1] = pt(a1, r2), [x2, y2] = pt(a2, r2), [x3, y3] = pt(a2, r1), [x4, y4] = pt(a1, r1);
      return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r2} ${r2} 0 ${big} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${r1} ${r1} 0 ${big} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z`;
    };
    function dial(B) {
      const segs = [];
      for (let k = 0; k < 12; k++) {
        const ds = B.T.rise + (B.T.set - B.T.rise) / 12 * k, de = ds + (B.T.set - B.T.rise) / 12;
        segs.push(`<path class="oz-seg day${k % 2 ? " alt" : ""}" d="${arc(ang(ds), ang(de), R - 26, R)}"/>`);
        const [tx, ty] = pt((ang(ds) + ang(de)) / 2 + (ang(de) < ang(ds) ? Math.PI : 0), R - 13);
        segs.push(`<text class="oz-num" x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}">${k + 1}</text>`);
      }
      const nS = B.T.set, nE = B.Tt.rise;
      for (let k = 0; k < 12; k++) {
        const ds = nS + (nE - nS) / 12 * k, de = ds + (nE - nS) / 12;
        segs.push(`<path class="oz-seg night${k % 2 ? " alt" : ""}" d="${arc(ang(ds), ang(de), R - 26, R)}"/>`);
        let a1 = ang(ds), a2 = ang(de); if (a2 < a1) a2 += 2 * Math.PI;
        const [tx, ty] = pt((a1 + a2) / 2, R - 13);
        segs.push(`<text class="oz-num n" x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}">${k + 1}</text>`);
      }
      // orët e shërbesave si harqe të brendshme
      const posMs = (p) => p < 12 ? B.T.rise + (B.T.set - B.T.rise) / 12 * p : nS + (nE - nS) / 12 * (p - 12);
      const canon = CANON_HOURS.map((c, i) => `<path class="oz-can${c === B.cur ? " on" : ""}" style="--i:${i}" d="${arc(ang(posMs(c.a)), ang(posMs(c.b)), R - 40, R - 31)}"/>`).join("");
      const ticks = Array.from({ length: 24 }, (_, h) => { const a = (h / 24) * 2 * Math.PI + Math.PI / 2, [x1, y1] = pt(a, R + 3), [x2, y2] = pt(a, R + (h % 6 ? 7 : 12)); return `<line class="oz-tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>` + (h % 6 ? "" : `<text class="oz-civ" x="${pt(a, R + 22)[0].toFixed(1)}" y="${(pt(a, R + 22)[1] + 4).toFixed(1)}">${String(h).padStart(2, "0")}</text>`); }).join("");
      const age = SunCalc.moonAge(Date.now()), ph = age / 29.53, lit = (1 - Math.cos(ph * 2 * Math.PI)) / 2;
      return `<svg class="oz-dial" viewBox="0 0 300 300" role="img" aria-label="Ora bizantine">
        <defs><radialGradient id="ozSky" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="var(--oz-c1)"/><stop offset="1" stop-color="var(--oz-c2)"/></radialGradient>
          <radialGradient id="ozSun" cx=".4" cy=".4" r=".6"><stop offset="0" stop-color="#fff7d0"/><stop offset=".5" stop-color="#ffcf4a"/><stop offset="1" stop-color="#e08a12"/></radialGradient>
          <filter id="ozGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>
        <circle cx="${C}" cy="${C}" r="${R + 30}" fill="url(#ozSky)"/>
        ${ticks}${segs.join("")}${canon}
        <g class="oz-moon" transform="translate(${C} ${C + 46})"><circle r="11" fill="#2b3550"/><path d="${(() => { const r = 11, k = Math.cos(ph * 2 * Math.PI) * r, sweep = ph < 0.5 ? 1 : 0; return `M0 ${-r} A${r} ${r} 0 0 ${sweep} 0 ${r} A${Math.abs(k).toFixed(2)} ${r} 0 0 ${(k > 0) === (ph < 0.5) ? 0 : 1} 0 ${-r}Z`; })()}" fill="#f4ecd0"/></g>
        <text class="oz-moon-t" x="${C}" y="${C + 72}">Hëna ${Math.round(lit * 100)}%</text>
        <g id="ozHand"><line x1="${C}" y1="${C}" x2="${C}" y2="${C - R + 4}" class="oz-hand"/><circle id="ozSunDot" cx="${C}" cy="${C - R + 13}" r="10" fill="url(#ozSun)"/><circle cx="${C}" cy="${C - R + 13}" r="14" fill="#ffcf4a" opacity=".35" filter="url(#ozGlow)"/></g>
        <circle cx="${C}" cy="${C}" r="5" class="oz-pin"/>
      </svg>`;
    }
    function render() {
      const now = Date.now(), B = byzNow(now, loc.lat, loc.lng);
      const nd = new Date(now), litDay = !B.isDay && now >= B.T.set ? (nd.getDay() + 1) % 7 : nd.getDay();
      const sky = B.isDay ? (B.pos < 1.2 || B.pos > 10.8 ? ["#f6c27a", "#b3542e"] : ["#9fd0f0", "#3c7fb8"]) : (B.pos < 13.2 || B.pos > 22.8 ? ["#6b4a7a", "#22183a"] : ["#1b2848", "#070b18"]);
      const idx = CANON_HOURS.indexOf(B.cur), next = CANON_HOURS[(idx + 1) % CANON_HOURS.length];
      const mins = Math.floor(B.frac * 60);
      listPane.innerHTML = `
        <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Ora Bizantine</h1></header>
        <section class="oz glass" style="--oz-c1:${sky[0]};--oz-c2:${sky[1]}">
          <div class="oz-top"><small>${esc(loc.name)} · ${fmt(now)}</small><button class="oz-loc" id="ozLoc">📍 Vendi im</button></div>
          ${dial(B)}
          <div class="oz-big"><b id="ozH">Ora ${ORDINAL[B.h]} e ${B.isDay ? "ditës" : "natës"}</b><small id="ozM">Ora bizantine ${B.h}:${String(mins).padStart(2, "0")} · një orë ${B.isDay ? "dite" : "nate"} sot zgjat ${Math.round(B.unit / 6e4)} minuta</small></div>
        </section>
        <section class="oz-now glass">
          <span class="oz-ic">${B.cur.ic}</span>
          <div><small>Tani, afërsisht</small><b>${B.cur.n}</b><p>${esc(B.cur.d)}${B.cur.ref ? ` <em>${esc(B.cur.ref)}</em>` : ""}</p>
            ${B.cur.go ? `<a class="btn primary" href="${B.cur.go}">${icon("book")}<span>Hap shërbesën</span></a>` : `<a class="btn" href="#/biblioteka/lutjet">${icon("book")}<span>Lutjet</span></a>`}</div>
        </section>
        <div class="oz-grid">
          <div class="oz-cell glass"><small>Lindja e diellit</small><b>${fmt(B.T.rise)}</b></div>
          <div class="oz-cell glass"><small>Perëndimi</small><b>${fmt(B.T.set)}</b></div>
          <div class="oz-cell glass"><small>Dita</small><b>${Math.floor((B.T.set - B.T.rise) / 36e5)}h ${Math.round((B.T.set - B.T.rise) / 6e4 % 60)}m</b></div>
          <div class="oz-cell glass"><small>Dita liturgjike</small><b>${DITET_J[litDay]}</b></div>
        </div>
        <p class="oz-next">Më pas: <b>${next.ic} ${next.n}</b></p>
        <details class="oz-help glass"><summary>Si e numëron Kisha kohën?</summary>
          <p>Në kohën e Shkrimit dita ndahej në 12 orë nga lindja deri në perëndimin e diellit, dhe nata në 12 orë të tjera. Prandaj në verë një orë e ditës është e gjatë, kurse në dimër e shkurtër. Ora e tretë, e gjashtë dhe e nëntë e Ungjijve janë këto orë.</p>
          <p>Dita liturgjike nis me Mbrëmësoren, në perëndim të diellit: «u bë mbrëmje dhe u bë mëngjes». Orët e shërbesave në rreth janë afërsisht; në kishë ato mbahen sipas Tipikonit.</p></details>`;
      $("#ozLoc").onclick = () => {
        if (!navigator.geolocation) return toast("Vendndodhja nuk është e mundur");
        toast("Po gjej vendin…");
        navigator.geolocation.getCurrentPosition((p) => { loc = { lat: +p.coords.latitude.toFixed(3), lng: +p.coords.longitude.toFixed(3), name: "Vendi im" }; store.set("ora.loc", loc); haptic(10); render(); }, () => toast("Nuk u gjet vendndodhja. Mbetet Tirana."), { timeout: 9000, maximumAge: 36e5 });
      };
      enter(listPane);
      tick();
    }
    function tick() {
      clearTimeout(raf);
      const step = () => {
        if (!alive() || !$("#ozHand")) return;
        const now = Date.now(), a = ang(now) * 180 / Math.PI - 270;
        $("#ozHand").setAttribute("transform", `rotate(${a.toFixed(3)} ${C} ${C})`);
        const m = Math.floor(now / 6e4);
        if (m !== lastMin) { if (lastMin !== -1) { lastMin = m; return render(); } lastMin = m; }
        raf = setTimeout(() => requestAnimationFrame(step), 1000);
      };
      step();
    }
    render();
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  // =====================================================================
  //  KAMBANORJA — kambana të vërteta me litarë: tërhiq litarin me gisht;
  //  tingulli ndërtohet nga pjesët e tingullit të kambanës (hum, prime, tierce, quint, nominal)
  // =====================================================================
  const BellAudio = (() => {
    let ctx = null, out = null;
    function init() {
      if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      // jehona e kambanores: përgjigje impulsi e gjeneruar
      const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      const conv = ctx.createConvolver(); conv.buffer = ir;
      const wet = ctx.createGain(); wet.gain.value = 0.32; const dry = ctx.createGain(); dry.gain.value = 0.8;
      out = ctx.createGain(); out.gain.value = 0.9;
      out.connect(dry).connect(comp); out.connect(conv).connect(wet).connect(comp); comp.connect(ctx.destination);
      return ctx;
    }
    // [raporti, amplituda, kohëzgjatja relative]
    const PARTIALS = [[0.5, 0.9, 1], [1, 0.75, 0.62], [1.2, 0.5, 0.48], [1.5, 0.28, 0.4], [2, 0.42, 0.34], [2.5, 0.14, 0.22], [2.67, 0.13, 0.2], [3.01, 0.1, 0.16], [4.17, 0.06, 0.1], [5.43, 0.03, 0.07]];
    function strike(f, vol = 1, when = 0) {
      const c = init(); if (!c) return;
      const t0 = c.currentTime + 0.01 + when, dur = Math.max(3.2, Math.min(11, 1500 / f));
      PARTIALS.forEach(([r, a, dr], i) => {
        const fr = f * r * (1 + (Math.random() - 0.5) * 0.002);
        [0, i < 3 ? 0.9 + Math.random() * 0.8 : 0].forEach((beat, k) => {
          if (k && !beat) return;
          const o = c.createOscillator(), g = c.createGain();
          o.type = "sine"; o.frequency.value = fr + beat;
          const amp = a * vol * (k ? 0.45 : 1) * 0.16;
          g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(amp, t0 + 0.004 + i * 0.0015);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * dr);
          o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur * dr + 0.05);
        });
      });
      // goditja e gjuhës së kambanës
      const nb = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 4);
      const ns = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
      ns.buffer = nb; bp.type = "bandpass"; bp.frequency.value = f * 3.2; bp.Q.value = 1.2; ng.gain.value = 0.35 * vol;
      ns.connect(bp).connect(ng).connect(out); ns.start(t0);
    }
    return { strike, init };
  })();
  const BELLS = [
    { n: "E madhja", f: 98, w: 104, x: 20 },
    { n: "E mesmja", f: 147, w: 78, x: 41 },
    { n: "E treta", f: 196, w: 62, x: 59 },
    { n: "Zilja", f: 294, w: 46, x: 74 },
    { n: "E vogla", f: 392, w: 36, x: 86 },
  ];
  function viewBells() {
    const alive = () => location.hash.startsWith("#/kambanorja");
    let playT = [], rec = null;
    const saved = store.get("kambana.rec", null);
    const bellPath = (w) => { const h = w * 0.95, t = w * 0.28; return `M${-t} ${-h * 0.92} Q0 ${-h * 1.04} ${t} ${-h * 0.92} C${w * 0.36} ${-h * 0.6} ${w * 0.38} ${-h * 0.2} ${w * 0.5} ${-h * 0.03} Q${w * 0.56} 0 ${w * 0.5} ${h * 0.04} L${-w * 0.5} ${h * 0.04} Q${-w * 0.56} 0 ${-w * 0.5} ${-h * 0.03} C${-w * 0.38} ${-h * 0.2} ${-w * 0.36} ${-h * 0.6} ${-t} ${-h * 0.92}Z`; };
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Kambanorja</h1></header>
      <section class="kb-stage" id="kbStage">
        <svg class="kb-tower" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="kbStone" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e9dcc4"/><stop offset="1" stop-color="#b9a585"/></linearGradient></defs>
          <path d="M0 0 H100 V70 H92 V22 Q92 8 76 8 H24 Q8 8 8 22 V70 H0Z" fill="url(#kbStone)"/>
          <path d="M8 22 Q8 8 24 8 H76 Q92 8 92 22" fill="none" stroke="#8a7456" stroke-width=".8"/>
          <rect x="4" y="12" width="92" height="2.2" fill="#6b4a2a"/>
        </svg>
        <div class="kb-cross">☦</div>
        ${BELLS.map((b, i) => `<div class="kb-bell" data-i="${i}" style="left:${b.x}%;--w:${b.w}px">
          <svg viewBox="${-b.w * 0.6} ${-b.w} ${b.w * 1.2} ${b.w * 1.15}" width="${b.w * 1.2}" height="${b.w * 1.15}" class="kb-svg">
            <defs><linearGradient id="kbBr${i}" x1="0" x2="1"><stop offset="0" stop-color="#4a2e10"/><stop offset=".3" stop-color="#c8913a"/><stop offset=".45" stop-color="#ffe2a0"/><stop offset=".62" stop-color="#b07a2a"/><stop offset="1" stop-color="#3a220a"/></linearGradient></defs>
            <path d="${bellPath(b.w)}" fill="url(#kbBr${i})" stroke="#3a220a" stroke-width="1"/>
            <path d="M${-b.w * 0.42} ${-b.w * 0.12} H${b.w * 0.42}" stroke="#7a5420" stroke-width="${Math.max(1, b.w / 40)}"/>
            <path d="M${-b.w * 0.3} ${-b.w * 0.55} H${b.w * 0.3}" stroke="#ffe2a0" stroke-width=".8" opacity=".6"/>
            <g class="kb-clap"><line x1="0" y1="${-b.w * 0.85}" x2="0" y2="${-b.w * 0.05}" stroke="#2a1a0a" stroke-width="${Math.max(1.5, b.w / 30)}"/><circle cx="0" cy="${-b.w * 0.05}" r="${b.w / 11}" fill="#2a1a0a"/></g>
          </svg>
          <i class="kb-wave"></i>
          <div class="kb-rope"><span></span></div>
          <small>${b.n}</small>
        </div>`).join("")}
        <p class="kb-hint">Tërhiq litarët poshtë, ose prek kambanat</p>
      </section>
      <div class="kb-pat">
        <button class="kb-p glass" data-p="call"><span>🔔</span><b>Thirrja</b><small>Kambana e madhe, ngadalë</small></button>
        <button class="kb-p glass" data-p="joy"><span>🎉</span><b>E gëzueshme</b><small>Të gjitha bashkë, me ritëm</small></button>
        <button class="kb-p glass" data-p="slow"><span>🕯</span><b>E ngadaltë</b><small>Nga e vogla te e madhja</small></button>
        <button class="kb-p glass" data-p="stop"><span>⏹</span><b>Ndalo</b><small>Hesht kambanat</small></button>
      </div>
      <div class="kb-rec glass"><button class="btn" id="kbRec">● Regjistro ritmin tënd</button><button class="btn primary" id="kbPlay"${saved ? "" : " disabled"}>▶ Luaje</button><small id="kbRecT">${saved ? `${saved.length} goditje të ruajtura` : "Deri në 40 sekonda"}</small></div>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    const els = $$(".kb-bell", listPane);
    // vendos kambanat sipas gjerësisë së ekranit, pa u mbivendosur
    const layout = () => {
      const st = $("#kbStage"); if (!st) return removeEventListener("resize", layout);
      const W = st.clientWidth, sc = Math.min(1.3, (W * 0.9) / BELLS.reduce((a, b) => a + b.w * 1.2, 0));
      const tot = BELLS.reduce((a, b) => a + b.w * 1.2 * sc, 0), gap = (W - tot) / (BELLS.length + 1);
      let x = gap;
      els.forEach((el, i) => { const w = BELLS[i].w * sc; el.style.setProperty("--w", w.toFixed(1) + "px"); el.style.left = (x + w * 0.6).toFixed(1) + "px"; x += w * 1.2 + gap; });
    };
    layout(); addEventListener("resize", layout, { passive: true });
    function ring(i, vol = 1, fromUser) {
      const b = BELLS[i], el = els[i]; if (!el || !alive()) return;
      BellAudio.strike(b.f, vol);
      el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit");
      el.style.setProperty("--amp", (4 + vol * 8).toFixed(1) + "deg");
      if (fromUser) { haptic(i < 2 ? 18 : 8); if (rec) rec.push([i, +(vol.toFixed(2)), Date.now() - rec.t0]); }
    }
    // litarët: tërhiqe poshtë; sa më shpejt, aq më fort bie kambana
    els.forEach((el, i) => {
      const rope = $(".kb-rope", el); let d = null;
      rope.addEventListener("pointerdown", (e) => { BellAudio.init(); try { rope.setPointerCapture(e.pointerId); } catch (er) {} d = { y0: e.clientY, t0: performance.now(), dy: 0, struck: false }; rope.classList.add("pull"); });
      rope.addEventListener("pointermove", (e) => {
        if (!d) return; d.dy = Math.max(0, Math.min(70, e.clientY - d.y0)); rope.style.setProperty("--pull", d.dy + "px");
        if (!d.struck && d.dy > 34) { d.struck = true; const v = Math.min(1, Math.max(0.35, d.dy / Math.max(40, performance.now() - d.t0) * 2.2)); ring(i, v, true); }
      });
      const up = () => { if (!d) return; if (!d.struck) ring(i, 0.5, true); d = null; rope.classList.remove("pull"); rope.style.setProperty("--pull", "0px"); };
      rope.addEventListener("pointerup", up); rope.addEventListener("pointercancel", up);
      $(".kb-svg", el).addEventListener("pointerdown", () => { BellAudio.init(); ring(i, 0.8, true); });
    });
    const stopAll = () => { playT.forEach(clearTimeout); playT = []; $$(".kb-p", listPane).forEach((b) => b.classList.remove("on")); };
    const at = (ms, fn) => playT.push(setTimeout(() => { if (alive()) fn(); else stopAll(); }, ms));
    const PAT = {
      call: () => { for (let k = 0; k < 12; k++) at(k * 2400, () => ring(0, 1)); return 12 * 2400; },
      joy: () => { const seq = [[4, 3], [3, 2], [4, 3], [2, 4], [4, 3], [3, 2], [4, 1], [2, 4]]; let t = 0; for (let r = 0; r < 4; r++) { seq.forEach(([a, b]) => { at(t, () => ring(a, 0.8)); at(t + 190, () => ring(b, 0.75)); t += 420; }); at(t - 420 * 8, () => ring(0, 1)); at(t - 420 * 4, () => ring(1, 0.9)); } return t; },
      slow: () => { let t = 0; for (let r = 0; r < 3; r++) { for (let i = BELLS.length - 1; i >= 0; i--) { at(t, () => ring(i, 0.85)); t += 2600; } at(t, () => BELLS.forEach((_, i) => ring(i, 0.7))); t += 5200; } return t; },
    };
    $$(".kb-p", listPane).forEach((btn) => btn.addEventListener("click", () => {
      BellAudio.init(); stopAll(); haptic(10);
      if (btn.dataset.p === "stop") return;
      btn.classList.add("on"); const total = PAT[btn.dataset.p](); at(total + 200, () => btn.classList.remove("on"));
    }));
    $("#kbRec").onclick = () => {
      BellAudio.init();
      if (rec) { const r = rec; rec = null; $("#kbRec").textContent = "● Regjistro ritmin tënd"; $("#kbRec").classList.remove("rec"); if (r.length) { store.set("kambana.rec", r.slice()); $("#kbPlay").disabled = false; $("#kbRecT").textContent = `${r.length} goditje të ruajtura`; toast("Ritmi u ruajt"); } return; }
      rec = []; rec.t0 = Date.now(); $("#kbRec").textContent = "■ Mbaro regjistrimin"; $("#kbRec").classList.add("rec"); $("#kbRecT").textContent = "Po regjistrohet… bjeri kambanave";
      at(40000, () => rec && $("#kbRec").click());
    };
    $("#kbPlay").onclick = () => { const r = store.get("kambana.rec", null); if (!r) return; BellAudio.init(); stopAll(); r.forEach(([i, v, t]) => at(t, () => ring(i, v))); haptic(8); };
  }

  // =====================================================================
  //  KANDILI I SHTËPISË — digjet në kohë reale 24 orë përpara ikonës; mbushet me vaj;
  //  lëkundet kur anon telefonin; dritë e ngrohtë mbi ikonë; “Kujto, o Zot” për emrat.
  // =====================================================================
  const KANDIL_ICONS = [
    ["img/krishti/02.webp", "Krishti Pantokrator, Sinai"], ["img/krishti/04.webp", "Krishti Pantokrator, Dafni"], ["img/krishti/06.webp", "Krishti, Shën Sofia"],
    ["img/hyjlindesja/07.webp", "Hyjlindësja Odhigjitria, Janinë"], ["img/hyjlindesja/10.webp", "Hyjlindësja Odhigjitria, Kora"], ["img/hyjlindesja/02.webp", "Hyjlindësja Odhigjitria, Nesebar"],
  ];
  const KANDIL_H = 24 * 36e5;
  const kandilState = () => {
    const k = Object.assign({ lit: 0, icon: 0, days: {}, names: [] }, store.get("kandil", {}));
    const oil = k.lit ? Math.max(0, 1 - (Date.now() - k.lit) / KANDIL_H) : 0;
    return { k, oil, on: oil > 0 };
  };
  function kandilStreak(days) {
    let n = 0; const d = new Date();
    for (;;) { const key = d.toISOString().slice(0, 10); if (!days[key]) break; n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function viewKandil() {
    const alive = () => location.hash.startsWith("#/kandili");
    let wakeLoop = () => {};
    let S = kandilState(), raf = 0, sway = { a: 0, w: 0, target: 0 }, wake = null, onOri = null;
    const save = () => store.set("kandil", S.k);
    const markDay = () => { if (S.on) { const d = new Date(), key = d.toISOString().slice(0, 10); if (!S.k.days[key]) { S.k.days[key] = 1; save(); } } };
    markDay();
    function hoursLeft() { const ms = S.oil * KANDIL_H, h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60; return `${h} orë ${m} min`; }
    function render() {
      S = kandilState(); markDay();
      const [src, cap] = KANDIL_ICONS[S.k.icon] || KANDIL_ICONS[0];
      const streak = kandilStreak(S.k.days);
      listPane.innerHTML = `
        <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Kandili</h1></header>
        <section class="kd-stage${S.on ? " on" : ""}" id="kdStage" style="--oil:${S.oil.toFixed(3)}">
          <div class="kd-wall"></div>
          <figure class="kd-icon"><img src="${src}" alt="${esc(cap)}" decoding="async"><i class="kd-light"></i></figure>
          <i class="kd-bracket" id="kdBr"></i>
          <div class="kd-hang" id="kdHang">
            <i class="kd-chain"></i>
            <svg class="kd-lamp" viewBox="0 0 120 150" aria-hidden="true">
              <defs>
                <linearGradient id="kdGold" x1="0" x2="1"><stop offset="0" stop-color="#5a3a0e"/><stop offset=".35" stop-color="#ffe7a2"/><stop offset=".6" stop-color="#c8962e"/><stop offset="1" stop-color="#4e320b"/></linearGradient>
                <radialGradient id="kdGlass" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ff6a5a" stop-opacity=".95"/><stop offset=".6" stop-color="#b3121b" stop-opacity=".92"/><stop offset="1" stop-color="#4a0408" stop-opacity=".96"/></radialGradient>
                <linearGradient id="kdOil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#b8741a" stop-opacity=".95"/></linearGradient>
                <clipPath id="kdCup"><path d="M28 62 C26 96 40 118 60 120 C80 118 94 96 92 62 Z"/></clipPath>
                <radialGradient id="kdFl" cx=".5" cy=".75" r=".6"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff2a8"/><stop offset=".7" stop-color="#ffb02e"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/></radialGradient>
              </defs>
              <path d="M60 4 L30 58 M60 4 L90 58 M60 4 L60 56" stroke="url(#kdGold)" stroke-width="2"/>
              <circle cx="60" cy="5" r="4" fill="none" stroke="url(#kdGold)" stroke-width="2"/>
              <path d="M28 62 C26 96 40 118 60 120 C80 118 94 96 92 62 Z" fill="url(#kdGlass)"/>
              <g clip-path="url(#kdCup)"><rect class="kd-oil" x="20" y="${(118 - S.oil * 46).toFixed(1)}" width="80" height="60" fill="url(#kdOil)" opacity=".55"/></g>
              <ellipse cx="44" cy="80" rx="6" ry="16" fill="#fff" opacity=".22"/>
              <path d="M24 60 Q60 70 96 60 L94 66 Q60 76 26 66 Z" fill="url(#kdGold)"/>
              ${[34, 47, 60, 73, 86].map((x) => `<path d="M${x} 66 l0 6" stroke="url(#kdGold)" stroke-width="1.6"/>`).join("")}
              <path d="M52 120 Q60 128 68 120 L64 134 Q60 138 56 134 Z" fill="url(#kdGold)"/>
              <circle cx="60" cy="140" r="3.5" fill="url(#kdGold)"/>
              <g class="kd-flame"><ellipse cx="60" cy="52" rx="14" ry="20" fill="#ff9a2a" opacity=".25"/><path d="M60 32 C66 42 68 50 64 58 C62 62 58 62 56 58 C52 50 54 42 60 32Z" fill="url(#kdFl)"/><path d="M60 46 C62 50 62 54 60 57 C58 54 58 50 60 46Z" fill="#fff" opacity=".9"/></g>
              <path d="M59 58 l1 6 l1 -6" stroke="#2a1a0a" stroke-width="1.4"/>
            </svg>
          </div>
          <div class="kd-glow"></div>
          <p class="kd-cap">${esc(cap)}</p>
        </section>
        <section class="kd-status glass">
          <div class="kd-oilbar"><i style="width:${(S.oil * 100).toFixed(1)}%"></i></div>
          <p>${S.on ? `🔥 Kandili po ndriçon · vaj edhe për <b id="kdLeft">${hoursLeft()}</b>` : S.k.lit ? "Kandili u shua: i mbaroi vaji. Ndize përsëri." : "Kandili nuk është ndezur ende."}</p>
          ${streak ? `<p class="kd-streak">✨ Ka ndriçuar <b>${streak}</b> ${streak === 1 ? "ditë" : "ditë rresht"} në shtëpinë tënde</p>` : ""}
          <div class="kd-btns">
            ${S.on ? `<button class="btn primary" id="kdOilBtn">🫗 Shto vaj</button>` : `<button class="btn primary" id="kdLight">🔥 Ndize kandilin</button>`}
            <button class="btn" id="kdQuiet">🌙 Rri para ikonës</button>
          </div>
        </section>
        <section class="kd-names glass">
          <h3>Kujto, o Zot…</h3>
          <p class="kd-nh">Emrat e të dashurve që kujton para kandilit</p>
          <div class="kd-nlist">${S.k.names.map((n, i) => `<span>${esc(n)}<button data-rm="${i}" aria-label="Hiq">×</button></span>`).join("") || `<em>Ende asnjë emër</em>`}</div>
          <form id="kdForm" class="kd-form"><input id="kdName" maxlength="40" placeholder="Shkruaj një emër" autocomplete="off"><button class="btn">Shto</button></form>
        </section>
        <section class="kd-pick"><h3 class="hub-h">Ikona</h3><div class="kd-icons">${KANDIL_ICONS.map(([s, c], i) => `<button class="kd-th${i === S.k.icon ? " on" : ""}" data-ic="${i}" aria-label="${esc(c)}"><img src="${s}" alt="" loading="lazy" decoding="async"></button>`).join("")}</div>
          <p class="kd-credit">Ikonat: <a href="#/imazhet">burimet dhe licencat</a></p></section>`;
      enter(listPane);
      bind();
    }
    function light(e) {
      S.k.lit = Date.now(); save(); haptic([10, 40, 10]); Sfx.strike();
      const r = e.currentTarget.getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top);
      render();
      const st = $("#kdStage"); st.classList.add("igniting"); setTimeout(() => st && st.classList.remove("igniting"), 1600);
    }
    function bind() {
      $("#kdLight")?.addEventListener("click", light);
      $("#kdOilBtn")?.addEventListener("click", (e) => {
        if (S.oil > 0.97) { toast("Kandili është plot me vaj"); return; }
        S.k.lit = Date.now(); save(); haptic(12);
        const st = $("#kdStage"); st.classList.add("pour"); st.style.setProperty("--oil", "1");
        $(".kd-oil", st).setAttribute("y", "72");
        setTimeout(() => { st.classList.remove("pour"); render(); }, 1400);
        toast("U mbush me vaj · 24 orë dritë");
      });
      $("#kdQuiet").onclick = quiet;
      $$("[data-ic]", listPane).forEach((b) => b.addEventListener("click", () => { S.k.icon = +b.dataset.ic; save(); haptic(8); render(); }));
      $$("[data-rm]", listPane).forEach((b) => b.addEventListener("click", () => { S.k.names.splice(+b.dataset.rm, 1); save(); render(); }));
      $("#kdForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#kdName").value.trim(); if (!v) return; if (S.k.names.length >= 40) return toast("Deri në 40 emra"); S.k.names.push(v); save(); haptic(8); render(); });
      // kandili varet nga një krah i artë poshtë ikonës (zinxhiri nuk kalon mbi fytyrën e shenjtë)
      const hang = $("#kdHang");
      const place = () => { const ic = $(".kd-icon"), br = $("#kdBr"); if (!ic || !br) return removeEventListener("resize", place); const y = ic.offsetTop + ic.offsetHeight + 4; br.style.top = y + "px"; hang.style.top = (y + 6) + "px"; };
      place(); addEventListener("resize", place, { passive: true }); $(".kd-icon img").addEventListener("load", place);
      $("#kdStage").addEventListener("transitionend", place);
      hang.addEventListener("pointerdown", (e) => { const r = hang.getBoundingClientRect(); sway.w += (e.clientX < r.left + r.width / 2 ? 1 : -1) * 1.6; haptic(6); wakeLoop(); });
      loop();
    }
    function loop() {
      cancelAnimationFrame(raf); raf = 0;
      let last = performance.now(), lastText = 0, lastPaint = 0;
      const step = (now) => {
        if (!alive() || !$("#kdHang")) { stop(); return; }
        if (now - lastPaint < 32) { raf = requestAnimationFrame(step); return; }
        lastPaint = now;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const acc = -18 * Math.sin(sway.a - sway.target) - 0.9 * sway.w;
        sway.w += acc * dt; sway.a += sway.w * dt;
        $("#kdHang").style.transform = `rotate(${(sway.a * 180 / Math.PI).toFixed(2)}deg)`;
        const st = $("#kdStage");
        if (S.on) { const f = 0.88 + Math.sin(now / 97) * 0.04 + Math.sin(now / 41) * 0.03 + Math.random() * 0.05; st.style.setProperty("--fl", f.toFixed(3)); st.style.setProperty("--sx", (sway.a * 40).toFixed(1) + "px"); }
        if (now - lastText > 15000) { lastText = now; const s2 = kandilState(); if (s2.on !== S.on) return render(); S = s2; const l = $("#kdLeft"); if (l) l.textContent = hoursLeft(); }
        // i fikur dhe pa lëvizje → ndal ciklin (rinis me prekje / anim)
        if (!S.on && Math.abs(sway.w) < 0.002 && Math.abs(sway.a - sway.target) < 0.002) { raf = 0; return; }
        raf = requestAnimationFrame(step);
      };
      wakeLoop = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
      raf = requestAnimationFrame(step);
      if (!onOri && window.DeviceOrientationEvent) {
        onOri = (e) => { if (e.gamma == null) return; const t = Math.max(-0.5, Math.min(0.5, -e.gamma * Math.PI / 180)); if (Math.abs(t - sway.target) > 0.01) { sway.target = t; wakeLoop(); } };
        window.addEventListener("deviceorientation", onOri);
      }
    }
    function stop() { cancelAnimationFrame(raf); if (onOri) { window.removeEventListener("deviceorientation", onOri); onOri = null; } if (wake) { try { wake.release(); } catch (e) {} wake = null; } document.body.classList.remove("kd-quiet-on"); }
    async function quiet() {
      const st = $("#kdStage"); if (!st) return;
      document.body.classList.add("kd-quiet-on"); st.classList.add("quiet"); setTimeout(() => dispatchEvent(new Event("resize")), 60);
      try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) {}
      if (st.requestFullscreen) st.requestFullscreen().catch(() => {});
      const exit = () => { document.body.classList.remove("kd-quiet-on"); st.classList.remove("quiet"); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); if (wake) { try { wake.release(); } catch (e) {} wake = null; } st.removeEventListener("click", exit); setTimeout(() => dispatchEvent(new Event("resize")), 60); };
      setTimeout(() => st.addEventListener("click", exit), 400);
      toast("Prek ekranin për t'u kthyer");
    }
    render();
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  // ---------- Sfida 40 ditëshe ----------
  const CHALLENGE = [
    "Lexo Psalmin 50 me ngadalë.", "Thuaj Lutjen e Jisuit 33 herë.", "Fal dikë në zemrën tënde.", "Lexo Ungjillin e ditës.", "Bëj një vepër të mirë në fshehtësi.",
    "Ndiz një qiri për të fjeturit e tu.", "Falënderoje Zotin për 3 gjëra.", "Lexo Psalmin 22: “Zoti është bariu im”.", "Telefono dikë që është vetëm.", "Ruaj heshtje 10 minuta para Zotit.",
    "Lexo Lumturitë (Mattheu 5:3-12).", "Kërko falje nga dikush që e ke lënduar.", "Thuaj “Ati ynë” me vëmendje të plotë.", "Jep diçka për të varfrit.", "Lexo një fjalë të Etërve dhe mendo mbi të.",
    "Bëj kryqin me vëmendje para çdo ngrënieje.", "Lutu për armikun tënd.", "Mos fol keq për askënd sot.", "Lexo Psalmin 90.", "Shko në kishë ose lutu para ikonës.",
    "Ndiz një qiri për të gjallët.", "Thuaj Lutjen e Jisuit 50 herë.", "Lexo Joani 1:1-17.", "Ndihmo dikë në shtëpi pa u kërkuar.", "Hiq telefonin një orë dhe lutu.",
    "Lexo Psalmin 102: “Beko Zotin, o shpirti im”.", "Shkruaj diçka për të cilën je mirënjohës.", "Vizito ose shkruaji një të sëmuri.", "Lexo Lutjen e Shën Efremit.", "Mos u ankoni sot për asgjë.",
    "Lexo Llukai 15 (Biri plangprishës).", "Thuaj “Lavdi Perëndisë për të gjitha” në çdo vështirësi.", "Lutu për prindërit e tu.", "Lexo Psalmin 120.", "Bëj kreshmë me dashuri sot.",
    "Lexo Mattheu 6:5-15 për lutjen.", "Thuaj Lutjen e Jisuit 100 herë.", "Bëj paqe me dikë.", "Lexo Psalmin 150 dhe lavdëro Zotin.", "Falënderoje Zotin për këto 40 ditë. Amin!",
  ];
  function viewChallenge() {
    const c = store.get("ch40", null);
    const today = dkey(new Date());
    if (!c) {
      listPane.innerHTML = `
        <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Sfida 40 ditëshe</h1></header>
        <section class="ch-hero"><div class="ch-ring" style="--p:0"><b>40</b><small>ditë</small></div>
          <h2>Një hap në ditë drejt Zotit</h2><p>Çdo ditë një detyrë e vogël shpirtërore.</p>
          <button class="btn primary" id="chStart">${icon("cross")}<span>Fillo sot</span></button></section>`;
      enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
      $("#chStart").addEventListener("click", () => { store.set("ch40", { start: today, done: {} }); viewChallenge(); });
      return;
    }
    const startD = new Date(c.start.split("-")[0], c.start.split("-")[1] - 1, c.start.split("-")[2]);
    const dayN = Math.min(40, Math.floor((new Date().setHours(0, 0, 0, 0) - startD) / 864e5) + 1);
    const doneN = Object.keys(c.done).length, isDone = !!c.done[dayN];
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Sfida 40 ditëshe</h1></header>
      <section class="ch-hero"><div class="ch-ring" style="--p:${(doneN / 40 * 100).toFixed(1)}"><b>${doneN}</b><small>nga 40</small></div>
        <p class="eyebrow">Dita ${dayN}</p><h2 class="ch-task">${esc(CHALLENGE[dayN - 1])}</h2>
        <button class="btn ${isDone ? "" : "primary"}" id="chDone" ${isDone ? "disabled" : ""}>${icon("check")}<span>${isDone ? "U krye sot ✓" : "E kreva"}</span></button></section>
      <div class="ch-grid">${CHALLENGE.map((_, i) => `<span class="${c.done[i + 1] ? "ok" : ""}${i + 1 === dayN ? " now" : ""}${i + 1 > dayN ? " future" : ""}">${i + 1}</span>`).join("")}</div>
      <p style="text-align:center"><button class="btn ghost" id="chReset">Fillo nga e para</button></p>`;
    enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
    $("#chDone").addEventListener("click", (e) => {
      c.done[dayN] = today; store.set("ch40", c);
      const r = e.currentTarget.getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top);
      toast(dayN === 40 ? "Lavdi Perëndisë! E përfundove sfidën 🎉" : "Zoti të bekoftë! 🙏");
      setTimeout(viewChallenge, 600);
    });
    $("#chReset").addEventListener("click", () => { if (confirm("Ta fillosh sfidën nga e para?")) { store.set("ch40", null); viewChallenge(); } });
  }

  // ---------- Lavdi për të gjitha: ditari i mirënjohjes ----------
  function viewGratitude() {
    const all = store.get("thanks", {}), today = dkey(new Date()), mine = all[today] || ["", "", ""];
    const days = Object.keys(all).filter((k) => all[k].some((x) => x)).sort((a, b) => new Date(b.replace(/-/g, "/")) - new Date(a.replace(/-/g, "/")));
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Lavdi për të gjitha</h1></header>
      <section class="gr-card"><p class="eyebrow">Sot falënderoj Zotin për…</p>
        ${[0, 1, 2].map((i) => `<label class="gr-row"><span>${i + 1}</span><input data-g="${i}" maxlength="90" value="${esc(mine[i] || "")}" placeholder="${["shëndetin", "familjen time", "këtë ditë të re"][i]}…" autocomplete="off"></label>`).join("")}
        <button class="btn primary" id="grSave">${icon("heart")}<span>Lavdi Perëndisë!</span></button></section>
      <p class="gr-count">${days.length ? `${days.length} ditë me mirënjohje` : ""}</p>
      <ul class="gr-list">${days.slice(0, 30).map((k) => `<li><b>${k.split("-")[2]} ${MUAJ_G[k.split("-")[1] - 1]}</b>${all[k].filter((x) => x).map((x) => `<span>✦ ${esc(x)}</span>`).join("")}</li>`).join("")}</ul>`;
    enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
    $("#grSave").addEventListener("click", (e) => {
      const v = $$("[data-g]", listPane).map((i) => i.value.trim());
      if (!v.some((x) => x)) { toast("Shkruaj të paktën një"); return; }
      all[today] = v; store.set("thanks", all);
      const r = e.currentTarget.getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top);
      toast("“Lavdi Perëndisë për të gjitha!” — Shën Joan Gojarti");
      setTimeout(viewGratitude, 700);
    });
  }

  // ---------- Sinaksari i plotë: çdo ditë e vitit, i ndarë në muaj ----------
  const sxKey = (m) => "sinaksari_" + String(m).padStart(2, "0");
  async function sxDay(m, d) {
    const mo = await load(sxKey(m));
    return mo && mo.days.find((x) => x.d === d);
  }
  function sxTitleOf(day) {
    const li = day.blocks.find((b) => b.t === "li");
    return li ? li.x.replace(/^(Më \d{1,2} të këtij muaji,\s*|Kujtimin e |Kujtojmë )/i, "").replace(/\.$/, "") : "";
  }
  async function viewSynax(mStr, dStr) {
    const now = new Date();
    if (mStr === "sot") { location.replace(`#/sinaksari/${now.getMonth() + 1}/${now.getDate()}`); return; }
    const openM = mStr ? +mStr : now.getMonth() + 1;
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Sinaksari</h1>
        <a class="icon-btn" href="#/sinaksari/sot" aria-label="Sot">${icon("calendar")}</a></header>
      <div class="sx-months">${MUAJ_G.map((n, i) => `<details class="kath"${i + 1 === openM ? " open" : ""} data-sxm="${i + 1}"><summary>${n[0].toUpperCase() + n.slice(1)}</summary><ul class="list sx-days"><li class="muted" style="padding:10px">…</li></ul></details>`).join("")}</div>`;
    const fill = async (det) => {
      const m = +det.dataset.sxm, ul = $(".sx-days", det);
      if (ul.dataset.ok) return;
      const mo = await load(sxKey(m));
      ul.dataset.ok = 1;
      ul.innerHTML = (mo ? mo.days : []).map((day) => `<li><a class="list-item${day.m === m && +dStr === day.d && +mStr === m ? "" : ""}" href="#/sinaksari/${m}/${day.d}"${+mStr === m && +dStr === day.d ? ' aria-current="true"' : ""}>
        <span class="name-d"><b>${day.d}</b><small>${MUAJ_G[m - 1].slice(0, 3)}</small></span>
        <span class="lbl">${esc(shortText(sxTitleOf(day), 90))}<span class="sub">${day.blocks.filter((b) => b.t === "li").length} kujtime · ${day.blocks.filter((b) => b.t === "h").length} jetë</span></span></a></li>`).join("");
    };
    $$("details[data-sxm]", listPane).forEach((det) => { det.addEventListener("toggle", () => det.open && fill(det)); if (det.open) fill(det); });
    enter(listPane);
    if (!dStr) { mainPane.innerHTML = emptyMain(); setMode("list"); return; }
    const m = +mStr, d = +dStr, day = await sxDay(m, d);
    if (!day) { mainPane.innerHTML = emptyMain(); setMode("list"); return; }
    const prev = new Date(2024, m - 1, d - 1), next = new Date(2024, m - 1, d + 1);   // 2024: viti me 29 shkurt
    const isToday = now.getMonth() + 1 === m && now.getDate() === d;
    mainPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/sinaksari/${m}" aria-label="Kthehu">${icon("back")}</a><h2 style="font-size:15px">Sinaksari · ${MUAJ_G[m - 1]}</h2>
        <div class="reader-tools">
          <button class="icon-btn" data-size="-1" aria-label="Shkronja më të vogla" style="font-size:14px">A−</button>
          <button class="icon-btn" data-size="1" aria-label="Shkronja më të mëdha" style="font-size:19px">A+</button>
        </div></header>
      <article class="reader sx-reader"><h2 class="reading-title">${d} ${MUAJ_G[m - 1]}${isToday ? '<span class="today-badge">SOT</span>' : ""}</h2>
        ${(() => { const hs = day.blocks.filter((b) => b.t === "h"); return hs.length > 1 ? `<details class="toc-wrap"><summary>Jetët (${hs.length})</summary><nav class="toc">${hs.map((b) => `<button data-sxh="${esc(b.x)}">${esc(b.x.slice(0, 34))}</button>`).join("")}</nav></details>` : ""; })()}
        <div class="sx-body">${day.blocks.map((b) => {
          switch (b.t) {
            case "intro": return `<p class="sx-intro">${esc(b.x)}</p>`;
            case "li": return `<p class="sx-li">${esc(b.x)}</p>`;
            case "end": return `<p class="sx-end">${esc(b.x)}</p>`;
            case "h": return `<h3 class="sx-h" data-h="${esc(b.x)}">${esc(b.x)}</h3>`;
            default: return `<p class="sx-p">${esc(b.x)}</p>`;
          }
        }).join("")}</div>
        <nav class="pager">
          <a class="btn" href="#/sinaksari/${prev.getMonth() + 1}/${prev.getDate()}">${icon("back")} ${prev.getDate()} ${MUAJ_G[prev.getMonth()].slice(0, 3)}</a>
          <a class="btn" href="#/sinaksari/${next.getMonth() + 1}/${next.getDate()}">${next.getDate()} ${MUAJ_G[next.getMonth()].slice(0, 3)} <svg style="transform:scaleX(-1)"><use href="#i-back"/></svg></a>
        </nav></article>`;
    enter(mainPane);
    mainPane.scrollTop = 0;
    $$("[data-size]", mainPane).forEach((b) => b.addEventListener("click", () => {
      readSize = Math.max(15, Math.min(34, readSize + +b.dataset.size * 2));
      store.set("readSize", readSize);
      document.documentElement.style.setProperty("--read-size", readSize + "px");
    }));
    $$("[data-sxh]", mainPane).forEach((b) => b.addEventListener("click", () => {
      const h = [...$$(".sx-h", mainPane)].find((x) => x.dataset.h === b.dataset.sxh);
      if (h) h.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    const cur = $(`.list-item[href="#/sinaksari/${m}/${d}"]`, listPane);
    if (cur && wide()) cur.scrollIntoView({ block: "center" });
    setMode("read");
  }

  // ---------- Biblioteka ortodokse: lutjet, fjalori, pyetje e përgjigje ----------
  const GLOSSARY = [
    ["Liturgjia Hyjnore", "Shërbesa kryesore e Kishës, ku kremtohet Misteri i Eukaristisë: buka dhe vera bëhen Trupi dhe Gjaku i Krishtit."],
    ["Kungimi", "Pjesëmarrja në Trupin dhe Gjakun e Krishtit gjatë Liturgjisë, pas përgatitjes me lutje, kreshmë dhe rrëfim."],
    ["Rrëfimi", "Misteri i pendimit: besimtari rrëfen mëkatet para Perëndisë, në prani të priftit, dhe merr faljen."],
    ["Pagëzimi", "Misteri i parë: me tri zhytje në ujë në emër të Atit, të Birit dhe të Shpirtit të Shenjtë, njeriu lind për jetën e re në Krishtin."],
    ["Krizmimi", "Vulosja me Miro të shenjtë menjëherë pas Pagëzimit: dhurata e Shpirtit të Shenjtë."],
    ["Ikona", "Pikturë e shenjtë e Krishtit, Hyjlindëses ose e shenjtorëve; nderimi i saj i kalon atij që paraqitet."],
    ["Ikonostasi", "Muri me ikona që ndan Altarin nga pjesa e popullit në kishë."],
    ["Hyjlindësja", "Virgjëresha Mari, Nëna e Perëndisë (Theotokos), sepse lindi Birin e Perëndisë të trupëzuar."],
    ["Tipikoni", "Rregullorja që tregon si kryhen shërbesat për çdo ditë të vitit kishtar."],
    ["Sinaksari", "Përmbledhja e jetëve dhe kujtimeve të shenjtorëve për çdo ditë të vitit."],
    ["Triodi", "Libri dhe periudha e shërbesave nga e Diela e Tagrambledhësit deri të Shtunën e Madhe."],
    ["Pentikostari", "Libri dhe periudha nga Pashka deri në të Dielën e të Gjithë Shenjtorëve."],
    ["Oktoihu", "Libri me himnet e tetë tingujve, që ndërrohen çdo javë."],
    ["Tingulli", "Secila nga tetë mënyrat muzikore të këngës bizantine."],
    ["Tropari", "Himn i shkurtër që shpreh kuptimin e së kremtes ose të shenjtorit."],
    ["Kondaku", "Himn i shkurtër poetik për të kremten e ditës."],
    ["Mbrëmësorja", "Shërbesa e mbrëmjes, me të cilën nis dita liturgjike."],
    ["Mëngjesorja", "Shërbesa e mëngjesit, me psalme, kanone dhe lavdërime."],
    ["Pasdarka", "Shërbesa pas darkës, para gjumit; e Vogël çdo ditë, e Madhe në Kreshmë."],
    ["Komboskini", "Litar me nyje për lutjen e Jisuit: “Zot Jisu Krisht, Biri i Perëndisë, mëshiromë mua mëkatarin.”"],
    ["Antidhori", "Bukë e bekuar që shpërndahet në fund të Liturgjisë."],
    ["Prosfora", "Buka që sillet në kishë për Liturgjinë."],
    ["Kollivi", "Grurë i zier që bekohet në përkujtimet e të fjeturve: shenjë e ngjalljes."],
    ["Përkujtimi", "Shërbesë lutjeje për prehjen e shpirtrave të të fjeturve."],
    ["Uji i bekuar", "Ujë i shenjtëruar me lutje, sidomos në Theofani, për bekim dhe shërim."],
    ["Kreshma", "Përmbajtja nga ushqimet dhe nga mëkati, me lutje dhe lëmoshë, për pastrimin e shpirtit."],
    ["Dhoksologjia", "Himn lavdërimi: “Lavdi Perëndisë në më të larta…”."],
    ["Shenjtori", "Njeri që me hirin e Perëndisë jetoi jetë të shenjtë dhe që Kisha e nderon."],
    ["Lipsanet", "Mbetjet e trupave të shenjtorëve, të nderuara nga besimtarët."],
    ["Nuni / Nuna", "Kumbari i Pagëzimit, që e merr përsipër edukimin e fesë së të pagëzuarit."],
  ];
  const FAQ = [
    ["Si bëhet shenja e Kryqit?", "Bashkojmë tre gishtat e parë (Triadha e Shenjtë) dhe dy të tjerët i palosim (dy natyrat e Krishtit). Prekim ballin, barkun, supin e djathtë dhe pastaj të majtin."],
    ["Si përgatitem për Kungim?", "Me lutje, me kreshmë sipas udhëzimit të priftit, me rrëfim, me paqe me të tjerët dhe pa ngrënë që nga mesnata para Liturgjisë."],
    ["Pse ndezim qiri?", "Qiriri është shenja e lutjes sonë që digjet para Perëndisë dhe e dritës së Krishtit. E ndezim për të gjallët dhe për të fjeturit."],
    ["Pse nderojmë ikonat?", "Sepse Krishti u bë njeri dhe mund të paraqitet. Nderimi i ikonës i shkon atij që është në të, jo drurit e bojës."],
    ["Kur falemi gjatë ditës?", "Në mëngjes dhe në mbrëmje, para dhe pas ngrënies, dhe gjatë gjithë ditës me lutjen e Jisuit."],
    ["Çfarë është kreshma e së mërkurës dhe së premtes?", "Të mërkurën kujtojmë tradhtinë e Krishtit, të premten Kryqëzimin e Tij; prandaj agjërojmë."],
    ["Si bëhem ortodoks?", "Fol me priftin e famullisë tënde. Pas katekizmit (mësimit të besimit) pagëzohesh dhe krizmohesh në Kishën Orthodhokse."],
    ["Çfarë është Sinaksari?", "Libri që tregon cilët shenjtorë kujtojmë çdo ditë dhe jetën e tyre."],
  ];
  async function viewLibrary2(sub) {
    const lj = await load("lutjet");
    const tab = sub || "lutjet";
    const kn = tab === "kanonet" ? await load("kanonet") : null;
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Biblioteka</h1></header>
      <div class="seg bib-seg" role="tablist">
        ${[["lutjet", "Lutjet"], ["fjalori", "Fjalori"], ["pyetje", "Pyetje"], ["pagezimi", "Pagëzimi"]].map(([k, l]) => `<a role="tab" class="seg-a" href="#/biblioteka/${k}" aria-checked="${tab === k}">${l}</a>`).join("")}
      </div>
      <div class="bib-body">${
        tab === "fjalori" ? `<dl class="gloss">${GLOSSARY.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>`
        : tab === "pyetje" ? FAQ.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")
        : tab === "pagezimi" ? baptismHtml()
        : tab === "kanonet" ? kanonetHtml(kn)
        : (lj ? lj.prayers : []).map((p) => `<details class="prayer-card"><summary>${esc(p.t)}</summary>${p.x.map((x) => `<p class="just">${esc(x)}</p>`).join("")}</details>`).join("")
      }</div>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    if (tab === "kanonet") bindKanonet(kn);
  }
  // ================= Gjeografia e Shenjtë: globi 3D + Shqipëria 3D =================
  let hartaTab = store.get("harta.tab", "globi");
  const shortSaint = (x) => { const c = String(x).split(/,|;| nga | i cili| e cila| që | – /)[0].trim(); return c.length > 46 ? c.slice(0, 44) + "…" : c; };
  function loadHartaJs() {
    if (window.FSHarta) return Promise.resolve();
    return new Promise((r) => { const sc = document.createElement("script"); sc.src = "js/harta.js?v=" + APP_VERSION; sc.onload = r; sc.onerror = r; document.head.appendChild(sc); });
  }
  async function viewHarta(tab) {
    if (tab === "globi" || tab === "shqiperia") { hartaTab = tab; store.set("harta.tab", tab); }
    const [H] = await Promise.all([load("harta"), loadHartaJs()]);
    const head = `<header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Gjeografia e Shenjtë</h1></header>`;
    if (!H || !window.FSHarta) { listPane.innerHTML = head + `<p class="muted" style="padding:16px">Harta nuk u hap.</p>`; enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list"); return; }
    const now = new Date(), key = `${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const today = H.days[key] || [];
    const P = Object.fromEntries(H.places.map((p) => [p.id, p]));
    const A = H.al;
    const twoPaneGuess = () => window.innerWidth >= 640;
    const pinOf = (p) => {
      const hot = today.filter((t) => t[1] === p.id), al = /Shqipëri/.test(p.r), c = (hot[0] && hot[0][2]) || p.c;
      return { id: p.id, lat: p.lat, lon: p.lon, hot: hot.length > 0, al, pr: hot.length ? 0 : al ? 2 : 3,
        label: esc(hot.length ? shortSaint(hot[0][0]) : (p.s[0] || p.n)) };
    };
    // shenjtorët vendas: secili pikë më vete; kur janë disa në një vend, rreth qytetit
    const ALB = H.alb || [], albAt = {};
    ALB.forEach((a) => { (albAt[a[2]] = albAt[a[2]] || []).push(a); });
    const saintPins = (inside) => Object.entries(albAt).flatMap(([pid, list]) => {
      const p = P[pid]; if (!p || (inside && !inside(p))) return [];
      return list.map((a, i) => {
        const n = list.length, r = n > 1 ? 0.011 : 0, ang = i / n * 2 * Math.PI, hot = a[0] === key;
        return { id: pid, lat: p.lat + r * Math.cos(ang), lon: p.lon + r * Math.sin(ang) / Math.cos(p.lat * Math.PI / 180), hot, al: true, pr: hot ? 0 : 1, label: esc(a[4] || shortSaint(a[1])) };
      });
    });
    const placePins = (list) => list.filter((p) => !(albAt[p.id] && (/Shqipëri/.test(p.r) || p.s.every((x) => albAt[p.id].some((a) => a[4] === x))))).map(pinOf);
    const todayChips = [...new Map(today.map((t) => [t[1], t])).values()];
    listPane.innerHTML = `${head}
      <div class="seg hm-seg" role="tablist"><button data-ht="globi" aria-checked="${hartaTab === "globi"}">🌍 Globi</button><button data-ht="shqiperia" aria-checked="${hartaTab === "shqiperia"}">⛰️ Shqipëria 3D</button></div>
      ${hartaTab === "globi"
        ? `<div class="hm-today">${todayChips.length
            ? `<span class="hm-today-h">Sot në hartë</span>` + todayChips.map((t) => `<button class="chip" data-fly="${t[1]}">☦ ${esc(shortSaint(t[0]))}<small>${esc(P[t[1]].n)}</small></button>`).join("")
            : `<span class="hm-today-h">Shenjtorët e sotëm s'kanë vend të shënuar · prek një pikë në glob</span>`}</div>`
        : `<form class="search hm-search" id="hmSearch" autocomplete="off"><span>${icon("search")}</span><input id="hmQ" type="search" placeholder="Kërko qytet ose fshat…" enterkeyhint="search"></form><ul class="hm-res" id="hmRes" hidden></ul>`}
      <div id="hmSlot"></div>
      ${(H.alb || []).length ? `<details class="hm-alb" open><summary>🇦🇱 Shenjtorët shqiptarë · ${H.alb.length}</summary><ul class="hm-ul">${H.alb.map((a, i) => `<li><button type="button" data-alb="${i}"><b>${+a[0].slice(3)} ${MUAJ_G[+a[0].slice(0, 2) - 1]}</b> ${esc(a[1])}<small>${esc((P[a[2]] || {}).n || "")}${a[3] ? " · shek. " + esc(a[3]) : ""}</small></button></li>`).join("")}</ul></details>` : ""}`;
    const stageHtml = `<div class="hm-stage" id="hmStage"><div class="hm-map" id="hmMap"></div>
        <button class="icon-btn hm-fs hm-ui" aria-label="Ekran i plotë">⤢</button>
        ${hartaTab === "shqiperia" ? `<button class="icon-btn hm-home hm-ui" aria-label="E gjithë Shqipëria">⌂</button><p class="hm-tip hm-ui">Një gisht: lëviz · dy gishta: zmadho, rrotullo, anëso</p>` : `<p class="hm-tip hm-ui">Rrotulloje me gisht · zmadhoje me dy gishta</p>`}
      </div>
      <p class="hm-credit">${esc(H.credits)}</p>`;
    enter(listPane); mainPane.innerHTML = ""; setMode("list");
    // Fold i hapur / tablet: harta zë panelin e madh djathtas; telefoni: poshtë butonave
    const twoPane = mainPane.offsetWidth > 0;
    if (twoPane) { mainPane.innerHTML = `<div class="hm-main">${stageHtml}</div>`; listPane.querySelector("#hmSlot").innerHTML = `<p class="hm-side-note">Prek një pikë në hartë për shenjtorët, shekullin dhe një fjalë të Etërve nga ai vend.</p>`; }
    else listPane.querySelector("#hmSlot").outerHTML = stageHtml;
    $$("[data-ht]", listPane).forEach((b) => b.addEventListener("click", () => { haptic(8); location.hash = "#/harta/" + b.dataset.ht; }));
    const stage = $("#hmStage"), host = $("#hmMap");
    $(".hm-fs", stage).addEventListener("click", (e) => { const on = stage.classList.toggle("full"); e.currentTarget.textContent = on ? "✕" : "⤢"; document.body.classList.toggle("bible-full", on); haptic(10); });
    setTimeout(() => $(".hm-tip", stage)?.classList.add("gone"), 4500);
    const pick = (p) => p.kind ? churchCard(p) : hartaCard(H, P[p.id], today);
    let flyAlb = null;
    $$("[data-alb]", listPane).forEach((b) => b.addEventListener("click", () => { const a = H.alb[+b.dataset.alb], p = P[a[2]]; if (!p) return; haptic(8); flyAlb && flyAlb(p); setTimeout(() => hartaCard(H, p, today), 900); }));
    if (hartaTab === "globi") {
      const g = FSHarta.globe(host, { base: "img/harta/toka.jpg", regionImg: "img/harta/toka_rajoni.jpg", region: H.globe.region, borders: H.globe.borders, goldBorder: A.border, lat: 39, lon: 24, dist: 2.7, onPick: pick });
      g.setPins(placePins(H.places).concat(saintPins()));
      $$("[data-fly]", listPane).forEach((b) => b.addEventListener("click", () => { const p = P[b.dataset.fly]; g.flyTo(p.lat, p.lon, 1.3); haptic(8); }));
      flyAlb = (p) => g.flyTo(p.lat, p.lon, 1.15);
      if (todayChips[0]) setTimeout(() => { const p = P[todayChips[0][1]]; if (host.isConnected) g.flyTo(p.lat, p.lon, 1.6); }, 2200);
    } else {
      const inAl = (p) => p.lat > A.lat0 && p.lat < A.lat1 && p.lon > A.lon0 && p.lon < A.lon1;
      const sacred = placePins(H.places.filter(inAl)).concat(saintPins(inAl));
      const m = await FSHarta.albania(host, { al: A, relief: "img/harta/relievi.png", sat: "img/harta/shqiperia.jpg", sacred, onPick: pick,
        cathedrals: H.cathedrals || [], churches: H.churches || [], detail: true });
      flyAlb = (p) => { if (p.lat > A.lat0 && p.lat < A.lat1 && p.lon > A.lon0 && p.lon < A.lon1) m.flyTo(p.lat, p.lon, 14); };
      $(".hm-home", stage).addEventListener("click", () => { m.reset(); haptic(8); });
      const q = $("#hmQ"), res = $("#hmRes"), towns = A.towns;
      q.addEventListener("input", () => {
        const t = nrm(q.value.trim());
        if (t.length < 2) { res.hidden = true; return; }
        const a = towns.filter((x) => nrm(x[0]).startsWith(t)), b = towns.filter((x) => !nrm(x[0]).startsWith(t) && nrm(x[0]).includes(t));
        const allCh = m.cathedrals.concat(m.churches), ch = allCh.map((c, i) => [c, i]).filter(([c]) => nrm(c.n + " " + c.v).includes(t)).slice(0, 4);
        res.innerHTML = ch.map(([c, i]) => `<li><button type="button" data-ch="${i}">☦ ${esc(c.n)}<small>${esc(c.v)}</small></button></li>`).join("") + a.concat(b).slice(0, 8 - ch.length).map((x) => `<li><button type="button" data-town="${esc(x[0])}">${esc(x[0])}<small>${x[3] <= 2 ? "qytet" : "fshat"}</small></button></li>`).join("") || `<li class="muted">S'u gjet asnjë vendbanim</li>`;
        res.hidden = false;
        $$("[data-ch]", res).forEach((btn) => btn.addEventListener("click", () => { const c = allCh[+btn.dataset.ch]; m.flyTo(c.lat, c.lon, c.kind === "cathedral" ? 2.2 : 3); res.hidden = true; q.value = c.n; q.blur(); haptic(8); setTimeout(() => churchCard(c), 1300); }));
        $$("[data-town]", res).forEach((btn) => btn.addEventListener("click", () => { m.find(btn.dataset.town); res.hidden = true; q.value = btn.dataset.town; q.blur(); haptic(8); }));
      });
      $("#hmSearch").addEventListener("submit", (e) => { e.preventDefault(); $("[data-town]", res)?.click(); });
    }
  }
  function churchCard(c) {
    $(".hm-sheet")?.remove();
    const el = document.createElement("div");
    el.className = "sheet hm-sheet";
    const where = c.v === "Voskopojë" ? "Voskopojës" : c.v === "Vithkuq" ? "Vithkuqit" : esc(c.v);
    el.innerHTML = `<div class="sheet-card hm-card" role="dialog" aria-modal="true" aria-label="${esc(c.n)}">
      <button class="icon-btn hm-x" type="button" aria-label="Mbyll">✕</button>
      <p class="hm-reg">${esc(c.v)}${c.y ? " · " + esc(c.y) : ""}</p>
      <h2>☦ ${esc(c.n)}</h2>
      <p class="hm-d">${c.kind === "cathedral" ? "Maketë 3D e stilizuar, e vendosur në vendin e vërtetë të kishës (jo kopje e saktë e arkitekturës)." : `Një nga kishat e ${where}, qendër e madhe e Orthodhoksisë shqiptare në shek. XVII–XVIII.`}</p>
      <p class="hm-d"><small>${c.lat.toFixed(5)}, ${c.lon.toFixed(5)} · © OpenStreetMap</small></p>
    </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    $(".hm-x", el).addEventListener("click", close);
    el.addEventListener("click", (e) => { if (e.target === el) close(); });
    haptic(10);
  }
  async function hartaCard(H, p, today) {
    if (!p) return;
    $(".hm-sheet")?.remove();
    const now = new Date(), mm = pad2(now.getMonth() + 1), dd = pad2(now.getDate());
    const hot = today.filter((t) => t[1] === p.id);
    const fathers = Object.entries(H.fathers).filter(([, f]) => f.p.includes(p.id));
    let quote = null;
    if (fathers.length) {
      const et = await load("eterit");
      const qs = ((et && et.quotes) || []).filter((x) => fathers.some(([a]) => a === x.a));
      quote = qs.length ? qs[Math.floor(Math.random() * qs.length)] : null;
    }
    let ic = null;
    if (hot.length) {
      try {
        const words = nrm(hot[0][0]).split(/\W+/).filter((w) => w.length >= 5);
        ic = (await loadDayMonth(mm)).find((im) => im.date === `${mm}-${dd}` && words.some((w) => nrm(im.shenjtori || im.title || "").includes(w))) || null;
      } catch (e) { /* pa internet */ }
    }
    const dlink = (k) => `#/sinaksari/${+k.slice(0, 2)}/${+k.slice(3)}`;
    const fc = quote && H.fathers[quote.a] && H.fathers[quote.a].c;
    const el = document.createElement("div");
    el.className = "sheet hm-sheet";
    el.innerHTML = `<div class="sheet-card hm-card" role="dialog" aria-modal="true" aria-label="${esc(p.n)}">
      <button class="icon-btn hm-x" type="button" aria-label="Mbyll">✕</button>
      ${ic ? `<div class="hm-icon" data-ic="${esc(ic.file)}"></div>` : ""}
      <p class="hm-reg">${esc(p.r)}${p.c ? " · shek. " + esc(p.c) : ""}</p>
      <h2>${esc(p.n)}</h2>
      <p class="hm-d">${esc(p.d)}</p>
      ${hot.length ? `<h3>☦ Sot në Sinaksar</h3><ul class="hm-ul">${hot.map((t) => `<li><a href="${dlink(mm + "-" + dd)}">${esc(t[0])}</a>${t[2] ? ` <small>shek. ${esc(t[2])}</small>` : ""}</li>`).join("")}</ul>` : ""}
      ${p.s.length ? `<h3>Shenjtorët e vendit</h3><p class="hm-saints">${p.s.map((x) => `<span>${esc(x)}</span>`).join("")}</p>` : ""}
      ${quote ? `<h3>Fjalë e Etërve</h3><blockquote class="hm-q">“${esc(quote.t)}”<cite>— ${esc(quote.a)}${fc ? ", shek. " + esc(fc) : ""}</cite></blockquote>` : ""}
      ${p.y && p.y.length ? `<details class="hm-year"><summary>Kujtimet gjatë vitit · ${p.y.length}</summary><ul class="hm-ul">${p.y.map((y) => `<li><a href="${dlink(y[0])}"><b>${+y[0].slice(3)} ${MUAJ_G[+y[0].slice(0, 2) - 1]}</b> ${esc(y[1])}</a>${y[2] ? ` <small>shek. ${esc(y[2])}</small>` : ""}</li>`).join("")}</ul></details>` : ""}
      ${/Shqipëri|Ohrit|Jon/.test(p.r) && hartaTab === "globi" ? `<a class="btn primary hm-go3d" href="#/harta/shqiperia">⛰️ Shihe në Shqipërinë 3D</a>` : ""}
    </div>`;
    document.body.appendChild(el);
    hydrateIcons(el);
    requestAnimationFrame(() => el.classList.add("open"));
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    $(".hm-x", el).addEventListener("click", close);
    el.addEventListener("click", (e) => { if (e.target === el) close(); });
    haptic(10);
  }

  async function viewKanonet() {
    const kn = await load("kanonet");
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Kanonet e Kishës</h1></header>
      ${kanonetHtml(kn)}`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    bindKanonet(kn);
  }
  // ================= Kanonet e Kishës: seksione, kërkim, karta të mbyllura, lexues në ekran të plotë =================
  function kanonetHtml(kn) {
    if (!kn) return `<p class="muted">Kanonet nuk u ngarkuan.</p>`;
    const cur = store.get("kn.sec", kn.sections[0].id);
    return `<div class="kn-ui">
      <div class="kn-tabs" role="tablist">${kn.sections.map((x) => `<button role="tab" class="kn-tab" data-sec="${esc(x.id)}" aria-selected="${x.id === cur}">${esc(x.short || x.title)}<small>${x.items.length}</small></button>`).join("")}</div>
      <div class="kn-tools">
        <label class="kn-search">${icon("search")}<input id="knQ" type="search" placeholder="Kërko në kanone… (p.sh. agjërim, martesë, Pashkë)" autocomplete="off"></label>
        <button class="kn-only" id="knOnly" aria-pressed="false">☦ Me interpretim</button>
      </div>
      <div id="knHead"></div>
      <div class="kn-list" id="knList"></div>
      <details class="kn-about"><summary>ℹ Burimet</summary><p>${esc(kn.burimi)}</p>${kn.sections.filter((x) => x.pidNote).map((x) => `<p>${esc(x.pidNote)}</p>`).join("")}</details>
    </div>`;
  }
  function bindKanonet(kn) {
    if (!kn || !$("#knList")) return;
    let secId = store.get("kn.sec", kn.sections[0].id), only = false, q = "";
    const norm = (t) => nrm(String(t || ""));
    const draw = () => {
      const sec = kn.sections.find((x) => x.id === secId) || kn.sections[0];
      $$(".kn-tab", listPane).forEach((t) => t.setAttribute("aria-selected", t.dataset.sec === sec.id));
      const done = sec.items.filter((c) => c.pid).length;
      $("#knHead").innerHTML = `<div class="kn-sechead"><h2>${esc(sec.title)}</h2><p>${esc(sec.sub || "")}${sec.pidNote ? ` · ☦ ${done}/${sec.items.length} me interpretim` : ""}</p></div>`;
      const nq = norm(q);
      const list = sec.items.map((c, i) => ({ c, i })).filter(({ c }) => (!only || c.pid) && (!nq || norm(c.x + " " + (c.pid ? (c.pid.interp || []).join(" ") : "")).includes(nq)));
      $("#knList").innerHTML = list.length ? list.map(({ c, i }) => `<button class="kn-card" data-i="${i}" style="--i:${Math.min(i, 20)}">
          <span class="kn-num">${esc(c.n)}</span>
          <span class="kn-prev">${esc(c.x.length > 140 ? c.x.slice(0, 137).replace(/\s+\S*$/, "") + "…" : c.x)}</span>
          ${c.pid ? `<span class="kn-badge">☦</span>` : ""}</button>`).join("")
        : `<p class="muted kn-none">Asnjë kanon për “${esc(q)}”.</p>`;
      $$(".kn-card", listPane).forEach((b) => b.addEventListener("click", () => { haptic(10); kanonReader(sec, +b.dataset.i); }));
    };
    $$(".kn-tab", listPane).forEach((t) => t.addEventListener("click", () => { secId = t.dataset.sec; store.set("kn.sec", secId); haptic(8); draw(); }));
    $("#knOnly").addEventListener("click", (e) => { only = !only; e.currentTarget.setAttribute("aria-pressed", only); haptic(8); draw(); });
    let tm;
    $("#knQ").addEventListener("input", (e) => { clearTimeout(tm); tm = setTimeout(() => { q = e.target.value.trim(); draw(); }, 200); });
    draw();
  }
  // lexuesi në ekran të plotë: kanoni, interpretimi, përputhja, shënimet; ‹ › për kanonin tjetër
  function kanonReader(sec, start) {
    let i = start;
    const el = document.createElement("div");
    el.className = "knr";
    document.body.appendChild(el);
    const render = (dir) => {
      const c = sec.items[i];
      const part = (title, arr, open) => arr && arr.length ? `<details class="knr-part"${open ? " open" : ""}><summary>${title}</summary>${arr.map((x) => `<p>${esc(x)}</p>`).join("")}</details>` : "";
      el.innerHTML = `<div class="knr-card${dir ? " " + dir : ""}">
          <header class="knr-top"><button class="icon-btn knr-x" aria-label="Mbyll">${icon("close")}</button>
            <div><small>${esc(sec.short || sec.title)}</small><b>Kanoni ${esc(c.n)}</b></div><span class="knr-pos">${i + 1}/${sec.items.length}</span></header>
          <div class="knr-body">
            <p class="knr-text">${esc(c.x)}</p>
            ${c.pid ? part("☦ Interpretimi i Shën Nikodimit (Pidalioni)", c.pid.interp, true) + part("Përputhja me kanonet e tjera", c.pid.symf) + part("Shënim i Shën Nikodimit", c.pid.shen) : ""}
            ${c.en ? part("Origjinali (anglisht)", [c.en]) : ""}
          </div>
          <footer class="knr-nav"><button class="btn" id="knrPrev" ${i === 0 ? "disabled" : ""}>${icon("back")}<span>Para</span></button>
            <button class="btn" id="knrNext" ${i === sec.items.length - 1 ? "disabled" : ""}><span>Pas</span><svg class="ic-fwd"><use href="#i-back"/></svg></button></footer>
        </div>`;
      $(".knr-x", el).addEventListener("click", close);
      $("#knrPrev", el).addEventListener("click", () => go(-1));
      $("#knrNext", el).addEventListener("click", () => go(1));
    };
    const go = (d) => { const n = i + d; if (n < 0 || n >= sec.items.length) return; i = n; haptic(10); render(d > 0 ? "fwd" : "bwd"); };
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    let x0 = null, y0 = null;
    el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    }, { passive: true });
    render("");
    requestAnimationFrame(() => el.classList.add("open"));
  }
  function baptismHtml() {
    return `<section class="bap-hero"><div class="bap-icon">${icon("cross")}</div>
        <h2>Eja në Pagëzimin Ortodoks</h2>
        <p>“Kush të besojë dhe të pagëzohet, do të shpëtojë.”<small>Marku 16:16</small></p></section>
      <div class="bap-steps">
        <div><b>1</b><span><strong>Fol me një prift</strong>Shko në kishën më të afërt ortodokse dhe thuaj se dëshiron të pagëzohesh.</span></div>
        <div><b>2</b><span><strong>Mëso besimin</strong>Prifti të udhëheq në katekizëm: Simboli i Besimit, lutjet, jeta në Kishë.</span></div>
        <div><b>3</b><span><strong>Zgjidh nunin ose nunën</strong>Një i krishterë ortodoks që do të të ndihmojë në rrugën e besimit.</span></div>
        <div><b>4</b><span><strong>Pagëzimi dhe Krizmimi</strong>Lind për jetën e re në Krishtin dhe merr dhuratën e Shpirtit të Shenjtë.</span></div>
        <div><b>5</b><span><strong>Kungimi i parë</strong>Bashkohesh me Krishtin në Liturgjinë Hyjnore.</span></div>
      </div>
      <p class="bap-verse">“Shkoni, pra, e mësoni gjithë kombet, edhe i pagëzoni në emrin e Atit e të Birit dhe të Frymës së Shenjtë.”<small>Mattheu 28:19</small></p>
      <div class="bap-go"><a class="btn primary" href="#/biblioteka/lutjet">${icon("book")}<span>Lutjet e para</span></a>
        <a class="btn" href="#/kisha">${icon("church")}<span>Kisha</span></a></div>`;
  }

  // ---------- Ditari i Kungimit ----------
  const CLERGY = ["Prift (At)", "Episkop", "Mitropolit", "Kryepiskopi Joan"];
  function viewCommunion() {
    if (unbaptized()) {
      const [t, r] = INVITE[3];
      listPane.innerHTML = `
        <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Kungimi Hyjnor</h1></header>
        <section class="kg-hero"><div class="kg-cup">${icon("cross")}</div><h2>Hapi i parë: Pagëzimi</h2>
          <p>Kungimi Hyjnor u jepet atyre që janë pagëzuar në Kishën Orthodhokse. Krishti të pret: Pagëzimi është dera.</p></section>
        <section class="kg-plan"><p class="kg-verse">“${esc(t)}”<small>${esc(r)}</small></p>
          <a class="btn primary" href="#/biblioteka/pagezimi">${icon("cross")}<span>Si të pagëzohem</span></a> <button class="btn bap-done-btn" data-baptized>${icon("check")}<span>U pagëzova ☦</span></button></section>
        <section class="kg-plan"><p>Ndërkohë eja në Liturgjinë Hyjnore të së Dielës: dëgjo Ungjillin, lutu me besimtarët dhe merr nafurën e bekuar në fund. Fol me priftin e famullisë: ai do të të udhëheqë me dashuri.</p></section>`;
      enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
      return;
    }
    const list = store.get("kungimi", []);
    const today = new Date(), iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const last = list[0], todayDone = last && last.date === iso(today);
    const ago = last ? Math.round((new Date(iso(today)) - new Date(last.date)) / 864e5) : null;
    const lastPlace = store.get("kungimi.last", {});
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Ditari i Kungimit</h1></header>
      <section class="kg-hero${todayDone ? " done" : ""}">
        <div class="kg-cup">${icon("cross")}</div>
        <h2>${todayDone ? "U kungove sot ✓" : "A je kunguar sot?"}</h2>
        <p>${last ? (ago === 0 ? "Sot" : ago === 1 ? "Dje" : `${ago} ditë më parë`) + " · " + list.length + " kungime gjithsej" : "Ende asnjë kungim i shënuar"}</p>
      </section>
      ${canonUntil() ? (() => { const [t, r] = COMFORT[new Date().getDate() % COMFORT.length]; const u = canonUntil(); return `<section class="kg-canon"><p class="eyebrow">Koha e kanonit</p>
        <h3>Mund të kungohesh më ${esc(fmtIso(u))}</h3><p class="kg-left">edhe <b>${daysTo(u)}</b> ditë</p>
        <p class="kg-verse">“${esc(t)}”<small>${esc(refTxt(r))}</small></p>
        <div class="row"><a class="btn" href="#/psaltiri/50">${icon("book")}<span>Psalmi 50</span></a><a class="btn" href="#/rrefimi">${icon("pen")}<span>Rrëfimi</span></a></div></section>`; })() : ""}
      <div class="kg-books">
        <a class="kg-book" href="#/kungata/0/0">${icon("book")}<span><b>Para Kungimit</b><small>Kanoni, Psalmet dhe Uratat</small></span></a>
        <a class="kg-book" href="#/kungata/1/0">${icon("heart")}<span><b>Pas Kungimit</b><small>Uratat e falënderimit</small></span></a>
      </div>
      ${(() => {
        const plan = store.get("kungimi.plan", "");
        const tm = new Date(); tm.setDate(tm.getDate() + 1);
        const tf = Fast.info(tm), tLit = litDay(tf, null);
        const fmt = (s) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MUAJ_G[m - 1]}`; };
        if (plan && plan >= iso(today)) return `<section class="kg-plan"><p class="eyebrow">Do të kungohesh më ${fmt(plan)}</p>
          <ul class="kg-check">
            <li>${icon("check")} Kreshmë dhe vetëpërmbajtje në ditët para (sipas këshillës së atit shpirtëror)</li>
            <li>${icon("check")} Rrëfimi, nëse ke nevojë</li>
            <li>${icon("check")} Paqe me të gjithë: fal dhe kërko falje</li>
            <li>${icon("check")} Mbrëmjen para: <a href="#/kungata/0/0">Shërbesa para Kungimit</a></li>
            <li>${icon("check")} Pas mesnate asgjë për të ngrënë a për të pirë</li>
          </ul><p class="muted">Do të marrësh kujtesa në telefon.</p><button class="btn ghost" id="kgPlanX">Anulo planin</button></section>`;
        return `<section class="kg-plan">${tLit ? `<p class="eyebrow">Nesër ka Liturgji Hyjnore</p>` : `<p class="eyebrow">Planifiko Kungimin</p>`}
          <div class="kg-plan-row"><input type="date" id="kgPlanD" min="${iso(today)}" value="${iso(tLit ? tm : today)}"><button class="btn primary" id="kgPlanGo">${icon("bell")}<span>Do të kungohem</span></button></div></section>`;
      })()}
      <form class="kg-form" id="kgForm">
        <label>Data<input type="date" id="kgDate" value="${iso(today)}" max="${iso(today)}" required></label>
        <label>Nga kush<select id="kgWho">${CLERGY.map((c) => `<option${lastPlace.who === c ? " selected" : ""}>${c}</option>`).join("")}</select></label>
        <label>Emri i klerikut<input id="kgName" maxlength="60" value="${esc(lastPlace.name || "")}" placeholder="p.sh. At Joani" autocomplete="off"></label>
        <label>Kisha<input id="kgChurch" maxlength="80" value="${esc(lastPlace.church || "")}" placeholder="p.sh. Kisha e Shën Gjergjit" autocomplete="off" required></label>
        <label>Fshati ose qyteti<input id="kgPlace" maxlength="60" value="${esc(lastPlace.place || "")}" placeholder="p.sh. Korçë, Voskopojë" autocomplete="off" required></label>
        <button class="btn primary" type="submit">${icon("check")}<span>U kungova</span></button>
      </form>
      ${list.length ? `<h3 class="persons-h">${icon("calendar")} Kungimet e mia <small>${list.length}</small></h3>
      <ul class="kg-list">${list.map((k, i) => `<li><span class="name-d"><b>${k.date.split("-")[2].replace(/^0/, "")}</b><small>${MUAJ_G[+k.date.split("-")[1] - 1].slice(0, 3)} ${k.date.slice(2, 4)}</small></span>
        <span class="lbl"><b>${esc(k.church)}</b><span class="sub">${esc(k.place)} · ${esc(k.who)}${k.name ? " " + esc(k.name) : ""}</span></span>
        <button class="icon-btn small" data-kdel="${i}" aria-label="Fshi">${icon("close")}</button></li>`).join("")}</ul>` : ""}`;
    enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
    $("#kgForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const k = { date: $("#kgDate").value || iso(today), who: $("#kgWho").value, name: $("#kgName").value.trim(), church: $("#kgChurch").value.trim(), place: $("#kgPlace").value.trim() };
      if (!k.church || !k.place) return;
      const l = store.get("kungimi", []);
      l.push(k); l.sort((a, b) => (a.date < b.date ? 1 : -1));
      store.set("kungimi", l.slice(0, 1000));
      store.set("kungimi.last", { who: k.who, name: k.name, church: k.church, place: k.place });
      const r = e.submitter ? e.submitter.getBoundingClientRect() : null;
      goldBurst(r ? r.left + r.width / 2 : null, r ? r.top : null);
      if (store.get("kungimi.plan", "") <= k.date) store.set("kungimi.plan", "");
      blessing();
    });
    $("#kgPlanGo")?.addEventListener("click", () => {
      const v = $("#kgPlanD").value; if (!v) return;
      store.set("kungimi.plan", v); syncCandles(); toast("🔔 Do të të kujtojmë të përgatitesh"); viewCommunion();
    });
    $("#kgPlanX")?.addEventListener("click", () => { store.set("kungimi.plan", ""); syncCandles(); viewCommunion(); });
    // urimi pas Kungimit
    function blessing() {
      const n = userName();
      const el = document.createElement("div");
      el.className = "sheet update-sheet kg-bless";
      el.innerHTML = `<div class="sheet-card update-card" role="dialog" aria-modal="true">
          <div class="upd-icon">${icon("cross")}</div>
          <h2>Të lumtë${n ? ", " + esc(n) : ""}!</h2>
          <p class="kg-wish">Me shëndet shpirti e trupi! Trupi dhe Gjaku i Krishtit qofshin për ndjesë mëkatesh dhe për jetën e përjetshme.</p>
          <p class="kg-verse">“Unë jam buka e gjallë që zbriti nga qielli.”<small>Joani 6:51</small></p>
          <a class="btn primary upd-go" href="#/kungata/1/0">${icon("heart")}<span>Uratat pas Kungimit</span></a>
          <button class="btn upd-later" type="button">Më vonë</button></div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add("open"));
      goldBurst();
      const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); viewCommunion(); };
      $(".upd-later", el).addEventListener("click", close);
      $(".upd-go", el).addEventListener("click", () => setTimeout(() => el.remove(), 300));
    }
    $$("[data-kdel]", listPane).forEach((b) => b.addEventListener("click", () => {
      if (!confirm("Ta fshish këtë kungim?")) return;
      const l = store.get("kungimi", []); l.splice(+b.dataset.kdel, 1); store.set("kungimi", l); viewCommunion();
    }));
  }

  // ---------- Pas Liturgjisë: “A u kungove?” dhe “A e bëre Shërbesën pas Kungimit?” ----------
  const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function askCommunion(force) {
    const today = isoDay(new Date());
    if (!force && store.get("kg.asked", "") === today) return;
    if ($(".kg-ask")) return;
    store.set("kg.asked", today);
    const done = (store.get("kungimi", [])[0] || {}).date === today;
    const n = userName();
    const el = document.createElement("div");
    el.className = "sheet update-sheet kg-ask";
    const card = (inner) => `<div class="sheet-card update-card glass" role="dialog" aria-modal="true"><div class="upd-icon">${icon("cross")}</div>${inner}</div>`;
    const step2 = () => {
      el.innerHTML = card(`<h2>A e lexove Shërbesën pas Kungimit?</h2>
        <p class="kg-wish">Uratat e falënderimit pas Kungatës së Shenjtë.</p>
        <button class="btn primary upd-go" data-a="po">${icon("check")}<span>Po, e lexova</span></button>
        <button class="btn upd-go" data-a="hap">${icon("book")}<span>Jo, hape tani</span></button>`);
      bind();
    };
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    const bind = () => $$("[data-a]", el).forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.a;
      haptic(a === "jo" ? 12 : [20, 40, 20], a !== "jo");
      if (a === "po1") {
        const last = store.get("kungimi.last", {});
        if (!done && last.church) {
          const l = store.get("kungimi", []);
          l.unshift({ date: today, who: last.who || CLERGY[0], name: last.name || "", church: last.church, place: last.place || "" });
          l.sort((x, y) => (x.date < y.date ? 1 : -1)); store.set("kungimi", l.slice(0, 1000));
          if (store.get("kungimi.plan", "") <= today) store.set("kungimi.plan", "");
          goldBurst(); toast(`Të lumtë${n ? ", " + n : ""}! Me shëndet shpirti e trupi ☦`);
          step2();
        } else if (!done) { close(); location.hash = "#/kungimi"; toast("Plotëso kishën dhe shtyp “U kungova”"); }
        else step2();
      } else if (a === "jo") close();
      else if (a === "po") { store.set("kg.thanks." + today, true); close(); toast("Lavdi Perëndisë për të gjitha! 🙏"); }
      else if (a === "hap") { close(); location.hash = "#/kungata/1/0"; }
    }));
    el.innerHTML = card(`<h2>A u kungove sot${n ? ", " + esc(n) : ""}?</h2>
      <p class="kg-wish">Sot ishte Liturgjia Hyjnore.</p>
      <button class="btn primary upd-go" data-a="po1">${icon("check")}<span>Po, u kungova ☦</span></button>
      <button class="btn upd-later" data-a="jo">Jo sot</button>`);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    bind();
  }
  // kur hapet aplikacioni pas Liturgjisë (11:00–22:00 në ditë Liturgjie) pyet një herë në ditë
  function maybeAskCommunion() {
    const d = new Date(), h = d.getHours();
    if (h < 11 || h >= 22 || unbaptized() || canonUntil()) return;
    const f = Fast.info(d);
    if (!(litDay(f, null) || d.getDay() === 0)) return;
    if (store.get("kg.thanks." + isoDay(d), false)) return;
    askCommunion(false);
  }

  // ---------- Thesari i Fjalëve të Etërve: tema, kërkim, “Zbulo një Fjalë” ----------
  const THEMES = [
    ["Përulësia", /përul|krenari|lavdi(a|ë|në)? e kot|vetëqort|egoiz|mburr|lartësohe/i],
    ["Lutja", /\blut|psal|thirrj|emrin e|mëshiro-?më/i],
    ["Heshtja", /hesht|gjuh|qetës|fjalë(t)? e kota|fol/i],
    ["Dashuria", /dashuri|\bdo\b.*vëlla|armiq|i afërm|vëlla/i],
    ["Durimi", /durim|duro|sprov|tundim|pikëllim|vuajtj|sëmund|shtrëngim/i],
    ["Pendesa", /pendim|pendo|rrëfe|lot(ët|ë)? |mëkat/i],
    ["Falja", /\bfal|mëri|inat|hakmarr/i],
    ["Familja", /familj|fëmij|prind|kishë e vogël|shkoll/i],
    ["Kreshma", /kreshm|agjër|bark/i],
    ["Mëshira", /mëshir|lëmosh|të varfr|nevojtar/i],
  ];
  let thTheme = "", thQuery = "";
  async function viewFathers() {
    const et = await load("eterit");
    const all = et.quotes.map((q, i) => Object.assign({ i }, q));
    const render = () => {
      const q = nrm(thQuery.trim());
      const re = thTheme ? THEMES.find((t) => t[0] === thTheme)[1] : null;
      const list = all.filter((x) => (!re || re.test(x.t)) && (!q || nrm(x.t + " " + x.a).includes(q)));
      $("#thCount").textContent = `${list.length} fjalë`;
      const items = {};
      list.slice(0, 120).forEach((x) => (items["et:" + x.i] = { kind: "eterit", id: "et:" + x.i, text: x.t, ref: x.a, link: "#/eterit" }));
      $("#thList").innerHTML = Object.values(items).map((it) => card(it, "", false)).join("") + (list.length > 120 ? `<p class="muted" style="text-align:center">Ngushto kërkimin për të parë më shumë…</p>` : "");
      bindCards($("#thList"), items);
    };
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Thesari i Etërve</h1></header>
      <button class="scroll-roll" id="thRoll" aria-label="Zbulo një Fjalë"><span class="sr-rod"></span><span class="sr-paper"><span class="sr-text"></span><span class="sr-author"></span></span><span class="sr-rod b"></span><b class="sr-label">✦ Zbulo një Fjalë</b></button>
      <form class="search" id="thForm"><span>${icon("search")}</span><input id="thQ" type="search" placeholder="Kërko: përulësia, Paisi, lutja…" value="${esc(thQuery)}" enterkeyhint="search"></form>
      <div class="chips th-chips"><button class="chip${!thTheme ? " on" : ""}" data-th="">Të gjitha</button>${THEMES.map(([t]) => `<button class="chip${thTheme === t ? " on" : ""}" data-th="${t}">${t}</button>`).join("")}</div>
      <p class="th-count" id="thCount"></p>
      <div id="thList"></div>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    render();
    let tm;
    $("#thQ").addEventListener("input", (e) => { clearTimeout(tm); tm = setTimeout(() => { thQuery = e.target.value; render(); }, 200); });
    $("#thForm").addEventListener("submit", (e) => { e.preventDefault(); $("#thQ").blur(); });
    $$("[data-th]", listPane).forEach((b) => b.addEventListener("click", () => {
      thTheme = b.dataset.th;
      $$("[data-th]", listPane).forEach((x) => x.classList.toggle("on", x === b));
      render();
    }));
    const roll = $("#thRoll");
    roll.addEventListener("click", () => {
      const pool = thTheme ? all.filter((x) => THEMES.find((t) => t[0] === thTheme)[1].test(x.t)) : all;
      const q = pool[rand(pool.length)];
      roll.classList.remove("open"); void roll.offsetWidth;
      $(".sr-text", roll).textContent = "“" + ortho(q.t) + "”";
      $(".sr-author", roll).textContent = "— " + q.a;
      roll.classList.add("open");
      const r = roll.getBoundingClientRect();
      setTimeout(() => goldBurst(r.left + r.width / 2, r.top + 30), 650);
      if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) { /* */ }
    });
  }

  // ---------- Mjekësia e Shpirtit: 17 gjendje, kërkim i zgjuar, fjalë që ndërrohen ----------
  // ps: vargje nga Psaltiri i aplikacionit [psalmi, vargu] (teksti merret fjalë për fjalë nga të dhënat)
  // gs: fjalë nga Ungjilli (teksti i saktë i KOASh) · fq: temat për fjalët e Etërve
  const G = {
    ejani: ["Ejani tek unë gjithë sa jeni të lodhur e të ngarkuar, edhe unë do t'ju preh ju.", "Mattheu 11:28"],
    neser: ["Mos u shqetësoni, pra, për të nesërmen, sepse e nesërmja do të shqetësohet për punët e saj, mjaft është në çdo ditë e keqja e saj.", "Mattheu 6:34"],
    ati: ["Ati juaj qiellor e di se keni nevojë për gjithë këto.", "Mattheu 6:32"],
    paqe: ["Paqe po ju lë, paqen time po ju jap juve, jua jap juve jo siç e jep bota.", "Joani 14:27"],
    jamune: ["Jam unë, mos u frikësoni.", "Joani 6:20"],
    harab: ["Mos kini frikë, pra, ju vleni më tepër se shumë harabela.", "Mattheu 10:31"],
    meju: ["Edhe ja, unë jam bashkë me ju gjithë ditët, deri në mbarim të jetës.", "Mattheu 28:20"],
    vajtojne: ["Lum ata që vajtojnë, sepse ata do të ngushëllohen.", "Mattheu 5:4"],
    ngjallja: ["Unë jam ngjallja dhe jeta.", "Joani 11:25"],
    besimi: ["Ki guxim, bijë: besimi yt të shpëtoi.", "Mattheu 9:22"],
    lypni: ["Lypni, edhe do t'ju jepet; kërkoni, edhe do të gjeni, trokitni, edhe do t'ju hapet.", "Mattheu 7:7"],
    lutur: ["Gjithë sa të kërkoni duke u lutur, besoni se do t'i merrni, edhe do t'ju bëhen juve.", "Marku 11:24"],
    bute: ["Lum ata që janë të butë, sepse ata do të trashëgojnë dhenë.", "Mattheu 5:5"],
    armiqte: ["Por duajini armiqtë tuaj, edhe bëni mirë, edhe jepni hua, pa pasur më ndonjë shpresë, edhe paga juaj do të jetë e shumtë.", "Llukai 6:35"],
    udha: ["Unë jam udha edhe e vërteta edhe jeta.", "Joani 14:6"],
    drita: ["Unë jam drita e botës.", "Joani 8:12"],
    durojë: ["Kush të durojë deri në fund, ky do të shpëtojë.", "Mattheu 24:13"],
    zgjuar: ["Rrini zgjuar, pra, sepse nuk dini në ç'orë vjen Zoti juaj.", "Mattheu 24:42"],
    femijet: ["Lërini fëmijët e vegjël, edhe mos i ndaloni të vijnë tek unë, sepse e të këtillëve është mbretëria e qiejve.", "Mattheu 19:14"],
    pane: ["Lum ata që nuk panë dhe besuan.", "Joani 20:29"],
    bariu: ["Unë jam bariu i mirë, bariu i mirë vë jetën e tij për dhentë.", "Joani 10:11"],
    duart: ["O Atë, në duart e tua jap shpirtin tim.", "Llukai 23:46"],
  };
  const SOUL = [
    { n: "Ankth", e: "🌊", kw: /ankth|stres|shqet|merak|nervoz|panik|frik.*nes|s'?di ç'?do|pasigur/i,
      ps: [[54, 22], [4, 8], [22, 1], [61, 2], [93, 19]], gs: ["neser", "ati", "paqe", "ejani"], fq: /ankth|shqetës|merak|stres|Përkujdes|dorëz|besim te/i,
      step: "Ndalo një minutë. Merr frymë ngadalë dhe thuaj me çdo frymëmarrje: “Zot Jisu Krisht, mëshiromë.” Shkruaj në letër atë që të shqetëson, pastaj thuaj: “U bëftë dëshira jote.” Bëj vetëm hapin e sotëm.",
      pr: "Zot, ti e di gjithçka që më shqetëson. Po t’i lë Ty në duar të sotmen dhe të nesërmen time. Jepmë paqen tënde, që bota nuk e jep. Amin." },
    { n: "Frikë", e: "🛡", kw: /frik|tremb|rrezik|kërcënim|tmerr/i,
      ps: [[26, 1], [117, 6], [90, 5], [45, 2], [17, 2]], gs: ["jamune", "harab", "meju", "paqe"], fq: /frik|tremb|guxim|mbroj|kryq/i,
      step: "Bëj shenjën e Kryqit ngadalë dhe me vëmendje. Lexo Psalmin 90 të plotë. Kujto: Krishti është me ty “gjithë ditët”.",
      pr: "Zot, Ti je drita ime dhe shpëtimi im; prej kujt të kem frikë? Mbuloje me hirin tënd jetën time dhe të të dashurve të mi. Amin." },
    { n: "Trishtim", e: "🌧", kw: /trisht|mërzit|i mërzitur|e mërzitur|hidhër|lot|qaj|depres|zymt/i,
      ps: [[41, 5], [29, 5], [125, 5], [146, 3], [114, 6]], gs: ["vajtojne", "ejani", "paqe", "drita"], fq: /trishtim|gëzim|ngushëll|lot|hidhër/i,
      step: "Mos e mbaj vetëm. Telefono sot dikë të dashur ose fol me priftin. Dil pak në dritë, ec, dhe falënderoje Zotin për një gjë të vogël.",
      pr: "Zot, Ti që shëron zemërthyerit dhe lidh plagët e tyre, kthema gëzimin e shpëtimit tënd. Ji Ti ngushëllimi im. Amin." },
    { n: "Pikëllim", e: "🕯", kw: /vdiq|humba|humbje|ndarj|i ndjeri|e ndjera|zi\b|varrim|mall për|më mungon/i,
      ps: [[22, 4], [114, 6], [146, 3], [26, 10], [93, 19]], gs: ["ngjallja", "vajtojne", "duart", "pane"], fq: /vdekj|ngjall|përjet|prehje|qiell/i,
      step: "Ndiz një qiri për prehjen e shpirtit të tij/saj dhe thuaj emrin në lutje. Kujto: tek Perëndia të gjithë janë të gjallë. Shkruaje emrin te Diptikët.",
      pr: "Prehe, o Zot, shpirtin e shërbëtorit tënd në vend të ndritur, ku nuk ka dhimbje, as trishtim, as psherëtimë. Dhe mua më ngushëllo me shpresën e Ngjalljes. Amin.",
      act: ["#/lutja", "candle", "Ndiz qiri për të fjeturin"] },
    { n: "Vetmi", e: "🌙", kw: /vetëm|vetmi|i vetmuar|e vetmuar|askush|s'?kam njeri|harruar/i,
      ps: [[4, 8], [24, 15], [26, 10], [138, 7], [15, 8]], gs: ["meju", "bariu", "ejani", "drita"], fq: /vetmi|hesht|qeli|Perëndi.*brenda|mik/i,
      step: "Ti nuk je i/e harruar: Zoti të njeh me emër. Shko të dielën në Liturgji. Sot bëj një gjest të mirë për dikë tjetër që është vetëm.",
      pr: "Zot, edhe pse jam i vetmuar, Ti më bën të jetoj me shpresë. Ji Ti shoqëruesi im dhe më dërgo njerëz të mirë në udhë. Amin." },
    { n: "Sëmundje", e: "🌿", kw: /sëmur|dhimbj|spital|operacion|mjek|diagnoz|ilaç|shërim/i,
      ps: [[102, 3], [40, 3], [6, 3], [29, 3], [40, 4]], gs: ["besimi", "ejani", "lutur", "meju"], fq: /sëmundj|durim|vuajtj|shër|kryq/i,
      step: "Mos e humb shpresën dhe mos i lër ilaçet: Perëndia shëron edhe përmes mjekëve. Kërko nga prifti Bekimin e Vajit (Efqelaion) dhe Kungimin.",
      pr: "Zot, Mjek i shpirtrave dhe i trupave, shëro shërbëtorin tënd nga sëmundja dhe jepi durim e forcë. U bëftë dëshira jote. Amin." },
    { n: "Zemërim", e: "🔥", kw: /zemër|inat|nerv|nxeh|tërbu|urrej|hakmarr|fyerj|fyer/i,
      ps: [[4, 4], [36, 8], [140, 3], [36, 11]], gs: ["bute", "armiqte", "paqe"], fq: /zemërim|inat|mëri|butësi|fal|durim/i,
      step: "Mos fol tani dhe mos shkruaj mesazh. Lëre 10 minuta, thuaj Lutjen e Jisuit. Pastaj lutu për personin që të ka zemëruar, edhe pse është e vështirë.",
      pr: "Zot, vëri rojë gojës sime dhe derë buzëve të mia. Shuaje zjarrin e zemërimit tim dhe më mëso butësinë tënde. Amin." },
    { n: "Zili", e: "🍂", kw: /zili|smirë|krahas|pse ai|pse ajo|më shumë se unë/i,
      ps: [[36, 1], [36, 7], [22, 1], [102, 2]], gs: ["ati", "bute", "lypni"], fq: /zili|smirë|mirënjohj|falënder|gëzo/i,
      step: "Shkruaj 3 dhurata që Zoti të ka dhënë ty. Pastaj lutu me zemër për të mirën e atij që e ke zili: zilia shuhet kur bekon.",
      pr: "Zot, faleminderit për gjithçka që më ke dhënë. Bekoje edhe vëllanë tim dhe më jep zemër që gëzohet me gëzimin e tjetrit. Amin." },
    { n: "Krenari", e: "👑", kw: /krenar|mburr|më i mirë|më e mirë|egoiz|lavdi|kapardis/i,
      ps: [[130, 1], [113, 9], [50, 3]], gs: ["bute", "udha", "ejani"], fq: /përul|krenari|mburr|egoiz|lavdi.*kot/i,
      step: "Bëj sot një shërbim të vogël në fshehtësi, pa ia thënë askujt. Kur të lavdërojnë, thuaj në zemër: “Lavdi Perëndisë.”",
      pr: "Jo neve, o Zot, jo neve, por emrit tënd jepi lavdi. Më jep përulësinë e Birit tënd, që u bë shërbëtor i të gjithëve. Amin." },
    { n: "Dëshpërim", e: "🌑", kw: /dëshp|s'?ka kuptim|s'?ka shpres|pa shpres|dorëzohem|s'?mundem më|lodhur nga jeta|fund/i,
      ps: [[129, 1], [39, 2], [41, 5], [26, 14], [114, 7]], gs: ["ejani", "meju", "lypni", "besimi"], fq: /dëshpër|shpres|ngrihu|mëshir|pendim/i,
      step: "Mos mbaj gjithçka brenda: fol sot me priftin ose me dikë që të do. Nëse mendon të lëndosh veten, telefono menjëherë 112 ose shko te mjeku: Zoti të do dhe jeta jote ka vlerë të madhe.",
      pr: "Nga thellësitë thirra Ty, o Zot; Zot, dëgjo zërin tim. Mos më lër në errësirë; më ngri si e ngrite Pjetrin mbi ujëra. Amin." },
    { n: "Tundim", e: "⚔", kw: /tundim|mëkat.*përsëri|nuk mund të rri|varësi|pornograf|alkool|duhan|bixhoz/i,
      ps: [[118, 11], [118, 9], [140, 3], [17, 2], [15, 8]], gs: ["zgjuar", "lutur", "drita"], fq: /tundim|luft|vigjilenc|mendim|lutj/i,
      step: "Largohu menjëherë nga vendi ose nga telefoni që të tundon. Bëj kryqin, thuaj Lutjen e Jisuit 33 herë me komboskini. Rrëfehu sa më shpejt: djalli e do fshehtësinë.",
      pr: "Zot, ruajmë nga çdo tundim dhe më jep forcë t’i rezistoj së keqes. Mos më lër në duart e armikut, por shpëtomë. Amin.",
      act: ["#/lutja", "cross", "Komboskini"] },
    { n: "Pendesë", e: "💧", kw: /pendo|mëkat|faj|rrëfe|turp|gabova|gabim/i,
      ps: [[50, 3], [50, 10], [31, 5], [129, 4], [102, 3]], gs: ["ejani", "lypni", "besimi"], fq: /pendim|rrëfim|mëkat|lot|ngrihu/i,
      step: "Mos u dëshpëro: pendimi është dera e hapur e Atit. Shkruaj mëkatet, shko te prifti për Rrëfim dhe pastaj kungohu.",
      pr: "O Zot, Krijo zemër të pastër tek unë dhe përtëri frymë të drejtë brenda meje. Mëshiromë sipas mëshirës sate të madhe. Amin.",
      act: ["#/kungimi", "cross", "Ditari i Kungimit"] },
    { n: "Falënderim", e: "✨", kw: /falëndero|mirënjoh|gëzim|lumtur|faleminderit|bekim/i,
      ps: [[102, 2], [117, 1], [33, 2], [102, 5], [91, 2]], gs: ["ati", "pane", "drita"], fq: /falënder|Lavdi Perëndisë|mirënjohj|gëzim/i,
      step: "Ndiz një qiri falënderimi dhe shkruaj te “Lavdi për të gjitha” tri gjëra për të cilat je mirënjohës sot.",
      pr: "Lavdi Ty, o Perëndi, për të gjitha! Për çdo të mirë që di dhe që nuk di, për jetën, për të dashurit e mi. Amin.",
      act: ["#/lavdi", "heart", "Lavdi për të gjitha"] },
    { n: "Vendim i vështirë", e: "🧭", kw: /vendim|zgjedh|s'?di çfarë|cilën rrugë|udhëkryq|ndryshim|punë e re|martes/i,
      ps: [[36, 5], [142, 11], [118, 105], [22, 3], [42, 3]], gs: ["udha", "lypni", "drita"], fq: /vullnet|urtësi|këshill|bindj|udh/i,
      step: "Mos vendos me nxitim. Lutu tri ditë me radhë për këtë çështje, kërko këshillën e atit tënd shpirtëror dhe zgjidh atë që të jep paqe në ndërgjegje.",
      pr: "Zot, mësomë të bëj dëshirën tënde, se Ti je Perëndia im. Ndriçoje mendjen time dhe më drejto në udhën e drejtë. Amin." },
    { n: "Familje", e: "🏠", kw: /familj|bashkëshort|burri|gruaja|fëmij|djali|vajza|prind|nëna|babai|grind|martes/i,
      ps: [[127, 1], [127, 3], [126, 1], [102, 2]], gs: ["femijet", "paqe", "meju"], fq: /familj|fëmij|prind|kishë e vogël|paqe/i,
      step: "Sonte lutuni bashkë qoftë edhe dy minuta. Kërko falje i pari/e para. Bekoji fëmijët me shenjën e Kryqit para gjumit.",
      pr: "Zot, bekoje shtëpinë tonë. Ruaji fëmijët tanë, jepna paqe, durim dhe dashuri për njëri-tjetrin. Ji Ti Zoti i shtëpisë sonë. Amin." },
    { n: "Lodhje shpirtërore", e: "🍃", kw: /lodh|përtaci|s'?kam qejf|s'?kam vullnet|ftoh|bosh|pa forc|rutin/i,
      ps: [[102, 5], [26, 14], [22, 2], [39, 3], [62, 7]], gs: ["ejani", "durojë", "drita"], fq: /durim|zell|ngrihu|lufta|lut/i,
      step: "Mos kërko shumë njëherësh: vetëm një lutje të shkurtër në mëngjes e në mbrëmje dhe një varg Psalmi në ditë. Pusho, fli mirë, dhe shko në Liturgji.",
      pr: "Zot, përtërije rininë time si të shqiponjës. Ndize përsëri në zemrën time dashurinë e parë për Ty. Amin." },
    { n: "Pagjumësi", e: "🌌", kw: /gjum|pagjum|natë|zgjuar|s'?fle|ankth natën/i,
      ps: [[4, 8], [62, 6], [126, 2], [90, 5], [120, 4]], gs: ["ejani", "paqe", "neser"], fq: /natë|lut|paqe|prehje|heshtj/i,
      step: "Lëre telefonin larg. Lexo Pasdarkën e Vogël, pastaj thuaj ngadalë Lutjen e Jisuit derisa të të zërë gjumi.",
      pr: "Jepmë, o Zot, gjumë të qetë, prehje trupi dhe shpirti. Ruajmë këtë natë nën strehën e krahëve të tu. Amin.",
      act: ["#/pasdarka", "candle", "Pasdarka"] },
  ];
  let soulIdx = -1, soulSeed = 0;
  async function viewSoul() {
    const [et, ps] = await Promise.all([load("eterit"), load("psaltiri")]);
    const verse = ([n, v]) => { const p = ps.psalms[n - 1]; return p && p.v[v - 1] ? [p.v[v - 1], psalmRef(n, v), n] : null; };
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Mjekësia e Shpirtit</h1></header>
      <section class="soul-ask">
        <p class="eyebrow">Si ndihesh sot${userName() ? ", " + esc(userName()) : ""}?</p>
        <form id="soulForm"><textarea id="soulQ" rows="2" maxlength="300" placeholder="Shkruaj me fjalët e tua… p.sh. “jam i shqetësuar për punën”"></textarea>
          <button class="btn primary" type="submit">${icon("search")}<span>Gjej ngushëllim</span></button></form>
      </section>
      <div class="soul-grid">${SOUL.map((s, i) => `<button class="medal${i === soulIdx ? " flip" : ""}" data-soul="${i}"><span class="md-inner"><span class="md-front"><i>${s.e}</i><b>${s.n}</b></span><span class="md-back">${icon("cross")}</span></span></button>`).join("")}</div>
      <div id="soulOut"></div>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    const show = (i, scroll) => {
      soulIdx = i; const s = SOUL[i];
      $$("[data-soul]", listPane).forEach((x) => x.classList.toggle("flip", +x.dataset.soul === i));
      const pick = (arr, k) => arr[(soulSeed + k) % arr.length];
      const vs = s.ps.map(verse).filter(Boolean);
      const v1 = pick(vs, 0), v2 = vs.length > 1 ? pick(vs, 1 + (soulSeed % (vs.length - 1))) : null;
      const g = G[pick(s.gs, 0)];
      const fqs = et.quotes.filter((q) => s.fq.test(q.t) && q.t.length < 260);
      const f = fqs.length ? fqs[(soulSeed * 7 + i * 13) % fqs.length] : et.quotes[rand(et.quotes.length)];
      const out = $("#soulOut");
      out.innerHTML = `<section class="soul-card">
          <header class="sc-head"><span class="sc-emo">${s.e}</span><div><p class="eyebrow">Ilaçi për</p><h2>${esc(s.n)}</h2></div>
            <button class="icon-btn" id="soulMore" aria-label="Fjalë të tjera">${icon("refresh")}</button></header>
          <div class="sc-item"><small>${icon("lyre")} Psaltiri</small><p>${esc(v1[0])}</p><cite><a href="#/psaltiri/${v1[2]}">${esc(v1[1])}</a></cite>
            ${v2 && v2 !== v1 ? `<p class="sc-2">${esc(v2[0])}</p><cite>${esc(v2[1])}</cite>` : ""}</div>
          <div class="sc-item"><small>${icon("book")} Ungjilli</small><p>${esc(g[0])}</p><cite>${esc(g[1])}</cite></div>
          <div class="sc-item"><small>${icon("quote")} Etërit</small><p>${esc(f.t)}</p><cite>${esc(f.a)}</cite></div>
          <div class="sc-item sc-step"><small>${icon("check")} Hapi i sotëm</small><p>${esc(s.step)}</p></div>
          <div class="sc-item sc-prayer"><small>${icon("cross")} Lutje e shkurtër</small><p>${esc(s.pr)}</p></div>
          <div class="sc-acts">
            ${s.act ? `<a class="btn" href="${s.act[0]}">${icon(s.act[1])}<span>${esc(s.act[2])}</span></a>` : `<a class="btn" href="#/lutja">${icon("candle")}<span>Ndiz një qiri</span></a>`}
          </div></section>`;
      enter(out);
      if (scroll) setTimeout(() => out.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      $("#soulMore").addEventListener("click", () => { soulSeed++; show(i, false); });
      $$("a[href='#/lutja']", out).forEach((a) => a.addEventListener("click", () => { prayerTab = "qiri"; store.set("prayerTab", "qiri"); }));
      store.set("soul.last", i);
    };
    $$("[data-soul]", listPane).forEach((b) => b.addEventListener("click", () => { soulSeed = rand(1000); show(+b.dataset.soul, true); }));
    $("#soulForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const t = $("#soulQ").value.trim();
      if (!t) return;
      const scores = SOUL.map((s, i) => [i, (t.match(new RegExp(s.kw.source, "gi")) || []).length]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
      $("#soulQ").blur();
      if (!scores.length) { soulSeed = rand(1000); show(0, true); toast("Zgjidh më poshtë gjendjen që të ngjan më shumë"); return; }
      soulSeed = rand(1000);
      show(scores[0][0], true);
      if (scores.length > 1) toast("Shiko edhe: " + scores.slice(1, 3).map((x) => SOUL[x[0]].n).join(", "));
    });
    if (soulIdx >= 0) show(soulIdx, false);
  }

  // ---------- Busulla e Lindjes ----------
  function viewEast() {
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Drejt Lindjes</h1></header>
      <section class="east-stage">
        <div class="east-pointer" aria-hidden="true"></div>
        <div class="east-ring" id="eastRing">
          <div class="er-rose">${[["V", 0], ["L", 90], ["J", 180], ["P", 270]].map(([d, a]) => `<b class="${d === "L" ? "east-l" : ""}" style="--a:${a}deg">${d}</b>`).join("")}</div>
          <div class="er-cross" style="transform:rotate(90deg)"><span>IC</span><span>XC</span>${icon("cross")}<span>NI</span><span>KA</span></div>
        </div>
        <p class="east-deg" id="eastDeg">—</p>
        <p class="east-hint" id="eastHint">Mbaje telefonin rrafsh dhe rrotullohu ngadalë. Kur rozeta ndriçon, je kthyer nga Lindja.</p>
        <button class="btn primary" id="eastStart" hidden>${icon("compass")}<span>Aktivizo busullën</span></button>
      </section>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    const ring = $("#eastRing"), deg = $("#eastDeg"), hint = $("#eastHint");
    let shown = null, target = null, raf = 0, wasOn = false, lastBuzz = 0, gotAbs = false;
    const norm = (a) => ((a % 360) + 360) % 360;
    const screenAngle = () => (screen.orientation && typeof screen.orientation.angle === "number" ? screen.orientation.angle : (window.orientation || 0));
    const draw = () => {
      raf = 0;
      if (target == null) return;
      if (shown == null) shown = target;
      // lëvizje e butë pa kërcim 359° → 0°: ecim nga rruga më e shkurtër
      const diff = ((target - norm(shown) + 540) % 360) - 180;
      shown += diff * 0.22;
      ring.style.transform = `rotate(${(-shown).toFixed(2)}deg)`;
      const h = norm(shown), off = Math.abs(((h - 90 + 540) % 360) - 180);
      const on = off <= 5;
      deg.textContent = `${Math.round(h)}° · ${on ? "Lindja ✝" : off < 25 ? "afër Lindjes" : h < 45 || h > 315 ? "Veri" : h < 135 ? "Lindje" : h < 225 ? "Jug" : "Perëndim"}`;
      ring.classList.toggle("east-on", on);
      if (on && !wasOn && Date.now() - lastBuzz > 1500 && navigator.vibrate) { lastBuzz = Date.now(); try { navigator.vibrate([18, 40, 18]); } catch (x) { /* */ } }
      wasOn = on;
      if (Math.abs(diff) > 0.3) raf = requestAnimationFrame(draw);
    };
    const onOri = (e) => {
      if (!location.hash.startsWith("#/lindja")) { stop(); return; }
      let h = null;
      if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading;                 // iPhone
      else if ((e.absolute || e.type === "deviceorientationabsolute") && e.alpha != null) { h = 360 - e.alpha; gotAbs = true; }   // Android
      else if (!gotAbs && e.alpha != null && e.absolute !== false) h = 360 - e.alpha;
      if (h == null) return;
      target = norm(h + screenAngle());
      const sb = $("#eastStart"); if (sb && !sb.hidden) sb.hidden = true;
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const stop = () => { removeEventListener("deviceorientationabsolute", onOri); removeEventListener("deviceorientation", onOri); };
    const start = () => {
      stop();
      if ("ondeviceorientationabsolute" in window) addEventListener("deviceorientationabsolute", onOri);
      addEventListener("deviceorientation", onOri);
      setTimeout(() => { if (target == null) hint.textContent = "Ky telefon nuk jep drejtimin e busullës. Lindja është drejtimi ku lind dielli në mëngjes."; }, 3500);
    };
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
      // iPhone: kërkon leje me prekje; në Android nis menjëherë dhe butoni del vetëm po s'vjen drejtimi
      const b = $("#eastStart");
      start();
      setTimeout(() => { if (target == null) b.hidden = false; }, 700);
      b.addEventListener("click", () => DeviceOrientationEvent.requestPermission().then((r) => { if (r === "granted") { b.hidden = true; start(); } else hint.textContent = "Lejo “Motion & Orientation” për busullën."; }).catch(() => { b.hidden = true; start(); }));
    } else start();
  }



  // ---------- Kalendari Kishtar (i plotë): muaji, dita, leximet, shkurtimet ----------
  const TON = { I: "Tingulli i Parë", II: "Tingulli i Dytë", III: "Tingulli i Tretë", IV: "Tingulli i Katërt", V: "Tingulli Tërthor i Parë", VI: "Tingulli Tërthor i Dytë", R: "Tingulli i Rëndë", VIII: "Tingulli Tërthor i Katërt" };
  function calDay(d) {
    const kd = ((window.FS_DATA || {}).kalendari || {}).dite;
    const m = kd && kd[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`];
    return m ? m.find((x) => x.d === d.getDate()) || null : null;
  }
  function expandAbbr(t) {
    const kal = (window.FS_DATA || {}).kalendari;
    if (!kal) return esc(t);
    let s = esc(t);
    kal.shkurtime.forEach(([a, b]) => { if (/^[A-ZËÇ][\wëç/.-]*\.$/i.test(a) || a.includes("/")) s = s.split(esc(a)).join(`<abbr title="${esc(b)}">${esc(a)}</abbr>`); });
    return s;
  }
  let calSel = null;
  async function viewCalendar(mStr, dStr) {
    await Promise.all([load("kalendari"), load("tipikoja")]);
    const now = new Date();
    const y = 2026, mo = mStr ? +mStr - 1 : now.getFullYear() === y ? now.getMonth() : 10;
    const dd = dStr ? +dStr : (now.getMonth() === mo ? now.getDate() : 1);
    const date = new Date(y, mo, dd);
    const f = Fast.info(date), kd = calDay(date);
    const sec = data.tipikoja && data.tipikoja.sections[mo];
    const ti = sec ? sec.items.findIndex((x) => parseInt(x.title, 10) === dd) : -1;
    const tit = ti >= 0 ? sec.items[ti] : null;
    const saints = kd ? kd.x : ((tit && (tit.blocks.find((b) => b.t === "saints") || {}).x) || "");
    const lit = litDay(f, tit);
    const days = new Date(y, mo + 1, 0).getDate(), lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(`<span class="cal-c cal-e"></span>`);
    for (let k = 1; k <= days; k++) {
      const dt = new Date(y, mo, k), fi = Fast.info(dt), it2 = sec ? sec.items.find((x) => parseInt(x.title, 10) === k) : null;
      const l2 = litDay(fi, it2), today = dt.toDateString() === now.toDateString();
      cells.push(`<a href="#/kalendari/${mo + 1}/${k}" class="cal-c${today ? " today" : ""}${k === dd ? " sel" : ""}${fi.level && fi.level.cls !== "free" ? " lv-" + fi.level.cls : ""}${fi.great ? " great" : ""}${dt.getDay() === 0 ? " sun" : ""}"><b>${k}</b>${l2 ? `<i class="cal-x">✝</i>` : ""}</a>`);
    }
    const marks = kd ? [kd.lit ? "✝ Liturgji Hyjnore" : "", kd.f === "#" ? "# Vaj, verë, peshk" : kd.f === "*" ? "* Vaj e verë" : kd.k ? "Ditë kreshme" : "", kd.free ? "Hahen të gjitha" : ""].filter(Boolean) : [];
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Kalendari</h1>
        <a class="icon-btn" href="#/kalendari" aria-label="Sot">${icon("calendar")}</a></header>
      <section class="cal kal-cal">
        <header class="cal-head">${mo > 0 ? `<a class="icon-btn" href="#/kalendari/${mo}/1" aria-label="Muaji i mëparshëm">${icon("back")}</a>` : "<span></span>"}
          <h3>${MUAJ[mo]} ${y}</h3>${mo < 11 ? `<a class="icon-btn" href="#/kalendari/${mo + 2}/1" aria-label="Muaji tjetër"><svg style="transform:scaleX(-1)"><use href="#i-back"/></svg></a>` : "<span></span>"}</header>
        <div class="cal-grid">${["H", "M", "M", "E", "P", "Sh", "D"].map((w) => `<span class="cal-w">${w}</span>`).join("")}${cells.join("")}</div>
        <div class="cal-legend"><span><i class="cal-x">✝</i>Liturgji</span><span><i class="lg lv-fish"></i>Peshk</span><span><i class="lg lv-oil"></i>Vaj e verë</span><span><i class="lg lv-strict"></i>Ditë kreshme</span><span><i class="lg lv-dairy"></i>Bulmet</span></div>
      </section>
      <section class="kal-day${f.great ? " great" : ""}">
        <p class="eyebrow">${["E diel", "E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë"][date.getDay()]} · ${dd} ${MUAJ_G[mo]} ${y}</p>
        ${f.feast ? `<h2>${esc(f.feast)}</h2>` : ""}
        ${marks.length ? `<div class="kal-marks">${marks.map((m) => `<span>${esc(m)}</span>`).join("")}</div>` : ""}
        <p class="kal-saints">${kd ? expandAbbr(kd.x) : esc(saints)}</p>
        ${fastCardHtml(f, { liturgy: lit })}
        ${kd && (kd.ap || kd.ev || kd.note) ? `<div class="kal-reads">
          ${kd.ap ? `<div><small>${icon("letter")} Apostulli</small><b>${esc(kd.ap)}</b>${kd.j ? `<em>Java e ${kd.j}-të</em>` : ""}</div>` : ""}
          ${kd.ev ? `<div><small>${icon("book")} Ungjilli</small><b>${esc(kd.ev)}</b></div>` : ""}
          ${kd.note ? `<p class="muted">${esc(kd.note)}</p>` : ""}
          ${kd.t ? `<div><small>${icon("music")} Tingulli i javës</small><b>${esc(TON[kd.t] || kd.t)}</b>${kd.um ? `<em>Ungjilli Mëngjesor ${esc(kd.um)}</em>` : ""}</div>` : ""}
        </div>` : ""}
        <div class="kal-acts">
          <a class="btn" href="#/sinaksari/${mo + 1}/${dd}">${icon("calendar")}<span>Sinaksari</span></a>
          ${date.getDay() === 0 ? `<a class="btn primary" href="#/edjela/${y}-${String(mo + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}">${icon("music")}<span>Shërbesa e së Dielës</span></a>` : ""}
        </div>
      </section>
      ${tit ? `<section class="kal-tip"><h3>${icon("candle")} Tipikoja e ditës</h3><div class="verses" lang="sq">${blocksHtml("tipikoja", tit.blocks.filter((b) => b.t !== "saints"), { priest: true })}</div></section>` : ""}
      ${(data.kalendari || {}).shkurtime ? `<details class="kal-abbr"><summary>Shkurtimet e kalendarit</summary><dl>${data.kalendari.shkurtime.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}
        <div><dt>✝</dt><dd>Kryhet Liturgji (Meshë) Hyjnore</dd></div><div><dt>#</dt><dd>Hahet vaj, verë, peshk</dd></div><div><dt>*</dt><dd>Hahet vaj e verë</dd></div></dl></details>` : ""}`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  // ---------- Rrëfimi: shënimet për atin shpirtëror, të mbyllura me kod (AES-GCM) ----------
  const Confess = (() => {
    const K = "rr.v1";
    let dataKey = null, raw = null, items = [], hist = [];
    const enc = new TextEncoder(), dec = new TextDecoder();
    const b64 = (u8) => { let x = ""; new Uint8Array(u8).forEach((c) => (x += String.fromCharCode(c))); return btoa(x); };
    const ub64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
    const norm = (t) => String(t).toLowerCase().replace(/ë/g, "e").replace(/ç/g, "c").replace(/\s+/g, " ").trim();
    async function kek(secret, salt) {
      const base = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    }
    async function seal(key, bytes) { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64(iv), ct: b64(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes)) }; }
    async function unseal(key, box) { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub64(box.iv) }, key, ub64(box.ct))); }
    const rec = () => store.get(K, null);
    async function useRaw(r) { raw = r; dataKey = await crypto.subtle.importKey("raw", r, "AES-GCM", false, ["encrypt", "decrypt"]); }
    async function setup(pin, q, ans) {
      const r = crypto.getRandomValues(new Uint8Array(32));
      const sp = crypto.getRandomValues(new Uint8Array(16)), sa = crypto.getRandomValues(new Uint8Array(16));
      const o = { sp: b64(sp), sa: b64(sa), q, pin: await seal(await kek(pin, sp), r), ans: await seal(await kek(norm(ans), sa), r) };
      await useRaw(r); items = [];
      o.data = await seal(dataKey, enc.encode("[]"));
      store.set(K, o);
    }
    async function openWith(secret, which) {
      const o = rec();
      const r = await unseal(await kek(which === "pin" ? secret : norm(secret), ub64(which === "pin" ? o.sp : o.sa)), which === "pin" ? o.pin : o.ans);
      await useRaw(r);
      const v = JSON.parse(dec.decode(await unseal(dataKey, o.data)));
      if (Array.isArray(v)) { items = v; hist = []; } else { items = v.items || []; hist = v.hist || []; }
    }
    async function unlock(pin) { try { await openWith(pin, "pin"); return true; } catch (e) { lock(); return false; } }
    async function setPin(pin) { const o = rec(); const sp = crypto.getRandomValues(new Uint8Array(16)); o.sp = b64(sp); o.pin = await seal(await kek(pin, sp), raw); store.set(K, o); }
    async function reset(ans, pin) { try { await openWith(ans, "ans"); await setPin(pin); return true; } catch (e) { lock(); return false; } }
    async function save() { const o = rec(); o.data = await seal(dataKey, enc.encode(JSON.stringify({ items, hist }))); store.set(K, o); }
    function lock() { dataKey = null; raw = null; items = []; hist = []; }
    return { setup, unlock, reset, setPin, save, lock, has: () => !!rec(), question: () => (rec() || {}).q || "",
      wipe() { store.set(K, null); lock(); }, get items() { return items; }, get hist() { return hist; }, get open() { return !!dataKey; } };
  })();
  let pendingConfess = [];
  const RR_Q = ["Emri i shenjtorit tim mbrojtës?", "Kisha ku u pagëzova?", "Emri i kumbarit ose i kumbarës?", "Qyteti ku kam lindur?", "Ushqimi im i preferuar?"];
  function viewConfess() {
    const head = `<header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Rrëfimi</h1>${Confess.open ? `<button class="icon-btn" id="rrLock" aria-label="Mbyll">🔒</button>` : ""}</header>`;
    const done = () => { enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list"); };
    const pinField = (id, ph) => `<input id="${id}" class="rr-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="${ph}">`;
    if (!Confess.has()) {
      listPane.innerHTML = head + `
        <section class="rr-hero glass"><div class="rr-lock">🔒</div><h2>Shënimet për Rrëfim</h2>
          <p>Shkruaj këtu ato që do t'i thuash atit shpirtëror. Mbyllen me kodin tënd dhe ruhen të fshehura (të koduara) vetëm në këtë telefon.</p></section>
        <form class="rr-form glass" id="rrSetup">
          <label>Krijo kodin (4–12 shifra)${pinField("rrP1", "••••")}</label>
          <label>Përsërite kodin${pinField("rrP2", "••••")}</label>
          <label>Pyetja e sigurisë<select id="rrQ">${RR_Q.map((x) => `<option>${x}</option>`).join("")}</select></label>
          <label>Përgjigjja (për ta rikthyer kodin po ta harrosh)<input id="rrA" maxlength="60" autocomplete="off" placeholder="Përgjigjja jote"></label>
          <button class="btn primary" type="submit">${icon("check")}<span>Krijo</span></button>
        </form>`;
      done();
      $("#rrSetup").addEventListener("submit", async (e) => {
        e.preventDefault();
        const p1 = $("#rrP1").value.trim(), p2 = $("#rrP2").value.trim(), a = $("#rrA").value.trim();
        if (!/^\d{4,12}$/.test(p1)) return toast("Kodi: 4 deri në 12 shifra");
        if (p1 !== p2) return toast("Kodet nuk përputhen");
        if (a.length < 2) return toast("Shkruaj përgjigjen e pyetjes");
        await Confess.setup(p1, $("#rrQ").value, a);
        haptic([20, 40, 20], true); goldBurst(); viewConfess();
      });
      return;
    }
    if (!Confess.open) {
      listPane.innerHTML = head + `
        <section class="rr-hero glass"><div class="rr-lock">🔒</div><h2>Shkruaj kodin</h2>
          <form id="rrOpen" class="rr-open">${pinField("rrPin", "••••")}<button class="btn primary" type="submit">Hap</button></form>
          <button class="btn ghost" id="rrForgot">Harrova kodin</button></section>
        <form class="rr-form glass" id="rrReset" hidden>
          <p class="eyebrow">${esc(Confess.question())}</p>
          <label>Përgjigjja<input id="rrRA" maxlength="60" autocomplete="off"></label>
          <label>Kodi i ri (4–12 shifra)${pinField("rrRP", "••••")}</label>
          <button class="btn primary" type="submit">${icon("refresh")}<span>Rikthe kodin</span></button>
          <button class="btn ghost" type="button" id="rrWipe">Fshi gjithçka dhe nis nga e para</button>
        </form>`;
      done();
      let fails = store.get("rr.fails", 0);
      setTimeout(() => $("#rrPin")?.focus(), 300);
      $("#rrOpen").addEventListener("submit", async (e) => {
        e.preventDefault();
        const until = store.get("rr.wait", 0);
        if (Date.now() < until) return toast(`Prit ${Math.ceil((until - Date.now()) / 1000)} sekonda`);
        if (await Confess.unlock($("#rrPin").value.trim())) { store.set("rr.fails", 0); haptic([15, 30, 15]); viewConfess(); }
        else {
          fails++; store.set("rr.fails", fails);
          if (fails % 5 === 0) store.set("rr.wait", Date.now() + 30000);
          const f = $("#rrOpen"); f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
          haptic([60, 40, 60], true); $("#rrPin").value = ""; toast("Kod i gabuar");
        }
      });
      $("#rrForgot").addEventListener("click", () => { $("#rrReset").hidden = false; $("#rrRA").focus(); });
      $("#rrReset").addEventListener("submit", async (e) => {
        e.preventDefault();
        const np = $("#rrRP").value.trim();
        if (!/^\d{4,12}$/.test(np)) return toast("Kodi: 4 deri në 12 shifra");
        if (await Confess.reset($("#rrRA").value, np)) { store.set("rr.fails", 0); toast("Kodi u ndryshua ✓"); viewConfess(); }
        else { haptic([60, 40, 60], true); toast("Përgjigje e gabuar"); }
      });
      $("#rrWipe").addEventListener("click", () => { if (confirm("Të fshihen përgjithmonë të gjitha shënimet e Rrëfimit? Kjo nuk kthehet më.")) { Confess.wipe(); viewConfess(); } });
      return;
    }
    const L = Confess.items, last = store.get("rr.last", "");
    const ago = last ? Math.round((Date.now() - new Date(last + "T12:00:00")) / 864e5) : null;
    listPane.innerHTML = head + `
      <section class="rr-hero glass open"><div class="rr-lock">🔓</div><h2>${L.length ? L.length + " për t'u rrëfyer" : "Asgjë e shënuar"}</h2>
        <p>${last ? `Rrëfimi i fundit: ${ago === 0 ? "sot" : ago === 1 ? "dje" : ago + " ditë më parë"}` : "Shkruaj me sinqeritet, pa frikë: Perëndia është i mëshirshëm."}</p></section>
      ${pendingConfess.length ? `<div class="rr-pending glass"><span>${pendingConfess.length} nga Shqyrtimi i ndërgjegjes</span><button class="btn primary" id="rrImport">${icon("plus")}<span>Shtoji</span></button></div>` : ""}
      <form class="rr-add glass" id="rrAdd"><textarea id="rrText" rows="3" maxlength="600" placeholder="Çfarë do të rrëfesh…"></textarea>
        <button class="btn primary" type="submit">${icon("plus")}<span>Shto</span></button></form>
      <ul class="rr-list">${L.map((x, i) => `<li class="glass" style="--i:${i}"><span class="rr-dot"></span><p>${esc(x.t)}</p><button class="icon-btn small" data-rdel="${i}" aria-label="Fshi">${icon("close")}</button></li>`).join("")}</ul>
      <div class="rr-actions">
        <a class="btn" href="#/shqyrtimi">${icon("book")}<span>Shqyrtimi i ndërgjegjes</span></a>
        <button class="btn primary" id="rrDone">${icon("check")}<span>U rrëfeva</span></button>
        <button class="btn ghost" id="rrChange">Ndrysho kodin</button>
      </div>
      ${canonUntil() ? (() => { const [t, r] = COMFORT[new Date().getDate() % COMFORT.length]; const u = canonUntil(); return `<section class="kg-canon rr-canon glass"><p class="eyebrow">Koha e kanonit</p>
        <h3>Mund të kungohesh më ${esc(fmtIso(u))} · edhe ${daysTo(u)} ditë</h3>
        <p>Kanoni nuk është ndëshkim, por mjekim që ati shpirtëror ta jep me dashuri, që shpirti të shërohet dhe ta presë Kungimin me zemër të përgatitur. Mos u largo nga Kisha: lutu, eja në Liturgji, merr nafurën dhe ndiq këshillat e tij.</p>
        <p class="kg-verse">“${esc(t)}”<small>${esc(refTxt(r))}</small></p>
        <div class="row"><a class="btn" href="#/psaltiri/50">${icon("book")}<span>Psalmi 50</span></a><a class="btn" href="#/komboskini">${icon("cross")}<span>Lutja e Jisuit</span></a></div></section>`; })() : ""}
      ${Confess.hist.length ? `<h2 class="hub-h">Rrëfimet e mia</h2><ul class="rr-list">${Confess.hist.slice(0, 12).map((h, i) => `<li class="glass" style="--i:${i}"><span class="rr-dot"></span><p><b>${esc(fmtIso(h.date))}</b>${h.ati ? ` · ${esc(h.ati)}` : ""}<br><small>${h.kanon ? `Kanon: ${h.n} ${esc(h.unit)}${h.until ? ` → deri më ${esc(fmtIso(h.until))}` : ""}${h.shenim ? ` · ${esc(h.shenim)}` : ""}` : "Pa kanon"}</small></p></li>`).join("")}</ul>` : ""}
      <p class="rr-verse">“Po t'i rrëfejmë mëkatet tona, Ai është besnik dhe i drejtë që të na i falë.”<small>1 Joanit 1:9</small></p>`;
    done();
    const persist = async () => { await Confess.save(); viewConfess(); };
    $("#rrLock").addEventListener("click", () => { Confess.lock(); haptic(20); viewConfess(); });
    $("#rrAdd").addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = $("#rrText").value.replace(/\s+/g, " ").trim();
      if (!t) return;
      L.unshift({ t, at: Date.now() }); haptic(14); await persist();
    });
    $("#rrImport")?.addEventListener("click", async () => { pendingConfess.forEach((t) => L.push({ t, at: Date.now() })); pendingConfess = []; haptic([15, 30, 15]); await persist(); });
    $$("[data-rdel]", listPane).forEach((x) => x.addEventListener("click", async () => { L.splice(+x.dataset.rdel, 1); await persist(); }));
    $("#rrDone")?.addEventListener("click", () => confessedSheet(async (rec) => {
      L.length = 0;
      Confess.hist.unshift(rec);
      store.set("rr.last", rec.date);
      store.set("rr.canonUntil", rec.until || "");
      goldBurst(); haptic([30, 60, 30, 60, 160], true);
      toast(rec.until ? `Lavdi Perëndisë! Mund të kungohesh më ${fmtIso(rec.until)} 🕊` : "Lavdi Perëndisë! Shko në paqe 🕊");
      await persist();
      Persons.schedule();
    }));
    $("#rrChange").addEventListener("click", async () => {
      const np = prompt("Kodi i ri (4–12 shifra):");
      if (np == null) return;
      if (!/^\d{4,12}$/.test(np.trim())) return toast("Kodi: 4 deri në 12 shifra");
      await Confess.setPin(np.trim()); toast("Kodi u ndryshua ✓");
    });
  }

  function confessedSheet(onSave) {
    const last = (Confess.hist[0] || {}).ati || "";
    const el = document.createElement("div");
    el.className = "sheet update-sheet onboard";
    el.innerHTML = `<div class="sheet-card update-card" role="dialog" aria-modal="true" aria-labelledby="cfT">
        <h2 id="cfT">U rrëfeva ☦</h2>
        <form id="cfForm" class="cf-form">
          <label>Data e rrëfimit<input type="date" id="cfDate" value="${isoToday()}" max="${isoToday()}" required></label>
          <label>Ati shpirtëror<input id="cfAti" maxlength="60" value="${esc(last)}" placeholder="p.sh. At Joani" autocomplete="off"></label>
          <div class="seg cf-seg" role="radiogroup"><button type="button" data-k="0" aria-checked="true">Pa kanon</button><button type="button" data-k="1" aria-checked="false">Më dha kanon</button></div>
          <div id="cfKanon" hidden>
            <label>Sa kohë pa Kungim?</label>
            <div class="cf-row"><input type="number" id="cfN" min="1" max="99" value="1"><select id="cfU"><option value="ditë">ditë</option><option value="javë" selected>javë</option><option value="muaj">muaj</option><option value="vjet">vjet</option></select></div>
            <label>Çfarë të dha (opsionale)<input id="cfSh" maxlength="120" placeholder="p.sh. Psalmi 50 çdo mbrëmje, 100 metani" autocomplete="off"></label>
            <p class="cf-when" id="cfWhen"></p>
          </div>
          <button class="btn primary upd-go" type="submit">${icon("check")}<span>Ruaj</span></button>
        </form>
        <button class="btn upd-later" type="button">Anulo</button></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    let kanon = false;
    const until = () => {
      const d = new Date($("#cfDate", el).value + "T12:00:00"), n = Math.max(1, +$("#cfN", el).value || 1), u = $("#cfU", el).value;
      if (u === "ditë") d.setDate(d.getDate() + n); else if (u === "javë") d.setDate(d.getDate() + n * 7);
      else if (u === "muaj") d.setMonth(d.getMonth() + n); else d.setFullYear(d.getFullYear() + n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const upd = () => { if (kanon) $("#cfWhen", el).textContent = `Mund të kungohesh më ${fmtIso(until())} (edhe ${daysTo(until())} ditë).`; };
    $$(".cf-seg button", el).forEach((b) => b.addEventListener("click", () => {
      kanon = b.dataset.k === "1";
      $$(".cf-seg button", el).forEach((x) => x.setAttribute("aria-checked", x === b));
      $("#cfKanon", el).hidden = !kanon; upd(); haptic(10);
    }));
    ["#cfDate", "#cfN", "#cfU"].forEach((q) => $(q, el).addEventListener("input", upd));
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    $(".upd-later", el).addEventListener("click", close);
    $("#cfForm", el).addEventListener("submit", (e) => {
      e.preventDefault();
      const rec = { date: $("#cfDate", el).value || isoToday(), ati: $("#cfAti", el).value.trim(), kanon };
      if (kanon) Object.assign(rec, { n: Math.max(1, +$("#cfN", el).value || 1), unit: $("#cfU", el).value, shenim: $("#cfSh", el).value.trim(), until: until() });
      close();
      onSave(rec);
    });
  }

  document.addEventListener("click", (e) => { if (e.target.closest("[data-baptized]")) { e.preventDefault(); baptizedSheet(); } });
  // “U pagëzova”: emri i pagëzimit, data, kisha, kush e kreu Pagëzimin → aplikacioni hapet plotësisht
  function baptizedSheet() {
    if ($(".bap-sheet")) return;
    const el = document.createElement("div");
    el.className = "sheet update-sheet onboard bap-sheet";
    el.innerHTML = `<div class="sheet-card update-card" role="dialog" aria-modal="true" aria-labelledby="bpT">
        <div class="upd-icon">${icon("cross")}</div>
        <h2 id="bpT">U pagëzova ☦</h2>
        <form id="bpForm" class="cf-form">
          <label>Emri i pagëzimit<input id="bpName" maxlength="30" required autocomplete="off" placeholder="p.sh. Joan, Maria"></label>
          <label>Data e Pagëzimit<input type="date" id="bpDate" value="${isoToday()}" max="${isoToday()}" required></label>
          <label>Kisha<input id="bpChurch" maxlength="80" autocomplete="off" placeholder="p.sh. Kisha e Shën Gjergjit, Korçë"></label>
          <label>Kush e kreu Pagëzimin<select id="bpWho"><option>Prift (At)</option><option>Episkop</option><option>Mitropolit</option><option>Kryepiskop</option></select></label>
          <label>Emri i klerikut<input id="bpCleric" maxlength="60" autocomplete="off" placeholder="p.sh. At Joani"></label>
          <button class="btn primary upd-go" type="submit">${icon("check")}<span>Ruaj</span></button>
        </form>
        <button class="btn upd-later" type="button">Anulo</button></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    setTimeout(() => $("#bpName", el)?.focus(), 350);
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    $(".upd-later", el).addEventListener("click", close);
    $("#bpForm", el).addEventListener("submit", (e) => {
      e.preventDefault();
      const bapt = $("#bpName", el).value.trim().replace(/\s+/g, " ");
      if (!bapt) { $("#bpName", el).classList.add("need"); return; }
      const rec = { date: $("#bpDate", el).value || isoToday(), kisha: $("#bpChurch", el).value.trim(), grada: $("#bpWho", el).value, kleriku: $("#bpCleric", el).value.trim() };
      store.set("pagezimi", rec);
      store.set("me.unbaptized", false);
      store.set("me.bapt", bapt);
      const name = store.get("me.name", "") || bapt;
      if (!store.get("me.name", "")) store.set("me.name", bapt);
      const l = Persons.all().filter((y) => !y.me);
      l.unshift({ name, bapt, key: bapt.split(" ")[0], dates: [], me: true, at: Date.now() });
      store.set("persons", l);
      Persons.schedule();
      close();
      goldBurst(); haptic([40, 60, 40, 60, 240], true);
      toast(`☦ Urime, ${bapt}! “Sa u pagëzuat në Krishtin, me Krishtin u veshët.” Tani zgjidh kur feston emri yt.`);
      setTimeout(() => { location.hash = "#/emri"; }, 400);
    });
  }

  // Faqe e kyçur për të papagëzuarit: Misteret e Kishës hapen me Pagëzimin
  function viewLocked(view) {
    const T = { rrefimi: "Rrëfimi", shqyrtimi: "Shqyrtimi i ndërgjegjes", kungimi: "Kungimi Hyjnor" }[view] || "";
    const [t, r] = INVITE[1];
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>${esc(T)}</h1></header>
      <section class="lock-hero"><div class="lock-ic">🔒</div><h2>Hapet me Pagëzimin</h2>
        <p>${esc(T)} është pjesë e jetës mistike të Kishës për ata që janë pagëzuar në Kishën Orthodhokse. Krishti të pret: dera është Pagëzimi.</p>
        <p class="kg-verse">“${esc(t)}”<small>${esc(r)}</small></p>
        <a class="btn primary" href="#/biblioteka/pagezimi">${icon("cross")}<span>Si të pagëzohem</span></a> <button class="btn bap-done-btn" data-baptized>${icon("check")}<span>U pagëzova ☦</span></button></section>`;
    enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
  }

  // ---------- Shqyrtimi i ndërgjegjes (para Rrëfimit; asgjë nuk ruhet këtu) ----------
  const EXAM = [
    ["Ndaj Perëndisë", ["A e kam lënë lutjen e mëngjesit dhe të mbrëmjes?", "A jam lutur me mendje të shpërndarë, pa vëmendje e pa zemër?", "A kam munguar në Liturgjinë Hyjnore të së Dielës ose të festave pa arsye?", "A kam ardhur vonë në kishë ose kam folur kot gjatë shërbesës?", "A e kam përmendur emrin e Perëndisë kot, me mallkim ose me betime?", "A kam mohuar ose jam turpëruar ta rrëfej besimin tim?", "A kam dyshuar në Perëndinë ose në mësimin e Kishës?", "A kam besuar në fall, bestytni, horoskop, magji ose “syri i keq”?", "A kam shkuar te falltarë, magjistarë ose “hoxhallarë”?", "A e kam thyer kreshmën pa nevojë ose pa bekim?", "A jam kunguar pa përgatitje, pa rrëfim ose pa u pajtuar me të tjerët?", "A e kam lënë Shkrimin e Shenjtë dhe leximin shpirtëror pas dore?", "A kam qeshur me gjërat e shenjta, me ikonat ose me klerikët?", "A jam mbështetur te vetja, te paraja ose te njerëzit më shumë se te Perëndia?", "A e kam fshehur me vetëdije ndonjë mëkat në Rrëfim?"]],
    ["Ndaj familjes dhe të afërmit", ["A i kam nderuar, dëgjuar dhe ndihmuar prindërit?", "A u kam folur prindërve ose të moshuarve me ashpërsi a mosrespekt?", "A i kam rritur fëmijët në besim, me dashuri e shembull të mirë?", "A kam qenë besnik dhe i butë me bashkëshortin ose bashkëshorten?", "A kam gënjyer ose kam thënë gjysmë të vërteta?", "A kam përfolur, gjykuar, tallur ose shpifur për dikë?", "A kam përhapur thashetheme ose sekrete të të tjerëve?", "A kam mbajtur mëri, hakmarrje ose nuk kam falur?", "A kam pasur zili për të mirën e tjetrit ose jam gëzuar për të keqen e tij?", "A kam lënduar dikë me fjalë, me vepra ose me heshtje të ftohtë?", "A kam ngritur dorë ose kam dhunuar dikë?", "A kam qenë pa mëshirë me të varfrit, të sëmurët dhe ata që vuajnë?", "A kam marrë, vjedhur ose mbajtur diçka që nuk ishte e imja?", "A kam mashtruar në punë, në tregti, në shkollë ose në taksa?", "A kam kthyer borxhet dhe kam paguar drejt ata që punojnë për mua?", "A kam shtyrë dikë në mëkat me fjalë ose me shembullin tim?"]],
    ["Mëkatet trupore dhe pastërtia", ["A kam lejuar dhe kam ushqyer mendime e dëshira të papastra?", "A kam parë pamje, filma ose faqe të papastra (pornografi)?", "A kam rënë në vetëkënaqësi (masturbim)?", "A kam pasur marrëdhënie trupore jashtë martesës (kurvëri)?", "A kam qenë jobesnik në martesë (shkelje e kurorës) ose kam dëshiruar gruan apo burrin e tjetrit?", "A kam folur, shkruar ose dëgjuar fjalë e shaka të ndyra?", "A jam veshur ose jam sjellë pa nder, për të ngjallur epsh te të tjerët?", "A kam qenë shkak që dikush tjetër të bjerë në mëkat trupor?", "A kam marrë pjesë ose kam nxitur një abort?", "A kam ngrënë ose pirë pa masë (grykësi)?", "A jam dehur ose kam humbur kontrollin nga alkooli?", "A kam përdorur drogë ose substanca që e dëmtojnë trupin dhe mendjen?", "A e kam dëmtuar trupin tim, tempullin e Shpirtit të Shenjtë, me duhan ose me ves të tjerë?", "A kam kaluar netët në argëtime të kota që më larguan nga lutja?"]],
    ["Ndaj vetes dhe pasionet", ["A jam mburrur ose kam kërkuar lavdinë e njerëzve (mendjemadhësi)?", "A kam përbuzur të tjerët dhe e kam menduar veten më të mirë?", "A më ka mundur zemërimi, nervozizmi ose bërtitja?", "A më ka mundur përtacia në punë, në lutje ose në detyrat e mia?", "A kam qenë koprrac dhe i lidhur pas parave e sendeve?", "A jam dëshpëruar duke harruar shpresën te mëshira e Perëndisë?", "A kam menduar të bëj keq me veten dhe nuk kam kërkuar ndihmë?", "A e kam humbur kohën pa dobi në telefon, rrjete sociale ose lojëra?", "A kam qenë hipokrit: i mirë përpara njerëzve, ndryshe në fshehtësi?", "A jam ankuar kundër Perëndisë dhe nuk kam qenë mirënjohës?", "A kam shtyrë pendimin për “më vonë”?"]],
  ];
  function viewExam() {
    const sel = new Set();
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Shqyrtimi i ndërgjegjes</h1></header>
      <p class="ex-intro">Lexoji me qetësi, para Rrëfimit. Prek ato që të rëndojnë zemrën: asgjë nuk ruhet këtu.</p>
      ${EXAM.map(([h, qs], gi) => `<h2 class="hub-h">${h}</h2><div class="ex-list">${qs.map((x, i) => `<button class="ex-q glass" style="--i:${i}" data-q="${gi}-${i}"><span class="ex-box"></span><span>${esc(x)}</span></button>`).join("")}</div>`).join("")}
      <div class="ex-bar glass"><span id="exN">0 të zgjedhura</span><button class="btn primary" id="exGo" disabled>${icon("plus")}<span>Shto te Rrëfimi</span></button></div>`;
    enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
    const upd = () => { $("#exN").textContent = `${sel.size} të zgjedhura`; $("#exGo").disabled = !sel.size; };
    $$(".ex-q", listPane).forEach((x) => x.addEventListener("click", () => {
      const k = x.dataset.q; sel.has(k) ? sel.delete(k) : sel.add(k);
      x.classList.toggle("on", sel.has(k)); haptic(12); upd();
    }));
    $("#exGo").addEventListener("click", () => {
      pendingConfess = [...sel].map((k) => { const [g, i] = k.split("-").map(Number); return EXAM[g][1][i]; });
      location.hash = "#/rrefimi";
    });
  }

  // ---------- Frymëmarrja e lutjes: Lutja e Jisuit me ritmin e frymës ----------
  // Dy mënyra: "Ritëm" (kohë e caktuar) ose "Mikrofoni" — aplikacioni dëgjon frymën tënde dhe të ndjek ty.
  // Zëri përpunohet vetëm në telefon, në kohë reale: asgjë nuk regjistrohet e nuk ruhet.
  function viewBreath() {
    let mins = store.get("breath.min", 5), mode = store.get("breath.mode", "mic"), run = null;
    const IN_T = "Zot Jisu Krisht, Biri i Perëndisë", OUT_T = "mëshiromë mua mëkatarin";
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Frymëmarrja e lutjes</h1></header>
      <div class="seg br-mode">${[["mic", "🎙 Ndiq frymën time"], ["timer", "⏱ Ritëm i qetë"]].map(([k, l]) => `<button data-mode="${k}" aria-checked="${k === mode}">${l}</button>`).join("")}</div>
      <section class="br-stage">
        <button class="br-orb" id="brOrb" aria-label="Fillo"><i></i><i></i><i></i><span class="br-level" id="brLevel"></span><span class="br-core">${icon("cross")}</span></button>
        <p class="br-word" id="brWord">Prek rrethin për të nisur</p>
        <p class="br-sub" id="brSub"></p>
        <p class="br-meta"><b id="brCount">0</b> lutje · <span id="brLeft">${mins}:00</span></p>
      </section>
      <div class="seg br-seg">${[3, 5, 10, 15].map((n) => `<button data-min="${n}" aria-checked="${n === mins}">${n} min</button>`).join("")}</div>
      <p class="br-total">Gjithsej: <b>${store.get("breath.total", 0)}</b> lutje me frymëmarrje</p>`;
    enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
    const orb = $("#brOrb"), word = $("#brWord"), sub = $("#brSub"), lvl = $("#brLevel");
    const hintIdle = () => { sub.textContent = mode === "mic"
      ? "Mbaje telefonin afër (rreth një pëllëmbë) dhe merr frymë natyrshëm. Kur thith, thuaj në zemër “" + IN_T + "”; kur nxjerr, “" + OUT_T + "”. Zëri nuk regjistrohet."
      : "Thith ngadalë: “" + IN_T + "”. Nxirr ngadalë: “" + OUT_T + "”."; };
    hintIdle();
    $$("[data-min]", listPane).forEach((x) => x.addEventListener("click", () => {
      if (run) return; mins = +x.dataset.min; store.set("breath.min", mins);
      $$("[data-min]", listPane).forEach((y) => y.setAttribute("aria-checked", y === x)); $("#brLeft").textContent = `${mins}:00`;
    }));
    $$("[data-mode]", listPane).forEach((x) => x.addEventListener("click", () => {
      if (run) return; mode = x.dataset.mode; store.set("breath.mode", mode);
      $$("[data-mode]", listPane).forEach((y) => y.setAttribute("aria-checked", y === x)); hintIdle();
    }));
    const setPhase = (ph, ms) => {
      orb.style.setProperty("--d", (ms || 900) + "ms");
      orb.classList.toggle("in", ph === "in"); orb.classList.toggle("out", ph === "out"); orb.classList.toggle("hold", ph === "hold");
      if (ph === "in") word.textContent = IN_T; else if (ph === "out") word.textContent = OUT_T;
    };
    const stop = (finished) => {
      if (!run) return;
      clearTimeout(run.t); clearInterval(run.clock); cancelAnimationFrame(run.raf);
      if (run.stream) run.stream.getTracks().forEach((t) => t.stop());
      if (run.ctx) run.ctx.close().catch(() => {});
      orb.classList.remove("in", "out", "hold", "on", "mic"); lvl.style.transform = "";
      const n = run.n; run = null;
      store.set("breath.total", store.get("breath.total", 0) + n);
      word.textContent = finished ? `Lavdi Perëndisë · ${n} lutje` : "Prek rrethin për të nisur";
      hintIdle();
      if (finished) { goldBurst(); haptic([30, 60, 30, 60, 200], true); }
    };
    const alive = () => run && location.hash.startsWith("#/frymemarrja");
    // --- Ritëm i qetë: 4.5 s thithje, 1.2 s ndalesë, 6.5 s nxjerrje ---
    const timerPhase = () => {
      if (!alive()) return stop(false);
      if (Date.now() >= run.end) return stop(true);
      setPhase("in", 4500); haptic(10);
      run.t = setTimeout(() => {
        if (!run) return; setPhase("hold");
        run.t = setTimeout(() => {
          if (!run) return; setPhase("out", 6500); haptic(10);
          run.t = setTimeout(() => { if (!run) return; run.n++; $("#brCount").textContent = run.n; timerPhase(); }, 6500);
        }, 1200);
      }, 4500);
    };
    // --- Mikrofoni: dallon çdo frymë (zhurmë e butë mbi zhurmën e dhomës) dhe i alternon thithje/nxjerrje ---
    const micStart = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch (e) {
        toast("Mikrofoni nuk u lejua: vazhdojmë me ritmin e qetë");
        mode = "timer"; $$("[data-mode]", listPane).forEach((y) => y.setAttribute("aria-checked", y.dataset.mode === "timer"));
        return timerPhase();
      }
      if (!run) { stream.getTracks().forEach((t) => t.stop()); return; }
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 250;     // pa gumëzhimën e dhomës
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6000;
      const an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.3;
      src.connect(hp); hp.connect(lp); lp.connect(an);
      Object.assign(run, { stream, ctx, an, buf: new Float32Array(an.fftSize), floor: 0, cal: [], calUntil: Date.now() + 1500,
        on: false, phase: "out", burstAt: 0, quietAt: Date.now(), lvl: 0, lastBurst: 0 });
      orb.classList.add("mic");
      word.textContent = "Po dëgjoj zhurmën e dhomës…"; sub.textContent = "Qëndro në heshtje për një çast.";
      const loop = () => {
        if (!alive()) return stop(false);
        if (Date.now() >= run.end) return stop(true);
        run.an.getFloatTimeDomainData(run.buf);
        let sum = 0; for (let k = 0; k < run.buf.length; k++) sum += run.buf[k] * run.buf[k];
        const rms = Math.sqrt(sum / run.buf.length);
        run.lvl = run.lvl * 0.8 + rms * 0.2;
        const now = Date.now();
        if (now < run.calUntil) { run.cal.push(rms); run.raf = requestAnimationFrame(loop); return; }
        if (!run.floor) {
          const c = run.cal.sort((x, y) => x - y); run.floor = c[Math.floor(c.length * 0.5)] || 0.002;
          word.textContent = "Merr frymë…"; sub.textContent = "Kur thith dhe kur nxjerr, rrethi të ndjek ty.";
        }
        if (!run.on) run.floor = run.floor * 0.995 + Math.min(rms, run.floor * 1.5) * 0.005;   // zhurma e dhomës ndryshon ngadalë
        const onT = run.floor * 2.4 + 0.0025, offT = run.floor * 1.6 + 0.0015;
        lvl.style.transform = `scale(${Math.min(1.6, 1 + (run.lvl - run.floor) * 40).toFixed(3)})`;
        if (!run.on && run.lvl > onT && now - run.quietAt > 250) {
          run.on = true; run.burstAt = now;
          run.phase = run.phase === "in" ? "out" : "in";                  // frymët alternohen: thith → nxirr
          setPhase(run.phase, run.phase === "in" ? 2600 : 3600); haptic(8);
        } else if (run.on && run.lvl < offT && now - run.burstAt > 450) {
          run.on = false; run.quietAt = now;
          if (run.phase === "out") { run.n++; $("#brCount").textContent = run.n; }
          else setPhase("hold");
        }
        if (!run.on && now - run.quietAt > 12000) { sub.textContent = "Nuk po dëgjoj frymë: afroje telefonin pak më shumë."; run.quietAt = now - 6000; }
        run.raf = requestAnimationFrame(loop);
      };
      loop();
    };
    orb.addEventListener("click", () => {
      if (run) {
        // në mënyrën me mikrofon: prekja e rrethit gjatë lutjes rregullon fazën (thithje ↔ nxjerrje)
        if (run.an && run.floor) { run.phase = run.phase === "in" ? "out" : "in"; setPhase(run.phase, 1200); haptic(12); return; }
        return stop(false);
      }
      try { if (window.Music && Music.pause) Music.pause(); } catch (e) { /* */ }
      run = { n: 0, end: Date.now() + mins * 60000 };
      orb.classList.add("on"); haptic(25, true);
      run.clock = setInterval(() => {
        if (!run) return;
        const l = Math.max(0, run.end - Date.now());
        $("#brLeft").textContent = `${Math.floor(l / 60000)}:${String(Math.floor(l / 1000) % 60).padStart(2, "0")}`;
      }, 500);
      if (mode === "mic" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) micStart(); else timerPhase();
    });
    // butoni për ta ndalur (në mënyrën me mikrofon prekja e rrethit ndërron fazën)
    $(".br-stage").insertAdjacentHTML("beforeend", `<button class="btn ghost br-stop" id="brStop" hidden>${icon("stop")}<span>Ndalo</span></button>`);
    const stopBtn = $("#brStop");
    stopBtn.addEventListener("click", () => stop(false));
    const obs = setInterval(() => { if (!document.body.contains(stopBtn)) return clearInterval(obs); stopBtn.hidden = !run; }, 400);
  }

  // ================= Kathizma e ditës: i gjithë Psaltiri në 20 ditë =================
  async function viewKathisma(nArg) {
    const ps = await load("psaltiri");
    const K = ps.kathismata || [];
    const st = store.get("kath", { cur: 1, done: [], rounds: 0, last: "" });
    const n = nArg ? Math.min(K.length, Math.max(1, +nArg)) : st.cur;
    const kat = K.find((k) => k.n === n) || K[0];
    const byN = {};
    ps.psalms.forEach((x) => (byN[x.n] = x));
    const pct = st.done.length / K.length;
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Kathizma e ditës</h1></header>
      <section class="kt-hero">
        <div class="kt-ring" style="--p:${pct.toFixed(3)}"><b>${st.done.length}</b><small>/${K.length}</small></div>
        <div class="kt-info"><p class="eyebrow">${st.rounds ? `Rrethi ${st.rounds + 1} i Psaltirit · ${st.rounds} të mbaruara` : "I gjithë Psaltiri në 20 ditë"}</p>
          <h2>${esc(kat.title)}</h2><p>Psalmet ${kat.psalms[0]}–${kat.psalms[kat.psalms.length - 1]}${st.last === isoToday() ? " · sot lexove ✓" : ""}</p></div>
      </section>
      <div class="kt-dots">${K.map((k) => `<a class="kt-dot${st.done.includes(k.n) ? " on" : ""}${k.n === n ? " cur" : ""}" href="#/kathizma/${k.n}" aria-label="${esc(k.title)}">${k.n}</a>`).join("")}</div>
      <article class="kt-read">${kat.psalms.map((pn) => { const x = byN[pn]; if (!x) return ""; return `<section class="kt-ps"><h3>Psalmi ${pn}</h3>${x.title ? `<p class="kt-sup">${esc(x.title)}</p>` : ""}${x.v.map((v, i) => `<p class="kt-v"><sup>${i + 1}</sup>${esc(v)}</p>`).join("")}</section>`; }).join("")}
        <p class="kt-doxa">Lavdi Atit e Birit edhe Shpirtit të Shenjtë, tani e përherë e në jetë të jetëve. Amin.</p></article>
      <div class="kt-end"><button class="btn primary" id="ktDone">${icon("check")}<span>${st.done.includes(n) ? "E lexova përsëri" : "E lexova"}</span></button></div>`;
    enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list");
    $("#ktDone").addEventListener("click", (e) => {
      const s2 = store.get("kath", { cur: 1, done: [], rounds: 0, last: "" });
      if (!s2.done.includes(n)) s2.done.push(n);
      s2.last = isoToday();
      let next = n % K.length + 1;
      for (let k = 0; k < K.length && s2.done.includes(next); k++) next = next % K.length + 1;
      s2.cur = next;
      const r = e.currentTarget.getBoundingClientRect(); goldBurst(r.left + r.width / 2, r.top);
      if (s2.done.length >= K.length) { s2.rounds = (s2.rounds || 0) + 1; s2.done = []; s2.cur = 1; haptic([40, 60, 40, 60, 220], true); toast("☦ E mbarove të gjithë Psaltirin! Lavdi Perëndisë!"); }
      else { haptic([20, 40, 20], true); toast(`Lavdi Perëndisë! Nesër: ${K.find((k) => k.n === s2.cur).title}`); }
      store.set("kath", s2);
      location.hash = "#/kathizma";
      if (!nArg) viewKathisma();
    });
  }

  // ================= Kanuni im i lutjes: lutjet e mëngjesit dhe të mbrëmjes, me kujtesa =================
  const RULE_DEF = { m: [0, 1, 2, 4, 5], e: [0, 2, 9, 11, 13], tm: "07:00", te: "21:00", notif: true, log: {} };
  const ruleGet = () => Object.assign({}, RULE_DEF, store.get("kanuni", {}));
  function ruleStreak(r) {
    let n = 0;
    const d = new Date();
    for (let k = 0; k < 400; k++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const x = r.log[key];
      if (x && (x.m || x.e)) n++; else if (k > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
  async function viewRule(part) {
    const lj = await load("lutjet");
    const P = (lj && lj.prayers) || [];
    const r = ruleGet(), today = isoToday(), tlog = r.log[today] || {};
    const head = `<header class="page-head"><a class="back-btn" href="${part ? "#/kanuni" : "#/shpirti"}" aria-label="Kthehu">${icon("back")}</a><h1>${part === "m" ? "Lutja e mëngjesit" : part === "e" ? "Lutja e mbrëmjes" : "Kanuni im i lutjes"}</h1></header>`;
    const done = () => { enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list"); };
    if (part === "m" || part === "e") {
      const list = (r[part] || []).map((i) => P[i]).filter(Boolean);
      listPane.innerHTML = head + `<article class="ru-read">${list.map((x, i) => `<section class="ru-pr" style="--i:${i}"><h3>${esc(x.t)}</h3><p>${esc(x.x)}</p></section>`).join("") || `<p class="muted">Zgjidh lutjet te “Kanuni im”.</p>`}</article>
        <div class="kt-end"><button class="btn primary" id="ruDone">${icon("check")}<span>${tlog[part] ? "U lutëm ✓" : "Mbarova ☦"}</span></button></div>`;
      done();
      $("#ruDone").addEventListener("click", (e) => {
        const rr = ruleGet(); rr.log[today] = Object.assign({}, rr.log[today], { [part]: true });
        // log-u mbahet vetëm për 400 ditët e fundit
        const keys = Object.keys(rr.log).sort(); while (keys.length > 400) delete rr.log[keys.shift()];
        store.set("kanuni", rr);
        const b = e.currentTarget.getBoundingClientRect(); goldBurst(b.left + b.width / 2, b.top); haptic([20, 40, 20], true);
        toast(part === "m" ? "Mëngjes të bekuar! ☦" : "Natë të qetë në paqen e Zotit 🕊");
        location.hash = "#/kanuni";
      });
      return;
    }
    const streak = ruleStreak(r);
    const pick = (k) => P.map((x, i) => `<label class="ru-ch"><input type="checkbox" data-k="${k}" value="${i}" ${(r[k] || []).includes(i) ? "checked" : ""}><span>${esc(x.t)}</span></label>`).join("");
    listPane.innerHTML = head + `
      <section class="ru-hero"><div class="ru-flame">🔥</div><div><b>${streak}</b> ${streak === 1 ? "ditë" : "ditë"} rresht me lutje<small>${tlog.m && tlog.e ? "Sot u lute mëngjes e mbrëmje ✓" : tlog.m ? "Sot: mëngjesi ✓ · të pret mbrëmja" : tlog.e ? "Sot: mbrëmja ✓" : "Sot ende pa lutje"}</small></div></section>
      <div class="ru-two">
        <a class="ru-card m${tlog.m ? " ok" : ""}" href="#/kanuni/m"><span>🌅</span><b>Mëngjesi</b><small>${(r.m || []).length} lutje · ${esc(r.tm)}</small><em>${tlog.m ? "✓ U lute" : "Fillo ›"}</em></a>
        <a class="ru-card e${tlog.e ? " ok" : ""}" href="#/kanuni/e"><span>🌙</span><b>Mbrëmja</b><small>${(r.e || []).length} lutje · ${esc(r.te)}</small><em>${tlog.e ? "✓ U lute" : "Fillo ›"}</em></a>
      </div>
      <h2 class="hub-h">Lutjet e mëngjesit</h2><div class="ru-list glass">${pick("m")}</div>
      <h2 class="hub-h">Lutjet e mbrëmjes</h2><div class="ru-list glass">${pick("e")}</div>
      <h2 class="hub-h">Kujtesa</h2>
      <section class="ru-set glass">
        <label>Mëngjesi<input type="time" id="ruTm" value="${esc(r.tm)}"></label>
        <label>Mbrëmja<input type="time" id="ruTe" value="${esc(r.te)}"></label>
        <label class="ru-sw"><input type="checkbox" id="ruN" ${r.notif ? "checked" : ""}> Më kujto në telefon</label>
      </section>
      <p class="rr-verse">“Lutuni pa pushim.”<small>1 Thesalonikasve 5:17</small></p>`;
    done();
    const save = () => {
      const rr = ruleGet();
      rr.m = $$('[data-k="m"]:checked', listPane).map((c) => +c.value);
      rr.e = $$('[data-k="e"]:checked', listPane).map((c) => +c.value);
      rr.tm = $("#ruTm").value || "07:00"; rr.te = $("#ruTe").value || "21:00"; rr.notif = $("#ruN").checked;
      store.set("kanuni", rr); Persons.schedule(); haptic(8);
      $$(".ru-card small", listPane).forEach((el, i) => { el.textContent = `${(i ? rr.e : rr.m).length} lutje · ${i ? rr.te : rr.tm}`; });
    };
    $$("input", listPane).forEach((c) => c.addEventListener("change", save));
  }

  // ================= Autori i aplikacionit: Minuel Çollaku · emri i pagëzimit Emanuel =================
  // Kodi nuk ruhet në aplikacion: ruhet vetëm “gjurma” SHA-256 e tij.
  const AUTHOR_HASH = "5d46b92296dad97ebccaa269e22ebe93ba08d7574daa9a9983d4a8e5c1ae8ce9";
  let authorOpen = false;
  async function sha256hex(t) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  const isAuthorName = (n, b) => /^minuel/.test(nrm(n || "")) && /^emanuel/.test(nrm(b || ""));
  function askAuthorCode(then) {
    if ($(".author-sheet")) return;
    const el = document.createElement("div");
    el.className = "sheet update-sheet author-sheet";
    el.innerHTML = `<div class="sheet-card update-card" role="dialog" aria-modal="true">
        <div class="upd-icon">✦</div>
        <h2>Mirë se erdhe, Emanuel</h2>
        <p class="upd-notes">Je autori i aplikacionit? Shkruaj kodin tënd.</p>
        <form id="auForm" class="rr-open"><input id="auCode" class="rr-pin" type="password" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="••••••">
          <button class="btn primary" type="submit">Hyr</button></form>
        <button class="btn upd-later" type="button">Jo tani</button></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    setTimeout(() => $("#auCode", el)?.focus(), 350);
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    $(".upd-later", el).addEventListener("click", close);
    $("#auForm", el).addEventListener("submit", async (e) => {
      e.preventDefault();
      const ok = (await sha256hex("fjala-autori:" + $("#auCode", el).value.trim())) === AUTHOR_HASH;
      if (!ok) { const f = $("#auForm", el); f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); haptic([60, 40, 60], true); $("#auCode", el).value = ""; return; }
      store.set("author", true); authorOpen = true;
      haptic([30, 60, 30, 60, 160], true); goldBurst(); close();
      toast("✦ Mirë se erdhe, autor Emanuel!");
      if (then) then();
    });
  }
  const authorOK = () => store.get("author", false) && isAuthorName(store.get("me.name", ""), store.get("me.bapt", ""));
  // ask=true VETËM kur sapo janë shkruar e ruajtur dy emrat (emri + emri i pagëzimit);
  // në nisje dhe kudo tjetër vetëm kontrollohet: askush nuk e sheh as faqen, as kërkesën për kod.
  function checkAuthor(ask) {
    // po s'janë më emrat e autorit, mënyra e autorit fiket dhe paneli fshihet krejt
    if (!isAuthorName(store.get("me.name", ""), store.get("me.bapt", ""))) { if (store.get("author", false)) store.set("author", false); authorOpen = false; $(".author-sheet")?.remove(); return; }
    if (store.get("author", false) || ask !== true) return;
    askAuthorCode(() => { location.hash = "#/autori"; });
  }
  function backupText() {
    const data = {};
    for (let k = 0; k < localStorage.length; k++) { const key = localStorage.key(k); if (key && key.startsWith("fs.")) data[key] = localStorage.getItem(key); }
    return JSON.stringify({ app: "Fjala e Shenjtë", version: APP_VERSION, at: new Date().toISOString(), data }, null, 1);
  }
  function saveBackup(silent) {
    const d = new Date(), name = `fjala-kopje-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
    const text = backupText();
    if (android && android.saveBackup) android.saveBackup(text, name);
    else Share.download(new Blob([text], { type: "application/json" }), name);
    store.set("author.lastBackup", Date.now()); store.set("author.dirty", false);
    if (!silent && !android) toast("Kopja u ruajt");
  }
  function viewAuthor() {
    const head = `<header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>Paneli i autorit</h1>${authorOpen ? `<button class="icon-btn" id="auLock" aria-label="Mbyll">🔒</button>` : ""}</header>`;
    const done = () => { enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list"); };
    if (!authorOK()) { location.replace("#/shpirti"); return; }      // për të gjithë të tjerët faqja nuk ekziston
    if (!authorOpen) {
      listPane.innerHTML = head + `<section class="au-hero"><div class="au-mark">✦</div><h2>Vetëm për autorin</h2><p>Shkruaj kodin për të hyrë.</p>
        <button class="btn primary" id="auIn">${icon("check")}<span>Shkruaj kodin</span></button></section>`;
      done();
      $("#auIn").addEventListener("click", () => askAuthorCode(viewAuthor));
      return;
    }
    const log = store.get("author.log", []);
    const last = store.get("author.lastBackup", 0);
    const q = store.get("quiz2", { gap: 0, order: 0 });
    const stats = [
      ["🕯", "Qirinj të ndezur", candles().length], ["📿", "Lutje me komboskini", store.get("rope." + pid, 0)],
      ["◎", "Lutje me frymëmarrje", store.get("breath.total", 0)], ["☦", "Kungime të shënuara", store.get("kungimi", []).length],
      ["🎮", "Rekordi i lojës", Math.max(q.gap || 0, q.order || 0)], ["👤", "Persona për ditën e emrit", Persons.all().length],
      ["♥", "Pëlqime", (store.get("likes", []) || []).length], ["✎", "Shënime në ditar", log.length],
    ];
    listPane.innerHTML = head + `
      <section class="au-hero open"><div class="au-mark">✦</div><h2>Minuel Çollaku</h2><p>Emri i pagëzimit: Emanuel · autori i “Fjala e Shenjtë” · v${esc(APP_VERSION)}</p></section>
      <h2 class="hub-h">Ditari im si autor</h2>
      <form class="rr-add glass" id="auAdd"><textarea id="auText" rows="3" maxlength="1500" placeholder="Çfarë bëra sot në aplikacion, çfarë dua të shtoj…"></textarea>
        <button class="btn primary" type="submit">${icon("plus")}<span>Shto në ditar</span></button></form>
      <ul class="rr-list">${log.map((x, i) => `<li class="glass" style="--i:${i}"><span class="rr-dot au-dot"></span><p><small class="au-when">${esc(new Date(x.at).toLocaleString("sq-AL"))}</small><br>${esc(x.t)}</p><button class="icon-btn small" data-adel="${i}" aria-label="Fshi">${icon("close")}</button></li>`).join("")}</ul>
      <h2 class="hub-h">Kopja rezervë (mos humbë asgjë)</h2>
      <section class="au-card glass"><p>Ruan <b>gjithçka</b>: ditarin, qirinjtë, personat, kungimet, shënimet, Rrëfimin (të koduar), cilësimet. Skedari shkon te <b>Download / Fjala e Shenjte</b> dhe mbetet edhe po ta fshish aplikacionin.</p>
        <p class="muted">${last ? "Kopja e fundit: " + esc(new Date(last).toLocaleString("sq-AL")) : "Ende asnjë kopje."}</p>
        <div class="row au-row"><button class="btn primary" id="auSave">${icon("download")}<span>Ruaj kopjen</span></button>
          <label class="btn" for="auFile">${icon("refresh")}<span>Rikthe nga kopja</span></label><input type="file" id="auFile" accept=".json,application/json" hidden></div></section>
      <h2 class="hub-h">Statistikat e mia</h2>
      <div class="au-stats">${stats.map(([e, l, v]) => `<div class="au-stat glass"><span>${e}</span><b>${v}</b><small>${l}</small></div>`).join("")}</div>
      <h2 class="hub-h">Mjetet e autorit</h2>
      <div class="au-tools">
        <button class="btn" id="auUpd">${icon("refresh")}<span>Kontrollo përditësimin</span></button>
        <button class="btn" id="auCache">${icon("close")}<span>Pastro cache-t</span></button>
      </div>`;
    done();
    const persist = (l) => { store.set("author.log", l); store.set("author.dirty", true); viewAuthor(); };
    $("#auLock").addEventListener("click", () => { authorOpen = false; haptic(20); viewAuthor(); });
    $("#auAdd").addEventListener("submit", (e) => {
      e.preventDefault();
      const t = $("#auText").value.replace(/\s+$/g, "").trim();
      if (!t) return;
      const l = store.get("author.log", []); l.unshift({ t, at: Date.now() }); haptic(14); persist(l);
      // kopje automatike një herë në ditë kur ditari ndryshon
      if (Date.now() - store.get("author.lastBackup", 0) > 864e5) saveBackup(true);
    });
    $$("[data-adel]", listPane).forEach((b) => b.addEventListener("click", () => {
      if (!confirm("Ta fshish këtë shënim nga ditari?")) return;
      const l = store.get("author.log", []); l.splice(+b.dataset.adel, 1); persist(l);
    }));
    $("#auSave").addEventListener("click", () => { haptic([15, 30, 15]); saveBackup(false); setTimeout(viewAuthor, 400); });
    $("#auFile").addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (!j || j.app !== "Fjala e Shenjtë" || !j.data) throw new Error("skedar i panjohur");
        if (!confirm(`Të rikthehen të dhënat nga kopja e ${new Date(j.at).toLocaleString("sq-AL")}? Të dhënat e tanishme zëvendësohen.`)) return;
        Object.entries(j.data).forEach(([k, v]) => { if (k.startsWith("fs.")) localStorage.setItem(k, v); });
        toast("U rikthye ✓"); setTimeout(() => location.reload(), 600);
      } catch (err) { toast("Kopja nuk u lexua"); }
    });
    $("#auUpd").addEventListener("click", () => { toast("Po kontrolloj…"); checkAppUpdate(); });
    $("#auCache").addEventListener("click", async () => {
      try { for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* */ }
      freeIcons(); toast("Cache-t u pastruan ✓");
    });
  }

  // ---------- Shpirti: të gjitha veçoritë në një vend ----------
  function viewSpirit() {
    const nf = nextFeasts()[0], nfDays = Math.ceil((nf.d - Date.now()) / 864e5);
    const kg = store.get("kungimi", []), ch = store.get("ch40", null);
    const LOCK = ["#/rrefimi", "#/shqyrtimi", "#/kungimi"];
    const tile = (cls, href, ico, title, sub, i) => {
      const lk = unbaptized() && LOCK.includes(href);
      return `<a class="ftile ${cls}${lk ? " locked" : ""}" href="${href}" style="--i:${i}">${ico}<strong>${title}</strong><span>${lk ? "🔒 Pas Pagëzimit" : sub}</span></a>`;
    };
    let i = 0;
    listPane.innerHTML = `
      <header class="page-head"><h1>Shpirti</h1>${themeBtn()}${profileChip()}</header>
      <section class="sp-hero">
        <div class="sp-aura" aria-hidden="true"><i></i><i></i><i></i></div>
        <p class="sp-greet">${esc(greeting())}</p>
        <p class="sp-verse">“Lutuni pa pushim.”<small>1 Thesalonikasve 5:17</small></p>
        ${authorOK() ? `<a class="sp-author" href="#/autori">✦ Paneli i autorit</a>` : ""}
      </section>
      ${Streak.html()}
      <h2 class="hub-h">Lutja</h2>
      <div class="feat-tiles hub">
        ${tile("rope-t2", "#/komboskini", `<svg class="pt-ico"><use href="#i-cross"/></svg>`, "Komboskini", "Lutja e Jisuit · me zë", i++)}
        ${tile("candle-t", "#/lutja", flameHtml(false), "Qiriri & Temjanica", candles().length ? candles().length + " qirinj ndezur" : "24 orë · zilet · temjani", i++)}
        ${tile("br-t", "#/frymemarrja", `<span class="ft-orb"></span>`, "Frymëmarrja e lutjes", "Lutja me ritmin e frymës", i++)}
        ${tile("rule-t", "#/kanuni", `<span class="ft-emo">🌅</span>`, "Kanuni im i lutjes", (() => { const r = ruleGet(), t = r.log[isoToday()] || {}; return t.m && t.e ? "Sot ✓ mëngjes e mbrëmje" : `Mëngjes ${r.tm} · mbrëmje ${r.te}`; })(), i++)}
        ${tile("kt-t", "#/kathizma", icon("lyre"), "Kathizma e ditës", (() => { const k = store.get("kath", { done: [] }); return `${k.done.length}/20 · Psaltiri në 20 ditë`; })(), i++)}
        ${tile("dipt-t", "#/diptiket", icon("book"), "Diptikët", "Emrat për lutje", i++)}
        ${tile("east-t", "#/lindja", icon("compass"), "Drejt Lindjes", "Busulla e lutjes", i++)}
      </div>
      <h2 class="hub-h">Shtëpia e lutjes</h2>
      <div class="feat-tiles hub">
        ${tile("kd-t", "#/kandili", `<span class="ft-emo">🪔</span>`, "Kandili i shtëpisë", (() => { const k = kandilState(); return k.on ? `Ndriçon · vaj ${Math.round(k.oil * 100)}%` : "Ndize para ikonës"; })(), i++)}
        ${tile("oz-t", "#/ora", `<span class="ft-emo">🕰</span>`, "Ora Bizantine", (() => { try { const l = store.get("ora.loc", { lat: 41.3275, lng: 19.8187 }), b = byzNow(Date.now(), l.lat, l.lng); return `${b.cur.ic} ${b.cur.n} · ora ${b.h} e ${b.isDay ? "ditës" : "natës"}`; } catch (e) { return "Koha sipas Kishës"; } })(), i++)}
        ${tile("kb-t", "#/kambanorja", `<span class="ft-emo">🔔</span>`, "Kambanorja", "Bjeri kambanave me litar", i++)}
      </div>
      <h2 class="hub-h">Pendimi dhe Kungimi</h2>
      <div class="feat-tiles hub">
        ${tile("rr-t", "#/rrefimi", `<span class="ft-emo">🔒</span>`, "Rrëfimi", "Shënime me kod për atin shpirtëror", i++)}
        ${tile("ex-t", "#/shqyrtimi", icon("pen"), "Shqyrtimi i ndërgjegjes", "Përgatitje për Rrëfim", i++)}
        ${tile("kg-t", "#/kungimi", icon("cross"), "Ditari i Kungimit", kg.length ? kg.length + " kungime" : "Ditari i kungimeve", i++)}
      </div>
      <h2 class="hub-h">Kremtet</h2>
      <div class="feat-tiles hub">
        ${tile("cd-t", "#/numerimi", `<b class="ft-days">${nfDays}</b>`, "Deri në festë", esc(nf.name), i++)}
        ${tile("name-t", "#/emri", icon("calendar"), "Dita e emrit", Persons.all().length ? Persons.all().length + " persona" : "Kur feston emri yt", i++)}
      </div>
      <h2 class="hub-h">Ushqim për shpirtin</h2>
      <div class="feat-tiles hub">
        ${tile("soul-t", "#/mjekesia", `<span class="ft-emo">🕊</span>`, "Mjekësia e Shpirtit", "Si ndihesh sot?", i++)}
        ${tile("draw-t", "#/fjala", `<span class="ft-card"><svg><use href="#i-cross"/></svg></span>`, "Fjala për ty", "3 fjalë në ditë", i++)}
        ${tile("ch-t", "#/sfida", `<b class="ft-days">${ch ? Object.keys(ch.done).length + "/40" : "40"}</b>`, "Sfida 40 ditëshe", "Një hap në ditë", i++)}
        ${tile("gr-t", "#/lavdi", icon("heart"), "Lavdi për të gjitha", "3 falënderime në ditë", i++)}
        ${tile("sb-t", "#/superlibri", `<span class="ft-emo">📺</span>`, "Superlibri për fëmijë", "49 episode · 4 sezone", i++)}
        ${tile("bq-t", "#/udhetimi", `<span class="ft-emo">📖</span>`, "Udhëtimi në Shkrim", (() => { const q = store.get("bq", null); return q ? `Niveli ${q.lvl}/1000 · ${"❤".repeat(Math.max(0, Math.min(5, q.lives)))}` : "Kuiz me 1000 nivele"; })(), i++)}
        ${tile("quiz-t", "#/kuiz", icon("lyre"), "Loja e Psaltirit", (() => { const b2 = store.get("quiz2", { gap: 0, order: 0 }); return Math.max(b2.gap, b2.order) ? "🏆 " + Math.max(b2.gap, b2.order) : "Nivele · kohë · zemra"; })(), i++)}
      </div>`;
    $("#profileChip")?.addEventListener("click", Profiles.open);
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }
  // Të miat: Pëlqyerat dhe Shënimet në një skedë
  function mineSeg(active) {
    const h = $(".page-head", listPane);
    if (!h || $(".mine-seg", listPane)) return;
    h.insertAdjacentHTML("afterend", `<div class="seg mine-seg"><a class="seg-a" href="#/pelqyerat" aria-checked="${active === "pelqyerat"}">${icon("heart")} Pëlqyerat</a><a class="seg-a" href="#/shenime" aria-checked="${active === "shenime"}">${icon("pen")} Shënimet</a></div>`);
  }

  // ---------- Shërbesa e së Dielës: Tipikoja + Tetëtingullshi + shërbesat e plota ----------
  const TONE_FULL = ["", "Tingulli i Parë", "Tingulli i Dytë", "Tingulli i Tretë", "Tingulli i Katërt", "Tingulli Tërthor i Parë", "Tingulli Tërthor i Dytë", "Tingulli i Rëndë", "Tingulli Tërthor i Katërt"];
  const KAL_TONE = { I: 1, II: 2, III: 3, IV: 4, R: 7 };
  // Çfarë psalet saktësisht: (1) himnet që Tipikoja i citon me fillimin e tyre (“…”);
  // (2) pjesët e tingullit vetëm kur Tipikoja i kërkon, me numrin e saktë të vargëzimeve.
  const OKTO_RULES = [
    { re: /(\d+)\s+Vargëzimet ngjallësore/i, part: "mbr", keys: ["thirrtoret"], count: true },
    { re: /PASVARGJET ngjallësore/i, part: "mbr", keys: ["pasvargjet"] },
    { re: /NDENJËSORET ngjallësore/i, part: "men", keys: ["ndenjesoret1", "ndenjesoret2", "ndenjesoret3"] },
    { re: /DËGJIMI/, part: "men", keys: ["degjimi"] },
    { re: /SHKALLESAT/, part: "men", keys: ["shkallesat"] },
    { re: /PARAVARGU[^.]*të tingullit/i, part: "men", keys: ["paravargu"] },
    { re: /SHKURTORJA[^.]*të tingullit/i, part: "men", keys: ["shkurtorja", "shtepia"] },
    { re: /LAVDËRIMET:?\s*(\d+)\s+Vargëzimet ngjallësore/i, part: "men", keys: ["lavderimet"], count: true },
  ];
  const nrmH = (t) => nrm(t).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  // ---------- Shërbesa e plotë e së Dielës (si DCS): teksti i shërbesës + himnet e ditës në vendin e tyre ----------
  const TING_RE = [null, /^Ting\.\s*I$/, /^Ting\.\s*II$/, /^Ting\.\s*III$/, /^Ting\.\s*IV$/, /^Ting\.\s*Tërth?\.\s*I$/, /^Ting\.\s*Tërth?\.\s*II$/, /^Ting\.\s*i Rëndë$/, /^Ting\.\s*Tërth?\.\s*IV$/];
  const UM_ORD = { "Tretë": 3, "Katërt": 4, "Pestë": 5, "Gjashtë": 6, "Shtatë": 7, "Tetë": 8, "Nëntë": 9, "Dhjetë": 10, "Njëmbëdhjetë": 11, "Parë": 1, "Dytë": 2 };
  const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11 };
  // mban vetëm tingullin e javës aty ku libri jep të tetë tingujt
  function keepTone(blocks, tone) {
    const isT = (b) => b.t === "h" && /^Ting\./.test(b.x);
    const out = [];
    for (let i = 0; i < blocks.length; i++) {
      if (!isT(blocks[i])) { out.push(blocks[i]); continue; }
      let j = i; const groups = [];
      while (j < blocks.length && isT(blocks[j])) {
        let k = j + 1;
        while (k < blocks.length && !isT(blocks[k]) && blocks[k].t !== "h" && blocks[k].t !== "rubric") k++;
        groups.push([j, k]); j = k;
      }
      if (groups.length >= 3) { groups.forEach(([a, b]) => { if (TING_RE[tone].test(blocks[a].x.trim())) out.push(...blocks.slice(a, b)); }); }
      else out.push(...blocks.slice(i, j));
      i = j - 1;
    }
    return out;
  }
  function cutRange(blocks, startFn, endFn) {
    const a = blocks.findIndex(startFn);
    if (a < 0) return blocks;
    const b = blocks.findIndex((x, i) => i > a && endFn(x));
    return b < 0 ? blocks : blocks.slice(0, a).concat(blocks.slice(b));
  }
  async function composeSunday(kind, sun, tone, T, kd) {
    const sh = await load("sherbesa");
    const find = (title) => { for (const s of sh.sections) { const it = s.items.find((x) => x.title === title); if (it) return it; } return null; };
    const base = find(kind === "mbr" ? "Mbrëmësorja Kremtuese" : "Mëngjesorja e së Dielës");
    if (!base) return "";
    let B = base.blocks.slice();
    if (kind === "mbr") {
      // e shtuna mbrëma: vetëm paravargu i së shtunës; pa paravargjet e ditëve të tjera dhe të të kremteve
      B = cutRange(B, (b) => /^Të dielën në mbrëmje/.test(b.x), (b) => b.t === "rubric" && /^Pas paravargut/.test(b.x));
    } else if (!(window.Music && Music.liturgy && Music.liturgy(sun).period === "triodi")) {
      // troparet e së dielave të Triodit vetëm në Triod
      B = cutRange(B, (b) => b.t === "rubric" && /^Gjatë të dielave të Triodit/.test(b.x), (b) => b.t === "rubric" && /^Pastaj Dhjaku thotë/.test(b.x));
    }
    B = keepTone(B, tone);
    // Përlëshorja dhe Hyjlindësorja e tingullit: teksti fiks nga Tetëtingullshi (jo nga libri i shërbesës)
    {
      let grp = "";
      const okP = (k) => { const sc = T.sections.find((x) => x.k === k); return sc ? sc.blocks.filter((b) => b.t === "p").map((b) => b.x) : []; };
      const per = okP("perleshorja"), hyj = okP("hyjlindesorja");
      for (let i = 0; i < B.length; i++) {
        const b = B[i];
        if ((b.t === "h" || b.t === "p") && /^Përlëshoret/i.test(b.x)) grp = "per";
        else if ((b.t === "h" || b.t === "p") && /^Hyjlindësoret/i.test(b.x)) grp = "hyj";
        else if (b.t === "h" && /^Ting\./.test(b.x) && grp && B[i + 1] && B[i + 1].t === "p") {
          const src = grp === "per" ? per : hyj;
          if (src.length) B.splice(i + 1, 1, ...src.map((x) => ({ t: "p", x })));
          grp = "";
        } else if (b.t === "rubric" || (b.t === "h" && !/^Ting\./.test(b.x))) grp = "";
      }
    }
    const shown = new Set();
    const box = (title, src, blocks, open = true) => `<details class="okto"${open ? " open" : ""}><summary>${icon("music")} ${esc(title)} <small>${esc(src)}</small></summary>
      ${blocks.map((b) => (b.t === "sub" ? `<p class="okto-sub">${esc(b.x)}</p>` : `<p class="okto-p">${versify(b.x)}</p>`)).join("")}</details>`;
    const okto = (k, count) => {
      const sc = T.sections.find((x) => x.k === k);
      if (!sc) return "";
      let n = 0, blocks = sc.blocks.filter((b) => b.t === "sub" || !count || ++n <= count);
      while (blocks.length && blocks[blocks.length - 1].t === "sub") blocks = blocks.slice(0, -1);
      blocks.forEach((b) => shown.add(b.x));
      return box(sc.title + (count ? ` (${count})` : ""), "Nga Tetëtingullshi · " + TONE_FULL[tone], blocks);
    };
    const ins = [];   // [kushti mbi bllokun, html, pas/para]
    if (kind === "mbr") {
      // e shtuna mbrëma: vetëm paravargu i së shtunës; pa vargjet e të kremteve
      B = cutRange(B, (b) => b.t === "rubric" && /^Gjatë të kremteve Zotërore dhe Hyjlindësore, psalen vargjet/.test(b.x), (b) => b.t === "rubric" && /lavdia se së kremtes/.test(b.x));
      ins.push([(b) => b.t === "rubric" && /^Dhe psalet Hyjlindësorja\.\s*Të shtunën/.test(b.x), okto("dogmatiku"), "after"]);
      // ---- “O Zot thirra”: të dielën nis gjithmonë nga “Nxirr shpirtin tim prej burgut” (10 vargje) ----
      const tpd = (() => { const tp = data.tipikoja; const sc = tp && sun.getFullYear() === 2026 ? tp.sections[sun.getMonth()] : null; return sc ? sc.items.find((x) => parseInt(x.title, 10) === sun.getDate()) : null; })();
      const instr = tpd ? tpd.blocks.map((b) => b.x).join(" ") : "";
      const mm = /(\d+)\s+Vargëzimet ngjallësore(?:,\s*që bëhen\s+(\d+))?/i.exec(instr);
      const nSt = mm ? +mm[1] : 7, nSlots = mm && mm[2] ? +mm[2] : nSt;
      const thSec = T.sections.find((x) => x.k === "thirrtoret");
      const st = thSec ? thSec.blocks.filter((b) => b.t === "p").slice(0, nSt).map((b) => b.x) : [];
      const slots = st.length ? Array(Math.max(0, nSlots - st.length)).fill(st[0]).concat(st) : [];   // “i pari 2 herë”
      const a0 = B.findIndex((b) => b.t === "rubric" && /^Kur ka dhjetë vargje/.test(b.x));
      const a1 = B.findIndex((b, i) => i > a0 && /^Lavdi Atit e Birit edhe Shpirtit të Shenjtë\.$/.test(b.x.trim()));
      if (a0 >= 0 && a1 > a0) {
        const verses = B.slice(a0, a1).filter((b) => b.t === "p").flatMap((b) => b.x.split(/(?<=[.!?])\s+(?=[A-ZËÇ])/));
        let html = `<p class="blk-rubric">Të dielën vargëzimet nisin nga vargu i dhjetë, sipas Tipikosë: ${nSt} vargëzime ngjallësore${nSlots > nSt ? `, që bëhen ${nSlots} (i pari dy herë)` : ""}.</p>`;
        verses.forEach((v, i) => {
          html += `<p class="verse para thv"><span class="vl"><b class="vlab">Varg ${10 - i}:</b> ${esc(v)}</span></p>`;
          html += i < slots.length ? `<div class="okto-st"><span class="okto-src">${icon("music")} Tetëtingullshi · ${esc(TONE_FULL[tone])}</span><p class="okto-p">${versify(slots[i])}</p></div>`
            : `<p class="okto-miss">Vargëzim i shenjtorit të ditës (nga Mineu).</p>`;
        });
        B.splice(a0, a1 - a0, { t: "html", html });
      }
      // ---- Pasvargjet: i pari pa varg, nga i dyti me vargjet “Zoti mbretëroi…” ----
      const pv = B.findIndex((b) => /^Vargu i pare: Zoti mbretëroi/.test(b.x));
      const pvSec = T.sections.find((x) => x.k === "pasvargjet");
      if (pv >= 0 && pvSec) {
        const pverses = B[pv].x.split(/Vargu i (?:pare|parë|dytë|tretë):\s*/).map((x) => x.trim()).filter(Boolean);
        const sts = []; let tail = [];
        pvSec.blocks.forEach((b) => { if (tail.length || b.t === "sub") tail.push(b); else sts.push(b.x); });
        let html = "";
        sts.forEach((x, i) => {
          if (i > 0 && pverses[i - 1]) html += `<p class="verse para thv"><span class="vl"><b class="vlab">Varg ${i}:</b> ${esc(pverses[i - 1])}</span></p>`;
          html += `<div class="okto-st"><span class="okto-src">${icon("music")} Tetëtingullshi · ${esc(TONE_FULL[tone])}</span><p class="okto-p">${versify(x)}</p></div>`;
        });
        tail.forEach((b) => { html += b.t === "sub" ? `<p class="okto-sub">${esc(b.x)}</p>` : `<div class="okto-st"><p class="okto-p">${versify(b.x)}</p></div>`; });
        B.splice(pv, 1, { t: "html", html });
      }
    } else {
      ins.push([(b) => b.t === "rubric" && /psalen ndenjësoret e tingullit/.test(b.x), okto("ndenjesoret1") + okto("ndenjesoret2") + okto("ndenjesoret3"), "after"]);
      ins.push([(b) => b.t === "rubric" && /lexon dëgjimin e tingullit/.test(b.x), okto("degjimi") + okto("shkallesat") + okto("paravargu"), "after"]);
      // shkurtorja, shtëpia dhe sinaksari i ditës
      const sx = await sxDay(sun.getMonth() + 1, sun.getDate());
      const sxHtml = sx ? box(`Sinaksari · ${sun.getDate()} ${MUAJ_G[sun.getMonth()]}`, "Nga Sinaksari", sx.blocks.filter((b) => ["intro", "li", "end"].includes(b.t)).map((b) => ({ t: "p", x: b.x }))) : "";
      ins.push([(b) => b.t === "rubric" && /lexohet shkurtorja dhe shtëpia/.test(b.x), okto("shkurtorja") + okto("shtepia") + sxHtml, "after"]);
      // Ungjilli mëngjesor sipas numrit në kalendar (ose tingullit)
      const um = kd && kd.um ? ROMAN[kd.um] : 0;
      if (um) {
        const u = await load("ungjilli");
        const sec = u.sections.find((s) => /Mëngjesor/.test(s.title));
        const it = sec && sec.items.find((x) => { const m = /Mëngjesor i (\S+)/.exec(x.title); return m && UM_ORD[m[1]] === um; });
        ins.push([(b) => b.t === "rubric" && /Prifti lexon Ungjillin e Mëngjesores/.test(b.x),
          it ? box(`${it.title}${it.ref ? " · " + it.ref : ""}`, "Ungjilli Mëngjesor " + kd.um, it.v.map((x) => ({ t: "p", x })))
             : `<p class="okto-miss">Ungjilli Mëngjesor ${esc(kd.um)}: teksti nuk është ende në aplikacion.</p>`, "after"]);
      }
      ins.push([(b) => /^Do të të lavdëroj me gjithë zemër, o Zot/.test(b.x), okto("lavderimet", 8), "after"]);
      // Dërgimsorja dhe Lavdia mëngjesore sipas Ungjillit mëngjesor (fundi i Tetëtingullshit)
      const eo = (await load("tetetingullshi")).eothina;
      if (um && eo) {
        const dg = eo.dergimsore[um - 1], lv = eo.lavdi[um - 1];
        if (dg) ins.push([(b) => b.t === "rubric" && /psalet dërgimsorja e Ngjalljes/.test(b.x),
          box(`Dërgimsorja ngjallësore ${kd.um}`, (eo.mel || "") + " · Tetëtingullshi", [{ t: "p", x: dg.x }, { t: "sub", x: "Lavdi dhe tani · Hyjlindësorja" }, { t: "p", x: dg.theo }]), "after"]);
        if (lv) ins.push([(b) => b.t === "rubric" && /psalet lavdia mëngjesore/.test(b.x),
          box(`Lavdia mëngjesore ${kd.um}`, lv.tone + " · Tetëtingullshi", [{ t: "p", x: lv.x }]), "after"]);
      }
    }
    // ndërthur
    const segs = []; let cur = [];
    const used = new Set();
    B.forEach((b) => {
      if (b.t === "html") { segs.push(cur); cur = []; segs.push(b.html); return; }
      const hit = ins.find((x, i) => !used.has(i) && x[0](b));
      if (!hit) { cur.push(b); return; }
      used.add(ins.indexOf(hit));
      if (hit[2] === "before") { segs.push(cur); cur = []; segs.push(hit[1]); cur.push(b); }
      else { cur.push(b); segs.push(cur); cur = []; segs.push(hit[1]); }
    });
    segs.push(cur);
    return segs.map((s) => (typeof s === "string" ? s : blocksHtml("sherbesa", s, { priest: true }))).join("");
  }

  function sundayFor(base) {
    const d = new Date(base || Date.now());
    d.setHours(12, 0, 0, 0);
    if (d.getDay() !== 0) d.setDate(d.getDate() + (7 - d.getDay()));
    return d;
  }
  let sunTab = null;
  async function viewSunday(isoStr, tabArg) {
    const [okto, tp, sh] = await Promise.all([load("tetetingullshi"), load("tipikoja"), load("sherbesa"), load("kalendari")]);
    const sun = isoStr ? new Date(isoStr + "T12:00:00") : sundayFor();
    const kd = calDay(sun);
    const tone = (kd && KAL_TONE[kd.t]) || (window.Music && Music.liturgy ? Music.liturgy(sun).tone : 1);
    const T = okto.tones[tone - 1];
    const sec = sun.getFullYear() === 2026 ? tp.sections[sun.getMonth()] : null;
    const ii = sec ? sec.items.findIndex((x) => parseInt(x.title, 10) === sun.getDate()) : -1;
    const it = ii >= 0 ? sec.items[ii] : null;
    const f = Fast.info(sun);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date();
    const tab = tabArg || sunTab || (now.getDay() === 6 && now.getHours() >= 12 ? "mbr" : "men");
    sunTab = tab;
    const prev = new Date(sun); prev.setDate(prev.getDate() - 7);
    const next = new Date(sun); next.setDate(next.getDate() + 7);
    const shIdx = (title) => { for (let a = 0; a < sh.sections.length; a++) { const b = sh.sections[a].items.findIndex((x) => x.title === title); if (b >= 0) return `#/sherbesa/${a}/${b}`; } return "#/sherbesa"; };
    const hymnBox = (title, blocks, open) => `<details class="okto"${open ? " open" : ""}><summary>${icon("music")} ${esc(title)} <small>${esc(TONE_FULL[tone])}</small></summary>
        ${blocks.map((b) => (b.t === "sub" ? `<p class="okto-sub">${esc(b.x)}</p>` : `<p class="okto-p">${versify(b.x)}</p>`)).join("")}</details>`;
    // gjej himnin sipas fillimit të cituar në Tipikojë
    const allP = [];
    T.sections.forEach((sc) => sc.blocks.forEach((b) => { if (b.t === "p") allP.push({ sc, b, n: nrmH(b.x) }); }));
    const findHymn = (inc) => {
      const w = nrmH(inc).split(" ").filter(Boolean).slice(0, 4).join(" ");
      if (w.length < 8) return null;
      return allP.find((h) => h.n.startsWith(w)) || null;
    };
    const shown = new Set();
    const sectionHtml = (k, count) => {
      const sc = T.sections.find((x) => x.k === k);
      if (!sc) return "";
      let blocks = sc.blocks;
      if (count) { let n = 0; blocks = blocks.filter((b) => b.t === "sub" || ++n <= count); }
      blocks = blocks.filter((b) => b.t === "sub" || !shown.has(b.x));
      blocks.forEach((b) => b.t === "p" && shown.add(b.x));
      // mos lër titujt e vegjël pa himn pas tyre
      while (blocks.length && blocks[blocks.length - 1].t === "sub") blocks = blocks.slice(0, -1);
      return blocks.some((b) => b.t === "p") ? hymnBox(sc.title + (count ? ` (${count})` : ""), blocks, true) : "";
    };
    let part = "mbr";
    const body = it ? it.blocks.map((b) => {
      if (b.t === "saints") return `<p class="blk-saints">${esc(b.x)}</p>`;
      if (b.t === "fast") return `<p class="blk-fast">${esc(b.x)}</p>`;
      if (b.t === "h") {
        part = /Mëngjesore/i.test(b.x) ? "men" : /Liturgji/i.test(b.x) ? "lit" : /Mbrëmësore/i.test(b.x) ? "mbr" : part;
        const link = part === "mbr" ? shIdx("Mbrëmësorja Kremtuese") : part === "men" ? shIdx("Mëngjesorja e së Dielës") : "";
        return `<h3 class="blk-h sun-h">${esc(b.x)}${link ? `<a class="sun-full" href="${link}">${icon("book")} Teksti i plotë me pjesët e priftit</a>` : ""}</h3>`;
      }
      let extra = "";
      const before = new Set(shown);
      // (2) pjesët e tingullit që kërkon Tipikoja
      OKTO_RULES.forEach((r) => {
        if (r.part !== part) return;
        const m = r.re.exec(b.x);
        if (!m) return;
        r.keys.forEach((k) => { extra += sectionHtml(k, r.count ? +m[1] : 0); });
      });
      // (1) himnet e cituara: “Dërrmove vdekjen...” etj.
      [...b.x.matchAll(/[“"]([^”"]{6,}?)(?:\.\.\.|…)?[”"]/g)].forEach((mm) => {
        const h = findHymn(mm[1]);
        if (!h) return;
        if (shown.has(h.b.x) && !before.has(h.b.x)) return;   // u shfaq sapo, te kjo udhëzim
        if (shown.has(h.b.x)) { extra += `<details class="okto again"><summary>${icon("music")} ${esc(mm[1].replace(/\.+$/, ""))}… <small>si më lart</small></summary><p class="okto-p">${esc(h.b.x)}</p></details>`; return; }
        shown.add(h.b.x);
        extra += hymnBox(h.sc.title, [{ t: "p", x: h.b.x }], true);
      });
      return `<p class="verse para">${kwHtml(b.x)}</p>${extra}`;
    }).join("") : `<div class="empty"><p>Tipikoja e kësaj të diele nuk është në aplikacion (vetëm viti 2026). Më poshtë janë himnet ngjallësore të tingullit.</p></div>
        ${T.sections.map((sc) => sectionHtml(sc.k, 0)).join("")}`;
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/shpirti" aria-label="Kthehu">${icon("back")}</a><h1>E Diela</h1></header>
      <section class="sun-hero">
        <p class="eyebrow">${sun.getDate()} ${MUAJ_G[sun.getMonth()]} ${sun.getFullYear()}</p>
        <h2>${esc(kd ? (/^[^.]*\.(?:\s*\([^)]*\))?/.exec(kd.x) || [kd.x])[0].replace(/(\d+) LLK\./, "E Diela e $1-të e Llukait") : f.feast || "E Diela")}</h2>
        <div class="sun-tone">${icon("music")} <b>${esc(TONE_FULL[tone])}</b>${kd && kd.um ? ` · Ungjilli Mëngjesor ${esc(kd.um)}` : ""}</div>
        ${kd && kd.ap ? `<p class="sun-reads">Apostulli: <b>${esc(kd.ap)}</b> · Ungjilli: <b>${esc(kd.ev)}</b></p>` : ""}
        <nav class="sun-nav"><a class="btn" href="#/edjela/${iso(prev)}/${tab}">${icon("back")} ${prev.getDate()} ${MUAJ_G[prev.getMonth()].slice(0, 3)}</a>
          <a class="btn" href="#/edjela/${iso(next)}/${tab}">${next.getDate()} ${MUAJ_G[next.getMonth()].slice(0, 3)} <svg style="transform:scaleX(-1)"><use href="#i-back"/></svg></a></nav>
      </section>
      <div class="seg sun-seg">${[["mbr", "Mbrëmësorja e Madhe"], ["men", "Mëngjesorja"], ["tip", "Tipikoja"]].map(([k, l]) => `<a class="seg-a" href="#/edjela/${iso(sun)}/${k}" aria-checked="${tab === k}">${l}</a>`).join("")}</div>
      <article class="reader sun-body"><div class="verses" lang="sq">${tab === "tip" ? body : await composeSunday(tab, sun, tone, T, kd)}</div></article>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  // ---------- Dita e emrit ----------
  // Ditët e emrave sipas traditës ortodokse (eortologjia greke/patriarkane): [muaji, dita, e kremtja, rrënjët e emrave, kryesore]
  const FOLK = [
    [12, 25, "Lindja e Krishtit", ["krist", "kris", "emanuel", "manol", "mano", "kristaq"], 1],
    [12, 26, "Përmbledhja e Hyjlindëses", ["mari", "despin", "panajot", "emanuel"], 0],
    [1, 6, "Theofania · Pagëzimi i Zotit", ["fot", "theofan", "fani", "jordan", "ndric"], 1],
    [1, 7, "Përmbledhja e Shën Joan Pagëzorit", ["joan", "jan", "gjon", "jov", "ioan"], 1],
    [6, 24, "Lindja e Joan Pagëzorit", ["joan", "jan", "gjon", "ioan"], 0],
    [8, 29, "Prerja e kokës së Joan Pagëzorit", ["joan", "jan", "gjon"], 0],
    [5, 8, "Shën Joan Theologu", ["joan", "jan", "gjon"], 0],
    [11, 13, "Shën Joan Gojarti", ["joan", "jan", "gjon", "gojart"], 0],
    [2, 2, "Ipapandia", ["simeon", "sime", "ipapant"], 1],
    [3, 25, "Ungjillëzimi i Hyjlindëses", ["vangjel", "evangjel", "ungjill", "mari"], 1],
    [8, 6, "Shndërrimi i Zotit", ["sotir", "sotiraq", "shpetim"], 1],
    [8, 15, "Fjetja e Hyjlindëses", ["mari", "mar", "panajot", "despin", "maril", "marjet"], 1],
    [9, 8, "Lindja e Hyjlindëses", ["mari", "despin", "panajot"], 0],
    [11, 21, "Hyrja në Tempull e Hyjlindëses", ["mari", "despin", "panajot", "eisodi"], 0],
    [12, 9, "Ngjizja e Shën Anës", ["ana", "ane", "anit"], 0],
    [7, 25, "Fjetja e Shën Anës", ["ana", "ane", "anit"], 1],
    [9, 14, "Lartësimi i Kryqit të Nderuar", ["stavr", "kryq"], 1],
    [11, 8, "Kryeengjëjt Mihail dhe Gavril", ["mihal", "mihail", "gavril", "rafail", "engjel", "angjel"], 1],
    [6, 29, "Apostujt Petro dhe Pavli", ["petr", "pjet", "pavl", "pal", "pol"], 1],
    [12, 6, "Shën Nikolla", ["nikoll", "niko", "kol", "nikolet"], 1],
    [10, 26, "Shën Dhimitri", ["dhimit", "dimitr", "mitr", "dhimo", "mimoz"], 1],
    [4, 23, "Shën Gjergji", ["gjergj", "jorg", "georg", "gjergjin"], 1],
    [12, 12, "Shën Spiridoni", ["spir"], 1],
    [5, 21, "Shën Kostandini dhe Elena", ["kostand", "konstand", "kost", "elen", "lena", "kostaq"], 1],
    [7, 20, "Profeti Ilia", ["ili", "ilia"], 1],
    [1, 1, "Rrethprerja e Zotit · Shën Vasili i Madh", ["vasil", "vaso"], 1],
    [1, 18, "Shën Athanasi i Madh", ["thanas", "athanas", "tanas"], 1],
    [5, 2, "Shën Athanasi (bartja e lipsanit)", ["thanas", "athanas"], 0],
    [1, 17, "Shën Antoni i Madh", ["anton", "ndon"], 1],
    [1, 20, "Shën Efthimi i Madh", ["efthim", "thim"], 1],
    [1, 25, "Shën Grigori Theologu", ["grigor", "ligor", "gligor", "goni"], 1],
    [2, 1, "Shën Trifoni", ["trifon"], 1],
    [2, 10, "Shën Haralambi", ["haralamb", "llamb"], 1],
    [2, 11, "Shën Vlashi", ["vlash", "vllas"], 1],
    [4, 25, "Apostull Marku", ["marku", "marko"], 1],
    [5, 5, "Shën Irina", ["irin"], 1],
    [6, 30, "Përmbledhja e 12 Apostujve", ["apostol", "postol"], 1],
    [7, 1, "Shenjtorët Anargjirë Kozma e Damiani", ["kozm", "damian"], 1],
    [11, 1, "Shenjtorët Anargjirë Kozma e Damiani", ["kozm", "damian"], 0],
    [7, 6, "Shën Asti i Durrësit", ["ast"], 1],
    [7, 7, "Shën Kiriakia", ["kiriak", "qiriak"], 1],
    [7, 17, "Shën Marina", ["marin"], 1],
    [7, 24, "Shën Kristina", ["kristin"], 0],
    [7, 26, "Shën Paraskevia", ["paraskev", "vivi", "evi"], 1],
    [7, 27, "Shën Pandeleimoni", ["pandel"], 1],
    [8, 24, "Shën Kozmai i Etolisë", ["kozm"], 0],
    [8, 30, "Shën Aleksandri", ["aleks", "sandr"], 1],
    [9, 5, "Shën Elisabeta", ["elisabet", "elizabet", "beti"], 1],
    [9, 17, "Sofia, Besa, Shpresa dhe Dashuria", ["sofi", "bes", "shpres", "agapi", "elpid", "pisti", "dashuri"], 1],
    [10, 18, "Ungjilltari Lluka", ["llu", "luk"], 1],
    [10, 23, "Apostull Jakovi", ["jakov", "jakob"], 1],
    [11, 11, "Shën Mina", ["min"], 1],
    [11, 14, "Apostull Filipi", ["filip"], 1],
    [11, 16, "Ungjilltari Mattheu", ["matth", "mate"], 1],
    [11, 25, "Shën Katerina", ["katerin", "kate", "rina"], 1],
    [11, 30, "Apostull Andrea", ["andre", "ndre"], 1],
    [12, 4, "Shën Varvara", ["varvar", "barbar"], 1],
    [12, 15, "Shën Elefteri", ["lefter", "elefter"], 1],
    [12, 22, "Shën Anastasia", ["anastas", "natash", "tasi"], 0],
    [12, 23, "Shën Naumi", ["naum"], 1],
    [12, 27, "Shën Stefani", ["stef"], 1],
    [2, 17, "Shën Theodhori Tiron", ["theodhor", "todi", "dhori", "teodor", "thodhor"], 0],
  ];
  // të kremtet që lëvizin me Pashkën: [ditë nga Pashka, e kremtja, rrënjët, kryesore]
  const FOLK_MOV = [
    [0, "Pashka · Ngjallja e Krishtit", ["anastas", "pashk", "ngjall", "natash", "tasi"], 1],
    [-8, "E Shtuna e Llazarit", ["llazar", "lazar"], 1],
    [-7, "E Diela e Vaieve", ["vaie", "dafin"], 1],
    [7, "E Diela e Thomait", ["thom"], 1],
    [5, "Burimi Jetëdhënës", ["zoi", "zoe", "pigi", "jete"], 1],
    [-43, "E Shtuna e Shën Theodhorit", ["theodhor", "todi", "dhori", "teodor", "thodhor"], 1],
    [49, "Pendikostia", ["triad", "trinit", "pendikost"], 1],
  ];
  const nrm = (s) => String(s).toLowerCase().replace(/ë/g, "e").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "");
  function nameStem(name) {
    const n = nrm(name).trim().split(/\s+/)[0] || "";
    const b = n.replace(/(ja|ia|ai|i|a|e|o|u)$/, "");
    return b.length >= 3 ? b : n;
  }
  const loadSynaxAll = () => Promise.all(Array.from({ length: 12 }, (_, i) => load(sxKey(i + 1))));
  function nameDays(name, tp) {
    const st = nameStem(name);
    if (st.length < 3) return [];
    const y = new Date().getFullYear(), out = new Map();
    const add = (m, d, label, saint, main, mov) => {
      const k = m * 100 + d;
      const cur = out.get(k);
      if (cur) { if (saint && !cur.saints.includes(saint)) cur.saints.push(saint); if (label && !cur.label) { cur.label = label; cur.main = !!main; } return; }
      out.set(k, { m, d, label, main: !!main, off: mov == null ? null : mov, saints: saint ? [saint] : [] });
    };
    const hit = (stems) => stems.some((s) => (st.startsWith(s) && (s.length >= 4 || st.length <= s.length + 1)) || (st.length >= 3 && s.startsWith(st) && s.length - st.length <= 1));
    FOLK.forEach(([m, d, label, stems, main]) => {
      if (!hit(stems)) return;
      // Shën Gjergji para Pashkës kremtohet të hënën e Pashkës
      if (m === 4 && d === 23) { const P = Fast.pascha(y); if (new Date(y, 3, 23, 12) < P) { const g = new Date(P); g.setDate(g.getDate() + 1); add(g.getMonth() + 1, g.getDate(), label + " (e hëna e Pashkës)", null, main); return; } }
      add(m, d, label, null, main);
    });
    FOLK_MOV.forEach(([off, label, stems, main]) => {
      if (!hit(stems)) return;
      const P = Fast.pascha(y); P.setDate(P.getDate() + off);
      add(P.getMonth() + 1, P.getDate(), label, null, main, off);
    });
    const re = new RegExp(`(^|[^a-z])(${st}[a-z]*)`, "g");
    if (tp) tp.sections.forEach((sec, mi) => sec.items.forEach((it) => {
      const sb = it.blocks.find((b) => b.t === "saints");
      if (!sb) return;
      const parts = sb.x.split(/[.;]\s*/);
      parts.forEach((p) => { if (re.test(nrm(p))) add(mi + 1, parseInt(it.title, 10), "", p.trim()); re.lastIndex = 0; });
    }));
    // Sinaksari i plotë: çdo shenjtor i çdo dite të vitit (vetëm fjalët me shkronjë të madhe, pra emrat)
    for (let mi = 1; mi <= 12; mi++) {
      const sx = data[sxKey(mi)];
      if (!sx || !sx.days) continue;
      sx.days.forEach((dd) => (dd.blocks || []).forEach((b) => {
        if (b.t !== "li" || !b.x) return;
        const ok = [...b.x.matchAll(/[A-ZÇË][\p{L}’']+/gu)].some((w) => { const n = nrm(w[0]); return n.startsWith(st) && n.length - st.length <= 3; });
        if (ok) add(dd.m || mi, dd.d, "", b.x.length > 150 ? b.x.slice(0, 147).replace(/\s+\S*$/, "") + "…" : b.x);
      }));
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...out.values()].map((r) => {
      let dt = new Date(y, r.m - 1, r.d);
      if (dt < today) {
        if (r.off == null) dt = new Date(y + 1, r.m - 1, r.d);
        else { dt = Fast.pascha(y + 1); dt.setHours(0, 0, 0, 0); dt.setDate(dt.getDate() + r.off); r.m = dt.getMonth() + 1; r.d = dt.getDate(); }
      }
      return Object.assign(r, { next: dt, inDays: Math.round((dt - today) / 864e5) });
    }).sort((a, b) => a.inDays - b.inDays);
  }
  const ndKey = (y) => (y.off != null ? "p" + y.off : y.m + "-" + y.d);
  const defFeast = (r) => r.find((y) => y.main) || r.find((y) => y.label) || r[0] || null;
  const ND_MAX = 4;
  function dateChips(r, sel) {
    // të gjitha datat ku kujtohet emri, sipas kalendarit; të kremtet kryesore të theksuara
    const c = [...r].sort((a, b) => a.m - b.m || a.d - b.d);
    return `<p class="nd-count" data-count>${sel.length} nga ${ND_MAX} të zgjedhura · ${c.length} data gjithsej</p>
      <div class="nd-pick nd-all">${c.map((y) => `<button type="button" class="nd-chip${y.label ? " lab" : ""}${sel.includes(ndKey(y)) ? " on" : ""}" data-k="${ndKey(y)}" aria-pressed="${sel.includes(ndKey(y))}"><b>${y.d} ${MUAJ_G[y.m - 1].slice(0, 3)}</b><span>${esc((y.label || y.saints[0] || "").split(" · ")[0].slice(0, 70))}</span></button>`).join("")}</div>`;
  }
  function bindChips(box, sel) {
    $$(".nd-chip", box).forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.k, i = sel.indexOf(k);
      if (i >= 0) { if (sel.length > 1) sel.splice(i, 1); }
      else if (sel.length >= ND_MAX) { toast(`Deri në ${ND_MAX} data — hiq njërën për të zgjedhur tjetër`); haptic([30, 30, 30]); return; }
      else sel.push(k);
      haptic(10);
      $$(".nd-chip", box).forEach((c) => { const on = sel.includes(c.dataset.k); c.classList.toggle("on", on); c.setAttribute("aria-pressed", on); });
      const cn = $("[data-count]", box); if (cn) cn.textContent = cn.textContent.replace(/^\d+/, sel.length);
    }));
  }
  // Ndrysho emrin, emrin e pagëzimit dhe datat (për mua: i == null)
  function editPerson(i, after) {
    const tp = data.tipikoja, l = Persons.all();
    const x = i == null ? l.find((y) => y.me) : l[i];
    const isMe = i == null || !!(x && x.me);
    const el = document.createElement("div");
    el.className = "sheet update-sheet onboard";
    el.innerHTML = `<div class="sheet-card update-card" role="dialog" aria-modal="true" aria-labelledby="edT">
        <h2 id="edT">${isMe ? "Emri im" : "Ndrysho personin"}</h2>
        <form id="edForm"><input id="edName" maxlength="40" placeholder="${isMe ? "Emri yt" : "Emri i personit"}" autocomplete="off">
          <input id="edBapt" maxlength="30" placeholder="Emri i pagëzimit (i detyrueshëm)" autocomplete="off" required>
          ${isMe ? `<label class="ob-check"><input type="checkbox" id="edNo"> Nuk jam pagëzuar ende</label>` : ""}
          <div id="edDates"></div>
          <button class="btn primary upd-go" type="submit">${icon("check")}<span>Ruaj</span></button></form>
        <button class="btn upd-later" type="button">Anulo</button>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    const nm = $("#edName", el), bp = $("#edBapt", el), no = $("#edNo", el), box = $("#edDates", el);
    nm.value = x ? x.name : store.get("me.name", "");
    bp.value = x ? (x.bapt || "") : store.get("me.bapt", "");
    if (no) no.checked = !x && store.get("me.unbaptized", false);
    const sel = x && x.dates ? [...x.dates] : [];
    let lastKey = x ? x.key : null, tm;
    // dita e emrit festohet sipas emrit të pagëzimit
    const keyOf = () => (bp.value.trim().split(" ")[0]);
    const draw = () => {
      if (no && no.checked) { box.innerHTML = `<p class="nd-t">Dita e emrit vjen me Pagëzimin ☦</p>`; bp.hidden = true; bp.required = false; return; }
      bp.hidden = false; bp.required = true;
      if (!bp.value.trim()) { box.innerHTML = `<p class="nd-t">Shkruaj emrin e pagëzimit që të dalin të gjitha datat kur feston.</p>`; return; }
      const key = keyOf();
      const r = nameStem(key).length >= 3 ? nameDays(key, tp) : [];
      if (key !== lastKey || !sel.every((k) => r.some((y) => ndKey(y) === k))) { sel.length = 0; lastKey = key; }
      if (!sel.length) { const m = defFeast(r); if (m) sel.push(ndKey(m)); }
      box.innerHTML = r.length ? `<p class="nd-t">Kur feston? Zgjidh 1 deri në 4 data</p>${dateChips(r, sel)}` : key ? `<p class="nd-t">Nuk u gjet asnjë datë për këtë emër.</p>` : "";
      bindChips(box, sel);
    };
    draw();
    [nm, bp].forEach((f) => f.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(draw, 300); }));
    if (no) no.addEventListener("change", draw);
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    $(".upd-later", el).addEventListener("click", close);
    $("#edForm", el).addEventListener("submit", (e) => {
      e.preventDefault();
      const n = nm.value.trim().replace(/\s+/g, " ");
      if (!n) { nm.focus(); return; }
      const b = bp.value.trim().replace(/\s+/g, " ");
      const unb = !!(no && no.checked);
      if (!unb && !b) { bp.focus(); bp.classList.add("need"); toast("Shkruaj emrin e pagëzimit: dita e emrit festohet sipas tij"); return; }
      let list = Persons.all();
      const entry = { name: n, bapt: unb ? "" : b, key: keyOf(), dates: [...sel], at: x ? x.at : Date.now() };
      if (isMe) {
        store.set("me.name", n); store.set("me.bapt", entry.bapt); store.set("me.unbaptized", unb); store.set("me.asked", true);
        list = list.filter((y) => !y.me);
        if (!unb) list.unshift(Object.assign(entry, { me: true }));
      } else list[i] = Object.assign({}, x, entry);
      store.set("persons", list);
      Persons.schedule();
      close();
      toast("U ruajt ✓");
      if (isMe) setTimeout(() => checkAuthor(true), 600);
      if (after) after();
    });
  }
  const MUAJ_G = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
  function hl(text, name) {
    const st = nameStem(name), src = esc(text), n = nrm(src);
    const m = new RegExp(`(^|[^a-z])(${st}[a-z]*)`).exec(n);
    if (!m) return src;
    const i = m.index + m[1].length;
    return src.slice(0, i) + "<mark>" + src.slice(i, i + m[2].length) + "</mark>" + src.slice(i + m[2].length);
  }
  async function viewNames() {
    const tp = await load("tipikoja");
    await loadSynaxAll();
    store.set("me.baptAsked", true);
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Dita e emrit</h1></header>
      <form class="search name-search" id="nameForm"><span>${icon("search")}</span><input id="nameQ" type="search" placeholder="p.sh. Gjergji, Maria, Kristina…" enterkeyhint="search" autocomplete="off"></form>
      <div id="nameRes"></div>
      <section class="persons" id="persons"></section>`;
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
    const res = $("#nameRes"), q = $("#nameQ");
    const show = (name, whoKeep) => {
      name = name.trim();
      if (nameStem(name).length < 3) { res.innerHTML = ""; return; }
      const r = nameDays(name, tp);
      const isSaved = Persons.all().some((x) => nameStem(x.name) === nameStem(name));
      if (!r.length) { res.innerHTML = `<div class="empty">${icon("calendar")}<h3>Nuk u gjet</h3><p>Provo një formë tjetër të emrit (p.sh. “Kristo” → “Krisi”).</p></div>`; return; }
      const first = r.find((x) => x.main) || r.find((x) => x.label) || r[0];
      const feasts = r.filter((x) => x.label);
      res.innerHTML = `
        <section class="name-hero${first.inDays === 0 ? " today" : ""}">
          <p class="eyebrow">${first.inDays === 0 ? "Sot!" : first.inDays === 1 ? "Nesër" : `Pas ${first.inDays} ditësh`}</p>
          <h2>${esc(name)}</h2>
          <p class="name-date">${first.d} ${MUAJ_G[first.m - 1]}</p>
          <p class="name-why">${first.label ? esc(first.label) : hl(first.saints[0], name)}</p>
          ${isSaved && feasts.length > 1 ? `<div class="name-feasts">${feasts.map((x) => `<span class="nf${x === first ? " on" : ""}"><b>${x.d} ${MUAJ_G[x.m - 1].slice(0, 3)}</b>${esc(x.label.split(" · ")[0])}</span>`).join("")}</div>` : ""}
          ${isSaved ? `<button class="btn primary" disabled>${icon("check")}<span>U ruajt — do të të njoftojmë</span></button>` : `
          <div class="person-add">
          <label class="pa-l">Emri i pagëzimit<input id="personBapt" maxlength="30" value="${esc(name)}" placeholder="Emri i pagëzimit" autocomplete="off"></label>
          <label class="pa-l">Si e thërrisni (opsional)<input id="personName" maxlength="40" value="${esc(whoKeep && whoKeep !== name ? whoKeep : "")}" placeholder="p.sh. Xhoni, gjyshi, vëllai — ose bosh" autocomplete="off"></label>
          <p class="nd-t">Kur feston? Zgjidh 1 deri në 4 data</p><div id="ndPick">${dateChips(r, [ndKey(first)])}</div>
          <button class="btn primary" id="nameSave">${icon("bell")}<span>Ruaj personin</span></button></div>`}
        </section>
        <ul class="list name-list">${r.map((x) => `<li><a class="list-item" href="#/tipikoja/${x.m - 1}/${Math.max(0, (tp.sections[x.m - 1].items.findIndex((it) => parseInt(it.title, 10) === x.d)))}">
          <span class="name-d"><b>${x.d}</b><small>${MUAJ_G[x.m - 1].slice(0, 3)}</small></span>
          <span class="lbl">${x.label ? esc(x.label) : ""}${x.saints.map((s) => `<span class="sub">${hl(s, name)}</span>`).join("")}</span></a></li>`).join("")}</ul>`;
      enter(res);
      const pick = [ndKey(first)];
      if ($("#ndPick")) bindChips($("#ndPick"), pick);
      $("#nameSave")?.addEventListener("click", (e) => {
        const bapt = ($("#personBapt").value || "").trim().replace(/\s+/g, " ");
        const who = (($("#personName").value || "").trim() || bapt);
        if (!bapt) { $("#personBapt").focus(); $("#personBapt").classList.add("need"); toast("Shkruaj emrin e pagëzimit"); return; }
        // po ndryshoi emri i pagëzimit, datat duhen kërkuar për atë emër
        if (nameStem(bapt) !== nameStem(name)) { q.value = bapt; show(bapt, who); toast(`Datat për emrin e pagëzimit «${bapt}»`); return; }
        Persons.add(who, bapt.split(" ")[0], bapt, pick);
        const b = e.currentTarget, rr = b.getBoundingClientRect();
        $(".person-add", res).outerHTML = `<button class="btn primary" disabled>${icon("check")}<span>U ruajt — do të të njoftojmë</span></button>`;
        goldBurst(rr.left + rr.width / 2, rr.top);
        const fx = r.find((y) => ndKey(y) === pick[0]) || first;
        toast(android ? `🔔 Do të të njoftojmë më ${fx.d} ${MUAJ_G[fx.m - 1]}` : "U ruajt — urimi del te Lexo në atë ditë");
        renderPersons();
      });
    };
    let tm;
    q.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(() => show(q.value), 250); });
    $("#nameForm").addEventListener("submit", (e) => { e.preventDefault(); q.blur(); show(q.value); });
    function renderPersons() {
      const ps = Persons.all(), box = $("#persons");
      if (!box) return;
      const meN = store.get("me.name", ""), meX = ps.find((x) => x.me), unbp = store.get("me.unbaptized", false);
      const meM = meX && Persons.main(meX, tp);
      const meCard = `<div class="me-card">${meN ? `<span class="avatar">${esc(meN.slice(0, 1).toUpperCase())}</span>
          <span class="lbl"><b>${esc(meN)} (unë)</b><span class="sub">${meX && meX.bapt ? `✝ Emri i pagëzimit: ${esc(meX.bapt)}` : unbp ? "Dita e emrit vjen me Pagëzimin ☦" : "Shto emrin e pagëzimit"}</span>${meM ? `<span class="sub">Dita e emrit: ${Persons.feasts(meX, tp).map((y) => `${y.d} ${MUAJ_G[y.m - 1]}`).join(" · ")}</span>` : ""}</span>
          <button class="btn small" id="meEdit">${icon("pen")}<span>${(meX && meX.bapt) || unbp ? "Ndrysho" : "Shto emrin e pagëzimit"}</span></button>`
        : `<button class="btn primary" id="meEdit">${icon("plus")}<span>Shto emrin tënd</span></button>`}</div>`;
      box.innerHTML = meCard + (ps.some((x) => !x.me) ? `<h3 class="persons-h">${icon("bell")} Personat e mi <small>${ps.filter((x) => !x.me).length}</small></h3>
        <ul class="list">${ps.map((x, i) => { if (x.me) return ""; const m = Persons.main(x, tp); const fs = Persons.feasts(x, tp); return `<li class="person-row">
          <span class="avatar">${esc(x.name.slice(0, 1).toUpperCase())}</span>
          <span class="lbl"><b>${esc(x.name)}${x.me ? " (unë)" : ""}</b>${x.bapt && x.bapt !== x.name ? `<span class="sub">✝ Emri i pagëzimit: ${esc(x.bapt)}</span>` : ""}<span class="sub">${m ? `${fs.map((y) => `${y.d} ${MUAJ_G[y.m - 1]}`).join(" · ")} · ${m.inDays === 0 ? "SOT 🎉" : m.inDays === 1 ? "nesër" : "pas " + m.inDays + " ditësh"}` : "—"}</span></span>
          <button class="icon-btn small" data-pedit="${i}" aria-label="Ndrysho">${icon("pen")}</button>
          <button class="icon-btn small" data-pdel="${i}" aria-label="Fshi">${icon("close")}</button></li>`; }).join("")}</ul>` : "");
      $("#meEdit", box).addEventListener("click", () => editPerson(null, renderPersons));
      $$("[data-pedit]", box).forEach((b) => b.addEventListener("click", () => editPerson(+b.dataset.pedit, renderPersons)));
      $$("[data-pdel]", box).forEach((b) => b.addEventListener("click", () => { Persons.remove(+b.dataset.pdel); renderPersons(); }));
      $$(".person-row", box).forEach((row) => { const i = +$("[data-pedit]", row).dataset.pedit; $(".lbl", row).addEventListener("click", () => { q.value = ps[i].key; show(ps[i].key); }); });
    }
    renderPersons();
  }

  // Personat e ruajtur dhe njoftimet në telefon për ditën e emrit
  const Persons = (() => {
    const KEY = "persons";
    const all = () => {
      let l = store.get(KEY, null);
      if (!l) { l = store.get("names", []).map((n) => ({ name: n, key: n })); store.set(KEY, l); }
      return l;
    };
    // vetëm datat që zgjedh përdoruesi (1–2); po s'ka zgjedhur, vetëm e kremtja kryesore
    const feasts = (x, tp) => {
      const r = nameDays(x.key, tp);
      if (x.dates && x.dates.length) { const f = r.filter((y) => x.dates.includes(ndKey(y))); if (f.length) return f; }
      const m = defFeast(r);
      return m ? [m] : [];
    };
    const main = (x, tp) => feasts(x, tp)[0] || null;
    function add(name, key, bapt, dates) { const l = all(); l.push({ name, key, bapt: bapt || "", dates: dates || [], at: Date.now() }); store.set(KEY, l.slice(-40)); schedule(); }
    function remove(i) { const l = all(); l.splice(i, 1); store.set(KEY, l); schedule(); }
    // njoftimet: në ditën e emrit në orën 9:00 dhe një kujtesë një ditë më parë në 19:00
    async function schedule() {
      if (!(android && android.scheduleReminders)) return;
      const tp = data.tipikoja || await load("tipikoja");
      await loadSynaxAll();
      const out = [];
      // njoftim për çdo të kremte të emrit (deri në 5 për person)
      all().forEach((x, i) => feasts(x, tp).forEach((m, j) => {
        const why = m.label || m.saints[0] || "";
        const at = new Date(m.next); at.setHours(9, 0, 0, 0);
        if (at > Date.now()) out.push({ id: 7000 + i * 10 + j * 2, at: at.getTime(), title: x.me ? `🎉 Gëzuar ditën e emrit, ${x.name}!` : `🎉 Sot feston ${x.name}`, text: x.me ? `${why}. Zoti të bekoftë!` : `Dita e emrit: ${why}. Uroje me dashuri!` });
        const pre = new Date(m.next); pre.setDate(pre.getDate() - 1); pre.setHours(19, 0, 0, 0);
        if (pre > Date.now() && !x.me) out.push({ id: 7001 + i * 10 + j * 2, at: pre.getTime(), title: `Nesër feston ${x.name}`, text: `${why} — mos harro ta urosh.` });
      }));
      if (store.get("notif.verse", true)) {
        const pool = [];
        (await load("psaltiri")).psalms.forEach((p) => p.v.forEach((v, k) => { if (v.length > 50 && v.length < 150) pool.push([p, k]); }));
        for (let k = 0; k < 14; k++) {
          const dt = new Date(); dt.setDate(dt.getDate() + k); dt.setHours(8, 0, 0, 0);
          if (dt <= Date.now()) continue;
          const di = Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000);
          const [p, vi] = pool[(di * 7919) % pool.length];
          const f = Fast.info(dt);
          out.push({ id: 6000 + k, at: dt.getTime(), title: `${userName() ? userName() + ", v" : "V"}argu i ditës · ${psalmRef(p.n, vi + 1)}`,
            text: ortho(p.v[vi]) + (f.feast ? `\n✝ ${f.feast}` : "") + (f.level && f.level.cls !== "free" ? `\n${f.level.name}` : "") });
        }
      }
      // qirinjtë: njoftim kur shuhen
      candles().slice(0, 20).forEach((c, k) => {
        const end = c.at + CANDLE_MS;
        if (end > Date.now()) out.push({ id: 4000 + k, at: end, title: c.kind === "fjetur" ? "🕯 Qiriri për të fjeturin u shua" : "🕯 Qiriri u shua",
          text: `${c.for || "Për të gjithë"} · 24 orë lutje. Ndize përsëri?` });
      });
      // përgatitja për Kungim: 3 ditë para (kreshmë e vetëpërmbajtje), mbrëmja para (Shërbesa), pas Kungimit (falënderimi)
      const plan = store.get("kungimi.plan", "");
      if (plan) {
        const pd = new Date(plan + "T12:00:00");
        const at = (dd, h, m) => { const x = new Date(pd); x.setDate(x.getDate() + dd); x.setHours(h, m, 0, 0); return x.getTime(); };
        [[3900, at(-3, 19, 0), "Përgatitja për Kungim", "Pas 3 ditësh kungohesh. Nis kreshmën, vetëpërmbajtjen dhe lutjen; rrëfehu nëse ke nevojë."],
         [3901, at(-1, 12, 0), "Nesër kungohesh", "Ruaj paqen me të gjithë, fal dhe kërko falje. Sonte lexo Shërbesën para Kungimit."],
         [3902, at(-1, 21, 0), "Shërbesa para Kungimit", "Lexo tani Kanonin dhe Uratat para Kungimit. Pas mesnate mos ha e mos pi asgjë."],
         [3903, at(0, 12, 30), "Lavdi Perëndisë për të gjitha!", "Lexo Uratat e falënderimit pas Kungatës së Shenjtë."]].forEach(([id, t, title, text]) => { if (t > Date.now()) out.push({ id, at: t, title, text }); });
      }
      // Liturgjia Hyjnore dhe të kremtet e mëdha: në mbrëmje një ditë më parë (20:00) dhe në mëngjes (7:00)
      if (store.get("notif.liturgy", true)) {
        for (let k = 0; k < 15; k++) {
          const day = new Date(); day.setDate(day.getDate() + k);
          const f = Fast.info(day);
          const sec = day.getFullYear() === 2026 ? tp.sections[day.getMonth()] : null;
          const it = sec && sec.items.find((x) => parseInt(x.title, 10) === day.getDate());
          const lit = litDay(f, it);
          if (!lit) continue;
          const sb = it && it.blocks.find((b) => b.t === "saints");
          const what = ortho(f.feast || (sb ? sb.x.split(/[.;]/)[0].trim() : "") || (day.getDay() === 0 ? "E Diela" : ""));
          const big = f.great ? "✝✝ " : "✝ ";
          const eve = new Date(day); eve.setDate(eve.getDate() - 1); eve.setHours(20, 0, 0, 0);
          const plan = store.get("kungimi.plan", "");
          const isPlan = plan === `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          // 20:00 mbrëmjen para · 07:00 në mëngjes · 12:00 pas Liturgjisë: “A u kungove?”
          if (eve > Date.now()) out.push({ id: 5000 + k * 2, at: eve.getTime(), route: isPlan ? "/kungata/0/0" : "/kungimi", title: `${big}Nesër ka Liturgji Hyjnore`,
            text: (what ? what + ". " : "") + (isPlan ? "Nesër kungohesh: sonte lexo Shërbesën para Kungimit dhe mos ha e mos pi asgjë pas mesnate." : unbaptized() || canonUntil() ? "Eja nesër në Liturgji: Krishti të pret në shtëpinë e Tij." : "Përgatitu sonte me lutje. Nëse je përgatitur me kreshmë dhe rrëfim, nesër kungohu.") });
          const morn = new Date(day); morn.setHours(7, 0, 0, 0);
          if (morn > Date.now()) out.push({ id: 5001 + k * 2, at: morn.getTime(), route: "/kungimi", title: `${big}Sot ka Liturgji Hyjnore${userName() ? ", " + userName() : ""}`,
            text: (what ? what + ". " : "") + (isPlan ? "Sot kungohesh: mos ha e mos pi asgjë para Kungimit. Zoti të bekoftë!" : "Eja në kishë: Krishti të pret në Liturgji 🙏") });
          const noon = new Date(day); noon.setHours(12, 0, 0, 0);
          if (noon > Date.now() && !unbaptized() && !canonUntil()) out.push({ id: 5500 + k, at: noon.getTime(), route: "/kungimi/pyet", title: `☦ A u kungove sot${userName() ? ", " + userName() : ""}?`,
            text: "Prek këtu për ta shënuar dhe mos harro Uratat e falënderimit pas Kungatës së Shenjtë." });
        }
      }
      // Kanuni im i lutjes: mëngjes dhe mbrëmje
      const ru = ruleGet();
      if (ru.notif) for (let k = 0; k < 14; k++) {
        [["m", ru.tm, "🌅 Lutja e mëngjesit", "Fillo ditën me Zotin: lutjet e tua të mëngjesit të presin."], ["e", ru.te, "🌙 Lutja e mbrëmjes", "Mbyll ditën në paqen e Zotit: lutjet e tua të mbrëmjes."]].forEach(([w, t, title, text], j) => {
          const [hh, mi] = String(t || "07:00").split(":").map(Number);
          const d = new Date(); d.setDate(d.getDate() + k); d.setHours(hh || 0, mi || 0, 0, 0);
          if (d > Date.now()) out.push({ id: 3800 + k * 2 + j, at: d.getTime(), route: "/kanuni/" + w, title: userName() ? `${title}, ${userName()}` : title, text });
        });
      }
      // kur mbaron kanoni
      const cu = store.get("rr.canonUntil", "");
      if (cu) { const at = new Date(cu + "T09:00:00"); if (at > Date.now()) out.push({ id: 3950, at: at.getTime(), route: "/kungimi", title: "☦ Koha e kanonit mbaroi", text: "Me bekimin e atit shpirtëror mund t'i afrohesh përsëri Kungimit Hyjnor. Lavdi Perëndisë!" }); }
      try { android.scheduleReminders(JSON.stringify(out)); } catch (e) { /* */ }
    }
    return { all, add, remove, main, feasts, schedule };
  })();
  // urimi te Lexo kur një emër i ruajtur feston sot
  function nameDayBanner() {
    const ps = Persons.all();
    if (!ps.length) return "";
    const hits = ps.filter((x) => !x.me && Persons.feasts(x, data.tipikoja).some((m) => m.inDays === 0)).map((x) => x.name);
    if (!hits.length) return "";
    return `<a class="nameday" href="#/emri">${icon("candle")}<span><b>Sot është dita e emrit!</b><small>Uroji: ${hits.map(esc).join(", ")}</small></span></a>`;
  }

  /* =====================================================================
     NAVIGIMI
     ===================================================================== */
  function setNav(go) {
    $$(".nav-btn[data-go]").forEach((b) => { if (b.dataset.go === go) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  }
  $$(".nav-btn[data-go]").forEach((b) => b.addEventListener("click", () => {
    const go = b.dataset.go;
    haptic(8);
    location.hash = go === "kreu" ? "#/" : "#/" + go;
  }));

  async function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const view = parts[0] || "kreu";
    if (view !== "harta" || window.FSHarta) window.FSHarta && FSHarta.stopAll();
    $(".hm-sheet")?.remove();
    try {
      if (view === "kreu") {
        app.dataset.view = "feed";
        setNav("kreu");
        if (!Feed.ready) await Feed.init();
        else { Feed.refreshLikes(); Feed.refreshActive(); }
        return;
      }
      app.dataset.view = "read";
      const navOf = { pelqyerat: "pelqyerat", shenime: "pelqyerat", kisha: "kisha", lajm: "kisha", shpirti: "shpirti", lutja: "shpirti", fjala: "shpirti", emri: "shpirti",
        diptiket: "shpirti", kuiz: "shpirti", komboskini: "shpirti", rrefimi: "shpirti", autori: "shpirti", kanuni: "shpirti", kathizma: "shpirti", shqyrtimi: "shpirti", frymemarrja: "shpirti", edjela: "shpirti", ikona: "shpirti", numerimi: "shpirti", sfida: "shpirti", kungimi: "shpirti", mjekesia: "shpirti", lindja: "shpirti", lavdi: "shpirti", kalendari: "shpirti" };
    if (view === "kisha") document.querySelector('.nav-btn[data-go="kisha"]')?.classList.remove("has-new");
    if (view !== "lajm") mainPane.classList.remove("art-open");
    if (view !== "lutja") { clearInterval(candleTimer); Smoke.stop(); }
    if (view !== "rrefimi") Confess.lock();
    if (view !== "autori") authorOpen = false;   // paneli i autorit mbyllet kur del
    if (view !== "ikona" && view !== "lexo") freeIcons();   // ikonat e parë fshihen nga memoria   // Rrëfimi mbyllet sapo del nga faqja
      setNav(navOf[view] || "lexo"); document.body.classList.remove("bible-full");
      if (view === "lexo" || view === "sot") await viewLibrary();
      else if (view === "pelqyerat") { await viewLikes(); mineSeg("pelqyerat"); }
      else if (view === "shenime") { await viewNotes(); mineSeg("shenime"); }
      else if (view === "shpirti") viewSpirit();
      else if (view === "kalendari") await viewCalendar(parts[1], parts[2]);
      else if (view === "edjela") await viewSunday(parts[1], parts[2]);
      else if (view === "kisha") await viewChurch();
      else if (view === "imazhet") await viewCredits();
      else if (view === "lutja") await viewPrayer();
      else if (view === "komboskini") viewRope();
      else if (view === "autori") viewAuthor();
      else if (view === "kanuni") await viewRule(parts[1]);
      else if (view === "kathizma") await viewKathisma(parts[1]);
      else if ((view === "rrefimi" || view === "shqyrtimi") && unbaptized()) viewLocked(view);
      else if (view === "rrefimi") viewConfess();
      else if (view === "shqyrtimi") viewExam();
      else if (view === "frymemarrja") viewBreath();
      else if (view === "dita") await viewDay(parts[1]);
      else if (view === "bibla") await viewBible();
      else if (view === "fjala") await viewDraw();
      else if (view === "dcs") await viewDcs();
      else if (view === "diptiket") await viewDiptychs(parts[1]);
      else if (view === "kuiz") await viewQuiz();
      else if (view === "udhetimi") await viewJourney();
      else if (view === "superlibri") viewKids();
      else if (view === "ora") viewByzClock();
      else if (view === "kambanorja") viewBells();
      else if (view === "kandili") viewKandil();
      else if (view === "ikona") await viewIcon(parts[1], parts[2]);
      else if (view === "numerimi") viewCountdown();
      else if (view === "sfida") viewChallenge();
      else if (view === "sinaksari") await viewSynax(parts[1], parts[2]);
      else if (view === "biblioteka" && parts[1] === "kanonet") location.replace("#/kanonet");
      else if (view === "kanonet") await viewKanonet();
      else if (view === "harta") await viewHarta(parts[1]);
      else if (view === "biblioteka") await viewLibrary2(parts[1]);
      else if (view === "kungimi") { viewCommunion(); if (parts[1] === "pyet") askCommunion(true); }
      else if (view === "mjekesia") await viewSoul();
      else if (view === "lindja") viewEast();
      else if (view === "pagezimi") location.replace("#/biblioteka/pagezimi");
      else if (view === "lavdi") viewGratitude();
      else if (view === "emri") await viewNames();
      else if (view === "lajm") await viewArticle(parts[1] === "kisha" ? "kisha" : parts[1] === "shenjt" ? "shenjt" : "ngj", parts[2]);
      else if (view === "psaltiri") await viewPsaltiri(parts[1]);
      else if (view === "eterit") await viewFathers();
      else if (BOOKS[view]) await viewBook(view, parts[1], parts[2]);
      else location.hash = "#/";
    } catch (err) {
      console.error(err);
      mainPane.innerHTML = `<div class="empty"><h3>Diçka shkoi keq</h3><p>${esc(err.message)}</p></div>`;
    }
  }
  window.addEventListener("hashchange", async () => {
    $$(".sheet").forEach((s) => (s.hidden = true));
    $("#musicDisc").classList.remove("big");
    const run = async () => { await route(); restoreScroll(); };
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("eco");
    if (document.startViewTransition && !calm) {
      let p;
      const vt = document.startViewTransition(() => Promise.race([(p = run()), new Promise((r) => setTimeout(r, 320))]));
      // kur nis një kalim i ri para se të mbarojë i vjetri, shfletuesi e anashkalon këtë: s'është gabim
      [vt.ready, vt.finished, vt.updateCallbackDone].forEach((q) => q && q.catch(() => {}));
      await vt.updateCallbackDone.catch(() => {});
    } else await run();
  });

  /* =====================================================================
     LEXO — librat e plotë
     ===================================================================== */
  function todayVerse() {
    const ps = data.psaltiri;
    const pool = [];
    ps.psalms.forEach((p) => p.v.forEach((v, i) => { if (v.length > 50 && v.length < 210) pool.push([p, i]); }));
    const [p, vi] = pool[(dayIndex() * 7919) % pool.length];
    return { kind: "psaltiri", id: `ps:${p.n}:${vi + 1}`, text: p.v[vi], ref: psalmRef(p.n, vi + 1), link: `#/psaltiri/${p.n}`, n: p.n, vi };
  }

  // Ikona e ditës: kartë e madhe e dedikuar në krye të faqes Lexo (lexon vetëm muajin e fundit)
  async function fillIconCard() {
    const slot = $("#icSlot");
    if (!slot) return;
    const L = await latestIconMonth();
    if (!L || !$("#icSlot")) return;
    const k = L.days[0], list = L.groups[k], today = isoDay2(new Date());
    slot.innerHTML = `<a class="icon-banner" href="#/ikona">
        <span class="ib-stack">${list.slice(0, 3).map((x, j) => `<i style="--k:${j}" data-ic="${esc(x.file)}"></i>`).reverse().join("")}</span>
        <span class="ib-txt"><small>Ikona e ditës</small><b>${esc(fmtDay(k))}${k === today ? " · sot" : ""}</b>
          <em>${list.length > 1 ? list.length + " ikona · prek për t'i parë" : "Prek për ta parë"}</em></span>
        <span class="ib-go">›</span></a>`;
    enter(slot);
    hydrateIcons(slot);
  }
  async function viewLibrary() {
    await load("psaltiri");
    const v = todayVerse();
    const t = Today.data || store.get("today", null);
    const tiles = [
      ["bibla", "book", "Bibla e plotë", "Bibla PRO · Shoqëria Biblike · kërkim"],
      ["psaltiri", "lyre", "Psaltiri", "150 psalme · 20 kathizma"],
      ["ungjilli", "book", "Ungjilli", "Leximet e vitit kishtar"],
      ["apostulli", "letter", "Apostulli", "Veprat dhe Letrat"],
      ["dhiata", "scroll", "Dhiata e Vjetër", "Së shpejti"],
      ["profecite", "scroll", "Libri i Profecive", "Leximet e Mbrëmësoreve"],
      ["sinaksari/sot", "calendar", "Sinaksari", "Shenjtorët e çdo dite · 12 muaj"],
      ["tipikoja/sot", "calendar", "Tipikoja 2026", "Shërbesa e ditës së sotme"],
      ["harta", "globe", "Gjeografia e Shenjtë", "Globi 3D · Shqipëria 3D · shenjtorët në hartë"],
      ["kanonet", "scroll", "Kanonet e Kishës", "Apostujt · Sinodet · Pidalioni"],
      ["biblioteka", "book", "Biblioteka", "Lutjet · Fjalori · Pyetje · Pagëzimi"],
      ["sherbesa", "candle", "Shërbesa", "Mbrëmësorja dhe Mëngjesorja"],
      ["edjela", "music", "Shërbesa e së Dielës", "Tipikoja + Tetëtingullshi i tingullit"],
      ["dcs", "music", "Shërbesat · DCS", "GOARCH"],
      ["pasdarka", "candle", "Pasdarka", "E Vogël dhe e Madhe · me ose pa prift"],
      ["akathisti/0/0", "candle", "Himni Akathist", "Përshëndetjet e Hyjlindëses"],
      ["kungata", "cross", "Kungimi Hyjnor", "Shërbesa para dhe pas Kungimit"],
      ["jerontikoni", "quote", "Jerontikoni", "Fjalët e Etërve të Shkretëtirës"],
      ["eterit", "quote", "Thesari i Etërve", "836 fjalë · sipas temave · kërkim"],
    ];
    listPane.innerHTML = `
      <header class="page-head"><h1>Lexo</h1>${themeBtn()}</header>
      <p class="greet">${esc(greeting())}</p>
      <div id="nameSlot">${nameDayBanner()}${myNameDayHtml()}</div>
      ${unbaptized() ? (() => { const [t, r] = INVITE[new Date().getDate() % INVITE.length]; return `<a class="bap-invite inv-card" href="#/biblioteka/pagezimi">${icon("cross")}<span><b>Krishti të fton${userName() ? ", " + esc(userName()) : ""}</b><q>${esc(t)}</q><small>${esc(r)} · Si të pagëzohem në Kishën Orthodhokse ›</small></span></a><button class="btn bap-done-btn wide" data-baptized>${icon("check")}<span>U pagëzova ☦</span></button>`; })() : ""}
      <div id="icSlot"></div>
      <div id="todaySlot">${todayCardHtml(t)}</div>
      <a class="kal-banner" href="#/kalendari">${icon("calendar")}<span><b>Kalendari Kishtar</b><small>Liturgjitë, kreshmët dhe leximet e çdo dite</small></span></a>
      <h2 class="hub-h">Librat</h2>
      <div class="tiles">${tiles.map(([k, ic, t, s]) => `
        <a class="tile" href="#/${k}">${icon(ic)}<strong>${t}</strong><span>${s}</span></a>`).join("")}</div>
`;
    bindCards(listPane, { [v.id]: v });
    fillIconCard();
    if (!data.tipikoja) load("tipikoja").then(() => { const slot = $("#todaySlot"); const td = Today.data || store.get("today", null); if (slot && td) slot.innerHTML = todayCardHtml(td); });
    if (Persons.all().length && !data.tipikoja) load("tipikoja").then(() => { const ns = $("#nameSlot"); if (ns) { ns.innerHTML = nameDayBanner() + myNameDayHtml(); enter(ns); } });
    Today.load().then((td) => { const slot = $("#todaySlot"); if (slot && td && (!t || td.key !== t.key || !slot.innerHTML.trim())) { slot.innerHTML = todayCardHtml(td); enter(slot); } });
    enter(listPane);
    if (wide()) showPsalm(data.psaltiri, v.n, v.vi);
    setMode(wide() ? "read" : "list");
  }

  function card(item, eyebrow, hero) {
    const on = isLiked(item.id);
    return `<article class="card${hero ? " hero" : ""}" data-id="${esc(item.id)}">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
      <blockquote>${esc(item.text)}</blockquote>
      <cite>${esc(item.ref)}</cite>
      <div class="card-actions">
        <button class="chip${on ? " on" : ""}" data-act="like" aria-label="Pëlqej">${icon(on ? "heart-fill" : "heart")}<span>Pëlqej</span></button>
        ${item.link ? `<a class="chip" href="${item.link}" aria-label="Lexo">${icon("book")}<span>Lexo</span></a>` : ""}
        <button class="chip" data-act="share" aria-label="Ndaj">${icon("send")}<span>Ndaj</span></button>
      </div></article>`;
  }

  function bindCards(root, items) {
    $$(".card[data-id]", root).forEach((el) => {
      const item = items[el.dataset.id];
      $$("[data-act]", el).forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.act === "like") {
          const on = toggleLike(item);
          b.classList.toggle("on", on);
          b.querySelector("use").setAttribute("href", "#i-" + (on ? "heart-fill" : "heart"));
        } else ShareSheet.open(item);
      }));
    });
  }
  // data liturgjike për kartolinat: “15 nëntor 2026 · Kreshma e Krishtlindjes”
  function litLabel(d) {
    d = d || new Date();
    const f = Fast.info(d);
    return `${d.getDate()} ${MUAJ_G[d.getMonth()]} ${d.getFullYear()}${f.feast ? " · " + f.feast : f.period ? " · " + f.period : ""}`;
  }


  function profileChip() {
    return `<button class="profile-chip" id="profileChip"><span class="avatar">${esc(profileName().slice(0, 1).toUpperCase())}</span>${esc(profileName())} ▾</button>`;
  }

  async function viewLikes() {
    const entries = Object.entries(likes).sort((a, b) => b[1].at - a[1].at);
    const items = {};
    entries.forEach(([id, v]) => (items[id] = Object.assign({ id }, v)));
    listPane.innerHTML = `
      <header class="page-head"><h1>Të pëlqyerat</h1>${profileChip()}</header>
      ${entries.length ? entries.map(([id]) => card(items[id], "", false)).join("")
        : `<div class="empty">${icon("heart")}<h3>Ende asgjë</h3><p>Prek dy herë një pasazh ose ♥ dhe do ta gjesh këtu.</p></div>`}`;
    bindCards(listPane, items);
    $("#profileChip").addEventListener("click", Profiles.open);
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  async function viewNotes() {
    listPane.innerHTML = `
      <header class="page-head"><h1>Shënimet</h1>${profileChip()}</header>
      <button class="btn primary wide" id="noteNew">${icon("pen")}<span>Shënim i ri</span></button>
      <div class="notes">${notes.length ? notes.map((n, i) => `
        <article class="note-card" data-i="${i}">
          ${n.text ? `<blockquote>“${esc(shortText(n.text, 180))}”</blockquote><p class="note-ref">${esc(n.ref)}</p>` : ""}
          <p class="note-text">${esc(n.note)}</p>
          <p class="note-date">${fmtDate(n.at)}${n.link ? ` · <a href="${n.link}">Lexo</a>` : ""}</p>
        </article>`).join("")
        : `<div class="empty">${icon("pen")}<h3>Asnjë shënim</h3><p>Shkruaj mendimet e tua. Te Kreu, mbaj gishtin mbi një pasazh për t'i shtuar shënim; te Lexo, prek një varg.</p></div>`}</div>`;
    $("#profileChip").addEventListener("click", Profiles.open);
    $("#noteNew").addEventListener("click", () => Notes.edit(null, null));
    $$(".note-card", listPane).forEach((c) => c.addEventListener("click", (e) => { if (!e.target.closest("a")) Notes.edit(notes[+c.dataset.i]); }));
    enter(listPane);
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  async function viewCredits() {
    const im = await load("imazhet");
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Imazhet</h1></header>
      <p class="muted">Licencat e fotografive (kërkohen nga licencat Creative Commons).</p>
      <ol class="credits">${((im && im.images) || []).map((c) => `
        <li><strong>${esc(c.title)}</strong><br>${esc(c.author || "Autor i panjohur")} · ${esc(c.license)}<br>
        <a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.source)}</a></li>`).join("")}</ol>`;
    mainPane.innerHTML = emptyMain();
    setMode("list");
  }

  /* ---------- PSALTIRI ---------- */
  async function viewPsaltiri(n) {
    const ps = await load("psaltiri");
    renderPsaltiriList(ps, n ? +n : null);
    if (n) { showPsalm(ps, +n); setMode("read"); }
    else {
      enter(listPane);
      if (wide()) showPsalm(ps, store.get("lastPsalm", 1));
      setMode(wide() ? "read" : "list");
    }
  }

  function renderPsaltiriList(ps, current) {
    const byN = Object.fromEntries(ps.psalms.map((p) => [p.n, p]));
    const openK = current ? (byN[current] || {}).k : null;
    listPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>Psaltiri</h1></header>
      <label class="search">${icon("search")}<input id="psSearch" type="search" placeholder="Kërko në psalme…" autocomplete="off" enterkeyhint="search"></label>
      <div id="psResults"></div>
      <div id="psKath">${ps.kathismata.map((k) => `
        <details class="kath"${k.n === openK ? " open" : ""}>
          <summary>${esc(k.title)}</summary>
          <ul class="list">${k.psalms.map((n) => byN[n] ? `
            <li><a class="list-item" href="#/psaltiri/${n}"${n === current ? ' aria-current="true"' : ""}>
              <span class="num">${n}</span>
              <span class="lbl">${esc(byN[n].v[0].slice(0, 64))}…<span class="sub">${esc(byN[n].title || "")}</span></span></a></li>` : "").join("")}
          </ul></details>`).join("")}
      </div>`;
    const input = $("#psSearch");
    input.addEventListener("input", () => searchPsalms(ps, input.value));
  }

  let pendingVerse = null;
  function searchPsalms(ps, q) {
    const out = $("#psResults");
    const kath = $("#psKath");
    q = q.trim().toLowerCase();
    if (q.length < 3) { out.innerHTML = ""; kath.hidden = false; return; }
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const nq = norm(q);
    const hits = [];
    for (const p of ps.psalms) p.v.forEach((v, i) => { if (hits.length < 80 && norm(v).includes(nq)) hits.push([p.n, i, v]); });
    kath.hidden = true;
    out.innerHTML = `<p class="muted">${hits.length} rezultate${hits.length === 80 ? "+" : ""}</p><ul class="list">${hits.map(([n, i, v]) => `
      <li><a class="list-item" href="#/psaltiri/${n}" data-verse="${i}"><span class="num">${n}:${i + 1}</span><span class="lbl">${esc(v)}</span></a></li>`).join("")}</ul>`;
    $$("a[data-verse]", out).forEach((a) => a.addEventListener("click", () => { pendingVerse = +a.dataset.verse; }));
  }

  function showPsalm(ps, n, highlight, fromFeed) {
    const p = ps.psalms.find((x) => x.n === n) || ps.psalms[0];
    if (!fromFeed) store.set("lastPsalm", p.n);
    const marks = Object.fromEntries((p.marks || []).map((m) => [m.at, m.t]));
    const idx = ps.psalms.indexOf(p);
    const prev = ps.psalms[idx - 1], next = ps.psalms[idx + 1];
    mainPane.innerHTML = `
      <header class="page-head">
        <a class="back-btn" href="#/psaltiri" aria-label="Lista e psalmeve">${icon("back")}</a>
        <h2 style="font-size:15px">${esc(ps.kathismata[p.k - 1].title)}</h2>
        <div class="reader-tools">
          <button class="icon-btn" data-size="-1" aria-label="Shkronja më të vogla" style="font-size:14px">A−</button>
          <button class="icon-btn" data-size="1" aria-label="Shkronja më të mëdha" style="font-size:19px">A+</button>
        </div>
      </header>
      <article class="reader">
        <h2>Psalmi ${p.n}</h2>
        <p class="super">${esc(p.title || "")}</p>
        <div class="verses" lang="sq">${p.v.map((v, i) => `${marks[i] ? `<p class="stasis">✣ ${esc(marks[i])} ✣</p>` : ""}<p class="verse${isLiked(`ps:${p.n}:${i + 1}`) ? " liked" : ""}" data-i="${i}" tabindex="0" role="button"><sup>${i + 1}</sup>${esc(v)}</p>`).join("")}</div>
        ${p.doxa ? `<p class="doxa">Lavdi Atit e Birit edhe Shpirtit të Shenjtë.<br>Tani e përherë e në jetë të jetëve. Amin.<br>Aliluia, aliluia, aliluia. Lavdi më ty, o Perëndi. <small>(3 herë)</small></p>` : ""}
        <nav class="pager">
          ${prev ? `<a class="btn" href="#/psaltiri/${prev.n}">${icon("back")} Psalmi ${prev.n}</a>` : "<span></span>"}
          ${next ? `<a class="btn" href="#/psaltiri/${next.n}">Psalmi ${next.n} <svg style="transform:scaleX(-1)"><use href="#i-back"/></svg></a>` : ""}
        </nav>
      </article>`;
    enter(mainPane);
    $$("[data-size]", mainPane).forEach((b) => b.addEventListener("click", () => {
      readSize = Math.max(15, Math.min(34, readSize + +b.dataset.size * 2));
      store.set("readSize", readSize);
      document.documentElement.style.setProperty("--read-size", readSize + "px");
    }));
    $$(".verse", mainPane).forEach((el) => {
      const open = () => {
        const i = +el.dataset.i;
        VerseSheet.open({ kind: "psaltiri", id: `ps:${p.n}:${i + 1}`, text: p.v[i], ref: psalmRef(p.n, i + 1), link: `#/psaltiri/${p.n}` }, el);
      };
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    $$(".list-item[aria-current]", listPane).forEach((a) => a.removeAttribute("aria-current"));
    const cur = $(`.list-item[href="#/psaltiri/${p.n}"]`, listPane);
    if (cur) { cur.setAttribute("aria-current", "true"); if (wide()) cur.scrollIntoView({ block: "nearest" }); }
    let hv = highlight != null ? highlight : pendingVerse;
    if (hv == null && focusNext && focusNext.kind === "psaltiri" && focusNext.ctx && focusNext.ctx.n === p.n) hv = focusNext.ctx.vi;
    focusNext = null;
    pendingVerse = null;
    if (hv != null) {
      const el = $(`.verse[data-i="${hv}"]`, mainPane);
      if (el) { el.classList.add("focus"); setTimeout(() => el.scrollIntoView({ block: "center", behavior: fromFeed ? "auto" : "smooth" }), 50); }
    } else mainPane.scrollTop = 0;
  }

  /* ---------- ETËRIT ---------- */


  function emptyMain() {
    return `<div class="empty">${icon("cross")}<h3>Fjala e Shenjtë</h3><p>Zgjidh një pasazh për ta lexuar, pëlqyer ose ndarë.</p></div>`;
  }

  /* ---------- UNGJILLI / APOSTULLI / DHIATA E VJETËR ---------- */
  const BOOKS = {
    ungjilli: { file: "ungjilli", title: "Ungjilli", icon: "book", pending: "" },
    apostulli: { file: "apostulli", title: "Apostulli", icon: "letter", pending: "" },
    dhiata: { file: "dhiata-vjeter", title: "Dhiata e Vjetër", icon: "scroll", pending: "Dhiata e Vjetër do shtohet së shpejti." },
    tipikoja: { file: "tipikoja", title: "Tipikoja 2026", icon: "calendar", pending: "" },
    sherbesa: { file: "sherbesa", title: "Shërbesa e Mbrëmësores dhe e Mëngjesores", icon: "candle", pending: "" },
    profecite: { file: "profecite", title: "Libri i Profecive", icon: "scroll", pending: "" },
    jerontikoni: { file: "jerontikoni", title: "Jerontikoni", icon: "quote", pending: "" },
    pasdarka: { file: "pasdarka", title: "Pasdarka", icon: "candle", pending: "" },
    kungata: { file: "kungimi", title: "Kungimi Hyjnor", icon: "cross", pending: "" },
    akathisti: { file: "akathisti", title: "Himni Akathist", icon: "candle", pending: "" },
  };

  // Dita e sotme në Tipikon: [indeksi i muajit, indeksi i ditës]
  function tipikonToday(tp) {
    const d = new Date();
    const sec = tp && tp.sections[d.getMonth()];
    if (!sec) return null;
    const ii = sec.items.findIndex((it) => parseInt(it.title, 10) === d.getDate());
    return ii < 0 ? null : [d.getMonth(), ii];
  }

  // Blloqet e librave të shërbesave (udhëzime, role, vargje, referenca)
  const kwHtml = (t) => esc(t).replace(/(^|[\s“"(])([A-ZËÇ][A-ZËÇ’'\-]{3,}(?:\s+[A-ZËÇ][A-ZËÇ’'\-]{1,})*)/g, '$1<b class="kw">$2</b>');
  // Vargjet: çdo “Varg:” dhe çdo varg psalmi në kryeradhë të vetën
  const VARG_RE = /\s*(Varg(?:u)?(?:\s+i\s+(?:parë|pare|dytë|tretë|katërt|pestë))?\s*:)\s*/g;
  function versify(text, psalm) {
    const t = String(text || "");
    if (VARG_RE.test(t)) {
      VARG_RE.lastIndex = 0;
      const parts = t.split(VARG_RE).filter((x) => x && x.trim());
      let out = "", lbl = "";
      parts.forEach((x) => {
        if (/^Varg/.test(x.trim()) && /:\s*$/.test(x)) { lbl = x.trim(); return; }
        out += `<span class="vl">${lbl ? `<b class="vlab">${esc(lbl)}</b> ` : ""}${esc(x.trim())}</span>`;
        lbl = "";
      });
      return out;
    }
    VARG_RE.lastIndex = 0;
    if (psalm && t.length > 160) {
      const ss = t.split(/(?<=[.!?;])\s+(?=[A-ZËÇ“«"])/);
      if (ss.length > 1) return ss.map((x) => `<span class="vl">${esc(x)}</span>`).join("");
    }
    return esc(t);
  }
  function blocksHtml(key, blocks, opts) {
    let lastRef = "", inPsalm = false;
    const priest = !opts || opts.priest !== false;
    const scoreBtn = (b) => (b.score && opts && opts.scores && opts.scores[b.score]
      ? `<button class="score-btn" data-score="${b.score}">${icon("music")}<span>Partitura</span></button>` : "");
    // rolet dhe udhëzimet pa “ose”: me prift → klerikët; pa prift → lexuesi
    const pickWho = (w) => {
      if (!w || !/\//.test(w)) return w;
      const ps = w.split("/").map((x) => x.trim());
      return priest ? (ps.find((x) => /Prift|Dhjak|Prelat/i.test(x)) || ps[0]) : (ps.find((x) => /Lexues/i.test(x)) || ps[ps.length - 1]);
    };
    const fixOr = (t) => t
      .replace(/(P|p)relati ose (L|l)exuesi/g, (m, a, b) => (b === "L" || a === "P" ? "Lexuesi" : "lexuesi"))
      .replace(/(D|d)hjaku ose prifti/g, (m, a) => (a === "D" ? "Dhjaku" : "dhjaku"))
      .replace(/Prelati ose Prifti/g, "Prifti").replace(/prelati ose prifti/g, "prifti");
    const parts = blocks.map((b, i) => {
      if (b.pr && !priest) return "";          // vetëm kur ka prift
      if (b.np && priest) return "";           // vetëm kur nuk ka prift
      if (!priest && b.t === "rubric" && /prift|dhjak|prelat/i.test(b.x)) return "";   // pa prift: pa shënimet për klerikët
      if (b.t === "rubric" || b.t === "p") b = Object.assign({}, b, { x: fixOr(b.x) });
      if (b.t === "role") b = Object.assign({}, b, { who: pickWho(b.who) });
      const at = `data-i="${i}" tabindex="0" role="button"`;
      if (b.t === "h") inPsalm = /^(Psalmi|Gjashtë Psalmet|Dhoksologjia)/i.test(b.x);
      else if (b.t === "rubric" && !/^Dhe përsëri/.test(b.x)) inPsalm = false;
      switch (b.t) {
        case "chant": return `<div class="blk-chant">${b.tone ? `<p class="chant-tone">${esc(b.tone)}</p>` : ""}<p class="verse" ${at}>${esc(b.x).replace(/\*/g, '<span class="star">*</span>')}</p>${scoreBtn(b)}</div>`;
        case "h": return `<h3 class="blk-h" id="b${i}">${esc(b.x)}</h3>${scoreBtn(b)}`;
        case "rubric": return `<p class="blk-rubric">${esc(b.x)}</p>`;
        case "fast": return `<p class="blk-fast">${esc(b.x)}</p>`;
        case "saints": return `<p class="blk-saints">${esc(b.x)}</p>`;
        case "ref": lastRef = b.x; return `<p class="blk-ref">${esc(b.x)}</p>`;
        case "role": return `<p class="verse blk-role${b.cont ? " cont" : ""}" ${at}><span class="who">${esc(b.who || "")}</span>${versify(b.x, inPsalm)}</p>`;
        case "verse": return `<p class="verse blk-verse" ${at}>${esc(b.x)}</p>`;
        default: return `<p class="verse para" ${at}>${key === "tipikoja" ? kwHtml(b.x) : versify(b.x, inPsalm)}</p>${scoreBtn(b)}`;
      }
    });
    // Uratat e priftit (Urata I, II…, Urata e Hyrjes): gjithmonë të fshehura, me butonin “Shfaq uratat”
    const isUrataH = (b) => key === "sherbesa" && b && b.t === "h" && /^Urata\b/.test(b.x);
    let out = "", k = 0;
    while (k < blocks.length) {
      if (!isUrataH(blocks[k])) { out += parts[k]; k++; continue; }
      let end = k, n = 0;
      while (end < blocks.length) {
        if (isUrataH(blocks[end])) { n++; end++; continue; }
        if (blocks[end].t === "h" || blocks[end].t === "rubric" || blocks[end].t === "role") break;
        end++;
      }
      out += `<div class="urata-wrap"><button type="button" class="urata-btn" aria-expanded="false">${icon("cross")}<span>Shfaq ${n > 1 ? "uratat (" + n + ")" : "uratën"}</span></button><div class="urata-body" hidden>${parts.slice(k, end).join("")}</div></div>`;
      k = end;
    }
    return out;
  }
  let priestMode = store.get("priestMode", true);

  // Partitura (notacion bizantin) në ekran të plotë
  const ScoreViewer = (() => {
    let el = null;
    function open(sc) {
      if (!sc) return;
      if (!el) {
        el = document.createElement("div");
        el.className = "score-viewer";
        document.body.appendChild(el);
        el.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
      }
      el.innerHTML = `<header><button class="icon-btn" data-close aria-label="Mbyll">${icon("close")}</button><h2>${esc(sc.title)}</h2></header>
        <div class="score-pages">${sc.pages.map((src) => `<img src="${src}" alt="Partitura" loading="lazy">`).join("")}</div>`;
      el.hidden = false;
      requestAnimationFrame(() => el.classList.add("open"));
    }
    function close() { if (el) { el.classList.remove("open"); setTimeout(() => (el.hidden = true), 300); } }
    return { open, close };
  })();

  // referenca e saktë e bllokut (p.sh. leximi "Isaia 61:1-10" para tij)
  function blockRef(it, bi) {
    for (let k = bi; k >= 0; k--) if (it.blocks[k].t === "ref") return it.blocks[k].x;
    return it.title.split(" · ")[0];
  }

  async function viewBook(key, si, ii) {
    const meta = BOOKS[key];
    const book = await load(meta.file);
    if (!book) {
      listPane.innerHTML = `<header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>${meta.title}</h1></header>
        <div class="empty">${icon(meta.icon)}<h3>Së shpejti</h3><p>${esc(meta.pending)}</p></div>`;
      enter(listPane);
      mainPane.innerHTML = emptyMain();
      setMode("list");
      return;
    }
    const mark = (a, it) => {
      if (key !== "tipikoja") return "";
      const f = Fast.info(new Date(2026, a, parseInt(it.title, 10) || 1));
      return `<span class="tp-marks">${f.level && f.level.cls !== "free" ? `<i class="lg lv-${f.level.cls}" title="${esc(f.level.name)}"></i>` : ""}${litDay(f, it) ? `<i class="cal-x${f.great ? " great" : ""}">✝</i>` : ""}</span>`;
    };
    listPane.innerHTML = `<header class="page-head"><a class="back-btn" href="#/lexo" aria-label="Kthehu">${icon("back")}</a><h1>${esc(meta.title)}</h1></header>
      ${key === "tipikoja" ? `<div id="calSlot"></div>` : ""}
      ${book.sections.map((s, a) => `<details class="kath"${String(a) === si ? " open" : ""}><summary>${esc(s.title)}</summary><ul class="list">
        ${s.items.map((it, b) => `<li><a class="list-item" href="#/${key}/${a}/${b}"${String(a) === si && String(b) === ii ? ' aria-current="true"' : ""}>
          <span class="lbl">${esc(it.title)}${it.ref ? `<span class="sub">${esc(niceRef(key, it.ref))}</span>` : ""}</span>${mark(a, it)}</a></li>`).join("")}
      </ul></details>`).join("")}`;
    if (key === "tipikoja") mountCalendar(book);
    if (si === "sot" && key === "tipikoja") {
      // Tipikoja hapet direkt te dita e sotme
      const t = tipikonToday(book);
      if (t) { location.replace(`#/tipikoja/${t[0]}/${t[1]}`); return; }
    }
    if (si == null) { enter(listPane); mainPane.innerHTML = emptyMain(); setMode("list"); return; }
    renderBookItem(key, book, +si, +ii);
    const cur = $(`.list-item[href="#/${key}/${si}/${ii}"]`, listPane);
    if (cur && wide()) cur.scrollIntoView({ block: "center" });
    setMode("read");
  }

  function renderBookItem(key, book, si, ii, highlight, fromFeed, excerpt) {
    const sec = book.sections[si], it = sec && sec.items[ii];
    if (!it) return;
    if (highlight == null && focusNext && focusNext.kind === key && focusNext.ctx && focusNext.ctx.si === si && focusNext.ctx.ii === ii) {
      highlight = focusNext.ctx.pi; excerpt = focusNext.text;
    }
    if (!fromFeed) focusNext = null;
    const ref = niceRef(key, it.ref);
    if (it.blocks) {
      const heads = it.blocks.map((b, i) => [b, i]).filter(([b]) => b.t === "h" && !/^Urata/.test(b.x));
      const today = key === "tipikoja" && (tipikonToday(book) || []).join() === `${si},${ii}`;
      mainPane.innerHTML = `
        <header class="page-head"><a class="back-btn" href="#/${key}" aria-label="Kthehu">${icon("back")}</a><h2 style="font-size:15px">${esc(sec.title)}</h2>
          <div class="reader-tools">
            <button class="icon-btn" data-size="-1" aria-label="Shkronja më të vogla" style="font-size:14px">A−</button>
            <button class="icon-btn" data-size="1" aria-label="Shkronja më të mëdha" style="font-size:19px">A+</button>
          </div></header>
        <article class="reader"><h2 class="reading-title">${esc(it.title)}${today ? '<span class="today-badge">SOT</span>' : ""}</h2>
          ${it.ref ? `<p class="super ref-exact">${esc(it.ref)}</p>` : ""}
          ${key === "tipikoja" ? (() => { const f = Fast.info(new Date(2026, si, parseInt(it.title, 10) || 1)); return fastCardHtml(f, { liturgy: litDay(f, it) }) + `<div class="tp-acts"><a class="btn sx-link" href="#/sinaksari/${si + 1}/${parseInt(it.title, 10) || 1}">${icon("calendar")}<span>Sinaksari i ditës</span></a></div>`; })() : ""}
          ${heads.length > 5 ? `<details class="toc-wrap"><summary>Përmbajtja (${heads.length})</summary><nav class="toc">${heads.map(([b, i]) => `<button data-jump="${i}">${esc(b.x.slice(0, 28))}</button>`).join("")}</nav></details>` : ""}
          ${it.priest ? `<div class="seg priest-seg" role="radiogroup" aria-label="Kush e drejton">
              <button data-priest="1" aria-checked="${priestMode}">${icon("cross")}<span>Me prift</span></button>
              <button data-priest="0" aria-checked="${!priestMode}">${icon("book")}<span>Pa prift (lexuesi)</span></button></div>` : ""}
          <div class="verses" lang="sq">${blocksHtml(key, it.blocks, { priest: !it.priest || priestMode, scores: book.scores })}</div>
          <nav class="pager">
            ${ii > 0 ? `<a class="btn" href="#/${key}/${si}/${ii - 1}">${icon("back")} ${esc(sec.items[ii - 1].title.split(" · ")[0].slice(0, 18))}</a>` : "<span></span>"}
            ${ii < sec.items.length - 1 ? `<a class="btn" href="#/${key}/${si}/${ii + 1}">${esc(sec.items[ii + 1].title.split(" · ")[0].slice(0, 18))} <svg style="transform:scaleX(-1)"><use href="#i-back"/></svg></a>` : ""}
          </nav></article>`;
      enter(mainPane);
      $$("[data-size]", mainPane).forEach((b) => b.addEventListener("click", () => {
        readSize = Math.max(15, Math.min(34, readSize + +b.dataset.size * 2));
        store.set("readSize", readSize);
        document.documentElement.style.setProperty("--read-size", readSize + "px");
      }));
      $$("[data-priest]", mainPane).forEach((b) => b.addEventListener("click", () => {
        priestMode = b.dataset.priest === "1";
        store.set("priestMode", priestMode);
        const top = mainPane.scrollTop;
        renderBookItem(key, book, si, ii);
        mainPane.scrollTop = top;
        toast(priestMode ? "Me prift" : "Pa prift — lexuesi nis: “Në emër të Atit…”");
      }));
      $$("[data-score]", mainPane).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); ScoreViewer.open(book.scores[b.dataset.score]); }));
      $$("[data-jump]", mainPane).forEach((b) => b.addEventListener("click", () => {
        const t = $("#b" + b.dataset.jump, mainPane);
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      }));
      $$(".verse", mainPane).forEach((el) => el.addEventListener("click", () => {
        const bi = +el.dataset.i;
        VerseSheet.open({ kind: key, id: `${key}:${si}:${ii}:b${bi}`, text: shortText(it.blocks[bi].x.replace(/\n/g, " ")), ref: blockRef(it, bi), link: `#/${key}/${si}/${ii}` }, el);
      }));
      if (highlight != null) {
        const el = $(`.verse[data-i="${highlight}"]`, mainPane);
        if (el) { el.classList.add("focus"); markExcerpt(el, excerpt); setTimeout(() => ($(".hl", el) || el).scrollIntoView({ block: "center", behavior: fromFeed ? "auto" : "smooth" }), 60); }
      } else mainPane.scrollTop = 0;
      return;
    }
    mainPane.innerHTML = `
      <header class="page-head"><a class="back-btn" href="#/${key}" aria-label="Kthehu">${icon("back")}</a><h2 style="font-size:15px">${esc(sec.title)}</h2></header>
      <article class="reader"><h2 class="reading-title">${esc(it.title)}</h2>${ref ? `<p class="super ref-exact">${esc(ref)}</p>` : ""}
        ${it.pre && it.pre.length ? `<div class="prokimen">${it.pre.map((l) => `<p>${esc(l)}</p>`).join("")}</div>` : ""}
        <div class="verses" lang="sq">${it.v.map((v, i) => it.plain
          ? `<p class="verse para" data-i="${i}" tabindex="0" role="button">${esc(v)}</p>`
          : `<p class="verse" data-i="${i}" tabindex="0" role="button"><sup>${i + 1}</sup>${esc(v)}</p>`).join("")}</div>
      </article>`;
    enter(mainPane);
    $$(".verse", mainPane).forEach((el) => el.addEventListener("click", () => {
      const i = +el.dataset.i;
      VerseSheet.open({
        kind: key, id: `${key}:${si}:${ii}:${i + 1}`,
        text: it.plain ? shortText(it.v[i]) : it.v[i],
        ref: it.plain ? ref : `${ref}, ${i + 1}`,
        link: `#/${key}/${si}/${ii}`,
      }, el);
    }));
    if (highlight != null) {
      const el = $(`.verse[data-i="${highlight}"]`, mainPane);
      if (el) { el.classList.add("focus"); markExcerpt(el, excerpt); setTimeout(() => ($(".hl", el) || el).scrollIntoView({ block: "center", behavior: fromFeed ? "auto" : "smooth" }), 60); }
    } else mainPane.scrollTop = 0;
  }

  /* ---------- Fleta e vargut (te Lexo) ---------- */
  const VerseSheet = (() => {
    const el = $("#verseSheet");
    let item = null, src = null;
    function open(it, source) {
      item = it; src = source;
      $("#sheetRef").textContent = it.ref;
      $("#sheetText").textContent = it.text;
      updateLike();
      el.hidden = false;
    }
    function close() { el.hidden = true; }
    function updateLike() {
      const b = $('[data-act="like"]', el);
      const on = isLiked(item.id);
      b.querySelector("use").setAttribute("href", "#i-" + (on ? "heart-fill" : "heart"));
      b.querySelector("span").textContent = on ? "Pëlqyer" : "Pëlqej";
    }
    el.addEventListener("click", async (e) => {
      if (e.target === el) return close();
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "close") close();
      else if (act === "like") { const on = toggleLike(item); updateLike(); src && src.classList.toggle("liked", on); }
      else if (act === "note") { close(); Notes.edit(null, item); }
      else if (act === "copy") {
        try { await navigator.clipboard.writeText(`“${item.text}”\n— ${item.ref}`); toast("U kopjua"); } catch (err) { toast("Nuk u kopjua"); }
      } else if (act === "share") { close(); ShareSheet.open(item); }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $$(".sheet").forEach((s) => (s.hidden = true)); Music.closeSheet(); } });
    return { open, close };
  })();

  /* ---------- Pajisjet e palosshme (Fold / Flip / Duo) ---------- */
  function checkPosture() {
    const dp = navigator.devicePosture;
    const folded = dp && dp.type === "folded";
    const segs = window.viewport && window.viewport.segments;
    const vertical = segs && segs.length === 2 && segs[0].width === segs[1].width && segs[0].top !== segs[1].top;
    app.classList.toggle("flex-mode", !!((folded && window.innerWidth < 640) || vertical));
  }
  if (navigator.devicePosture) navigator.devicePosture.addEventListener("change", () => { checkPosture(); route(); });
  let resizeT, lastWide = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      checkPosture();
      const w = wide();
      if (w !== lastWide) { lastWide = w; route(); }
      else if (app.dataset.view === "feed") Feed.refreshActive();
    }, 150);
  });

  // dridhje e lehtë kur shtyp butonat (si në aplikacionet e mëdha)
  document.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, .btn, .chip, .tile, .rail-btn, .site-link, .nav-btn") && navigator.vibrate) {
      try { navigator.vibrate(7); } catch (x) { /* */ }
    }
  }, { passive: true });

  /* ---------- Përditësimet private të APK-së ---------- */
  const APP_VERSION = "2.7.6";
  const UPDATE_BASE = "https://nelo1231.github.io/fjala-e-shenjte-live";   // GitHub Pages; APK-ja te GitHub Releases
  async function checkAppUpdate() {
    try {
      if (!navigator.onLine) return;
      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), 10000);
      const u = UPDATE_BASE + "/update.json?t=" + Date.now();
      let data;
      try {
        const r = await fetch(u, { cache: "no-store", credentials: "omit", signal: ctl.signal });
        if (!r.ok) throw new Error("HTTP " + r.status);
        data = await r.json();
      } catch (e) {
        // serveri nuk dërgon CORS: në aplikacionin Android e lexon Android-i drejtpërdrejt
        if (!(android && android.fetchText)) return;
        data = JSON.parse(await fetchHtml(u));
      }
      clearTimeout(tm);
      // vetëm kur versioni në server është më i ri (p.sh. 2.1.10 > 2.1.9), jo kur është më i vjetër
      const newer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; } return false; };
      if (!data || !data.version || !newer(data.version, APP_VERSION) || !data.apk) return;
      showUpdate(data);
    } catch (e) { /* pa internet ose gabim: aplikacioni vazhdon normalisht */ }
  }
  function showUpdate(data) {
    const old = $("#updateSheet");
    if (old && old.classList.contains("open")) return;
    if (old) old.remove();
    const url = /^https:\/\//.test(String(data.apk)) ? String(data.apk) : UPDATE_BASE + "/" + String(data.apk).replace(/^\/+/, "");
    const el = document.createElement("div");
    el.className = "sheet update-sheet";
    el.id = "updateSheet";
    el.innerHTML = `<div class="sheet-card update-card" role="dialog" aria-modal="true" aria-labelledby="updTitle">
        <div class="upd-icon">${icon("cross")}</div>
        <h2 id="updTitle">${esc("Ka dalë një version i ri (" + data.version + ")")}</h2>
        ${data.notes ? `<p class="upd-notes">${esc(data.notes)}</p>` : `<p class="upd-notes">Versioni yt: ${APP_VERSION}</p>`}
        <div class="upd-progress" hidden><div class="upd-bar"><i></i></div><p class="upd-status">Po shkarkohet…</p></div>
        <a class="btn primary upd-go" href="${esc(url)}" target="_blank" rel="noopener">${icon("download")}<span>Shkarko Përditësimin</span></a>
        <button class="btn upd-later" type="button">Më vonë</button>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    const go = $(".upd-go", el), later = $(".upd-later", el), prog = $(".upd-progress", el);
    const bar = $(".upd-bar i", el), status = $(".upd-status", el);
    const setBtn = (label, ic, mode) => { go.innerHTML = `${icon(ic)}<span>${esc(label)}</span>`; go.dataset.mode = mode; go.hidden = false; };
    // ngjarjet nga Android-i gjatë shkarkimit dhe instalimit
    window.FSUpdate = (type, arg) => {
      if (type === "progress") {
        const [pct, bytes] = String(arg).split(":").map(Number);
        prog.classList.toggle("indet", pct < 0);
        if (pct >= 0) bar.style.width = pct + "%";
        status.textContent = pct >= 0 ? `Po shkarkohet… ${pct}%` : `Po shkarkohet… ${(bytes / 1048576).toFixed(1)} MB`;
      } else if (type === "ready") {
        bar.style.width = "100%"; status.textContent = "U shkarkua ✓"; el.classList.add("ready");
        setBtn("Instalo", "check", "install");
      } else if (type === "permission") {
        status.textContent = "Lejo “Instalo aplikacione të panjohura” për Fjala e Shenjtë, pastaj kthehu këtu.";
      } else if (type === "installing") {
        status.textContent = "Shtyp “Përditëso” në dritaren e Android-it.";
        setBtn("Instalo", "check", "install");
      } else if (type === "cancel") {
        status.textContent = "Instalimi u anulua."; setBtn("Instalo", "check", "install");
      } else if (type === "error") {
        status.textContent = arg || "Diçka nuk shkoi."; el.classList.remove("busy");
        setBtn("Provo përsëri", "refresh", "retry");
      }
    };
    go.addEventListener("click", (e) => {
      e.preventDefault();
      if (android && android.downloadUpdate) {
        if (go.dataset.mode === "install") { android.installUpdate(); return; }
        prog.hidden = false; el.classList.add("busy"); go.hidden = true;
        later.textContent = "Fshihe";
        bar.style.width = "0%"; status.textContent = "Po shkarkohet…";
        android.downloadUpdate(url);
        return;
      }
      if (android && android.openExternal) android.openExternal(url);
      else window.open(url, "_system") || window.open(url, "_blank");
      close();
    });
    later.addEventListener("click", close);
    el.addEventListener("click", (e) => { if (e.target === el && !el.classList.contains("busy")) close(); });
  }

  /* ---------- Tema: ndërrim i butë i errët/i ndritshëm + kursim baterie ---------- */
  const rootEl = document.documentElement;
  // 3 ngjyra: Pergamenë (e çelët), Kafe (e errët), Blu bizantine (e errët ndryshe) — ose sipas telefonit
  const APP_THEMES = { auto: null, light: { d: 0, bar: "#F6EFE2" }, dark: { d: 1, bar: "#362D25" }, blu: { d: 1, bar: "#141C2E" } };
  const sysDark = () => { try { if (android && android.isDark) return !!android.isDark(); } catch (e) { /* */ } return !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches); };
  function applyTheme(anim) {
    const ch = store.get("theme", "auto"), t = APP_THEMES[ch] || null;
    const dark = t ? !!t.d : sysDark(), pal = ch === "blu" ? "blu" : "";
    if (anim) { rootEl.classList.add("theme-anim"); clearTimeout(window.__thT); window.__thT = setTimeout(() => rootEl.classList.remove("theme-anim"), 520); }
    rootEl.dataset.theme = dark ? "dark" : "light";
    if (pal) rootEl.dataset.palette = pal; else delete rootEl.dataset.palette;
    const bar = t ? t.bar : dark ? "#362D25" : "#F6EFE2";
    $('meta[name="theme-color"]')?.setAttribute("content", bar);
    try { if (android && android.setBars) android.setBars(bar, dark); } catch (e) { /* */ }
  }
  window.FSTheme = () => applyTheme(true);   // thirret nga Android kur ndërrohet tema e telefonit
  applyTheme(false);
  if (!android && window.matchMedia) {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(() => applyTheme(true));
  }
  const themeBtn = () => `<button class="th-btn" type="button" aria-label="Ngjyrat e aplikacionit" data-theme-btn><i class="s1"></i><i class="s2"></i><i class="s3"></i></button>`;
  function themeSheet() {
    $(".th-sheet")?.remove();
    const cur = store.get("theme", "auto");
    const opts = [["light", "Pergamenë", "E çelët, si letra e vjetër"], ["dark", "Kafe", "E errët e ngrohtë"], ["blu", "Blu bizantine", "E errët, blu e thellë me ar"], ["auto", "Sipas telefonit", "Ndërrohet vetë ditë/natë"]];
    const el = document.createElement("div");
    el.className = "sheet th-sheet";
    el.innerHTML = `<div class="sheet-card th-card" role="dialog" aria-modal="true" aria-label="Ngjyrat">
      <h2>Ngjyrat e aplikacionit</h2>
      <div class="th-opts">${opts.map(([k, n, d]) => `<button type="button" class="th-opt th-${k}" data-th="${k}" aria-checked="${cur === k}"><span class="th-sw"><i></i><i></i><i></i></span><b>${n}</b><small>${d}</small></button>`).join("")}</div>
    </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    const close = () => { el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    el.addEventListener("click", (e) => { if (e.target === el) close(); });
    $$("[data-th]", el).forEach((b) => b.addEventListener("click", () => {
      store.set("theme", b.dataset.th); applyTheme(true); haptic(12);
      $$("[data-th]", el).forEach((x) => x.setAttribute("aria-checked", x === b));
      setTimeout(close, 380);
    }));
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-theme-btn]")) { haptic(8); themeSheet(); } });
  // bateria: ndal animacionet kur aplikacioni nuk shihet dhe ato jashtë ekranit
  document.addEventListener("visibilitychange", () => rootEl.classList.toggle("paused", document.hidden));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("offscreen", !e.isIntersecting)), { rootMargin: "60px" });
    const watch = () => $$(".streak, .ftile, .candle-stand, .draw-stage, .nameday, .today-card, .dp-candle").forEach((el) => { if (!el.__io) { el.__io = 1; io.observe(el); } });
    new MutationObserver(() => { clearTimeout(window.__ioT); window.__ioT = setTimeout(watch, 120); }).observe(document.body, { childList: true, subtree: true });
    watch();
  }

  // qiriri i Minuelit (img/qiri.webp), kur ekziston
  { const im = new Image(); im.onload = () => rootEl.classList.add("has-qiri"); im.src = "img/qiri.webp"; }

  /* ---------- Mirëseardhja: si të quajmë? ---------- */
  // besimtarit i drejtohemi gjithmonë me emrin e pagëzimit (nëse e ka), përndryshe me emrin
  const userName = () => store.get("me.bapt", "") || store.get("me.name", "");
  function greeting() {
    const h = new Date().getHours(), n = userName();
    const g = h < 5 ? "Natë e bekuar" : h < 12 ? "Mirëmëngjes" : h < 18 ? "Mirëdita" : "Mirëmbrëma";
    return n ? `${g}, ${n}` : g;
  }
  function myNameDayHtml() {
    const n = userName();
    if (!n || !data.tipikoja) return "";
    const me = Persons.all().find((x) => x.me);
    const ask = !store.get("me.bapt", "") && !store.get("me.unbaptized", false) && !store.get("me.baptAsked", false)
      ? `<a class="my-nd" href="#/emri">${icon("cross")}<span>Shto <b>emrin e pagëzimit</b> që të dish kur feston</span></a>` : "";
    const m = me && Persons.main(me, data.tipikoja);
    if (!m) return ask;
    return m.inDays === 0 ? `<a class="nameday" href="#/emri">${icon("candle")}<span><b>Gëzuar ditën e emrit, ${esc(n)}! 🎉</b><small>${esc(m.label || m.saints[0] || "")}</small></span></a>`
      : `<a class="my-nd" href="#/emri">${icon("calendar")}<span>Dita e emrit tënd: <b>${m.d} ${MUAJ_G[m.m - 1]}</b> · edhe <b>${m.inDays}</b> ${m.inDays === 1 ? "ditë" : "ditë"}</span></a>` + ask;
  }
  function onboarding() {
    if (store.get("me.asked", false)) return;
    const el = document.createElement("div");
    el.className = "sheet update-sheet onboard";
    el.innerHTML = `<div class="sheet-card update-card" role="dialog" aria-modal="true" aria-labelledby="obT">
        <div class="upd-icon">${icon("cross")}</div>
        <h2 id="obT">Mirë se erdhe</h2>
        <p class="upd-notes">Si të quajmë?</p>
        <form id="obForm"><input id="obName" maxlength="30" placeholder="Emri yt" autocomplete="given-name" enterkeyhint="next">
          <input id="obBapt" maxlength="30" placeholder="Emri i pagëzimit (i detyrueshëm)" autocomplete="off" enterkeyhint="done">
          <label class="ob-check"><input type="checkbox" id="obNo"> Nuk jam pagëzuar ende</label>
          <button class="btn primary upd-go" type="submit">${icon("check")}<span>Vazhdo</span></button></form>
        <button class="btn upd-later" type="button">Më vonë</button>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("open"));
    const close = () => { store.set("me.asked", true); el.classList.remove("open"); setTimeout(() => el.remove(), 300); };
    $(".upd-later", el).addEventListener("click", close);
    $("#obForm", el).addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = $("#obName", el).value.trim().replace(/\s+/g, " ");
      if (!n) return;
      const bapt = $("#obBapt", el).value.trim().replace(/\s+/g, " ");
      const unb = $("#obNo", el).checked;
      if (!unb && !bapt) { $("#obBapt", el).focus(); $("#obBapt", el).classList.add("need"); toast("Shkruaj emrin e pagëzimit (ose shëno “Nuk jam pagëzuar ende”)"); return; }
      store.set("me.name", n);
      store.set("me.bapt", unb ? "" : bapt);
      store.set("me.unbaptized", unb);
      close();
      await load("tipikoja");
      const l = Persons.all().filter((x) => !x.me);
      if (!unb) l.unshift({ name: n, bapt, key: bapt.split(" ")[0], me: true, at: Date.now() });
      store.set("persons", l);
      Persons.schedule();
      goldBurst();
      setTimeout(() => checkAuthor(true), 900);
      const me = !unb && Persons.main(l[0], data.tipikoja);
      toast(me ? `${n}, dita e emrit tënd është ${me.d} ${MUAJ_G[me.m - 1]} 🎉` : `Mirë se erdhe, ${n}!`);
      if (unb) location.hash = "#/biblioteka/pagezimi"; else route();
    });
  }

  load("kalendari");
  // datat e emrave të zgjedhura nga Sinaksari duhen edhe te urimet në Lexo
  if (Persons.all().length) setTimeout(() => loadSynaxAll().then(() => { const ns = $("#nameSlot"); if (ns && data.tipikoja) ns.innerHTML = nameDayBanner() + myNameDayHtml(); }), 2500);
  // fotot nuk ruhen dot veçmas (pa menu "Ruaj imazhin" / tërheqje): ndahen vetëm si foto + tekst + logo
  const PHOTO_SEL = ".reel-bg, .reel, .ic-frame, .ic-img, .dc-photo, #sharePreview, img";
  document.addEventListener("contextmenu", (e) => { if (e.target.closest && e.target.closest(PHOTO_SEL)) e.preventDefault(); });
  document.addEventListener("dragstart", (e) => { if (e.target.closest && e.target.closest(PHOTO_SEL)) e.preventDefault(); });
  /* ---------- Lëvizja e butë dhe kujtimi i pozicionit ---------- */
  const scrollPos = {};
  [listPane, mainPane].forEach((pane) => {
    let last = 0, ticking = false;
    pane.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = pane.scrollTop;
        // kreu: në krye shkrihet me faqen; gjatë lëvizjes del si shirit lundrues; kur ndalon, zhduket
        pane.classList.toggle("scrolled", y > 8);
        if (y > 8) {
          pane.classList.add("scrolling");
          pane.classList.remove("hdr-hide");
          clearTimeout(pane.__idle);
          pane.__idle = setTimeout(() => { pane.classList.remove("scrolling"); if (pane.scrollTop > 40) pane.classList.add("hdr-hide"); }, 1300);
        } else { pane.classList.remove("hdr-hide", "scrolling"); clearTimeout(pane.__idle); }
        last = y;
        const k = location.hash || "#/";
        scrollPos[k] = scrollPos[k] || {};
        scrollPos[k][pane === listPane ? "l" : "m"] = y;
      });
    }, { passive: true });
  });
  function restoreScroll() {
    const p = scrollPos[location.hash || "#/"];
    listPane.classList.remove("hdr-hide"); mainPane.classList.remove("hdr-hide");
    if (!p) { listPane.scrollTop = 0; return; }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (p.l != null) listPane.scrollTop = p.l;
      if (p.m != null) mainPane.scrollTop = p.m;
    }));
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest(".urata-btn");
    if (!b) return;
    const body = b.nextElementSibling, open = body.hidden;
    body.hidden = !open;
    b.setAttribute("aria-expanded", String(open));
    const n = body.querySelectorAll(".blk-h").length;
    b.querySelector("span").textContent = open ? (n > 1 ? "Fshih uratat" : "Fshih uratën") : (n > 1 ? `Shfaq uratat (${n})` : "Shfaq uratën");
    if (open) enter(body);
  });

  // kursimi i baterisë: bateri ≤ 20% pa karikues, ose “Data Saver” → efektet dekorative fiken
  (async () => {
    const setEco = (on) => rootEl.classList.toggle("eco", !!on);
    try { if (navigator.connection && navigator.connection.saveData) setEco(true); } catch (e) { /* */ }
    try {
      if (!navigator.getBattery) return;
      const bt = await navigator.getBattery();
      const upd = () => setEco((!bt.charging && bt.level <= 0.2) || (navigator.connection && navigator.connection.saveData));
      upd(); bt.addEventListener("levelchange", upd); bt.addEventListener("chargingchange", upd);
    } catch (e) { /* */ }
  })();

  /* ---------- Nisja ---------- */
  setTimeout(() => {
    const sp = $("#splash");
    sp.classList.add("hide");
    setTimeout(() => sp.remove(), 800);
  }, 3000);
  checkPosture();
  lastWide = wide();
  Music.init();
  route();
  NewsLive.start();
  setTimeout(checkAppUpdate, 3600);   // pas ekranit hyrës
  setTimeout(syncCandles, 6000);   // njoftimet (dita e emrit, vargu, Liturgjia, qirinjtë) + widget-i i qirinjve
  setTimeout(onboarding, 3400);
  setTimeout(checkAuthor, 4200);
  setTimeout(() => { if (store.get("me.asked", false) && !location.hash.startsWith("#/kungimi")) maybeAskCommunion(); }, 5200);
  // widget-et: 14 ditë përpara (vargu, e kremtja, kreshma, ditët e emrit)
  setTimeout(async () => {
    if (!(android && android.updateWidgets)) return;
    try {
      const [ps, tp] = await Promise.all([load("psaltiri"), load("tipikoja")]);
      const pool = [];
      ps.psalms.forEach((p) => p.v.forEach((v, i) => { if (v.length > 50 && v.length < 170) pool.push([p, i]); }));
      const td = Today.data;
      const days = [];
      for (let k = 0; k < 14; k++) {
        const dt = new Date(); dt.setDate(dt.getDate() + k);
        const di = Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000);
        const [p, vi] = pool[(di * 7919) % pool.length];
        const f = Fast.info(dt);
        const sec = dt.getFullYear() === 2026 ? tp.sections[dt.getMonth()] : null;
        const it = sec && sec.items.find((x) => parseInt(x.title, 10) === dt.getDate());
        const sb = it && it.blocks.find((b) => b.t === "saints");
        const feast = f.feast || (k === 0 && td && td.title) || (sb ? sb.x.split(/[.;]/)[0] : "");
        const names = Persons.all().filter((x) => Persons.feasts(x, tp).some((m) => m.inDays === k)).map((x) => x.name).join(", ");
        days.push({ d: dkey(dt), date: `${["E DIEL", "E HËNË", "E MARTË", "E MËRKURË", "E ENJTE", "E PREMTE", "E SHTUNË"][dt.getDay()]} · ${dt.getDate()} ${MUAJ_G[dt.getMonth()].toUpperCase()}`,
          verse: ortho(p.v[vi]), ref: psalmRef(p.n, vi + 1), link: `/psaltiri/${p.n}`, feast: ortho(feast),
          lit: litDay(f, it), great: f.great,
          fast: f.level && f.level.cls !== "free" ? `${f.level.name}${f.period ? " · " + f.period : ""}` : (f.period || "Pa kreshmë"), names });
      }
      android.updateWidgets(JSON.stringify(days));
    } catch (e) { /* */ }
  }, 7000);   // rifresko njoftimet e ditëve të emrit
  setTimeout(() => {                  // Rruga ime: dita e sotme me Fjalën
    const ms = Streak.mark();
    const sc = $("#streakCard");
    if (sc) { sc.outerHTML = Streak.html(); }
    if (ms) { goldBurst(); toast("🔥 " + ms.msg); }
  }, 3300);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !android) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
