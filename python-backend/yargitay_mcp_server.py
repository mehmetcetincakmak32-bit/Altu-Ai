"""
ALTU Yargıtay Karar Arama MCP Sunucusu

MCP (Model Context Protocol) sunucusu olarak çalışır.
karararama.yargitay.gov.tr üzerinden emsal kararları arar.

Kullanım:
  python yargitay_mcp_server.py
  # SSE endpoint: http://localhost:8026/mcp
"""

import json
import logging
import re
from typing import Optional
from urllib.parse import quote

import requests
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("yargitay-mcp")

mcp = FastMCP("Yargıtay Karar Arama", host="127.0.0.1", port=8026)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}

BASE_URL = "https://karararama.yargitay.gov.tr"
BEDESTEN_API = "https://bedesten.adalet.gov.tr/api"

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.verify = False

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def _search_via_site(sorgu: str, limit: int = 10) -> list:
    """Search via official Yargıtay karar arama site."""
    results = []
    try:
        r = SESSION.get(BASE_URL + "/", timeout=15)
        if r.status_code != 200:
            return results

        # Extract jsessionid from form action
        jsid_match = re.search(r'/detayliArama;jsessionid=([^"\'\\s]+)', r.text)
        if not jsid_match:
            logger.warning("Could not find jsessionid in page")
            return results

        jsessionid = jsid_match.group(1)
        search_url = f"{BASE_URL}/detayliArama;jsessionid={jsessionid}"

        form_data = {
            "kelime": sorgu,
            "aramaTuru": "KELIME",
            "daire": "",
            "kararYili": "",
            "kararNo": "",
            "esasNo": "",
        }

        sr = SESSION.post(search_url, data=form_data, timeout=30)
        if sr.status_code == 200:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(sr.text, "html.parser")
            rows = soup.select("table tr") or soup.select(".table tr")

            for row in rows:
                cells = row.find_all("td")
                if len(cells) >= 3:
                    link = cells[0].find("a") if len(cells) > 0 else None
                    item = {
                        "kaynak": "yargitay",
                        "mahkeme": "Yargıtay",
                        "esas": cells[0].get_text(strip=True) if len(cells) > 0 else "",
                        "karar": cells[1].get_text(strip=True) if len(cells) > 1 else "",
                        "ozet": cells[2].get_text(strip=True) if len(cells) > 2 else "",
                        "tarih": "",
                        "birim": "",
                        "link": link.get("href", "") if link else "",
                    }
                    results.append(item)
                    if len(results) >= limit:
                        break

            logger.info(f"Site: {len(results)} sonuç '{sorgu}'")
    except Exception as e:
        logger.warning(f"Site search error: {e}")

    return results


def _search_via_bedesten(sorgu: str, limit: int = 10) -> list:
    """Fallback via Bedesten API."""
    results = []
    try:
        url = f"{BEDESTEN_API}/YARGITAYKARARI/Ara?aranan={quote(sorgu)}&sayfa=1&sayfadakiKayitSayisi={limit}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            for item in data.get("data", data.get("liste", data.get("result", []))):
                results.append({
                    "kaynak": "yargitay",
                    "mahkeme": "Yargıtay",
                    "esas": item.get("esasNo", ""),
                    "karar": item.get("kararNo", ""),
                    "tarih": item.get("kararTarihi", ""),
                    "konu": item.get("konu", item.get("davaTuru", "")),
                    "ozet": item.get("ozet", item.get("kararOzeti", ""))[:500],
                    "birim": item.get("birimAdi", ""),
                    "link": "",
                })
            logger.info(f"Bedesten: {len(results)} sonuç '{sorgu}'")
    except Exception as e:
        logger.warning(f"Bedesten error: {e}")
    return results


