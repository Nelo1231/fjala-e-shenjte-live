r"""Gazetat e Mitropolive: lajmet e KOASH (orthodoxalbania.org) dhe UGO.al të ndara sipas mitropolisë
→ data\mitropolite.json (+ .js).

Kisha e Shqipërisë nuk i ka kategoritë sipas mitropolive, ndaj çdo shkrim lidhet me një mitropoli sipas
emrave që vetë shkrimi përmend (qyteti, mitropolia, mitropoliti), te titulli ose në fillim të tekstit.
Mitropolitët, siç i shkruan vetë KOASH: Korçë — Anastasi; Gjirokastër — Nathanaili; Berat — Asti;
Elbasan — Andoni; Apoloni dhe Fier — Nikolla. Kryepiskopata: Tiranë, Durrës.
Fanari (Patriarkana Ekumenike): shkrimet shqip të KOASH / UGO.al + Orthodox Times (anglisht, del
vetëm kur është i përkthyer).

Postimet publike të faqeve zyrtare në Facebook (Korçë, Gjirokastër, Fier, Berat, Elbasan, KOASh/Tiranë, Radio Ngjallja)
merren përmes Apify kur është vendosur APIFY_TOKEN: vetëm të rejat, me tekstin e plotë dhe fotot (edhe Berati).
Ruhen titulli, teksti, data, lidhja, fotot WebP dhe burimi.

Përdorimi:  py -X utf8 tools\merr_mitropolite.py   (e nis edhe auto_sinkronizo.py)"""
import json, os, re, sys, unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import merr_lajmet as ml

ROOT = ml.ROOT
OUT = os.path.join(ROOT, "data", "mitropolite.json")
WP = "https://orthodoxalbania.org/2026/wp-json/wp/v2/posts?categories=108&per_page=100&page={p}&_embed=wp:featuredmedia&_fields=id,date,date_gmt,link,title,excerpt,content,_links,_embedded"
PAGES = 3          # 300 shkrimet e fundit
PER = 300          # shkrime për çdo mitropoli (arkiva e numrave javorë)

GROUPS = [
    ("tirane", "Kryepiskopata e Tiranës dhe Durrësit", r"\bTiran\w*|Durrës\w*|Kryepiskopat\w*"),
    ("korce", "Mitropolia e Shenjtë e Korçës", r"Korç\w*"),
    ("gjiro", "Mitropolia e Shenjtë e Gjirokastrës", r"Gjirokast\w*|Nathanail\w*"),
    ("fier", "Mitropolia e Shenjtë e Apolonisë dhe Fierit", r"\bFier\w*|Apoloni\w*|Apolloni\w*"),
    ("berat", "Mitropolia e Shenjtë e Beratit, Vlorës dhe Kaninës", r"\bBerat\w*|\bVlor\w*|Kanin\w*|\bAst(i|it|in)\b"),
    ("elbasan", "Mitropolia e Shenjtë e Elbasanit, Shpatit dhe Librazhdit", r"Elbasan\w*|\bShpat\w*|Librazhd\w*|\bAndon(i|it|in)\b"),
    ("fanar", "Fanari · Patriarkana Ekumenike", r"Patriark\w* Ekumenik\w*|\bFanar\w*|Vartholome\w*|Kostandinopoj\w*|Konstandinopoj\w*"),
    ("radio", "Radio Ngjallja", r"Radio\s+Ngjallja"),
]


CHURCH = r"Kish\w*|Mitropoli\w*|Kryepiskop\w*|Episkop\w*|Patriark\w*|Liturgji\w*|famulli\w*|enori\w*|manastir\w*|prift\w*|shenjt\w*|orthodhoks\w*"


# Çdo shkrim shkon te NJË mitropoli e vetme: ajo që përmendet më fort (te titulli > emri zyrtar i mitropolisë /
# mitropolitit > qyteti). Kështu gazetat e mitropolive nuk përzihen me njëra-tjetrën.
def _strong(city):
    return rf"Mitropol\w*\s+(?:(?:e|i|së|të)\s+)?(?:Shenjtë\s+(?:e|së)\s+)?{city}"


