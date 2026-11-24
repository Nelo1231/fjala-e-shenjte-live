# -*- coding: utf-8 -*-
"""Ikonat e ditës, vetë, në GitHub (pa laptop): e nis .github/workflows/ikonat.yml sipas orarit.

1. Merr postimet e fundit të @_saintsoforthodoxy me Apify (sekreti APIFY_TOKEN te GitHub → Settings → Secrets).
2. Çdo foto e re → img/apostujt/ig_<data>_UTC[_n].webp (i njëjti emër dhe kompresim si sinkronizimi në laptop).
3. Çdo ikonë lidhet me ditën (ora e Shqipërisë), me shenjtorin e Sinaksarit dhe shënimin e Kalendarit,
   dhe shtohet te data/imazhet_MM.json, që aplikacioni e lexon drejt nga faqja.
Sinkronizimi në laptop (tools/auto_sinkronizo.py) i tërheq këto ikona dhe nuk i fshin.

Provë lokale pa e prekur depon: py -X utf8 cloud/ikonat.py --dosja <kopje e depos>"""
import datetime
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.abspath(sys.argv[sys.argv.index("--dosja") + 1]) if "--dosja" in sys.argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, "img", "apostujt")
DATA = os.path.join(ROOT, "data")
STATE = os.path.join(ROOT, "cloud", "gjendja_ikonat.json")
PROFILES = ["_saintsoforthodoxy"]
TOKEN = os.environ.get("APIFY_TOKEN", "").strip()
UA = {"User-Agent": "Mozilla/5.0 (FjalaEShenjte; GitHub Actions)"}


def say(msg):
    print(msg.replace(TOKEN, "***") if TOKEN else msg, flush=True)


# ---------- ora e Shqipërisë (CET/CEST) ----------
def _last_sunday_utc(y, month):
    d = datetime.datetime(y, month, 31, 1, 0)
    return d - datetime.timedelta(days=(d.weekday() + 1) % 7)


def albania(utc):
    summer = _last_sunday_utc(utc.year, 3) <= utc < _last_sunday_utc(utc.year, 10)
    return utc + datetime.timedelta(hours=2 if summer else 1)


def post_day(fname):
    m = re.search(r"(20\d\d)-(\d\d)-(\d\d)_(\d\d)-(\d\d)-(\d\d)_UTC", fname)
    return albania(datetime.datetime(*map(int, m.groups()))).date() if m else None


# ---------- Sinaksari dhe Kalendari (nga data/*.js e faqes) ----------
def load_js(name):
    p = os.path.join(DATA, name + ".js")
    if not os.path.exists(p):
        return None
    s = open(p, encoding="utf-8").read()
    i = s.index("]=", s.index("FS_DATA[")) + 2
    return json.loads(s[i:s.rindex("}") + 1])


_sx = {}


def saint_name(mm, dd):
    if mm not in _sx:
        try:
            _sx[mm] = load_js(f"sinaksari_{mm:02d}")
        except Exception:
            _sx[mm] = None
    day = next((x for x in (_sx[mm] or {}).get("days", []) if x.get("d") == dd), None)
    for b in (day or {}).get("blocks", []):
        x = (b.get("x") or "").strip()
        if b.get("t") in ("intro", "li") and x and not x.startswith("Muaji "):
            x = re.sub(r"^Më \d+ të këtij muaji,\s*", "", x)
            x = re.sub(r"^(nderojmë|kremtojmë|kujtojmë)\s+", "", x, flags=re.I)
            x = re.sub(r"^(gjithë sot,\s*)?(kujtimin e|kujtojmë)\s+", "", x, flags=re.I)
            x = re.split(r"(?<=[a-zëç\)])\.\s|;\s|, (?:i cili|e cila|të cilët|që) ", x)[0].rstrip(".")
            return (x[:1].upper() + x[1:])[:140]
    return ""


_kal = []


def calendar_note(mm, dd):
    if not _kal:
        try:
            _kal.append(load_js("kalendari") or {})
        except Exception:
            _kal.append({})
    for ym, days in (_kal[0].get("dite") or {}).items():
        if int(ym.split("-")[1]) == mm:
            for x in days:
                if x.get("d") == dd:
                    return x.get("x", "")
    return ""


# ---------- WebP si në laptop ----------
def to_webp(raw, dst):
    from PIL import Image, ImageFilter, ImageOps
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    w, h = im.size
    k = min(1, 900 / min(w, h), 1600 / max(w, h))
    if k < 1:
        im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=0.8, percent=55, threshold=2))
    tmp = dst + ".tmp"
    for q in (66, 62, 58, 54):
        im.save(tmp, "WEBP", quality=q, method=6)
        if os.path.getsize(tmp) <= 230 * 1024:
            break
    os.replace(tmp, dst)


