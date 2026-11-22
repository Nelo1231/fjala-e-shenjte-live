# -*- coding: utf-8 -*-
r"""Kinemaja · katalogu i kuruar (tools/kinema_katalogu.json) → tituj me shumë serverë.

Vetëm burime të ligjshme: kanale zyrtare YouTube (prodhuesit, Kishat, televizionet publike) dhe filma në domen publik
në Internet Archive. Për çdo titull:
  - verifikohet çdo burim (YouTube: a luhet dhe a lejon futjen në aplikacion; Archive: skedari video ekziston);
    burimet që s'punojnë hiqen, titulli pa asnjë burim të vlefshëm nuk shfaqet;
  - serverët renditen: i pari = Serveri 1, pastaj rezervat (ngarkime të tjera zyrtare, cilësi më e ulët, lojtësi i Archive);
  - kohëzgjatja, viti, posteri (përmes wsrv.nl, me rezervë origjinalin) dhe përshkrimi nga burimi, përkthyer në shqip
    (Argos Translate, offline) dhe kaluar nga filtri ortografik orthodhoks;
  - titrat anglisht të Archive (.srt/.vtt) shënohen te «titraOrigjinaleUrl» → tools/titra_shqip.py i bën shqip te subtitles/.
Seritë nga listat zyrtare (pl) shtojnë vetë episodet e reja në çdo sinkronizim.
Gjithçka ruhet te tools/_kinema_cache.json (rifreskim javor), që sinkronizimi të jetë i shpejtë."""
import html as _html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KATALOG = os.path.join(ROOT, "tools", "kinema_katalogu.json")
CACHE = os.path.join(ROOT, "tools", "_kinema_cache.json")
SUBS = os.path.join(ROOT, "subtitles")
WEEK = 7 * 86400
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.8"}
sys.path.insert(0, os.path.join(ROOT, "tools"))
try:
    from ortografia_orthodhokse import orthodox  # noqa: E402
except Exception:          # pragma: no cover
    def orthodox(t, terms=True):
        return t


def _get(u, timeout=40):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=timeout).read().decode("utf-8", "replace")


def _json_after(h, key):
    i = h.find(key)
    if i < 0:
        return None
    j = h.find("{", i)
    depth, k, ins, esc = 0, j, False, False
    while k < len(h):
        c = h[k]
        if ins:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                ins = False
        elif c == '"':
            ins = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(h[j:k + 1])
                except ValueError:
                    return None
        k += 1
    return None


def wsrv(u, w=480):
    return "https://wsrv.nl/?url=" + urllib.parse.quote(u, safe="") + f"&w={w}&output=webp&q=78"


# ---------------- përkthimi (Argos, offline) ----------------
_TR = [None, False]
SQ_HINT = re.compile(r"[ëç]|\b(dhe|është|për|nuk|një|janë|që|zot|perëndi|shën|kishë|kisha)\b", re.I)
EN_HINT = re.compile(r"\b(the|and|of|is|with|to|in|for|this|life|saint|st\.?)\b", re.I)


def _translator():
    if not _TR[1]:
        _TR[1] = True
        try:
            import argostranslate.translate as at
            langs = {l.code: l for l in at.get_installed_languages()}
            if "en" in langs and "sq" in langs:
                _TR[0] = langs["en"].get_translation(langs["sq"])
        except Exception as exc:
            print("Përkthimi offline nuk është i disponueshëm:", exc.__class__.__name__)
    return _TR[0]


def is_en(t):
    t = t or ""
    if SQ_HINT.search(t) or re.search(r"[\u0370-\u03ff\u0400-\u04ff]", t):
        return False
    return len(EN_HINT.findall(t)) >= 1 and re.search(r"[A-Za-z]{3}", t) is not None


