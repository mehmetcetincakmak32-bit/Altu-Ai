"""
ALTU Danıştay Karar Arama MCP Sunucusu

MCP (Model Context Protocol) sunucusu olarak çalışır.
karararama.danistay.gov.tr üzerinden emsal kararları arar.

Kullanım:
  python danistay_mcp_server.py
  # SSE endpoint: http://localhost:8025/mcp
"""

import json
import logging
import re
import time
from typing import Optional
from urllib.parse import quote

import requests
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("danistay-mcp")

mcp = FastMCP("Danıştay Karar Arama", host="127.0.0.1", port=8025)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

BASE_URL = "https://karararama.danistay.gov.tr"

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.verify = False

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def _get_initial_session():
    """Get initial session cookies from the main page."""
    try:
        r = SESSION.get(BASE_URL + "/", timeout=15)
        logger.info(f"Session established: {r.status_code}")
        return True
    except Exception as e:
        logger.warning(f"Session init failed: {e}")
        return False


def _search_via_site(sorgu: str, limit: int = 10) -> list:
    """
    Search Danıştay decisions via the official site's search form.
    Uses the detayliArama endpoint.
    """
    results = []

    try:
        # First get a session
        _get_initial_session()

        # Try the advanced search form
        form_data = {
            "kelime": sorgu,
            "aramaTuru": "KELIME",
            "daire": "",
            "kararYili": "",
            "kararNo": "",
            "esasNo": "",
        }

        r = SESSION.post(
            BASE_URL + "/detayliArama",
            data=form_data,
            timeout=30,
        )

        if r.status_code == 200:
            # Parse results from HTML table
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(r.text, "html.parser")

            # Find result table rows
            rows = soup.select("table tr") or soup.select(".table tr") or soup.select("[class*='result'] tr")

            for row in rows:
                cells = row.find_all("td")
                if len(cells) >= 3:
                    item = {
                        "kaynak": "danistay",
                        "mahkeme": "Danıştay",
                        "esas": cells[0].get_text(strip=True) if len(cells) > 0 else "",
                        "karar": cells[1].get_text(strip=True) if len(cells) > 1 else "",
                        "ozet": cells[2].get_text(strip=True) if len(cells) > 2 else "",
                        "link": "",
                    }
                    link = cells[0].find("a") if len(cells) > 0 else None
                    if link and link.get("href"):
                        item["link"] = link["href"]
                    results.append(item)
                    if len(results) >= limit:
                        break

            logger.info(f"Found {len(results)} results from site for '{sorgu}'")
        else:
            logger.warning(f"Site search returned {r.status_code}")

    except Exception as e:
        logger.error(f"Site search error: {e}")

    return results


def _search_via_bedesten(sorgu: str, limit: int = 10) -> list:
    """Fallback: Search via Bedesten API (Adalet Bakanlığı)."""
    results = []
    try:
        url = f"https://bedesten.adalet.gov.tr/api/DANISTAYKARARI/Ara?aranan={quote(sorgu)}&sayfa=1&sayfadakiKayitSayisi={limit}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            for item in data.get("data", data.get("liste", data.get("result", []))):
                results.append({
                    "kaynak": "danistay",
                    "mahkeme": "Danıştay",
                    "esas": item.get("esasNo", ""),
                    "karar": item.get("kararNo", ""),
                    "tarih": item.get("kararTarihi", ""),
                    "konu": item.get("konu", item.get("davaTuru", "")),
                    "ozet": item.get("ozet", item.get("kararOzeti", ""))[:500],
                    "birim": item.get("birimAdi", ""),
                    "link": "",
                })
            logger.info(f"Found {len(results)} results from Bedesten for '{sorgu}'")
    except Exception as e:
        logger.error(f"Bedesten search error: {e}")
    return results


