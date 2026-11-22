# -*- coding: utf-8 -*-
"""«Këndi i Lutjes» i KOASH (orthodoxalbania.org/2026/kendi-i-lutjes/), me leje të Kishës.
Faqja zgjedh shërbesën dhe e merr tekstin nga wp-json/oa-prayer/v1/service/<slug>, por ky shërbim nuk lejon thirrje nga
faqe të tjera. Prandaj tekstet merren këtu, një nga një, në RENDIN dhe me EMRAT që ka faqja, pa i përzier, dhe ruhen te
data/kendi_lutjes.json/.js. Shërbesat «së shpejti» ruhen si të tilla."""
import html as H, json, os, re, sys, time, urllib.request

B = "https://orthodoxalbania.org/2026/"
UA = {"User-Agent": "Mozilla/5.0 (FjalaEShenjte; +app)"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get(u):
    for k in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read().decode("utf-8", "replace")
        except Exception:
            time.sleep(2 + 3 * k)
    raise RuntimeError("s'u hap " + u)


def clean(h):
    """vetëm përmbajtja e tekstit: pa stile, skripte dhe skeletin e faqes"""
    h = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", "", h or "")
    h = re.sub(r"(?is)</?(html|head|body|main|div|section|nav|aside|header|footer)[^>]*>", "", h)
    h = re.sub(r"\s(style|onclick|onload)=\"[^\"]*\"", "", h)
    return h.strip()


def main():
    page = get(B + "kendi-i-lutjes/")
    sel = re.search(r'(?s)<select[^>]*id="oa-prayer-service"[^>]*>(.*?)</select>', page)
    if not sel:
        raise RuntimeError("përzgjedhësi i shërbesave nuk u gjet")
    opts = re.findall(r'<option value="([^"]+)"([^>]*)>(.*?)</option>', sel.group(1))
    # faqja shton/hap shërbesat e reja shqip me JavaScript (lista «SQ=[[slug, titull], …]»): pa të, Mesnata dukej «së shpejti»
    sq = re.search(r"SQ=(\[\[.*?\]\]);", page, re.S)
    if sq:
        try:
            extra = json.loads(sq.group(1))
        except ValueError:
            extra = []
        have = [o[0] for o in opts]
        at = have.index("mesnata") + 1 if "mesnata" in have else len(opts)
        for slug, title in extra:
            if slug in have:
                k = have.index(slug)
                opts[k] = (slug, opts[k][1].replace('data-unavailable="1"', ""), title)
            else:
                opts.insert(at, (slug, "", title)); have.insert(at, slug); at += 1
    items = []
    for slug, attrs, label in opts:
        label = H.unescape(re.sub(r"<[^>]+>", "", label)).strip()
        name = re.sub(r"^[^\wÀ-ž]+", "", label).replace("︎", "").strip()          # pa shenjat ◐ ☀︎ ✦ …
        name = re.sub(r"\s*·\s*së shpejti$", "", name)
        it = {"slug": slug, "t": name, "ok": True}
        if it["ok"]:
            try:
                j = json.loads(get(B + "wp-json/oa-prayer/v1/service/" + slug))
                it["t"] = (j.get("title") or name).strip()
                it["sub"] = (j.get("subtitle") or "").strip()
                it["ok"] = bool(j.get("available"))
                if j.get("html"):
                    it["html"] = clean(j["html"])
                else:
                    it["text"] = (j.get("text") or "").strip()
            except Exception as e:
                print("  ! ", slug, e)
                it["ok"] = False
            time.sleep(0.6)
        items.append(it)
        print(("✓ " if it["ok"] else "· ") + slug, "|", it["t"])
    out = {"src": B + "kendi-i-lutjes/", "updated": time.strftime("%Y-%m-%dT%H:%M:%S"), "items": items}
    if sum(1 for x in items if x["ok"]) < 5:
        raise RuntimeError("shumë pak tekste — nuk e mbishkruaj")
    p = os.path.join(ROOT, "data", "kendi_lutjes")
    json.dump(out, open(p + ".json", "w", encoding="utf-8"), ensure_ascii=False)
    open(p + ".js", "w", encoding="utf-8").write('window.FS_DATA=window.FS_DATA||{};FS_DATA["kendi_lutjes"]=' + json.dumps(out, ensure_ascii=False) + ";\n")
    print(len(items), "shërbesa ·", os.path.getsize(p + ".js") // 1024, "KB")


if __name__ == "__main__":
    main()
