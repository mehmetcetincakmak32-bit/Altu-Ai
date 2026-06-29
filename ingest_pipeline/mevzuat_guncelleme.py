#!/usr/bin/env python3
"""
mevzuat_guncelleme.py
Mevzuat verilerini güncelleyen ve yeni çıkan kanun/yönetmelikleri 
indiren periyodik güncelleme betiği.
"""

import sys
import os
import logging
from pathlib import Path

# Proje yollarını ayarla
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root / "python-backend"))

try:
    from scraper import scraper
except ImportError:
    sys.path.append(str(Path(os.getcwd()) / "python-backend"))
    from scraper import scraper

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mevzuat-guncelleme")

def main():
    logger.info("Mevzuat güncellemeleri kontrol ediliyor...")
    
    try:
        # scraper.py içindeki mevzuat_tara fonksiyonunu çağırır.
        # Bu fonksiyon yeni verileri çeker, local mevzuat.json'ı günceller
        # ve otomatik olarak SimpleVectorStore'a ekler (_kaydet içinde).
        data = scraper.mevzuat_tara(gunluk_limit=100)
        
        logger.info(f"Mevzuat güncellemesi tamamlandı. Toplam taranan kayıt: {len(data)}")
        print(f"SUCCESS: {len(data)} adet mevzuat kaydı güncellendi ve vektörleştirildi.")
    except Exception as e:
        logger.error(f"Güncelleme işlemi sırasında hata oluştu: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
