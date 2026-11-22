r"""Shkolla e Muzikës Bizantine · Kori bizantin «Shën Joan Kukuzeli» → data\shkolla.json (+ .js)

  1) Pjesët e reja: RSS publik i kanalit të YouTube (@theodhorpecikoribizantin).
  2) Botime, njoftime, foto: çdo foto (.jpg/.jpeg/.png/.webp) që vendos te dosja  shkolla_e_re\
     (vetëm materiale të shkollës që ke të drejtë t'i botosh). Nëse pranë fotos ka një .txt me të njëjtin emër,
     rreshti i parë bëhet titull, pjesa tjetër tekst; një rresht që nis me http bëhet lidhja e postimit
     (p.sh. postimi në Facebook / Instagram). Mund të shtosh edhe vetëm një .txt (njoftim pa foto).
     Fotot kthehen në WebP te img\shkolla\ dhe origjinalet zhvendosen te shkolla_e_re\_perpunuar\.
  Facebook dhe Instagram: me API-n zyrtare të Meta, kur te tools\meta_shkolla.json ka çelësin e faqes (shih më poshtë);
     merren postimet nga 1 janari 2026 dhe fotot ruhen te img\shkolla\ (lidhjet e Meta skadojnë).

Përdorimi:  py -X utf8 tools\merr_shkollen.py        (e nis edhe auto_sinkronizo.py)"""
import datetime, html, json, os, re, shutil, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "shkolla.json")
INBOX = os.path.join(ROOT, "shkolla_e_re")
DONE = os.path.join(INBOX, "_perpunuar")
IMG = os.path.join(ROOT, "img", "shkolla")
RSS = "https://www.youtube.com/feeds/videos.xml?channel_id=UC57U8o2eBLgiDdWq40vKcsQ"
UA = "FjalaEShenjte-Lajme/2.7 (lexues RSS i aplikacionit orthodhoks)"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}
EXTS = (".jpg", ".jpeg", ".png", ".webp")


def _cover(vid):
    try:
        from merr_ngjallja_shkolla import cover
        return cover(vid)
    except Exception:
        return f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg"


def videos():
    req = urllib.request.Request(RSS, headers={"User-Agent": UA})
    root = ET.fromstring(urllib.request.urlopen(req, timeout=30).read())
    out = []
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", "", NS)
        if not vid:
            continue
        desc = (e.findtext("media:group/media:description", "", NS) or "").strip()   # i plotë, me rreshtat e vet
        st = e.find("media:group/media:community/media:statistics", NS)
        out.append({"id": vid, "title": html.unescape(e.findtext("a:title", "", NS)), "date": e.findtext("a:published", "", NS),
                    "views": int(st.get("views", 0)) if st is not None else 0,
                    "ex": desc, "img": _cover(vid)})
    return out


KOASH = "https://orthodoxalbania.org/2026/wp-json/wp/v2/posts"
SINCE = "2026-01-01T00:00:00"


def kisha_posts():
    """Postimet e orthodoxalbania.org për Shkollën / Muzikën Bizantine (vetëm shqip, nga 1 janari 2026):
    titulli, përmbledhja e shkurtër, foto, data dhe lidhja drejt postimit origjinal."""
    import urllib.parse
    seen, out = set(), []
    for q in ("muzikës bizantine", "muzikë bizantine", "Kukuzeli", "kori bizantin", "psaltë"):
        url = f"{KOASH}?per_page=30&after={SINCE}&_embed=wp:featuredmedia&_fields=id,date,link,title,excerpt,content,_links,_embedded&search={urllib.parse.quote(q)}"
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
        for p in json.loads(urllib.request.urlopen(req, timeout=30).read()):
            link = p.get("link") or ""
            if p["id"] in seen or re.search(r"/2026/(en|el|fr|it|de|es|ro|sr|bg|ar|ko|ru)/", link):
                continue
            body = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", (p.get("content") or {}).get("rendered", "")))).strip()
            title = html.unescape(re.sub(r"<[^>]+>", "", (p.get("title") or {}).get("rendered", ""))).strip()
            # vetëm postimet që flasin vërtet për shkollën / muzikën bizantine (jo ato që e përmendin kalimthi)
            if not (re.search(r"muzik\w* bizantin|psalt|kukuzel|kor\w* bizantin", title.lower())
                    or re.search(r"shkoll\w* (?:së |e )?muzik", body.lower())):
                continue
            seen.add(p["id"])
            m = ((p.get("_embedded") or {}).get("wp:featuredmedia") or [None])[0] or {}
            sz = (m.get("media_details") or {}).get("sizes") or {}
            img = (sz.get("medium_large") or sz.get("large") or {}).get("source_url") or m.get("source_url") or ""
            if not img:
                mm = re.search(r'<img[^>]+(?:data-src|src)="([^"]+)"', (p.get("content") or {}).get("rendered", ""))
                img = html.unescape(mm.group(1)) if mm else ""
            ex = body[:300].rsplit(" ", 1)[0] + "…" if len(body) > 300 else body
            # teksti i plotë, paragraf pas paragrafi (ashtu siç është te burimi)
            raw = (p.get("content") or {}).get("rendered", "")
            paras = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x))).strip() for x in re.split(r"</p>|<br\s*/?>|</h\d>|</li>", raw, flags=re.I)]
            text = "\n".join(x for x in paras if x)
            out.append({"id": p["id"], "title": title, "ex": ex, "text": text, "date": p.get("date", ""), "link": link, "img": img, "src": "KOASH · orthodoxalbania.org"})
    out.sort(key=lambda x: x["date"], reverse=True)
    return out


