# -*- coding: utf-8 -*-
r"""Filtri ortografik orthodhoks i Kinemasë: titujt, përshkrimet, titujt e episodeve dhe çdo rresht titrash shqip.

Të njëjtat rregulla si ORTHO në js/app.js (që zbatohet kudo në aplikacion), plus termat kishtarë:
  · Gjon / Gjoni / Gjonit / Gjonin            → Joan / Joani / Joanit / Joanin
  · Pal / Pali / Palit / Palin                → Pavël / Pavli / Pavlit / Pavlin
  · Jezus / Jezusi / Jezusit / Jezusin, Jesu  → Jisu / Jisui / Jisuit / Jisuin
  · Nëna e Zotit / Nënës së Zotit, Theotokos  → Hyjlindësja / Hyjlindëses
  · Mesha Hyjnore, Liturgjia e Shenjtë         → Liturgjia Hyjnore
  · peshkop / ipeshkv, kryepeshkop             → episkop, kryepiskop
  · metropolit                                 → mitropolit
  · jeront                                     → jerond
Përdorimi:
  py -X utf8 tools\ortografia_orthodhokse.py "tekst"           (provë)
  py -X utf8 tools\ortografia_orthodhokse.py --skedar titrat.vtt (filtron një skedar .vtt/.srt/.json në vend)"""
import json, os, re, sys

L = r"[^\W\d_]"           # një shkronjë (çdo alfabet)
NB = rf"(?<!{L})"         # pa shkronjë para
NA = rf"(?!{L})"          # pa shkronjë pas


def _keep_case(word, repl):
    """Ruaj madhësinë e shkronjave: GJONI → JOANI, gjon → joan, Gjon → Joan."""
    if word.isupper() and len(word) > 1:
        return repl.upper()
    if word[:1].islower():
        return repl[:1].lower() + repl[1:]
    return repl[:1].upper() + repl[1:]


def _title(word, repl):
    """Titujt e nderit (Hyjlindësja, Liturgjia Hyjnore) shkruhen gjithmonë me shkronjë të madhe."""
    return repl.upper() if word.isupper() and len(word) > 1 else repl


def _rx(pat, flags=0):
    return re.compile(pat, flags)


# (rregulli, zëvendësimi) · zëvendësimi mund të jetë funksion
NAMES = [
    # Joan
    (_rx(rf"{NB}(Gjon|GJON)(i|it|in|a|I|IT|IN|A)?{NA}"), lambda m: ("JOAN" if m.group(1).isupper() else "Joan") + (m.group(2) or "")),
    # Jisu: Jezus/Jezusi/Jezusit/Jezusin, «Jezu Krisht», Jisus…
    (_rx(rf"{NB}Jezus(i|it|in)?{NA}"), lambda m: "Jisu" + (m.group(1) or "")),
    (_rx(rf"{NB}JEZUS(I|IT|IN)?{NA}"), lambda m: "JISU" + (m.group(1) or "")),
    (_rx(rf"{NB}Jezu(i|it|in)?(?=\s+Krisht|{NA})"), lambda m: "Jisu" + (m.group(1) or "")),
    (_rx(rf"{NB}JEZU(I|IT|IN)?(?=\s+KRISHT|{NA})"), lambda m: "JISU" + (m.group(1) or "")),
    (_rx(rf"{NB}Jisus(i|it|in)?{NA}"), lambda m: "Jisu" + (m.group(1) or "")),
    (_rx(rf"{NB}Jesus?(i|it|in|ne|në|n|j|jt)?{NA}"), lambda m: "Jisu" + (m.group(1) or "")),
    (_rx(rf"{NB}JESUS?(I|IT|IN|NE|NË|N|J|JT)?{NA}"), lambda m: "JISU" + (m.group(1) or "")),
    # Pavël / Pavli
    (_rx(rf"{NB}Pal(i|it|in){NA}"), lambda m: "Pavl" + m.group(1)),
    (_rx(rf"{NB}Pal{NA}"), "Pavël"),
    (_rx(rf"{NB}PAL(I|IT|IN){NA}"), lambda m: "PAVL" + m.group(1)),
    (_rx(rf"{NB}PAL{NA}"), "PAVËL"),
]

