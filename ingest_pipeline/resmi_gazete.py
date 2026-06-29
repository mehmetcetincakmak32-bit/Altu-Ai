#!/usr/bin/env python3
"""
resmi_gazete.py
T.C. Resmi Gazete günlük sayılarını PDF olarak indiren, metin çıkaran 
ve ALTU SimpleVectorStore'a ekleyen entegrasyon betiği.
"""

import sys
import os
import re
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime, timedelta

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("resmi-gazete")

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
    
PDF_DIR = DATA_DIR / "resmi_gazete" / "pdfs"
PDF_DIR.mkdir(parents=True, exist_ok=True)

SCRAPER_DIR = DATA_DIR / "scraper"
SCRAPER_DIR.mkdir(parents=True, exist_ok=True)
CACHE_FILE = SCRAPER_DIR / "resmi_gazete.json"

def check_and_install_dependencies():
    """Gerekli kütüphaneleri kontrol et ve eksikse kur"""
    try:
        import pypdf
    except ImportError:
        logger.info("pypdf kütüphanesi eksik, yükleniyor...")
        import subprocess
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "pypdf"], check=True)
            logger.info("pypdf başarıyla kuruldu.")
        except Exception as e:
            logger.error(f"pypdf kütüphanesi yüklenemedi: {e}")

def download_resmi_gazete_pdf(tarih: datetime) -> Path:
    """Belirtilen tarih için Resmi Gazete PDF'ini indir"""
    year = tarih.strftime("%Y")
    month = tarih.strftime("%m")
    day = tarih.strftime("%d")
    date_str = tarih.strftime("%Y%m%d")
    
    url = f"https://www.resmigazete.gov.tr/eskiler/{year}/{month}/{date_str}.pdf"
    output_path = PDF_DIR / f"{date_str}.pdf"
    
    logger.info(f"Resmi Gazete PDF indiriliyor: {url}")
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
        if r.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(r.content)
            logger.info(f"PDF başarıyla indirildi: {output_path}")
            return output_path
        elif r.status_code == 404:
            logger.warning(f"{tarih.strftime('%d.%m.%Y')} tarihinde Resmi Gazete yayımlanmamış olabilir (404).")
        else:
            logger.warning(f"İndirme hatası: HTTP {r.status_code}")
    except Exception as e:
        logger.error(f"Bağlantı hatası: {e}")
    return None

def extract_text_from_pdf(pdf_path: Path) -> str:
    """PDF belgesinden metin içeriğini çıkar"""
    check_and_install_dependencies()
    text = ""
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        for page_num in range(len(reader.pages)):
            page_text = reader.pages[page_num].extract_text()
            if page_text:
                text += f"\n--- SAYFA {page_num+1} ---\n" + page_text
        logger.info(f"Metin başarıyla ayıklandı ({len(text)} karakter).")
    except Exception as e:
        logger.error(f"PDF metin ayıklama hatası: {e}")
    return text

def parse_and_embed(text: str, date_str: str, pdf_url: str):
    """Metni vektör veritabanına ve yerel json önbelleğine kaydet"""
    if not text.strip():
        logger.warning("Vektörleştirilecek metin bulunamadı.")
        return
        
    store = get_vector_store(subdomain=None)
    
    # 1. Metni kanun/yönetmelik başlıklarına göre bölmeyi veya standart boyutlarda bölmeyi dene
    # Basitlik ve tutarlılık için SimpleVectorStore chunking desteğini (add_text) kullanacağız
    title = f"Resmi Gazete Sayısı - Tarih: {date_str}"
    
    # Kategori tahmini
    category = classify_text(text)
    
    # SimpleVectorStore'a ekle
    vector_text = f"Kaynak: Resmi Gazete\nYayın Tarihi: {date_str}\nPDF Bağlantısı: {pdf_url}\nİçerik:\n{text}"
    metadata = {
        "kaynak": "resmi_gazete",
        "baslik": title,
        "sayi": date_str,
        "tarih": date_str,
        "kategori": category
    }
    
    store.add_text(vector_text, metadata, chunk=True)
    logger.info("Vektör veritabanına başarıyla eklendi.")
    
    # 2. Resmi Gazete önbelleğini güncelle
    cache_data = []
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache_data = json.load(f)
        except Exception as e:
            logger.warning(f"Resmi Gazete önbelleği okunamadı: {e}")
            
    # Mükerrer kaydı önle
    cift_mi = any(x.get("sayi") == date_str for x in cache_data)
    if not cift_mi:
        cache_data.append({
            "kaynak": "resmi_gazete",
            "tur": "karar_teblig",
            "baslik": title,
            "madde": text[:2000] + ("..." if len(text) > 2000 else ""),
            "tarih": date_str,
            "sayi": date_str,
            "scrape_tarihi": datetime.now().isoformat()
        })
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
            logger.info("Resmi Gazete önbelleği (JSON) güncellendi.")
        except Exception as e:
            logger.error(f"Önbellek kaydetme hatası: {e}")

def main():
    parser = argparse.ArgumentParser(description="Resmi Gazete PDF Scraper ve İndirici")
    parser.add_argument("--tarih", type=str, help="İndirilecek tarih (YYYY-MM-DD). Boş bırakılırsa bugünü çeker.")
    parser.add_argument("--days", type=int, default=1, help="Geriye dönük kaç günlük Resmi Gazete taranacak")
    
    args = parser.parse_args()
    
    check_and_install_dependencies()
    
    if args.tarih:
        tarihler = [datetime.strptime(args.tarih, "%Y-%m-%d")]
    else:
        # Son X günün gazetesini indir
        tarihler = [datetime.now() - timedelta(days=i) for i in range(args.days)]
        
    for tarih in tarihler:
        date_str = tarih.strftime("%d.%m.%Y")
        logger.info(f"Resmi Gazete taranıyor: {date_str}")
        
        pdf_path = download_resmi_gazete_pdf(tarih)
        if pdf_path:
            text = extract_text_from_pdf(pdf_path)
            pdf_url = f"https://www.resmigazete.gov.tr/eskiler/{tarih.strftime('%Y/%m/%Y%m%d')}.pdf"
            parse_embed_text = parse_and_embed(text, date_str, pdf_url)
            print(f"SUCCESS: {date_str} tarihli Resmi Gazete başarıyla işlendi.")
        else:
            logger.info(f"{date_str} için yeni sayı bulunamadı veya indirilemedi.")

if __name__ == "__main__":
    main()
