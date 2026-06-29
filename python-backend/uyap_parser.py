import re
import logging
from typing import List, Dict
from document_processor import extract_text_from_pdf, extract_text_and_signature_from_udf

logger = logging.getLogger(__name__)

def parse_uyap_raw_text(text: str) -> List[Dict]:
    """
    Parses a string of text representing a UYAP case list or case detail.
    Regex patterns are used to identify:
    - Esas/Karar Numbers (e.g., 2024/123, 2023 / 45)
    - Court Names (containing MAHKEMESİ, DAİRESİ, MÜDÜRLÜĞÜ, HAKİMLİĞİ)
    - Party Names or Topics
    """
    cases = []
    if not text:
        return cases

    lines = text.split('\n')
    current_court = "Belirtilmemiş Mahkeme"
    
    # Commonly seen court identifiers in Turkish
    court_keywords = ["MAHKEMESİ", "MÜDÜRLÜĞÜ", "DAİRESİ", "HAKİMLİĞİ", "BAŞSAVCILIĞI"]
    
    for line in lines:
        line_strip = line.strip()
        if not line_strip:
            continue
        
        # Check if line looks like a court name
        if any(kw in line_strip.upper() for kw in court_keywords):
            current_court = line_strip
            continue
            
        # Try to find a case number (e.g., 2024/1234 or 2023 / 5)
        # Look for 4 digits (year) followed by slash and digits
        match = re.search(r'\b(20\d{2})\s*/\s*(\d+)\b', line_strip)
        if match:
            esas_no = f"{match.group(1)}/{match.group(2)}"
            # Clean up the rest of the line to use as the case title/description
            ad_part = line_strip.replace(match.group(0), "").strip()
            # Clean up punctuation
            ad_part = re.sub(r'^[:\-\s\.\,]+', '', ad_part).strip()
            
            # If the rest of the line is empty or too short, make a decent title
            if not ad_part or len(ad_part) < 3:
                ad = f"UYAP Dava - {esas_no}"
            else:
                ad = ad_part
                
            cases.append({
                "dosyaNo": esas_no,
                "ad": ad.upper(),
                "konu": "UYAP Otomatik İçe Aktarım",
                "mahkeme": current_court,
                "esasNo": esas_no,
                "durum": "devam-ediyor",
                "tcKimlik": f"TC-{esas_no.replace('/', '')}"
            })
            
    # Deduplicate cases by dosyaNo
    seen = set()
    deduped = []
    for c in cases:
        if c["dosyaNo"] not in seen:
            seen.add(c["dosyaNo"])
            deduped.append(c)
            
    return deduped

def parse_uyap_pdf(pdf_path: str) -> List[Dict]:
    """Extracts text from PDF and parses UYAP cases"""
    text = extract_text_from_pdf(pdf_path)
    return parse_uyap_raw_text(text)

def parse_uyap_udf(udf_path: str) -> List[Dict]:
    """Extracts text from UDF document and parses UYAP cases"""
    res = extract_text_and_signature_from_udf(udf_path)
    text = res.get("text", "")
    return parse_uyap_raw_text(text)