TERMS = [
    # Hyjlindësja
    (_rx(rf"{NB}Nëna e (?:Zotit|Perëndisë){NA}", re.I), lambda m: _title(m.group(0), "Hyjlindësja")),
    (_rx(rf"{NB}Nënën e (?:Zotit|Perëndisë){NA}", re.I), lambda m: _title(m.group(0), "Hyjlindësen")),
    (_rx(rf"{NB}Nënës së (?:Zotit|Perëndisë){NA}", re.I), lambda m: _title(m.group(0), "Hyjlindëses")),
    (_rx(rf"{NB}Th?eotoko(?:s|u|n){NA}", re.I), lambda m: _title(m.group(0), "Hyjlindësja")),
    # Liturgjia Hyjnore
    (_rx(rf"{NB}Mesha (?:Hyjnore|e Shenjtë){NA}", re.I), lambda m: _title(m.group(0), "Liturgjia Hyjnore")),
    (_rx(rf"{NB}Meshën (?:Hyjnore|e Shenjtë){NA}", re.I), lambda m: _title(m.group(0), "Liturgjinë Hyjnore")),
    (_rx(rf"{NB}Meshës (?:Hyjnore|së Shenjtë){NA}", re.I), lambda m: _title(m.group(0), "Liturgjisë Hyjnore")),
    (_rx(rf"{NB}Liturgjia e Shenjtë{NA}"), "Liturgjia Hyjnore"),
    (_rx(rf"{NB}Liturgjinë e Shenjtë{NA}"), "Liturgjinë Hyjnore"),
    (_rx(rf"{NB}Liturgjisë së Shenjtë{NA}"), "Liturgjisë Hyjnore"),
    # Kryepiskop / Episkop (përfshi trajtat geg «ipeshkv»)
    (_rx(rf"{NB}(kryepeshkop|kryeipeshkv)", re.I), lambda m: _keep_case(m.group(0), "kryepiskop")),
    (_rx(rf"{NB}(peshkop|ipeshkv)", re.I), lambda m: _keep_case(m.group(0), "episkop")),
    # Mitropolit
    (_rx(rf"{NB}metropolit", re.I), lambda m: _keep_case(m.group(0), "mitropolit")),
    # Jerondi
    (_rx(rf"{NB}jeront", re.I), lambda m: _keep_case(m.group(0), "jerond")),
    # Perëndia (përkthyesit automatikë japin «All-llahu» nga korpuset islame)
    (_rx(rf"{NB}All?-?l?l?ah(u|ut|un|)?{NA}"), lambda m: "Perëndi" + {"u": "a", "ut": "së", "un": "në", "": ""}[m.group(1) or ""]),
    (_rx(rf"{NB}ALL?-?L?L?AH(U|UT|UN|)?{NA}"), lambda m: "PERËNDI" + {"U": "A", "UT": "SË", "UN": "NË", "": ""}[m.group(1) or ""]),
    # shenjat muzikore të titrave
    (_rx(r"♫"), "–"), (_rx(r"♪"), ""),
    # Shndërrimi
    (_rx(r"shpërfytyr"), "shndërr"), (_rx(r"Shpërfytyr"), "Shndërr"), (_rx(r"SHPËRFYTYR"), "SHNDËRR"),
]


def orthodox(text, terms=True):
    """Kthen tekstin me ortografinë orthodhokse. E sigurt për t'u zbatuar disa herë (idempotente)."""
    if not text or not isinstance(text, str):
        return text
    t = text
    for rx, to in NAMES + (TERMS if terms else []):
        t = rx.sub(to, t)
    return re.sub(r"[ \t]{2,}", " ", t) if "♪" in text else t


TIME_LINE = re.compile(r"^\s*\d{1,2}:\d\d(?::\d\d)?[.,]\d{3}\s*-->")


def orthodox_subs(vtt):
    """Zbaton filtrin vetëm te rreshtat e tekstit të titrave (jo te kohët, numrat, WEBVTT)."""
    out = []
    for line in vtt.split("\n"):
        s = line.strip()
        if not s or TIME_LINE.match(s) or s.isdigit() or s.startswith(("WEBVTT", "NOTE", "Kind:", "Language:", "STYLE")):
            out.append(line)
        else:
            out.append(orthodox(line))
    return "\n".join(out)


def orthodox_item(x):
    """Filtron një titull të Kinemasë (film ose serial) dhe episodet e tij, në vend."""
    for k in ("titulli", "pershkrimi"):
        if isinstance(x.get(k), str):
            x[k] = orthodox(x[k])
    for e in x.get("episodet") or []:
        for k in ("titulli", "pershkrimi"):
            if isinstance(e.get(k), str):
                e[k] = orthodox(e[k])
    return x


def _selftest():
    cases = {
        "Ungjilli sipas Gjonit": "Ungjilli sipas Joanit",
        "Shën Gjon Gojarti dhe GJONI": "Shën Joan Gojarti dhe JOANI",
        "Pjetri dhe Pali; letra e Palit": "Pjetri dhe Pavli; letra e Pavlit",
        "Apostulli Pal": "Apostulli Pavël",
        "Zoti Jezus Krisht, Jezusi i Nazaretit, Nëna e Jezusit": "Zoti Jisu Krisht, Jisui i Nazaretit, Hyjlindësja e Jisuit".replace("Hyjlindësja e Jisuit", "Nëna e Jisuit"),
        "Jezu Krishti": "Jisu Krishti",
        "Jezui shkoi me Jezuin": "Jisui shkoi me Jisuin",
        "me Pavlin dhe nënën e Zotit": "me Pavlin dhe Hyjlindësen",
        "Nëna e Zotit dhe ikona e Nënës së Zotit": "Hyjlindësja dhe ikona e Hyjlindëses",
        "Mesha Hyjnore u kremtua nga Kryepeshkopi dhe peshkopët": "Liturgjia Hyjnore u kremtua nga Kryepiskopi dhe episkopët",
        "Metropoliti dhe jeronti": "Mitropoliti dhe jerondi",
        "Palma, Gjonaj, Jezusalem": "Palma, Gjonaj, Jezusalem",
        "♪ Lavdi ♪": " Lavdi ",
    }
    bad = 0
    for a, b in cases.items():
        r = orthodox(a)
        if r != b:
            bad += 1
            print("✗", a, "→", r, "(pritej:", b + ")")
        if orthodox(r) != r:
            bad += 1
            print("✗ jo idempotent:", r)
    print("Prova:", len(cases) - bad, "/", len(cases), "në rregull")
    return bad == 0


def main(argv):
    if not argv or argv[0] == "--prove":
        return 0 if _selftest() else 1
    if argv[0] == "--skedar":
        for p in argv[1:]:
            t = open(p, encoding="utf-8-sig").read()
            if p.lower().endswith(".json"):
                d = json.loads(t)
                for x in d.get("items", []) if isinstance(d, dict) else d:
                    orthodox_item(x)
                new = json.dumps(d, ensure_ascii=False, indent=1)
            else:
                new = orthodox_subs(t)
            if new != t:
                open(p, "w", encoding="utf-8").write(new)
                print("u filtrua:", p)
        return 0
    print(orthodox(" ".join(argv)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