# Emrat e shenjtorëve dhe termat kishtarë: Argos i shkatërron (Xhoni, Nektashios, Lentes…), prandaj i kthejmë në trajtën
# orthodhokse shqipe PARA përkthimit; numrat i rikthejmë nga origjinali (Argos i humb shifrat: 1924 → 194).
PRE = [(re.compile(a), b) for a, b in [
    (r"\bSt\.\s+", "Saint "), (r"\bSts\.\s+", "Saints "),
    (r"\bFr\.\s+(?=[A-Z])", "Father "), (r"\bHieromonk\b", "hieromonk"),
    (r"\bJohn\b", "Joan"), (r"\bGeorge\b", "Gjergj"), (r"\bNicholas\b|\bNikolaos\b", "Nikolla"),
    (r"\bNectarios\b|\bNektarios\b", "Nektari"), (r"\bPaisios\b|\bPaisius\b", "Paisi"),
    (r"\bPorphyrios\b|\bPorphyrius\b", "Porfiri"), (r"\bSpyridon\b|\bSpiridon\b", "Spiridon"),
    (r"\bElijah\b|\bElias\b", "Ilia"), (r"\bIgnatius\b", "Ignati"), (r"\bCatherine\b|\bKatherine\b", "Katerina"),
    (r"\bHermione\b", "Hermiona"), (r"\bMary Magdalene\b", "Maria Magdalena"), (r"\bLuke\b", "Lluka"),
    (r"\bMatthew\b", "Mateu"), (r"\bPaul\b", "Pavli"), (r"\bPeter\b", "Pjetri"), (r"\bMoses\b", "Moisiu"),
    (r"\bTheotokos\b", "Hyjlindësja"), (r"\bVirgin Mary\b", "Virgjëresha Mari"), (r"\bthe Athonite\b", "of the Holy Mountain"),
    (r"\bIconoclasm\b|\biconoclasm\b", "the war against icons"), (r"\bIconoclasts?\b|\biconoclasts?\b", "the fighters against icons"),
    (r"\bGreat Lent\b", "the Great Fast"), (r"\bLent\b", "the fast"), (r"\bPascha\b|\bEaster\b", "Pashka"),
    (r"\bGod-?bearer\b", "Hyjbajtës"), (r"\bWonder-?worker\b|\bwonder-?worker\b", "miracle worker"),
    (r"\bDormition\b", "Fjetja"), (r"\bA\.?D\.?\s+(?=\d)", ""), (r"(?<=\d)\s+A\.?D\.?\b", ""),
]]
POST = [(re.compile(a), b) for a, b in [
    (r"\b([Oo])rtodoks", r"\1rthodhoks"), (r"\bO(?:th|rth)odox\w*", "Orthodhoks"), (r"\bORTODOKS", "ORTHODHOKS"),
    (r"\bKisha Kristiane\b", "Kisha e Krishterë"), (r"\bKishës Kristiane\b", "Kishës së Krishterë"), (r"\bKishën Kristiane\b", "Kishën e Krishterë"),
    (r"\bLent(?:es|ja|ës|en|e)\b", "Kreshmës"), (r"\bPask(ë|ës|ën|a)\b", r"Pashk\1"), (r"\bPaskës\b", "Pashkës"),
    (r"\bAti ([A-ZÇË][a-zçë]+)", r"At \1"), (r"\bDikon(it|i|in)?\b", lambda m: "Dhjakon" + (m.group(1) or "")),
    (r"\bpunëtor(?:i|) i (?:parë i )?mrekullisë\b", "çudibërësi"), (r"\bmrekullibërës", "çudibërës"),
    (r"\bNektash\w*", "Nektari"), (r"\bPaiz(it|i|in)\b", r"Pais\1"), (r"\bAthonit\b", "Aghioritit"), (r"\bPaisitit\b", "Paisit"),
    (r"\bCecili B\.", "Cecil B."), (r"\bSisël B\.", "Cecil B."), (r"\bXhon(i|it|in)?\b", lambda m: "Joan" + (m.group(1) or "")),
    (r"\bXhorxh(i|it|in)?\b", lambda m: "Gjergj" + (m.group(1) or "")), (r"\bNikolas(i|it|in)?\b", lambda m: "Nikolla" + (m.group(1) or "")),
    (r"\bLuk(ës|a|ait|ai)\b", lambda m: "Llukait" if m.group(1) in ("ës", "ait") else "Lluka"),
    (r"\bShën Mer(i|in|it)\b", lambda m: "Shën Mari" + {"i": "a", "in": "në", "it": "së"}[m.group(1)]),
]]
NUM = re.compile(r"\d+")


def _fix_nums(src, out):
    a, b = NUM.findall(src), NUM.findall(out)
    if len(a) == len(b) and a != b:
        it = iter(a)
        return NUM.sub(lambda m: next(it), out)
    return out


def _tr_para(T, pa):
    src = pa
    for rx, to in PRE:
        src = rx.sub(to, src)
    out = T.translate(src).strip()
    return _post(_fix_nums(src, out))


def _post(out):
    for rx, to in POST:
        out = rx.sub(to, out)
    return out


