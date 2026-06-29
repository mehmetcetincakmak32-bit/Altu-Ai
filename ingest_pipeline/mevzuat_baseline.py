#!/usr/bin/env python3
"""
mevzuat_baseline.py
Hugging Face 'omersaidd/Kanunlar' veri setini indirip yerel önbelleğe kaydeden 
ve ALTU SimpleVectorStore'a ekleyen başlangıç (cold-start) korpus betiği.
"""

import sys
import os
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mevzuat-baseline")

# Proje yollarını ayarla
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root / "python-backend"))

try:
    from vector_store import get_vector_store
    from main import classify_text
except ImportError:
    sys.path.append(str(Path(os.getcwd()) / "python-backend"))
    from vector_store import get_vector_store
    from main import classify_text

DATA_DIR = project_root / "python-backend" / "data"
if not DATA_DIR.exists():
    DATA_DIR = project_root / "data"
    
SCRAPER_DIR = DATA_DIR / "scraper"
SCRAPER_DIR.mkdir(parents=True, exist_ok=True)
MEVZUAT_PATH = SCRAPER_DIR / "mevzuat.json"

HF_REPO = "omersaidd/Kanunlar"

def get_hf_rows(limit: int = 200) -> list:
    """Hugging Face'den kanun satırlarını çek"""
    # 1. datasets kütüphanesini dene
    try:
        from datasets import load_dataset
        logger.info(f"Using 'datasets' library to stream {HF_REPO}...")
        ds = load_dataset(HF_REPO, split="train", streaming=True)
        rows = []
        for i, row in enumerate(ds):
            rows.append(row)
            if i >= limit - 1:
                break
        if rows:
            logger.info(f"Successfully streamed {len(rows)} rows from HF.")
            return rows
    except Exception as e:
        logger.warning(f"datasets library streaming failed: {e}. Trying HTTP API...")

    # 2. HTTP API fallback
    try:
        url = f"https://datasets-server.huggingface.co/rows?dataset={HF_REPO}&config=default&split=train"
        r = requests.get(url, timeout=15, headers={"User-Agent": "ALTU-Baseline/1.0"})
        if r.status_code == 200:
            rows = r.json().get("rows", [])
            logger.info(f"Successfully retrieved {len(rows)} rows via HF HTTP API.")
            return [row.get("row", {}) for row in rows[:limit]]
    except Exception as e:
        logger.error(f"Hugging Face API Hatası: {e}")
    return []

def main():
    parser = argparse.ArgumentParser(description="Mevzuat Baseline Yükleyici")
    parser.add_argument("--limit", type=int, default=150, help="Çekilecek maksimum kanun maddesi sayısı")
    args = parser.parse_args()

    logger.info("Mevzuat baseline veri seti indiriliyor...")
    rows = get_hf_rows(args.limit)
    
    if not rows:
        logger.warning("Veri çekilemedi. İşlem durduruldu.")
        sys.exit(1)

    mevzuat_data = []
    
    # Mevcut önbellek varsa yükle
    if MEVZUAT_PATH.exists():
        try:
            with open(MEVZUAT_PATH, "r", encoding="utf-8") as f:
                mevzuat_data = json.load(f)
        except Exception as e:
            logger.warning(f"Önbellek okunamadı, yeni oluşturulacak: {e}")

    logger.info("Veriler parse ediliyor ve vektör tabanına ekleniyor...")
    store = get_vector_store(subdomain=None)
    
    count = 0
    for row in rows:
        text = row.get("text", row.get("madde", row.get("content", "")))
        title = row.get("title", row.get("kanun_adi", "Genel Kanun"))
        numara = row.get("numara", f"{abs(hash(text)) % 9999}")
        tarih = row.get("tarih", "")
        
        if not text:
            continue
            
        category = classify_text(text + " " + title)
        
        # Çift kayıt kontrolü
        cift_mi = any(x.get("baslik") == title and x.get("madde") == text for x in mevzuat_data)
        if not cift_mi:
            item = {
                "kaynak": "mevzuat",
                "kaynak_tipi": "huggingface",
                "tur": "kanun",
                "baslik": title,
                "madde": text,
                "tarih": tarih,
                "sayi": numara,
                "kategori": category,
                "scrape_tarihi": datetime.now().isoformat()
            }
            mevzuat_data.append(item)
            
            # Vektörleştir ve ekle
            vector_text = f"Mevzuat Türü: kanun\nKanun Adı: {title}\nKanun No: {numara}\nİçerik/Madde: {text}"
            metadata = {
                "kaynak": "mevzuat",
                "tur": "kanun",
                "baslik": title,
                "sayi": numara,
                "kategori": category
            }
            store.add_text(vector_text, metadata, chunk=True)
            count += 1

    # Önbelleği güncelle
    try:
        with open(MEVZUAT_PATH, "w", encoding="utf-8") as f:
            json.dump(mevzuat_data, f, ensure_ascii=False, indent=2)
        logger.info(f"Önbellek güncellendi: {MEVZUAT_PATH} (Toplam {len(mevzuat_data)} kayıt)")
    except Exception as e:
        logger.error(f"Önbellek yazma hatası: {e}")

    print(f"SUCCESS: {count} adet yeni kanun maddesi baseline olarak yüklendi.")

if __name__ == "__main__":
    main()
