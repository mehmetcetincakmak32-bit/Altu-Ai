"""
ALTU Mevzuat Bilgi Sistemi MCP Sunucusu

MCP sunucusu olarak mevzuat.gov.tr üzerinden kanun, yönetmelik, tüzük arar.

Kullanım:
  python mevzuat_mcp_server.py
  # SSE endpoint: http://localhost:8027/mcp
"""

import json
import logging
from urllib.parse import quote

import requests
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mevzuat-mcp")

mcp = FastMCP("Mevzuat Bilgi Sistemi", host="127.0.0.1", port=8027)

HEADERS = {
    "User-Agent": "ALTU/1.0",
    "Accept": "application/json",
}

MEVZUAT_API = "https://mevzuat.gov.tr/api"
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

import urllib3
urllib3.disable_warnings()


@mcp.tool()
def mevzuat_ara(sorgu: str, limit: int = 10) -> str:
    """
    Mevzuat Bilgi Sistemi'nde arama yapar.
    Kanun, yönetmelik, tüzük, tebliğ vb. tüm mevzuatı arar.

    Args:
        sorgu: Aranacak kelime (örn: \"iş kanunu\", \"kira\", \"ticaret\")
        limit: Maksimum sonuç sayısı (max 20)

    Returns:
        Mevzuat listesi (başlık, tür, sayı, tarih, özet)
    """
    if limit > 20:
        limit = 20

    try:
        r = SESSION.get(
            f"{MEVZUAT_API}/MevzuatAra",
            params={"aranan": sorgu, "sayfa": 1, "sayfadakiKayitSayisi": limit},
            timeout=15,
        )
        if r.status_code != 200:
            return json.dumps({"success": False, "error": f"API error: {r.status_code}"}, ensure_ascii=False)

        data = r.json()
        results = []
        for item in data.get("data", data.get("liste", [])):
            results.append({
                "baslik": item.get("baslik", item.get("mevzuatAdi", "")),
                "tur": item.get("tur", item.get("mevzuatTuru", "")),
                "sayi": item.get("sayi", item.get("mevzuatNo", "")),
                "tarih": item.get("tarih", item.get("yayimTarihi", "")),
                "ozet": (item.get("metin", item.get("icerik", "")) or "")[:500],
            })

        return json.dumps({
            "success": True,
            "results": results,
            "count": len(results),
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)


@mcp.tool()
def mevzuat_detay(mevzuat_no: str = "", mevzuat_id: str = "") -> str:
    """
    Belirli bir mevzuatın detayını ve madde metinlerini getirir.

    Args:
        mevzuat_no: Mevzuat numarası (örn: \"4857\")
        mevzuat_id: Mevzuat ID

    Returns:
        Mevzuat detayı ve maddeler
    """
    if not mevzuat_no and not mevzuat_id:
        return json.dumps({"success": False, "error": "mevzuat_no veya mevzuat_id gerekli."}, ensure_ascii=False)

    params = {}
    if mevzuat_no:
        params["mevzuatNo"] = mevzuat_no
    if mevzuat_id:
        params["mevzuatId"] = mevzuat_id

    try:
        r = SESSION.get(f"{MEVZUAT_API}/MevzuatDetay", params=params, timeout=15)
        if r.status_code != 200:
            return json.dumps({"success": False, "error": f"API error: {r.status_code}"}, ensure_ascii=False)

        data = r.json()
        maddeler = []
        for m in data.get("maddeler", []):
            maddeler.append({
                "madde_no": m.get("maddeNo", ""),
                "baslik": m.get("baslik", ""),
                "metin": m.get("metin", m.get("text", "")),
            })

        result = {
            "success": True,
            "kanun_adi": data.get("mevzuatAdi", ""),
            "no": data.get("mevzuatNo", ""),
            "tarih": data.get("yayimTarihi", ""),
            "tur": data.get("mevzuatTuru", ""),
            "rg_tarih": data.get("resmiGazeteTarihi", ""),
            "rg_sayi": data.get("resmiGazeteSayisi", ""),
            "madde_sayisi": len(maddeler),
            "maddeler": maddeler[:20],
        }
        return json.dumps(result, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)


@mcp.tool()
def mevzuat_tur_liste() -> str:
    """
    Mevzuat türlerini listeler.

    Returns:
        Mevzuat türleri (kanun, yönetmelik, tüzük, tebliğ vb.)
    """
    turler = [
        {"id": "Kanun", "ad": "Kanun", "aciklama": "TBMM tarafından kabul edilen kanunlar"},
        {"id": "KHK", "ad": "Kanun Hükmünde Kararname", "aciklama": "Bakanlar Kurulu tarafından çıkarılan KHK'ler"},
        {"id": "CumhurbaskanligiKararnamesi", "ad": "Cumhurbaşkanlığı Kararnamesi", "aciklama": "Cumhurbaşkanlığı kararnameleri"},
        {"id": "Yonetmelik", "ad": "Yönetmelik", "aciklama": "Bakanlıklar ve kamu kurumları yönetmelikleri"},
        {"id": "Tuzuk", "ad": "Tüzük", "aciklama": "Bakanlar Kurulu/Bakanlık tüzükleri"},
        {"id": "Teblig", "ad": "Tebliğ", "aciklama": "Düzenleyici tebliğler"},
        {"id": "Genelge", "ad": "Genelge", "aciklama": "Kamu kurumları genelgeleri"},
        {"id": "YargiKarari", "ad": "Yargı Kararı", "aciklama": "Mahkeme kararları"},
        {"id": "MilletlerarasiAndlasma", "ad": "Milletlerarası Andlaşma", "aciklama": "Uluslararası anlaşmalar"},
    ]
    return json.dumps({"success": True, "turler": turler}, ensure_ascii=False)


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("ALTU Mevzuat MCP Sunucusu Başlatılıyor...")
    logger.info("MCP Endpoint: http://localhost:8027/mcp")
    logger.info("=" * 50)
    mcp.run(transport="sse")