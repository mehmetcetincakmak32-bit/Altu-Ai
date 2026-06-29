import requests
import json

url = "https://raw.githubusercontent.com/fatihdx/turk-ceza-hukuku-json/main/TCK_5237.json"
print("Downloading TCK JSON...")
try:
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    data = r.json()
    print("Download completed successfully!")
    print(f"Type of data: {type(data)}")
    if isinstance(data, dict):
        print(f"Keys: {list(data.keys())}")
        for k, v in data.items():
            if isinstance(v, list):
                print(f"Key '{k}' is a list of length {len(v)}")
                if len(v) > 0:
                    print("Sample item:", json.dumps(v[0], ensure_ascii=False)[:300])
            elif isinstance(v, dict):
                print(f"Key '{k}' is a dict with keys {list(v.keys())}")
            else:
                print(f"Key '{k}' is {type(v)}: {str(v)[:200]}")
    elif isinstance(data, list):
        print(f"Data is a list of length {len(data)}")
        if len(data) > 0:
            print("Sample item:", json.dumps(data[0], ensure_ascii=False)[:300])
except Exception as e:
    print(f"Error: {e}")