CLASS = {
    "korce": (_strong(r"Korçës") + r"|Mitropolit\w*\s+Anastas\w*", r"\bKorç\w*"),
    "gjiro": (_strong(r"Gjirokastrës") + r"|Nathanail\w*", r"\bGjirokast\w*"),
    "fier": (_strong(r"Apol+onisë") + r"|Mitropolit\w*\s+Nikoll\w*|Mitropolit\w*\s+(?:i|e|të)\s+Fierit", r"\bFier\w*|\bApol+oni\w*"),
    "berat": (_strong(r"Beratit") + r"|\bAst(?:i|it|in)\b", r"\bBerat\w*|\bVlor\w*|\bKanin\w*"),
    "elbasan": (_strong(r"Elbasanit") + r"|\bAndon(?:i|it|in)\b", r"\bElbasan\w*|\bShpat\w*|\bLibrazhd\w*"),
    "tirane": (r"Kryepiskopat\w*|Mitropoli\w*\s+(?:e\s+)?Tiranës|Katedral\w*\s+(?:e|së)\s+Ngjall\w*", r"\bTiran\w*|\bDurrës\w*"),
}
FANAR = r"Patriark\w*\s+Ekumenik\w*|\bFanar\w*|Vartholome\w*|Kostandinopoj\w*|Konstandinopoj\w*"


def n(rx, s):
    return len(re.findall(rx, s, re.I))


def classify(title, body):
    """Kthen id-në e grupit (një të vetëm) ose None."""
    body = body[:900]
    if n(FANAR, title):
        return "fanar"
    sc = {}
    for g, (strong, city) in CLASS.items():
        sc[g] = 6 * n(strong, title) + 4 * n(city, title) + 3 * min(n(strong, body), 2) + min(n(city, body), 2)
    best = max(sc, key=sc.get)
    top = sc[best]
    strong, city = CLASS[best]
    own = n(strong, title) or n(strong, body) or n(city, title)        # filtri: vetëm material i vetë mitropolisë
    if top >= 3 and own and sum(1 for v in sc.values() if v == top) == 1:
        return best
    if n(FANAR, body) >= 2:
        return "fanar"
    return None


def paras_of(body, limit=14000):
    """Teksti i plotë i shkrimit si paragrafë të thjeshtë (pa HTML)."""
    paras = [ml.text(t) for _tag, t in re.findall(r"<(p|h[2-5]|blockquote|li)\b[^>]*>(.*?)</\1>", body, re.S | re.I)]
    if sum(len(t) for t in paras) < 400:
        b2 = re.sub(r"(?i)<br\s*/?>|</div>|</h\d>|</p>", "\n\n", body)
        paras = [ml.text(t) for t in re.split(r"\n\s*\n", b2)]
    return "\n\n".join(t for t in paras if len(t) > 2)[:limit]


def koash_posts():
    out = []
    for p in range(1, PAGES + 1):
        try:
            posts = json.loads(ml.get(WP.format(p=p)))
        except Exception:
            break
        for x in posts:
            link = x.get("link") or ""
            if re.search(r"/2026/(en|el|fr|it|de|es|ro|sr|bg|ar|ko|ru)/", link):
                continue
            m = ((x.get("_embedded") or {}).get("wp:featuredmedia") or [None])[0] or {}
            sz = (m.get("media_details") or {}).get("sizes") or {}
            body = (x.get("content") or {}).get("rendered") or ""
            img = (sz.get("medium_large") or sz.get("large") or sz.get("medium") or {}).get("source_url") or m.get("source_url") or ml.first_img(body)
            out.append({"title": ml.text((x.get("title") or {}).get("rendered")), "ex": ml.short(ml.text((x.get("excerpt") or {}).get("rendered"))),
                        "date": ml.iso(x.get("date_gmt") or x.get("date") or ""), "link": link, "img": img or "", "src": "koash",
                        "grp": "koash", "lang": "sq", "_body": ml.text(body)[:1500], "imgs": ml.all_imgs(body, img or ""),
                        "text": paras_of(body, 12000)})
    return out