def tr(t, cache):
    """anglisht → shqip (me arkiv); tekstet në gjuhë të tjera kthehen bosh (s'ka përkthyes offline për to)."""
    t = (t or "").strip()
    if not t:
        return ""
    if SQ_HINT.search(t):
        return orthodox(t)
    if not is_en(t):
        return ""
    c = cache.setdefault("tr2", {})            # «tr2»: përkthimet me emrat orthodhoksë dhe numrat e ruajtur
    cache.pop("tr", None)
    if t in c:
        return _post(c[t])                    # rregullat e reja zbatohen edhe te përkthimet e ruajtura
    T = _translator()
    if not T:
        return ""
    out = []
    for pa in re.split(r"\n{2,}", t):
        pa = pa.strip()
        if pa:
            out.append(_tr_para(T, pa))
    res = orthodox("\n\n".join(out))
    c[t] = res
    return res


# ---------------- përshkrimi i pastër nga burimi ----------------
JUNK = re.compile(r"subscribe|follow us|donat|patreon|paypal|support (us|our|this)|instagram|facebook|twitter|tiktok|merch|©|copyright|all rights|"
                  r"download|app store|google play|website|click|playlist|channel|sponsor|amazon|shop|buy |order |watch more|stream|newsletter|"
                  r"contact|email|e-mail|whatsapp|telegram|abon|kanal|ndiqni|na ndiqni|https?:|www\.|\.com|\.org|#\w|"
                  r"subtit|captions?\b|imdb|@\w|please |trisagion films|non-?profit|501\(?c|tax[- ]deductible|watch (the|now|on|more|full)|"
                  r"official trailer|trailer|full (movie|film|episode)|special s\d|explorer special|national geographic series|"
                  r"available (on|in)|blu-?ray|thanks? (you )?for watching|faleminderit për|"
                  r"skenari|montazh|lexues|dron:|rregjistrimet|realizoi|realizon|foles:|falenderojmë|prodhuar dhe xhiruar|përkthyer dhe p", re.I)


def clean_desc(t, limit=460):
    t = _html.unescape(re.sub(r"<[^>]+>", " ", t or ""))
    keep = []
    for l in t.replace("\r", "").split("\n"):
        l = l.strip(" \t•-–—*·")
        if not l:
            if keep and keep[-1]:
                keep.append("")
            continue
        if JUNK.search(l) or len(re.sub(r"[\W\d_]", "", l)) < 14:
            continue
        keep.append(re.sub(r"\s+", " ", l))
    paras = [p.strip() for p in "\n".join(keep).split("\n\n") if p.strip()]
    paras = [p for p in paras if not (p.isupper() and len(p) > 30)][:2]    # pa reklama me shkronja të mëdha · vetëm sinopsi
    out = ""
    for p in paras:
        if out and len(out) + len(p) > limit:
            break
        out += ("\n\n" if out else "") + p
    if len(out) > limit:
        cut = out[:limit]
        m = re.search(r"^(.*[.!?»”])\s", cut, re.S)
        out = m.group(1) if m and len(m.group(1)) > limit * 0.5 else cut.rsplit(" ", 1)[0] + "…"
    return out


# ---------------- YouTube: a luhet / a futet në aplikacion ----------------
def yt_info(vid, cache):
    c = cache.setdefault("yt", {}).get(vid)
    if c and time.time() - c.get("at", 0) < WEEK:
        return c
    try:
        h = _get("https://www.youtube.com/watch?v=" + vid + "&hl=en&persist_hl=1")
    except Exception:
        return c
    pr = _json_after(h, "ytInitialPlayerResponse") or {}
    ps = pr.get("playabilityStatus") or {}
    vd = pr.get("videoDetails") or {}
    mf = ((pr.get("microformat") or {}).get("playerMicroformatRenderer")) or {}
    st = ps.get("status") or ""
    reason = json.dumps(ps, ensure_ascii=False)[:400]
    bot = st == "LOGIN_REQUIRED" and re.search(r"bot|confirm", reason, re.I) and not re.search(r"age|inappropriate", reason, re.I)
    if not pr or bot:                       # faqja s'u lexua (ose kontroll robotësh): mbaj gjendjen e mëparshme
        return c or {"at": 0, "ok": True, "embed": True, "len": 0, "title": "", "author": "", "desc": "", "date": ""}
    c = {"at": time.time(), "ok": st == "OK", "embed": bool(ps.get("playableInEmbed", True)), "status": st,
         "len": int(vd.get("lengthSeconds") or 0), "title": vd.get("title", ""), "author": vd.get("author", ""),
         "desc": vd.get("shortDescription", ""), "date": (mf.get("publishDate") or mf.get("uploadDate") or "")[:10],
         "live": bool(vd.get("isLiveContent")) and not int(vd.get("lengthSeconds") or 0)}
    cache["yt"][vid] = c
    return c


