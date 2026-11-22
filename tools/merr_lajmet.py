# -*- coding: utf-8 -*-
r"""Lajme Orthodhokse + Zyrtarët e Kishave: mbledh lajme nga burime shqip (UGO.al, KOASH)
dhe ndërkombëtare (2-3 linqe për kishë), pa dublikime, dhe ruan zyrtarët/primatët te data\zyrtaret_kishave.json (+ .js)."""
import datetime, email.utils, hashlib, html, json, os, re, sys, unicodedata, urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "lajme_bota.json")
OUT_JS = os.path.join(ROOT, "data", "lajme_bota.js")
OFFICIALS_JSON = os.path.join(ROOT, "data", "zyrtaret_kishave.json")
OFFICIALS_JS = os.path.join(ROOT, "data", "zyrtaret_kishave.js")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
PER = 25
MAX_EX = 280

CHURCH_OFFICIALS = [
    {
        "id": "albania_koash",
        "church": "Kisha Orthodhokse Autoqefale e Shqipërisë (KOASH)",
        "jurisdiction": "Autoqefale · Shqipëri",
        "primacy_role": "Kryepiskop i Tiranës, Durrësit dhe i Gjithë Shqipërisë",
        "primate": "Fortlumturia e Tij Joani (Pelushi)",
        "seat": "Tiranë, Shqipëri",
        "website": "https://orthodoxalbania.org/2026/"
    },
    {
        "id": "ecumenical_patriarchate",
        "church": "Patriarkana Ekumenike e Kostandinopojës",
        "jurisdiction": "Patriarkanë Ekumenike",
        "primacy_role": "Kryepiskop i Kostandinopojës, i Ri në Romë dhe Patriark Ekumenik",
        "primate": "Tërëshenjtëria e Tij Bartolomeu I",
        "seat": "Fanar, Stamboll, Turqi",
        "website": "https://ec-patr.org/"
    },
    {
        "id": "alexandria",
        "church": "Patriarkana e Aleksandrisë dhe e Gjithë Afrikës",
        "jurisdiction": "Patriarkanë e Lashtë",
        "primacy_role": "Papë dhe Patriark i Madh i Aleksandrisë dhe i Gjithë Afrikës",
        "primate": "Fortlumturia e Tij Theodhori II",
        "seat": "Aleksandri, Egjipt",
        "website": "https://www.patriarchateofalexandria.com/"
    },
    {
        "id": "antioch",
        "church": "Patriarkana e Madhërishme e Antiokisë dhe e Gjithë Lindjes",
        "jurisdiction": "Patriarkanë e Lashtë",
        "primacy_role": "Patriark i Antiokisë dhe i Gjithë Lindjes",
        "primate": "Fortlumturia e Tij Gjoni X (Yazigi)",
        "seat": "Damask, Siri",
        "website": "https://www.antiochpatriarchate.org/en"
    },
    {
        "id": "jerusalem",
        "church": "Patriarkana e Jerusalemit",
        "jurisdiction": "Patriarkanë e Lashtë",
        "primacy_role": "Patriark i Qytetit të Shenjtë të Jerusalemit dhe i Gjithë Palestinës",
        "primate": "Fortlumturia e Tij Theofili III",
        "seat": "Jerusalem",
        "website": "https://en.jerusalem-patriarchate.info/"
    },
    {
        "id": "romania",
        "church": "Kisha Orthodhokse Rumune",
        "jurisdiction": "Patriarkanë",
        "primacy_role": "Kryepiskop i Bukureshtit, Metropolit i Muntenisë dhe Dobruxhës dhe Patriark i Gjithë Rumanisë",
        "primate": "Fortlumturia e Tij Danieli",
        "seat": "Bukuresht, Rumani",
        "website": "https://basilica.ro/en/"
    },
    {
        "id": "serbia",
        "church": "Kisha Orthodhokse Serbe",
        "jurisdiction": "Patriarkanë",
        "primacy_role": "Kryepiskop i Pejës, Metropolit i Beogradit dhe Karlovcit dhe Patriark Serb",
        "primate": "Shenjtëria e Tij Porfirije",
        "seat": "Beograd, Serbi",
        "website": "https://spc.rs/"
    },
    {
        "id": "georgia",
        "church": "Kisha Apostolike Autoqefale Orthodhokse e Gjeorgjisë",
        "jurisdiction": "Patriarkanë",
        "primacy_role": "Kryepiskop i Mtskhetës-Tbilisit dhe Katolikos-Patriark i Gjithë Gjeorgjisë",
        "primate": "Shenjtëria dhe Lumturia e Tij Ilia II",
        "seat": "Tbilisi, Gjeorgji",
        "website": "https://patriarchate.ge/"
    },
    {
        "id": "bulgaria",
        "church": "Kisha Orthodhokse Bullgare",
        "jurisdiction": "Patriarkanë",
        "primacy_role": "Metropolit i Sofjes dhe Patriark i Gjithë Bullgarisë",
        "primate": "Shenjtëria e Tij Daniil",
        "seat": "Sofje, Bullgari",
        "website": "https://bg-patriarshia.bg/"
    },
    {
        "id": "moscow",
        "church": "Patriarkana e Moskës",
        "jurisdiction": "Patriarkanë",
        "primacy_role": "Patriark i Moskës dhe i Gjithë Rusisë",
        "primate": "Shenjtëria e Tij Kirili",
        "seat": "Moskë",
        "website": "https://www.patriarchia.ru/"
    },
    {
        "id": "greece",
        "church": "Kisha e Greqisë",
        "jurisdiction": "Autoqefale",
        "primacy_role": "Kryepiskop i Athinës dhe i Gjithë Greqisë",
        "primate": "Fortlumturia e Tij Jeronimi II",
        "seat": "Athinë, Greqi",
        "website": "https://www.ecclesia.gr/"
    },
    {
        "id": "cyprus",
        "church": "Kisha e Qipros",
        "jurisdiction": "Autoqefale",
        "primacy_role": "Kryepiskop i Nea Justiniana-s dhe i Gjithë Qipros",
        "primate": "Fortlumturia e Tij Gjergji III",
        "seat": "Nikozia, Qipro",
        "website": "https://churchofcyprus.org.cy/"
    },
    {
        "id": "poland",
        "church": "Kisha Orthodhokse Autoqefale e Polonisë",
        "jurisdiction": "Autoqefale",
        "primacy_role": "Metropolit i Varshavës dhe i Gjithë Polonisë",
        "primate": "Fortlumturia e Tij Sava",
        "seat": "Varshavë, Poloni",
        "website": "https://www.orthodox.pl/"
    },
    {
        "id": "czech_slovakia",
        "church": "Kisha Orthodhokse e Tokave Çeke dhe Sllovakisë",
        "jurisdiction": "Autoqefale",
        "primacy_role": "Kryepiskop i Pragas dhe Metropolit i Tokave Çeke dhe Sllovakisë",
        "primate": "Fortlumturia e Tij Rastislav",
        "seat": "Pragë / Presov",
        "website": "https://www.pravoslavnacirkev.cz/"
    },
    {
        "id": "oca",
        "church": "Kisha Orthodhokse në Amerikë (OCA)",
        "jurisdiction": "Autoqefale",
        "primacy_role": "Kryepiskop i Uashingtonit, Metropolit i Gjithë Amerikës dhe Kanadasë",
        "primate": "Fortlumturia e Tij Tikoni",
        "seat": "SHBA / Kanada",
        "website": "https://www.oca.org/"
    },
    {
        "id": "goarch",
        "church": "Kryepiskopata Greke Orthodhokse e Amerikës (GOARCH)",
        "jurisdiction": "Juridiksion i Patriarkanës Ekumenike",
        "primacy_role": "Kryepiskop i Amerikës",
        "primate": "Hirësia e Tij Elpidofori",
        "seat": "Nju Jork, SHBA",
        "website": "https://www.goarch.org/"
    }
]

