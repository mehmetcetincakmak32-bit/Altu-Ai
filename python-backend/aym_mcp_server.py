"""
ALTU Anayasa Mahkemesi (AYM) Kararları MCP Sunucusu

MCP sunucusu olarak AYM kararlarını arar.
Kaynak: Bedesten API + yerel veri setleri

Kullanım:
  python aym_mcp_server.py
  # SSE endpoint: http://localhost:8029/mcp
"""

import json
import logging
from urllib.parse import quote

import requests
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("aym-mcp")

mcp = FastMCP("Anayasa Mahkemesi Kararları", host="127.0.0.1", port=8029)

HEADERS = {
    "User-Agent": "ALTU/1.0",
    "Accept": "application/json",
}

BEDESTEN_API = "https://bedesten.adalet.gov.tr/api"
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

import urllib3
urllib3.disable_warnings()


@mcp.tool()
def aym_karar_ara(sorgu: str, limit: int = 10) -> str:
    """
    Anayasa Mahkemesi (AYM) kararlarını arar.
    Bireysel başvuru kararları, iptal davaları ve itiraz başvuruları.

    Args:
        sorgu: Aranacak kelime (örn: \"mülkiyet hakkı\", \"ifade özgürlüğü\")
        limit: Maksimum sonuç sayısı (max 20)

    Returns:
        AYM karar listesi
    """
    if limit > 20:
        limit = 20

    results = []

    # 1. Bedesten API üzerinden AYM bireysel başvuru ara
    try:
        r = SESSION.get(
            f"{BEDESTEN_API}/AYMBireysel/Ara",
            params={"aranan": sorgu, "sayfa": 1, "sayfadakiKayitSayisi": limit},
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            for item in data.get("data", data.get("liste", data.get("result", []))):
                results.append({
                    "kaynak": "aym",
                    "mahkeme": "Anayasa Mahkemesi",
                    "basvuru_no": item.get("basvuruNo", ""),
                    "karar_tarihi": item.get("kararTarihi", ""),
                    "konu": item.get("konu", item.get("davaTuru", "")),
                    "ihlal": item.get("ihlalEdilenHak", ""),
                    "sonuc": item.get("sonuc", item.get("kararTuru", "")),
                    "ozet": item.get("ozet", item.get("kararOzeti", ""))[:500],
                })
    except Exception as e:
        logger.warning(f"Bedesten AYM error: {e}")

    # 2. Yerel AYM veri setinden ara (Kaggle/HF dataset)
    if not results:
        try:
            import os, json as j
            local_paths = [
                os.path.join(os.path.dirname(__file__), "data", "aym_kararlari.json"),
                os.path.join(os.path.dirname(__file__), "..", "data", "aym_kararlari.json"),
            ]
            for p in local_paths:
                if os.path.exists(p):
                    with open(p, "r", encoding="utf-8") as f:
                        data = j.load(f)
                    items = data if isinstance(data, list) else data.get("data", [])
                    sorgu_lower = sorgu.lower()
                    for item in items:
                        text = (item.get("konu", "") + " " + item.get("ozet", "") + " " + item.get("karar", "")).lower()
                        if sorgu_lower in text:
                            results.append({
                                "kaynak": "aym",
                                "mahkeme": "Anayasa Mahkemesi",
                                "basvuru_no": item.get("basvuruNo", item.get("id", "")),
                                "karar_tarihi": item.get("kararTarihi", ""),
                                "konu": item.get("konu", "")[:200],
                                "ozet": (item.get("ozet", item.get("karar", "")) or "")[:500],
                            })
                            if len(results) >= limit:
                                break
                    if results:
                        break
        except Exception as e:
            logger.debug(f"Local AYM data error: {e}")

    return json.dumps({
        "success": True,
        "results": results,
        "count": len(results),
        "kaynak": "AYM Kararları",
    }, ensure_ascii=False)


@mcp.tool()
def aym_ihlal_turleri() -> str:
    """
    Anayasa Mahkemesi'ne bireysel başvuruda en çok ihlal edilen hakları listeler.

    Returns:
        İhlal türleri ve açıklamaları
    """
    ihlaller = [
        {"hak": "Mülkiyet Hakkı (AY. m.35)", "aciklama": "Kamulaştırma, tapu iptali, vergi cezaları"},
        {"hak": "Adil Yargılanma Hakkı (AY. m.36)", "aciklama": "Makul sürede yargılanma, silahların eşitliği, gerekçeli karar"},
        {"hak": "Kişi Hürriyeti ve Güvenliği (AY. m.19)", "aciklama": "Tutukluluk, gözaltı, yakalama"},
        {"hak": "İfade Özgürlüğü (AY. m.26)", "aciklama": "Sosyal medya, basın, düşünce açıklaması"},
        {"hak": "Özel Hayata Saygı (AY. m.20)", "aciklama": "Kişisel veri, telefon dinleme, özel hayatın gizliliği"},
        {"hak": "Din ve Vicdan Özgürlüğü (AY. m.24)", "aciklama": "İbadet, dini inanç, başörtüsü"},
        {"hak": "Sendika Hakkı (AY. m.51)", "aciklama": "Sendika üyeliği, toplu sözleşme"},
        {"hak": "Toplantı ve Gösteri Yürüyüşü (AY. m.34)", "aciklama": "İzin, dağıtma, orantılı müdahale"},
        {"hak": "Yaşam Hakkı (AY. m.17)", "aciklama": "Ölümle sonuçlanan olaylar, etkili soruşturma"},
        {"hak": "Eşitlik İlkesi (AY. m.10)", "aciklama": "Ayrımcılık yasağı, cinsiyet eşitliği"},
    ]
    return json.dumps({"success": True, "ihlaller": ihlaller}, ensure_ascii=False)


@mcp.tool()
def aym_istatistik() -> str:
    """
    Anayasa Mahkemesi bireysel başvuru istatistiklerini döndürür.

    Returns:
        AYM başvuru/karar istatistikleri
    """
    stats = {
        "toplam_basvuru": "450.000+",
        "yillik_basvuru": "40.000-50.000",
        "kabul_edilme_orani": "%2-3",
        "ihlal_karari_orani": "%1-2",
        "en_cok_ihlal": ["Adil Yargılanma Hakkı", "Mülkiyet Hakkı", "Kişi Hürriyeti"],
        "ortalama_karar_suresi": "2-4 yıl",
        "kaynak": "AYM Faaliyet Raporları",
    }
    return json.dumps({"success": True, "istatistik": stats}, ensure_ascii=False)


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("ALTU AYM MCP Sunucusu Başlatılıyor...")
    logger.info("MCP Endpoint: http://localhost:8029/mcp")
    logger.info("=" * 50)
    mcp.run(transport="sse")