r"""Sinkronizimi automatik i "Fjala e Shenjtë" (punon vetë, pa ndërhyrje):

  0) Instagram @apostle_icons (me lejen e autorit): nis C:\Users\MINUE\merr_sot.py për ditët e fundit
     (parazgjedhja 1 ditë = 24 orë; --dite 7 për provë) dhe kopjon fotot e reja nga apostle_icons_sot\ dhe
     apostle_icons\ te ikonat_e_reja\ (emri nis me datën e postimit YYYY-MM-DD). Të bërat më parë anashkalohen.

  1) Ikonat e reja: merr çdo foto (.jpg/.jpeg/.png/.webp) nga dosja  ikonat_e_reja\  (dosja jote; vendos aty
     vetëm ikona që ke të drejtë t'i përdorësh: tuajat, nga domeni publik ose me lejen e autorit),
     i kthen në WebP (maks. 1400px, nën 350 KB) te  img\apostujt\ig_<emri>.webp  dhe origjinalin e zhvendos
     te  ikonat_e_reja\_perpunuar\.
  2) Sinaksari: çdo ikonë  img\apostujt\ig_*  merr datën "MM-DD" (nga emri i skedarit, p.sh. 2026-11-15, ose nga
     data e skedarit) dhe shenjtorin/festën e asaj dite nga data\sinaksari_MM.json dhe data\kalendari.json.
     Regjistrohet te data\imazhet.json me "date", "sinaksari": true, "cat": "apostujt". Ikonat e vjetra nuk fshihen:
     çdo vit, në atë datë, dalin të gjitha bashkë te "Ikona e ditës" (jo te shprehjet).
  2b) Lajmet: tools\merr_lajmet.py merr titujt e fundit nga UGO.al, KOASH dhe Orthodox Times → data\lajme_bota.json
  3) GitHub Pages: përditëson dist\github_live me versionin e plotë web + update.json + .nojekyll
     (pa .apk e .zip) dhe, po pati ndryshime, bën commit dhe push (pa pyetur në terminal).

Në re: .github\workflows\ikonat.yml + cloud\ikonat.py marrin ikonat vetë në GitHub 4 herë në ditë (edhe me laptopin
të fikur). Këtu, hapi "Ikonat nga GitHub" i tërheq ato te img\apostujt dhe Apify-ja e laptopit anashkalohet kur reja
e ka bërë kontrollin në 8 orët e fundit (që kreditet të mos shpenzohen dy herë).
Orari: detyra e Windows-it e nis çdo orë (tools\\regjistro_detyren.py). Hapat që përdorin Apify (Instagram i ikonave,
Facebook-u i Shkollës) bëhen vetëm kur kanë kaluar të paktën FS_APIFY_ORE orë (parazgjedhja 6) nga hera e fundit,
që kreditet e Apify të mos shumëfishohen; të gjithë hapat e tjerë (lajmet, Live, Kinemaja…) bëhen çdo orë.

Përdorimi:  pythonw tools\\auto_sinkronizo.py      (në sfond, pa dritare; 1 ditë)
            py -X utf8 tools\\auto_sinkronizo.py --dite 7   (provë: 7 ditët e fundit)
            py -X utf8 tools\\auto_sinkronizo.py    (me shënime në ekran)
Shënimet ruhen te dist\\auto_sinkronizo.log"""
import datetime, json, os, re, shutil, subprocess, sys, time, traceback

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX = os.path.join(ROOT, "ikonat_e_reja")
DONE = os.path.join(INBOX, "_perpunuar")
DST = os.path.join(ROOT, "img", "apostujt")
IMAZHET = os.path.join(ROOT, "data", "imazhet.json")
LIVE = os.path.join(ROOT, "dist", "github_live")
UPD = r"C:\Desktop\perditesime-app\update.json"
LOG = os.path.join(ROOT, "dist", "auto_sinkronizo.log")
EXTS = (".jpg", ".jpeg", ".png", ".webp")
IG_SCRIPT = r"C:\Users\MINUE\merr_sot.py"
IG_DIRS = (r"C:\Users\MINUE\saintsoforthodoxy_sot",)
IG_STATE = r"C:\Users\MINUE\saintsoforthodoxy_last.json"   # e shkruan merr_sot.py në çdo kontroll
LOCK = os.path.join(ROOT, "dist", ".sinkronizimi.lock")       # një sinkronizim i vetëm në të njëjtën kohë
SQUEEZED = os.path.join(ROOT, "dist", ".ikonat_kompresuar.json")
APIFY_STAMP = os.path.join(ROOT, "dist", ".apify_e_fundit")   # koha e hapit të fundit me Apify
APIFY_ORE = float(os.environ.get("FS_APIFY_ORE", "6"))
CLOUD_STATE = os.path.join(LIVE, "cloud", "gjendja_ikonat.json")   # shkruhet nga GitHub Actions (cloud/ikonat.py)
NOWIN = 0x08000000 if os.name == "nt" else 0          # CREATE_NO_WINDOW: asnjë dritare e zezë


def log(msg):
    line = f"{datetime.datetime.now():%Y-%m-%d %H:%M:%S}  {msg}"
    try:
        print(line)
    except Exception:
        pass
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    for _ in range(3):
        try:
            with open(LOG, "a", encoding="utf-8") as f:
                f.write(line + "\n")
            break
        except OSError:
            time.sleep(0.4)
    # log-u mos rritet pa fund
    try:
        if os.path.getsize(LOG) > 400_000:
            lines = open(LOG, encoding="utf-8").read().splitlines()[-2000:]
            open(LOG, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    except Exception:
        pass


def run(cmd, cwd=None, timeout=900):
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GCM_INTERACTIVE="never")
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                          timeout=timeout, env=env, creationflags=NOWIN)


