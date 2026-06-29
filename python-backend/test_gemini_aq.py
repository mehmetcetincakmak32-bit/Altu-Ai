"""
Gemini AQ. format API anahtarı testi
x-goog-api-key header ile bağlantı kontrolü
"""
import os, sys, json

# .env dosyasından oku
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
api_key = ""
model = "gemini-2.0-flash"

with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line.startswith('GEMINI_API_KEY='):
            api_key = line.split('=', 1)[1].strip('"\'')
        if line.startswith('GEMINI_MODEL='):
            model = line.split('=', 1)[1].strip('"\'')

print(f"Anahtar formatı: {'AQ. (Yeni Authorization Key)' if api_key.startswith('AQ.') else 'AIza (Eski Standard Key)' if api_key.startswith('AIza') else 'Bilinmiyor'}")
print(f"Model: {model}")
print(f"Anahtar öneki: {api_key[:15]}...")

import requests

url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": api_key,
}
payload = {
    "contents": [{"role": "user", "parts": [{"text": "Merhaba! 2+2 kaçtır? Tek kelime yanıt ver."}]}],
    "generationConfig": {"maxOutputTokens": 30, "temperature": 0.0}
}

print("\n[x-goog-api-key HEADER] ile istek gönderiliyor...")
try:
    r = requests.post(url, json=payload, headers=headers, timeout=15)
    print(f"HTTP Status: {r.status_code}")
    if r.ok:
        data = r.json()
        text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        print(f"✅ BAŞARILI! Yanıt: {text}")
    else:
        print(f"❌ HATA: {r.text[:500]}")
except Exception as e:
    print(f"❌ BAĞLANTI HATASI: {e}")
