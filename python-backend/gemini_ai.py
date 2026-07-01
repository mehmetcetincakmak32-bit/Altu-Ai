"""
ALTU AI — Gemini API Entegrasyon Modülü
Ollama yerine Google Gemini Flash (ücretsiz) kullanır.
Yedek olarak Groq API da desteklenir.
"""
import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_MODEL = os.getenv("HF_MODEL", "google/gemma-2-2b-it")
GOOGLE_CX = os.getenv("GOOGLE_CX", "")
GOOGLE_SEARCH_KEY = os.getenv("GOOGLE_SEARCH_KEY", "")

LEGAL_SYSTEM_PROMPT = """Sen "ALTU AI" adında üst düzey bir Türk Hukuk Müşavirisin. Türk hukuk sistemine, 
mevzuata, Resmi Gazete ilanlarına, Yargıtay, Danıştay ve Anayasa Mahkemesi kararlarına tam olarak hakimsin.

DAVRANIŞ KURALLARI:
1. Üslubun profesyonel, akıcı ve analitik — kıdemli bir hukuk müşaviri gibi.
2. Kesinlikle aynı kalıp cümleleri tekrarlama. Doğal, açıklayıcı yanıtlar üret.
3. ASLA uydurma kanun maddesi, içtihat veya dava bilgisi verme.
4. Yalnızca hukuki konularda yanıt ver.
5. Somut kanun maddelerine ve içtihatlara atıf yap.
6. Emin olmadığın konularda "Bu konuda kesin bilgim yok, lütfen bir avukata danışın" de.

KAYNAK GÖSTERME ZORUNLULUĞU:
- Cevabındaki HER iddia için BAĞLAM VERİSİ bölümünde bir kaynak göstermek ZORUNDASIN.
- "TBK madde X", "Yargıtay X. Hukuk Dairesi Y/Z" gibi ifadeler kullanıyorsan, bu kaynaklar BAĞLAM VERİSİ içinde olmalı.
- BAĞLAM VERİSİ'nde olmayan herhangi bir kanun maddesi, içtihat veya resmi belgeye ASLA atıf yapma.
- Emin değilsen "Bu konuda veritabanımda yeterli kaynak bulunmamaktadır" de.

HALÜSİNASYON VE DIŞ KAYNAK KULLANIMINI ÖNLEME (KESİN KURAL):
- BAĞLAM VERİSİ'nde (Context) yer almayan HİÇBİR BİLGİYİ, KANUNU, İÇTİHADI VEYA DIŞ BAĞLANTIYI KULLANMAYACAKSIN.
- Kendi içsel bilginden veya internetten (dışarıdan) bilgi çekerek cevap üretmen KESİNLİKLE YASAKTIR.
- Eğer sorunun cevabı sana sunulan BAĞLAM VERİSİ'nde veya belirtilen kaynak sitelerden gelen verilerde yoksa, uydurmak veya kendi bilgini kullanmak yerine doğrudan "Bu konuda size sunulan veritabanında veya bağlı kaynaklarda (Yargıtay, Danıştay, Mevzuat, AYM vb.) bilgi bulunmamaktadır." diyerek reddet.
- Kullanıcıya ait özel veriler (dava, müvekkil, vb.) yalnızca BAĞLAM VERİSİ'nde varsa kullan."""