# Postimet e Facebook / Instagram të shkollës, me API-n zyrtare të Meta (me lejen e shkollës).
# Çelësi NUK botohet kurrë: rri vetëm në këtë kompjuter, te tools\meta_shkolla.json:
#   {"token": "<Page access token afatgjatë>", "fb_page_id": "<ID e faqes>", "ig_user_id": "<ID e llogarisë Instagram Business>"}
META_CFG = os.path.join(ROOT, "tools", "meta_shkolla.json")
GRAPH = "https://graph.facebook.com/v19.0/"


def _graph(path, token, **q):
    import urllib.parse
    q["access_token"] = token
    url = GRAPH + path + "?" + urllib.parse.urlencode(q)
    return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30).read())


def _split(cap):
    import re
    lines = [l.strip() for l in (cap or "").splitlines() if l.strip()]
    if not lines:
        return "", ""
    first = lines[0]
    # citat ose vjershë: rreshti i parë hap thonjëza pa i mbyllur, ose rreshti tjetër vijon me shkronjë të vogël.
    # Atëherë teksti mbetet i plotë dhe titull bëhet autori i citatit (rreshti i fundit i shkurtër), kurrë një varg i prerë.
    opens = first[:1] in "\"“„«'" and not re.search(r"[\"”»]", first[1:])
    cont = len(lines) > 1 and lines[1][:1].islower()
    if cont and not opens:
        # fjalia e parë vazhdon në rreshtat pasues: titulli është e gjithë fjalia (deri te pika), jo gjysma e saj
        k, t = 0, first
        while k + 1 < len(lines) and not re.search(r"[.!?…]$", t) and len(t) + len(lines[k + 1]) < 120:
            k += 1; t += " " + lines[k]
        if re.search(r"[.!?…]$", t):
            return t, chr(10).join(lines[k + 1:])
    if opens or cont:
        body = list(lines)
        title = ""
        if len(body) > 2 and len(body[-1]) <= 60 and not re.search(r"[.,;:!?…\"”»]$", body[-1]):
            title = body.pop()
        txt = "\n".join(body)
        txt = re.sub(r"^[\"“„]", "«", txt)
        txt = re.sub(r"[\"”]$", "»", txt)
        return (title or re.sub(r"^[\"“„«]", "", first) + " …"), txt
    if len(first) > 110:                                    # rreshti i parë shumë i gjatë → titull deri te fjalia e parë
        m = re.match(r"(.{20,110}?[.!?»])\s", first)
        if m:
            return m.group(1), "\n".join([first[len(m.group(1)):].strip()] + lines[1:]).strip()
    return first, "\n".join(lines[1:])


def meta_posts():
    if not os.path.exists(META_CFG):
        return None
    cfg = json.load(open(META_CFG, encoding="utf-8-sig"))
    tok, out = cfg.get("token", ""), []
    if not tok:
        return None
    if cfg.get("fb_page_id"):
        d = _graph(cfg["fb_page_id"] + "/posts", tok, limit=50, since=SINCE[:10],
                   fields="message,created_time,permalink_url,full_picture,attachments{media{image{src}},subattachments{media{image{src}}}}")
        for x in d.get("data", []):
            imgs = []
            for a in (x.get("attachments") or {}).get("data", []):
                for sa in ((a.get("subattachments") or {}).get("data", []) or [a]):
                    u = (((sa.get("media") or {}).get("image") or {}).get("src"))
                    if u and u not in imgs:
                        imgs.append(u)
            if not x.get("message") and not imgs:
                continue
            t, body = _split(x.get("message"))
            out.append({"title": t, "text": body, "date": x.get("created_time", ""), "link": x.get("permalink_url", ""),
                        "img": x.get("full_picture") or (imgs[0] if imgs else ""), "imgs": imgs[:30], "src": "Facebook · Shkolla"})
    if cfg.get("ig_user_id"):
        d = _graph(cfg["ig_user_id"] + "/media", tok, limit=50,
                   fields="caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}")
        for x in d.get("data", []):
            if (x.get("timestamp") or "") < SINCE[:10]:
                continue
            kids = (x.get("children") or {}).get("data", []) or [x]
            imgs = [k.get("thumbnail_url") if k.get("media_type") == "VIDEO" else k.get("media_url") for k in kids]
            imgs = [u for u in imgs if u]
            t, body = _split(x.get("caption"))
            out.append({"title": t, "text": body, "date": x.get("timestamp", ""), "link": x.get("permalink", ""),
                        "img": imgs[0] if imgs else "", "imgs": imgs[:30], "src": "Instagram · Shkolla"})
    return out


