# -*- coding: utf-8 -*-
r"""Kinemaja: katalogu i filmave dhe serive → data/kinema.json (+ .js).

Tre burime, asgjë e shpikur:
  1) data/kinema_autori.json — filmat / seritë që shton autori (nga paneli i Kinemasë në aplikacion: «Eksporto»).
  2) tools/kinema_katalogu.json — filma, seri e dokumentarë nga kanale zyrtare dhe domeni publik, me shumë serverë
     (shih tools/kinema_burimet.py: çdo burim verifikohet, përshkrimet përkthehen, titrat bëhen shqip).
  3) Listat publike të kanalit YouTube të Radio Ngjallja (@radiongjallja) që janë dokumentarë, histori ose jetë
     shenjtorësh: secila listë bëhet një seri; episodet merren me titullin, kohëzgjatjen dhe datën ASHTU SIÇ JANË.
Aplikacioni i luan brenda vetes me lojtësin zyrtar të YouTube (ose burimin e drejtpërdrejtë që jep autori)."""
import datetime, json, os, re, urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "kinema.json")
OUT_JS = os.path.join(ROOT, "data", "kinema.js")
AUTHOR = os.path.join(ROOT, "data", "kinema_autori.json")
CHANNEL_PL = "https://www.youtube.com/@radiongjallja/playlists"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "sq-AL,sq;q=0.9"}
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}
# vetëm listat që janë kinema (dokumentarë, histori, jetë shenjtorësh) — jo ligjëratat, podkastet apo katekizmi
CATS = [
    (re.compile(r"persekutim|martir|dëshmor|regjimit komunist", re.I), "Histori e Kishës, Martirë & Dramë Shpirtërore"),
    (re.compile(r"film dokumentar|dokumentar|ndërtime|restaurime|manastir|mali i shenjtë|athos|art dhe kulturë kishtare", re.I), "Dokumentarë Orthodhoksë & Trashëgimi"),
    (re.compile(r"^shën\b|^shenjt|jeta e shën|saints of the orthodox", re.I), "Jetë Shenjtorësh & Kinema Orthodhokse"),
]


def _get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read().decode("utf-8", "replace")


def _unjs(s):
    try:
        return json.loads('"' + s + '"')
    except ValueError:
        return s


def playlists():
    """[(id, titulli)] nga faqja publike e listave të kanalit."""
    h = _get(CHANNEL_PL)
    out, seen = [], set()
    for seg in h.split('"lockupViewModel":')[1:]:
        m_id = re.search(r'"contentId":"(PL[\w-]+)"', seg)
        m_t = re.search(r'"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"', seg)
        if m_id and m_t and m_id.group(1) not in seen:
            seen.add(m_id.group(1))
            out.append((m_id.group(1), _unjs(m_t.group(1)).strip()))
    return out


def episodes(pl):
    """Episodet e listës: id, titulli, kohëzgjatja (nga faqja), data (nga RSS-ja, kur e jep)."""
    h = _get("https://www.youtube.com/playlist?list=" + pl)
    eps, seen = [], set()
    # faqja e listës: «lockupViewModel» (forma e re) ose «playlistVideoRenderer» (forma e vjetër)
    segs = [("n", s) for s in h.split('"lockupViewModel":')[1:]] + [("o", s) for s in h.split('"playlistVideoRenderer":')[1:]]
    for kind, seg in segs:
        if kind == "n":
            if '"contentType":"LOCKUP_CONTENT_TYPE_VIDEO"' not in seg:
                continue
            m_id = re.search(r'"contentId":"([\w-]{11})"', seg)
            m_t = re.search(r'"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"', seg)
            m_l = re.search(r'"text":"(\d+:\d\d(?::\d\d)?)"', seg)
        else:
            m_id = re.search(r'^\{"videoId":"([\w-]{11})"', seg)
            m_t = re.search(r'"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"', seg)
            m_l = re.search(r'"lengthText":\{"accessibility":\{[^}]*\}\},"simpleText":"([\d:]+)"', seg) or re.search(r'"lengthSeconds":"(\d+)"', seg)
        if not m_id or not m_t or m_id.group(1) in seen:
            continue
        seen.add(m_id.group(1))
        dur = ""
        if m_l:
            v = m_l.group(1)
            if ":" in v:
                parts = [int(x) for x in v.split(":")]
                secs = sum(p * 60 ** i for i, p in enumerate(reversed(parts)))
            else:
                secs = int(v)
            dur = max(1, round(secs / 60))
        eps.append({"id": m_id.group(1), "titulli": _unjs(m_t.group(1)).strip(), "kohezgjatja": dur})
    dates = {}
    try:
        root = ET.fromstring(urllib.request.urlopen(urllib.request.Request("https://www.youtube.com/feeds/videos.xml?playlist_id=" + pl, headers={"User-Agent": "FjalaEShenjte-RSS/1.0"}), timeout=30).read())
        for e in root.findall("a:entry", NS):
            dates[e.findtext("yt:videoId", "", NS)] = (e.findtext("a:published", "", NS) or "")[:10]
    except Exception:
        pass
    return [dict(x, nr=i + 1, dataShtimit=dates.get(x["id"], ""), burimi={"lloji": "youtube", "url": "https://www.youtube.com/watch?v=" + x["id"]}) for i, x in enumerate(eps)]


