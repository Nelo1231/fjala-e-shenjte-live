/* Leximet e ditës sipas Tipikosë: Apostulli (me Paravargun) dhe Ungjilli.
   Tipikoja jep referencat; teksti merret vetëm nga Apostulli dhe Ungjilli i KOASh në data/.
   Asnjë lexim nuk shpiket: kur nuk gjendet teksti, kthehet vetëm referenca. */
(function (root) {
  "use strict";
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const ORD = { nje: 1, pare: 1, "1-re": 1, dy: 2, dyte: 2, tre: 3, trete: 3, kater: 4, katert: 4, pese: 5, peste: 5, gjashte: 6, shtate: 7, tete: 8, nente: 9 };
  const TEEN = { nje: 11, dy: 12, tre: 13, kater: 14, pese: 15, gjashte: 16, shtate: 17, tete: 18, nente: 19 };
  const WD = [[/diel/, 0], [/\bhen/, 1], [/\bmart/, 2], [/merkur/, 3], [/enjt/, 4], [/premt/, 5], [/shtun/, 6]];
  const MONTHS = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nentor", "dhjetor"];

  function weekday(t) { for (const [r, n] of WD) if (r.test(t)) return n; return -1; }
  // numri i javës nga titujt e KOASh («Të Hënën e Javës së Njëzetë e Katërt», «Të Dielën e Tetë»)
  function weekNum(t) {
    const d = t.match(/(\d+)\s*-?\s*(?:te|t|re|rë)?\b/);
    if (d) return +d[1];
    let m = t.match(/\b(njezete?|tridhjete|dyzete?)\b(?:\s+e\s+(\w+))?/);
    if (m) return (m[1].startsWith("njezet") ? 20 : m[1].startsWith("tri") ? 30 : 40) + (m[2] && ORD[m[2]] ? ORD[m[2]] : 0);
    m = t.match(/\b(nje|dy|tre|kater|pese|gjashte|shtate|tete|nente)mbedhjete\b/);
    if (m) return TEEN[m[1]];
    if (/\bdhjete\b/.test(t)) return 10;
    const w = t.split(/[^a-z0-9-]+/).find((x) => ORD[x]);
    return w ? ORD[w] : -1;
  }

  // libri: çelës i përbashkët për Tipikonë («1 Kor.») dhe KOASh («Nga Letra e parë e Pavlit për Korinthianët»)
  function ordOf(t) { return /\b(pare|1)\b/.test(t) ? 1 : /\b(dyte|2)\b/.test(t) ? 2 : /\b(trete|3)\b/.test(t) ? 3 : 0; }
  function bookOfData(ref) {
    const t = norm(ref).replace(/\s\d+\s*[:.,-].*$/, "");
    const o = ordOf(t);
    if (/veprat/.test(t)) return "ACT";
    if (/romak/.test(t)) return "ROM";
    if (/korinth/.test(t)) return o + "CO";
    if (/galat/.test(t)) return "GAL";
    if (/efes/.test(t)) return "EPH";
    if (/filemon/.test(t)) return "PHM";
    if (/filip/.test(t)) return "PHP";
    if (/kolos/.test(t)) return "COL";
    if (/thesal/.test(t)) return o + "TH";
    if (/timoth/.test(t)) return o + "TI";
    if (/\btit/.test(t)) return "TIT";
    if (/hebrenj/.test(t)) return "HEB";
    if (/jakov/.test(t)) return "JAS";
    if (/petro/.test(t)) return o + "PE";
    if (/judh|juda/.test(t)) return "JUD";
    if (/joan/.test(t)) return /letr|katholik/.test(t) ? (o || 1) + "JN" : "JHN";
    if (/matthe/.test(t)) return "MAT";
    if (/markut/.test(t)) return "MRK";
    if (/llukai/.test(t)) return "LUK";
    return "";
  }
  const ABBR = [[/^vep/, "ACT"], [/^rom/, "ROM"], [/^kor/, "CO"], [/^gal/, "GAL"], [/^efe?s?/, "EPH"], [/^filem/, "PHM"], [/^fil/, "PHP"], [/^kol/, "COL"],
    [/^th?es/, "TH"], [/^tim/, "TI"], [/^tit/, "TIT"], [/^heb/, "HEB"], [/^jak/, "JAS"], [/^pj?et/, "PE"], [/^jud/, "JUD"], [/^(jn|gjn|joan)/, "JN"],
    [/^(mt|math)/, "MAT"], [/^(mk|mrk|mark)/, "MRK"], [/^(llk|lk|lluk)/, "LUK"]];
  const ONE_CH = { JUD: 1, "2JN": 1, "3JN": 1, PHM: 1 };
  // «(më 8 nëntor – Llk. 10:16-21)» → { book: "LUK", c: 10, v: 16, raw: "Llk. 10:16-21", date }
  function parseRef(par, gospel) {
    const s = par.replace(/\s+/g, " ");
    const re = /(?:^|[\s(–-])([1-3])?\s?([A-ZÇË][a-zçë]{0,6})\.?\s*:?\s*(\d+)(?:\s*[:.]\s*(\d+))?([^()]*)$/;
    let m = null, rest = s;
    // referenca është zakonisht pjesa e fundit pas «–» ose «-»
    for (const part of [s.split(/\s[–-]\s/).pop(), s]) { m = part.match(re); if (m) { rest = part; break; } }
    if (!m) return null;
    const ab = norm(m[2]);
    const hit = ABBR.find(([r]) => r.test(ab));
    if (!hit) return null;
    let book = hit[1];
    if (book === "CO" || book === "TH" || book === "TI" || book === "PE") book = (m[1] || "1") + book;
    if (book === "JN") book = m[1] ? m[1] + "JN" : gospel ? "JHN" : "1JN";
    let c = +m[3], v = m[4] != null ? +m[4] : null;
    if (v == null && ONE_CH[book]) { v = c; c = 1; }
    const raw = rest.slice(rest.indexOf(m[2]) - (m[1] ? m[1].length + 1 : 0)).replace(/^\s+/, "");
    const dm = norm(s).match(/(\d{1,2})\s+(janar|shkurt|mars|prill|maj|qershor|korrik|gusht|shtator|tetor|nentor|nentnor|nëtnor|netnor|dhjetor)/);
    return { book, c, v, end: endOf(raw), raw: raw.trim(), date: dm ? { d: +dm[1], m: Math.max(MONTHS.indexOf(dm[2].replace(/^n\w*n\w*r$/, "nentor")), 0) + 1 } : null };
  }
  function startOf(ref) {
    const m = String(ref || "").match(/(\d+)\s*:\s*(\d+)/);
    if (m) return { c: +m[1], v: +m[2] };
    const one = String(ref || "").match(/\s(\d+)\s*-\s*\d+\s*$/);
    return one ? { c: 1, v: +one[1] } : null;
  }

  // indeksi i leximeve KOASh
  function index(book) {
    if (!book || book._lx) return book && book._lx;
    const items = [];
    (book.sections || []).forEach((s, si) => (s.items || []).forEach((it, ii) => {
      if (!it.v || !it.v.length) return;
      const st = startOf(it.ref);
      items.push({ it, s: s.title, si, ii, book: bookOfData(it.ref) || bookOfData(s.title), st, t: norm(it.title), sec: norm(s.title) });
    }));
    Object.defineProperty(book, "_lx", { value: items, enumerable: false });
    return items;
  }
  // «Shih leximin e: Të Dielën e Dhjetë» → leximi që tregon
  function follow(items, x) {
    if (!/^shih leximin/i.test(x.it.ref || "")) return x;
    const want = norm(x.it.ref.split(":").slice(1).join(":"));
    const wd = weekday(want), wn = weekNum(want);
    return items.find((y) => y !== x && !/^shih/i.test(y.it.ref || "") && weekday(y.t) === wd && weekNum(y.t) === wn) || null;
  }

  // fillimi i Ungjillit të së dielave (Lektionari i përbashkët orthodhoks) — vetëm për të gjetur numrin e së dielës
  const SUN = {
    MAT: [null, [10, 32], [4, 18], [6, 22], [8, 5], [8, 28], [9, 1], [9, 27], [14, 14], [14, 22], [17, 14], [18, 23], [19, 16], [21, 33], [22, 2], [22, 35], [25, 14], [15, 21]],
    LUK: [null, [5, 1], [6, 31], [7, 11], [8, 5], [16, 19], [8, 26], [8, 41], [10, 25], [12, 16], [13, 10], [14, 16], [17, 12], [18, 18], [18, 35], [19, 1]],
  };
  function find(items, ref, desc, day, gospel) {
    if (!items) return null;
    const ok = (x) => x && !/^shih/i.test(x.it.ref || "") ? x : x ? follow(items, x) : null;
    // 1) libri + kapitulli:vargu i fillimit
    if (ref && ref.v != null) {
      const hits = items.filter((x) => x.book === ref.book && x.st && x.st.c === ref.c && x.st.v === ref.v);
      if (hits.length) {
        const h = ok(hits.find((x) => x.it.pre && x.it.pre.some((p) => p.trim())) || hits[0]);
        // fundi ndryshon? provo leximin e ditës së javës me të njëjtin fund (gabim shkrimi në referencë)
        if (h && ref.end != null && endOf(h.it.ref) !== ref.end) { const w = byWeek(items, ref, desc); if (w && endOf(w.it.ref) === ref.end) return ok(w); }
        return h;
      }
    }
    // 2) leximi i ditës së muajit (shenjtorët, të kremtet)
    const dd = (ref && ref.date) || day;
    if (dd) {
      const tag = new RegExp("^" + dd.d + " " + MONTHS[dd.m - 1].slice(0, 4));
      const hits = items.filter((x) => tag.test(x.t) && (!ref || !x.book || x.book === ref.book) && (!ref || !x.st || ref.v == null || x.st.c === ref.c));
      const lit = hits.find((x) => /liturgji/.test(x.t)) || hits.find((x) => !/mengjesor/.test(x.t));
      if (lit) return ok(lit);
    }
    const w = byWeek(items, ref, desc);
    return w ? ok(w) : null;
  }
  const endOf = (r) => { const m = String(r || "").match(/(\d+)\D*$/); return m ? +m[1] : null; };
  function byWeek(items, ref, desc) {
    // 3) dita e javës + numri i javës brenda ciklit
    const d = norm(desc);
    const wd = weekday(d);
    let wn = weekNum(d);
    // të dielat: numri i së dielës sipas referencës (Tipikoja mund ta zhvendosë ciklin)
    if (wd === 0 && ref && ref.v != null && SUN[ref.book]) {
      const k = SUN[ref.book].findIndex((r) => r && r[0] === ref.c && Math.abs(r[1] - ref.v) <= 1);
      if (k > 0) wn = k;
    }
    if (wd >= 0 && wn > 0) {
      const cyc = /lluka/.test(d) ? /llukait/ : /matthe/.test(d) ? /matthe/ : /joan/.test(d) ? /joan/ : /markut/.test(d) ? /markut/ : /vepra/.test(d) ? /vepra/ : /letra/.test(d) ? /periudha/ : null;
      const pool = items.filter((x) => (!cyc || cyc.test(x.sec)) && (!ref || !x.book || x.book === ref.book));
      return pool.find((x) => weekday(x.t) === wd && weekNum(x.t) === wn) || null;
    }
    return null;
  }

  // Paravargjet e javës (Apostulli · «Paravargjet e Apostullit»)
  const TONES = [/tingulli i\b/, /tingulli ii\b/, /tingulli iii\b/, /tingulli iv\b/, /terthor i te parit|terthor i\b/, /terthor i te dytit|terthor ii\b/, /rende/, /terthor i te katertit|terthor iv\b/];
  function toneOf(text) {
    const t = norm(text).match(/tingulli\s+(terthor\s+(?:i te \w+|iv|iii|ii|i)|rende|iv|iii|ii|i)\b/);
    if (!t) return -1;
    const w = t[1];
    if (/terthor/.test(w)) return /katert|iv/.test(w) ? 7 : /dyt|ii/.test(w) ? 5 : 4;
    if (w === "rende") return 6;
    return { i: 0, ii: 1, iii: 2, iv: 3 }[w];
  }
  function weekProkeimenon(ap, wd, tone) {
    const sec = (ap.sections || []).find((s) => /paravargjet/i.test(s.title));
    if (!sec) return null;
    if (wd === 0) {
      const sun = sec.items.find((x) => /diel/i.test(norm(x.title)));
      if (!sun || tone < 0) return null;
      const lines = sun.v.map((l) => l.replace(/^\(N[eë]qoft[eë]se nuk ka t[eë] kremte\)\s*/, ""));
      const out = [];
      let on = false;
      for (const l of lines) {
        const head = /^Paravargu/.test(l);
        if (head) { if (on) break; on = toneOf(l) === tone; }
        if (on) {
          const m = l.match(/^(Paravargu[^)]*\))\s*(.+)$/);
          if (m) out.push(m[1], m[2]); else out.push(l);
        }
      }
      return out.length ? out : null;
    }
    const it = sec.items.find((x) => weekday(norm(x.title)) === wd);
    return it && it.v.length ? it.v.slice() : null;
  }

  function entryOf(tp, date) {
    if (!tp || !tp.sections || (tp.year && +tp.year !== date.getFullYear()) || (!tp.year && date.getFullYear() !== 2026)) return null;
    const sec = tp.sections[date.getMonth()];
    return sec && sec.items.find((x) => parseInt(x.title, 10) === date.getDate()) || null;
  }

  /** Leximet e Liturgjisë për datën, sipas Tipikosë. */
  function forDate(date, tp, ap, ug) {
    const e = entryOf(tp, date);
    if (!e) return null;
    const blocks = e.blocks || [];
    const lit = blocks.findIndex((b) => b.t === "h" && /Liturgji/i.test(b.x));
    const end = lit >= 0 ? blocks.findIndex((b, i) => i > lit && b.t === "h") : -1;
    const part = lit >= 0 ? blocks.slice(lit + 1, end > 0 ? end : undefined) : blocks;
    const text = part.filter((b) => b.t !== "h").map((b) => b.x).join(" ").replace(/(\w)- (\w)/g, "$1$2");
    const head = blocks.filter((b) => b.t === "fast").map((b) => b.x).join(" ");
    const tone = toneOf(head);
    const day = { d: date.getDate(), m: date.getMonth() + 1 };
    const out = { apostle: [], gospel: [], tone, title: e.title };
    const re = /(APOSTULL\w*|UNGJILL\w*)\s*:?\s*([^()]{0,170}?)\s*\(((?:[^()]|\([^()]*\))*)\)/g;
    let m;
    while ((m = re.exec(text))) {
      const isG = /^UNGJ/.test(m[1]);
      const desc = m[2].trim();
      if (/m[eë]ngjesor/i.test(desc)) continue;
      const ref = parseRef(m[3], isG);
      const hit = find(index(isG ? ug : ap), ref, desc + " " + m[3], day, isG);
      const r = { desc, ref: ref ? ref.raw : m[3].trim(), item: hit ? hit.it : null, section: hit ? hit.s : "" };
      if (!isG) {
        r.pre = hit && hit.it.pre && hit.it.pre.some((p) => p.trim()) ? hit.it.pre.filter((p) => p.trim()) : null;
        if (!r.pre && out.apostle.length === 0) r.pre = weekProkeimenon(ap, date.getDay(), tone);
      }
      (isG ? out.gospel : out.apostle).push(r);
    }
    return out.apostle.length || out.gospel.length ? out : null;
  }

  // Mbrëmësorja e së kremtes ka «LEXIMET biblike» (Profecitë)
  function hasVespersReadings(e) {
    if (!e) return false;
    const b = e.blocks || [];
    const i = b.findIndex((x) => x.t === "h" && /Mbrëmësore/i.test(x.x));
    const j = i >= 0 ? b.findIndex((x, k) => k > i && x.t === "h") : -1;
    const t = (i >= 0 ? b.slice(i + 1, j > 0 ? j : undefined) : b).map((x) => x.x).join(" ");
    return (/LEXIMET biblike/i.test(t) || /Leximi I:/.test(t)) &&!/Leximet biblike[^.]{0,30}nuk thuhen/i.test(t);
  }

  root.Lexime = { forDate, entryOf, hasVespersReadings, parseRef, weekNum, weekday, toneOf, weekProkeimenon, norm };
})(typeof window !== "undefined" ? window : globalThis);
