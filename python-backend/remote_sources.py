import logging
import json
import os
import requests
import time
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BEDESTEN_API = "https://bedesten.adalet.gov.tr/api"
MEVZUAT_API = "https://mevzuat.gov.tr/api"
TIMEOUT = 5

DATA_DIR = Path(os.getenv("DATA_DIR", str(Path(__file__).parent / "data")))

# Export MCP_SERVERS to avoid ImportErrors in main.py
MCP_SERVERS = {
    "yargi": {"name": "Yargıtay/Danıştay/AYM", "github": "saidsurucu/yargi-mcp"},
    "mevzuat": {"name": "Mevzuat Bilgi Sistemi", "github": "saidsurucu/mevzuat-mcp"},
    "ictihat": {"name": "UYAP İçtihat", "github": "aydincan/turk-hukuku-ictihat-mcp"},
    "kanunlar": {"name": "Kanunlar Veritabanı", "github": "Ansvar-Systems/turkish-law-mcp"},
    "acik_mevzuat": {"name": "Açık Mevzuat", "github": "onurcan-b/acik-mevzuat"},
    "danistay": {"name": "Danıştay Karar Arama (Özel)", "github": "altu-ai/danistay-mcp"},
    "yargitay": {"name": "Yargıtay Karar Arama (Özel)", "github": "altu-ai/yargitay-mcp"},
    "mevzuat_local": {"name": "Mevzuat Bilgi Sistemi (Özel)", "github": "altu-ai/mevzuat-mcp"},
    "resmigazete_local": {"name": "Resmi Gazete (Özel)", "github": "altu-ai/resmigazete-mcp"},
    "aym_local": {"name": "AYM Kararları (Özel)", "github": "altu-ai/aym-mcp"},
}

LOCAL_MCP_ENDPOINTS = {
    "danistay": "http://localhost:8025/sse",
    "yargitay": "http://localhost:8026/sse",
    "mevzuat": "http://localhost:8027/sse",
    "resmigazete": "http://localhost:8028/sse",
    "aym": "http://localhost:8029/sse",
}

def classify_text(text: str) -> str:
    text_lower = text.lower()
    if any(w in text_lower for w in ["kıdem", "ihbar", "işçi", "işveren", "mesai", "ücret alacağı", "iş sözleşmesi", "iş kanunu", "işk"]):
        return "is"
    if any(w in text_lower for w in ["boşanma", "velayet", "zina", "nafaka", "evlilik", "ortak velayet", "aile konutu"]):
        return "bosanma"
    if any(w in text_lower for w in ["aile", "soybağı", "evlat edinme", "nişan", "vesayet", "kayyım"]):
        return "aile"
    if any(w in text_lower for w in ["miras", "vasiyet", "muris", "tenkis", "veraset", "mirasçı"]):
        return "miras"
    if any(w in text_lower for w in ["kira", "tahliye", "kiracı", "kiralayan", "kira artış", "kira bedeli", "kontrat"]):
        return "kira"
    if any(w in text_lower for w in ["tazminat", "maddi tazminat", "manevi tazminat", "haksız fiil", "zarar"]):
        return "tazminat"
    if any(w in text_lower for w in ["ceza", "tck", "sanık", "suç", "mahkumiyet", "savcı", "tutuklama", "hırsızlık", "dolandırıcılık"]):
        return "ceza"
    if any(w in text_lower for w in ["ticaret", "şirket", "ttk", "limited", "anonim", "hisse", "çek", "senet", "fatura"]):
        return "ticaret"
    if any(w in text_lower for w in ["icra", "haciz", "iik", "ödeme emri", "takip", "borçlu", "alacaklı"]):
        return "icra"
    return "diger"

def index_decision_to_vector_store(item: dict, mahkeme: str):
    try:
        from vector_store import get_vector_store
        
        esas = item.get("esas", item.get("basvuruNo", ""))
        karar = item.get("karar", "")
        konu = item.get("konu", "")
        ozet = item.get("ozet", item.get("sonuc", ""))
        tarih = item.get("tarih", "")
        kaynak = item.get("kaynak", "")
        
        text = f"Kaynak: {mahkeme}\nEsas/Başvuru No: {esas}\nKarar No: {karar}\nKarar Tarihi: {tarih}\nKonu: {konu}\nKarar İçeriği/Özeti: {ozet}"
        kategori = classify_text(konu + " " + ozet)
        
        metadata = {
            "kaynak": kaynak,
            "mahkeme": mahkeme,
            "esas": esas,
            "karar": karar,
            "tarih": tarih,
            "konu": konu,
            "kategori": kategori
        }
        
        store = get_vector_store(subdomain=None)  # Global store
        store.add_text(text, metadata, chunk=True)
        logger.info(f"✓ Karar vektör veritabanına eklendi: {mahkeme} Esas/Başvuru {esas}")
    except Exception as e:
        logger.warning(f"Vektör veritabanına ekleme başarısız: {e}")