SOURCES = [
    # Shqipëri (UGO.al + KOASH + burime shqip)
    {"id": "ugo_main", "name": "UGO.al · Lajme", "home": "https://ugo.al/al/", "grp": "ugo", "lang": "sq", "kind": "rss", "url": "https://ugo.al/al/rss", "per": 50},
    {"id": "ugo_al_1", "name": "UGO.al · Shqipëri", "home": "https://ugo.al/al/", "grp": "ugo", "lang": "sq", "kind": "rss", "url": "https://ugo.al/al/category/shqiperi/feed/", "per": 40},
    {"id": "ugo_al_2", "name": "UGO.al · Kisha në Shqipëri", "home": "https://ugo.al/al/", "grp": "ugo", "lang": "sq", "kind": "rss", "url": "https://ugo.al/al/category/kisha-ne-shqiperi/feed/", "per": 40},
    {"id": "ugo_al_3", "name": "UGO.al · Mitropolitë", "home": "https://ugo.al/al/", "grp": "ugo", "lang": "sq", "kind": "rss", "url": "https://ugo.al/al/category/mitropolite/feed/", "per": 40},
    {"id": "koash", "name": "KOASH · orthodoxalbania.org", "home": "https://orthodoxalbania.org/2026/", "grp": "koash", "lang": "sq", "kind": "wp",
     "per": 50,
     "url": "https://orthodoxalbania.org/2026/wp-json/wp/v2/posts?per_page=100&_embed=wp:featuredmedia&_fields=id,date,link,title,excerpt,content,_links,_embedded"},
    {"id": "koash_rss", "name": "KOASH · RSS", "home": "https://orthodoxalbania.org/2026/", "grp": "koash", "lang": "sq", "kind": "rss",
     "url": "https://orthodoxalbania.org/2026/feed/", "per": 30},

    # UGO.al për Kishat e tjera & Bota
    {"id": "ugo_bota", "name": "UGO.al · Bota Orthodhokse", "home": "https://ugo.al/al/", "grp": "ugo", "lang": "sq", "kind": "rss", "url": "https://ugo.al/al/category/bota/feed/", "per": 40},
    {"id": "ugo_patr", "name": "UGO.al · Patriarkanat & Kisha", "home": "https://ugo.al/al/", "grp": "ugo", "lang": "sq", "kind": "rss", "url": "https://ugo.al/al/category/patriarkanat/feed/", "per": 40},
    {"id": "ugo_studime", "name": "UGO.al · Studime & Tekste", "home": "https://ugo.al/al/", "grp": "ugo", "lang": "sq", "kind": "rss", "url": "https://ugo.al/al/category/studime/feed/", "per": 30},

    # Patriarkana Ekumenike (3 burime)
    {"id": "ecp_1", "name": "Patriarkana Ekumenike · Faqja Zyrtare", "home": "https://ec-patr.org/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://ec-patr.org/en/feed/", "per": 25, "only_en": True},
    {"id": "ecp_2", "name": "Patriarkana Ekumenike · Orthodox Times", "home": "https://orthodoxtimes.com/category/ecumenical-patriarchate/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/ecumenical-patriarchate/feed/", "per": 25},
    {"id": "ecp_3", "name": "Patriarkana Ekumenike · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/ecumenical-patriarchate/feed/", "per": 25},

    # Patriarkana e Aleksandrisë (2 burime)
    {"id": "alx_1", "name": "Patriarkana e Aleksandrisë · Faqja Zyrtare", "home": "https://www.patriarchateofalexandria.com/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://www.patriarchateofalexandria.com/feed/?lang=en", "per": 25, "only_en": True},
    {"id": "alx_2", "name": "Patriarkana e Aleksandrisë · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-alexandria/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-alexandria/feed/", "per": 25},

    # Patriarkana e Antiokisë (2 burime)
    {"id": "ant_1", "name": "Patriarkana e Antiokisë · Faqja Zyrtare", "home": "https://www.antiochpatriarchate.org/en", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://www.antiochpatriarchate.org/en/rss", "per": 25, "only_en": True},
    {"id": "ant_2", "name": "Patriarkana e Antiokisë · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-antioch/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-antioch/feed/", "per": 25},

    # Patriarkana e Jerusalemit (3 burime)
    {"id": "jer_1", "name": "Patriarkana e Jerusalemit · Faqja Zyrtare", "home": "https://en.jerusalem-patriarchate.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://en.jerusalem-patriarchate.info/feed/", "per": 25, "only_en": True},
    {"id": "jer_2", "name": "Patriarkana e Jerusalemit · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-jerusalem/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-jerusalem/feed/", "per": 25},
    {"id": "jer_3", "name": "Patriarkana e Jerusalemit · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/jerusalem/feed/", "per": 25},

    # Patriarkana Rumune (3 burime)
    {"id": "basil_1", "name": "Patriarkana Rumune · Basilica EN", "home": "https://basilica.ro/en/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://basilica.ro/en/feed/", "per": 30},
    {"id": "basil_2", "name": "Patriarkana Rumune · Basilica RO", "home": "https://basilica.ro/", "grp": "patr", "lang": "ro", "kind": "rss",
     "url": "https://basilica.ro/feed/", "per": 25},
    {"id": "rom_ot", "name": "Patriarkana Rumune · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-romania/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-romania/feed/", "per": 25},

    # Patriarkana e Serbisë (2 burime)
    {"id": "srb_1", "name": "Patriarkana e Serbisë · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-serbia/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-serbia/feed/", "per": 30},
    {"id": "srb_2", "name": "Patriarkana e Serbisë · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/serbia/feed/", "per": 25},

    # Patriarkana e Gjeorgjisë (2 burime)
    {"id": "geo_1", "name": "Patriarkana e Gjeorgjisë · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-georgia/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-georgia/feed/", "per": 30},
    {"id": "geo_2", "name": "Patriarkana e Gjeorgjisë · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/georgia/feed/", "per": 25},

    # Patriarkana e Bullgarisë (2 burime)
    {"id": "bul_1", "name": "Patriarkana e Bullgarisë · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-bulgaria/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-bulgaria/feed/", "per": 30},
    {"id": "bul_2", "name": "Patriarkana e Bullgarisë · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/bulgaria/feed/", "per": 25},

    # Patriarkana e Moskës (2 burime)
    {"id": "mos_1", "name": "Patriarkana e Moskës · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-moscow/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/patriarchates/patriarchate-of-moscow/feed/", "per": 30},
    {"id": "mos_2", "name": "Patriarkana e Moskës · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/russia/feed/", "per": 25},

    # Kisha e Greqisë (3 burime)
    {"id": "gre_1", "name": "Kisha e Greqisë · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/churches/church-of-greece/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/churches/church-of-greece/feed/", "per": 30},
    {"id": "gre_2", "name": "Kisha e Greqisë · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/greece/feed/", "per": 25},
    {"id": "gre_3", "name": "Kisha e Greqisë · Romfea", "home": "https://www.romfea.gr/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://www.romfea.gr/feed", "per": 25},

    # Kisha e Qipros (2 burime)
    {"id": "cyp_1", "name": "Kisha e Qipros · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/churches/church-of-cyprus/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/churches/church-of-cyprus/feed/", "per": 30},
    {"id": "cyp_2", "name": "Kisha e Qipros · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/cyprus/feed/", "per": 25},

    # Kisha e Polonisë & Çekisë-Sllovakisë
    {"id": "pol_1", "name": "Kisha e Polonisë · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/churches/church-of-poland/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/churches/church-of-poland/feed/", "per": 30},
    {"id": "pol_2", "name": "Kisha e Polonisë · Orthodoxia.info", "home": "https://orthodoxia.info/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/category/poland/feed/", "per": 25},
    {"id": "cze_1", "name": "Kisha e Çekisë dhe Sllovakisë · Orthodox Times", "home": "https://orthodoxtimes.com/category/orthodoxy/churches/church-of-czech-and-slovakia/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/orthodoxy/churches/church-of-czech-and-slovakia/feed/", "per": 30},

    # OCA & GOARCH & Bota
    {"id": "oca_1", "name": "OCA · Kisha Orthodhokse në Amerikë", "home": "https://www.oca.org/", "grp": "bota", "lang": "en", "kind": "rss",
     "url": "https://www.oca.org/news/rss", "per": 30},
    {"id": "goarch_1", "name": "GOARCH · Kryepiskopata e Amerikës", "home": "https://www.goarch.org/", "grp": "bota", "lang": "en", "kind": "rss",
     "url": "https://www.goarch.org/-/rss/news", "per": 30},
    {"id": "goa_2", "name": "Kryepiskopata e Amerikës · Orthodox Times", "home": "https://orthodoxtimes.com/category/archdiocese-of-america/", "grp": "patr", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/category/archdiocese-of-america/feed/", "per": 30},
    {"id": "ot_main", "name": "Orthodox Times · Kryesore", "home": "https://orthodoxtimes.com/", "grp": "bota", "lang": "en", "kind": "rss",
     "url": "https://orthodoxtimes.com/feed/", "per": 30},
    {"id": "orthinfo_main", "name": "Orthodoxia.info · Kryesore", "home": "https://orthodoxia.info/", "grp": "bota", "lang": "en", "kind": "rss",
     "url": "https://orthodoxia.info/feed/", "per": 25},

    # Studime, teologji, art
    {"id": "po", "name": "Public Orthodoxy · Fordham University", "home": "https://publicorthodoxy.org/", "grp": "studime", "lang": "en", "kind": "rss",
     "url": "https://publicorthodoxy.org/feed/", "per": 25},
    {"id": "pem", "name": "Pemptousia", "home": "https://pemptousia.com/", "grp": "studime", "lang": "en", "kind": "rss",
     "url": "https://pemptousia.com/feed/", "per": 30},
    {"id": "oaj", "name": "Orthodox Arts Journal", "home": "https://orthodoxartsjournal.org/", "grp": "studime", "lang": "en", "kind": "rss",
     "url": "https://orthodoxartsjournal.org/feed/", "per": 25},
    {"id": "ancientfaith", "name": "Ancient Faith · Blogs & Reflection", "home": "https://blogs.ancientfaith.com/", "grp": "studime", "lang": "en", "kind": "rss",
     "url": "https://blogs.ancientfaith.com/feed/", "per": 25},
]

NS = {"content": "http://purl.org/rss/1.0/modules/content/", "media": "http://search.yahoo.com/mrss/"}
HIDE_RX = [re.compile(r"inagurimin-e-godines-se-re-te-shkolles-se-muzikes-bizantine", re.I)]

def scrub_hidden(doc):
    """Heq artikujt me lidhje që përputhen me HIDE_RX."""
    def walk(value):
        if isinstance(value, dict):
            for key, child in list(value.items()):
                value[key] = walk(child)

        elif isinstance(value, list):
            cleaned = []

            for item in value:
                if isinstance(item, dict):
                    link = item.get("link") or ""

                    if isinstance(link, dict):
                        link = link.get("url") or link.get("href") or ""

                    link = str(link)

                    if any(rx.search(link) for rx in HIDE_RX):
                        continue

                cleaned.append(walk(item))

            value[:] = cleaned

        return value

    return walk(doc)

NONLAT = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff\u0400-\u052f\u0530-\u08ff\u0e00-\u0eff\u3000-\uffef]")
JUNK = re.compile(r"[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f]")
RO = re.compile(
    r"[\u0103\u00e2\u00ee\u0219\u021b\u015f\u0163]|"
    r"\b(pentru|\u0219i|bisericesc|patriarhal|Preafericitul|sf\u00e2nt)\b",
    re.I,
)


def _beat(m):
    low = m.group(0).lower()
    before = m.string[max(0, m.start() - 6):m.start()]
    if re.search(r"(?:^|\s)(e|i|të|së|tek|te)\s$", before, re.I) or low.endswith(("it", "ës", "es")):
        return "Fortlumturis\u00eb"
    if low.endswith(("in", "inë", "en")):
        return "Fortlumturin\u00eb"
    return "Fortlumturia"


HIER_TERMS = [
    (re.compile(r"\bHis Beatitudes?\b"), "Fortlumturia e Tij"),
    (re.compile(r"\bbeatitud\w*", re.I), lambda m: _beat(m).upper() if m.group(0).isupper() else _beat(m)),
    (re.compile(r"\bHis All[- ]Holiness\b"), "T\u00ebr\u00ebshenjt\u00ebria e Tij"),
    (re.compile(r"\bAll[- ]Holiness\b"), "T\u00ebr\u00ebshenjt\u00ebria"),
    (re.compile(r"\bHis Holiness\b"), "Shenjt\u00ebria e Tij"),
    (re.compile(r"\bHis Eminence\b"), "Hir\u00ebsia e Tij"),
    (re.compile(r"\bHis Grace\b"), "Hir\u00ebsia e Tij"),
    (re.compile(r"\bMezh\b"), "Mesazh"),
    (re.compile(r"\bmezh\b"), "mesazh"),
    (re.compile(r"\b[Cc]hurchtar(\w*)"), lambda m: "kishtar" + m.group(1)),
]

def fix_hier(t):
    if not isinstance(t, str) or not t:
        return t
    for rx, to in HIER_TERMS:
        t = rx.sub(to, t)
    return t

def clean_text(raw):
    if not raw:
        return ""
    s = html.unescape(str(raw))
    s = re.sub(r"<[^>]+>", " ", s)
    s = JUNK.sub("", s)
    s = re.sub(r"\s+", " ", s).strip()
    return fix_hier(s)

def shorten(txt, limit=MAX_EX):
    txt = (txt or "").strip()
    if len(txt) <= limit:
        return txt
    cut = txt[:limit].rsplit(" ", 1)[0].strip()
    return (cut or txt[:limit]).rstrip(".,;:") + "…"

def parse_date(val):
    if not val:
        return ""
    s = str(val).strip()
    try:
        dt = email.utils.parsedate_to_datetime(s)
        return dt.astimezone(datetime.timezone.utc).isoformat()
    except Exception:
        pass
    try:
        dt = datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.astimezone(datetime.timezone.utc).isoformat()
    except Exception:
        return s

def fetch_url(url, timeout=25):
    req = urllib.request.Request(
        url,
        headers={
            # UGO.al refuzon agjentët që shtiren si shfletues; një lexues RSS i thjeshtë lejohet
            "User-Agent": "FjalaEShenjte-RSS/1.0" if "ugo.al" in url else UA,
            "Accept": "application/rss+xml, application/xml, application/json, text/html;q=0.9, */*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,sq;q=0.8",
            "Referer": url,
        }
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def get(url, timeout=25):
    """Shkarkon URL dhe kthen tekst UTF-8; ndërfaqe e përbashkët për modulet e tjera."""
    return fetch_url(url, timeout=timeout).decode("utf-8-sig", errors="replace")


def text(raw):
    return clean_text(raw)


def short(value, limit=MAX_EX):
    return shorten(value, limit)


def iso(value):
    return parse_date(value)


def iso_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def all_imgs(raw_html, featured=""):
    """Nxjerr URL-të e imazheve nga HTML-ja, pa dublikime."""
    source = html.unescape(str(raw_html or ""))
    found = []
    if featured:
        found.append(str(featured).strip())
    for match in re.findall(
        r"(?is)<img\b[^>]*(?:src|data-src|data-lazy-src)\s*=\s*['\"]([^'\"]+)['\"][^>]*>",
        source,
    ):
        if match.startswith(("http://", "https://")) and match not in found:
            found.append(match)
    for srcset in re.findall(r"(?is)srcset\s*=\s*['\"]([^'\"]+)['\"]", source):
        for candidate in srcset.split(","):
            url = candidate.strip().split(" ")[0]
            if url.startswith(("http://", "https://")) and url not in found:
                found.append(url)
    return found[:20]


def first_img(raw_html):
    images = all_imgs(raw_html)
    return images[0] if images else ""

def _norm_key(title, link):
    t = unicodedata.normalize("NFKD", (title or "").lower())
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = re.sub(r"[^a-z0-9\s]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    u = (link or "").strip().rstrip("/").lower()
    u = re.sub(r"^https?://(www\.)?", "", u)
    return t, u

MAX_TEXT = 12000


def full_text(raw_html):
    """I gjithë shkrimi si paragrafë të thjeshtë (pa HTML, pa skripte)."""
    src = str(raw_html or "")
    src = re.sub(r"(?is)<(script|style|figure|figcaption|iframe|noscript)\b.*?</\1>", " ", src)
    paras = [clean_text(t) for _tag, t in re.findall(r"(?is)<(p|h[2-5]|blockquote|li)\b[^>]*>(.*?)</\1>", src)]
    if sum(len(t) for t in paras) < 200:
        b2 = re.sub(r"(?i)<br\s*/?>|</div>|</h\d>|</p>", "\n\n", src)
        paras = [clean_text(t) for t in re.split(r"\n\s*\n", b2)]
    return "\n\n".join(t for t in paras if len(t) > 2)[:MAX_TEXT]


def photos(raw_html, featured=""):
    """Të gjitha fotot e shkrimit, një herë secila (madhësia më e madhe nga srcset)."""
    source = html.unescape(str(raw_html or ""))
    out, keys = [], set()

    def add(u):
        if not u.startswith(("http://", "https://")):
            return
        k = re.sub(r"-\d{2,4}x\d{2,4}(?=\.\w+$)", "", u.split("?")[0])
        if k in keys:
            return
        keys.add(k)
        out.append(u)

    if featured:
        add(str(featured).strip())
    for tag in re.findall(r"(?is)<img\b[^>]*>", source):
        best, bw = "", -1
        ss = re.search(r"(?is)srcset\s*=\s*['\"]([^'\"]+)['\"]", tag)
        if ss:
            for c in ss.group(1).split(","):
                parts = c.strip().split()
                w = int(re.sub(r"\D", "", parts[1]) or 0) if len(parts) > 1 else 0
                if parts and w > bw:
                    best, bw = parts[0], w
        if not best:
            m = re.search(r"(?is)(?:data-src|data-lazy-src|src)\s*=\s*['\"]([^'\"]+)['\"]", tag)
            best = m.group(1) if m else ""
        add(best)
    return out[:40]


def deduplicate_articles(articles):
    seen_titles = set()
    seen_urls = set()
    unique = []
    for art in (articles or []):
        if not isinstance(art, dict):
            continue
        t_key, u_key = _norm_key(art.get("title", ""), art.get("link", ""))
        t_hash = hashlib.md5(t_key.encode("utf-8")).hexdigest() if t_key else ""
        if (u_key and u_key in seen_urls) or (t_hash and t_hash in seen_titles):
            continue
        if u_key:
            seen_urls.add(u_key)
        if t_hash:
            seen_titles.add(t_hash)
        unique.append(art)
    return unique

def _first(el, *tags):
    """Elementi i parë që ekziston (një element pa fëmijë është «false» në Python, ndaj jo `or`)."""
    for t in tags:
        x = el.find(t)
        if x is not None:
            return x
    return None


def from_rss(src):
    limit = int(src.get("per") or PER)
    raw = fetch_url(src["url"])
    root = ET.fromstring(raw)
    entries = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    out = []
    for el in entries[:limit]:
        title_el = _first(el, "title", "{http://www.w3.org/2005/Atom}title")
        title = clean_text(title_el.text if title_el is not None else "")
        if not title:
            continue
        link = ""
        link_el = el.find("link")
        if link_el is not None:
            link = (link_el.text or link_el.attrib.get("href") or "").strip()
        if not link:
            atom_link = el.find("{http://www.w3.org/2005/Atom}link")
            if atom_link is not None:
                link = (atom_link.attrib.get("href") or "").strip()
        if any(rx.search(link) for rx in HIDE_RX):
            continue
        desc_el = _first(el, "description", "{http://purl.org/rss/1.0/modules/content/}encoded", "{http://www.w3.org/2005/Atom}summary")
        summary = shorten(clean_text(desc_el.text if desc_el is not None else ""))
        enc_el = el.find("{http://purl.org/rss/1.0/modules/content/}encoded")
        body_html = enc_el.text if enc_el is not None and enc_el.text else ""
        pub_el = _first(el, "pubDate", "{http://www.w3.org/2005/Atom}updated", "{http://www.w3.org/2005/Atom}published")
        date_iso = parse_date(pub_el.text if pub_el is not None else "")
        img = ""
        for m_el in el.findall(".//{http://search.yahoo.com/mrss/}content") + el.findall(".//{http://search.yahoo.com/mrss/}thumbnail") + el.findall(".//enclosure"):
            cand = (m_el.attrib.get("url") or "").strip()
            if cand:
                img = cand
                break
        if src.get("only_en") and (NONLAT.search(title + " " + summary) or RO.search(title + " " + summary)):
            continue
        out.append({
            "id": hashlib.md5((src["id"] + "|" + (link or title)).encode("utf-8")).hexdigest()[:12],
            "src_id": src["id"],
            "src": src["name"],
            "grp": src.get("grp", "bota"),
            "lang": src.get("lang", "en"),
            "title": title,
            "summary": summary,
            "date": date_iso,
            "link": link,
            "img": img or (photos(body_html)[:1] or [""])[0],
            "imgs": photos(body_html, img),
            "text": full_text(body_html),
        })
    return out

def from_wp(src):
    limit = int(src.get("per") or PER)
    try:
        raw = fetch_url(src["url"])
        posts = json.loads(raw.decode("utf-8"))
        out = []
        for p in posts[:limit]:
            link = (p.get("link") or "").strip()
            if any(rx.search(link) for rx in HIDE_RX):
                continue
            title = clean_text(((p.get("title") or {}).get("rendered")) or "")
            if not title:
                continue
            ex_html = ((p.get("excerpt") or {}).get("rendered")) or ((p.get("content") or {}).get("rendered")) or ""
            summary = shorten(clean_text(ex_html))
            img = ""
            emb = ((p.get("_embedded") or {}).get("wp:featuredmedia") or [])
            if emb and isinstance(emb[0], dict):
                img = (emb[0].get("source_url") or "").strip()
            out.append({
                "id": hashlib.md5((src["id"] + "|" + (link or title)).encode("utf-8")).hexdigest()[:12],
                "src_id": src["id"],
                "src": src["name"],
                "grp": src.get("grp", "koash"),
                "lang": src.get("lang", "sq"),
                "title": title,
                "summary": summary,
                "date": parse_date(p.get("date") or ""),
                "link": link,
                "img": img,
                "imgs": photos(((p.get("content") or {}).get("rendered")) or "", img),
                "text": full_text(((p.get("content") or {}).get("rendered")) or ""),
            })
        return out
    except Exception:
        fallback = dict(src, kind="rss", url="https://orthodoxalbania.org/2026/feed/")
        return from_rss(fallback)

# ---------- Përmbledhja (1/3) dhe përkthimi automatik anglisht → shqip ----------
# Përmbledhja është nxjerrëse: zgjidhen fjalitë më përfaqësuese të vetë shkrimit, fjalë për fjalë, në radhën e tyre
# (asgjë e shpikur), derisa të arrihet rreth një e treta e gjatësisë. Fjalia e parë mbetet gjithmonë.
SUM_STOP = set((
    "dhe të në e i një për me që nga se u më ka si është janë do por ose edhe kjo ky ai ajo ata ato tij saj tyre së te pas "
    "mbi nën deri pa duke kur ku cili cila kanë kishte ishte ishin këtë këtij kësaj atë atij asaj gjithë shumë ende vetëm mund duhet "
    "the and for with that this from was were are has have had his her their its which who also into about after over will would "
    "been being not but they them she him our your all more most other such than then there these those when where while what"
).split())
SENT_RX = re.compile(r"[^.!?…]+(?:[.!?…]+[\"»”'’)]*|$)")
WORD_RX = re.compile(r"[^\W\d_]{3,}", re.U)


def summarize(text, ratio=1 / 3, max_chars=0):
    paras = [re.sub(r"\s+", " ", x).strip() for x in re.split(r"\n{2,}", str(text or ""))]
    paras = [x for x in paras if len(x) > 1]
    S = []
    for pi, pa in enumerate(paras):
        for t in SENT_RX.findall(pa) or [pa]:
            t = t.strip()
            if t:
                S.append({"t": t, "pi": pi})
    if len(S) < 3:
        return paras
    words = lambda t: [w for w in WORD_RX.findall(t.lower()) if w not in SUM_STOP]
    fq = {}
    for x in S:
        for w in words(x["t"]):
            fq[w] = fq.get(w, 0) + 1
    for i, x in enumerate(S):
        ws = words(x["t"])
        x["sc"] = sum(fq[w] for w in ws) / ((len(ws) or 1) ** 0.5) * (3 if i == 0 else 1.35 if i < 3 else 1) * (0.4 if len(x["t"]) < 25 else 1)
    total = sum(len(x["t"]) for x in S)
    target = total * ratio
    if max_chars:
        target = min(target, max_chars)
    pick, ln = {0}, len(S[0]["t"])
    for i in sorted(range(len(S)), key=lambda k: -S[k]["sc"]):
        if ln >= target:
            break
        if i in pick:
            continue
        if max_chars and ln + len(S[i]["t"]) > max_chars * 1.15:
            continue
        pick.add(i)
        ln += len(S[i]["t"])
    out, last = [], -1
    for i in sorted(pick):
        if S[i]["pi"] != last or not out:
            out.append(S[i]["t"])
        else:
            out[-1] += " " + S[i]["t"]
        last = S[i]["pi"]
    return out


TR_CACHE = os.path.join(ROOT, "tools", "_perkthime.json")
TR_BUDGET = int(os.environ.get("FS_TR_SEK", "480"))     # sa sekonda përkthimi në çdo xhirim (pjesa tjetër në xhirimin pasues)
TR_DAYS = int(os.environ.get("FS_TR_DITE", "21"))       # përkthehen vetëm lajmet e këtyre ditëve të fundit
TR_SUM_MAX = 1800                                       # gjatësia maksimale e përmbledhjes që përkthehet
_TR = [None, False]
TERMS_SQ = [
    (re.compile(r"\b([Oo])rtodoks"), lambda m: m.group(1) + "rthodhoks"),
    (re.compile(r"\b([Oo])rtodoksi"), lambda m: m.group(1) + "rthodhoksi"),
    (re.compile(r"\bPhanar"), "Fanar"),
    (re.compile(r"\bBartol[eo]meu?\b|\bBartholomew\b"), "Bartolomeu"),
    (re.compile(r"\bPatriarku ekumenik\b"), "Patriarku Ekumenik"),
    (re.compile(r"\bPatriarkut ekumenik\b"), "Patriarkut Ekumenik"),
    (re.compile(r"\bPatriarkana ekumenike\b"), "Patriarkana Ekumenike"),
]


def _translator():
    """Argos Translate (offline): anglisht → shqip. Kur mungon, përdoren vetëm përkthimet e ruajtura."""
    if not _TR[1]:
        _TR[1] = True
        try:
            import argostranslate.translate as at
            langs = {l.code: l for l in at.get_installed_languages()}
            if "en" in langs and "sq" in langs:
                _TR[0] = langs["en"].get_translation(langs["sq"])
        except Exception as exc:
            print("Përkthimi nuk është i disponueshëm:", exc.__class__.__name__)
    return _TR[0]


def tr_sq(txt):
    tr = _translator()
    if not tr or not txt:
        return ""
    out = []
    for pa in re.split(r"\n{2,}", txt):
        pa = pa.strip()
        if pa:
            t = tr.translate(pa).strip()
            for rx, to in TERMS_SQ:
                t = rx.sub(to, t)
            out.append(fix_hier(t))
    return "\n\n".join(out)


def enrich(items):
    """Shton «sum» (përmbledhja 1/3) te çdo lajm dhe përkthen në shqip lajmet në anglisht (me arkiv përkthimesh)."""
    try:
        with open(TR_CACHE, encoding="utf-8") as f:
            cache = json.load(f)
    except (OSError, ValueError):
        cache = {}
    start = datetime.datetime.now()
    since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=TR_DAYS)).isoformat()
    done = 0
    for it in items:
        if it.get("tr"):                   # i përkthyer në një xhirim të mëparshëm
            continue
        text = it.get("text") or ""
        ex = it.get("ex") or it.get("summary") or ""
        if (it.get("lang") or "sq") == "sq":
            if not it.get("sum") and len(text) > len(ex) * 1.2:
                it["sum"] = "\n\n".join(summarize(text))
            continue
        if it.get("lang") != "en":
            continue                       # p.sh. rumanisht: pa model përkthimi
        link = it.get("link") or ""
        if not link or NONLAT.search(it.get("title", "") + " " + ex) or RO.search(it.get("title", "") + " " + ex):
            continue
        c = cache.get(link) or {}
        need_sum = "sum" not in c and len(text) > len(ex) * 1.2
        if (not c.get("title") or need_sum) and (it.get("date") or "") >= since and (datetime.datetime.now() - start).total_seconds() < TR_BUDGET:
            try:
                if not c.get("title"):
                    c["title"] = tr_sq(it.get("title", ""))
                    c["ex"] = tr_sq(ex.rstrip("…").strip())
                if need_sum and _translator():
                    c["sum"] = tr_sq("\n\n".join(summarize(text, 1 / 3, TR_SUM_MAX)))
                if c.get("title"):
                    cache[link] = c
                    done += 1
            except Exception as exc:
                print("Përkthimi dështoi:", link, exc.__class__.__name__)
        if c.get("title"):
            it["title_orig"] = it.get("title", "")
            it["title"] = c["title"]
            it["ex"] = c.get("ex") or it.get("ex", "")
            if c.get("sum"):
                it["sum"] = c["sum"]
            it["lang"] = "sq"
            it["tr"] = "en"
            if text:
                it["text_orig"] = it.pop("text")
    if done:
        tmp = TR_CACHE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
        os.replace(tmp, TR_CACHE)
    left = sum(1 for it in items if it.get("lang") == "en" and (it.get("date") or "") >= since)
    print(f"Përkthime të reja: {done} · në pritje: {left}")
    return done


def save_officials():
    os.makedirs(os.path.dirname(OFFICIALS_JSON), exist_ok=True)
    payload = {
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "officials": CHURCH_OFFICIALS
    }
    with open(OFFICIALS_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    with open(OFFICIALS_JS, "w", encoding="utf-8") as f:
        f.write("window.CHURCH_OFFICIALS = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n")

def main():
    save_officials()
    all_items = []
    counts = []
    successes = 0
    for src in SOURCES:
        try:
            items = from_wp(src) if src.get("kind") == "wp" else from_rss(src)
            if src.get("lang") == "sq":   # versionet anglisht/greqisht të faqeve shqip nuk hyjnë në gazeta
                items = [x for x in items if not re.search(r"/(en|el|fr|it|de|es|ro|sr|bg|ar|ko|ru)/20\d\d/", x.get("link") or "")]
            all_items.extend(items)
            successes += 1
            counts.append(f"{src['name']}: {len(items)}")
        except Exception as exc:
            counts.append(f"{src['name']}: 0 ({exc.__class__.__name__})")

    # Bashko lajmet e reja me arkivin ekzistues. Kështu një ndërprerje e RSS-ve
    # nuk e zëvendëson një arkiv të plotë me vetëm disa artikuj.
    old_items = []
    try:
        with open(OUT, encoding="utf-8") as f:
            previous = json.load(f)
        if isinstance(previous, list):
            old_items = previous
        elif isinstance(previous, dict):
            old_items = previous.get("items", [])
    except (OSError, ValueError, TypeError):
        pass

    if not all_items and old_items:
        unique_items = deduplicate_articles(old_items)
        print("KUJDES: asnjë burim lajmesh nuk u lexua; u ruajt arkivi ekzistues.")
    else:
        unique_items = deduplicate_articles(all_items + old_items)

    unique_items.sort(key=lambda x: x.get("date") or "", reverse=True)
    unique_items = unique_items[:1000]

    # formati që lexon aplikacioni: {updated, sources, items}; çdo lajm ka edhe "ex" dhe burimin e shkurtër
    for it in unique_items:
        if not it.get("ex"):
            it["ex"] = it.get("summary", "")
    enrich(unique_items)       # përmbledhja 1/3 + përkthimi i lajmeve të kishave të tjera
    doc = {
        "updated": iso_now(),
        "sources": [{k: s.get(k, "") for k in ("id", "name", "home", "grp", "lang")} for s in SOURCES],
        "items": unique_items,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, OUT)          # shkrim atomik: skedari nuk mbetet kurrë gjysmë i shkruar
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("window.FS_DATA=window.FS_DATA||{};window.FS_DATA.lajme_bota=" + json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + ";window.LAJME_BOTA=window.FS_DATA.lajme_bota.items;\n")

    print(" | ".join(counts[:12]))
    print(f"Burime funksionale: {successes}/{len(SOURCES)}")
    print(f"Gjithsej lajme unike: {len(unique_items)} | Zyrtarë kishash: {len(CHURCH_OFFICIALS)}")
    return f"Lajmet: {len(unique_items)} artikuj; burime funksionale {successes}/{len(SOURCES)}"

if __name__ == "__main__":
    main()