@mcp.tool()
def danistay_karar_ara(sorgu: str, limit: int = 10) -> str:
    """
    Danıştay emsal kararlarını arar.
    
    Args:
        sorgu: Aranacak kelime veya ifade (örn: "ihale", "vergi", "disiplin")
        limit: Döndürülecek maksimum sonuç sayısı (max 20)
    
    Returns:
        JSON formatında Danıştay karar listesi
    """
    if limit > 20:
        limit = 20

    results = _search_via_site(sorgu, limit)

    if not results:
        results = _search_via_bedesten(sorgu, limit)

    if not results:
        return json.dumps({
            "success": True,
            "results": [],
            "message": f"'{sorgu}' için sonuç bulunamadı."
        }, ensure_ascii=False)

    return json.dumps({
        "success": True,
        "results": results,
        "count": len(results),
        "kaynak": "Danıştay Karar Arama",
    }, ensure_ascii=False)


@mcp.tool()
def danistay_karar_detay(karar_id: str = "", esas_no: str = "", karar_no: str = "") -> str:
    """
    Belirli bir Danıştay kararının detayını getirir.
    
    Args:
        karar_id: Karar ID (site URL'indeki ID)
        esas_no: Esas numarası (örn: "2024/1234")
        karar_no: Karar numarası
    
    Returns:
        Kararın detaylı bilgisi
    """
    if not karar_id and not esas_no:
        return json.dumps({"success": False, "error": "karar_id veya esas_no gereklidir."}, ensure_ascii=False)

    return json.dumps({
        "success": True,
        "message": "Detay için lütfen tam karar metnini https://karararama.danistay.gov.tr/ adresinden görüntüleyin.",
        "karar_id": karar_id,
        "esas_no": esas_no,
        "karar_no": karar_no,
    }, ensure_ascii=False)


@mcp.tool()
def danistay_daire_liste() -> str:
    """
    Danıştay dairelerinin listesini döndürür.
    
    Returns:
        Danıştay daireleri ve görev alanları
    """
    daireler = [
        {"id": 1, "ad": "1. Daire", "gorev": "İdari işlemler, kamu personeli, atama"},
        {"id": 2, "ad": "2. Daire", "gorev": "İmar, çevre, kültür varlıkları"},
        {"id": 3, "ad": "3. Daire", "gorev": "Vergi hukuku, vergi cezaları"},
        {"id": 4, "ad": "4. Daire", "gorev": "Vergi hukuku, KDV, kurumlar vergisi"},
        {"id": 5, "ad": "5. Daire", "gorev": "Memuriyet, disiplin, özlük işleri"},
        {"id": 6, "ad": "6. Daire", "gorev": "İmar, kamulaştırma, çevre"},
        {"id": 7, "ad": "7. Daire", "gorev": "Vergi hukuku, harçlar, damga vergisi"},
        {"id": 8, "ad": "8. Daire", "gorev": "Eğitim, bilim, gençlik ve spor"},
        {"id": 9, "ad": "9. Daire", "gorev": "Gümrük, teşvik, dış ticaret"},
        {"id": 10, "ad": "10. Daire", "gorev": "Sağlık, sosyal güvenlik, eczacılık"},
        {"id": 11, "ad": "11. Daire", "gorev": "Ulaştırma, haberleşme, enerji"},
        {"id": 12, "ad": "12. Daire", "gorev": "İmar, parselasyon, yapı ruhsatı"},
        {"id": 13, "ad": "13. Daire", "gorev": "İdari sözleşmeler, ihale hukuku"},
        {"id": 14, "ad": "VDDGK", "gorev": "Vergi Dava Daireleri Genel Kurulu"},
        {"id": 15, "ad": "İDDK", "gorev": "İdari Dava Daireleri Kurulu"},
    ]
    return json.dumps({"success": True, "daireler": daireler}, ensure_ascii=False)


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("ALTU Danıştay MCP Sunucusu Başlatılıyor...")
    logger.info(f"MCP Endpoint: http://localhost:8025/mcp")
    logger.info("=" * 50)
    mcp.run(transport="sse")