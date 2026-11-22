# Merr listën e librave të shërbesave (flipbook dFlip me PDF) nga faqja zyrtare e KOASh:
# https://orthodoxalbania.org/2026/tekste-liturgjike/  →  data/flipbooks.json (+ data/flipbooks.js)
# PDF-të ruhen te pdf/<viti>/<muaji>/<emri>.pdf (me lejen e Kishës), që lexuesi ynë t'i hapë edhe në web/iPhone:
# faqja e Kishës nuk lejon leximin e tyre nga faqe të tjera (CORS). Shkarkohen vetëm ato që mungojnë.
import json, os, re, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser

BASE = "https://orthodoxalbania.org/2026/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(ROOT, "pdf")
UA = {"User-Agent": "Mozilla/5.0 (FjalaEShenjte; lexues)"}
SKIP = re.compile(r"Shpjegime|Tekste & Shpjegime")
DAYS = {"e-hena": "E Hëna e Madhe", "e-marta": "E Marta e Madhe", "e-merkura": "E Mërkura e Madhe", "e-enjtja": "E Enjtja e Madhe",
        "e-premtja": "E Premtja e Madhe", "e-shtuna": "E Shtuna e Madhe", "e-diela-e-madhe": "E Diela e Pashkës", "e-diela-e-pashkes": "E Diela e Pashkës"}


def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read().decode("utf-8", "replace")


class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.sec = ""; s.items = []; s.h = None; s.a = None; s.txt = ""; s.inart = 0

    def handle_starttag(s, t, at):
        if t == "article": s.inart += 1
        if not s.inart: return
        if re.fullmatch(r"h[1-4]", t): s.h = t; s.txt = ""
        elif t == "a": s.a = dict(at).get("href"); s.txt = ""

    def handle_endtag(s, t):
        if t == "article": s.inart -= 1
        if s.h and t == s.h: s.sec = s.txt.strip(); s.h = None
        elif t == "a" and s.a:
            if s.txt.strip() and not SKIP.search(s.sec): s.items.append({"s": s.sec, "t": re.sub(r"\s+", " ", s.txt).strip().rstrip("."), "u": s.a})
            s.a = None

    def handle_data(s, d):
        if s.h or s.a: s.txt += d


def pdf_of(it):
    try:
        h = get(it["u"])
        m = re.search(r'"source":"(https:[^"]+?\.pdf)"', h)
        if m: it["pdf"] = json.loads('"' + m.group(1) + '"')
    except Exception as e:
        print("gabim", it["u"], e, file=sys.stderr)
    return it

def save_pdf(rel):
    """një PDF i Kishës → pdf/<rel>; kthen True kur u shkarkua tani"""
    dst = os.path.join(PDF_DIR, *rel.split("/"))
    if os.path.exists(dst) and os.path.getsize(dst) > 1000:
        return False
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    u = BASE + "wp-content/uploads/" + urllib.parse.quote(rel)
    b = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=180).read()
    if not b.startswith(b"%PDF"):
        raise RuntimeError("s'është PDF: " + rel)
    open(dst + ".part", "wb").write(b)
    os.replace(dst + ".part", dst)
    return True


def main():
    p = P(); p.feed(get(BASE + "tekste-liturgjike/"))
    with ThreadPoolExecutor(4) as ex: items = list(ex.map(pdf_of, p.items))
    secs, seen = {}, set()
    for it in items:
        if not it.get("pdf") or it["u"] in seen: continue
        if any(BASE + "wp-content/uploads/" + x["pdf"] == it["pdf"] for v in secs.values() for x in v): continue   # i njëjti libër vetëm një herë
        seen.add(it["u"])
        slug = it["u"].rstrip("/").split("/")[-1]
        t = it["t"]
        if t in ("Mëngjesorja", "Mbrëmësorja", "Orët e Mëdha", "Pasdarka", "Liturgjia Hyjnore e Joan Gojartit"):
            day = next((v for k, v in DAYS.items() if slug.startswith(k)), "")
            if day: t = f"{day} · {t}"
        secs.setdefault(it["s"], []).append({"t": t, "u": it["u"].replace(BASE, ""), "pdf": it["pdf"].replace(BASE + "wp-content/uploads/", "")})
    out = {"src": BASE + "tekste-liturgjike/", "sections": [{"title": k, "items": v} for k, v in secs.items()]}
    js = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(ROOT, "data", "flipbooks.json"), "w", encoding="utf-8").write(js)
    open(os.path.join(ROOT, "data", "flipbooks.js"), "w", encoding="utf-8").write('window.FS_DATA=window.FS_DATA||{};FS_DATA["flipbooks"]=' + js + ";")
    print(sum(len(v) for v in secs.values()), "libra në", len(secs), "seksione")
    rels = sorted({b["pdf"] for v in secs.values() for b in v})
    def one(r):
        try:
            return save_pdf(r)
        except Exception as e:
            print("gabim PDF", r, e, file=sys.stderr)
            return None
    with ThreadPoolExecutor(4) as ex:
        res = list(ex.map(one, rels))
    print("PDF:", res.count(True), "të reja ·", res.count(None), "gabime ·", len(rels), "gjithsej te pdf/")


if __name__ == "__main__":
    main()