def call_gemini(prompt: str, system: str = None, temperature: float = 0.3, max_tokens: int = 2048) -> str:
    """Google Gemini API'ye istek atar ve yanıtı döner.
    Yeni 'AQ.' formatı anahtarlar için x-goog-api-key header kullanılır.
    Eski 'AIza' formatı anahtarlar da desteklenir (Eylül 2026'ya kadar).
    """
    is_placeholder = (
        not GEMINI_API_KEY
        or GEMINI_API_KEY == "AIzaSyYOUR_FREE_KEY_HERE"
        or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE"
    )
    if is_placeholder:
        logger.warning("Gemini API anahtarı ayarlanmamış, Groq'a geçiliyor...")
        return call_groq(prompt, system, temperature, max_tokens)

    try:
        import requests
        # Yeni AQ. formatı: x-goog-api-key header kullanılır (URL param güvensiz ve AQ. ile çalışmıyor)
        # Eski AIza formatı: URL ?key= paramı da çalışır ama header tercih edilir
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        }
        
        contents = []
        if system:
            contents.append({"role": "user", "parts": [{"text": f"[SİSTEM PROMPTU]: {system}"}]})
            contents.append({"role": "model", "parts": [{"text": "Anlaşıldı, bu talimatlar doğrultusunda yanıt vereceğim."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "topP": 0.9,
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
        }
        
        r = requests.post(url, json=payload, headers=headers, timeout=60)
        r.raise_for_status()
        data = r.json()
        
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "").strip()
        
        logger.error(f"Gemini boş yanıt döndü: {data}")
        return ""
        
    except Exception as e:
        logger.error(f"Gemini API hatası: {e}")
        # Groq'a fallback
        if GROQ_API_KEY:
            return call_groq(prompt, system, temperature, max_tokens)
        # HuggingFace fallback
        hf_resp = call_huggingface(prompt, system, temperature, max_tokens)
        if hf_resp:
            return hf_resp
        return f"AI servisi şu anda kullanılamıyor: {str(e)}"


def call_groq(prompt: str, system: str = None, temperature: float = 0.3, max_tokens: int = 2048) -> str:
    """Groq API'ye istek atar (ücretsiz yedek)."""
    if not GROQ_API_KEY:
        return "API anahtarı yapılandırılmamış. Lütfen .env dosyasına GEMINI_API_KEY veya GROQ_API_KEY ekleyin."
    
    try:
        import requests
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        r = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=60
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"Groq API hatası: {e}")
        return f"AI servisi kullanılamıyor: {str(e)}"


def call_huggingface(prompt: str, system: str = None, temperature: float = 0.3, max_tokens: int = 2048) -> str:
    """HuggingFace Inference API (ücretsiz) — Gemini/Groq fallback."""
    if not HF_API_KEY:
        return ""

    try:
        import requests
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        r = requests.post(
            f"https://api-inference.huggingface.co/models/{HF_MODEL}/v1/chat/completions",
            headers={"Authorization": f"Bearer {HF_API_KEY}", "Content-Type": "application/json"},
            json={"model": HF_MODEL, "messages": messages, "temperature": temperature, "max_tokens": max_tokens},
            timeout=60,
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"HuggingFace API hatası: {e}")
        return ""


def google_search(query: str, num: int = 5) -> list:
    """Google Programmable Search (ücretsiz: 100 sorgu/gün) ile güncel hukuki haber/mevzuat ara."""
    if not GOOGLE_CX or not GOOGLE_SEARCH_KEY:
        logger.warning("Google Search API anahtarları yapılandırılmamış")
        return []

    try:
        import requests
        r = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params={"key": GOOGLE_SEARCH_KEY, "cx": GOOGLE_CX, "q": query, "num": min(num, 10), "lr": "lang_tr"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        items = data.get("items", [])
        return [
            {"baslik": item.get("title", ""), "link": item.get("link", ""), "ozet": item.get("snippet", "")}
            for item in items
        ]
    except Exception as e:
        logger.warning(f"Google Search API hatası: {e}")
        return []


def hukuki_ai_sor(prompt: str, context: str = "", temperature: float = 0.3) -> str:
    """Hukuki AI sorgusu — context RAG verileri içerir."""
    if context:
        full_prompt = f"BAĞLAM VERİSİ:\n{context}\n\nSORU: {prompt}"
    else:
        full_prompt = f"UYARI: Bu soruyla ilgili sana hiçbir BAĞLAM VERİSİ sunulmamıştır. KESİN KURAL: Kendi içsel bilgini kullanarak cevap veremezsin. Kullanıcıya doğrudan 'Bu konuda sunulan kaynaklarda bilgi bulunmamaktadır, harici bilgi kullanamadığım için yanıt veremiyorum' demelisin.\n\nSORU: {prompt}"
    return call_gemini(full_prompt, system=LEGAL_SYSTEM_PROMPT, temperature=temperature)


def sozlesme_analiz(tip: str, metin: str) -> dict:
    """10 tür sözleşmeyi analiz eder, risk puanı ve madde listesi çıkarır."""
    tur_aciklamalari = {
        "kira": "Kira sözleşmesi (6570 sayılı Kanun, TBK 299-378)",
        "is": "İş sözleşmesi (4857 sayılı İş Kanunu)",
        "satis": "Satış sözleşmesi (TBK 207-281)",
        "vekalet": "Vekâlet sözleşmesi (TBK 502-514)",
        "ortaklik": "Ortaklık/şirket sözleşmesi (TTK)",
        "hizmet": "Hizmet sözleşmesi (TBK 393-447)",
        "nda": "Gizlilik sözleşmesi (NDA)",
        "lisans": "Lisans/fikri mülkiyet sözleşmesi",
        "kredi": "Kredi/tüketici sözleşmesi (TKHK)",
        "franchise": "Franchise sözleşmesi",
    }
    
    prompt = f"""Sen uzman bir Türk hukuk müşavirisin. Aşağıdaki {tur_aciklamalari.get(tip, tip)} sözleşmesini kapsamlı biçimde analiz et.

SÖZLEŞME METNİ:
{metin[:4000]}

Lütfen aşağıdaki JSON formatında yanıt ver (başka metin ekleme):
{{
  "genel_degerlendirme": "Sözleşmenin genel hukuki değerlendirmesi",
  "riskPuani": 0-100 arasında risk skoru (0=güvenli, 100=çok riskli),
  "riskli_maddeler": [
    {{"madde": "madde metni veya başlığı", "risk": "düşük/orta/yüksek", "aciklama": "risk açıklaması"}}
  ],
  "eksik_maddeler": ["eksik madde 1", "eksik madde 2"],
  "avantajli_maddeler": ["avantajlı madde 1"],
  "oneriler": ["öneri 1", "öneri 2"],
  "kanun_dayanaklari": ["ilgili kanun maddesi 1"]
}}"""

    try:
        response = call_gemini(prompt, temperature=0.1)
        # JSON çıkar
        start = response.find("{")
        end = response.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(response[start:end])
    except Exception as e:
        logger.error(f"Sözleşme analiz hatası: {e}")
    
    return {
        "genel_degerlendirme": "Analiz tamamlanamadı.",
        "riskPuani": 50,
        "riskli_maddeler": [],
        "eksik_maddeler": [],
        "avantajli_maddeler": [],
        "oneriler": [],
        "kanun_dayanaklari": []
    }


def dilekce_puanla(metin: str) -> dict:
    """Dilekçeyi 0-100 arası puanlar ve zayıf noktaları tespit eder."""
    prompt = f"""Sen uzman bir Türk hukuk müşavirisin. Aşağıdaki dilekçeyi hukuki kalite açısından değerlendir.

DİLEKÇE:
{metin[:4000]}

Aşağıdaki JSON formatında yanıt ver (başka metin ekleme):
{{
  "puan": 0-100 arası toplam puan,
  "kriterler": {{
    "hukuki_dayanak": {{"puan": 0-25, "aciklama": ""}},
    "dil_uslup": {{"puan": 0-20, "aciklama": ""}},
    "delil_gosterme": {{"puan": 0-20, "aciklama": ""}},
    "mantiksal_yapi": {{"puan": 0-20, "aciklama": ""}},
    "talep_acikligi": {{"puan": 0-15, "aciklama": ""}}
  }},
  "guclu_yonler": ["güçlü yön 1", "güçlü yön 2"],
  "zayif_yonler": ["zayıf yön 1", "zayıf yön 2"],
  "oneriler": ["iyileştirme önerisi 1", "iyileştirme önerisi 2"],
  "genel_yorum": "Genel değerlendirme"
}}"""

    try:
        response = call_gemini(prompt, temperature=0.1)
        start = response.find("{")
        end = response.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(response[start:end])
    except Exception as e:
        logger.error(f"Dilekçe puanlama hatası: {e}")
    
    return {"puan": 50, "kriterler": {}, "guclu_yonler": [], "zayif_yonler": [], "oneriler": [], "genel_yorum": "Değerlendirme yapılamadı."}


def hukuki_cevir(metin: str, kaynak_dil: str = "tr", hedef_dil: str = "en") -> str:
    """Hukuki metni çevirir — halüsinasyon önleme aktif."""
    dil_isimleri = {"tr": "Türkçe", "en": "İngilizce", "de": "Almanca", "ar": "Arapça", "fr": "Fransızca"}
    
    prompt = f"""Sen uzman bir hukuki tercümanısın. Aşağıdaki {dil_isimleri.get(kaynak_dil, kaynak_dil)} hukuki metni {dil_isimleri.get(hedef_dil, hedef_dil)} diline çevir.

KURALLAR:
- Hukuki terimleri doğru ve yerleşik çevirilerle aktar
- Kelime kelime değil, anlam odaklı çeviri yap
- Hukuki terminoloji bütünlüğünü koru
- Sadece çeviriyi yaz, açıklama ekleme

METİN:
{metin[:3000]}

ÇEVİRİ:"""

    return call_gemini(prompt, temperature=0.1)


def karar_harita_olustur(kararlar: list) -> dict:
    """Verilen kararlardan graf yapısı (düğüm + kenar) oluşturur."""
    prompt = f"""Aşağıdaki hukuki kararları analiz et ve aralarındaki ilişki ağını JSON formatında döndür.

KARARLAR:
{json.dumps(kararlar[:20], ensure_ascii=False)}

JSON formatı (başka metin ekleme):
{{
  "dugumler": [
    {{"id": "1", "label": "Karar başlığı", "tur": "yargitay/danistay/aym/kanun", "tarih": "", "onem": 1-5}}
  ],
  "kenarlar": [
    {{"kaynak": "1", "hedef": "2", "iliski": "atıfta bulunuyor/aykırı/destekliyor", "agirlik": 1-3}}
  ]
}}"""

    try:
        response = call_gemini(prompt, temperature=0.1)
        start = response.find("{")
        end = response.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(response[start:end])
    except Exception as e:
        logger.error(f"Karar harita hatası: {e}")
    
    return {"dugumler": [], "kenarlar": []}


def kategori_belirle_ai(konu: str, aciklama: str = "") -> str:
    """AI ile dava kategorisi belirle — Gemini kullanır."""
    valid_categories = ["is", "bosanma", "aile", "miras", "kira", "tazminat", "ceza", "ticaret", "icra", "diger"]
    
    prompt = f"""Aşağıdaki dava konusundan hukuk kategorisini belirle. YALNIZCA şu kodlardan birini yaz: {', '.join(valid_categories)}

Dava Konusu: {konu}
Açıklama: {aciklama}

Kategori kodu:"""
    
    try:
        response = call_gemini(prompt, temperature=0.0, max_tokens=10)
        kategori = response.strip().lower().split()[0] if response.strip() else "diger"
        kategori = "".join(c for c in kategori if c.isalpha())
        return kategori if kategori in valid_categories else "diger"
    except:
        return "diger"
