# -*- coding: utf-8 -*-
r"""Mujoret: shërbesat e shenjtorëve dhe të festave të muajit (thirrtoret, pasvargjet, përlëshoret, kanonet…)
→ data\mujoret.json (+ .js), për Tipikonë dhe arkivin «Mujoret» të aplikacionit.

Merren vetëm tekstet liturgjike të Kishës që kanë burim të shënuar libër të Kishës:
  · «Kremtore e Kishës Orthodhokse» (1947), përkthim i Fan S. Nolit;
  · libri i psaltikës i Kishës.
Shërbesat pa burim të shënuar anashkalohen. Ruhen titulli, shenjtori, data dhe blloqet e tekstit me rendin dhe
shënimet e tyre (pjesa e shërbesës, tingulli, «Lavdi», «Dhe tani», vargjet, rubrikat), pa i ndryshuar.

Përdorimi:  py -X utf8 tools\merr_mujoret.py        (e nis edhe auto_sinkronizo.py një herë në ditë)"""
import datetime
import html
import json
import os
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "mujoret.json")
BASE = "https://orthodox-news.pages.dev"
MONTHS = ["shtator", "tetor", "nentor", "dhjetor", "janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht"]
UA = {"User-Agent": "Mozilla/5.0", "Accept-Language": "sq"}
NOLI = "«Kremtore e Kishës Orthodhokse» (1947), përkthim i Fan S. Nolit"
PSALT = "Libri i psaltikës i Kishës"


def get(path, timeout=40):
    for n in range(3):
        try:
            req = urllib.request.Request(BASE + path, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if n == 2:
                raise
            time.sleep(2 + 3 * n)


def clean(t):
    t = html.unescape(re.sub(r"<[^>]+>", "", t.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")))
    t = re.sub(r"[ \t ]+", " ", t)
    return "\n".join(x.strip() for x in t.split("\n")).strip()


class Blocks(HTMLParser):
    """Blloqet e tekstit të shërbesës, në rendin e tyre: s (pjesa e shërbesës), h (titulli), g (Lavdi / Tani),
    t (tingulli dhe melodia), r (rubrika / vargu), q (varg i veçuar), p (teksti)."""
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out, self.stack, self.buf, self.kind, self.depth_q, self.only = [], [], [], None, 0, None

    def handle_starttag(self, tag, attrs):
        if tag == "blockquote":
            self.depth_q += 1
        if tag in ("h2", "h3", "h4", "p"):
            self.kind, self.buf, self.only = tag, [], []
        elif self.kind:
            if tag == "br":
                self.buf.append("<br>")
            else:
                self.buf.append(f"<{tag}>")
                self.only.append(tag)

    def handle_endtag(self, tag):
        if tag == "blockquote":
            self.depth_q -= 1
        if self.kind and tag == self.kind:
            raw = "".join(self.buf)
            txt = clean(raw)
            if txt:
                if tag == "h2":
                    k = "s"
                elif tag == "h3":
                    k = "h"
                elif tag == "h4":
                    k = "g" if re.fullmatch(r"(Lavdi|Tani|Dhe tani|Lavdi\s*[–-]\s*(Dhe\s+)?[Tt]ani)\.?", txt) else "h"
                elif self.depth_q:
                    k = "q"
                else:
                    bare = re.sub(r"\s+", "", re.sub(r"</?(em|strong|i|b)>", "", raw))
                    whole = re.fullmatch(r"\s*<(em|i)>.*</(em|i)>\s*", raw, re.S) and bare
                    k = ("t" if re.match(r"\s*<(em|i)>\s*<(strong|b)>", raw) else "r") if whole and raw.count("<em>") + raw.count("<i>") == 1 else "p"
                self.out.append([k, txt])
            self.kind = None
        elif self.kind and tag != "br":
            self.buf.append(f"</{tag}>")

    def handle_data(self, data):
        if self.kind:
            self.buf.append(data)

    def handle_entityref(self, name):
        if self.kind:
            self.buf.append(f"&{name};")

    def handle_charref(self, name):
        if self.kind:
            self.buf.append(f"&#{name};")


def service(path):
    s = get(path)
    m = re.search(r'<article class="liturgy[^"]*"[^>]*>(.*?)</article>', s, re.S)
    if not m:
        return None
    note = clean((re.search(r'class="article-head__ex">(.*?)</p>', s, re.S) or [None, ""])[1])
    if re.search(r"Kremtore", note):
        src = NOLI + (", me drejtshkrimin e sotëm" if re.search(r"drejtshkrim", note) else "")
    elif re.search(r"psaltik", note, re.I):
        src = PSALT
    else:
        return "pa-burim"
    title = clean((re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S) or [None, ""])[1])
    saint = clean((re.search(r'class="lit-head__saint">(.*?)</p>', s, re.S) or [None, ""])[1])
    p = Blocks()
    p.feed(m.group(1))
    blocks = [b for b in p.out if b[1]]
    if len(blocks) < 5:
        return None
    return {"t": title, "s": saint, "src": src, "b": blocks}


def main():
    try:
        prev = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        prev = {"items": []}
    have = {x["id"]: x for x in prev.get("items", [])}
    links = set()
    for mo in MONTHS:
        try:
            links |= set(re.findall(r'href="(/troparet/20\d\d-\d\d-\d\d-[a-z0-9-]+/)"', get(f"/libri-i-lutjes/mujoret/{mo}/")))
        except Exception:
            pass
        time.sleep(0.4)
    try:
        links |= set(re.findall(r'href="(/troparet/20\d\d-\d\d-\d\d-[a-z0-9-]+/)"', get("/troparet/")))
    except Exception:
        pass
    if not links:
        return f"Mujoret: lista nuk u lexua sot; mbeten {len(have)} shërbesa"
    new = upd = skip = 0
    for path in sorted(links):
        y, mm, dd, slug = re.match(r"/troparet/(\d{4})-(\d\d)-(\d\d)-(.+)/", path).groups()
        sid = f"{mm}-{dd}-{slug}"
        try:
            sv = service(path)
        except Exception:
            continue
        finally:
            time.sleep(0.5)
        if sv == "pa-burim" or not sv:
            skip += 1
            continue
        item = {"id": sid, "m": int(mm), "d": int(dd), **sv}
        if sid not in have:
            new += 1
        elif have[sid].get("b") != item["b"] or have[sid].get("t") != item["t"]:
            upd += 1
        else:
            item["at"] = have[sid].get("at")
        item["at"] = item.get("at") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        have[sid] = item
    items = sorted(have.values(), key=lambda x: (x["m"], x["d"], x["id"]))
    doc = {"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "items": items}
    if new or upd or not os.path.exists(OUT):
        json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        with open(OUT[:-5] + ".js", "w", encoding="utf-8") as f:
            f.write('window.FS_DATA=window.FS_DATA||{};FS_DATA["mujoret"]=' + json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + ";")
    return f"Mujoret: {len(items)} shërbesa · {new} të reja · {upd} të përditësuara" + (f" · {skip} pa burim të Kishës, të anashkaluara" if skip else "")


if __name__ == "__main__":
    print(main())
