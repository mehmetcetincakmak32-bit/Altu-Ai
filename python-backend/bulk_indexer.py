"""
ALTU AI — Toplu Vektor Indeksleme
yargitay.json, danistay.json, mevzuat.json dosyalarini vector store'a indeksler.
Streaming JSON okuma ile 3.2 GB dosyalari bellek tasirmadan isler.
"""

import json
import os
import sys
import logging
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("bulk-indexer")

sys.path.insert(0, str(Path(__file__).parent))
from vector_store import get_vector_store

DATA_DIR = Path(__file__).parent.parent / "data" / "scraper"


def item_to_text(item: dict) -> str:
    pieces = []
    if item.get("mahkeme"):
        pieces.append("Mahkeme: " + item["mahkeme"])
    if item.get("esas"):
        pieces.append("Esas: " + item["esas"])
    if item.get("karar"):
        pieces.append("Karar: " + item["karar"])
    if item.get("tarih"):
        pieces.append("Tarih: " + item["tarih"])
    if item.get("konu"):
        pieces.append("Konu: " + item["konu"])
    if item.get("ozet"):
        pieces.append("Ozet: " + item["ozet"])
    if item.get("kategori"):
        pieces.append("Kategori: " + item["kategori"])
    return " | ".join(pieces)


def index_streaming_batch(kaynak_adi: str, filepath: Path, limit: int = None, batch_size: int = 2000):
    """Index a JSON array file using ijson streaming with batch writes."""
    if not filepath.exists():
        logger.warning("File not found: %s" % filepath)
        return 0

    import ijson

    size_mb = filepath.stat().st_size / (1024 * 1024)
    logger.info("Indexing %s (%.1f MB, limit=%s, batch=%d)..." % (kaynak_adi, size_mb, limit or "none", batch_size))

    store = get_vector_store(subdomain=None)
    count = 0
    skipped = 0
    start = time.time()
    batch = []

    with open(filepath, "rb") as f:
        for item in ijson.items(f, "item"):
            text = item_to_text(item)
            if not text.strip():
                skipped += 1
                continue

            metadata = {
                "kaynak": kaynak_adi,
                "kaynak_tipi": item.get("kaynak_tipi", "scraper"),
                "mahkeme": item.get("mahkeme", ""),
                "esas": item.get("esas", ""),
                "karar": item.get("karar", ""),
                "tarih": item.get("tarih", ""),
                "konu": item.get("konu", ""),
                "kategori": item.get("kategori", ""),
            }

            batch.append({"text": text, "metadata": metadata, "chunk": False})
            count += 1

            if len(batch) >= batch_size:
                added = store.add_texts_batch(batch)
                batch = []
                elapsed = time.time() - start
                rate = count / elapsed if elapsed > 0 else 0
                logger.info("  %s: %d indexed (%.0f items/s, %d skipped, %d added)" % (kaynak_adi, count, rate, skipped, added))

            if limit and count >= limit:
                break

    if batch:
        store.add_texts_batch(batch)

    elapsed = time.time() - start
    logger.info("DONE %s: %d indexed, %d skipped in %.1fs" % (kaynak_adi, count, skipped, elapsed))
    return count


def index_mevzuat_batch(filepath: Path, limit: int = None, batch_size: int = 2000):
    """Mevzuat (808MB) fits in memory, indexed in batches."""
    if not filepath.exists():
        logger.warning("File not found: %s" % filepath)
        return 0

    size_mb = filepath.stat().st_size / (1024 * 1024)
    logger.info("Indexing mevzuat (%.1f MB, batch=%d)..." % (size_mb, batch_size))

    store = get_vector_store(subdomain=None)
    count = 0

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    start = time.time()
    total = len(data)
    batch = []

    for item in data:
        text = item_to_text(item)
        if not text.strip():
            continue

        metadata = {
            "kaynak": "mevzuat",
            "kaynak_tipi": item.get("kaynak_tipi", "scraper"),
            "mahkeme": item.get("mahkeme", ""),
            "esas": item.get("esas", ""),
            "karar": item.get("karar", ""),
            "tarih": item.get("tarih", ""),
            "konu": item.get("konu", ""),
            "kategori": item.get("kategori", ""),
        }

        batch.append({"text": text, "metadata": metadata, "chunk": False})
        count += 1

        if len(batch) >= batch_size:
            store.add_texts_batch(batch)
            batch = []
            elapsed = time.time() - start
            rate = count / elapsed if elapsed > 0 else 0
            logger.info("  mevzuat: %d/%d indexed (%.0f items/s)" % (count, total, rate))

        if limit and count >= limit:
            break

    if batch:
        store.add_texts_batch(batch)

    elapsed = time.time() - start
    logger.info("DONE mevzuat: %d indexed in %.1fs" % (count, elapsed))
    return count


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Toplu vektor indeksleme")
    parser.add_argument("--kaynak", choices=["yargitay", "danistay", "mevzuat", "all"], default="all")
    parser.add_argument("--limit", type=int, default=None, help="Max items to index per file")
    args = parser.parse_args()

    targets = ["yargitay", "danistay", "mevzuat"] if args.kaynak == "all" else [args.kaynak]

    for kaynak in targets:
        logger.info("")
        logger.info("=" * 60)
        logger.info("BASLATILIYOR: %s" % kaynak)
        logger.info("=" * 60)

        if kaynak == "mevzuat":
            count = index_mevzuat_batch(DATA_DIR / "mevzuat.json", args.limit)
        elif kaynak == "yargitay":
            count = index_streaming_batch("yargitay", DATA_DIR / "yargitay.json", args.limit)
        elif kaynak == "danistay":
            count = index_streaming_batch("danistay", DATA_DIR / "danistay.json", args.limit)

        logger.info("%s: %d entry eklendi" % (kaynak, count))

    logger.info("")
    logger.info("=" * 60)
    logger.info("INDEKSLEME TAMAMLANDI")
    logger.info("=" * 60)
