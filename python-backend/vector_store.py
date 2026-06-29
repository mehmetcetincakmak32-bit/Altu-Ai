import os
import json
import logging
import math
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Ensure base directories exist
DATA_DIR = Path(os.getenv("DATA_DIR", str(Path(__file__).parent / "data")))
PROJECT_DIR = Path(__file__).parent.parent
TENANTS_DIR = PROJECT_DIR / "storage" / "data" / "tenants"

def get_hash_embedding(text: str, dimensions: int = 384) -> List[float]:
    """Deterministic pseudo-embedding based on character n-grams and hashing.
    No external API needed — works fully offline."""
    embedding = [0.0] * dimensions
    for i in range(len(text) - 2):
        trigram = text[i:i+3]
        h = int(hashlib.md5(trigram.encode('utf-8')).hexdigest(), 16)
        index = h % dimensions
        weight = 1.0 / (1.0 + (h % 5))
        embedding[index] += weight
    
    norm = math.sqrt(sum(x * x for x in embedding))
    if norm > 0:
        embedding = [x / norm for x in embedding]
    return embedding

def get_embedding(text: str, model: str = "") -> List[float]:
    """Returns hash-based embedding (no Ollama, no external API needed)."""
    if not text.strip():
        return [0.0] * 384
    return get_hash_embedding(text)

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculates cosine similarity between two unit vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)

def chunk_text(text: str, chunk_size: int = 400, chunk_overlap: int = 80) -> List[str]:
    """Helper to split text into overlapping chunks of words."""
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    for i in range(0, len(words), chunk_size - chunk_overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


class SimpleVectorStore:
    """Lightweight pure-python Vector Store that saves to a JSON file."""
    def __init__(self, storage_path: Path):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.documents: List[Dict[str, Any]] = []
        self._text_set: set = set()
        self.load()

    def load(self):
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    self.documents = json.load(f)
                self._text_set = {d.get("text", "") for d in self.documents}
                logger.info(f"Loaded {len(self.documents)} vectors from {self.storage_path.name}")
            except Exception as e:
                logger.error(f"Error loading vector store {self.storage_path}: {e}")
                self.documents = []
                self._text_set = set()
        else:
            self.documents = []
            self._text_set = set()

    def save(self):
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving vector store {self.storage_path}: {e}")

    def add_text(self, text: str, metadata: Dict[str, Any], model: str = "", chunk: bool = True):
        """Chunks, vectorizes, and adds a text block to the store."""
        if not text.strip():
            return
        
        texts_to_add = chunk_text(text) if chunk else [text]
        for t in texts_to_add:
            if t in self._text_set:
                continue
            
            embedding = get_embedding(t, model)
            self.documents.append({
                "text": t,
                "metadata": metadata,
                "embedding": embedding
            })
            self._text_set.add(t)
        self.save()

    def add_texts_batch(self, items: List[Dict[str, Any]], model: str = ""):
        """Add multiple texts at once and save once. Each item: {text, metadata, chunk?}"""
        added = 0
        for item in items:
            text = item.get("text", "")
            metadata = item.get("metadata", {})
            chunk = item.get("chunk", True)
            if not text.strip():
                continue
            texts_to_add = chunk_text(text) if chunk else [text]
            for t in texts_to_add:
                if t in self._text_set:
                    continue
                embedding = get_embedding(t, model)
                self.documents.append({
                    "text": t,
                    "metadata": metadata,
                    "embedding": embedding
                })
                self._text_set.add(t)
                added += 1
        if added > 0:
            self.save()
            logger.debug(f"batch added {added} entries, total={len(self.documents)}")
        return added

    def search(self, query: str, limit: int = 5, min_score: float = 0.1, model: str = "") -> List[Dict[str, Any]]:
        """Queries the vector store and returns matching documents sorted by similarity."""
        query_vector = get_embedding(query, model)
        results = []
        for doc in self.documents:
            score = cosine_similarity(query_vector, doc["embedding"])
            if score >= min_score:
                results.append({
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "score": score
                })
        
        # Sort by similarity score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    def clear(self):
        self.documents = []
        self._text_set = set()
        self.save()


# Cache instances to avoid reading file on every request
_stores_cache: Dict[str, SimpleVectorStore] = {}

def get_vector_store(subdomain: Optional[str] = None) -> SimpleVectorStore:
    """Returns the vector store for either global law data or a specific tenant."""
    if subdomain and subdomain != "www":
        key = f"tenant_{subdomain}"
        if key not in _stores_cache:
            # Tenant store is inside the storage/data/tenants directory
            tenant_path = TENANTS_DIR / subdomain / "vector_store.json"
            _stores_cache[key] = SimpleVectorStore(tenant_path)
        return _stores_cache[key]
    else:
        key = "global"
        if key not in _stores_cache:
            # Global store is inside the python-backend/data directory
            global_path = DATA_DIR / "vector_store" / "global.json"
            _stores_cache[key] = SimpleVectorStore(global_path)
        return _stores_cache[key]