def call_yargi_mcp_tool(tool_name: str, arguments: dict) -> dict:
    url = "https://yargimcp.surucu.dev/mcp"
    headers = {
        "Accept": "text/event-stream",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    r_sse = None
    try:
        # Step 1: Getting session ID (this returns 400 with session ID header)
        r1 = requests.get(url, headers=headers, verify=False, timeout=10)
        session_id = r1.headers.get("Mcp-Session-Id")
        if not session_id:
            logger.error("Failed to retrieve Mcp-Session-Id from yargi-mcp")
            return None
            
        # Step 2: Establish the EventStream stream in a background GET call to keep session alive
        import threading
        headers["Mcp-Session-Id"] = session_id
        
        # We read the stream or close it after making calls. For simplicity, since the POST
        # will succeed if the session is alive, let's keep the stream open in a daemon thread.
        # This keeps the connection alive for subsequent POST requests.
        def _sse_keep_alive():
            try:
                with requests.get(url, headers=headers, stream=True, verify=False, timeout=30) as stream_res:
                    for _ in stream_res.iter_lines():
                        pass
            except:
                pass
                
        t = threading.Thread(target=_sse_keep_alive, daemon=True)
        t.start()
        time.sleep(0.5) # Wait for stream connection
        
        post_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "Mcp-Session-Id": session_id,
            "User-Agent": "Mozilla/5.0"
        }
        
        # Step 3: Initialize handshake
        init_payload = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "altu-client", "version": "1.0.0"}
            },
            "id": 1
        }
        r_init = requests.post(url, json=init_payload, headers=post_headers, verify=False, timeout=15)
        if r_init.status_code != 200:
            return None
            
        # Step 4: Send initialized notification
        requests.post(url, json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=post_headers, verify=False, timeout=10)
        
        # Step 5: Execute Tool Call
        call_payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            },
            "id": 2
        }
        r_call = requests.post(url, json=call_payload, headers=post_headers, verify=False, timeout=30)
        if r_call.status_code == 200:
            lines = r_call.text.split('\n')
            for line in lines:
                if line.startswith("data:"):
                    data_json = json.loads(line[5:].strip())
                    if "error" in data_json:
                        logger.error(f"yargi-mcp tool call returned error: {data_json['error']}")
                        return None
                    return data_json.get("result", {})
        return None
    except Exception as e:
        logger.error(f"Error calling yargi-mcp: {e}")
        return None