# ---------------- Internet Archive ----------------
def _secs(v):
    v = str(v or "").strip()
    if not v:
        return 0.0
    if ":" in v:
        p = [float(x) for x in v.split(":")]
        return sum(x * 60 ** i for i, x in enumerate(reversed(p)))
    try:
        return float(v)
    except ValueError:
        return 0.0


def ia_meta(ident, cache):
    c = cache.setdefault("ia", {}).get(ident)
    if c and time.time() - c.get("at", 0) < 4 * WEEK:
        return c
    try:
        m = json.loads(_get("https://archive.org/metadata/" + urllib.parse.quote(ident)))
    except Exception:
        return c
    md = m.get("metadata") or {}
    if not md:
        cache["ia"][ident] = {"at": time.time(), "ok": False}
        return cache["ia"][ident]
    vids, subs = [], []
    for f in m.get("files") or []:
        n = f.get("name", "")
        low = n.lower()
        if low.endswith((".mp4", ".m4v")) and not low.endswith(".ia.mp4"):
            vids.append({"name": n, "h": int(float(f.get("height") or 0)), "len": _secs(f.get("length")), "size": int(f.get("size") or 0), "lo": "512kb" in low})
        elif low.endswith((".srt", ".vtt")):
            subs.append(n)
    desc = md.get("description") or ""
    if isinstance(desc, list):
        desc = " ".join(desc)
    year = md.get("year") or md.get("date") or ""
    if isinstance(year, list):
        year = year[0]
    c = {"at": time.time(), "ok": bool(vids), "title": md.get("title") or "", "year": str(year)[:4], "desc": desc[:4000], "vids": vids, "subs": subs}
    cache["ia"][ident] = c
    return c


def ia_url(ident, name):
    return "https://archive.org/download/" + urllib.parse.quote(ident) + "/" + urllib.parse.quote(name)


def ia_best(c):
    """skedari kryesor dhe rezerva me cilësi më të ulët (për rrjet të dobët)"""
    vids = sorted(c.get("vids") or [], key=lambda v: (v["lo"], -min(v["h"] or 0, 720), -v["size"]))
    main = next((v for v in vids if not v["lo"]), vids[0] if vids else None)
    low = next((v for v in vids if v["lo"] and v is not main), None)
    return main, low


# ---------------- pastrimi i titujve të episodeve ----------------
def ep_title(t, cache):
    t = re.sub(r"\s*\|\s*Φωτεινά Μονοπάτια.*$|\s*\|\s*\d\d/\d\d/\d{4}.*$|\s*\|\s*ΕΡΤ\s*$|^Φωτεινά Μονοπάτια\s*", "", t).strip(" «»|-")
    m = re.match(r"LUMO-GOSPEL OF (\w+) CHAPTER ([\d:\-, ]+)", t, re.I)
    if m:
        return "Kapitulli " + m.group(2).strip()
    t = re.sub(r"^SuperFëmijët\s*-\s*", "", t, flags=re.I)
    t = re.sub(r"\s*-?\s*Sezoni \d+ Episodi \d+.*$", "", t, flags=re.I).strip(" -")
    t = re.sub(r"\s*\((Official|HD)[^)]*\)\s*$", "", t, flags=re.I).strip()
    sq = tr(t, cache) if is_en(t) else orthodox(t)
    return sq or t


def season_of(t):
    m = re.search(r"Sezoni (\d+)", t, re.I)
    return int(m.group(1)) if m else None


def norm(t):
    return re.sub(r"[^a-z0-9ëç]+", " ", (t or "").lower()).strip()


# ---------------- ndërtimi ----------------
def build(old, episodes_fn, log=print):
    try:
        kat = json.load(open(KATALOG, encoding="utf-8")).get("items", [])
    except (OSError, ValueError):
        return []
    try:
        cache = json.load(open(CACHE, encoding="utf-8"))
    except (OSError, ValueError):
        cache = {}
    today = time.strftime("%Y-%m-%d")
    out, dropped = [], []
    for e in kat:
        try:
            x = _item(e, cache, episodes_fn, old.get(e["id"]) or {}, today)
        except Exception as exc:          # një titull i prishur nuk ndal katalogun
            log(f"  ! {e.get('id')}: {exc.__class__.__name__}")
            x = old.get(e["id"])
        if x:
            out.append(x)
        else:
            dropped.append(e["id"])
        json.dump(cache, open(CACHE + ".tmp", "w", encoding="utf-8"), ensure_ascii=False)
        os.replace(CACHE + ".tmp", CACHE)
    if dropped:
        log("  Pa burim të vlefshëm (s'shfaqen): " + ", ".join(dropped))
    return out


