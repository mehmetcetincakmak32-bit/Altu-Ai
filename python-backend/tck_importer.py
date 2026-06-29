import os
import json
import logging
import requests
import threading
from pathlib import Path
from vector_store import get_vector_store

logger = logging.getLogger(__name__)

TCK_URL = "https://raw.githubusercontent.com/fatihdx/turk-ceza-hukuku-json/main/TCK_5237.json"
TMK_URL = "https://raw.githubusercontent.com/anonrig/turk-medeni-kanunu-json/master/raw-law.json"

# Dictionary of PDF laws: { law_no: (url, display_name, category) }
PDF_LAWS = {
    "2709": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2709.pdf", "Türkiye Cumhuriyeti Anayasası", "anayasa"),
    "4721": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4721.pdf", "Türk Medeni Kanunu PDF", "bosanma"),
    "4857": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf", "İş Kanunu PDF", "is"),
    "7545": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.7545.pdf", "Kanun 7545 PDF", "diger"),
    "7528": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.7528.pdf", "Kanun 7528 PDF", "diger"),
    # Main Codes (Ana Kanunlar)
    "6098": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf", "Türk Borçlar Kanunu PDF", "borclar"),
    "6102": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6102.pdf", "Türk Ticaret Kanunu PDF", "ticaret"),
    "6100": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6100.pdf", "Hukuk Muhakemeleri Kanunu PDF", "dava"),
    "5271": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5271.pdf", "Ceza Muhakemesi Kanunu PDF", "ceza"),
    "2004": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2004.pdf", "İcra ve İflas Kanunu PDF", "icra"),
    # Additional Important Laws (Diğer Önemli Kanunlar)
    "2577": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2577.pdf", "İdari Yargılama Usulü Kanunu PDF", "idare"),
    "634": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.634.pdf", "Kat Mülkiyeti Kanunu PDF", "kira"),
    "2942": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2942.pdf", "Kamulaştırma Kanunu PDF", "diger"),
    "6502": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6502.pdf", "Tüketicinin Korunması Hakkında Kanun PDF", "ticaret"),
    "6284": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6284.pdf", "Ailenin Korunması ve Kadına Karşı Şiddetin Önlenmesine Dair Kanun PDF", "aile"),
    "213": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.213.pdf", "Vergi Usul Kanunu PDF", "vergi"),
    "7201": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.7201.pdf", "Tebligat Kanunu PDF", "dava"),
    # Newly Added Important Codes & Regulations
    "657": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.657.pdf", "Devlet Memurları Kanunu PDF", "idare"),
    "5393": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5393.pdf", "Belediye Kanunu PDF", "idare"),
    "5275": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5275.pdf", "Ceza ve Güvenlik Tedbirlerinin İnfazı Hakkında Kanun PDF", "ceza"),
    "5510": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5510.pdf", "Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu PDF", "is"),
    "3194": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3194.pdf", "İmar Kanunu PDF", "idare"),
    "6698": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf", "Kişisel Verilerin Korunması Kanunu PDF", "ticaret"),
    "2644": ("https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2644.pdf", "Tapu Kanunu PDF", "kira")
}

def extract_tmk_articles(nodes, current_titles=None):
    if current_titles is None:
        current_titles = []
    articles = []
    for node in nodes:
        title = node.get("b", "").strip()
        next_titles = current_titles + [title] if title else current_titles
        
        if "m" in node:
            articles.append({
                "madde_no": str(node.get("m")),
                "titles": next_titles,
                "content": node.get("i", "").strip()
            })
        elif isinstance(node.get("i"), list):
            articles.extend(extract_tmk_articles(node.get("i"), next_titles))
    return articles