def get(url, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers=dict(UA, **({"Content-Type": "application/json"} if data else {})), method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


# ---------- 1) postimet e reja ----------
def fetch(state, captions):
    if not TOKEN:
        say(("::warning::" if os.environ.get("GITHUB_ACTIONS") else "") + "Mungon sekreti APIFY_TOKEN (GitHub → Settings → Secrets and variables → Actions). Vetëm kontrolli i listës.")
        return 0
    n = 0
    for prof in PROFILES:
        url = "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=" + urllib.parse.quote(TOKEN)
        body = json.dumps({"directUrls": [f"https://www.instagram.com/{prof}/"], "resultsType": "posts", "resultsLimit": 5}).encode()
        try:
            items = json.loads(get(url, body, timeout=300))
        except Exception as e:
            say(f"Apify @{prof}: {e.__class__.__name__} {getattr(e, 'code', '')}")
            continue
        last = state.get(prof, "")
        for it in sorted((x for x in items if x.get("timestamp")), key=lambda x: x["timestamp"]):
            ts = datetime.datetime.fromisoformat(it["timestamp"].replace("Z", "+00:00")).astimezone(datetime.timezone.utc).replace(tzinfo=None)
            iso = ts.isoformat()
            if last and iso <= last:
                continue
            imgs = it.get("images") or ([it["displayUrl"]] if it.get("displayUrl") else [])
            stamp = ts.strftime("%Y-%m-%d_%H-%M-%S_UTC")
            for i, u in enumerate(imgs, 1):
                f = f"ig_{stamp}{'_' + str(i) if len(imgs) > 1 else ''}.webp"
                p = os.path.join(DST, f)
                if os.path.exists(p):
                    continue
                try:
                    to_webp(get(u, timeout=90), p)
                    n += 1
                    say(f"  + {f}")
                except Exception as e:
                    say(f"  ! {f}: {e.__class__.__name__}")
                cap = (it.get("caption") or "").strip()
                if cap:
                    captions["img/apostujt/" + f] = cap[:2000]
            state[prof] = max(state.get(prof, ""), iso)
    return n


# ---------- 2) çdo ikonë në listën e muajit të saj ----------
def reconcile(captions):
    changed = set()
    months = {}
    for m in range(1, 13):
        p = os.path.join(DATA, f"imazhet_{m:02d}.json")
        months[m] = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {"month": m, "images": []}
    have = {im.get("file") for d in months.values() for im in d.get("images", [])}
    for f in sorted(os.listdir(DST)) if os.path.isdir(DST) else []:
        if not (f.startswith("ig_") and f.endswith(".webp")):
            continue
        rel = "img/apostujt/" + f
        day = post_day(f)
        if rel in have or not day:
            continue
        saint = saint_name(day.month, day.day)
        im = {"file": rel, "cat": "apostujt", "date": day.strftime("%m-%d"), "dita": day.isoformat(), "sinaksari": True,
              "shenjtori": saint, "title": saint or "Ikona e ditës", "kalendari": calendar_note(day.month, day.day),
              "author": "", "license": "", "source": ""}
        if captions.get(rel):
            im["pershkrimi"] = captions[rel]
        months[day.month]["images"].append(im)
        changed.add(day.month)
    for m in changed:
        d = months[m]
        d["images"].sort(key=lambda x: (x.get("dita") or "", x.get("file") or ""))
        json.dump(d, open(os.path.join(DATA, f"imazhet_{m:02d}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return sum(1 for _ in changed)


def main():
    os.makedirs(DST, exist_ok=True)
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    state = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {}
    captions = {}
    # orari niset shpesh (GitHub-i i hedh disa nisje): Apify-ja vetëm një herë në 5 orë, që buxheti të mjaftojë
    try:
        last = datetime.datetime.fromisoformat(state.get("kontrolli", "").replace("Z", "+00:00"))
        age = (datetime.datetime.now(datetime.timezone.utc) - last).total_seconds() / 3600
    except ValueError:
        age = 99
    if os.environ.get("GITHUB_EVENT_NAME") == "schedule" and age < 5:
        say(f"Kontrolli i fundit {age:.1f} orë më parë; Apify-ja pushon deri në 5 orë.")
        m = reconcile(captions)
        say(f"Ikonat: 0 foto të reja · {m} muaj të përditësuar")
        return
    n = fetch(state, captions)
    m = reconcile(captions)
    if TOKEN:
        state["kontrolli"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        json.dump(state, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    say(f"Ikonat: {n} foto të reja · {m} muaj të përditësuar")


if __name__ == "__main__":
    main()