def main():
    try:
        with open(OUT, encoding="utf-8") as f:
            old = {x.get("id"): x for x in json.load(f).get("items", [])}
    except (OSError, ValueError, AttributeError):
        old = {}
    items = []
    try:
        with open(AUTHOR, encoding="utf-8") as f:
            items.extend(x for x in json.load(f).get("items", []) if x.get("id") and x.get("titulli"))
    except (OSError, ValueError, AttributeError):
        pass
    # katalogu i kuruar: shumë serverë, burime të verifikuara
    kat = 0
    try:
        import kinema_burimet
        have = {x.get("id") for x in items}
        for x in kinema_burimet.build(old, episodes):
            if x.get("id") not in have:
                items.append(x)
                kat += 1
    except Exception as exc:
        print("Katalogu i kuruar nuk u ndërtua:", exc.__class__.__name__, exc)
        items.extend(v for k, v in old.items() if not str(k).startswith("yt-") and k not in {x.get("id") for x in items} and v.get("burimet"))
    yt = 0
    try:
        for pl, title in playlists():
            cat = next((c for rx, c in CATS if rx.search(title)), None)
            if not cat:
                continue
            try:
                eps = episodes(pl)
            except Exception:
                prev = old.get("yt-" + pl)
                if prev:
                    items.append(prev)
                continue
            if not eps:
                continue
            prev = old.get("yt-" + pl) or {}
            known = {e["id"]: e for e in prev.get("episodet", [])}
            today = datetime.date.today().isoformat()
            for e in eps:                                   # episodi që s'ishte më parë merr datën e sotme si datë shtimi
                if not e.get("dataShtimit"):
                    e["dataShtimit"] = (known.get(e["id"]) or {}).get("dataShtimit") or today
            items.append({
                "id": "yt-" + pl, "titulli": title, "tipi": "seri", "kategoria": cat, "statusi": "i disponueshëm",
                "dataShtimit": prev.get("dataShtimit") or today, "pershkrimi": "", "burimiEmri": "Radio Ngjallja · YouTube",
                "posteri": "https://i.ytimg.com/vi/" + eps[0]["id"] + "/hqdefault.jpg",
                "lista": "https://www.youtube.com/playlist?list=" + pl, "episodet": eps,
            })
            yt += 1
    except Exception as exc:
        print("Listat e YouTube nuk u lexuan:", exc.__class__.__name__)
        items.extend(v for k, v in old.items() if str(k).startswith("yt-") and k not in {x.get("id") for x in items})
    doc = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "items": items}
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, OUT)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("window.FS_DATA=window.FS_DATA||{};window.FS_DATA.kinema=" + json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return f"Kinemaja: {len(items)} tituj ({kat} nga katalogu me shumë serverë, {yt} seri nga Radio Ngjallja)"


if __name__ == "__main__":
    print(main())