def _localize(post):
    """Fotot e Facebook/Instagram skadojnë pas disa ditësh: ruhen te img/shkolla/ (WebP) që postimi të mbetet i plotë."""
    import hashlib, io
    os.makedirs(IMG, exist_ok=True)
    def one(u):
        if not u or not u.startswith("http"):
            return u
        rel = "img/shkolla/m_" + hashlib.sha1(u.split("?")[0].encode()).hexdigest()[:16] + ".webp"
        dst = os.path.join(ROOT, rel.replace("/", os.sep))
        if not os.path.exists(dst):
            try:
                raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=40).read()
                to_webp(io.BytesIO(raw), dst)
            except Exception:
                return u
        return rel
    post["imgs"] = [one(u) for u in post.get("imgs") or []]
    post["img"] = one(post.get("img")) if post.get("img") else (post["imgs"][0] if post["imgs"] else "")
    return post


def to_webp(src, dst):
    from PIL import Image, ImageOps
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((1600, 1600))
    q = 84
    while True:
        im.save(dst, "WEBP", quality=q, method=6)
        if os.path.getsize(dst) < 420_000 or q <= 50:
            break
        q -= 8


def dedupe_posts(posts):
    """Çdo postim vetëm një herë: i njëjti id (Facebook-u i jep lidhje «pfbid» të re çdo herë) dhe i njëjti postim
    i ndarë në Facebook dhe Instagram (i njëjti titull, brenda 90 minutave; pa titull: brenda 3 minutave).
    Mbahet më i ploti (tekst, pastaj fotot)."""
    import unicodedata

    def norm(t):
        return re.sub(r"\W+", " ", unicodedata.normalize("NFKC", str(t or "")).lower()).strip()

    def score(p):
        return (bool(p.get("text")), len(p.get("imgs") or []), len(p.get("text") or ""))

    def when(p):
        try:
            return datetime.datetime.fromisoformat(str(p.get("date", ""))[:19])
        except ValueError:
            return None

    by_id = {}
    for p in posts:
        k = p.get("id") or p.get("link")
        if k not in by_id or score(p) > score(by_id[k]):
            by_id[k] = p
    keep = []
    for p in sorted(by_id.values(), key=lambda x: x.get("date", ""), reverse=True):
        tp, wp = norm(p.get("title"))[:30], when(p)
        twin = None
        for i, q in enumerate(keep):
            wq = when(q)
            if not wp or not wq or tp != norm(q.get("title"))[:30]:
                continue
            if abs((wp - wq).total_seconds()) <= (5400 if tp else 180):
                twin = i
                break
        if twin is None:
            keep.append(p)
        elif score(p) > score(keep[twin]):
            keep[twin] = dict(p, video=p.get("video") or keep[twin].get("video"))
    return keep


def inbox(posts):
    if not os.path.isdir(INBOX):
        os.makedirs(INBOX, exist_ok=True)
        return 0
    os.makedirs(DONE, exist_ok=True)
    os.makedirs(IMG, exist_ok=True)
    names = sorted({os.path.splitext(f)[0] for f in os.listdir(INBOX) if os.path.isfile(os.path.join(INBOX, f)) and f.lower().endswith(EXTS + (".txt",))})
    n = 0
    for base in names:
        pic = next((os.path.join(INBOX, base + e) for e in EXTS + tuple(x.upper() for x in EXTS) if os.path.exists(os.path.join(INBOX, base + e))), None)
        txt = os.path.join(INBOX, base + ".txt")
        title, text, link = "", "", ""
        if os.path.exists(txt):
            lines = [l.strip() for l in open(txt, encoding="utf-8-sig").read().splitlines()]
            links = [l for l in lines if re.match(r"https?://", l)]
            link = links[0] if links else ""
            body = [l for l in lines if l and l not in links]
            title, text = (body[0] if body else ""), "\n".join(body[1:])
        when = datetime.datetime.fromtimestamp(os.path.getmtime(pic or txt)).isoformat(timespec="seconds")
        post = {"title": title, "text": text, "link": link, "date": when, "img": ""}
        if pic:
            slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")[:50] or "foto"
            rel = f"img/shkolla/{when[:10]}_{slug}.webp"
            to_webp(pic, os.path.join(ROOT, rel.replace("/", os.sep)))
            post["img"] = rel
            shutil.move(pic, os.path.join(DONE, os.path.basename(pic)))
        if os.path.exists(txt):
            shutil.move(txt, os.path.join(DONE, os.path.basename(txt)))
        posts.insert(0, post)
        n += 1
    return n


