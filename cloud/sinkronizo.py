r"""Sinkronizimi i plotë në GitHub Actions (punon edhe me PC-në të fikur).

Bën të njëjtat hapa të të dhënave si tools\auto_sinkronizo.py në PC, mbi kopjen e faqes në GitHub:
lajmet dhe gazetat, mitropolitë, Shkolla e Muzikës, transmetimet, Kinemaja dhe titrat shqip, Kërkim,
tekstet liturgjike, Këndi i Lutjes, librat e Kishës (PDF) dhe faqet e reja të Kishës.
Ikonat e ditës i merr workflow-i tjetër (ikonat.yml + cloud/ikonat.py).

- Çdo hap ka vetë-riparimin e PC-së: po t'i prishë ose t'i pakësojë shumë të dhënat, kthehet versioni i mëparshëm.
- Apify (Instagram-i i Shkollës) vetëm 4 herë në ditë, njëlloj si në PC; çelësi vjen nga sekreti APIFY_TOKEN.
- Facebook-u i mitropolive dhe i Radio Ngjallja: çdo orë gjatë ditës, vetëm postimet pas kontrollit të fundit,
  me kufirin e buxhetit mujor të Apify (merr_mitropolite._apify_budget).
- Në fund shkruan cloud/gjendja_sinkronizimi.json: PC-ja e lexon dhe nuk i bën më vetë këta hapa.
"""
import datetime, json, os, sys, traceback

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
os.environ["FS_CLOUD"] = "1"

import auto_sinkronizo as A   # noqa: E402  (ROOT i tij = rrënja e kësaj kopjeje)

A.LOG = os.path.join(os.environ.get("RUNNER_TEMP", "/tmp"), "sinkronizimi.log")   # log-u nuk ruhet në repo
STATE = os.path.join(ROOT, "cloud", "gjendja_sinkronizimi.json")
APIFY_HOURS = {4, 10, 16, 22}   # UTC, si ikonat
FB_HOURS = set(range(4, 22))     # UTC (05/06–22/23 në Shqipëri): postimet e reja të Facebook-ut çdo orë, brenda buxhetit


def mitro():
    # mitropolitë + Facebook-u i mitropolive dhe i Radio Ngjallja: Apify vetëm në orët e tij (main() e heq token-in jashtë tyre),
    # dhe vetëm për postimet e reja
    A.fetch_mitro()


STEPS = [("Lajmet", A.fetch_news), ("Mitropolitë", mitro), ("Shkolla", A.fetch_school), ("Transmetimet", A.fetch_live),
         ("Kinemaja", A.fetch_kinema), ("Titrat shqip", A.fetch_titra), ("Kërkim", A.fetch_kerkim),
         ("Tekste liturgjike", A.fetch_liturgjike), ("Këndi i Lutjes", A.fetch_kendi_lutjes),
         ("Librat e Kishës", A.fetch_flipbooks), ("Mujoret", A.fetch_mujoret), ("Kisha · të reja", A.fetch_koash_new)]


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    apify = now.hour in APIFY_HOURS or os.environ.get("FS_APIFY") == "1"
    if now.hour in FB_HOURS and os.environ.get("APIFY_TOKEN"):
        os.environ["FS_FB_TOKEN"] = os.environ["APIFY_TOKEN"]   # vetëm për Facebook-un e mitropolive (paguhet vetëm postimi i ri)
    if not apify:
        os.environ["FS_PA_APIFY"] = "1"
        os.environ.pop("APIFY_TOKEN", None)
    A.log(f"=== Sinkronizimi në GitHub nis ({now:%Y-%m-%d %H:%M} UTC)" + ("" if apify else " · pa Apify") + " ===")
    done, failed = [], []
    for name, fn in STEPS:
        snap = A.snapshot(A.GUARD.get(name, []))
        try:
            fn()
            if snap and not A.verify_or_restore(name, snap):
                failed.append(name)
            else:
                done.append(name)
        except Exception as e:
            failed.append(name)
            A.log(f"GABIM te {name}: {e}")
            A.log(traceback.format_exc().strip().splitlines()[-1])
            for f, old in snap.items():
                open(f, "wb").write(old)
    state = {"kontrolli": now.isoformat(timespec="seconds").replace("+00:00", "Z"), "hapat": done, "gabime": failed}
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    json.dump(state, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    A.log("=== Mbaroi: " + (f"{len(done)} hapa ✓" + (f" · gabime te {', '.join(failed)}" if failed else "")) + " ===")
    # gabimi i një hapi nuk e ndal publikimin e të tjerëve (të dhënat e prishura janë kthyer më lart)
    return 0


if __name__ == "__main__":
    sys.exit(main())
