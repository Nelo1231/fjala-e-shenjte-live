# -*- coding: utf-8 -*-
r"""Transmetimet live të shërbesave nga kanali publik YouTube i Radio Ngjallja (@radiongjallja).

Lexon RSS-në zyrtare publike të kanalit (pa API, pa çelës) dhe ruan videot me titullin dhe datën ASHTU SIÇ JANË.
Shërbesat (Mbrëmësorja, Mëngjesorja, Liturgjia, Paraklisi, Vigjilja…) shënohen veçmas, që aplikacioni t'i tregojë
te «Shërbesat live». Dalja: data/transmetimet.json (+ .js). Aplikacioni i luan brenda vetes me lojtësin zyrtar të YouTube."""
import datetime, json, os, re, urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "transmetimet.json")
OUT_JS = os.path.join(ROOT, "data", "transmetimet.js")
CHANNEL = "UC-n9jGnbmgnKNGBUsjo_LGA"          # Radio Ngjallja · youtube.com/@radiongjallja
RSS = "https://www.youtube.com/feeds/videos.xml?channel_id=" + CHANNEL
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}
SERVICE = re.compile(r"shërbes|liturgji|mbrëmësor|mëngjesor|paraklis|vigjilj|akathist|pasdark|drejtpërdrejt|live\b", re.I)
KEEP = 120                                      # sa video mbahen në arkiv (të rejat + të mëparshmet)


def fetch():
    req = urllib.request.Request(RSS, headers={"User-Agent": "FjalaEShenjte-RSS/1.0"})
    root = ET.fromstring(urllib.request.urlopen(req, timeout=30).read())
    out = []
    for e in root.findall("a:entry", NS):
        vid = (e.findtext("yt:videoId", "", NS) or "").strip()
        title = (e.findtext("a:title", "", NS) or "").strip()
        if not vid or not title:
            continue
        out.append({"id": vid, "title": title, "date": (e.findtext("a:published", "", NS) or "").strip(),
                    "svc": bool(SERVICE.search(title))})
    return out


def main():
    try:
        with open(OUT, encoding="utf-8") as f:
            old = json.load(f).get("videos", [])
    except (OSError, ValueError, AttributeError):
        old = []
    try:
        new = fetch()
    except Exception as exc:
        return f"Transmetimet: RSS nuk u lexua ({exc.__class__.__name__}); u ruajt arkivi"
    seen, videos = set(), []
    for v in new + old:                          # të rejat së pari; arkivi i mban edhe ato që dalin nga RSS-ja
        if v.get("id") and v["id"] not in seen:
            seen.add(v["id"])
            videos.append(v)
    videos.sort(key=lambda v: v.get("date") or "", reverse=True)
    doc = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
           "channel": CHANNEL, "videos": videos[:KEEP]}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, OUT)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("window.FS_DATA=window.FS_DATA||{};window.FS_DATA.transmetimet=" + json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return f"Transmetimet: {sum(1 for v in videos[:KEEP] if v['svc'])} shërbesa · {len(videos[:KEEP])} video"


if __name__ == "__main__":
    print(main())