# Predikimet zyrtare të KOASH (Kryepiskopi Joan; predikimet e së Dielës dhe të festave) → teksti i plotë
# brenda aplikacionit, te gazeta e mitropolisë që përmendin ose te Kryepiskopata.
PRED = "https://orthodoxalbania.org/2026/wp-json/wp/v2/posts?categories={c}&per_page=10&_embed=wp:featuredmedia&_fields=id,date,date_gmt,link,title,excerpt,content,_links,_embedded"
def sermons():
    out = []
    for c in (5441, 2777):
        try:
            posts = json.loads(ml.get(PRED.format(c=c)))
        except Exception:
            continue
        for x in posts:
            body = (x.get("content") or {}).get("rendered") or ""
            m = ((x.get("_embedded") or {}).get("wp:featuredmedia") or [None])[0] or {}
            sz = (m.get("media_details") or {}).get("sizes") or {}
            img = (sz.get("medium_large") or sz.get("large") or {}).get("source_url") or m.get("source_url") or ml.first_img(body) or ""
            txt = paras_of(body)
            out.append({"title": ml.text((x.get("title") or {}).get("rendered")), "ex": ml.short(ml.text((x.get("excerpt") or {}).get("rendered"))),
                        "date": ml.iso(x.get("date_gmt") or x.get("date") or ""), "link": x.get("link") or "", "img": img, "imgs": ml.all_imgs(body, img),
                        "src": "pred", "grp": "koash", "lang": "sq", "text": txt, "cat": "predikim", "_body": ml.text(body)[:1500], "_kp": c == 5441})
    return out


def main():
    items = koash_posts()
    preds = sermons()

    # merr_lajmet ruan "summary" dhe "src_id"; ky modul përdor "ex" dhe burime të shkurtra.
    try:
        with open(os.path.join(ROOT, "data", "lajme_bota.json"), encoding="utf-8") as f:
            ugo = json.load(f)
        if isinstance(ugo, dict):
            ugo = ugo.get("items", [])
        for item in ugo if isinstance(ugo, list) else []:
            source_id = str(item.get("src_id") or "")
            if source_id.startswith("ugo_") or source_id == "ugo_main":
                items.append(dict(item, src="ugo", ex=item.get("summary", ""), _body=item.get("summary", "")))
    except Exception:
        pass

    try:
        ot = ml.from_rss({"id": "ot", "name": "Orthodox Times", "url": "https://orthodoxtimes.com/category/ecumenical-patriarchate/feed/", "per": 15})
        ot = [dict(i, src="ot", grp="bota", lang="en", ex=i.get("summary", ""), _body="Fanar") for i in ot]
        items += ot
    except Exception:
        pass

    fb_items = []
    try:
        fb_items = _fb_apify_fetch_mitropolite()
        print(f"Facebook / Radio Ngjallja: {len(fb_items)} postime")
    except Exception as exc:
        print(f"Facebook / Radio Ngjallja: gabim {exc.__class__.__name__}: {exc}")

    byg = {g[0]: [] for g in GROUPS}
    seen = set()
    titles = {re.sub(r"\W+", " ", str(i.get("title", "")).lower()).strip()[:60] + "|" + str(i.get("date", ""))[:10] for i in preds + items}
    for it in preds + items + fb_items:
        link = str(it.get("link") or "").strip()
        key = link or str(it.get("id") or it.get("title") or "").strip()
        if not key or key in seen:
            continue

        if it.get("_fb"):
            g = it.get("target_group") or classify(it.get("title", ""), it.get("text", ""))
            tkey = re.sub(r"\W+", " ", it.get("title", "").lower()).strip()[:60]
            if tkey and tkey + "|" + str(it.get("date", ""))[:10] in titles:
                continue
        elif it.get("src") == "ot":
            g = "fanar"
        elif it.get("src") == "pred":
            g = "tirane" if it.get("_kp") else (classify(it["title"], it.get("_body", "")) or "tirane")
        else:
            if it.get("src") == "ugo" and not re.search(CHURCH, it.get("title", "") + " " + it.get("_body", ""), re.I):
                continue
            g = classify(it.get("title", ""), it.get("_body", ""))

        if not g or g not in byg:
            continue
        seen.add(key)
        fields = ("title", "ex", "date", "link", "img", "imgs", "src", "grp", "lang", "tr", "text", "cat", "source", "id", "video")
        byg[g].append({k: it.get(k, "") for k in fields if it.get(k, "") != "" or k in ("title", "link")})

    # Ruaj postimet e mëparshme nëse një burim bie përkohësisht.
    try:
        with open(OUT, encoding="utf-8") as f:
            previous = json.load(f)
        old_groups = {g.get("id"): g for g in previous.get("groups", [])} if isinstance(previous, dict) else {}
        old_koash = previous.get("koash", []) if isinstance(previous, dict) else []
    except Exception:
        old_groups, old_koash = {}, []

    _fb_dedupe(old_groups, byg)
    groups = []
    for gid, name, _rx in GROUPS:
        old_items = old_groups.get(gid, {}).get("items", [])
        combined = byg[gid] + [x for x in old_items if isinstance(x, dict)]
        deduped, local_seen = [], set()
        for item in combined:
            item_key = item.get("link") or item.get("id") or item.get("title")
            if not item_key or item_key in local_seen:
                continue
            local_seen.add(item_key)
            deduped.append(item)
        arr = sorted(deduped, key=lambda x: x.get("date") or "", reverse=True)
        groups.append({"id": gid, "name": name, "items": arr[:PER]})

    keep = ("title", "ex", "date", "link", "img", "imgs", "src", "grp", "lang")
    koash_new = [{k: i.get(k, "") for k in keep} for i in items if i.get("src") == "koash"]
    koash = []
    koash_seen = set()
    for item in koash_new + [x for x in old_koash if isinstance(x, dict)]:
        key = item.get("link") or item.get("title")
        if key and key not in koash_seen:
            koash_seen.add(key)
            koash.append(item)
    koash.sort(key=lambda x: x.get("date") or "", reverse=True)

    prev = previous if isinstance(locals().get("previous"), dict) else {}
    doc = {"koash": koash[:500], "updated": ml.iso_now(), "groups": groups,
           "fb_at": FB_AT or str(prev.get("fb_at") or ""),
           "fb_seen": sorted(set(prev.get("fb_seen") or []) | _FB_DROPPED)[-600:]}
    ml.scrub_hidden(doc)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    with open(OUT[:-5] + ".js", "w", encoding="utf-8") as f:
        f.write("window.FS_DATA=window.FS_DATA||{};window.FS_DATA.mitropolite=" + json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + ";\n")

    try:
        vr = vatikan()
    except Exception as exc:
        vr = f"Vatikani: {exc}"
    return vr + " · Mitropolitë: " + " · ".join(
        f"{g['id']} {sum(1 for i in g['items'] if i.get('lang') == 'sq')}" for g in groups
    )


