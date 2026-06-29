"""
ALTU AI — Resmi Kaynaklardan Hukuki Veri Tarama ve İndeksleme Sistemi
Sadece 5 resmi kaynak: Mevzuat.gov.tr, AYM, Yargıtay, Danıştay, Resmi Gazete

- PDF'leri doğrudan URL'den tarar (HEAD request, ~37 req/s)
- Court kararları için Bedesten API + POST scraping
- Vektör veritabanına yazar (tarih bazlı dedup)
"""

import os, json, time, re, sys, hashlib, random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

try:
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except ImportError:
    os.system(f"\"{sys.executable}\" -m pip install requests -q")
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DATA_DIR = Path(__file__).parent / "data" / "scraper"
DATA_DIR.mkdir(parents=True, exist_ok=True)

KANUN_DIR = Path(r"C:\Users\acer\Desktop\kanun")

MEVZUAT_BASE = "https://www.mevzuat.gov.tr"
AYM_BASE = "https://www.anayasa.gov.tr"
YARGITAY_BASE = "https://karararama.yargitay.gov.tr"
DANISTAY_BASE = "https://karararama.danistay.gov.tr"
RG_BASE = "https://www.resmigazete.gov.tr"

KATEGORILER = [
    {"tur": "1", "ad": "anayasa",         "klasor": "anayasa"},
    {"tur": "5", "ad": "kanunlar",        "klasor": "kanunlar"},
    {"tur": "6", "ad": "khk",             "klasor": "kanun-hukmunde-kararnameler"},
    {"tur": "8", "ad": "cbk",             "klasor": "cumhurbaskanligi-kararnameleri"},
    {"tur": "10","ad": "tuzukler",        "klasor": "tuzukler"},
    {"tur": "11","ad": "cb-kararlari",    "klasor": "cumhurbaskani-kararlari"},
    {"tur": "12","ad": "cb-genelgeleri",  "klasor": "cumhurbaskanligi-genelgeleri"},
    {"tur": "7", "ad": "yonetmelikler",   "klasor": "yonetmelikler"},
    {"tur": "9", "ad": "tebligler",       "klasor": "tebligler"},
    {"tur": "13","ad": "mulga",           "klasor": "mulga-mevzuat"},
]

TERTIPLER = [0, 1]
MAX_NO = 20000
BOS_LIMIT = 500

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/pdf,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Referer": "https://www.mevzuat.gov.tr/",
}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


# ---------------------------------------------------------------------------
class GeminiClient:
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        self.available = False
        if self.api_key:
            try:
                r = requests.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}",
                    params={"key": self.api_key}, timeout=10
                )
                self.available = r.status_code == 200
            except:
                pass

    def sor(self, prompt: str) -> Optional[str]:
        if not self.available:
            return None
        try:
            r = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
                params={"key": self.api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.2}
                },
                timeout=60
            )
            if r.status_code == 200:
                data = r.json()
                metin = ""
                for c in data.get("candidates", []):
                    for p in c.get("content", {}).get("parts", []):
                        metin += p.get("text", "")
                return metin.strip() or None
        except:
            pass
        return None


