import requests
import urllib3
import json
import threading
import time

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def keep_sse_alive(url, session_id):
    headers = {
        "Accept": "text/event-stream",
        "User-Agent": "Mozilla/5.0",
        "Mcp-Session-Id": session_id
    }
    try:
        with requests.get(url, headers=headers, stream=True, verify=False, timeout=30) as r:
            for line in r.iter_lines():
                pass
    except Exception as e:
        print(f"SSE keep-alive closed: {e}")

def test_direct_post():
    url = "https://yargimcp.surucu.dev/mcp"
    headers = {
        "Accept": "text/event-stream",
        "User-Agent": "Mozilla/5.0",
    }
    
    print("Step 1: Getting session ID...")
    r1 = requests.get(url, headers=headers, verify=False, timeout=10)
    session_id = r1.headers.get("Mcp-Session-Id")
    print(f"Session ID: {session_id}")
    
    if not session_id:
        print("No session ID.")
        return
        
    t = threading.Thread(target=keep_sse_alive, args=(url, session_id), daemon=True)
    t.start()
    
    time.sleep(1)
    
    print(f"\nStep 2: POSTing tools/list directly to {url}...")
    # Omitted "params" key
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/list",
        "id": 1
    }
    
    post_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Mcp-Session-Id": session_id,
        "User-Agent": "Mozilla/5.0"
    }
    
    try:
        r_post = requests.post(url, json=payload, headers=post_headers, verify=False, timeout=15)
        print(f"POST Status Code: {r_post.status_code}")
        print("POST Response Headers:")
        print(dict(r_post.headers))
        print("\nPOST Response Body (Raw Text):")
        print(r_post.text)
    except Exception as e:
        print(f"POST request failed: {e}")

if __name__ == "__main__":
    test_direct_post()
