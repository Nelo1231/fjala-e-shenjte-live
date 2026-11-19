import os
import json
import urllib.request
from io import BytesIO
from PIL import Image
import instaloader

USERNAME = "minuel_collaku"
FAQET = ["_saintsoforthodoxy", "apostle_icons"]
JSON_PATH = os.path.join("data", "shenjtoret_dites.json")
IMG_DIR = os.path.join("assets", "www", "images", "shenjtoret")

os.makedirs("data", exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

existing = {}
if os.path.exists(JSON_PATH):
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            existing = json.load(f)
    except Exception:
        existing = {}

L = instaloader.Instaloader(download_videos=False, download_video_thumbnails=False, save_metadata=False)
L.load_session_from_file(USERNAME)

shto = 0
shkarkuar = 0

for faqja in FAQET:
    print(f"Po merret postimi i fundit nga @{faqja} ...")
    try:
        profile = instaloader.Profile.from_username(L.context, faqja)
        for post in profile.get_posts():
            if post.is_video:
                continue

            key = post.date_local.strftime("%Y-%m-%d")
            local_name = f"sh_{key}.jpg"
            local_path = os.path.join(IMG_DIR, local_name)

            if key in existing and os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
                print(f"Ikona per {key} ekziston tashme.")
                break

            req = urllib.request.Request(post.url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                img = Image.open(BytesIO(resp.read())).convert("RGB")
            if img.width > 800:
                ratio = 800 / float(img.width)
                img = img.resize((800, int(img.height * ratio)), Image.LANCZOS)
            img.save(local_path, "JPEG", quality=80, optimize=True)
            shkarkuar += 1

            if key not in existing:
                shto += 1

            existing[key] = {
                "date": key,
                "image_url": f"images/shenjtoret/{local_name}",
                "caption": (post.caption or "").strip(),
                "source": f"https://www.instagram.com/p/{post.shortcode}/",
                "account": faqja
            }
            print(f"U shkarkua dhe komprimua: {local_name} ({round(os.path.getsize(local_path)/1024, 1)} KB)")
            break
    except Exception as e:
        print(f"Gabim te @{faqja}: {e}")

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(existing, f, ensure_ascii=False, indent=2)

print(f"Perfundoi! Te reja: {shto}, Komprimuar: {shkarkuar}, Totali: {len(existing)}")