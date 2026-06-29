import requests
import urllib3
import time
import sys

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def read_raw_sse():
    url = "https://yargimcp.surucu.dev/mcp"
    headers = {
        "Accept": "text/event-stream",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    print("Getting session ID...")
    r1 = requests.get(url, headers=headers, verify=False, timeout=10)
    session_id = r1.headers.get("Mcp-Session-Id")
    print(f"Session ID: {session_id}")
    
    if not session_id:
        return
        
    print("\nConnecting to SSE stream...")
    headers["Mcp-Session-Id"] = session_id
    r = requests.get(url, headers=headers, stream=True, verify=False, timeout=15)
    print(f"Status: {r.status_code}")
    
    start_time = time.time()
    print("Reading first 10 seconds of the stream raw:")
    
    # Read byte by byte and print
    try:
        for chunk in r.iter_content(chunk_size=1024):
            if chunk:
                sys.stdout.write(chunk.decode('utf-8', errors='ignore'))
                sys.stdout.flush()
            if time.time() - start_time > 10:
                print("\nTimeout reached.")
                break
    except Exception as e:
        print(f"\nError reading: {e}")
    finally:
        r.close()

if __name__ == "__main__":
    read_raw_sse()
