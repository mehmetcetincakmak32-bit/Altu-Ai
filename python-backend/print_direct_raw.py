import requests
from urllib.parse import quote

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}

import urllib3
urllib3.disable_warnings()

def print_mevzuat_raw():
    print("\n--- MEVZUAT RAW RESPONSE ---")
    url = f"https://mevzuat.gov.tr/api/MevzuatAra?aranan={quote('kira')}&sayfa=1&sayfadakiKayitSayisi=3"
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        print(f"Status Code: {r.status_code}")
        print(f"Headers: {dict(r.headers)}")
        print(f"Content Type: {r.headers.get('Content-Type')}")
        print(f"Snippet: {r.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

def print_resmigazete_raw():
    print("\n--- RESMI GAZETE RAW RESPONSE ---")
    url = "https://www.resmigazete.gov.tr/eskileri.aspx"
    try:
        r = requests.get(url, params={"search": "atama"}, headers=HEADERS, verify=False, timeout=15)
        print(f"Status Code: {r.status_code}")
        print(f"Headers: {dict(r.headers)}")
        print(f"Snippet: {r.text[:1000]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print_mevzuat_raw()
    print_resmigazete_raw()