# Faqet zyrtare në Facebook: secila shkon te gazeta e vet (lidhjet e mitropolive i dha autori më 22 nëntor 2026;
# Tirana = faqja zyrtare e KOASh, Kryepiskopata).
FB_PAGES = [
    ("korce", "Mitropolia e Korçës · Facebook", "https://www.facebook.com/profile.php?id=100067613483874", ("100067613483874", "mitropolia-e-shenjt")),
    ("gjiro", "Mitropolia e Gjirokastrës · Facebook", "https://www.facebook.com/profile.php?id=61586890914979", ("61586890914979", "gjirokastr")),
    ("fier", "Mitropolia e Fierit · Facebook", "https://www.facebook.com/MitropoliaFier", ("mitropoliafier",)),
    ("berat", "Mitropolia e Beratit · Facebook", "https://www.facebook.com/mitropoliaberatit", ("mitropoliaberatit",)),
    ("elbasan", "Mitropolia e Elbasanit · Facebook", "https://www.facebook.com/mitropolia.elbasan", ("mitropolia.elbasan",)),
    ("tirane", "KOASh · Facebook", "https://www.facebook.com/koash1991/", ("koash1991",)),
    ("radio", "Radio Ngjallja · Facebook", "https://www.facebook.com/RadioNgjallja/", ("radiongjallja",)),
]
LIVE_BASE = "https://nelo1231.github.io/fjala-e-shenjte-live/"
FB_PHOTOS = 10      # fotot për postim
FB_FIRST = 6        # postimet e para për faqe kur s'ka asgjë më parë


