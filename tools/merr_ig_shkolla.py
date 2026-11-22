# -*- coding: utf-8 -*-
r"""Postimet e Facebook-ut të Shkollës së Artit Psaltik (shkollaeartitpsaltik.al), me Apify."""
import datetime, hashlib, io, json, os, time, urllib.request

FB_URL = "https://www.facebook.com/shkollaeartitpsaltik.al"
APIFY_TOKEN = __import__("os").environ.get("APIFY_TOKEN", "")
SINCE = datetime.datetime(2026, 1, 1)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img", "shkolla")
UA = "Mozilla/5.0 (FjalaEShenjte)"


def _webp(raw, dst):
    from PIL import Image, ImageOps
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    im.thumbnail((1440, 1440))
    q = 82
    while True:
        im.save(dst, "WEBP", quality=q, method=6)
        if os.path.getsize(dst) < 380_000 or q <= 50:
            break
        q -= 8


def _save(url, rel):
    dst = os.path.join(ROOT, rel.replace("/", os.sep))
    if not os.path.exists(dst):
        raw = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40).read()
        _webp(raw, dst)
        time.sleep(0.3)
    return rel


def _split(cap):
    lines = [l.strip() for l in (cap or "").splitlines() if l.strip()]
    if not lines:
        return "", ""
    first = lines[0]
    if len(first) > 110:
        import re
        m = re.match(r"(.{20,110}?[.!?»])\s", first)
        if m:
            return m.group(1), "\n".join([first[len(m.group(1)):].strip()] + lines[1:]).strip()
    return first, "\n".join(lines[1:])


def _parse_time(it):
    t = it.get("time")
    if isinstance(t, str) and t:
        try:
            return datetime.datetime.fromisoformat(t.replace("Z", "+00:00")).astimezone().replace(tzinfo=None)
        except Exception:
            pass
    ts = it.get("timestamp")
    if isinstance(ts, (int, float)) and ts > 0:
        return datetime.datetime.fromtimestamp(ts)
    return None


def _extract_imgs(it):
    urls = []
    for m in (it.get("media") or []):
        if not isinstance(m, dict):
            continue
        u = (
            (m.get("photo_image") or {}).get("uri")
            or (m.get("image") or {}).get("uri")
            or m.get("thumbnail")
        )
        if u and u not in urls:
            urls.append(u)
    return urls


def fetch(known_links=(), oldest_known=""):
    os.makedirs(IMG, exist_ok=True)
    limit = 20 if not known_links else 8
    url = f"https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?token={APIFY_TOKEN}"
    payload = json.dumps({
        "startUrls": [{"url": FB_URL}],
        "resultsLimit": limit
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=180) as resp:
        items = json.loads(resp.read().decode("utf-8"))

    known, posts = set(known_links), []
    for it in items:
        when = _parse_time(it)
        link = it.get("url") or it.get("topLevelUrl") or ""
        if not when or not link or when < SINCE or link in known:
            continue

        pid = str(it.get("postId") or hashlib.md5(link.encode("utf-8")).hexdigest()[:12])
        urls = _extract_imgs(it)
        imgs = []
        for k, u in enumerate(urls[:20]):
            try:
                imgs.append(_save(u, f"img/shkolla/fb_{pid}_{k}.webp"))
            except Exception:
                pass

        t, body = _split(it.get("text") or "")
        is_video = bool(it.get("isVideo") or any(
            isinstance(m, dict) and "video" in str(m.get("__typename", "")).lower()
            for m in (it.get("media") or [])
        ))
        posts.append({
            "id": "fb_" + pid,
            "title": t,
            "text": body,
            "date": when.isoformat(timespec="seconds"),
            "link": link,
            "img": imgs[0] if imgs else "",
            "imgs": imgs,
            "video": is_video,
            "src": "Facebook · Shkolla"
        })

    return posts, None


if __name__ == "__main__":
    ps, sts = fetch()
    print(len(ps), "postime nga Facebook")
    for x in ps[:5]:
        print(" ", x["date"][:10], x["title"][:70], len(x["imgs"]), "foto")