class RemoteLegalSources:
    def __init__(self):
        self.cache: Dict[str, tuple] = {}
        self.cache_suresi = 3600

    def _cache_get(self, key: str) -> Optional[list]:
        if key in self.cache:
            data, expiry = self.cache[key]
            if datetime.now() < expiry:
                return data
            del self.cache[key]
        return None

    def _cache_set(self, key: str, data: list):
        self.cache[key] = (data, datetime.now() + timedelta(seconds=self.cache_suresi))

    def hazirla(self):
        logger.info("Yerel Veritabanı Arama Katmanı Hazır.")

    def yargitay_ara(self, sorgu: str, limit: int = 5) -> List[Dict]:
        key = f"yargitay:{sorgu}:{limit}"
        cached = self._cache_get(key)
        if cached:
            return cached

        results = []
        sorgu_lower = sorgu.lower()
        
        # 1. Live search via yargi-mcp Remote Server
        try:
            mcp_res = call_yargi_mcp_tool("search_bedesten_unified", {
                "phrase": sorgu,
                "court_types": ["YARGITAYKARARI"],
                "pageNumber": 1
            })
            if mcp_res:
                decide_data = []
                # Parse decisions list
                if mcp_res.get("structuredContent") and isinstance(mcp_res["structuredContent"], dict):
                    decide_data = mcp_res["structuredContent"].get("decisions", [])
                elif mcp_res.get("content"):
                    try:
                        content_text = mcp_res["content"][0].get("text", "")
                        decide_data = json.loads(content_text).get("decisions", [])
                    except:
                        pass
                        
                for item in decide_data[:limit]:
                    esas = item.get("esasNo", "")
                    doc_id = item.get("documentId", "")
                    
                    if any(r.get("esas") == esas for r in results):
                        continue
                        
                    # Fetch full markdown decision text
                    doc_text = ""
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
                    except Exception as doc_err:
                        logger.warning(f"Failed to fetch Yargıtay document: {doc_err}")
                        
                    new_item = {
                        "kaynak": "yargitay",
                        "esas": esas,
                        "karar": item.get("kararNo", ""),
                        "tarih": item.get("kararTarihi", ""),
                        "konu": item.get("davaTuru", "Yargıtay Kararı"),
                        "ozet": doc_text or item.get("metinOzeti", "Yargıtay emsal kararı."),
                        "mahkeme": item.get("kurum", "Yargıtay"),
                        "documentId": doc_id
                    }
                    results.append(new_item)
                    index_decision_to_vector_store(new_item, "Yargıtay")
        except Exception as e:
            logger.warning(f"yargi-mcp live Yargıtay search failed: {e}")

        # 2. Fallback to local yargitay.json
        if len(results) < limit:
            y_path = DATA_DIR / "scraper" / "yargitay.json"
            if y_path.exists():
                try:
                    with open(y_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    for item in data:
                        if (sorgu_lower in (item.get("konu", "") or "").lower() or 
                            sorgu_lower in (item.get("ozet", "") or "").lower() or 
                            sorgu_lower in (item.get("esas", "") or "").lower()):
                            if not any(r.get("esas") == item.get("esas") for r in results):
                                results.append(item)
                            if len(results) >= limit:
                                break
                except Exception as e:
                    logger.error(f"Local Yargıtay read error: {e}")

        # 3. Fallback to in-memory datasets if still no results found
        if not results:
            try:
                from dataset import dataset
                local_kararlar = dataset.karar_ara(sorgu)
                for k in local_kararlar:
                    if "yarg" in k.get("mahkeme", "").lower() or "hukuk" in k.get("mahkeme", "").lower():
                        results.append({
                            "kaynak": "yargitay",
                            "esas": k.get("esasNo", ""),
                            "karar": k.get("kararNo", ""),
                            "tarih": k.get("tarih", ""),
                            "konu": k.get("konu", ""),
                            "ozet": k.get("ozet", ""),
                            "mahkeme": k.get("mahkeme", "Yargıtay")
                        })
                        if len(results) >= limit:
                            break
            except Exception as e:
                logger.error(f"Dataset Yargıtay fallback error: {e}")
                
        self._cache_set(key, results)
        return results

    def danistay_ara(self, sorgu: str, limit: int = 5) -> List[Dict]:
        key = f"danistay:{sorgu}:{limit}"
        cached = self._cache_get(key)
        if cached:
            return cached

        results = []
        sorgu_lower = sorgu.lower()
        
        # 1. Live search via yargi-mcp Remote Server
        try:
            mcp_res = call_yargi_mcp_tool("search_bedesten_unified", {
                "phrase": sorgu,
                "court_types": ["DANISTAYKARAR"],
                "pageNumber": 1
            })
            if mcp_res:
                decide_data = []
                if mcp_res.get("structuredContent") and isinstance(mcp_res["structuredContent"], dict):
                    decide_data = mcp_res["structuredContent"].get("decisions", [])
                elif mcp_res.get("content"):
                    try:
                        content_text = mcp_res["content"][0].get("text", "")
                        decide_data = json.loads(content_text).get("decisions", [])
                    except:
                        pass
                        
                for item in decide_data[:limit]:
                    esas = item.get("esasNo", "")
                    doc_id = item.get("documentId", "")
                    
                    if any(r.get("esas") == esas for r in results):
                        continue
                        
                    # Fetch full markdown decision text
                    doc_text = ""
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
                    except Exception as doc_err:
                        logger.warning(f"Failed to fetch document markdown: {doc_err}")
                            
                    new_item = {
                        "kaynak": "danistay",
                        "esas": esas,
                        "karar": item.get("kararNo", ""),
                        "tarih": item.get("kararTarihi", ""),
                        "konu": item.get("davaTuru", "Danıştay Kararı"),
                        "ozet": doc_text or item.get("metinOzeti", "Danıştay emsal kararı."),
                        "mahkeme": item.get("kurum", "Danıştay"),
                        "documentId": doc_id
                    }
                    results.append(new_item)
                    # Index to vector store
                    index_decision_to_vector_store(new_item, "Danıştay")
        except Exception as e:
            logger.warning(f"yargi-mcp live Danıştay search failed: {e}")

        # 2. Search in local danistay.json (where sources are labeled danistay)
        if len(results) < limit:
            d_path = DATA_DIR / "scraper" / "danistay.json"
            if d_path.exists():
                try:
                    with open(d_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    for item in data:
                        if item.get("kaynak") == "danistay":
                            if (sorgu_lower in (item.get("konu", "") or "").lower() or 
                                sorgu_lower in (item.get("ozet", "") or "").lower() or 
                                sorgu_lower in (item.get("esas", "") or "").lower()):
                                if not any(r.get("esas") == item.get("esas") for r in results):
                                    results.append(item)
                                if len(results) >= limit:
                                    break
                except Exception as e:
                    logger.error(f"Local Danıştay read error: {e}")

        # 3. Fallback to in-memory datasets if no results found
        if not results:
            try:
                from dataset import dataset
                local_kararlar = dataset.karar_ara(sorgu)
                for k in local_kararlar:
                    if "dan" in k.get("mahkeme", "").lower() or "idari" in k.get("mahkeme", "").lower():
                        results.append({
                            "kaynak": "danistay",
                            "esas": k.get("esasNo", ""),
                            "karar": k.get("kararNo", ""),
                            "tarih": k.get("tarih", ""),
                            "konu": k.get("konu", ""),
                            "ozet": k.get("ozet", ""),
                            "mahkeme": k.get("mahkeme", "Danıştay")
                        })
                        if len(results) >= limit:
                            break
            except Exception as e:
                logger.error(f"Dataset Danıştay fallback error: {e}")
                
        self._cache_set(key, results)
        return results

    def aym_ara(self, sorgu: str, limit: int = 5) -> List[Dict]:
        key = f"aym:{sorgu}:{limit}"
        cached = self._cache_get(key)
        if cached:
            return cached

        results = []
        sorgu_lower = sorgu.lower()
        
        # 1. Live search via yargi-mcp Remote Server using search_anayasa_unified
        try:
            mcp_res = call_yargi_mcp_tool("search_anayasa_unified", {
                "decision_type": "bireysel_basvuru",
                "keywords": [sorgu],
                "page_to_fetch": 1
            })
            if mcp_res:
                content_str = ""
                if mcp_res.get("result"):
                    content_str = mcp_res["result"]
                elif mcp_res.get("content"):
                    content_str = mcp_res["content"][0].get("text", "")
                    
                import re
                links = re.findall(r'\[([^\]]+)\]\((https?://[^\)]+)\)', content_str)
                
                count = 0
                for label, url in links:
                    basvuru = label
                    if "başvuru" in label.lower():
                        m = re.search(r'\b20\d{2}/\d+\b', label)
                        if m:
                            basvuru = m.group(0)
                            
                    if any(r.get("basvuruNo") == basvuru or r.get("esas") == basvuru for r in results):
                        continue
                        
                    doc_text = ""
                    try:
                        doc_res = call_yargi_mcp_tool("get_anayasa_document_unified", {"document_url": url})
                        if doc_res:
                            doc_text = doc_res.get("result", "")
                            if not doc_text and doc_res.get("content"):
                                doc_text = doc_res["content"][0].get("text", "")
                    except Exception as doc_err:
                        logger.warning(f"Failed to fetch AYM document: {doc_err}")
                        
                    new_item = {
                        "kaynak": "aym",
                        "basvuruNo": basvuru,
                        "esas": basvuru,
                        "karar": "",
                        "tarih": "",
                        "konu": label,
                        "sonuc": doc_text or f"Anayasa Mahkemesi Bireysel Başvuru Kararı.",
                        "mahkeme": "Anayasa Mahkemesi",
                        "url": url
                    }
                    results.append(new_item)
                    index_decision_to_vector_store(new_item, "AYM")
                    count += 1
                    if count >= limit:
                        break
        except Exception as e:
            logger.warning(f"yargi-mcp live AYM search failed: {e}")

        # 2. Search in local danistay.json (where sources are labeled aym)
        if len(results) < limit:
            d_path = DATA_DIR / "scraper" / "danistay.json"
            if d_path.exists():
                try:
                    with open(d_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    for item in data:
                        if item.get("kaynak") == "aym":
                            if (sorgu_lower in (item.get("konu", "") or "").lower() or 
                                sorgu_lower in (item.get("sonuc", "") or "").lower() or 
                                sorgu_lower in (item.get("esas", "") or "").lower() or
                                sorgu_lower in (item.get("basvuruNo", "") or "").lower()):
                                if not any(r.get("esas") == item.get("esas") or r.get("basvuruNo") == item.get("basvuruNo") for r in results):
                                    results.append(item)
                                if len(results) >= limit:
                                    break
                except Exception as e:
                    logger.error(f"Local AYM read error: {e}")
                
        # 3. Fallback to in-memory datasets if no results found
        if not results:
            try:
                from dataset import dataset
                local_kararlar = dataset.karar_ara(sorgu)
                for k in local_kararlar:
                    if "aym" in k.get("mahkeme", "").lower() or "anayasa" in k.get("mahkeme", "").lower():
                        results.append({
                            "kaynak": "aym",
                            "basvuruNo": k.get("esasNo", ""),
                            "karar": k.get("kararNo", ""),
                            "tarih": k.get("tarih", ""),
                            "konu": k.get("konu", ""),
                            "sonuc": k.get("ozet", ""),
                            "mahkeme": "Anayasa Mahkemesi"
                        })
                        if len(results) >= limit:
                            break
            except Exception as e:
                logger.error(f"Dataset AYM fallback error: {e}")
                
        self._cache_set(key, results)
        return results

    def mevzuat_ara(self, sorgu: str, limit: int = 5) -> List[Dict]:
        key = f"mevzuat:{sorgu}:{limit}"
        cached = self._cache_get(key)
        if cached:
            return cached

        results = []
        sorgu_lower = sorgu.lower()
        
        # 1. Search in local mevzuat.json
        m_path = DATA_DIR / "scraper" / "mevzuat.json"
        if m_path.exists():
            try:
                with open(m_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data:
                    if (sorgu_lower in (item.get("baslik", "") or "").lower() or 
                        sorgu_lower in (item.get("madde", "") or "").lower()):
                        results.append(item)
                        if len(results) >= limit:
                            break
            except Exception as e:
                logger.error(f"Local Mevzuat read error: {e}")
                
        # 2. Fallback to in-memory datasets if no results found
        if not results:
            try:
                from dataset import dataset
                local_kanunlar = dataset.kanun_ara(sorgu)
                for k in local_kanunlar:
                    results.append({
                        "kaynak": "mevzuat",
                        "baslik": k.get("kanun_adi", ""),
                        "tur": "Kanun",
                        "sayi": k.get("numara", ""),
                        "tarih": "",
                        "madde": k.get("madde", "")
                    })
                    if len(results) >= limit:
                        break
            except Exception as e:
                logger.error(f"Dataset Mevzuat fallback error: {e}")
                
        self._cache_set(key, results)
        return results

    def kanun_getir(self, kanun_no: str) -> Optional[Dict]:
        sorgu = kanun_no
        sorgu_lower = sorgu.lower()
        
        # 1. Search in local mevzuat.json
        m_path = DATA_DIR / "scraper" / "mevzuat.json"
        if m_path.exists():
            try:
                with open(m_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data:
                    if (sorgu_lower in (item.get("sayi", "") or "").lower() or 
                        sorgu_lower in (item.get("baslik", "") or "").lower()):
                        return {
                            "kanun_adi": item.get("baslik", ""),
                            "no": item.get("sayi", ""),
                            "tarih": item.get("tarih", ""),
                            "madde_sayisi": 1,
                            "maddeler": [item.get("madde", "")]
                        }
            except Exception as e:
                logger.error(f"Local Kanun read error: {e}")
                
        # 2. Fallback to in-memory datasets
        try:
            from dataset import dataset
            local_kanunlar = dataset.kanun_ara(sorgu)
            if local_kanunlar:
                k = local_kanunlar[0]
                return {
                    "kanun_adi": k.get("kanun_adi", ""),
                    "no": k.get("numara", ""),
                    "tarih": "",
                    "madde_sayisi": len(local_kanunlar),
                    "maddeler": [item.get("madde", "") for item in local_kanunlar[:5]]
                }
        except Exception as e:
            logger.error(f"Dataset Kanun fallback error: {e}")
            
        return None

    def kvkk_ara(self, sorgu: str, limit: int = 5) -> List[Dict]:
        key = f"kvkk:{sorgu}:{limit}"
        cached = self._cache_get(key)
        if cached:
            return cached

        results = []
        try:
            mcp_res = call_yargi_mcp_tool("search_kvkk_decisions", {"keywords": sorgu, "page": 1})
            if mcp_res:
                decisions = mcp_res.get("decisions", [])
                if not decisions and mcp_res.get("content"):
                    try:
                        c_text = mcp_res["content"][0].get("text", "")
                        decisions = json.loads(c_text).get("decisions", [])
                    except:
                        pass
                
                for item in decisions[:limit]:
                    url = item.get("decision_url", item.get("url", ""))
                    if not url:
                        continue
                    
                    doc_text = ""
                    try:
                        doc_res = call_yargi_mcp_tool("get_kvkk_document_markdown", {"decision_url": url})
                        if doc_res:
                            if doc_res.get("markdown_content"):
                                doc_text = doc_res["markdown_content"]
                            elif doc_res.get("content"):
                                try:
                                    c_text = doc_res["content"][0].get("text", "")
                                    doc_text = json.loads(c_text).get("markdown_content", "") or c_text
                                except:
                                    doc_text = doc_res["content"][0].get("text", "")
                    except Exception as doc_err:
                        logger.warning(f"Failed to fetch KVKK document: {doc_err}")
                        
                    new_item = {
                        "kaynak": "kvkk",
                        "esas": item.get("decision_no", item.get("karar_no", "")),
                        "karar": item.get("decision_no", item.get("karar_no", "")),
                        "tarih": item.get("decision_date", item.get("tarih", "")),
                        "konu": item.get("title", "KVKK Kararı"),
                        "ozet": doc_text or item.get("summary", "Kişisel Verileri Koruma Kurulu Kararı."),
                        "mahkeme": "KVKK",
                        "url": url
                    }
                    results.append(new_item)
                    index_decision_to_vector_store(new_item, "KVKK")
        except Exception as e:
            logger.warning(f"yargi-mcp live KVKK search failed: {e}")
            
        self._cache_set(key, results)
        return results

    def bddk_ara(self, sorgu: str, limit: int = 5) -> List[Dict]:
        key = f"bddk:{sorgu}:{limit}"
        cached = self._cache_get(key)
        if cached:
            return cached

        results = []
        try:
            mcp_res = call_yargi_mcp_tool("search_bddk_decisions", {"keywords": sorgu, "page": 1})
            if mcp_res:
                decisions = mcp_res.get("decisions", [])
                if not decisions and mcp_res.get("content"):
                    try:
                        c_text = mcp_res["content"][0].get("text", "")
                        decisions = json.loads(c_text).get("decisions", [])
                    except:
                        pass
                
                for item in decisions[:limit]:
                    doc_id = item.get("document_id", "")
                    if not doc_id:
                        continue
                    
                    doc_text = ""
                    try:
                        doc_res = call_yargi_mcp_tool("get_bddk_document_markdown", {"document_id": doc_id})
                        if doc_res:
                            if doc_res.get("markdown_content"):
                                doc_text = doc_res["markdown_content"]
                            elif doc_res.get("content"):
                                try:
                                    c_text = doc_res["content"][0].get("text", "")
                                    doc_text = json.loads(c_text).get("markdown_content", "") or c_text
                                except:
                                    doc_text = doc_res["content"][0].get("text", "")
                    except Exception as doc_err:
                        logger.warning(f"Failed to fetch BDDK document: {doc_err}")
                        
                    new_item = {
                        "kaynak": "bddk",
                        "esas": item.get("decision_no", item.get("karar_no", "")),
                        "karar": item.get("decision_no", item.get("karar_no", "")),
                        "tarih": item.get("decision_date", item.get("tarih", "")),
                        "konu": item.get("title", "BDDK Kararı"),
                        "ozet": doc_text or item.get("summary", "Bankacılık Düzenleme ve Denetleme Kurulu Kararı."),
                        "mahkeme": "BDDK",
                        "documentId": doc_id
                    }
                    results.append(new_item)
                    index_decision_to_vector_store(new_item, "BDDK")
        except Exception as e:
            logger.warning(f"yargi-mcp live BDDK search failed: {e}")
            
        self._cache_set(key, results)
        return results

    def tumunu_ara(self, sorgu: str, limit: int = 3) -> Dict[str, List[Dict]]:
        return {
            "yargitay": self.yargitay_ara(sorgu, limit),
            "danistay": self.danistay_ara(sorgu, limit),
            "aym": self.aym_ara(sorgu, limit),
            "mevzuat": self.mevzuat_ara(sorgu, limit),
            "kvkk": self.kvkk_ara(sorgu, limit),
            "bddk": self.bddk_ara(sorgu, limit)
        }

remote = RemoteLegalSources()