def _item(e, cache, episodes_fn, prev, today):
    x = {k: e[k] for k in ("id", "titulli", "titulliOrigjinal", "tipi", "kategoria", "viti", "gjuha", "burimiEmri") if e.get(k)}
    x["titulli"] = orthodox(x["titulli"])
    x["statusi"] = "i disponueshëm"
    x["dataShtimit"] = prev.get("dataShtimit") or today
    desc, poster, mins = "", "", 0
    srv = []
    # --- filma në YouTube (kanale zyrtare) ---
    for k, raw in enumerate(e.get("yt") or []):
        vid, _, label = raw.partition("|")
        c = yt_info(vid, cache)
        if not c or not c.get("ok") or not c.get("embed"):
            continue
        srv.append({"emri": f"Serveri {len(srv) + 1}" + (f" · {label}" if label else ""), "tipi": "youtube", "url": "https://www.youtube.com/watch?v=" + vid})
        if not poster:
            poster = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
            mins = round((c.get("len") or 0) / 60)
            desc = c.get("desc") or ""
            x.setdefault("viti", (c.get("date") or "")[:4])
    # --- filma në domen publik (Internet Archive) ---
    subs_url = ""
    low_srv = []
    for ident in e.get("ia") or []:
        c = ia_meta(ident, cache)
        if not c or not c.get("ok"):
            continue
        main, low = ia_best(c)
        if main:
            srv.append({"emri": f"Serveri {len(srv) + 1}", "tipi": "direct", "url": ia_url(ident, main["name"]), "cilesia": f"{main['h']}p" if main["h"] else ""})
            if not poster:
                poster = "https://archive.org/services/img/" + ident
                mins = round(main["len"] / 60) if main["len"] else 0
                desc = c.get("desc") or ""
                if not x.get("viti") and re.match(r"1[89]\d\d|20\d\d", c.get("year") or ""):
                    x["viti"] = c["year"]
        if low:
            low_srv.append({"tipi": "direct", "url": ia_url(ident, low["name"]), "cilesia": "cilësi e ulët"})
        if not subs_url:
            s = next((n for n in c.get("subs") or [] if n.lower().endswith(".srt")), None) or next(iter(c.get("subs") or []), None)
            if s:
                subs_url = ia_url(ident, s)
    for s in low_srv:                                    # rezerva me cilësi të ulët, pastaj lojtësi i Archive
        srv.append(dict(s, emri=f"Serveri {len(srv) + 1} · cilësi e ulët"))
    if e.get("ia") and srv:
        first = next((i for i in e["ia"] if (cache.get("ia", {}).get(i) or {}).get("ok")), None)
        if first:
            srv.append({"emri": f"Serveri {len(srv) + 1} · lojtësi i Archive", "tipi": "embed", "url": "https://archive.org/embed/" + urllib.parse.quote(first)})
    # --- seri ---
    eps = []
    if e.get("eps"):
        for i, (vid, t, *sz) in enumerate(e["eps"], 1):       # [id, titulli] ose [id, titulli, sezoni] · sezoni 0 = speciale
            c = yt_info(vid, cache)
            if not c or not c.get("ok") or not c.get("embed"):
                continue
            eps.append({"id": vid, "nr": i, "titulli": orthodox(t), "kohezgjatja": round((c.get("len") or 0) / 60) or "",
                        "dataShtimit": c.get("date") or today, "burimi": {"lloji": "youtube", "url": "https://www.youtube.com/watch?v=" + vid}})
            if sz:
                eps[-1]["sezoni"] = sz[0]
            if not poster:
                poster, desc = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg", c.get("desc") or ""
    if e.get("pl"):
        seen = {}
        for pl in e["pl"]:
            try:
                got = episodes_fn(pl)
            except Exception:
                got = []
            for g in got:
                if any(g["id"] == y["id"] for y in eps):
                    continue
                t_raw = g["titulli"]
                t_sq = ep_title(t_raw, cache)
                key = norm(t_sq)
                src = {"lloji": "youtube", "url": "https://www.youtube.com/watch?v=" + g["id"]}
                if key in seen:                         # i njëjti episod nga një listë tjetër zyrtare → server rezervë
                    seen[key].setdefault("burimet", [dict(seen[key]["burimi"], emri="Serveri 1")]).append(dict(src, emri=f"Serveri {len(seen[key]['burimet']) + 1}"))
                    continue
                ep = {"id": g["id"], "nr": len(eps) + 1, "titulli": t_sq, "kohezgjatja": g.get("kohezgjatja") or "", "dataShtimit": g.get("dataShtimit") or today, "burimi": src}
                sz = season_of(t_raw)
                if sz:
                    ep["sezoni"] = sz
                seen[key] = ep
                eps.append(ep)
        if eps and not poster:
            poster = f"https://i.ytimg.com/vi/{eps[0]['id']}/hqdefault.jpg"
            c = yt_info(eps[0]["id"], cache)
            desc = (c or {}).get("desc") or ""
    if e.get("iaSeri"):
        lists = []
        for ident in e["iaSeri"]:
            c = ia_meta(ident, cache)
            if not c or not c.get("ok"):
                lists.append({})
                continue
            by = {}
            for v in c["vids"]:
                m = re.search(r"(\d{1,2})", v["name"])
                if not m:
                    continue
                n = int(m.group(1))
                if n not in by or (by[n]["lo"] and not v["lo"]):
                    by[n] = v
            lists.append({n: (ident, v) for n, v in by.items()})
        base = next((l for l in lists if l), {})
        for n in sorted(base):
            ident, v = base[n]
            name = re.sub(r"^(chpt\.)?\d{1,2}[_\-. ]*", "", os.path.splitext(v["name"])[0], flags=re.I).replace("_512kb", "")
            name = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name).replace("_", " ").strip()
            bs = [{"emri": "Serveri 1", "lloji": "direct", "url": ia_url(ident, v["name"])}]
            for l in lists:
                if l is base or n not in l:
                    continue
                bs.append({"emri": f"Serveri {len(bs) + 1}", "lloji": "direct", "url": ia_url(l[n][0], l[n][1]["name"])})
            eps.append({"id": f"{e['id']}-{n}", "nr": n, "titulli": tr(name, cache) or name, "kohezgjatja": round(v["len"] / 60) if v["len"] else "",
                        "dataShtimit": today, "burimi": bs[0], "burimet": bs})
        first = next((i for i in e["iaSeri"] if (cache.get("ia", {}).get(i) or {}).get("ok")), None)
        if first and not poster:
            poster, desc = "https://archive.org/services/img/" + first, cache["ia"][first].get("desc") or ""
            if not x.get("viti") and re.match(r"1[89]\d\d|20\d\d", cache["ia"][first].get("year") or ""):
                x["viti"] = cache["ia"][first]["year"]
    if any(ep.get("sezoni") is not None for ep in eps):   # sezonet: episodet pa sezon shkojnë te i pari; specialet (0) në fund
        for ep in eps:
            ep.setdefault("sezoni", 1)
        eps.sort(key=lambda ep: (ep["sezoni"] == 0, ep["sezoni"], ep["nr"]))
        for sn in {ep["sezoni"] for ep in eps}:
            for i, ep in enumerate([y for y in eps if y["sezoni"] == sn], 1):
                ep["nr"] = i
    if x.get("tipi") == "seri":
        if not eps:
            return None
        prev_eps = {str(p.get("id")): p for p in prev.get("episodet") or []}
        for ep in eps:                                    # episodi i ri merr datën kur u shfaq te ne
            p = prev_eps.get(str(ep["id"]))
            if p and p.get("dataShtimit"):
                ep["dataShtimit"] = p["dataShtimit"]
            elif prev:
                ep["dataShtimit"] = today
        x["episodet"] = eps
    else:
        if not srv:
            return None
        x["burimet"] = srv
        x["burimi"] = {"lloji": srv[0]["tipi"], "url": srv[0]["url"]}
        if mins:
            x["kohezgjatja"] = mins
    if not x.get("viti"):
        x.pop("viti", None)
    d = tr(clean_desc(desc), cache) if desc else ""
    if d:
        x["pershkrimi"] = d
    if poster:
        x["posteri"] = wsrv(poster)
        x["posteriOrig"] = poster
    if subs_url:
        x["titraOrigjinaleUrl"] = subs_url
        x["titraGjuha"] = "en"
    if os.path.exists(os.path.join(SUBS, x["id"] + ".vtt")):
        x["titraShqipUrl"] = "subtitles/" + x["id"] + ".vtt"
    return x
