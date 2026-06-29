import logging
import json
import time
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

PROJECT_DIR = Path(__file__).parent.parent
TENANTS_DIR = PROJECT_DIR / "storage" / "data" / "tenants"
DATA_DIR = Path(__file__).parent / "data"


def index_tenant_vectors(subdomain: str):
    """Index a single tenant's data into their vector store."""
    try:
        from vector_store import get_vector_store

        tenant_path = TENANTS_DIR / subdomain
        if not tenant_path.exists():
            return 0

        store = get_vector_store(subdomain)

        count = 0
        davas_file = tenant_path / "davas.json"
        if davas_file.exists():
            try:
                davas = json.loads(davas_file.read_text(encoding="utf-8")).get("davas", [])
                for d in davas:
                    text = f"Dava: {d.get('ad','')} | Dosya No: {d.get('dosyaNo','')} | Konu: {d.get('konu','')} | Mahkeme: {d.get('mahkeme','')} | Durum: {d.get('durum','')} | Aciklama: {d.get('aciklama','')}"
                    store.add_text(text, metadata={"kaynak": "dava", "tur": "dava", "subdomain": subdomain})
                    count += 1
            except Exception as e:
                logger.warning(f"  {subdomain} dava indexing error: {e}")

        musteri_file = tenant_path / "musteriler.json"
        if musteri_file.exists():
            try:
                musteris = json.loads(musteri_file.read_text(encoding="utf-8")).get("musteriler", [])
                for m in musteris:
                    text = f"Muvekkil: {m.get('ad','')} {m.get('soyad','')} | TC: {m.get('tcKimlik','')} | Tel: {m.get('telefon','')}"
                    store.add_text(text, metadata={"kaynak": "musteri", "tur": "musteri", "subdomain": subdomain})
                    count += 1
            except Exception as e:
                logger.warning(f"  {subdomain} musteri indexing error: {e}")

        knowledge_file = tenant_path / "ai_knowledge.json"
        if knowledge_file.exists():
            try:
                knowledge = json.loads(knowledge_file.read_text(encoding="utf-8")).get("knowledge", [])
                for k in knowledge:
                    text = f"{k.get('baslik','')}: {k.get('icerik','')}"
                    store.add_text(text, metadata={"kaynak": "knowledge", "tur": k.get("tur", "genel"), "subdomain": subdomain})
                    count += 1
            except Exception as e:
                logger.warning(f"  {subdomain} knowledge indexing error: {e}")

        return count
    except Exception as e:
        logger.error(f"Tenant index error for {subdomain}: {e}")
        return 0


def index_all_tenants():
    """Index all tenants' data into their vector stores."""
    if not TENANTS_DIR.exists():
        logger.info("No tenants directory found.")
        return

    total = 0
    for tenant in TENANTS_DIR.iterdir():
        if not tenant.is_dir():
            continue
        subdomain = tenant.name
        count = index_tenant_vectors(subdomain)
        total += count
        if count > 0:
            logger.info(f"  {subdomain}: {count} entries indexed")

    logger.info(f"All tenants indexed: {total} total entries")


def index_global_datasets():
    """Index global legal datasets."""
    try:
        from vector_store import get_vector_store
        from dataset import dataset

        store = get_vector_store(subdomain=None)
        store.clear()

        total = 0
        for attr, rows in dataset.hf_datasets.items():
            for row in rows:
                text = json.dumps(row, ensure_ascii=False)
                store.add_text(text, metadata={"kaynak": attr, "tur": "hukuk_dataset"}, chunk=True)
                total += 1
            logger.info(f"  {attr}: {len(rows)} entries indexed")

        logger.info(f"Global store: {total} total entries")
        return total
    except Exception as e:
        logger.error(f"Global index error: {e}")
        return 0


def start_vector_indexer_loop(interval_minutes: int = 60):
    """Start a background thread that periodically re-indexes tenant data."""
    def loop():
        logger.info("[Vector Indexer] Thread started.")
        time.sleep(60)
        while True:
            try:
                logger.info("[Vector Indexer] Re-indexing all tenants...")
                index_all_tenants()
                logger.info("[Vector Indexer] Re-indexing complete.")
            except Exception as e:
                logger.error(f"[Vector Indexer] Error: {e}")
            time.sleep(interval_minutes * 60)

    thread = threading.Thread(target=loop, daemon=True)
    thread.start()
    logger.info(f"[Vector Indexer] Thread initialized ({interval_minutes} min interval).")