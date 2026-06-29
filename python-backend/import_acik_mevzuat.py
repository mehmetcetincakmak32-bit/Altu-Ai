import os
import json
import logging
import requests
from pathlib import Path
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("acik-mevzuat-importer")

REPO_API_URL = "https://api.github.com/repos/onurcan-b/acik-mevzuat/git/trees/main?recursive=1"
RAW_BASE_URL = "https://raw.githubusercontent.com/onurcan-b/acik-mevzuat/main"

# Align DATA_DIR path
DATA_DIR = Path(os.getenv("DATA_DIR", str(Path(__file__).parent / "data")))
MEVZUAT_CACHE = DATA_DIR / "scraper" / "mevzuat.json"
MEVZUAT_CACHE.parent.mkdir(parents=True, exist_ok=True)

def fetch_repo_tree():
    """Fetches the recursive git tree of the repository to locate files."""
    headers = {"User-Agent": "ALTU-Legal-Importer/1.0"}
    try:
        logger.info(f"Açık Mevzuat deposunun dosya ağacı çekiliyor: {REPO_API_URL}")
        r = requests.get(REPO_API_URL, headers=headers, timeout=15)
        if r.status_code == 200:
            return r.json().get("tree", [])
        else:
            logger.error(f"GitHub API hatası (Durum Kodu: {r.status_code}): {r.text}")
    except Exception as e:
        logger.error(f"GitHub API'sine bağlanırken hata oluştu: {e}")
    return []

def main():
    logger.info("=" * 60)
    logger.info("AÇIK MEVZUAT DATA IMPORT BAŞLATILDI")
    logger.info("=" * 60)

    # 1. Fetch repo files list
    tree = fetch_repo_tree()
    if not tree:
        logger.error("Depo ağacı boş veya alınamadı. İşlem sonlandırılıyor.")
        return

    # Find directories in kanunlar/
    kanun_folders = {}
    for item in tree:
        path = item.get("path", "")
        if path.startswith("kanunlar/") and "/" in path:
            parts = path.split("/")
            folder_name = parts[1]
            if len(parts) >= 3:
                filename = parts[2]
                if folder_name not in kanun_folders:
                    kanun_folders[folder_name] = {}
                if filename in ("ustveri.json", "metin.md"):
                    kanun_folders[folder_name][filename] = path

    logger.info(f"Açık Mevzuat deposunda {len(kanun_folders)} adet kanun klasörü tespit edildi.")

    imported_items = []

    # 2. Download and parse files for each kanun
    for folder, files in kanun_folders.items():
        if "ustveri.json" not in files or "metin.md" not in files:
            logger.warning(f"Eksik dosya tespiti: {folder} klasöründe hem ustveri.json hem metin.md bulunamadı. Atlanyor.")
            continue

        logger.info(f"İndiriliyor: {folder}...")
        
        # Download ustveri.json
        metadata = {}
        try:
            r_meta = requests.get(f"{RAW_BASE_URL}/{files['ustveri.json']}", timeout=10)
            if r_meta.status_code == 200:
                metadata = r_meta.json()
        except Exception as e:
            logger.error(f"Metadata indirme/ayrıştırma hatası ({folder}): {e}")
            continue

        # Download metin.md
        markdown_text = ""
        try:
            r_text = requests.get(f"{RAW_BASE_URL}/{files['metin.md']}", timeout=15)
            if r_text.status_code == 200:
                markdown_text = r_text.text
        except Exception as e:
            logger.error(f"Metin indirme hatası ({folder}): {e}")
            continue

        if not markdown_text:
            continue

        # Map details
        kanun_adi = metadata.get("resmi_ad", metadata.get("baslik", folder.replace("-", " ").title()))
        kanun_no = metadata.get("kanun_no", metadata.get("sayi", folder.split("-")[0]))
        kabul_tarihi = metadata.get("kabul_tarihi", metadata.get("tarih", ""))
        
        # Structure item
        item = {
            "kaynak": "mevzuat",
            "tur": "kanun",
            "baslik": kanun_adi,
            "madde": markdown_text,
            "tarih": kabul_tarihi,
            "sayi": kanun_no,
            "scrape_tarihi": datetime.now().isoformat(),
            "import_kaynak": "acik-mevzuat-repo"
        }
        imported_items.append(item)
        logger.info(f"✓ Başarıyla işlendi: {kanun_adi} (No: {kanun_no})")

    if not imported_items:
        logger.warning("Aktarılacak geçerli mevzuat verisi bulunamadı.")
        return

    # 3. Save to local mevzuat.json cache (Merge with existing)
    existing_items = []
    if MEVZUAT_CACHE.exists():
        try:
            with open(MEVZUAT_CACHE, "r", encoding="utf-8") as f:
                existing_items = json.load(f)
        except Exception as e:
            logger.error(f"Mevcut mevzuat cache dosyası okunamadı: {e}")

    # Remove old items from the same source to prevent duplicate copies
    merged_items = [x for x in existing_items if x.get("import_kaynak") != "acik-mevzuat-repo"]
    merged_items.extend(imported_items)

    try:
        with open(MEVZUAT_CACHE, "w", encoding="utf-8") as f:
            json.dump(merged_items, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ Yerel mevzuat veritabanı güncellendi. Toplam kayıt sayısı: {len(merged_items)}")
    except Exception as e:
        logger.error(f"Yerel mevzuat veritabanına kayıt başarısız: {e}")

    # 4. Vectorize and save to vector store
    try:
        from vector_store import get_vector_store
        store = get_vector_store(subdomain=None) # Global vector store
        logger.info("Vektör veritabanına indeksleme işlemi başlatılıyor...")
        
        vectorized_count = 0
        for item in imported_items:
            # We chunk the markdown into smaller sections to index effectively
            baslik = item["baslik"]
            no = item["sayi"]
            full_text = item["madde"]
            
            # Index general info
            text_summary = f"Mevzuat/Kanun Başlığı: {baslik}\nKanun No: {no}\nKabul Tarihi: {item['tarih']}\nİçerik:\n{full_text}"
            metadata = {
                "kaynak": "mevzuat",
                "tur": "kanun",
                "baslik": baslik,
                "sayi": no,
                "import_kaynak": "acik-mevzuat-repo"
            }
            store.add_text(text_summary, metadata, chunk=True)
            vectorized_count += 1
            
        logger.info(f"✓ Vektör veritabanı başarıyla güncellendi: {vectorized_count} kanun indekslendi.")
    except Exception as e:
        logger.error(f"Vektör veritabanı indeksleme hatası: {e}")

    logger.info("=" * 60)
    logger.info("MEVZUAT VERİLERİ BAŞARIYLA SİSTEME EKLENDİ")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()
