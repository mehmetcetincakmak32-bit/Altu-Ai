"""
ALTU AI — UETS (Ulusal Elektronik Tebligat Sistemi) Entegrasyonu
PTT UETS API'si uzerinden tebligatlari kontrol eder, indirir ve eslesme yapar.
"""

import logging, json, base64, os
from datetime import datetime
from typing import Optional, List, Dict
from pathlib import Path

logger = logging.getLogger(__name__)

UETS_API_PROD = "https://api.uets.ptt.gov.tr"
UETS_API_TEST = "https://api-test.uets.ptt.gov.tr"
UETS_TIMEOUT = 30

DATA_DIR = Path(__file__).parent / "data" / "uets"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class UETSClient:
    def __init__(self, kurum_kodu: str = "", kurum_sifre: str = "", kullanici_adi: str = "",
                 sifre: str = "", test_modu: bool = True):
        self.base_url = UETS_API_TEST if test_modu else UETS_API_PROD
        self.kurum_kodu = kurum_kodu
        self.kurum_sifre = kurum_sifre
        self.kullanici_adi = kullanici_adi
        self.sifre = sifre
        self.token = ""
        self.session = None
        self._giris_yapildi = False

    def _get_session(self):
        import requests
        if not self.session:
            self.session = requests.Session()
            self.session.headers.update({
                "User-Agent": "ALTU-AI/1.0",
                "Accept": "application/json",
                "Content-Type": "application/json",
            })
        return self.session

    def giris_yap(self) -> bool:
        session = self._get_session()
        try:
            payload = {
                "kurumKodu": self.kurum_kodu,
                "kurumSifre": self.kurum_sifre,
                "kullaniciAdi": self.kullanici_adi,
                "sifre": self.sifre,
            }
            r = session.post(f"{self.base_url}/api/auth/login", json=payload, timeout=UETS_TIMEOUT)
            if r.status_code == 200:
                data = r.json()
                self.token = data.get("token", data.get("accessToken", ""))
                session.headers["Authorization"] = f"Bearer {self.token}"
                self._giris_yapildi = True
                logger.info("UETS giris basarili")
                return True
            logger.warning(f"UETS giris basarisiz: {r.status_code} {r.text[:200]}")
        except Exception as e:
            logger.warning(f"UETS baglanti hatasi: {e}")
        self._giris_yapildi = False
        return False

    def tebligatlari_getir(self, limit: int = 50, sayfa: int = 1) -> List[Dict]:
        if not self._giris_yapildi and not self.giris_yap():
            return []
        session = self._get_session()
        try:
            r = session.get(
                f"{self.base_url}/api/tebligat",
                params={"sayfa": sayfa, "limit": limit},
                timeout=UETS_TIMEOUT
            )
            if r.status_code == 200:
                data = r.json()
                return data.get("data", data.get("tebligatlar", data.get("list", [])))
        except Exception as e:
            logger.warning(f"UETS tebligat listesi hatasi: {e}")
        return []

    def tebligat_indir(self, tebligat_no: str) -> Optional[Dict]:
        if not self._giris_yapildi and not self.giris_yap():
            return None
        session = self._get_session()
        try:
            r = session.get(
                f"{self.base_url}/api/tebligat/{tebligat_no}",
                timeout=UETS_TIMEOUT
            )
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            logger.warning(f"UETS tebligat indirme hatasi {tebligat_no}: {e}")
        return None

    def tebligat_oku(self, tebligat_no: str) -> bool:
        if not self._giris_yapildi and not self.giris_yap():
            return False
        session = self._get_session()
        try:
            r = session.post(
                f"{self.base_url}/api/tebligat/{tebligat_no}/oku",
                timeout=UETS_TIMEOUT
            )
            return r.status_code == 200
        except Exception as e:
            logger.warning(f"UETS okundu hatasi {tebligat_no}: {e}")
        return False


class UETSManager:
    def __init__(self):
        self.client = UETSClient()

    def kurulum_yap(self, kurum_kodu: str, kurum_sifre: str, kullanici_adi: str, sifre: str, test: bool = True) -> bool:
        self.client = UETSClient(kurum_kodu, kurum_sifre, kullanici_adi, sifre, test)
        return self.client.giris_yap()

    def kontrol_et(self, user_id: str = "") -> Dict:
        """Tebligatlari kontrol et, yenileri indir ve eslestir."""
        sonuc = {"toplam": 0, "yeni": 0, "hata": ""}
        try:
            tebligatlar = self.client.tebligatlari_getir(limit=100)
            sonuc["toplam"] = len(tebligatlar)

            for tb in tebligatlar:
                tebligat_no = tb.get("tebligatNo") or tb.get("id") or tb.get("no", "")
                if not tebligat_no:
                    continue

                dosya_url = tb.get("dosyaUrl") or tb.get("url", "")
                icerik = ""

                if dosya_url:
                    try:
                        import requests
                        r = requests.get(dosya_url, timeout=30)
                        if r.status_code == 200:
                            icerik = r.text[:5000] if "text" in r.headers.get("Content-Type", "") else "(Binary dosya)"
                    except:
                        icerik = "(Dosya indirilemedi)"

                kayit = {
                    "tebligatNo": tebligat_no,
                    "konu": tb.get("konu") or tb.get("baslik", ""),
                    "gonderen": tb.get("gonderen") or tb.get("gonderenAdi", ""),
                    "alici": tb.get("alici") or tb.get("aliciAdi", ""),
                    "tur": tb.get("tur", "tebligat"),
                    "durum": "alindi",
                    "icerik": icerik[:10000],
                    "dosyaUrl": dosya_url,
                    "dosyaTuru": tb.get("dosyaTuru", "pdf"),
                    "gonderimTarihi": tb.get("gonderimTarihi") or tb.get("tarih", ""),
                    "scrap_tarihi": datetime.now().isoformat(),
                }

                self._kaydet_vektor_store(kayit, user_id)
                sonuc["yeni"] += 1

        except Exception as e:
            sonuc["hata"] = str(e)
            logger.error(f"UETS kontrol hatasi: {e}")

        return sonuc

    def _kaydet_vektor_store(self, kayit: Dict, user_id: str):
        try:
            kayit_path = DATA_DIR / f"{kayit['tebligatNo']}.json"
            with open(kayit_path, "w", encoding="utf-8") as f:
                json.dump(kayit, f, ensure_ascii=False, indent=2)

            from vector_store import get_vector_store
            store = get_vector_store(subdomain=None)
            store.add_text(
                text=f"UETS Tebligat\nNo: {kayit['tebligatNo']}\nKonu: {kayit['konu']}\nGonderen: {kayit['gonderen']}\nIcerik: {kayit['icerik'][:2000]}",
                metadata={
                    "kaynak": "uets",
                    "tur": "tebligat",
                    "tebligatNo": kayit["tebligatNo"],
                    "konu": kayit["konu"],
                    "gonderen": kayit["gonderen"],
                    "tarih": kayit["gonderimTarihi"],
                    "user_id": user_id,
                }
            )
        except Exception as e:
            logger.warning(f"UETS kayit hatasi: {e}")


uets_manager = UETSManager()
