import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_400():
    url = "https://yargimcp.surucu.dev/mcp"
    headers = {
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    print(f"Connecting to: {url}...")
    try:
        r = requests.get(url, headers=headers, verify=False, timeout=10)
        print(f"Status Code: {r.status_code}")
        print("Response Headers:")
        print(dict(r.headers))
        print("\nResponse Body:")
        print(r.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_400()
