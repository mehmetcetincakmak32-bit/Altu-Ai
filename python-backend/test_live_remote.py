import sys
import os
import json
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root / "python-backend"))

# Enable basic logging to see vector store status
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

from remote_sources import remote
from vector_store import get_vector_store

def run_test():
    y_path = project_root / "python-backend" / "data" / "scraper" / "yargitay.json"
    temp_path = y_path.with_suffix(".json.tmp")
    
    # Temporarily move local JSON to force live API search
    has_local = y_path.exists()
    if has_local:
        if temp_path.exists():
            temp_path.unlink()
        y_path.rename(temp_path)
        print("-> Yerel Yargıtay önbellek dosyası geçici olarak devre dışı bırakıldı.")
        
    try:
        print("1. Canlı Bedesten API araması tetikleniyor (Sorgu: 'tazminat')...")
        remote.cache.clear()
        
        # We query yargitay - this will now hit Bedesten API because yargitay.json is missing!
        results = remote.yargitay_ara("tazminat", limit=2)
        
        print(f"\nArama Tamamlandı. Gelen Sonuç Sayısı: {len(results)}")
        for idx, item in enumerate(results):
            print(f"\n[Sonuç {idx+1}]")
            print(f"Mahkeme: {item.get('mahkeme')}")
            print(f"Esas No: {item.get('esas')}")
            print(f"Karar No: {item.get('karar')}")
            print(f"Konu: {item.get('konu')}")
            print(f"Özet (İlk 150 Karakter): {item.get('ozet', '')[:150]}...")
            
    finally:
        # Move local JSON back
        if has_local and temp_path.exists():
            if y_path.exists():
                y_path.unlink()
            temp_path.rename(y_path)
            print("\n-> Yerel Yargıtay önbellek dosyası geri yüklendi.")
        
    # Check if vector store got it
    print("\n2. Vektör veritabanı kontrol ediliyor...")
    store = get_vector_store(subdomain=None)
    matches = store.search("tazminat", limit=3)
    print(f"Vektör veritabanında 'tazminat' için bulunan eşleşmeler: {len(matches)}")
    for idx, match in enumerate(matches):
        print(f"-[Eşleşme {idx+1}] Skor: {match['score']:.2f} | Metin (İlk 100 Karakter): {match['text'][:100]}...")

if __name__ == "__main__":
    run_test()