# ---------------------------------------------------------------------------
class LegalScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.gemini = GeminiClient()
        self.toplam_indexlenen = 0

    # ======================== MEVZUAT.GOV.TR ========================

    def pdf_var_mi(self, tertip: int, tur: str, no: int) -> bool:
        try:
            r = self.session.head(
                f"{MEVZUAT_BASE}/MevzuatMetin/{tertip}.{tur}.{no}.pdf",
                timeout=10, allow_redirects=True
            )
            return "application/pdf" in r.headers.get("Content-Type", "")
        except:
            return False

    def pdf_indir(self, tertip: int, tur: str, no: int, hedef: Path) -> int:
        url = f"{MEVZUAT_BASE}/MevzuatMetin/{tertip}.{tur}.{no}.pdf"
        try:
            r = self.session.get(url, timeout=30, stream=True)
            if r.status_code == 200 and "application/pdf" in r.headers.get("Content-Type", ""):
                hedef.parent.mkdir(parents=True, exist_ok=True)
                with open(hedef, "wb") as f:
                    for c in r.iter_content(65536):
                        f.write(c)
                return hedef.stat().st_size
        except:
            pass
        return 0

    def pdf_metin_al(self, pdf_yol: Path) -> str:
        try:
            import fitz
            doc = fitz.open(str(pdf_yol))
            metin = "".join(s.get_text() for s in doc)
            doc.close()
            return metin[:15000]
        except:
            try:
                import PyPDF2
                with open(pdf_yol, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    return "".join(p.extract_text() for p in reader.pages)[:15000]
            except:
                return ""

    def pdf_icerik_ozeti(self, pdf_yol: Path, no: int, tur: str, tertip: int) -> Dict:
        metin = self.pdf_metin_al(pdf_yol)
        if len(metin) < 100:
            return {"baslik": "", "tur": "", "kategori": "", "konu": "", "ozet": ""}

        if self.gemini.available:
            prompt = f"""Su mevzuati analiz et:
Mevzuat No: {no}  Tur: {tur}  Tertip: {tertip}

METIN (ilk 4000 karakter):
{metin[:4000]}

YANIT SADECE JSON:
{{"baslik": "...", "tur": "Kanun/KHK/CBK/Yonetmelik/Teblig/Tuzuk/Anayasa", "kategori": "Ceza/Ticaret/Borclar/Idare/Vergi/Is/Medeni/Anayasa/Icra/Iflas/Fikir/Saglik/Egitim/Cevre/Maliye/Gumruk/Diger", "konu": "...", "ozet": "2 cumle ozet"}}"""
            sonuc = self.gemini.sor(prompt)
            if sonuc:
                try:
                    start = sonuc.find("{")
                    end = sonuc.rfind("}") + 1
                    if start != -1:
                        return json.loads(sonuc[start:end])
                except:
                    pass

        tur_adi = {"1": "Anayasa", "5": "Kanun", "6": "KHK", "7": "Yonetmelik",
                    "8": "CBK", "9": "Teblig", "10": "Tuzuk", "11": "CB Karari",
                    "12": "CB Genelgesi", "13": "Mulga"}.get(tur, "Mevzuat")
        return {"baslik": f"{tur_adi} No:{no}", "tur": tur_adi, "kategori": "",
                "konu": metin[:200], "ozet": metin[:500]}

    def mevzuat_tara(self, callback=None):
        """Mevzuat.gov.tr PDF'lerini tara, ayikla, vektorlestir."""
        logger.info("=== MEVZUAT.GOV.TR TARANIYOR ===")
        tertipler = [0, 1]
        toplam = 0

        for kat in KATEGORILER:
            for tertip in tertipler:
                bulundu = False
                for no in range(1, 101):
                    if self.pdf_var_mi(tertip, kat["tur"], no):
                        bulundu = True
                        break
                if not bulundu:
                    for no in range(110, 2001, 10):
                        if self.pdf_var_mi(tertip, kat["tur"], no):
                            bulundu = True
                            break

                if not bulundu:
                    logger.info(f"  {kat['ad']} tertip={tertip} -> BOS")
                    continue

                logger.info(f"  {kat['ad']} tertip={tertip} PDF VAR -> taranıyor...")
                bos_sayac = 0
                for no in range(1, MAX_NO + 1):
                    if self.pdf_var_mi(tertip, kat["tur"], no):
                        bos_sayac = 0
                        dosya = f"{tertip}.{kat['tur']}.{no}.pdf"
                        hedef = KANUN_DIR / kat["klasor"] / "pdf" / dosya
                        boyut = self.pdf_indir(tertip, kat["tur"], no, hedef)
                        if boyut > 0:
                            ozet = self.pdf_icerik_ozeti(hedef, no, kat["tur"], tertip)
                            self._vektor_store_ekle(
                                text=f"Mevzuat: {ozet.get('baslik', dosya)}\nTur: {ozet.get('tur', kat['ad'])}\nKategori: {ozet.get('kategori', '')}\nKonu: {ozet.get('konu', '')}\nIcerik: {ozet.get('ozet', '')}",
                                metadata={
                                    "kaynak": "mevzuat",
                                    "tur": kat["ad"],
                                    "tertip": tertip,
                                    "tur_kod": kat["tur"],
                                    "no": no,
                                    "baslik": ozet.get("baslik", ""),
                                    "kategori": ozet.get("kategori", ""),
                                    "tarih": datetime.now().isoformat(),
                                    "text_path": str(hedef),
                                    "scrape_tarihi": datetime.now().isoformat(),
                                }
                            )
                            toplam += 1
                            if callback:
                                callback("mevzuat", no, kat["ad"])
                    else:
                        bos_sayac += 1
                        if bos_sayac >= BOS_LIMIT and toplam > 0:
                            break
                    if no % 500 == 0:
                        logger.info(f"    no={no} bulunan={toplam}")

        logger.info(f"  Mevzuat: {toplam} PDF indeklendi")
        return toplam

    # ======================== ANAYASA MAHKEMESI (AYM) ========================

    def aym_mevzuat_tara(self):
        """Anayasa Mahkemesi mevzuat sayfalarini tara (anayasa, kanun, ictuzuk, yonetmelik)."""
        logger.info("=== AYM MEVZUAT TARANIYOR ===")
        toplam = 0
        aym_mevzuat_urls = [
            ("anayasa", f"{AYM_BASE}/tr/mevzuat/anayasa"),
            ("kanun", f"{AYM_BASE}/tr/mevzuat/kanun"),
            ("ictuzuk", f"{AYM_BASE}/tr/mevzuat/ictuzuk"),
            ("yonetmelik", f"{AYM_BASE}/tr/mevzuat/yonetmelikler"),
        ]

        for tur, url in aym_mevzuat_urls:
            try:
                r = self.session.get(url, timeout=30, verify=False)
                if r.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(r.text, "html.parser")
                    metin = soup.get_text(separator="\n", strip=True)
                    if len(metin) > 500:
                        self._vektor_store_ekle(
                            text=f"AYM {tur}\n{metin[:8000]}",
                            metadata={
                                "kaynak": "aym",
                                "tur": tur,
                                "url": url,
                                "tarih": datetime.now().isoformat(),
                                "scrape_tarihi": datetime.now().isoformat(),
                            }
                        )
                        toplam += 1
                        logger.info(f"  AYM {tur} -> {len(metin)} karakter indeklendi")
            except Exception as e:
                logger.warning(f"  AYM {tur} hata: {e}")

        return toplam

    def aym_aihs_indir(self):
        """AIHS (Avrupa Insan Haklari Sozlesmesi) PDF'ini indir ve indeksle."""
        logger.info("=== AIHS PDF INDIRILIYOR ===")
        url = f"{AYM_BASE}/media/3542/aihs_tr.pdf"
        hedef = DATA_DIR / "aihs_tr.pdf"
        try:
            r = self.session.get(url, timeout=60, stream=True, verify=False)
            if r.status_code == 200:
                with open(hedef, "wb") as f:
                    for c in r.iter_content(65536):
                        f.write(c)
                metin = self.pdf_metin_al(hedef)
                if metin:
                    self._vektor_store_ekle(
                        text=f"AIHS (Avrupa Insan Haklari Sozlesmesi) Turkce\n{metin[:15000]}",
                        metadata={
                            "kaynak": "aym",
                            "tur": "aihs",
                            "baslik": "Avrupa Insan Haklari Sozlesmesi",
                            "tarih": datetime.now().isoformat(),
                            "scrape_tarihi": datetime.now().isoformat(),
                        }
                    )
                    logger.info(f"  AIHS PDF: {len(metin)} karakter indeklendi")
                    return 1
        except Exception as e:
            logger.warning(f"  AIHS PDF hatasi: {e}")
        return 0

    # ======================== YARGITAY ========================

    def yargitay_tara(self, sorgu: str = "", limit: int = 100):
        """Yargitay kararlarini Bedesten API uzerinden cek ve indeksle."""
        logger.info(f"=== YARGITAY TARANIYOR: '{sorgu or 'tumu'}' ===")
        toplam = 0

        try:
            from remote_sources import call_yargi_mcp_tool, index_decision_to_vector_store

            arama_terimleri = [
                "kira", "is", "tazminat", "bosanma", "miras", "icra",
                "ticaret", "ceza", "aile", "trafik", "kamulastirma",
                "imar", "vergi", "sirket", "is kazasi", "eser",
                "gece", "kredi", "sigorta", "vekâlet"
            ] if not sorgu else [sorgu]

            for terim in arama_terimleri:
                try:
                    mcp_res = call_yargi_mcp_tool("search_bedesten_unified", {
                        "phrase": terim,
                        "court_types": ["YARGITAYKARARI"],
                        "pageNumber": 1
                    })
                    if mcp_res:
                        decide_data = []
                        if mcp_res.get("structuredContent") and isinstance(mcp_res["structuredContent"], dict):
                            decide_data = mcp_res["structuredContent"].get("decisions", [])
                        elif mcp_res.get("content"):
                            try:
                                c_text = mcp_res["content"][0].get("text", "")
                                decide_data = json.loads(c_text).get("decisions", [])
                            except:
                                pass

                        for item in decide_data[:limit]:
                            esas = item.get("esasNo", "")
                            doc_id = item.get("documentId", "")
                            doc_text = ""
                            if doc_id:
                                try:
                                    doc_res = call_yargi_mcp_tool("get_bedesten_document_markdown", {"documentId": doc_id})
                                    if doc_res:
                                        if doc_res.get("markdown_content"):
                                            doc_text = doc_res["markdown_content"]
                                        elif doc_res.get("content"):
                                            try:
                                                c_text = doc_res["content"][0].get("text", "")
                                                doc_text = json.loads(c_text).get("markdown_content", "") or c_text
                                            except:
                                                doc_text = doc_res["content"][0].get("text", "")
                                except:
                                    pass

                            new_item = {
                                "kaynak": "yargitay",
                                "esas": esas,
                                "karar": item.get("kararNo", ""),
                                "tarih": item.get("kararTarihiStr", ""),
                                "konu": item.get("birimAdi", "Yargıtay Kararı"),
                                "ozet": doc_text or f"{item.get('birimAdi', '')} dairesinin {esas} Esas sayılı ilamı.",
                                "mahkeme": "Yargıtay",
                                "birim": item.get("birimAdi", ""),
                                "documentId": doc_id,
                                "scrape_tarihi": datetime.now().isoformat(),
                            }
                            self._vektor_store_ekle(
                                text=f"Yargitay Karari\nEsas: {new_item['esas']}\nKarar: {new_item['karar']}\nTarih: {new_item['tarih']}\nKonu: {new_item['konu']}\nOzet: {new_item['ozet']}",
                                metadata=new_item
                            )
                            toplam += 1
                except Exception as e:
                    logger.warning(f"  Yargitay '{terim}' hatasi: {e}")

        except Exception as e:
            logger.warning(f"  Yargitay MCP baglanti hatasi: {e}")

        logger.info(f"  Yargitay: {toplam} karar indeklendi")
        return toplam

    # ======================== DANISTAY ========================

    def danistay_tara(self, sorgu: str = "", limit: int = 100):
        """Danistay kararlarini Bedesten API uzerinden cek ve indeksle."""
        logger.info(f"=== DANISTAY TARANIYOR: '{sorgu or 'tumu'}' ===")
        toplam = 0

        try:
            from remote_sources import call_yargi_mcp_tool, index_decision_to_vector_store

            arama_terimleri = [
                "vergi", "ihale", "imar", "kamulastirma", "ceza",
                "gumruk", "ticaret", "sigorta", "saglik", "ogretim",
                "cevre", "maliye", "muafiyet", "tescil", "pasaport"
            ] if not sorgu else [sorgu]

            for terim in arama_terimleri:
                try:
                    mcp_res = call_yargi_mcp_tool("search_bedesten_unified", {
                        "phrase": terim,
                        "court_types": ["DANISTAYKARAR"],
                        "pageNumber": 1
                    })
                    if mcp_res:
                        decide_data = []
                        if mcp_res.get("structuredContent") and isinstance(mcp_res["structuredContent"], dict):
                            decide_data = mcp_res["structuredContent"].get("decisions", [])
                        elif mcp_res.get("content"):
                            try:
                                c_text = mcp_res["content"][0].get("text", "")
                                decide_data = json.loads(c_text).get("decisions", [])
                            except:
                                pass

                        for item in decide_data[:limit]:
                            esas = item.get("esasNo", "")
                            doc_id = item.get("documentId", "")
                            doc_text = ""
                            if doc_id:
                                try:
                                    doc_res = call_yargi_mcp_tool("get_bedesten_document_markdown", {"documentId": doc_id})
                                    if doc_res:
                                        if doc_res.get("markdown_content"):
                                            doc_text = doc_res["markdown_content"]
                                        elif doc_res.get("content"):
                                            try:
                                                c_text = doc_res["content"][0].get("text", "")
                                                doc_text = json.loads(c_text).get("markdown_content", "") or c_text
                                            except:
                                                doc_text = doc_res["content"][0].get("text", "")
                                except:
                                    pass

                            new_item = {
                                "kaynak": "danistay",
                                "esas": esas,
                                "karar": item.get("kararNo", ""),
                                "tarih": item.get("kararTarihiStr", ""),
                                "konu": item.get("birimAdi", "Danıştay Kararı"),
                                "ozet": doc_text or f"{item.get('birimAdi', '')} dairesinin {esas} Esas sayılı ilamı.",
                                "mahkeme": "Danıştay",
                                "birim": item.get("birimAdi", ""),
                                "documentId": doc_id,
                                "scrape_tarihi": datetime.now().isoformat(),
                            }
                            self._vektor_store_ekle(
                                text=f"Danistay Karari\nEsas: {new_item['esas']}\nKarar: {new_item['karar']}\nTarih: {new_item['tarih']}\nKonu: {new_item['konu']}\nOzet: {new_item['ozet']}",
                                metadata=new_item
                            )
                            toplam += 1
                except Exception as e:
                    logger.warning(f"  Danistay '{terim}' hatasi: {e}")

        except Exception as e:
            logger.warning(f"  Danistay MCP baglanti hatasi: {e}")

        logger.info(f"  Danistay: {toplam} karar indeklendi")
        return toplam

    # ======================== RESMI GAZETE ========================

    def resmi_gazete_tara(self, gun_sayisi: int = 30):
        """Resmi Gazete PDF'lerini tarih bazli indir ve indeksle."""
        logger.info(f"=== RESMI GAZETE TARANIYOR (son {gun_sayisi} gun) ===")
        toplam = 0
        bugun = datetime.now()

        for gun in range(gun_sayisi):
            tarih = bugun - timedelta(days=gun)
            yil = tarih.strftime("%Y")
            ay = tarih.strftime("%m")
            gun_str = tarih.strftime("%d")
            for mukerer in ["", "1", "2"]:
                if mukerer:
                    pdf_adi = f"{yil}{ay}{gun_str}-{mukerer}.pdf"
                else:
                    pdf_adi = f"{yil}{ay}{gun_str}.pdf"
                url = f"{RG_BASE}/eskiler/{yil}/{ay}/{pdf_adi}"

                try:
                    r = self.session.head(url, timeout=10, allow_redirects=True)
                    if r.status_code == 200 and "application/pdf" in r.headers.get("Content-Type", ""):
                        hedef = DATA_DIR / "resmi_gazete" / pdf_adi
                        hedef.parent.mkdir(parents=True, exist_ok=True)
                        r2 = self.session.get(url, timeout=60, stream=True)
                        if r2.status_code == 200:
                            with open(hedef, "wb") as f:
                                for c in r2.iter_content(65536):
                                    f.write(c)
                            metin = self.pdf_metin_al(hedef)
                            if metin:
                                self._vektor_store_ekle(
                                    text=f"Resmi Gazete {tarih.strftime('%d.%m.%Y')}\n{metin[:10000]}",
                                    metadata={
                                        "kaynak": "resmi_gazete",
                                        "tarih": tarih.strftime("%d.%m.%Y"),
                                        "sayi": pdf_adi.replace(".pdf", ""),
                                        "url": url,
                                        "mukerer": mukerer or "0",
                                        "scrape_tarihi": datetime.now().isoformat(),
                                    }
                                )
                                toplam += 1
                                logger.info(f"  RG {tarih.strftime('%d.%m.%Y')} -> indeklendi")
                                break
                except:
                    continue

        logger.info(f"  Resmi Gazete: {toplam} sayi indeklendi")
        return toplam

    # ======================== VAR OLAN KANUN PDF'LERINI INDEXLE ========================

    def kanun_pdf_indexle(self):
        """Kanun klasorundeki PDF'leri ayikla ve vektor store'a yaz."""
        logger.info("=== VAR OLAN KANUN PDF'LERI INDEXLENIYOR ===")
        toplam = 0
        pdf_sayisi = 0

        for root, dirs, files in os.walk(str(KANUN_DIR)):
            for f in files:
                if f.endswith(".pdf"):
                    pdf_sayisi += 1
                    pdf_yol = Path(root) / f
                    try:
                        metin = self.pdf_metin_al(pdf_yol)
                        if len(metin) < 100:
                            continue

                        klasor_ad = Path(root).parent.name if Path(root).name == "pdf" else Path(root).name
                        tertip_tur_no = f.replace(".pdf", "").split(".")
                        tertip = tertip_tur_no[0] if len(tertip_tur_no) >= 1 else ""
                        tur = tertip_tur_no[1] if len(tertip_tur_no) >= 2 else ""
                        no = tertip_tur_no[2] if len(tertip_tur_no) >= 3 else ""

                        self._vektor_store_ekle(
                            text=f"Mevzuat PDF: {klasor_ad}\nDosya: {f}\n{metin[:10000]}",
                            metadata={
                                "kaynak": "mevzuat",
                                "tur": klasor_ad,
                                "tertip": tertip,
                                "tur_kod": tur,
                                "no": no,
                                "dosya": f,
                                "text_path": str(pdf_yol),
                                "scrape_tarihi": datetime.now().isoformat(),
                            }
                        )
                        toplam += 1
                    except Exception as e:
                        logger.warning(f"  PDF hata {f}: {e}")

        logger.info(f"  {pdf_sayisi} PDF dosyasi bulundu, {toplam} basariyla indeklendi")
        return toplam

    # ======================== VEKTOR STORE ========================

    def _vektor_store_ekle(self, text: str, metadata: Dict):
        """Vektor store'a ekle - tarih bazli dedup ile."""
        try:
            from vector_store import get_vector_store
            store = get_vector_store(subdomain=None)

            dedup_key = self._dedup_anahtari(metadata)
            varolan = [d for d in store.documents if d.get("metadata", {}).get("_dedup_key") == dedup_key]

            if varolan:
                eski_tarih = varolan[0].get("metadata", {}).get("scrape_tarihi", "")
                yeni_tarih = metadata.get("scrape_tarihi", "")
                if eski_tarih and yeni_tarih and yeni_tarih <= eski_tarih:
                    return
                store.documents = [d for d in store.documents if d.get("metadata", {}).get("_dedup_key") != dedup_key]

            metadata["_dedup_key"] = dedup_key
            store.add_text(text, metadata, chunk=True)
            self.toplam_indexlenen += 1
        except Exception as e:
            logger.warning(f"  Vektor store hatasi: {e}")

    def _dedup_anahtari(self, metadata: Dict) -> str:
        kaynak = metadata.get("kaynak", "")
        if kaynak == "mevzuat":
            return f"mevzuat_{metadata.get('tertip', '')}_{metadata.get('tur_kod', '')}_{metadata.get('no', '')}"
        elif kaynak in ("yargitay", "danistay"):
            return f"{kaynak}_{metadata.get('esas', '')}_{metadata.get('karar', '')}"
        elif kaynak == "resmi_gazete":
            return f"rg_{metadata.get('tarih', '')}_{metadata.get('sayi', '')}"
        elif kaynak == "aym":
            return f"aym_{metadata.get('tur', '')}"
        return hashlib.md5(json.dumps(metadata, sort_keys=True).encode()).hexdigest()

    # ======================== TUMUNU TARA ========================

    def tumunu_tara(self, mevzuat=True, aym=True, yargitay=True, danistay=True, rg=True, kanun_pdf=True):
        """Tum kaynaklari paralel tara."""
        sonuclar = {}
        with ThreadPoolExecutor(max_workers=3) as ex:
            futures = {}
            if mevzuat:
                futures[ex.submit(self.mevzuat_tara)] = "mevzuat"
            if aym:
                futures[ex.submit(self.aym_mevzuat_tara)] = "aym_mevzuat"
                futures[ex.submit(self.aym_aihs_indir)] = "aym_aihs"
            if yargitay:
                futures[ex.submit(self.yargitay_tara)] = "yargitay"
            if danistay:
                futures[ex.submit(self.danistay_tara)] = "danistay"
            if rg:
                futures[ex.submit(self.resmi_gazete_tara)] = "resmi_gazete"
            if kanun_pdf:
                futures[ex.submit(self.kanun_pdf_indexle)] = "kanun_pdf"

            for future in as_completed(futures):
                name = futures[future]
                try:
                    sonuclar[name] = future.result()
                except Exception as e:
                    logger.error(f"{name} hatasi: {e}")
                    sonuclar[name] = 0

        return sonuclar


# ---------------------------------------------------------------------------
def main():
    scraper = LegalScraper()

    import argparse
    parser = argparse.ArgumentParser(description="ALTU AI — Resmi Kaynak Tarama")
    parser.add_argument("--kaynak", choices=["tumu", "mevzuat", "aym", "yargitay", "danistay", "rg", "kanun_pdf"], default="tumu")
    parser.add_argument("--sorgu", type=str, default="", help="Arama sorgusu (yargitay/danistay)")
    parser.add_argument("--limit", type=int, default=100, help="Maks kayit sayisi")
    parser.add_argument("--gun", type=int, default=30, help="Kac gunluk RG")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"ALTU AI — Resmi Kaynak Tarama Basliyor")
    print(f"Kaynak: {args.kaynak}")
    print(f"{'='*60}\n")

    baslangic = time.time()

    if args.kaynak == "tumu":
        sonuc = scraper.tumunu_tara()
    elif args.kaynak == "mevzuat":
        sonuc = {"mevzuat": scraper.mevzuat_tara()}
    elif args.kaynak == "aym":
        s1 = scraper.aym_mevzuat_tara()
        s2 = scraper.aym_aihs_indir()
        sonuc = {"aym_mevzuat": s1, "aym_aihs": s2}
    elif args.kaynak == "yargitay":
        sonuc = {"yargitay": scraper.yargitay_tara(args.sorgu, args.limit)}
    elif args.kaynak == "danistay":
        sonuc = {"danistay": scraper.danistay_tara(args.sorgu, args.limit)}
    elif args.kaynak == "rg":
        sonuc = {"resmi_gazete": scraper.resmi_gazete_tara(args.gun)}
    elif args.kaynak == "kanun_pdf":
        sonuc = {"kanun_pdf": scraper.kanun_pdf_indexle()}

    gecen = time.time() - baslangic
    print(f"\n{'='*60}")
    print(f"TAMAMLANDI! ({gecen:.0f} saniye)")
    for k, v in sonuc.items():
        print(f"  {k}: {v} kayit")
    print(f"  TOPLAM INDEXLENEN: {scraper.toplam_indexlenen}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
