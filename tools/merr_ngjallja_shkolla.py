# -*- coding: utf-8 -*-
r"""Lajmet e Radio Ngjallja për Shkollën e Muzikës Bizantine (kanali publik YouTube @radiongjallja).

Kërkon te kanali emisionet për shkollën, Korin «Shën Joan Kukuzeli» dhe drejtorin e saj, z. Theodhor Peci;
merr titullin dhe përshkrimin ASHTU SIÇ JANË (pa shtuar tekst), datën e saktë të publikimit dhe mban vetëm ato nga
1 janari 2026. Përdoret nga merr_shkollen.py → data/shkolla.json ("radio")."""
import html, json, re, time, urllib.parse, urllib.request

CH = "https://www.youtube.com/@radiongjallja/search?query="
QUERIES = ("Peci", "muzikës bizantine", "Kukuzeli", "Shkolla e Muzikës", "kori bizantin")
KEEP = re.compile(r"peci|shkoll\w*\s+(?:e|së)\s+muzik|muzik\w*\s+bizantin|kor\w*\s+(?:bizantin|i psalt)|kukuzel", re.I)
SINCE = "2026-01-01"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "sq-AL,sq;q=0.9"}


def _get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read().decode("utf-8", "replace")


def _unjs(s):
    return json.loads('"' + s + '"')


def search():
    seen, out = set(), []
    for q in QUERIES:
        h = _get(CH + urllib.parse.quote(q))
        for vid, title, when in re.findall(r'"videoRenderer":\{"videoId":"([\w-]{11})".*?"title":\{"runs":\[\{"text":"(.*?)"\}.*?"publishedTimeText":\{"simpleText":"(.*?)"\}', h):
            if vid in seen:
                continue
            seen.add(vid)
            title = _unjs(title)
            # vetëm emisionet e kohëve të fundit (ditë / javë / muaj; jo «vit»)
            if KEEP.search(title) and re.search(r"(sekond|minut|or[eë]|dit[eë]|jav[eë]|muaj)", when):
                out.append((vid, title))
        time.sleep(0.8)
    return out


def details(vid):
    h = _get("https://www.youtube.com/watch?v=" + vid)
    m = re.search(r'"uploadDate":"([^"]+)"', h) or re.search(r'itemprop="datePublished" content="([^"]+)"', h)
    d = re.search(r'"shortDescription":"((?:[^"\\]|\\.)*)"', h)
    v = re.search(r'"viewCount":"(\d+)"', h)
    return (m.group(1) if m else ""), (_unjs(d.group(1)) if d else ""), (int(v.group(1)) if v else 0)


def cover(vid):
    """kopertina e plotë e videos (16:9, pa vijat e zeza të hqdefault)."""
    for q in ("maxresdefault", "mqdefault"):
        u = f"https://i.ytimg.com/vi/{vid}/{q}.jpg"
        try:
            if urllib.request.urlopen(urllib.request.Request(u, method="HEAD"), timeout=15).status == 200:
                return u
        except Exception:
            pass
    return f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg"


def fetch(known=None):
    known = known or {}
    items = []
    for vid, title in search():
        if vid in known:                                   # e kemi: vetëm rifresko shikimet herë pas here
            items.append(known[vid])
            continue
        try:
            date, desc, views = details(vid)
        except Exception:
            continue
        time.sleep(0.6)
        if date[:10] < SINCE:
            continue
        items.append({"id": vid, "title": html.unescape(title), "text": desc.strip(), "date": date, "views": views,
                      "img": cover(vid), "link": f"https://www.youtube.com/watch?v={vid}", "src": "Radio Ngjallja"})
    items.sort(key=lambda x: x["date"], reverse=True)
    return items


if __name__ == "__main__":
    r = fetch()
    print(len(r), "lajme nga Radio Ngjallja")
    for x in r:
        print(" ", x["date"][:10], x["views"], x["title"][:90])
