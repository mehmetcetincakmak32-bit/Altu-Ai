import os
import sys
import json
import time
import logging
import subprocess
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PROJECT_DIR = Path(__file__).parent.parent
STORAGE_DIR = PROJECT_DIR / "storage" / "data"
TENANTS_DIR = STORAGE_DIR / "tenants"
PYTHON_DIR = PROJECT_DIR / "python-backend"

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "apilex-hukuk")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

def check_ollama():
    try:
        import requests
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            logger.info(f"Mevcut Ollama modelleri: {models}")
            return models
    except Exception as e:
        logger.error(f"Ollama bağlantı hatası: {e}")
        logger.info("Ollama kurulumu: https://ollama.com/download")
    return []

def create_model():
    logger.info(f"'{OLLAMA_MODEL}' modeli oluşturuluyor...")
    try:
        modelfile_path = PROJECT_DIR / "Modelfile"
        if not modelfile_path.exists():
            logger.error("Modelfile bulunamadı!")
            return False

        result = subprocess.run(
            ["ollama", "create", OLLAMA_MODEL, "-f", str(modelfile_path)],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode == 0:
            logger.info(f"Model '{OLLAMA_MODEL}' başarıyla oluşturuldu!")
            return True
        else:
            logger.error(f"Model oluşturma hatası: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Model oluşturma başarısız: {e}")
        return False

def pull_base_model():
    try:
        logger.info("llama3.1:8b indiriliyor...")
        result = subprocess.run(
            ["ollama", "pull", "llama3.1:8b"],
            capture_output=True, text=True, timeout=600
        )
        if result.returncode == 0:
            logger.info("llama3.1:8b indirildi!")
            return True
        else:
            logger.error(f"İndirme hatası: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"İndirme başarısız: {e}")
        return False

def index_all_datasets():
    """Feed all legal datasets from Python backend into global vector store"""
    logger.info("Hukuk veri setleri global vektör deposuna indeksleniyor...")
    try:
        sys.path.insert(0, str(PYTHON_DIR))
        from dataset import dataset
        from vector_store import get_vector_store

        store = get_vector_store(subdomain=None)
        store.clear()

        total = 0
        for attr, rows in dataset.hf_datasets.items():
            for row in rows:
                text = json.dumps(row, ensure_ascii=False)
                store.add_text(
                    text,
                    metadata={"kaynak": attr, "tur": "hukuk_dataset"},
                    chunk=True
                )
                total += 1
            logger.info(f"  {attr}: {len(rows)} kayıt indekslendi")

        logger.info(f"Toplam {total} kayıt global vektör deposuna indekslendi!")
    except ImportError as e:
        logger.warning(f"Python dataset yüklenemedi: {e}")
    except Exception as e:
        logger.error(f"İndeksleme hatası: {e}")

def index_tenant_data():
    """Index each tenant's data (cases, clients, knowledge) into their vector store"""
    logger.info("Tenant verileri vektör depolarına indeksleniyor...")
    try:
        sys.path.insert(0, str(PYTHON_DIR))
        from vector_store import get_vector_store

        if not TENANTS_DIR.exists():
            logger.info("Henüz tenant klasörü yok.")
            return

        for tenant in TENANTS_DIR.iterdir():
            if not tenant.is_dir():
                continue

            subdomain = tenant.name
            store = get_vector_store(subdomain)
            store.clear()

            # Index cases
            davas_file = tenant / "davas.json"
            if davas_file.exists():
                try:
                    davas = json.loads(davas_file.read_text(encoding="utf-8")).get("davas", [])
                    for d in davas:
                        text = f"Dava: {d.get('ad','')} | Dosya No: {d.get('dosyaNo','')} | Konu: {d.get('konu','')} | Mahkeme: {d.get('mahkeme','')} | Durum: {d.get('durum','')} | Açıklama: {d.get('aciklama','')}"
                        store.add_text(text, metadata={"kaynak": "dava", "tur": "dava", "subdomain": subdomain})
                    logger.info(f"  {subdomain}: {len(davas)} dava indekslendi")
                except Exception as e:
                    logger.warning(f"  {subdomain} dava indeksleme hatası: {e}")

            # Index clients
            musteri_file = tenant / "musteriler.json"
            if musteri_file.exists():
                try:
                    musteris = json.loads(musteri_file.read_text(encoding="utf-8")).get("musteriler", [])
                    for m in musteris:
                        text = f"Müvekkil: {m.get('ad','')} {m.get('soyad','')} | TC: {m.get('tcKimlik','')} | Tel: {m.get('telefon','')}"
                        store.add_text(text, metadata={"kaynak": "musteri", "tur": "musteri", "subdomain": subdomain})
                    logger.info(f"  {subdomain}: {len(musteris)} müvekkil indekslendi")
                except Exception as e:
                    logger.warning(f"  {subdomain} musteri indeksleme hatası: {e}")

            # Index AI knowledge base
            knowledge_file = tenant / "ai_knowledge.json"
            if knowledge_file.exists():
                try:
                    knowledge = json.loads(knowledge_file.read_text(encoding="utf-8")).get("knowledge", [])
                    for k in knowledge:
                        text = f"{k.get('baslik','')}: {k.get('icerik','')}"
                        store.add_text(text, metadata={"kaynak": "knowledge", "tur": k.get("tur","genel"), "subdomain": subdomain})
                    logger.info(f"  {subdomain}: {len(knowledge)} bilgi girisi indekslendi")
                except Exception as e:
                    logger.warning(f"  {subdomain} knowledge indeksleme hatası: {e}")

            logger.info(f"  ✓ {subdomain}: Toplam {len(store.documents)} vektör")

        logger.info("Tüm tenant verileri indekslendi!")
    except ImportError as e:
        logger.warning(f"vector_store import hatası: {e}")
    except Exception as e:
        logger.error(f"Tenant indeksleme hatası: {e}")

def test_model():
    logger.info(f"'{OLLAMA_MODEL}' modeli test ediliyor...")
    try:
        import requests
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": "Türk Borçlar Kanunu'na göre kira sözleşmesi nedir?",
                "stream": False,
                "options": {"temperature": 0.2, "num_predict": 200}
            },
            timeout=30
        )
        if r.status_code == 200:
            response = r.json().get("response", "")
            logger.info(f"Test yanıtı: {response[:200]}...")
            return True
    except Exception as e:
        logger.error(f"Test başarısız: {e}")
    return False

if __name__ == "__main__":
    logger.info("=== ALTU AI Model Kurulum ve Veri İndeksleme ===")

    models = check_ollama()

    if OLLAMA_MODEL not in models:
        logger.info(f"'{OLLAMA_MODEL}' bulunamadı, kuruluyor...")
        if "llama3.1:8b" not in models:
            pull_base_model()
        create_model()
    else:
        logger.info(f"'{OLLAMA_MODEL}' zaten mevcut.")

    test_model()
    index_all_datasets()
    index_tenant_data()

    logger.info("=== Kurulum tamamlandı ===")
    logger.info(f"Ollama: http://localhost:11434")
    logger.info(f"Model: {OLLAMA_MODEL}")
    logger.info(f"Sunucu: http://localhost:3001")