def main():
    doc = {"videos": [], "posts": []}
    if os.path.exists(OUT):
        try:
            doc.update(json.load(open(OUT, encoding="utf-8")))
        except Exception:
            pass
    rep = []
    try:
        v = videos()
        if v:
            doc["videos"] = v
        rep.append(f"YouTube {len(v)} pjesë")
    except Exception as e:
        rep.append(f"YouTube GABIM ({e})")
    try:
        k = kisha_posts()
        doc["kisha"] = k
        rep.append(f"faqja e Kishës {len(k)} postime")
    except Exception as e:
        rep.append(f"faqja e Kishës GABIM ({e})")
    try:
        mp = meta_posts()
        if mp is None:
            rep.append("Facebook/Instagram: mungon tools\\meta_shkolla.json")
        else:
            have = {x.get("link") for x in doc["posts"] if x.get("link")}
            new = [x for x in mp if x["link"] and x["link"] not in have]
            mp = [_localize(x) for x in mp]
            fresh = {x["link"]: x for x in mp if x["link"]}
            doc["posts"] = [fresh.get(x.get("link"), x) for x in doc["posts"]] + new    # të freskëta (fotot e Meta skadojnë)
            rep.append(f"Facebook/Instagram {len(mp)} postime ({len(new)} të reja)")
    except Exception as e:
        rep.append(f"Facebook/Instagram GABIM ({e.__class__.__name__})")
    try:      # Radio Ngjallja: emisionet për shkollën / Korin / z. Theodhor Peci (titulli e përshkrimi siç janë)
        import merr_ngjallja_shkolla
        old = {x["id"]: x for x in doc.get("radio", [])}
        r = merr_ngjallja_shkolla.fetch(old)
        if r:
            doc["radio"] = sorted({x["id"]: x for x in list(old.values()) + r}.values(), key=lambda x: x["date"], reverse=True)
        rep.append(f"Radio Ngjallja {len(doc.get('radio', []))} emisione")
    except Exception as e:
        rep.append(f"Radio Ngjallja GABIM ({e.__class__.__name__})")
    try:      # Instagram publik i shkollës (pa llogari): postimet nga 1 janari, çdo ditë vetëm të rejat
        if os.environ.get("FS_PA_APIFY"):
            raise LookupError("pa Apify këtë orë")
        import merr_ig_shkolla
        have = {x.get("link") for x in doc["posts"] if x.get("link")}
        ig_old = min((x.get("date", "") for x in doc["posts"] if "instagram" in (x.get("link") or "")), default="")
        fb_new = max((x.get("date", "") for x in doc["posts"] if "facebook.com" in (x.get("link") or "")), default="")
        ig, _st = merr_ig_shkolla.fetch(have, ig_old, fb_new, {x.get("id") for x in doc["posts"] if x.get("id")})
        doc["posts"] = ig + doc["posts"]
        rep.append(f"Instagram {len(ig)} postime të reja")
    except LookupError:
        rep.append("Instagram: herën tjetër (Apify çdo 6 orë)")
    except Exception as e:
        rep.append(f"Instagram GABIM ({e.__class__.__name__})")
    try:
        rep.append(f"botime të reja {inbox(doc['posts'])}")
    except Exception as e:
        rep.append(f"dosja GABIM ({e})")
    doc["posts"] = dedupe_posts(doc["posts"])[:200]
    doc["updated"] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    __import__("merr_lajmet").scrub_hidden(doc)
    json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(OUT[:-5] + ".js", "w", encoding="utf-8").write(
        'window.FS_DATA=window.FS_DATA||{};FS_DATA["shkolla"]=' + json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + ";\n")
    msg = "Shkolla: " + " · ".join(rep)
    print(msg)
    return msg


if __name__ == "__main__":
    main()
    sys.exit(0)
