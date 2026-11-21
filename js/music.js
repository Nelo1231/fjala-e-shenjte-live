/* Muzikë bizantine 24/7 — vetëm himne (pa biseda), sipas kohës liturgjike:
   - Krishtlindje, Theofani, Triod, Java e Madhe, Pashkë → himnet e periudhës;
   - të dielave → vetëm himnet e tingullit të javës (Tetëtingullshi);
   - Mix (shqip, greqisht, anglisht) ose një gjuhë e vetme — ndërrohet me një prekje.
   Kur luan Radio Ngjallja, muzika ndalet; kur mbyllet radioja, rinis vetë. */
(function () {
  "use strict";

  const STATIONS = {
    sq: { label: "Shqip", name: "Kori bizantin “Shën Joan Kukuzeli”", channel: "UC57U8o2eBLgiDdWq40vKcsQ" },
    el: { label: "Ελληνικά", name: "Ελληνική Βυζαντινή Χορωδία · Cappella Romana", channel: "UCfx05UlsQinI-5ht45eaCZQ" },
    en: { label: "English", name: "Boston Byzantine Choir", channel: "UCpm-QdjTFA455sPHHIwEidg" },
    athos: { label: "Athos", name: "Etërit e Malit Athos · Simonopetra · Vatopedi" },
    ro: { label: "Română", name: "Kore bizantine rumune · Tronos" },
    ru: { label: "Русский", name: "Kore ortodokse ruse · Valaam · Sretenski" },
    gr: { label: "Gregoriane", name: "Këngë gregoriane (latine)" },
  };
  // Mix: kryesisht kori shqip dhe greqisht; gregorianet vetëm kur zgjidhen veçmas
  const MIX_WEIGHTS = { sq: 0.46, el: 0.2, athos: 0.16, en: 0.05, ro: 0.07, ru: 0.06 };
  const TONE_NAME = { 1: "Tingulli i Parë", 2: "Tingulli i Dytë", 3: "Tingulli i Tretë", 4: "Tingulli i Katërt", 5: "Tingulli Tërthor i të Parit", 6: "Tingulli Tërthor i të Dytit", 7: "Tingulli Rëndë", 8: "Tingulli Tërthor i të Katërtit" };
  const PERIOD_NAME = { krishtlindje: "Krishtlindja", theofania: "Theofania", triodi: "Triodi", javaemadhe: "Java e Madhe", pashka: "Pesëdhjetorja · Pashka" };

  const LS = "fs.music";
  const saved = read();
  const state = { mode: saved.mode || "mix", cur: "sq", video: null };
  let player = null, ready = false, playing = false, wantPlay = true, errors = 0, ytState = -1, userPaused = false, suspended = false;
  const listeners = [];
  const history = [];

  function read() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(LS, JSON.stringify({ mode: state.mode })); } catch (e) { /* */ } }
  const $ = (id) => document.getElementById(id);
  const rand = (n) => Math.floor(Math.random() * n);

  /* ---------- Koha liturgjike ---------- */
  function pascha(y) {                       // Pashka Ortodokse (llogaritja julianе → kalendari gregorian)
    const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
    return new Date(y, m - 1, day + 13);
  }
  const DAY = 86400000;
  const atNoon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  function liturgy(date) {
    const real = date || new Date();
    if (!date && real.getDay() === 6 && real.getHours() >= 18) date = new Date(real.getTime() + DAY);   // e shtunë mbrëma
    const d = atNoon(date || real);
    const y = d.getFullYear();
    const P = atNoon(pascha(y));
    const diff = Math.round((d - P) / DAY);
    const md = (d.getMonth() + 1) * 100 + d.getDate();
    let period = null;
    if (md >= 1220 || md <= 104) period = "krishtlindje";
    else if (md >= 105 && md <= 114) period = "theofania";
    if (diff >= -70 && diff <= -8) period = "triodi";
    else if (diff >= -7 && diff <= -1) period = "javaemadhe";
    else if (diff >= 0 && diff <= 56) period = "pashka";
    // tingulli i javës: nis me Tingullin I të dielën e Thomait (Pashka + 7)
    const sunday = new Date(d.getTime() - d.getDay() * DAY);
    let thomas = new Date(atNoon(pascha(sunday.getFullYear())).getTime() + 7 * DAY);
    if (sunday < thomas) thomas = new Date(atNoon(pascha(sunday.getFullYear() - 1)).getTime() + 7 * DAY);
    const weeks = Math.round((sunday - thomas) / (7 * DAY));
    const tone = (((weeks % 8) + 8) % 8) + 1;
    return { period, tone, sunday: d.getDay() === 0 };
  }

  /* ---------- Katalogu i himneve ---------- */
  let catalog = null;
  function loadCatalog() {
    return new Promise((res) => {
      if (catalog) return res(catalog);
      window.FS_DATA = window.FS_DATA || {};
      const done = () => { catalog = (window.FS_DATA.himnet && window.FS_DATA.himnet.videos) || []; res(catalog); };
      if (window.FS_DATA.himnet) return done();
      const s = document.createElement("script");
      s.src = "data/himnet.js";
      s.onload = done; s.onerror = done;
      document.head.appendChild(s);
    });
  }

  function pickLang() {
    if (state.mode !== "mix") return state.mode;
    let r = Math.random(), acc = 0;
    for (const [k, w] of Object.entries(MIX_WEIGHTS)) { acc += w; if (r <= acc) return k; }
    return "sq";
  }

  // Të kremtet Zotërore dhe Hyjlindësore: atë ditë luhen vetëm himnet e së kremtes
  const FEAST_RE = {
    ipapandia: /Ipapand|Ndeshj|Υπαπαντ|Meeting of the Lord|Presentation of (Christ|the Lord)|Întâmpinarea|Сретени/i,
    ungjillezimi: /Ungjillëzim|Ευαγγελισμ|Annunciation|Buna Vestire|Благовещ/i,
    vaiet: /Vaie|Βαΐων|Palm Sunday|Floriil|Вербн|Вход Господень/i,
    ngjitja: /Ngjitj|Analips|Ανάληψ|Ascension|Înălțarea Domnului|Вознесени/i,
    pendikostia: /Pendikost|Pentikost|Πεντηκοστ|Pentecost|Rusalii|Троиц|Ευλογητός ει Χριστέ/i,
    shnderrimi: /Shndërrim|Shpërfytyr|Μεταμόρφωσ|Transfiguration|Schimbarea la Față|Преображени/i,
    fjetja: /Fjetj|Κοίμησ|Dormition|Adormirea|Успени/i,
    lindjahyj: /Lindja e Hyjlind|Γενέσιον|Γέννησις της Θεοτόκου|Nativity of the Theotokos|Nașterea Maicii|Рождество Богородиц/i,
    kryqi: /Lartësimi i Kryqit|Ύψωσ|Σώσον Κύριε|Exaltation|Elevation of the (Holy )?Cross|Înălțarea Sfintei Cruci|Воздвижени/i,
    hyrja: /Hyrja në Tempull|Εισόδια|Σήμερον του ευδοκίας|Entrance of the Theotokos|Entry of the Theotokos|Intrarea în Biseric|Введени/i,
  };
  function feastOf(date) {
    const d = atNoon(date || new Date()), md = (d.getMonth() + 1) * 100 + d.getDate();
    const off = Math.round((d - atNoon(pascha(d.getFullYear()))) / DAY);
    if (off === -7) return "vaiet"; if (off === 39) return "ngjitja"; if (off === 49) return "pendikostia";
    return { 202: "ipapandia", 325: "ungjillezimi", 806: "shnderrimi", 815: "fjetja", 908: "lindjahyj", 914: "kryqi", 1121: "hyrja" }[md] || null;
  }
  // Rregulli i tingujve: gjatë javës (deri të shtunën në mbrëmje) 50% himne të tingullit të javës,
  // 50% të shtatë tingujve të tjerë. Në Mix, himnet me tingull merren nga kori shqip, grek dhe athonit.
  function candidates(lang) {
    const L = liturgy();
    const fresh = (catalog || []).filter((v) => !history.includes(v.id));
    const all = fresh.filter((v) => v.l === lang);
    const general = all.filter((v) => !v.p);
    const pool = state.mode === "mix" ? fresh : all;
    // 1) e kremte Zotërore/Hyjlindësore: vetëm himnet e saj
    const F = feastOf();
    if (F) { const fh = pool.filter((v) => FEAST_RE[F].test(v.t)); if (fh.length >= 2) return fh; }
    if (L.period) {
      const p = all.filter((v) => v.p === L.period || (L.period === "theofania" && v.p === "krishtlindje"));
      if (p.length >= 3 && (L.sunday || Math.random() < 0.7)) return p;
    }
    if (["sq", "el", "athos"].includes(lang) || state.mode === "mix") {
      const byz = state.mode === "mix" ? fresh.filter((v) => ["sq", "el", "athos"].includes(v.l)) : all;
      const mine = byz.filter((v) => v.tone === L.tone && !v.p);
      const others = byz.filter((v) => v.tone && v.tone !== L.tone && !v.p);
      // 2) e diela: gjithë ditën vetëm tingulli i javës
      if (L.sunday && mine.length) return mine;
      // 3) gjatë javës: 50% tingulli i javës, 50% shtatë tingujt e tjerë
      if (Math.random() < 0.5) { if (mine.length) return mine; }
      else if (others.length) return others;
    }
    return general.length ? general : all;
  }

  function nextVideo() {
    for (let k = 0; k < 4; k++) {
      const lang = pickLang();
      const pool = candidates(lang);
      if (pool.length) {
        const v = pool[rand(pool.length)];
        history.push(v.id);
        if (history.length > 40) history.shift();
        state.cur = STATIONS[v.l] ? v.l : lang;
        return v;
      }
    }
    history.length = 0;
    return (catalog || [])[rand((catalog || []).length)] || null;
  }

  function playVideo(v) {
    if (!v || !ready) return;
    state.video = v;
    try { player.loadVideoById(v.id); } catch (e) { /* */ }
    if (suspended || userPaused) setTimeout(() => { try { player.pauseVideo(); } catch (e) { /* */ } }, 300);
    emit();
  }

  /* ---------- Luajtësi i YouTube ---------- */
  function loadApi() {
    if (window.YT && window.YT.Player) return create();
    if (loadApi.started) return;
    loadApi.started = true;
    window.onYouTubeIframeAPIReady = create;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => { loadApi.started = false; emit("Pa internet — muzika nis vetë kur të lidhesh"); setTimeout(loadApi, 15000); };
    document.head.appendChild(s);
  }

  async function create() {
    if (player) return;
    await loadCatalog();
    const first = nextVideo();
    state.video = first;
    player = new YT.Player("ytPlayer", {
      width: "100%", height: "100%",
      videoId: first ? first.id : undefined,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, controls: 0, iv_load_policy: 3, disablekb: 1 },
      events: {
        onReady() {
          ready = true;
          if (wantPlay && !suspended && !userPaused) player.playVideo();
          emit();
        },
        onStateChange(e) {
          ytState = e.data;
          playing = e.data === YT.PlayerState.PLAYING;
          if (playing && (suspended || userPaused)) { try { player.pauseVideo(); } catch (x) { /* */ } playing = false; }
          if (playing) errors = 0;
          if (e.data === YT.PlayerState.ENDED) playVideo(nextVideo());   // pa fund, 24/7
          emit();
        },
        onError() { if (++errors < 25) setTimeout(() => playVideo(nextVideo()), 500); },
      },
    });
  }

  // Roja: nëse muzika ndalet vetë (rrjet, sistemi), e rinis — por jo kur luan radioja.
  setInterval(() => {
    if (!wantPlay || userPaused || suspended) return;
    if (!ready) { loadApi(); return; }
    const S = window.YT && YT.PlayerState;
    if (S && ytState !== S.PLAYING && ytState !== S.BUFFERING) {
      try { player.playVideo(); } catch (e) { /* */ }
    }
  }, 4000);

  function title() {
    try { const d = ready && player.getVideoData(); if (d && d.title) return d.title; } catch (e) { /* */ }
    return (state.video && state.video.t) || STATIONS[state.cur].name;
  }

  function contextLabel() {
    const L = liturgy();
    if (L.period) return PERIOD_NAME[L.period];
    return (L.sunday ? "E diel · " : "Java · ") + TONE_NAME[L.tone];
  }

  function emit(note) {
    const st = STATIONS[state.cur];
    const t = title();
    const sub = note || (suspended ? "Radio Ngjallja po luan" : playing ? `${contextLabel()} · ${st.label}` : "Po ngarkohet…");
    if (!$("musicTitle") || !$("musicPlay")) return;   // paneli i muzikës ende pa u vizatuar
    $("musicTitle").textContent = t;
    if ($("musicSub")) $("musicSub").textContent = sub;
    const ctx = $("musicCtx");
    if (ctx) ctx.textContent = contextLabel();
    $("musicPlay").innerHTML = `<svg><use href="#i-${playing ? "pause" : "play"}"/></svg>`;
    $("musicPlay").setAttribute("aria-label", playing ? "Pauzë" : "Luaj");
    if ($("musicDisc")) $("musicDisc").classList.toggle("spinning", playing);
    if ("mediaSession" in navigator && window.MediaMetadata && !suspended) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t, artist: st.name, album: contextLabel() });
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
    listeners.forEach((fn) => fn({ title: t, station: st, playing }));
  }

  /* ---------- Radio Ngjallja ---------- */
  function suspend() {
    suspended = true;
    if (ready) { try { player.pauseVideo(); player.mute(); } catch (e) { /* */ } }
    emit();
  }
  function resume() {
    suspended = false; userPaused = false;
    if (ready) { try { player.unMute(); } catch (e) { /* */ } }
    play();
  }

  function play() {
    if (window.Radio && window.Radio.playing) window.Radio.stop(true);   // zgjodhe muzikën → ndal radion
    suspended = false;
    wantPlay = true; userPaused = false;
    if (!ready) { loadApi(); emit(); return; }
    try { player.unMute(); } catch (e) { /* */ }
    if (ytState === -1 || ytState === 5 || !state.video) playVideo(state.video || nextVideo());
    else player.playVideo();
  }
  function pause() { userPaused = true; if (ready) player.pauseVideo(); emit(); }
  function toggle() { playing ? pause() : play(); }
  function next() { userPaused = false; wantPlay = true; ready ? playVideo(nextVideo()) : play(); }

  // ndërrimi i gjuhës: një prekje mjafton — kënga e re nis menjëherë
  function setMode(mode) {
    state.mode = mode; save();
    document.querySelectorAll("#musicSheet [data-lang]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.lang === mode)));
    renderSrc();
    history.length = 0;
    if (window.Radio && window.Radio.playing) window.Radio.stop(true);
    suspended = false; userPaused = false; wantPlay = true;
    if (ready) { try { player.unMute(); } catch (e) { /* */ } playVideo(nextVideo()); }
    else loadApi();
    emit();
  }

  function renderSrc() {
    const names = state.mode === "mix" ? Object.values(STATIONS) : [STATIONS[state.mode]];
    $("musicSrc").innerHTML = names.map((st) => `<a href="https://www.youtube.com/channel/${st.channel}" target="_blank" rel="noopener">${st.name}</a>`).join(" · ");
  }

  function openSheet() { $("musicSheet").hidden = false; $("musicDisc").classList.add("big"); loadApi(); emit(); }
  function closeSheet() { $("musicSheet").hidden = true; $("musicDisc").classList.remove("big"); }

  function init() {
    renderSrc();
    document.querySelectorAll("#musicSheet [data-lang]").forEach((b) => {
      b.setAttribute("aria-checked", String(b.dataset.lang === state.mode));
      b.addEventListener("click", (e) => { e.stopPropagation(); setMode(b.dataset.lang); });
    });
    $("musicPlay").addEventListener("click", toggle);
    $("musicNext").addEventListener("click", next);
    $("musicDisc").addEventListener("click", () => ($("musicSheet").hidden ? openSheet() : closeSheet()));
    $("musicSheet").addEventListener("click", (e) => {
      if (e.target.id === "musicSheet" || e.target.closest('[data-act="close"]')) closeSheet();
    });
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", play);
        navigator.mediaSession.setActionHandler("pause", pause);
        navigator.mediaSession.setActionHandler("nexttrack", next);
      } catch (e) { /* */ }
    }
    // API e YouTube (~1 MB) nuk bllokon nisjen: ngarkohet kur shfletuesi është i lirë
    (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(() => loadApi(), { timeout: 4000 });
    const first = () => { window.removeEventListener("pointerdown", first, true); if (!userPaused && !suspended) play(); };
    window.addEventListener("pointerdown", first, true);
    if (location.protocol === "file:") emit("Për muzikën hape me “Nis aplikacionin.bat”");
    else emit();
  }

  window.Music = {
    init, play, pause, toggle, next, openSheet, closeSheet, STATIONS, liturgy, TONE_NAME, PERIOD_NAME,
    onChange(fn) { listeners.push(fn); },
    get justStarted() { return false; },
    suspend, resume, get suspended() { return suspended; },
    get wanted() { return wantPlay && !userPaused; },
    get player() { return player; },
  };
})();