def _fb_key(it):
    t = re.sub(r"\W+", " ", str(it.get("title", "")).lower()).strip()
    if len(t) < 18:      # tituj shumë të shkurtër: përfshi edhe fillimin e tekstit
        t += " " + re.sub(r"\W+", " ", str(it.get("text", "")).lower()).strip()[:80]
    return t[:36] + "|" + str(it.get("date", ""))[:10]


_FB_DROPPED = set()


def _fb_dedupe(old_groups, byg):
    """I njëjti postim i ndarë nga dy faqe (p.sh. predikimi te KOASh dhe te Radio Ngjallja) mbetet vetëm një herë:
    mbahet ai më i plotë (tekst + foto); kur tjetri është video, videoja bashkohet te ky («video»)."""
    pool = []
    for gid in byg:
        for it in byg[gid] + [x for x in old_groups.get(gid, {}).get("items", []) if isinstance(x, dict)]:
            if "facebook.com" in str(it.get("link") or ""):
                pool.append((gid, it))
    by = {}
    for gid, it in pool:
        by.setdefault(_fb_key(it), []).append((gid, it))
    drop = set()
    for key, arr in by.items():
        links = {it.get("link") for _, it in arr}
        if len(links) < 2:
            continue
        score = lambda x: len(x[1].get("text") or "") + 300 * len(x[1].get("imgs") or [])
        keep_g, keep = max(arr, key=score)
        for gid, it in arr:
            if it.get("link") == keep.get("link"):
                continue
            if ("/videos/" in str(it.get("link")) or it.get("cat") == "video") and not keep.get("video"):
                keep["video"] = it["link"]
            drop.add(it.get("link"))
    if drop:
        _FB_DROPPED.update(drop)
        for gid in byg:
            byg[gid] = [x for x in byg[gid] if x.get("link") not in drop]
        for g in old_groups.values():
            g["items"] = [x for x in g.get("items", []) if not (isinstance(x, dict) and x.get("link") in drop)]


def _fb_known():
    """postimet e Facebook-ut që janë ruajtur më parë: lidhjet dhe data e më të riut për çdo mitropoli"""
    try:
        doc = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        return set(), {}, ""
    links, newest = set(doc.get("fb_seen") or []), {}
    for g in doc.get("groups", []):
        for it in g.get("items", []):
            if "facebook.com" in str(it.get("link") or ""):
                links.add(it["link"])
                newest[g.get("id")] = max(newest.get(g.get("id"), ""), str(it.get("date") or ""))
    return links, newest, str(doc.get("fb_at") or "")


FB_BUDGET = 4.6     # USD në muaj për gjithë Apify-n (kufiri i llogarisë 5 USD; 0.4 rezervë)
FB_AT = ""          # koha (UTC) e kontrollit të suksesshëm të Facebook-ut, ruhet te mitropolite.json


def _tirane(dt_utc):
    """ora e Shqipërisë (Europe/Tirane), edhe kur sinkronizimi punon në GitHub me orën UTC"""
    import datetime
    try:
        from zoneinfo import ZoneInfo
        return dt_utc.astimezone(ZoneInfo("Europe/Tirane")).replace(tzinfo=None)
    except Exception:
        y = dt_utc.year
        def last_sun(m):
            return max(datetime.datetime(y, m, d, 1, tzinfo=datetime.timezone.utc) for d in range(25, 32) if datetime.date(y, m, d).weekday() == 6)
        off = 2 if last_sun(3) <= dt_utc < last_sun(10) else 1
        return (dt_utc + datetime.timedelta(hours=off)).replace(tzinfo=None)


def _apify_budget(token):
    """Sa lejohet të shpenzohet sot që muaji të mos kalojë FB_BUDGET: (lejohet?, shënim)"""
    import datetime
    import urllib.request
    req = urllib.request.Request("https://api.apify.com/v2/users/me/usage/monthly", headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode("utf-8"))["data"]
    used = float(d.get("totalUsageCreditsUsdAfterVolumeDiscount") or 0)
    now = datetime.datetime.now(datetime.timezone.utc)
    days = d.get("dailyServiceUsages") or []
    today = sum(float(x.get("totalUsageCreditsUsd") or 0) for x in days if str(x.get("date", ""))[:10] == now.strftime("%Y-%m-%d"))
    end = datetime.date.fromisoformat(str(d["usageCycle"]["endAt"])[:10])
    left = max(1, (end - now.date()).days + 1)
    per_day = max(0.0, FB_BUDGET - (used - today)) / left
    return today + 0.02 < per_day, f"{used:.2f}$ këtë muaj · sot {today:.3f}$ nga {per_day:.3f}$ të lejuara"


