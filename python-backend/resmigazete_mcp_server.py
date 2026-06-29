"""
ALTU Resmi Gazete MCP Sunucusu

MCP sunucusu olarak resmigazete.gov.tr üzerinden
Resmi Gazete kararları, ilanları ve metinleri arar.

Kullanım:
  python resmigazete_mcp_server.py
  # SSE endpoint: http://localhost:8028/mcp
"""

import json
import logging
import re
from datetime import datetime
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("resmigazete-mcp")

mcp = FastMCP("Resmi Gazete", host="127.0.0.1", port=8028)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}

BASE_URL = "https://www.resmigazete.gov.tr"

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.verify = False

import urllib3
urllib3.disable_warnings()


@mcp.tool()
def resmigazete_ara(sorgu: str, limit: int = 10) -> str:
    """
    Resmi Gazete'de arama yapar.

    Args:
        sorgu: Aranacak kelime (örn: \"yönetmelik\", \"atama\", \"ihale\")
        limit: Maksimum sonuç sayısı (max 20)

    Returns:
        Resmi Gazete yayın listesi
    """
    if limit > 20:
        limit = 20

    results = []
    try:
        # Resmi Gazete arama sayfası
        search_url = f"{BASE_URL}/eskileri.aspx"
        params = {"search": sorgu}
        r = SESSION.get(search_url, params=params, timeout=20)

        if r.status_code == 200:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(r.text, "html.parser")

            rows = soup.select("table tr") or soup.select(".liste tr") or soup.select("[class*='row']")
            for row in rows:
                cells = row.find_all("td")
                if len(cells) >= 2:
                    link = cells[0].find("a") if cells[0] else None
                    item = {
                        "baslik": cells[0].get_text(strip=True) if cells[0] else "",
                        "tarih": cells[1].get_text(strip=True) if len(cells) > 1 else "",
                        "sayi": cells[2].get_text(strip=True) if len(cells) > 2 else "",
                        "link": link.get("href", "") if link else "",
                    }
                    if item["baslik"]:
                        results.append(item)
                    if len(results) >= limit:
                        break
    except Exception as e:
        logger.warning(f"Search error: {e}")

    if not results:
        try:
            r = SESSION.get(f"{BASE_URL}/", timeout=15)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    text = a.get_text(strip=True)
                    href = a["href"]
                    if text and len(text) > 10:
                        results.append({
                            "baslik": text[:200],
                            "tarih": "",
                            "sayi": "",
                            "link": href if href.startswith("http") else f"{BASE_URL}{href}",
                        })
                        if len(results) >= limit:
                            break
        except Exception as e:
            logger.warning(f"Fallback error: {e}")

    return json.dumps({
        "success": True,
        "results": results,
        "count": len(results),
        "kaynak": "Resmi Gazete",
    }, ensure_ascii=False)


@mcp.tool()
def resmigazete_tarih_ara(tarih: str = "") -> str:
    """
    Belirli bir tarihteki Resmi Gazete'yi getirir.

    Args:
        tarih: Tarih (GG/AA/YYYY formatında, boş bırakılırsa bugün)

    Returns:
        O tarihteki Resmi Gazete yayınları
    """
    if not tarih:
        tarih = datetime.now().strftime("%d/%m/%Y")
    elif "/" not in tarih:
        try:
            dt = datetime.strptime(tarih, "%Y-%m-%d")
            tarih = dt.strftime("%d/%m/%Y")
        except:
            pass

    results = []
    try:
        url = f"{BASE_URL}/eskileri.aspx"
        r = SESSION.get(url, params={"tarih": tarih}, timeout=15)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            for a in soup.find_all("a", href=True):
                text = a.get_text(strip=True)
                if text and len(text) > 5:
                    results.append({
                        "baslik": text[:300],
                        "link": a["href"] if a["href"].startswith("http") else f"{BASE_URL}{a['href']}",
                    })
    except Exception as e:
        logger.warning(f"Date search error: {e}")

    return json.dumps({
        "success": True,
        "tarih": tarih,
        "results": results,
        "count": len(results),
    }, ensure_ascii=False)


@mcp.tool()
def resmigazete_son_sayilar(adet: int = 5) -> str:
    """
    Son yayınlanan Resmi Gazete sayılarını listeler.

    Args:
        adet: Kaç adet gösterileceği

    Returns:
        Son Resmi Gazete sayıları
    """
    results = []
    try:
        r = SESSION.get(f"{BASE_URL}/", timeout=15)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            links = soup.find_all("a", href=True)
            seen = set()
            for a in links:
                href = a["href"]
                text = a.get_text(strip=True)
                if text and ("sayı" in text.lower() or "mükerrer" in text.lower() or re.search(r"\d{2}/\d{2}/\d{4}", text)):
                    if text not in seen:
                        seen.add(text)
                        results.append({
                            "baslik": text[:200],
                            "link": href if href.startswith("http") else f"{BASE_URL}{href}",
                        })
                    if len(results) >= adet:
                        break
    except Exception as e:
        logger.warning(f"Son sayılar error: {e}")

    return json.dumps({
        "success": True,
        "results": results,
        "count": len(results),
    }, ensure_ascii=False)


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("ALTU Resmi Gazete MCP Sunucusu Başlatılıyor...")
    logger.info("MCP Endpoint: http://localhost:8028/mcp")
    logger.info("=" * 50)
    mcp.run(transport="sse")