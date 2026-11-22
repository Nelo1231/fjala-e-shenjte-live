r"""Tekstet liturgjike të KOASH (me leje): PDF-të e kategorisë «Tekste liturgjike» → tekst i strukturuar
(tituj, rubrika me të kuq, tekst) → data\liturgjike.json (+ .js), që aplikacioni t'i hapë me faqosjen e vet.

Tipiket mujore të viteve të kaluara anashkalohen (aplikacioni ka Tipikonë e vet të ditës).
Përdorimi:  py -X utf8 tools\merr_liturgjike.py"""
import json, os, re, sys, tempfile, html
import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import merr_lajmet as ml

SITE = "https://orthodoxalbania.org/2026/"
OUT = os.path.join(ml.ROOT, "data", "liturgjike.json")
SKIP = re.compile(r"^(Janar|Shkurt|Mars|Prill|Maj|Qershor|Korrik|Gusht|Shtator|Tetor|Nëntor|Dhjetor)\s+20\d\d$", re.I)


def blocks(pdf_bytes):
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    sizes = []
    for pg in doc:
        for b in pg.get_text("dict")["blocks"]:
            for ln in b.get("lines", []):
                for sp in ln["spans"]:
                    if sp["text"].strip():
                        sizes.append(round(sp["size"]))
    if not sizes:
        return []
    body = max(set(sizes), key=sizes.count)
    out = []
    for pg in doc:
        for b in pg.get_text("dict")["blocks"]:
            txt, big, red, n = [], 0, 0, 0
            for ln in b.get("lines", []):
                line = "".join(sp["text"] for sp in ln["spans"])
                txt.append(line)
                for sp in ln["spans"]:
                    k = len(sp["text"].strip())
                    if not k:
                        continue
                    n += k
                    if sp["size"] >= body + 2:
                        big += k
                    c = sp["color"]; r, g, bl = c >> 16 & 255, c >> 8 & 255, c & 255
                    if r > 150 and g < 110 and bl < 110:
                        red += k
            t = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", "\n".join(txt))
            t = re.sub(r"\s*\n\s*", " ", t).strip()
            t = re.sub(r"\s{2,}", " ", t)
            # gabimet e sigurta të skanimit (OCR): «l» e lexuar si «I» brenda fjalës ose pas një fjale me shkronja
            # të vogla («HyjIindese», «t'i Iutemi»), «O» e lexuar si zero («0 Zot»)
            t = re.sub(r"(?<=[a-zëç])I(?=[a-zëç])", "l", t)
            t = re.sub(r"(?<=[a-zëç,'’] )I(?=[a-zëç])", "l", t)
            t = re.sub(r"(?<=[a-zëç]')I(?=[a-zëç])", "l", t)
            t = re.sub(r"(?<![\d.,])\b0\b(?![\d.,])", "O", t)
            if not t or re.fullmatch(r"\d{1,3}", t):
                continue
            kind = "h" if n and big / n > 0.6 and len(t) < 140 else "r" if n and red / n > 0.6 else "p"
            if out and kind == "p" and out[-1][0] == "p" and not re.search(r"[.!?:;»”]$", out[-1][1]):
                out[-1][1] += " " + t                                   # paragraf i thyer nga faqja
            else:
                out.append([kind, t])
    return out


def main():
    cat = json.loads(ml.get(SITE + "wp-json/wp/v2/categories?slug=tekste-liturgjike&_fields=id"))[0]["id"]
    posts = json.loads(ml.get(SITE + f"wp-json/wp/v2/posts?categories={cat}&per_page=100&_fields=id,date,title,content"))
    items = []
    for p in posts:
        title = html.unescape(re.sub(r"<[^>]+>", "", p["title"]["rendered"])).strip()
        if SKIP.match(title):
            continue
        m = re.search(r'href="([^"]+\.pdf)"', p["content"]["rendered"], re.I)
        if not m:
            continue
        url = m.group(1)
        try:
            data = ml.get(url, raw=True) if "raw" in ml.get.__code__.co_varnames else None
        except Exception:
            data = None
        if data is None:
            import urllib.request
            data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; FjalaEShenjte/1.0)"}), timeout=90).read()
        try:
            bl = blocks(data)
        except Exception as e:
            print("  ✗", title, e); continue
        if sum(len(x[1]) for x in bl) < 300:
            print("  – pa tekst (skanim):", title); continue
        items.append({"id": p["id"], "t": title, "d": p["date"][:10], "src": url, "b": bl})
        print("  ✓", title, len(bl), "blloqe")
    doc = {"updated": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(timespec="seconds"),
           "source": "Kisha Orthodhokse Autoqefale e Shqipërisë · orthodoxalbania.org", "items": items}
    js = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    open(OUT, "w", encoding="utf-8").write(js)
    open(OUT[:-5] + ".js", "w", encoding="utf-8").write('window.FS_DATA=window.FS_DATA||{};FS_DATA["liturgjike"]=' + js + ";\n")
    print(f"Tekste liturgjike: {len(items)} · {len(js) // 1024} KB")


if __name__ == "__main__":
    main()
