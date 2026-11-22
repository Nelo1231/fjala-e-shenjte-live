r"""Arkivi i revistës «Kërkim» (KOASH, me leje): indeksi + teksti i plotë i artikujve → data\kerkim.json (+ .js).

Burimi: orthodoxalbania.org (arkivi shkencor i revistës). Teksti pastrohet: bashkohen rreshtat e thyer
të skanimit, fjalët e ndara me vizë në fund të rreshtit, numrat e faqeve në krye.

Përdorimi:  py -X utf8 tools\merr_kerkim.py"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import merr_lajmet as ml

URL = "https://orthodoxalbania.org/2026/wp-content/themes/orthodoxalbania-agent-6/inc/kerkim-search-data-v3.json"
OUT = os.path.join(ml.ROOT, "data", "kerkim.json")


def clean(t):
    t = (t or "").replace("\r", "")
    t = re.sub(r"^\s*\d{1,3}\s*\n", "", t)                      # numri i faqes në krye
    t = re.sub(r"(\w)-\n\s*(\w)", r"\1\2", t)                    # fja-\nlë → fjalë
    paras = re.split(r"\n\s*\n|\n(?=\s{4,}\S)|(?<=[.!?»”])\n(?=[A-ZÇË«“—–])", t)
    out = []
    for p in paras:
        p = re.sub(r"\s*\n\s*", " ", p).strip()
        p = re.sub(r"\s{2,}", " ", p)
        if len(p) < 2 or re.fullmatch(r"\d{1,3}", p):
            continue
        out.append(p)
    return "\n\n".join(out)


def main():
    data = json.loads(ml.get(URL))
    items = []
    for x in data:
        txt = clean(x.get("full_text"))
        if len(txt) < 200:
            continue
        items.append({"id": x.get("id"), "nr": x.get("issue_number"), "y": x.get("year"), "m": x.get("month") or "",
                      "t": (x.get("title") or "").strip(), "a": (x.get("author") or "").strip(), "pg": x.get("pages") or "",
                      "c": (x.get("category") or "").strip(), "s": (x.get("summary") or "").strip(), "x": txt})
    items.sort(key=lambda i: (-(i["y"] or 0), -(i["nr"] or 0), i["id"] or ""))
    doc = {"updated": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(timespec="seconds"),
           "source": "Revista «Kërkim» · Kisha Orthodhokse Autoqefale e Shqipërisë · orthodoxalbania.org", "items": items}
    js = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    open(OUT, "w", encoding="utf-8").write(js)
    open(OUT[:-5] + ".js", "w", encoding="utf-8").write('window.FS_DATA=window.FS_DATA||{};FS_DATA["kerkim"]=' + js + ";\n")
    print(f"Kërkim: {len(items)} artikuj · {len(js) // 1024} KB")


if __name__ == "__main__":
    main()
