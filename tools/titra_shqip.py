# -*- coding: utf-8 -*-
r"""Titrat shqip të Kinemasë: gjenerim, pastrim dhe ruajtje e përhershme te subtitles\{id}.vtt.

Si funksionon (vetë, në çdo sinkronizim):
  1) Merr çdo skedar .srt / .vtt nga dosja  titrat_e_reja\  (emri = id e filmit ose e episodit):
        the-chosen-s1-e1.srt      → gjuha gjendet vetë (shqip ose anglisht)
        the-chosen-s1-e1.en.srt   → anglisht → përkthehet në shqip
        the-chosen-s1-e1.sq.vtt   → shqip → vetëm pastrohet
     Për titujt e autorit (data\kinema_autori.json) me «titraOrigjinaleUrl» (p.sh. .srt anglisht), skedari
     shkarkohet vetë te dosja kur s'ka ende subtitles\{id}.vtt.
  2) Pastrimi: heq etiketat HTML/ASS, reklamat e faqeve të titrave, rreshtat bosh dhe dyfishimet, rregullon kohët.
  3) Përkthimi anglisht → shqip me Argos Translate (offline, falas, pa çelës). Përkthimet ruhen te
     tools\_perkthime_titra.json, ndaj një xhirim që s'mbaron vazhdon aty ku mbeti në sinkronizimin pasues.
  4) Filtri ortografik orthodhoks (Joan, Pavël, Jisu, Hyjlindësja, Liturgjia Hyjnore…) mbi çdo rresht.
  5) Shkruan subtitles\{id}.vtt (WEBVTT) dhe origjinalin e zhvendos te titrat_e_reja\_perpunuar\.
  Çdo herë, edhe titrat e ruajtura më parë kalojnë sërish nga pastrimi dhe filtri (pa i prishur).
Përdorimi:  py -X utf8 tools\titra_shqip.py"""
import hashlib, html, json, os, re, shutil, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from ortografia_orthodhokse import orthodox  # noqa: E402

INBOX = os.path.join(ROOT, "titrat_e_reja")
DONE = os.path.join(INBOX, "_perpunuar")
OUT = os.path.join(ROOT, "subtitles")
AUTHOR = os.path.join(ROOT, "data", "kinema_autori.json")
CACHE = os.path.join(ROOT, "tools", "_perkthime_titra.json")
BUDGET = int(os.environ.get("FS_TITRA_SEK", "600"))      # sa sekonda përkthimi në një xhirim
LINE_MAX = 42                                            # gjatësia e një rreshti titrash
ID_RX = re.compile(r"^[a-z0-9][a-z0-9._-]{0,120}$", re.I)

TIME = r"(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}"
CUE_TIME = re.compile(rf"^\s*({TIME})\s*-->\s*({TIME})")
ADS = re.compile(r"opensubtitles|subscene|addic7ed|podnapisi|yify|yts\.|subs?\s*by|synced\s*(?:and|&)\s*corrected|"
                 r"subtitles?\s*(?:by|downloaded|ripped)|downloaded\s*from|resync|www\.|https?://|\.(?:com|org|net|tv)\b|"
                 r"support\s*us|become\s*(?:a\s*)?vip|titra\s*nga|përkthyer\s*nga\s*.*(?:www|\.com)", re.I)
SQ_HINT = re.compile(r"[ëç]|\b(dhe|është|për|nuk|një|janë|që|zot|perëndi)\b", re.I)


def _secs(t):
    t = t.replace(",", ".")
    p = t.split(":")
    if len(p) == 2:
        p = ["0"] + p
    h, m, s = p
    return int(h) * 3600 + int(m) * 60 + float(s)