@mcp.tool()
def yargitay_karar_ara(sorgu: str, limit: int = 10) -> str:
    """
    Yargıtay emsal kararlarını arar.

    Args:
        sorgu: Aranacak kelime veya ifade (örn: \"tazminat\", \"işçi alacağı\", \"boşanma\")
        limit: Döndürülecek maksimum sonuç sayısı (max 20)

    Returns:
        JSON formatında Yargıtay karar listesi
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
        "kaynak": "Yargıtay Karar Arama",
    }, ensure_ascii=False)


@mcp.tool()
def yargitay_karar_detay(karar_id: str = "", esas_no: str = "") -> str:
    """
    Belirli bir Yargıtay kararının detayını döndürür.

    Args:
        karar_id: Karar ID
        esas_no: Esas numarası (örn: \"2024/1234\")

    Returns:
        Karar detayı
    """
    return json.dumps({
        "success": True,
        "message": "Detay için https://karararama.yargitay.gov.tr/ adresini ziyaret edin.",
        "karar_id": karar_id,
        "esas_no": esas_no,
    }, ensure_ascii=False)


@mcp.tool()
def yargitay_daire_liste() -> str:
    """
    Yargıtay dairelerinin listesini ve görev alanlarını döndürür.

    Returns:
        Yargıtay hukuk/ceza daireleri ve görevleri
    """
    daireler = {
        "hukuk": [
            {"id": 1, "ad": "1. Hukuk Dairesi", "gorev": "Tapu sicili, kat mülkiyeti, gayrimenkul satışı"},
            {"id": 2, "ad": "2. Hukuk Dairesi", "gorev": "Aile hukuku, boşanma, velayet, nafaka, soybağı"},
            {"id": 3, "ad": "3. Hukuk Dairesi", "gorev": "Kira hukuku, tahliye, kira tespiti"},
            {"id": 4, "ad": "4. Hukuk Dairesi", "gorev": "Haksız fiil, tazminat (maddi-manevi)"},
            {"id": 5, "ad": "5. Hukuk Dairesi", "gorev": "Kamulaştırma, taşınmaz mal hukuku"},
            {"id": 6, "ad": "6. Hukuk Dairesi", "gorev": "Ticaret hukuku, şirketler, sigorta"},
            {"id": 7, "ad": "7. Hukuk Dairesi", "gorev": "İş hukuku, kıdem-ihbar tazminatı"},
            {"id": 8, "ad": "8. Hukuk Dairesi", "gorev": "İş hukuku, iş kazası, sendika"},
            {"id": 9, "ad": "9. Hukuk Dairesi", "gorev": "İcra-iflas hukuku, haciz, ihalenin feshi"},
            {"id": 10, "ad": "10. Hukuk Dairesi", "gorev": "Sosyal güvenlik, SGK, emeklilik"},
            {"id": 11, "ad": "11. Hukuk Dairesi", "gorev": "Fikri-sınai mülkiyet, patent, marka"},
            {"id": 12, "ad": "12. Hukuk Dairesi", "gorev": "Sigorta hukuku, trafik kazası"},
            {"id": 13, "ad": "13. Hukuk Dairesi", "gorev": "Tüketici hukuku, ayıplı mal/hizmet"},
            {"id": 14, "ad": "14. Hukuk Dairesi", "gorev": "İmar hukuku, parselasyon, ruhsat"},
            {"id": 15, "ad": "15. Hukuk Dairesi", "gorev": "Eser sözleşmesi, arsa payı karşılığı inşaat"},
            {"id": 16, "ad": "16. Hukuk Dairesi", "gorev": "Dernekler, vakıflar, cemaat malları"},
            {"id": 17, "ad": "17. Hukuk Dairesi", "gorev": "Deniz ticareti, sigorta hukuku"},
            {"id": 18, "ad": "18. Hukuk Dairesi", "gorev": "İdari işler, hakem kararları"},
            {"id": 19, "ad": "19. Hukuk Dairesi", "gorev": "İcra ve iflas hukuku (temyiz)"},
            {"id": 20, "ad": "20. Hukuk Dairesi", "gorev": "Orman, mera, kadastro"},
            {"id": 21, "ad": "21. Hukuk Dairesi", "gorev": "İş hukuku (işe iade, sendikal tazminat)"},
            {"id": 22, "ad": "22. Hukuk Dairesi", "gorev": "Ticaret hukuku (çek, senet, bono)"},
            {"id": 23, "ad": "23. Hukuk Dairesi", "gorev": "İcra-iflas hukuku (istihkak, sıra cetveli)"},
            {"id": 24, "ad": "24. Hukuk Dairesi", "gorev": "Tüketici hukuku"},
            {"id": 25, "ad": "25. Hukuk Dairesi", "gorev": "İş hukuku (iş sözleşmesi, fazla çalışma)"},
            {"id": 26, "ad": "26. Hukuk Dairesi", "gorev": "Sigorta hukuku (trafik, kasko)"},
            {"id": 27, "ad": "27. Hukuk Dairesi", "gorev": "Eser sözleşmesi, vekalet sözleşmesi"},
            {"id": 28, "ad": "28. Hukuk Dairesi", "gorev": "Aile hukuku (boşanma, mal rejimi)"},
            {"id": 29, "ad": "29. Hukuk Dairesi", "gorev": "Ticaret hukuku (limited-anonim şirket)"},
            {"id": 30, "ad": "30. Hukuk Dairesi", "gorev": "İdari yargı kararları (itiraz)"},
            {"id": 31, "ad": "31. Hukuk Dairesi", "gorev": "İş hukuku (iş kazası, meslek hastalığı)"},
            {"id": 32, "ad": "32. Hukuk Dairesi", "gorev": "Sigorta hukuku (zorunlu trafik)"},
            {"id": 33, "ad": "33. Hukuk Dairesi", "gorev": "İcra-iflas hukuku"},
            {"id": 34, "ad": "34. Hukuk Dairesi", "gorev": "Tüketici hukuku (kredi, bankacılık)"},
            {"id": 35, "ad": "35. Hukuk Dairesi", "gorev": "İş hukuku (toplu iş sözleşmesi)"},
            {"id": 36, "ad": "36. Hukuk Dairesi", "gorev": "Sigorta hukuku"},
            {"id": 37, "ad": "37. Hukuk Dairesi", "gorev": "Ticaret hukuku (kooperatif)"},
            {"id": 38, "ad": "38. Hukuk Dairesi", "gorev": "İcra-iflas hukuku"},
            {"id": 39, "ad": "39. Hukuk Dairesi", "gorev": "Sigorta hukuku"},
            {"id": 40, "ad": "40. Hukuk Dairesi", "gorev": "İş hukuku"},
            {"id": 41, "ad": "41. Hukuk Dairesi", "gorev": "Ticaret hukuku"},
            {"id": 42, "ad": "42. Hukuk Dairesi", "gorev": "Aile hukuku"},
            {"id": 43, "ad": "43. Hukuk Dairesi", "gorev": "Tüketici hukuku"},
            {"id": 44, "ad": "44. Hukuk Dairesi", "gorev": "İş hukuku"},
            {"id": 45, "ad": "45. Hukuk Dairesi", "gorev": "Sigorta hukuku"},
            {"id": 46, "ad": "46. Hukuk Dairesi", "gorev": "Ticaret hukuku"},
            {"id": 47, "ad": "47. Hukuk Dairesi", "gorev": "İcra-iflas hukuku"},
            {"id": 48, "ad": "48. Hukuk Dairesi", "gorev": "İş hukuku"},
            {"id": "HGK", "ad": "Hukuk Genel Kurulu", "gorev": "İçtihadı birleştirme, direnme kararları"},
        ],
        "ceza": [
            {"id": 1, "ad": "1. Ceza Dairesi", "gorev": "Kasten öldürme, yaralama, işkence"},
            {"id": 2, "ad": "2. Ceza Dairesi", "gorev": "Hırsızlık, yağma, mala zarar verme"},
            {"id": 3, "ad": "3. Ceza Dairesi", "gorev": "Dolandırıcılık, zimmet, irtikap"},
            {"id": 4, "ad": "4. Ceza Dairesi", "gorev": "Sahtecilik, bilişim suçları"},
            {"id": 5, "ad": "5. Ceza Dairesi", "gorev": "Nitelikli hırsızlık, yağma"},
            {"id": 6, "ad": "6. Ceza Dairesi", "gorev": "Cinsel suçlar, aile düzenine karşı suçlar"},
            {"id": 7, "ad": "7. Ceza Dairesi", "gorev": "Uyuşturucu, kaçakçılık"},
            {"id": 8, "ad": "8. Ceza Dairesi", "gorev": "Taksirle öldürme/yaralama, trafik"},
            {"id": 9, "ad": "9. Ceza Dairesi", "gorev": "Bilişim suçları, fikri mülkiyet"},
            {"id": 10, "ad": "10. Ceza Dairesi", "gorev": "Devlet güvenliğine karşı suçlar"},
            {"id": 11, "ad": "11. Ceza Dairesi", "gorev": "Terör suçları, anayasal düzene karşı"},
            {"id": 12, "ad": "12. Ceza Dairesi", "gorev": "Kumar, fuhuş, bulaşıcı hastalık"},
            {"id": 13, "ad": "13. Ceza Dairesi", "gorev": "Çocuk suçları, çocuk mahkemeleri"},
            {"id": 14, "ad": "14. Ceza Dairesi", "gorev": "Kabahatler, trafik cezaları"},
            {"id": 15, "ad": "15. Ceza Dairesi", "gorev": "İcra-iflas ceza hukuku"},
            {"id": 16, "ad": "16. Ceza Dairesi", "gorev": "Suçta tekerrür, adli sicil"},
            {"id": 17, "ad": "17. Ceza Dairesi", "gorev": "İcra-iflas ceza hukuku"},
            {"id": 18, "ad": "18. Ceza Dairesi", "gorev": "Vergi kaçakçılığı, ekonomik suçlar"},
            {"id": 19, "ad": "19. Ceza Dairesi", "gorev": "Bilişim suçları"},
            {"id": 20, "ad": "20. Ceza Dairesi", "gorev": "Uyuşturucu, kaçakçılık"},
            {"id": 21, "ad": "21. Ceza Dairesi", "gorev": "Terör, örgütlü suçlar"},
            {"id": 22, "ad": "22. Ceza Dairesi", "gorev": "Hürriyete karşı suçlar"},
            {"id": 23, "ad": "23. Ceza Dairesi", "gorev": "İcra-iflas ceza hukuku"},
            {"id": 24, "ad": "24. Ceza Dairesi", "gorev": "Çocuk suçları"},
            {"id": 25, "ad": "25. Ceza Dairesi", "gorev": "Özel ceza kanunları"},
            {"id": 26, "ad": "26. Ceza Dairesi", "gorev": "Bilişim suçları"},
            {"id": 27, "ad": "27. Ceza Dairesi", "gorev": "Uyuşturucu"},
            {"id": 28, "ad": "28. Ceza Dairesi", "gorev": "Terör suçları"},
            {"id": 29, "ad": "29. Ceza Dairesi", "gorev": "Cinsel suçlar"},
            {"id": "CGK", "ad": "Ceza Genel Kurulu", "gorev": "İçtihadı birleştirme, direnme kararları"},
        ],
    }
    return json.dumps({"success": True, "daireler": daireler}, ensure_ascii=False)


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("ALTU Yargıtay MCP Sunucusu Başlatılıyor...")
    logger.info("MCP Endpoint: http://localhost:8026/mcp")
    logger.info("=" * 50)
    mcp.run(transport="sse")