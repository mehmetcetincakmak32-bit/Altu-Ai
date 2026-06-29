#!/usr/bin/env python3
"""
yargitay_danistay_aym.py
Yargıtay, Danıştay ve AYM kararlarını yargi-cli veya doğrudan Bedesten API üzerinden çeken,
ve ALTU SimpleVectorStore'a kaydeden entegrasyon betiği.
"""

import sys
import os
import json
import logging
import subprocess
import argparse
from pathlib import Path
from urllib.parse import quote

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest-court-decisions")

# Proje yollarını ayarla
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root / "python-backend"))

try:
    from vector_store import get_vector_store
    from main import classify_text
except ImportError:
    # Alternatif import denemesi
    sys.path.append(str(Path(os.getcwd()) / "python-backend"))
    from vector_store import get_vector_store
    from main import classify_text

BEDESTEN_API = "https://bedesten.adalet.gov.tr/api"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

def search_via_cli(sorgu: str, court_type: str, limit: int) -> list:
    """yargi-cli aracı üzerinden kararları ara"""
    try:
        # yargi bedesten search "kira" -c YARGITAYKARARI -p 1
        court_flags = {
            "YARGITAY": "YARGITAYKARARI",
            "DANISTAY": "DANISTAYKARAR",
            "AYM": "YERELHUKUK", # Bedesten'de AYM için yerel hukuk veya özelleştirilmiş aramalar
        }
        flag = court_flags.get(court_type, "YARGITAYKARARI")
        
        cmd = ["yargi", "bedesten", "search", sorgu, "-c", flag]
        logger.info(f"CLI çalıştırılıyor: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        
        results = []
        # yargi-cli çıktı yapısına göre eşleştir
        items = data if isinstance(data, list) else data.get("results", data.get("data", []))
        for item in items[:limit]:
            doc_id = item.get("id", item.get("documentId", ""))
            doc_text = ""
            if doc_id:
                # Karar metnini indir
                try:
                    doc_cmd = ["yargi", "bedesten", "doc", doc_id]
                    doc_res = subprocess.run(doc_cmd, capture_output=True, text=True)
                    if doc_res.returncode == 0:
                        doc_text = doc_res.stdout
                except Exception as e:
                    logger.warning(f"Belge metni CLI ile indirilemedi: {e}")
            
            results.append({
                "kaynak": court_type.lower(),
                "mahkeme": "Yargıtay" if court_type == "YARGITAY" else "Danıştay" if court_type == "DANISTAY" else "Anayasa Mahkemesi",
                "esas": item.get("esasNo", item.get("esas", "")),
                "karar": item.get("kararNo", item.get("karar", "")),
                "tarih": item.get("kararTarihi", item.get("tarih", "")),
                "konu": item.get("konu", item.get("davaTuru", "")),
                "ozet": doc_text or item.get("ozet", item.get("kararOzeti", "")),
                "id": doc_id
            })
        return results
    except (subprocess.SubprocessError, FileNotFoundError, json.JSONDecodeError) as e:
        logger.warning(f"yargi-cli araması başarısız oldu veya yüklü değil: {e}. API fallback devreye giriyor...")
        return []

def search_via_api(sorgu: str, court_type: str, limit: int) -> list:
    """Doğrudan Bedesten API'ye HTTP istekleri gönder"""
    results = []
    try:
        if court_type == "YARGITAY":
            url = f"{BEDESTEN_API}/YARGITAYKARARI/Ara"
        elif court_type == "DANISTAY":
            url = f"{BEDESTEN_API}/DANISTAYKARAR/Ara"
        else: # AYM
            url = f"{BEDESTEN_API}/AYMBireysel/Ara"

        params = {"aranan": sorgu, "sayfa": 1, "sayfadakiKayitSayisi": limit}
        logger.info(f"API Sorgulanıyor: {url} params={params}")
        r = requests.get(url, params=params, headers=HEADERS, timeout=15)
        
        if r.status_code == 200:
            data = r.json()
            items = data.get("data", data.get("liste", data.get("result", [])))
            for item in items:
                results.append({
                    "kaynak": court_type.lower(),
                    "mahkeme": "Yargıtay" if court_type == "YARGITAY" else "Danıştay" if court_type == "DANISTAY" else "Anayasa Mahkemesi",
                    "esas": item.get("esasNo", ""),
                    "karar": item.get("kararNo", ""),
                    "tarih": item.get("kararTarihi", ""),
                    "konu": item.get("konu", item.get("davaTuru", "")),
                    "ozet": item.get("ozet", item.get("kararOzeti", "")),
                    "id": item.get("id", "")
                })
        else:
            logger.warning(f"Bedesten API {r.status_code} kodu ile döndü.")
    except Exception as e:
        logger.error(f"Bedesten API bağlantı hatası: {e}")
    
    return results

def ingest(sorgu: str, limit: int, court_type: str):
    logger.info(f"Başlatılıyor: Sorgu='{sorgu}', Limit={limit}, Mahkeme={court_type}")
    
    # 1. CLI aramayı dene
    results = search_via_cli(sorgu, court_type, limit)
    
    # 2. CLI başarısızsa API fallback
    if not results:
        results = search_via_api(sorgu, court_type, limit)
        
    if not results:
        logger.warning("Hiçbir sonuç bulunamadı veya çekilemedi.")
        return 0
        
    logger.info(f"{len(results)} adet karar bulundu. Vektörleştirme ve indeksleme başlıyor...")
    
    store = get_vector_store(subdomain=None) # Global store
    
    count = 0
    for item in results:
        esas = item.get("esas", "")
        karar = item.get("karar", "")
        mahkeme = item.get("mahkeme", "")
        konu = item.get("konu", "")
        ozet = item.get("ozet", "")
        tarih = item.get("tarih", "")
        
        text = f"Kaynak: {mahkeme}\nEsas No: {esas}\nKarar No: {karar}\nKarar Tarihi: {tarih}\nKonu: {konu}\nKarar İçeriği/Özeti: {ozet}"
        
        # Sınıflandırma
        kategori = classify_text(konu + " " + ozet)
        
        metadata = {
            "kaynak": item["kaynak"],
            "mahkeme": mahkeme,
            "esas": esas,
            "karar": karar,
            "tarih": tarih,
            "konu": konu,
            "kategori": kategori
        }
        
        store.add_text(text, metadata, chunk=True)
        count += 1
        
    logger.info(f"İşlem Tamamlandı: {count} adet karar başarıyla vektörleştirildi.")
    return count

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Yargıtay, Danıştay, AYM Karar Entegrasyon")
    parser.add_argument("--sorgu", type=str, required=True, help="Aranacak hukuki kelime")
    parser.add_argument("--limit", type=int, default=10, help="Maksimum sonuç sayısı")
    parser.add_argument("--court", type=str, choices=["YARGITAY", "DANISTAY", "AYM", "ALL"], default="ALL", help="Mahkeme seçimi")
    
    args = parser.parse_args()
    
    courts = ["YARGITAY", "DANISTAY", "AYM"] if args.court == "ALL" else [args.court]
    total_ingested = 0
    for court in courts:
        total_ingested += ingest(args.sorgu, args.limit, court)
        
    print(f"SUCCESS: Toplam {total_ingested} karar veritabanına işlendi.")