def _fmt(s):
    s = max(0.0, s)
    h = int(s // 3600); m = int(s % 3600 // 60); x = s - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{x:06.3f}"


def parse(text):
    """SRT ose VTT → [(fillimi, fundi, teksti)]"""
    text = text.replace("﻿", "").replace("\r\n", "\n").replace("\r", "\n")
    cues = []
    for block in re.split(r"\n\s*\n", text):
        lines = [l for l in block.split("\n") if l.strip()]
        for i, l in enumerate(lines):
            m = CUE_TIME.match(l)
            if m:
                body = "\n".join(lines[i + 1:])
                cues.append((_secs(m.group(1)), _secs(m.group(3)), body))
                break
    return cues


def clean_text(t):
    t = re.sub(r"\{\\[^}]*\}", "", t)                   # etiketat ASS {\an8}
    t = re.sub(r"</?(?!i\b|b\b)[^>]*>", "", t)          # HTML, përveç <i> dhe <b>
    t = html.unescape(t)
    t = re.sub(r"[ \t]+", " ", t)
    lines = [l.strip() for l in t.split("\n")]
    return "\n".join(l for l in lines if l and l != "-")


def clean(cues):
    out, seen = [], set()
    for a, b, t in sorted(cues, key=lambda c: c[0]):
        t = clean_text(t)
        bare = re.sub(r"<[^>]+>|[♪♫\s]", "", t)
        if not bare or ADS.search(t):
            continue
        if b <= a:
            b = a + max(1.2, min(6.0, len(t) / 15))
        key = (round(a, 1), t)
        if key in seen:
            continue
        seen.add(key)
        if out and out[-1][2] == t and a - out[-1][1] < 0.5:     # i njëjti rresht i ndarë në dy → bashkoji
            out[-1] = (out[-1][0], b, t)
            continue
        out.append((a, b, t))
    for i in range(len(out) - 1):                                   # mos u mbivendos
        a, b, t = out[i]
        if b > out[i + 1][0]:
            out[i] = (a, max(a + 0.3, out[i + 1][0] - 0.04), t)
    return out


def tidy(t):
    """Rregullon shenjat e pikësimit që lë përkthimi automatik («" Ja» → «"Ja»)."""
    t = re.sub(r'(^|[\s:(])"\s+', r'\1"', t)
    t = re.sub(r'\s+([,.!?;])', r"\1", t)
    return re.sub(r"\s{2,}", " ", t).strip()


def wrap(t):
    """Ndan tekstin në 1–2 rreshta të lexueshëm."""
    t = re.sub(r"\s*\n\s*", " ", t).strip()
    if len(t) <= LINE_MAX:
        return t
    mid = len(t) // 2
    cut = min((i for i, ch in enumerate(t) if ch == " "), key=lambda i: abs(i - mid), default=-1)
    return t if cut < 0 else t[:cut] + "\n" + t[cut + 1:]


def to_vtt(cues):
    parts = ["WEBVTT", "Kind: subtitles", "Language: sq", ""]
    for a, b, t in cues:
        parts += [f"{_fmt(a)} --> {_fmt(b)}", t, ""]
    return "\n".join(parts)


def lang_of(name, cues):
    m = re.search(r"\.([a-z]{2})$", os.path.splitext(name)[0], re.I)
    if m:
        return m.group(1).lower()
    sample = " ".join(t for _, _, t in cues[:80])
    return "sq" if len(SQ_HINT.findall(sample)) > max(4, len(sample) / 120) else "en"


def _load_cache():
    try:
        return json.load(open(CACHE, encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _save_cache(c):
    tmp = CACHE + ".tmp"
    json.dump(c, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
    os.replace(tmp, CACHE)


def translate(cues, cache, deadline):
    """Përkthen çdo rresht anglisht → shqip; kthen (cues, i_plotë)."""
    import merr_lajmet
    if not merr_lajmet._translator():
        return cues, False
    out, full = [], True
    for a, b, t in cues:
        src = re.sub(r"</?[ib]>", "", re.sub(r"\s*\n\s*", " ", t)).strip()
        k = hashlib.sha1(src.encode("utf-8")).hexdigest()[:16]
        if k not in cache:
            if time.time() > deadline:
                full = False
                out.append((a, b, t))
                continue
            cache[k] = merr_lajmet.tr_sq(src) or src
        out.append((a, b, wrap(tidy(cache[k]))))
    return out, full


def fetch_author():
    """Shkarkon titrat origjinale të titujve të autorit (titraOrigjinaleUrl) te dosja, kur mungojnë."""
    n = 0
    items = []
    for src in (AUTHOR, os.path.join(ROOT, "data", "kinema.json")):      # autori + katalogu (filmat e Archive me titra anglisht)
        try:
            items.extend(json.load(open(src, encoding="utf-8")).get("items", []))
        except (OSError, ValueError, AttributeError):
            pass
    if not items:
        return 0
    todo = []
    for x in items:
        todo.append(x)
        todo.extend(x.get("episodet") or [])
    for x in todo:
        url, xid = (x.get("titraOrigjinaleUrl") or "").strip(), str(x.get("id") or "")
        if not url.startswith("https://") or not ID_RX.match(xid) or os.path.exists(os.path.join(OUT, xid + ".vtt")):
            continue
        ext = ".vtt" if url.lower().split("?")[0].endswith(".vtt") else ".srt"
        dst = os.path.join(INBOX, f"{xid}.{(x.get('titraGjuha') or 'en').lower()[:2]}{ext}")
        if os.path.exists(dst):
            continue
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "FjalaEShenjte/1.0"}), timeout=60).read()
            if len(data) > 3_000_000:
                continue
            open(dst, "wb").write(data)
            n += 1
        except Exception as exc:
            print("Titrat nuk u shkarkuan për", xid, exc.__class__.__name__)
    return n


def main():
    os.makedirs(INBOX, exist_ok=True)
    os.makedirs(DONE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    got = fetch_author()
    cache, deadline = _load_cache(), time.time() + BUDGET
    made, waiting, skipped = [], [], []
    for f in sorted(os.listdir(INBOX)):
        p = os.path.join(INBOX, f)
        stem, ext = os.path.splitext(f)
        if not os.path.isfile(p) or ext.lower() not in (".srt", ".vtt"):
            continue
        xid = re.sub(r"\.[a-z]{2}$", "", stem, flags=re.I)
        if not ID_RX.match(xid):
            skipped.append(f)
            continue
        raw = open(p, "rb").read()
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("cp1250", "replace")          # titrat e vjetra shqip shpesh janë në Windows-1250
        cues = clean(parse(text))
        if not cues:
            skipped.append(f)
            continue
        lang = lang_of(f, cues)
        if lang == "en":
            cues, full = translate(cues, cache, deadline)
            _save_cache(cache)
            if not full:
                waiting.append(xid)
                continue
        elif lang != "sq":
            skipped.append(f + f" (gjuha «{lang}» nuk përkthehet offline; vetëm anglisht → shqip)")
            continue
        cues = [(a, b, orthodox(t)) for a, b, t in cues]
        open(os.path.join(OUT, xid + ".vtt"), "w", encoding="utf-8").write(to_vtt(cues))
        shutil.move(p, os.path.join(DONE, f))
        made.append(xid)
    # pastrimi i përhershëm: edhe titrat e ruajtura kalojnë sërish nga pastrimi dhe filtri
    fixed = 0
    for f in os.listdir(OUT):
        if not f.endswith(".vtt"):
            continue
        p = os.path.join(OUT, f)
        old = open(p, encoding="utf-8-sig").read()
        new = to_vtt([(a, b, orthodox(t)) for a, b, t in clean(parse(old))])
        if new.strip() != old.strip():
            open(p, "w", encoding="utf-8").write(new)
            fixed += 1
    msg = f"Titrat shqip: {len(made)} të reja"
    if got:
        msg += f" · {got} të shkarkuara"
    if waiting:
        msg += f" · {len(waiting)} në përkthim (vazhdojnë herën tjetër)"
    if fixed:
        msg += f" · {fixed} të pastruara"
    if skipped:
        msg += " · të anashkaluara: " + ", ".join(skipped[:5])
    msg += f" · gjithsej {sum(1 for f in os.listdir(OUT) if f.endswith('.vtt'))}"
    return msg


if __name__ == "__main__":
    print(main())