def _fb_apify_fetch_mitropolite():
    """Postimet publike të faqeve të mitropolive dhe të Radio Ngjallja përmes Apify (APIFY_TOKEN).
    Merren vetëm postimet e reja (Apify paguhet për postim), me tekstin e plotë dhe fotot (WebP te img/mitropolite)."""
    import datetime
    import hashlib
    import io
    import time
    import urllib.request

    global FB_AT
    token = os.environ.get("FS_FB_TOKEN", "").strip() or ("" if os.environ.get("FS_PA_APIFY") else os.environ.get("APIFY_TOKEN", "").strip())
    if not token:
        print("Facebook: pa Apify këtë herë; pjesa tjetër e sinkronizimit vazhdon.")
        return []
    try:
        ok, note = _apify_budget(token)
    except Exception as exc:
        ok, note = False, f"buxheti nuk u lexua ({exc.__class__.__name__})"
    if not ok:
        print(f"Facebook: pritet kontrolli i radhës që të mos kalohet buxheti i Apify ({note}); asnjë postim nuk humbet.")
        return []
    print(f"Facebook: Apify ({note})")

    img_dir = os.path.join(ROOT, "img", "mitropolite")
    os.makedirs(img_dir, exist_ok=True)
    known, newest, fb_at = _fb_known()
    started = datetime.datetime.now(datetime.timezone.utc)

    def save_webp(raw_bytes, dst_path):
        from PIL import Image, ImageOps
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw_bytes))).convert("RGB")
        image.thumbnail((1440, 1440))
        tmp = dst_path + ".tmp"
        quality = 82
        while True:
            image.save(tmp, "WEBP", quality=quality, method=6)
            if os.path.getsize(tmp) < 380_000 or quality <= 50:
                break
            quality -= 8
        os.replace(tmp, dst_path)

    # vetëm të rejat: çdo postim i botuar pas kontrollit të fundit (koha UTC deri në sekondë, 20 minuta mbrapa
    # për sigurinë), që Apify të mos paguhet për postimet që i kemi; një faqe e re merr postimet e 7 ditëve të fundit.
    old_pages = [x for x in FB_PAGES if newest.get(x[0])]
    new_pages = [x for x in FB_PAGES if not newest.get(x[0])]
    if fb_at:
        since = datetime.datetime.fromisoformat(fb_at[:19]) - datetime.timedelta(minutes=20)
    else:
        since = datetime.datetime.fromisoformat(min((newest[x[0]] for x in old_pages), default=started.strftime("%Y-%m-%dT%H:%M:%S"))[:19]) - datetime.timedelta(hours=2)
    batches = []
    if old_pages:
        batches.append({"startUrls": [{"url": x[2]} for x in old_pages], "resultsLimit": 10, "captionText": False,
                        "onlyPostsNewerThan": since.strftime("%Y-%m-%dT%H:%M:%S")})
    if new_pages:
        batches.append({"startUrls": [{"url": x[2]} for x in new_pages], "resultsLimit": FB_FIRST, "captionText": False, "onlyPostsNewerThan": "7 days"})
    raw_items = []
    for payload in batches:
        request = urllib.request.Request(
            "https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?clean=true&format=json",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Authorization": "Bearer " + token},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=280) as response:
            got = json.loads(response.read().decode("utf-8"))
        raw_items += got if isinstance(got, list) else []
    FB_AT = started.strftime("%Y-%m-%dT%H:%M:%S")

    def page_of(item):
        meta = " ".join(str(item.get(k) or "") for k in ("inputUrl", "facebookUrl", "pageName", "url")).lower()
        for gid, label, url, keys in FB_PAGES:
            if str(item.get("inputUrl") or "").lower().rstrip("/") == url.lower().rstrip("/"):
                return gid, label
        for gid, label, url, keys in FB_PAGES:
            if any(k in meta for k in keys):
                return gid, label
        return None, None

    out, seen = [], set()
    for item in raw_items if isinstance(raw_items, list) else []:
        if not isinstance(item, dict) or item.get("error"):
            continue
        link = item.get("url") or item.get("topLevelUrl") or ""
        # shkronjat «zbukuruese» të Facebook-ut (𝕃𝕒𝕜𝕞𝕚𝕒, 𝐀𝐁𝐂…) kthehen në shkronja të zakonshme
        raw_text = unicodedata.normalize("NFKC", str(item.get("text") or item.get("message") or "")).strip()
        if not link or link in seen or link in known:
            continue
        seen.add(link)
        gid, label = page_of(item)
        if not gid:
            continue

        date_value = ""
        ts = item.get("timestamp")
        try:
            if isinstance(ts, (int, float)):
                date_value = _tirane(datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)).isoformat(timespec="seconds")
            elif item.get("time"):
                date_value = _tirane(datetime.datetime.fromisoformat(str(item["time"]).replace("Z", "+00:00"))).isoformat(timespec="seconds")
        except Exception:
            date_value = ""
        if not date_value:
            continue

        post_id = re.sub(r"\W", "", str(item.get("postId") or hashlib.md5(link.encode("utf-8")).hexdigest()[:12]))[:40]
        urls = []
        for m in item.get("media") or []:
            if not isinstance(m, dict):
                continue
            u = (m.get("photo_image") or {}).get("uri") or (m.get("image") or {}).get("uri") or (m.get("thumbnailImage") or {}).get("uri") or m.get("thumbnail")
            if u and u not in urls:
                urls.append(u)
        images = []
        for index, image_url in enumerate(urls[:FB_PHOTOS]):
            relative = f"img/mitropolite/fb_{post_id}_{index}.webp"
            destination = os.path.join(ROOT, relative.replace("/", os.sep))
            try:
                if not os.path.exists(destination):
                    req = urllib.request.Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=35) as image_response:
                        save_webp(image_response.read(), destination)
                    time.sleep(0.2)
                images.append(LIVE_BASE + relative)
            except Exception:
                continue
        if not raw_text and not images:
            continue      # postime pa tekst e pa foto (ndarje të thjeshta) nuk shtohen

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        title = lines[0][:160] if lines else label.split(" · ")[0]
        body = "\n\n".join(lines[1:]) if len(lines) > 1 and len(lines[0]) <= 160 else "" if lines and len(lines[0]) <= 160 else "\n\n".join(lines)
        is_video = any(isinstance(m, dict) and "video" in str(m.get("__typename", "")).lower() for m in item.get("media") or [])
        out.append({
            "id": "fb_m_" + post_id,
            "title": title,
            "text": body,
            "date": date_value,
            "link": link,
            "img": images[0] if images else "",
            "imgs": images,
            "src": "fb",
            "source": label,
            "cat": "video" if is_video else "foto",
            "lang": "sq",
            "_fb": True,
            "target_group": gid,
        })
    return out


VAT = os.path.join(ROOT, "data", "vatikan.json")


def vatikan():
    """Vatican News në shqip (RSS zyrtar publik) → data/vatikan.json; shkrimet mblidhen nga një ditë në tjetrën."""
    import datetime
    old = []
    try:
        old = json.load(open(VAT, encoding="utf-8")).get("items", [])
    except Exception:
        pass
    new = ml.from_rss({"id": "vat", "name": "Vatican News", "url": "https://www.vaticannews.va/sq.rss.xml", "per": 60})
    seen, items = set(), []
    for i in new + old:
        if i["link"] in seen:
            continue
        seen.add(i["link"])
        items.append({"title": i["title"], "ex": i.get("ex", ""), "date": i.get("date", ""), "link": i["link"], "img": i.get("img", ""), "src": "vat", "grp": "vat", "lang": "sq"})
    lim = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=60)).isoformat()
    items = sorted([i for i in items if (i["date"] or "") >= lim], key=lambda x: x["date"], reverse=True)
    doc = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "items": items}
    json.dump(doc, open(VAT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return f"Vatikani {len(new)} të reja / {len(items)} gjithsej"


if __name__ == "__main__":
    print(main())