# ---------------- 0) Instagram @apostle_icons → ikonat_e_reja ----------------
def apify_due():
    """True kur kanë kaluar APIFY_ORE orë nga hapi i fundit me Apify (ose s'është bërë kurrë)."""
    try:
        return time.time() - os.path.getmtime(APIFY_STAMP) >= APIFY_ORE * 3600 - 300
    except OSError:
        return True


def cloud_recent(hours=8):
    """Koha e kontrollit të fundit të ikonave në GitHub Actions, po qe brenda `hours` orëve (përndryshe None)."""
    try:
        t = json.load(open(CLOUD_STATE, encoding="utf-8")).get("kontrolli", "")
        dt = datetime.datetime.fromisoformat(t.replace("Z", "+00:00"))
        if (datetime.datetime.now(datetime.timezone.utc) - dt).total_seconds() < hours * 3600:
            return dt
    except Exception:
        pass
    return None


def pull_cloud():
    """Tërheq nga GitHub ikonat që i mori vetë GitHub Actions dhe i fut te img\\apostujt + data\\imazhet.json."""
    if not os.path.isdir(os.path.join(LIVE, ".git")):
        return 0
    r = run(["git", "pull", "-q", "--ff-only", "origin", "main"], cwd=LIVE, timeout=300)
    if r.returncode:
        log("Ikonat nga GitHub: s'u tërhoq tani (" + (r.stderr or r.stdout).strip()[-120:] + ")")
    src = os.path.join(LIVE, "img", "apostujt")
    if not os.path.isdir(src):
        return 0
    caps = {}
    for m in range(1, 13):
        f = os.path.join(LIVE, "data", f"imazhet_{m:02d}.json")
        if os.path.exists(f):
            for im in json.load(open(f, encoding="utf-8")).get("images", []):
                if im.get("pershkrimi"):
                    caps[im.get("file")] = im["pershkrimi"]
    d = json.load(open(IMAZHET, encoding="utf-8"))
    imgs = d.setdefault("images", [])
    have = {i.get("file") for i in imgs}
    n = 0
    os.makedirs(DST, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not (f.startswith("ig_") and f.endswith(".webp")) or os.path.exists(os.path.join(DST, f)):
            continue
        shutil.copy2(os.path.join(src, f), os.path.join(DST, f))
        rel = "img/apostujt/" + f
        if rel not in have:
            im = {"file": rel}
            if caps.get(rel):
                im["pershkrimi"] = caps[rel]
            imgs.append(im)
        n += 1
        log(f"  < {f}")
    if n:
        json.dump(d, open(IMAZHET, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    log(f"Ikonat nga GitHub: {n} të reja")
    return n


def fetch_instagram(dite=1, apify=True):
    cr = cloud_recent()
    if apify and cr and "--apify" not in sys.argv:
        apify = False
        log(f"Instagram: e bëri GitHub-i në {cr.astimezone():%H:%M}; Apify-ja e laptopit pushon")
    try:
        ig_age = time.time() - os.path.getmtime(IG_STATE)
    except OSError:
        ig_age = None
    if apify and ig_age is not None and ig_age < APIFY_ORE * 3600 - 300 and "--apify" not in sys.argv:
        apify = False
        log(f"Instagram: merr_sot.py e bëri para {ig_age / 3600:.1f} orësh; Apify-ja nuk thirret dy herë")
    if not apify:
        log(f"Instagram: shkarkimi me Apify bëhet çdo {APIFY_ORE:g} orë; tani vetëm kontrolli i dosjeve")
    elif os.path.exists(IG_SCRIPT):
        exe = sys.executable
        if exe.lower().endswith("pythonw.exe"):
            exe = exe[:-len("pythonw.exe")] + "python.exe"
        r = run([exe, "-X", "utf8", IG_SCRIPT, str(int(dite * 24))], cwd=os.path.dirname(IG_SCRIPT), timeout=1800)
        out = (r.stdout or "").strip().splitlines()
        log(f"Instagram ({dite} ditë): " + (out[-1] if out else "")
            + ("" if r.returncode == 0 else "  ! " + (r.stderr or "").strip()[-300:]))
    else:
        log("Instagram: s'u gjet " + IG_SCRIPT)
    os.makedirs(INBOX, exist_ok=True)
    n = 0
    for d in IG_DIRS:
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            stem, ext = os.path.splitext(f)
            if ext.lower() not in EXTS or not re.match(r"20\d\d-\d\d-\d\d", stem):
                continue
            if (os.path.exists(os.path.join(DST, "ig_" + stem + ".webp")) or os.path.exists(os.path.join(INBOX, f))
                    or os.path.exists(os.path.join(DONE, f))):
                continue
            shutil.copy2(os.path.join(d, f), os.path.join(INBOX, f))
            n += 1
            log(f"  > {f}")
    log(f"Instagram: {n} foto të reja te ikonat_e_reja")
    return n


# ---------------- 1) Ikonat e reja → WebP ----------------
def to_webp(src, dst):
    from PIL import Image, ImageOps
    im = ImageOps.exif_transpose(Image.open(src))
    alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    im = im.convert("RGBA" if alpha else "RGB")
    # e njëjta kompresë si tools/kompreso_fotot.py: ana e shkurtër ≤900px (e gjata ≤1600px), q66 + mprehje e lehtë
    from PIL import ImageFilter
    w, h = im.size
    k = min(1, 900 / min(w, h), 1600 / max(w, h))
    if k < 1:
        im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=0.8, percent=55, threshold=2))
    tmp = dst + ".tmp"
    for q in (66, 62, 58, 54):
        im.save(tmp, "WEBP", quality=q, method=6)
        if os.path.getsize(tmp) <= 230 * 1024:
            break
    os.replace(tmp, dst)


def import_new():
    os.makedirs(INBOX, exist_ok=True)
    os.makedirs(DONE, exist_ok=True)
    os.makedirs(DST, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(INBOX)):
        p = os.path.join(INBOX, f)
        if not os.path.isfile(p) or not f.lower().endswith(EXTS):
            continue
        stem = os.path.splitext(f)[0]
        out = os.path.join(DST, (stem if stem.startswith("ig_") else "ig_" + stem) + ".webp")
        try:
            to_webp(p, out)
            # data e skedarit ruhet (nëse emri s'ka datë, prej saj del "MM-DD")
            st = os.stat(p)
            os.utime(out, (st.st_atime, st.st_mtime))
            shutil.move(p, os.path.join(DONE, f))
            # teksti i postimit (nëse ka): <emri>.txt pranë fotos
            cap = os.path.join(INBOX, stem + ".txt")
            if os.path.exists(cap):
                shutil.copy2(cap, os.path.splitext(out)[0] + ".txt")
                shutil.move(cap, os.path.join(DONE, stem + ".txt"))
            n += 1
            log(f"  + {os.path.basename(out)} ({os.path.getsize(out) // 1024} KB)")
        except Exception as e:
            log(f"  ! {f}: {e}")
    # kompreso edhe ikonat ekzistuese mbi 230 KB, vetëm një herë për çdo skedar: një WebP i rikompresuar
    # çdo orë humbet cilësi pa u bërë më i vogël
    try:
        done = set(json.load(open(SQUEEZED, encoding="utf-8")))
    except Exception:
        done = set()
    grew = False
    for f in os.listdir(DST):
        p = os.path.join(DST, f)
        if f.lower().endswith(".webp") and f not in done and os.path.getsize(p) > 230 * 1024:
            try:
                to_webp(p, p)
                log(f"  ~ u kompresua {f}")
            except Exception as e:
                log(f"  ! {f}: {e}")
            done.add(f)
            grew = True
    if grew:
        try:
            json.dump(sorted(done), open(SQUEEZED, "w", encoding="utf-8"))
        except OSError:
            pass
    return n


# ---------------- 2) Lidhja me Sinaksarin ----------------
_sx = {}


def synax_day(mm, dd):
    if mm not in _sx:
        try:
            _sx[mm] = json.load(open(os.path.join(ROOT, "data", f"sinaksari_{mm:02d}.json"), encoding="utf-8"))
        except Exception:
            _sx[mm] = None
    d = _sx[mm]
    if not d:
        return None
    return next((x for x in d.get("days", []) if x.get("d") == dd), None)


def saint_name(mm, dd):
    day = synax_day(mm, dd)
    if not day:
        return ""
    for b in day.get("blocks", []):
        x = (b.get("x") or "").strip()
        if b.get("t") in ("intro", "li") and x and not x.startswith("Muaji "):
            x = re.sub(r"^Më \d+ të këtij muaji,\s*", "", x)
            x = re.sub(r"^(nderojmë|kremtojmë|kujtojmë)\s+", "", x, flags=re.I)
            x = re.sub(r"^(gjithë sot,\s*)?(kujtimin e|kujtojmë)\s+", "", x, flags=re.I)
            x = re.split(r"(?<=[a-zëç\)])\.\s|;\s|, (?:i cili|e cila|të cilët|që) ", x)[0].rstrip(".")
            return (x[:1].upper() + x[1:])[:140]
    return ""


def calendar_note(mm, dd):
    try:
        k = json.load(open(os.path.join(ROOT, "data", "kalendari.json"), encoding="utf-8"))["dite"]
        for ym, days in k.items():
            if int(ym.split("-")[1]) == mm:
                for x in days:
                    if x.get("d") == dd:
                        return x.get("x", "")
    except Exception:
        pass
    return ""


def _last_sunday_utc(y, month):
    d = datetime.datetime(y, month, 31 if month in (3, 10) else 30, 1, 0)   # ndërrimi bëhet në 01:00 UTC
    return d - datetime.timedelta(days=(d.weekday() + 1) % 7)


def albania_time(utc):
    """UTC → ora e Shqipërisë (CET +1, verës CEST +2: nga e diela e fundit e marsit te e diela e fundit e tetorit)."""
    summer = _last_sunday_utc(utc.year, 3) <= utc < _last_sunday_utc(utc.year, 10)
    return utc + datetime.timedelta(hours=2 if summer else 1)


def post_date(path):
    """Data e postimit (ora e Shqipërisë). Emrat e instaloader-it: 2026-11-13_23-15-47_UTC[_n]."""
    name = os.path.basename(path)
    m = re.search(r"(20\d\d)-(\d\d)-(\d\d)_(\d\d)-(\d\d)-(\d\d)_UTC", name)
    if m:
        return albania_time(datetime.datetime(*map(int, m.groups()))).date()
    m = re.search(r"(20\d\d)[-_.]?(\d\d)[-_.]?(\d\d)", name)
    if m and 1 <= int(m.group(2)) <= 12 and 1 <= int(m.group(3)) <= 31:
        return datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return datetime.datetime.fromtimestamp(os.path.getmtime(path)).date()


def full_date_of(path):
    return post_date(path).isoformat()


def mmdd_of(path):
    return post_date(path).strftime("%m-%d")


def link_synaxarion():
    d = json.load(open(IMAZHET, encoding="utf-8"))
    imgs = d.setdefault("images", [])
    by_file = {i.get("file"): i for i in imgs}
    changed = 0
    for f in sorted(os.listdir(DST)):
        if not (f.startswith("ig_") and f.lower().endswith(".webp")):
            continue
        rel = "img/apostujt/" + f
        mmdd = mmdd_of(os.path.join(DST, f))
        mm, dd = int(mmdd[:2]), int(mmdd[3:])
        saint = saint_name(mm, dd)
        note = calendar_note(mm, dd)
        im = by_file.get(rel)
        if im is None:
            im = {"file": rel}
            imgs.append(im)
            by_file[rel] = im
        want = {"cat": "apostujt", "date": mmdd, "dita": full_date_of(os.path.join(DST, f)), "sinaksari": True,
                "shenjtori": saint, "title": saint or im.get("title") or "Ikona e ditës"}
        capf = os.path.join(DST, os.path.splitext(f)[0] + ".txt")
        if os.path.exists(capf):
            want["pershkrimi"] = open(capf, encoding="utf-8", errors="replace").read().strip()[:2000]
        if note:
            want["kalendari"] = note
        for k, v in want.items():
            if im.get(k) != v:
                im[k] = v
                changed += 1
        for k in ("author", "license", "source"):
            im.setdefault(k, "")
    # ikonat që s'janë më në dosje hiqen nga lista (vetëm ato ig_ të apostujve)
    before = len(imgs)
    imgs[:] = [i for i in imgs if not (i.get("file", "").startswith("img/apostujt/ig_") and not os.path.exists(os.path.join(ROOT, i["file"])))]
    changed += before - len(imgs)
    if changed:
        json.dump(d, open(IMAZHET, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    r = run([sys.executable, "-I", os.path.join(ROOT, "tools", "build_data.py")], cwd=ROOT)
    if r.returncode:
        raise RuntimeError("build_data: " + r.stderr[-400:])
    n = sum(1 for i in imgs if i.get("sinaksari"))
    log(f"Sinaksari: {n} ikona të lidhura me data, {changed} ndryshime")
    return changed


# ---------------- 3) GitHub Pages ----------------
def fetch_news():
    """Lajme Orthodhokse (UGO.al, KOASH, Orthodox Times) → data/lajme_bota.json"""
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_lajmet
    result = merr_lajmet.main()
    if result:
        log(result)


def fetch_school():
    """Shkolla e Muzikës Bizantine: YouTube + dosja shkolla_e_re → data/shkolla.json"""
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_shkollen
    log(merr_shkollen.main())


def fetch_mitro():
    """Gazetat e Mitropolive: lajmet e KOASH / UGO.al sipas mitropolisë → data/mitropolite.json"""
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_mitropolite
    log(merr_mitropolite.main())


def fetch_live():
    """Shërbesat live: RSS-ja publike e kanalit YouTube të Radio Ngjallja → data/transmetimet.json"""
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_transmetimet
    log(merr_transmetimet.main())


def fetch_kinema():
    """Kinemaja: filmat e autorit + seritë dokumentare të Radio Ngjallja → data/kinema.json"""
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_kinema
    log(merr_kinema.main())


def fetch_titra():
    """Titrat shqip të Kinemasë (subtitles/*.vtt): shkarkim, pastrim, përkthim offline"""
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import titra_shqip
    r = titra_shqip.main()
    if r: log(r)


def _weekly(name):
    """true kur skedari i të dhënave mungon ose është më i vjetër se 7 ditë (arkivat ndryshojnë rrallë)"""
    f = os.path.join(ROOT, "data", name)
    return not os.path.exists(f) or (datetime.datetime.now().timestamp() - os.path.getmtime(f)) > 7 * 86400


def fetch_kerkim():
    """Revista «Kërkim» (KOASH): indeksi + teksti i plotë → data/kerkim.json (një herë në javë)"""
    if not _weekly("kerkim.json"):
        return log("Kërkim: i freskët")
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_kerkim
    merr_kerkim.main()


def fetch_liturgjike():
    """Tekstet liturgjike të KOASH (PDF → tekst me faqosjen tonë) → data/liturgjike.json (një herë në javë)"""
    if not _weekly("liturgjike.json"):
        return log("Tekste liturgjike: të freskëta")
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_liturgjike
    merr_liturgjike.main()


def fetch_kendi_lutjes():
    """«Këndi i Lutjes» i KOASH: shërbesat në rendin dhe me emrat e faqes → data/kendi_lutjes.json (një herë në javë)"""
    if not _weekly("kendi_lutjes.json"):
        return log("Këndi i Lutjes: i freskët")
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_kendi_lutjes
    merr_kendi_lutjes.main()


def fetch_flipbooks():
    """Librat e shërbesave të KOASH: lista → data/flipbooks.json dhe PDF-të që mungojnë → pdf/ (një herë në javë)"""
    if not _weekly("flipbooks.json"):
        return log("Librat e Kishës: të freskët")
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_flipbooks
    merr_flipbooks.main()


def fetch_mujoret():
    """Mujoret (shërbesat e shenjtorëve dhe të festave, tekste të Kishës) → data/mujoret.json; çdo 6 orë"""
    stamp = os.path.join(ROOT, "data", ".mujoret_kontrolli")
    try:
        if time.time() - os.path.getmtime(stamp) < 6 * 3600 - 300:
            return log("Mujoret: të freskëta")
    except OSError:
        pass
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import merr_mujoret
    log(merr_mujoret.main())
    try:
        open(stamp, "w").write(datetime.datetime.now().isoformat(timespec="seconds"))
    except OSError:
        pass


def fetch_koash_new():
    """Kameleoni: zbulon vetë faqet dhe kategoritë e reja të faqes së Kishës që aplikacioni s'i njeh ende
    → data/koash_te_reja.js (aplikacioni i shfaq te «Të reja nga Kisha» dhe i hap si të vetat, me citim)."""
    import urllib.request
    site = "https://orthodoxalbania.org/2026/"
    def get(u):
        req = urllib.request.Request(site + "wp-json/wp/v2/" + u, headers={"User-Agent": "Mozilla/5.0 (compatible; FjalaEShenjte/1.0)"})
        return json.loads(urllib.request.urlopen(req, timeout=60).read().decode("utf-8"))
    app = open(os.path.join(ROOT, "js", "app.js"), encoding="utf-8").read()
    known = set(re.findall(r'"([a-z0-9][a-z0-9\-/]*/)"', app))
    known_slugs = {k.rstrip("/").split("/")[-1] for k in known}
    out = []
    cats = get("categories?per_page=100&hide_empty=true&_fields=id,name,slug,count,link")
    for c in cats:
        if c["slug"] in known_slugs or c["count"] < 4 or re.search(r"^(lajme|news|dizajn|krijues|leximet|bibla|dhiata)|news-|lajme-al", c["slug"]) or "bibla/" in c.get("link", "") or re.search(r"uncategor|pa-kategori|^(en|el|fr|it|de|es|ro|sr|bg|ar|ko|ru)$", c["slug"]):
            continue
        path = c["link"][len(site):] if c["link"].startswith(site) else ""
        if path and not re.match(r"(en|el|fr|it|de|es|ro|sr|bg|ar|ko|ru)/", path):
            out.append({"t": re.sub(r"&amp;", "&", c["name"]), "p": path, "k": "kategori", "n": c["count"]})
    since = (datetime.datetime.utcnow() - datetime.timedelta(days=120)).strftime("%Y-%m-%dT%H:%M:%S")
    for pg in get(f"pages?per_page=50&after={since}&_fields=id,title,link,date,parent"):
        path = pg["link"][len(site):] if pg["link"].startswith(site) else ""
        slug = path.rstrip("/").split("/")[-1]
        if re.search(r"[Ͱ-ۿ฀-￿]", pg["title"]["rendered"]) or re.search(r"-(italian|french|arabic|bulgarian|english|greek|german|spanish|russian|serbian|romanian)$", slug):
            continue
        if not path or slug in known_slugs or re.match(r"(en|el|fr|it|de|es|ro|sr|bg|ar|ko|ru)/", path):
            continue
        out.append({"t": re.sub(r"<[^>]+>|&#\d+;", "", pg["title"]["rendered"]).strip(), "p": path, "k": "faqe", "d": pg["date"][:10]})
    doc = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "items": out[:40]}
    js = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(ROOT, "data", "koash_te_reja.json"), "w", encoding="utf-8").write(js)
    open(os.path.join(ROOT, "data", "koash_te_reja.js"), "w", encoding="utf-8").write('window.FS_DATA=window.FS_DATA||{};FS_DATA["koash_te_reja"]=' + js + ";\n")
    log(f"Kisha · të reja: {len(out)} seksione/faqe që aplikacioni s'i kishte")


# ---------------- Vetë-riparimi: asnjë hap nuk lejohet të prishë të dhënat që punojnë ----------------
GUARD = {"Sinaksari": ["imazhet"], "Lajmet": ["lajme_bota"], "Mitropolitë": ["mitropolite"], "Shkolla": ["shkolla"], "Transmetimet": ["transmetimet"], "Kinemaja": ["kinema"], "Kërkim": ["kerkim"],
         "Tekste liturgjike": ["liturgjike"], "Kisha · të reja": ["koash_te_reja"], "Këndi i Lutjes": ["kendi_lutjes"], "Librat e Kishës": ["flipbooks"], "Mujoret": ["mujoret"]}


def _count(doc):
    """Numëron rekursivisht rekordet, përfshirë artikujt brenda groups[*].items."""
    if isinstance(doc, list):
        return sum(_count(item) for item in doc)
    if isinstance(doc, dict):
        own_record = 1 if ("link" in doc or "file" in doc or ("title" in doc and ("date" in doc or "id" in doc))) else 0
        return own_record + sum(_count(value) for value in doc.values() if isinstance(value, (dict, list)))
    return 0


def snapshot(names):
    snap = {}
    for n in names:
        for ext in (".json", ".js"):
            f = os.path.join(ROOT, "data", n + ext)
            if os.path.exists(f):
                snap[f] = open(f, "rb").read()
    return snap


def verify_or_restore(step, snap):
    """pas çdo hapi: JSON i vlefshëm dhe jo më pak se 40% e sasisë së mëparshme; përndryshe kthehet versioni i mirë"""
    bad = []
    for f, old in snap.items():
        if not f.endswith(".json"):
            continue
        try:
            new = json.load(open(f, encoding="utf-8"))
            if _count(new) < 0.4 * _count(json.loads(old.decode("utf-8"))):
                bad.append(os.path.basename(f) + " (shumë më pak të dhëna)")
        except Exception as e:
            bad.append(os.path.basename(f) + f" ({e.__class__.__name__})")
    if bad:
        for f, old in snap.items():
            open(f, "wb").write(old)
        log(f"Vetë-riparim te {step}: u kthye versioni i mëparshëm për " + ", ".join(bad))
    return not bad


def release_ready():
    """update.json kalon në versionin e ri VETËM kur APK-ja e tij është te GitHub Releases dhe shkarkohet vërtet."""
    try:
        import urllib.request
        m = open(os.path.join(ROOT, "android", "AndroidManifest.xml"), encoding="utf-8").read()
        ver = re.search(r'versionName="([^"]+)"', m).group(1)
        cur = json.load(open(UPD, encoding="utf-8")) if os.path.exists(UPD) else {}
        if cur.get("version") == ver:
            return False
        url = f"https://github.com/Nelo1231/fjala-e-shenjte-live/releases/download/v{ver}/FjalaEShenjte-v{ver}.apk"
        req = urllib.request.Request(url, headers={"User-Agent": "FjalaEShenjte-Sync", "Range": "bytes=0-1023"})
        with urllib.request.urlopen(req, timeout=30) as r:
            head = r.read(4)
            if r.status not in (200, 206) or head[:2] != b"PK":       # APK = arkiv ZIP
                return False
        json.dump({"version": ver, "apk": url}, open(UPD, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        log(f"update.json → {ver} (APK-ja te Releases u verifikua)")
        return True
    except Exception as e:
        log(f"Release {e.__class__.__name__}: APK-ja e versionit të ri ende nuk është te Releases")
        return False


def sync_live():
    """Ndërton versionin e ri veçmas dhe e vendos vetëm pasi kopjimi përfundon."""
    if not os.path.isdir(os.path.join(LIVE, ".git")):
        raise RuntimeError("dist\\github_live nuk është repo git")

    stage = LIVE + ".__stage__"
    backup = LIVE + ".__backup__"
    for path in (stage, backup):
        if os.path.exists(path):
            shutil.rmtree(path, ignore_errors=True)
    os.makedirs(stage, exist_ok=True)

    try:
        for f in ("index.html", "manifest.webmanifest", "sw.js"):
            shutil.copy2(os.path.join(ROOT, f), stage)
        for d in ("css", "js", "icons", "img"):
            shutil.copytree(os.path.join(ROOT, d), os.path.join(stage, d),
                            ignore=shutil.ignore_patterns("*.apk", "*.zip", "__pycache__"))
        data_src = os.path.join(ROOT, "data")
        data_dst = os.path.join(stage, "data")
        os.makedirs(data_dst, exist_ok=True)
        for f in os.listdir(data_src):
            if f.endswith((".js", ".json")):   # edhe JSON-et: sinkronizimi në GitHub (cloud/sinkronizo.py) nis prej tyre
                shutil.copy2(os.path.join(data_src, f), os.path.join(data_dst, f))
        subs = os.path.join(ROOT, "subtitles")   # titrat shqip të Kinemasë
        if os.path.isdir(subs):
            shutil.copytree(subs, os.path.join(stage, "subtitles"))
        pdfs = os.path.join(ROOT, "pdf")   # librat e Kishës (me lejen e saj), që lexuesi i web-it t'i hapë si tonat
        if os.path.isdir(pdfs):
            shutil.copytree(pdfs, os.path.join(stage, "pdf"), ignore=shutil.ignore_patterns("*.part"))
        gazeta = os.path.join(data_src, "gazeta")
        if os.path.isdir(gazeta):
            shutil.copytree(gazeta, os.path.join(data_dst, "gazeta"))

        copy_cloud_tools(os.path.join(stage, "tools"))
        # automatizimi në GitHub (pa të, push-i i radhës do e fshinte workflow-n)
        for d in (".github", "cloud"):
            if os.path.isdir(os.path.join(ROOT, d)):
                shutil.copytree(os.path.join(ROOT, d), os.path.join(stage, d), ignore=shutil.ignore_patterns("__pycache__", "gjendja_*.json"))
        # gjendja që shkruan GitHub-i (kur punoi për herë të fundit, kur thirri Apify-n) mbetet: pa të,
        # push-i i laptopit e fshinte dhe GitHub-i e thërriste Apify-n sikur s'kishte punuar kurrë
        lc = os.path.join(LIVE, "cloud")
        for f in (os.listdir(lc) if os.path.isdir(lc) else []):
            if f.startswith("gjendja_") and f.endswith(".json"):
                os.makedirs(os.path.join(stage, "cloud"), exist_ok=True)
                shutil.copy2(os.path.join(lc, f), os.path.join(stage, "cloud", f))

        release_ready()
        if os.path.exists(UPD):
            shutil.copy2(UPD, os.path.join(stage, "update.json"))
        open(os.path.join(stage, ".nojekyll"), "w").close()
        with open(os.path.join(stage, "README.md"), "w", encoding="utf-8") as f:
            f.write("# Fjala e Shenjtë\n\nVersioni web (GitHub Pages) dhe `update.json`. APK-ja është te **Releases**.\n")

        # Ruaj repo-n .git, ndërsa përmbajtja e faqes ndërrohet atomikisht.
        os.replace(LIVE, backup)
        try:
            os.replace(stage, LIVE)
            os.replace(os.path.join(backup, ".git"), os.path.join(LIVE, ".git"))
        except Exception:
            if os.path.isdir(LIVE):
                shutil.rmtree(LIVE, ignore_errors=True)
            os.replace(backup, LIVE)
            raise
        shutil.rmtree(backup, ignore_errors=True)
    except Exception:
        shutil.rmtree(stage, ignore_errors=True)
        raise


CLOUD_TOOLS = ("auto_sinkronizo.py", "merr_lajmet.py", "merr_mitropolite.py", "merr_shkollen.py", "merr_ngjallja_shkolla.py",
               "merr_ig_shkolla.py", "merr_transmetimet.py", "merr_kinema.py", "kinema_burimet.py", "titra_shqip.py",
               "ortografia_orthodhokse.py", "merr_kerkim.py", "merr_liturgjike.py", "merr_kendi_lutjes.py", "merr_flipbooks.py", "merr_mujoret.py",
               "kinema_katalogu.json", "_kinema_cache.json", "_perkthime.json", "_perkthime_titra.json")


def copy_cloud_tools(dst):
    """Mjetet që i duhen cloud/sinkronizo.py. Çelësi i Apify-t NUK kopjohet: në GitHub vjen nga sekreti APIFY_TOKEN."""
    os.makedirs(dst, exist_ok=True)
    for f in CLOUD_TOOLS:
        src = os.path.join(ROOT, "tools", f)
        if not os.path.exists(src):
            continue
        t = open(src, encoding="utf-8", errors="replace").read()
        t = re.sub(r"(?m)^(\s*)APIFY_TOKEN\s*=\s*[\"']apify_api_\w+[\"']", r'\1APIFY_TOKEN = __import__("os").environ.get("APIFY_TOKEN", "")', t)
        if re.search(r"apify_api_[A-Za-z0-9]{8}", t):
            raise RuntimeError(f"{f}: përmban një çelës Apify; nuk publikohet")
        open(os.path.join(dst, f), "w", encoding="utf-8", newline="").write(t)


# ---------------- Reja: kur GitHub Actions sinkronizon, PC-ja merr të dhënat prej saj dhe nuk i rimerr ----------------
CLOUD_SYNC_STATE = os.path.join(LIVE, "cloud", "gjendja_sinkronizimi.json")
CLOUD_DATA = ("lajme_bota", "mitropolite", "shkolla", "transmetimet", "kinema", "kerkim", "liturgjike", "kendi_lutjes", "flipbooks", "koash_te_reja", "vatikan", "meta_shkolla", "mujoret")
CLOUD_DIRS = (("data", "gazeta"), ("img", "shkolla"), ("img", "mitropolite"), ("subtitles",), ("pdf",))
CLOUD_STEPS = {"Lajmet", "Mitropolitë", "Shkolla", "Transmetimet", "Kinemaja", "Titrat shqip", "Kërkim", "Tekste liturgjike",
               "Këndi i Lutjes", "Librat e Kishës", "Mujoret", "Kisha · të reja"}


def cloud_sync_recent(hours=3):
    try:
        t = json.load(open(CLOUD_SYNC_STATE, encoding="utf-8")).get("kontrolli", "")
        dt = datetime.datetime.fromisoformat(t.replace("Z", "+00:00"))
        return (datetime.datetime.now(datetime.timezone.utc) - dt).total_seconds() < hours * 3600
    except Exception:
        return False


def pull_cloud_data():
    """Tërheq nga GitHub të dhënat që i sinkronizoi reja dhe i vendos te projekti (që push-i i PC-së të mos i kthejë mbrapsht)."""
    if not os.path.isdir(os.path.join(LIVE, ".git")):
        return False
    r = run(["git", "pull", "-q", "--ff-only", "origin", "main"], cwd=LIVE, timeout=600)
    if r.returncode:
        log("Të dhënat nga GitHub: s'u tërhoqën (" + (r.stderr or r.stdout).strip()[-120:] + ")")
    if not cloud_sync_recent():
        return False
    n = 0
    for name in CLOUD_DATA:
        for ext in (".json", ".js"):
            src = os.path.join(LIVE, "data", name + ext)
            if os.path.exists(src):
                shutil.copy2(src, os.path.join(ROOT, "data", name + ext)); n += 1
    for parts in CLOUD_DIRS:
        src = os.path.join(LIVE, *parts)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(ROOT, *parts), dirs_exist_ok=True); n += 1
    for f in ("_perkthime.json", "_perkthime_titra.json", "_kinema_cache.json"):
        src = os.path.join(LIVE, "tools", f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(ROOT, "tools", f))
    log(f"Të dhënat nga GitHub: {n} skedarë/dosje (reja i sinkronizon, PC-ja nuk i rimerr)")
    return True


def push():
    run(["git", "config", "core.autocrlf", "false"], cwd=LIVE)
    if run(["git", "config", "user.email"], cwd=LIVE).returncode:
        run(["git", "config", "user.name", "Minuel"], cwd=LIVE)
        run(["git", "config", "user.email", "minuelkaso@gmail.com"], cwd=LIVE)
    run(["git", "add", "-A"], cwd=LIVE)
    if run(["git", "diff", "--cached", "--quiet"], cwd=LIVE).returncode == 0:
        log("GitHub: asnjë ndryshim")
        return False
    r = run(["git", "commit", "-q", "-m", f"Sinkronizim automatik {datetime.datetime.now():%Y-%m-%d %H:%M}"], cwd=LIVE)
    if r.returncode:
        raise RuntimeError("commit: " + (r.stderr or r.stdout)[-300:])
    for attempt in range(3):
        pr = run(["git", "pull", "--rebase", "-X", "theirs", "origin", "main"], cwd=LIVE, timeout=300)
        if pr.returncode != 0:
            run(["git", "rebase", "--abort"], cwd=LIVE)
            run(["git", "pull", "--no-rebase", "-X", "ours", "--no-edit", "origin", "main"], cwd=LIVE, timeout=300)
        r = run(["git", "push", "-u", "origin", "main"], cwd=LIVE, timeout=1200)
        if r.returncode == 0:
            log("GitHub: push u krye ✓")
            return True
        log(f"GitHub: push dështoi (prova {attempt + 1}): {(r.stderr or r.stdout).strip()[-200:]}")
    raise RuntimeError("push dështoi (pa internet ose pa hyrje në GitHub)")


def _single():
    """True kur ky është i vetmi sinkronizim që punon; një bllokim më i vjetër se 50 min konsiderohet i mbetur."""
    os.makedirs(os.path.dirname(LOCK), exist_ok=True)
    for _ in range(2):
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            os.close(fd)
            return True
        except FileExistsError:
            try:
                if time.time() - os.path.getmtime(LOCK) > 50 * 60:
                    os.remove(LOCK)
                    continue
            except OSError:
                pass
            return False
    return False


def _laptop_token():
    """Çelësi i Apify-t që përdor merr_sot.py në këtë laptop (lexohet vetëm në kujtesë, nuk shkruhet askund)."""
    if os.environ.get("APIFY_TOKEN", "").strip():
        return
    try:
        m = re.search(r"APIFY_TOKEN\s*=\s*[\"']([A-Za-z0-9_]{20,})[\"']", open(IG_SCRIPT, encoding="utf-8-sig").read())
        if m:
            os.environ["APIFY_TOKEN"] = m.group(1)
    except OSError:
        pass


def main():
    if not _single():
        log("Një sinkronizim tjetër po punon; ky anashkalohet")
        return 0
    try:
        return _main()
    finally:
        try:
            os.remove(LOCK)
        except OSError:
            pass


def _main():
    dite = 1
    if "--dite" in sys.argv:
        dite = max(1, int(sys.argv[sys.argv.index("--dite") + 1]))
    apify = apify_due() or "--dite" in sys.argv or "--apify" in sys.argv
    if not apify:
        os.environ["FS_PA_APIFY"] = "1"          # merr_shkollen: pa Facebook-un me Apify këtë herë
    else:
        _laptop_token()                          # merr_mitropolite: postimet e reja të faqeve të mitropolive në Facebook
    log(f"=== Sinkronizimi nis ({dite} ditë) ===" + ("" if apify else " · pa Apify"))
    if apify:
        os.makedirs(os.path.dirname(APIFY_STAMP), exist_ok=True)
        with open(APIFY_STAMP, "w", encoding="utf-8") as f:
            f.write(datetime.datetime.now().isoformat(timespec="seconds"))
    ok = True
    cloud = False
    try:
        cloud = pull_cloud_data()
    except Exception as e:
        log(f"Të dhënat nga GitHub: GABIM {e}")
    for name, fn in (("Ikonat nga GitHub", pull_cloud), ("Instagram", lambda: fetch_instagram(dite, apify)), ("Ikonat e reja", import_new), ("Sinaksari", link_synaxarion), ("Lajmet", fetch_news), ("Mitropolitë", fetch_mitro), ("Shkolla", fetch_school), ("Transmetimet", fetch_live), ("Kinemaja", fetch_kinema), ("Titrat shqip", fetch_titra),
                     ("Kërkim", fetch_kerkim), ("Tekste liturgjike", fetch_liturgjike), ("Këndi i Lutjes", fetch_kendi_lutjes), ("Librat e Kishës", fetch_flipbooks), ("Mujoret", fetch_mujoret), ("Kisha · të reja", fetch_koash_new), ("Faqja web", sync_live), ("GitHub", push)):
        if cloud and name in CLOUD_STEPS:
            continue
        if name in ("Faqja web", "GitHub") and not ok:
            log(f"{name}: u anashkalua sepse një hap i mëparshëm dështoi")
            continue
        snap = snapshot(GUARD.get(name, []))
        try:
            res = fn()
            if snap and not verify_or_restore(name, snap):
                ok = False
            if name == "Ikonat e reja":
                log(f"Ikonat e reja: {res}")
        except Exception as e:
            ok = False
            log(f"GABIM te {name}: {e}")
            log(traceback.format_exc().strip().splitlines()[-1])
            if snap:
                for f, old in snap.items():
                    open(f, "wb").write(old)
                log(f"Vetë-riparim te {name}: të dhënat e mëparshme u ruajtën")
            if name in ("Instagram", "Sinaksari", "Lajmet", "Shkolla", "Mitropolitë", "Kërkim", "Tekste liturgjike", "Këndi i Lutjes", "Kisha · të reja"):
                continue
    log("=== Mbaroi " + ("me sukses ✓" if ok else "me gabime (shih më sipër)") + " ===")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
