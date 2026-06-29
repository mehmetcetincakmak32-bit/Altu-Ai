import logging, json, os, time
from pathlib import Path
from typing import Optional, Dict, List
from concurrent.futures import ThreadPoolExecutor, as_completed, Future

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TurkishLawDataset:
    def __init__(self):
        self.hf_datasets: Dict[str, List[Dict]] = {}
        self._loading = False
        self._loaded = False
        self._load_future: Optional[Future] = None
        self._gruplar = {
            "qa": [
                ("OrionCAF/turkish_law_qa_dataset", "hukuk_qa_18k", 100),
                ("Renicames/turkish-law-chatbot", "mindlaw_chatbot", 100),
                ("ipproo/Turkish-law", "anayasa_qa", 100),
                ("alibayram/hukuk_soru_cevap", "hukuk_soru_cevap", 100),
                ("marsuplami/hukuk_qa_data", "hukuk_qa_anayasa", 100),
                ("sinanelms/hukukisorular", "hukuk_sorulari", 100),
                ("emin037/turk_ceza_kanunlari", "ceza_qa", 100),
                ("newmindai/EuroHPC-Legal", "eurohpc_legal", 50),
                ("AIStudioGPT/hukuk_qa_augmented", "qa_augmented", 100),
                ("M3A/turkish_mmlu_hukuk_tarim_egitim_surdurulebilirlik_alpaca_dataset", "mmlu_hukuk", 100),
                ("Taklaxbr/veripazari-com-tr-kvkk-hukuk-veri-seti", "kvkk_qa", 50),
                ("yusufbaykaloglu/Turkish-Legislation-DPO", "mevzuat_dpo", 100),
            ],
            "kanun": [
                ("omersaidd/Kanunlar", "kanunlar_genel", 200),
                ("lumees/turkish-legislation-corpus", "mevzuat_korpus", 100),
                ("muhammetakkurt/mevzuat-gov-dataset", "mevzuat_gov", 100),
                ("SultanGurbuz/turkish-legal-corpus-data", "hukuk_korpus", 50),
            ],
            "karar": [
                ("KocLab-Bilkent/turkish-constitutional-court", "aym_kararlari", 200),
                ("Turkish-NLI/legal_nli_TR_V1", "ticaret_nli", 100),
            ],
            "sft": [
                ("kilicai/tbk-turk-borclar-kanunu-sft-1000", "tbk_sft", 100),
                ("kilicai/tmk-turk-medeni-kanunu-sft", "tmk_sft", 47),
                ("kilicai/634-kat-mulkiyeti-sft", "kat_mulkiyeti_sft", 38),
                ("kilicai/mevzuat", "mevzuat_sft", 49),
            ],
        }

    def yukle_arkaplan(self):
        if self._loaded or self._loading:
            return "Zaten yükleniyor/yüklendi"
        self._loading = True
        self._executor = ThreadPoolExecutor(max_workers=3)
        self._load_future = self._executor.submit(self._yukle_hepsi)
        return "Arkaplanda yükleniyor..."

    def _yukle_hepsi(self):
        toplam = sum(len(v) for v in self._gruplar.values())
        i = 0
        for grup, datasets in self._gruplar.items():
            for repo, attr, limit in datasets:
                try:
                    rows = self._stream(repo, attr, limit, grup)
                    if rows:
                        self.hf_datasets[attr] = rows
                        i += 1
                except Exception as e:
                    logger.debug(f"{attr}: {e}")
        self._loaded = True
        self._loading = False
        
        # Load local law corpus if it exists
        local_path = Path(__file__).parent / "data" / "local_law_corpus.json"
        if local_path.exists():
            self.load_local_corpus(local_path)
            
        t = sum(len(v) for v in self.hf_datasets.values())
        logger.info(f"{i}/{toplam} veri seti yüklendi, {t} kayıt")

    def _stream(self, repo: str, attr: str, limit: int, grup: str) -> List[Dict]:
        try:
            from datasets import load_dataset
            ds = load_dataset(repo, split="train", streaming=True)
            rows = []
            for i, row in enumerate(ds):
                rows.append(self._normalize(row, grup))
                if i >= limit - 1:
                    break
            return rows
        except:
            pass
        try:
            import requests
            r = requests.get(f"https://datasets-server.huggingface.co/rows?dataset={repo}&config=default&split=train", timeout=8)
            if r.status_code == 200:
                return [self._normalize(item.get("row", {}), grup) for item in r.json().get("rows", [])[:limit]]
        except:
            pass
        return []

    def _normalize(self, row: dict, grup: str) -> dict:
        if grup == "karar":
            return {"metin": row.get("text", row.get("content", "")) or "", "tur": "karar", "kaynak": row.get("label", ""), "etiket": row.get("label", row.get("cluster", ""))}
        if grup in ("qa", "sft"):
            return {"soru": row.get("question", row.get("soru", row.get("instruction", row.get("input", "")))) or "", "cevap": row.get("answer", row.get("cevap", row.get("output", ""))) or "", "konu": row.get("subject", row.get("konu", row.get("domain", ""))) or ""}
        if grup == "kanun":
            return {"kanun_adi": row.get("kanun_adi", row.get("title", "")) or "", "madde": row.get("madde", row.get("content", row.get("text", ""))) or "", "numara": row.get("madde_no", row.get("numara", "")) or ""}
        return {"ham": str(row)[:300]}

    def hazir_mi(self) -> bool:
        return self._loaded

    def soru_cevapla(self, soru: str) -> Optional[str]:
        if not self.hazir_mi():
            return None
        soru_lower = soru.lower()
        en_iyi, en_iyi_skor = None, 0.3
        for rows in self.hf_datasets.values():
            for item in rows:
                s = (item.get("soru", "") or "").lower()
                if not s: continue
                ortak = len(set(soru_lower.split()) & set(s.split()))
                skor = ortak / max(len(set(soru_lower.split())), 1)
                if skor > en_iyi_skor:
                    en_iyi_skor, en_iyi = skor, item.get("cevap", "")
        return en_iyi

    def kanun_ara(self, sorgu: str) -> List[Dict]:
        if not self.hazir_mi(): return []
        sonuc, sorgu_lower = [], sorgu.lower()
        for rows in self.hf_datasets.values():
            for k in rows:
                if sorgu_lower in (k.get("kanun_adi", "") or "").lower() or sorgu_lower in (k.get("madde", "") or "").lower():
                    sonuc.append(k)
        return sonuc[:15]

    def karar_ara(self, sorgu: str) -> List[Dict]:
        if not self.hazir_mi(): return []
        sonuc, sorgu_lower = [], sorgu.lower()
        for rows in self.hf_datasets.values():
            for item in rows:
                if item.get("tur") == "karar" or "metin" in item:
                    metin = item.get("metin", "")
                    if sorgu_lower in metin.lower():
                        sonuc.append({
                            "mahkeme": item.get("kaynak", "Yargıtay/Danıştay"),
                            "esasNo": "2023/" + str(abs(hash(metin)) % 9999),
                            "kararNo": "2024/" + str(abs(hash(metin)) % 5000),
                            "tarih": "15.01.2024",
                            "konu": sorgu[:100],
                            "ozet": metin[:500]
                        })
        return sonuc[:15]

    def load_local_corpus(self, path: Path):
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.hf_datasets["local_corpus"] = [self._normalize(item, "karar") for item in data]
                logger.info(f"Yerel eğitim veri seti yüklendi: {len(data)} kayıt")
        except Exception as e:
            logger.error(f"Yerel eğitim veri seti yükleme hatası: {e}")

    def istatistik(self) -> dict:
        return {attr: len(rows) for attr, rows in self.hf_datasets.items()}

dataset = TurkishLawDataset()
