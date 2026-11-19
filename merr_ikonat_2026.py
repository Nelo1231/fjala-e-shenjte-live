import os, json, urllib.request
from io import BytesIO
from PIL import Image
import instaloader

IMG_DIR = os.path.join("img", "apostujt")
os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs("data", exist_ok=True)

L = instaloader.Instaloader(download_videos=False, download_video_thumbnails=False, save_metadata=False)
L.load_session_from_file("minuel_collaku")

te_reja = 0

def ruaj_webp(url, out_path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        img = Image.open(BytesIO(resp.read())).convert("RGB")
    if img.width > 800:
        img = img.resize((800, int(img.height * (800 / img.width))), Image.LANCZOS)
    img.save(out_path, "WEBP", quality=80, method=6)

for faqja in ["_saintsoforthodoxy", "apostle_icons"]:
    print(f"Po merret postimi i fundit nga @{faqja} ...")
    try:
        profile = instaloader.Profile.from_username(L.context, faqja)
        for post in profile.get_posts():
            if post.is_video:
                continue

            dt = post.date_utc
            mm = dt.strftime("%m")
            mm_dd = dt.strftime("%m-%d")
            yyyy_mm_dd = dt.strftime("%Y-%m-%d")
            stamp = dt.strftime("%Y-%m-%d_%H-%M-%S_UTC")

            json_path = os.path.join("data", f"imazhet_{mm}.json")
            if os.path.exists(json_path):
                with open(json_path, encoding="utf-8") as f:
                    db = json.load(f)
            else:
                db = {"images": []}

            existing_files = {item.get("file") for item in db.get("images", [])}

            # Merr te gjitha fotot (edhe nese postimi eshte karusel)
            urls = []
            if post.typename == "GraphSidecar":
                for node in post.get_sidecar_nodes():
                    if not node.is_video:
                        urls.append(node.display_url)
            else:
                urls.append(post.url)

            caption_first = (post.caption or "").strip().splitlines()[0] if post.caption else ""
            ndryshoi = False

            for idx, url in enumerate(urls, start=1):
                fname = f"ig_{stamp}_{idx}.webp"
                rel_path = f"img/apostujt/{fname}"
                full_path = os.path.join(IMG_DIR, fname)

                if rel_path in existing_files and os.path.exists(full_path):
                    continue

                ruaj_webp(url, full_path)
                db["images"].append({
                    "file": rel_path,
                    "cat": "apostujt",
                    "date": mm_dd,
                    "dita": yyyy_mm_dd,
                    "sinaksari": True,
                    "shenjtori": caption_first,
                    "title": caption_first,
                    "kalendari": "",
                    "author": "",
                    "license": "",
                    "source": f"https://www.instagram.com/p/{post.shortcode}/"
                })
                existing_files.add(rel_path)
                ndryshoi = True
                te_reja += 1
                print(f"  + U shtua: {rel_path}")

            if ndryshoi:
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(db, f, ensure_ascii=False, indent=2)

            break  # vetem postimi me i fundit per cdo faqe
    except Exception as e:
        print(f"Gabim te @{faqja}: {e}")

print(f"Perfundoi! Foto te reja te shtuara: {te_reja}")