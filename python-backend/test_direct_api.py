import requests
import json
from urllib.parse import quote
from bs4 import BeautifulSoup
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}

import urllib3
urllib3.disable_warnings()

def test_aym(sorgu, limit=3):
    print("\n--- AYM Bireysel Başvuru (Direct Bedesten API) ---")
    url = f"https://bedesten.adalet.gov.tr/api/AYMBireysel/Ara?aranan={quote(sorgu)}&sayfa=1&sayfadakiKayitSayisi={limit}"
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data.get("data", data.get("liste", []))
            print(f"Success! Found {len(items)} results.")
            for idx, item in enumerate(items[:2]):
                print(f"  [{idx+1}] Başvuru No: {item.get('basvuruNo')}, Tarih: {item.get('kararTarihi')}")
                print(f"      Konu: {item.get('konu')}")
        else:
            print(f"Error response: {r.text[:200]}")
    except Exception as e:
        print(f"Failed: {e}")

def test_yargitay(sorgu, limit=3):
    print("\n--- Yargıtay (Direct Bedesten API) ---")
    url = f"https://bedesten.adalet.gov.tr/api/YARGITAYKARARI/Ara?aranan={quote(sorgu)}&sayfa=1&sayfadakiKayitSayisi={limit}"
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data.get("data", data.get("liste", []))
            print(f"Success! Found {len(items)} results.")
            for idx, item in enumerate(items[:2]):
                print(f"  [{idx+1}] Esas/Karar: {item.get('esasNo')} / {item.get('kararNo')}")
                print(f"      Özet: {item.get('ozet', '')[:100]}...")
        else:
            print(f"Error response: {r.text[:200]}")
    except Exception as e:
        print(f"Failed: {e}")

def test_danistay(sorgu, limit=3):
    print("\n--- Danıştay (Direct Bedesten API) ---")
    url = f"https://bedesten.adalet.gov.tr/api/DANISTAYKARARI/Ara?aranan={quote(sorgu)}&sayfa=1&sayfadakiKayitSayisi={limit}"
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data.get("data", data.get("liste", []))
            print(f"Success! Found {len(items)} results.")
            for idx, item in enumerate(items[:2]):
                print(f"  [{idx+1}] Esas/Karar: {item.get('esasNo')} / {item.get('kararNo')}")
                print(f"      Özet: {item.get('ozet', '')[:100]}...")
        else:
            print(f"Error response: {r.text[:200]}")
    except Exception as e:
        print(f"Failed: {e}")

def test_mevzuat(sorgu, limit=3):
    print("\n--- Mevzuat Bilgi Sistemi (Direct Mevzuat API) ---")
    url = f"https://mevzuat.gov.tr/api/MevzuatAra?aranan={quote(sorgu)}&sayfa=1&sayfadakiKayitSayisi={limit}"
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data.get("data", data.get("liste", []))
            print(f"Success! Found {len(items)} results.")
            for idx, item in enumerate(items[:2]):
                print(f"  [{idx+1}] Başlık: {item.get('baslik', item.get('mevzuatAdi'))}")
                print(f"      Tür: {item.get('tur', item.get('mevzuatTuru'))}, No: {item.get('sayi', item.get('mevzuatNo'))}")
        else:
            print(f"Error response: {r.text[:200]}")
    except Exception as e:
        print(f"Failed: {e}")

def test_resmi_gazete(sorgu, limit=3):
    print("\n--- Resmi Gazete (Direct Web Scraper) ---")
    url = f"https://www.resmigazete.gov.tr/eskileri.aspx"
    try:
        r = requests.get(url, params={"search": sorgu}, headers=HEADERS, verify=False, timeout=15)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            rows = soup.select("table tr") or soup.select(".liste tr")
            results = []
            for row in rows:
                cells = row.find_all("td")
                if len(cells) >= 2:
                    link = cells[0].find("a")
                    results.append({
                        "baslik": cells[0].get_text(strip=True),
                        "tarih": cells[1].get_text(strip=True),
                        "sayi": cells[2].get_text(strip=True) if len(cells) > 2 else "",
                        "link": link.get("href") if link else ""
                    })
            print(f"Success! Found {len(results)} results in HTML table.")
            for idx, item in enumerate(results[:2]):
                print(f"  [{idx+1}] Başlık: {item['baslik']}")
                print(f"      Tarih: {item['tarih']}, Sayı: {item['sayi']}")
        else:
            print(f"Error response: {r.text[:200]}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("DIRECT legal API TEST (WITHOUT MCP)")
    print("=" * 60)
    sorgu = "kira"
    test_aym("mülkiyet hakkı")
    test_yargitay(sorgu)
    test_danistay(sorgu)
    test_mevzuat(sorgu)
    test_resmi_gazete("atama")
