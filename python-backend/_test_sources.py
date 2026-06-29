import requests
s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0"})

r = s.head("https://www.mevzuat.gov.tr/MevzuatMetin/0.1.2.pdf", timeout=10, allow_redirects=True)
print(f"Mevzuat PDF: {r.status_code} CT={r.headers.get('Content-Type','')[:30]}")

r2 = s.head("https://www.mevzuat.gov.tr/MevzuatMetin/0.5.500.pdf", timeout=10, allow_redirects=True)
print(f"Mevzuat kanun: {r2.status_code} CT={r2.headers.get('Content-Type','')[:30]}")

try:
    r3 = s.get("https://www.anayasa.gov.tr/tr/mevzuat/anayasa", timeout=15)
    print(f"AYM anayasa: {r3.status_code} ({len(r3.text)} bayt)")
except Exception as e:
    print(f"AYM hata: {e}")

try:
    r4 = s.head("https://www.resmigazete.gov.tr/eskiler/2026/06/20260625.pdf", timeout=10)
    print(f"RG bugun: {r4.status_code}")
except Exception as e:
    print(f"RG hata: {e}")
