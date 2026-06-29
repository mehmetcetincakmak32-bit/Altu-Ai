import json
import requests
import sys
from pathlib import Path

# Add python-backend directory to system path to ensure vector_store can be imported when run from project root
sys.path.append(str(Path(__file__).parent))

from vector_store import get_vector_store

url = "https://raw.githubusercontent.com/fatihdx/turk-ceza-hukuku-json/main/TCK_5237.json"

def main():
    print("Downloading TCK JSON...")
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"Error downloading JSON: {e}")
        sys.exit(1)
        
    print("Download complete. Parsing TCK articles...")
    maddeler = data.get("maddeler", {})
    if not maddeler:
        print("No articles found in the JSON.")
        sys.exit(1)
        
    print(f"Found {len(maddeler)} articles.")
    
    # Get the global vector store instance
    store = get_vector_store(subdomain=None)
    
    count = 0
    for key, madde in maddeler.items():
        madde_no = madde.get("madde_no")
        baslik = madde.get("baslik", "")
        tam_metin = madde.get("tam_metin", "")
        
        if not tam_metin:
            continue
            
        # Format the text according to our structure
        text = f"Kanun: Türk Ceza Kanunu (5237) | Madde {madde_no} - {baslik}: {tam_metin}"
        metadata = {
            "kaynak": "mevzuat",
            "tur": "kanun",
            "kanun_adi": "Türk Ceza Kanunu",
            "madde_no": str(madde_no),
            "baslik": baslik,
            "kategori": "ceza"
        }
        
        # Add to the global vector store (chunk=True will slice longer articles into overlapping segments)
        store.add_text(text, metadata=metadata, chunk=True)
        count += 1
        if count % 50 == 0:
            print(f"Indexed {count} articles...")
            
    print(f"Successfully indexed {count} TCK articles into the global vector store.")

if __name__ == "__main__":
    main()