def import_tck_if_needed():
    """Checks, updates, and deduplicates TCK, TMK, and all configured PDF law datasets."""
    def run_import():
        store = get_vector_store(subdomain=None)
        
        # 1. Update/Import TCK (Türk Ceza Kanunu) JSON
        try:
            logger.info("[Law Importer] Fetching TCK JSON to check for updates...")
            r = requests.get(TCK_URL, timeout=30)
            r.raise_for_status()
            data = r.json()
            maddeler = data.get("maddeler", {})
            
            if maddeler:
                tck_updated = False
                for key, madde in maddeler.items():
                    madde_no = str(madde.get("madde_no"))
                    baslik = madde.get("baslik", "")
                    tam_metin = madde.get("tam_metin", "")
                    if not tam_metin:
                        continue
                        
                    new_text = f"Kanun: Türk Ceza Kanunu (5237) | Madde {madde_no} - {baslik}: {tam_metin}"
                    
                    # Check if this article exists in vector store
                    existing_docs = [
                        doc for doc in store.documents 
                        if doc.get("metadata", {}).get("kanun_adi") == "Türk Ceza Kanunu" 
                        and doc.get("metadata", {}).get("madde_no") == madde_no
                    ]
                    
                    if existing_docs:
                        needs_update = any(doc.get("text") != new_text for doc in existing_docs)
                        if needs_update:
                            logger.info(f"[Law Importer] TCK Madde {madde_no} has updates. Overwriting...")
                            store.documents = [
                                doc for doc in store.documents 
                                if not (doc.get("metadata", {}).get("kanun_adi") == "Türk Ceza Kanunu" 
                                        and doc.get("metadata", {}).get("madde_no") == madde_no)
                            ]
                            metadata = {
                                "kaynak": "mevzuat",
                                "tur": "kanun",
                                "kanun_adi": "Türk Ceza Kanunu",
                                "madde_no": madde_no,
                                "baslik": baslik,
                                "kategori": "ceza"
                            }
                            store.add_text(new_text, metadata=metadata, chunk=True)
                            tck_updated = True
                    else:
                        metadata = {
                            "kaynak": "mevzuat",
                            "tur": "kanun",
                            "kanun_adi": "Türk Ceza Kanunu",
                            "madde_no": madde_no,
                            "baslik": baslik,
                            "kategori": "ceza"
                        }
                        store.add_text(new_text, metadata=metadata, chunk=True)
                        tck_updated = True
                
                if tck_updated:
                    store.save()
                    logger.info("[Law Importer] TCK update check and indexing complete.")
                else:
                    logger.info("[Law Importer] TCK is up-to-date. No changes made.")
        except Exception as e:
            logger.error(f"[Law Importer] Error during TCK import/update: {e}")

        # 2. Update/Import TMK (Türk Medeni Kanunu) JSON
        try:
            logger.info("[Law Importer] Fetching TMK JSON to check for updates...")
            r = requests.get(TMK_URL, timeout=30)
            r.raise_for_status()
            data = r.json()
            articles = extract_tmk_articles(data)
            
            if articles:
                tmk_updated = False
                for article in articles:
                    madde_no = str(article["madde_no"])
                    titles = article["titles"]
                    content = article["content"]
                    if not content:
                        continue
                        
                    path_title = " > ".join(titles)
                    new_text = f"Kanun: Türk Medeni Kanunu (4721) | Madde {madde_no} - {path_title}: {content}"
                    
                    existing_docs = [
                        doc for doc in store.documents 
                        if doc.get("metadata", {}).get("kanun_adi") == "Türk Medeni Kanunu" 
                        and doc.get("metadata", {}).get("madde_no") == madde_no
                    ]
                    
                    if existing_docs:
                        needs_update = any(doc.get("text") != new_text for doc in existing_docs)
                        if needs_update:
                            logger.info(f"[Law Importer] TMK Madde {madde_no} has updates. Overwriting...")
                            store.documents = [
                                doc for doc in store.documents 
                                if not (doc.get("metadata", {}).get("kanun_adi") == "Türk Medeni Kanunu" 
                                        and doc.get("metadata", {}).get("madde_no") == madde_no)
                            ]
                            metadata = {
                                "kaynak": "mevzuat",
                                "tur": "kanun",
                                "kanun_adi": "Türk Medeni Kanunu",
                                "madde_no": madde_no,
                                "baslik": titles[-1] if titles else "Medeni Kanun Maddesi",
                                "kategori": "bosanma"
                            }
                            store.add_text(new_text, metadata=metadata, chunk=True)
                            tmk_updated = True
                    else:
                        metadata = {
                            "kaynak": "mevzuat",
                            "tur": "kanun",
                            "kanun_adi": "Türk Medeni Kanunu",
                            "madde_no": madde_no,
                            "baslik": titles[-1] if titles else "Medeni Kanun Maddesi",
                            "kategori": "bosanma"
                        }
                        store.add_text(new_text, metadata=metadata, chunk=True)
                        tmk_updated = True
                        
                if tmk_updated:
                    store.save()
                    logger.info("[Law Importer] TMK update check and indexing complete.")
                else:
                    logger.info("[Law Importer] TMK is up-to-date. No changes made.")
        except Exception as e:
            logger.error(f"[Law Importer] Error during TMK import/update: {e}")

        # 3. Import Configured PDF Laws (Anayasa, TMK PDF, İş Kanunu, Borçlar Kanunu, etc.)
        for law_id, (url, display_name, category) in PDF_LAWS.items():
            try:
                has_pdf = any(f"{display_name} Metni" in doc.get("text", "") or doc.get("metadata", {}).get("kanun_adi") == display_name for doc in store.documents)
                if has_pdf:
                    logger.info(f"[Law Importer] {display_name} dataset is already indexed. Skipping.")
                else:
                    logger.info(f"[Law Importer] {display_name} dataset not found. Starting import...")
                    pdf_path = Path(__file__).parent / "data" / f"{law_id}.pdf"
                    pdf_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    logger.info(f"[Law Importer] Downloading {display_name} PDF from {url}...")
                    r = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
                    r.raise_for_status()
                    
                    pdf_path.write_bytes(r.content)
                    logger.info(f"[Law Importer] Download complete. Extracting text from {law_id}.pdf...")
                    
                    from document_processor import extract_text_from_pdf
                    text = extract_text_from_pdf(str(pdf_path))
                    
                    if not text.strip():
                        logger.warning(f"[Law Importer] Extracted {display_name} PDF text is empty.")
                    else:
                        full_text = f"{display_name} Metni (Kanun No: {law_id}):\n\n{text}"
                        logger.info(f"[Law Importer] Extracted {len(text)} characters. Indexing into vector store...")
                        metadata = {
                            "kaynak": "mevzuat",
                            "tur": "kanun",
                            "kanun_adi": display_name,
                            "kategori": category
                        }
                        store.add_text(full_text, metadata=metadata, chunk=True)
                        logger.info(f"[Law Importer] Successfully indexed {display_name}.")
                    
                    # Cleanup temp PDF file
                    if pdf_path.exists():
                        os.remove(pdf_path)
            except Exception as e:
                logger.error(f"[Law Importer] Error during {display_name} PDF import: {e}")

    thread = threading.Thread(target=run_import, daemon=True)
    thread.start()
    logger.info("[Law Importer] Background import thread started for all JSON and PDF datasets.")
