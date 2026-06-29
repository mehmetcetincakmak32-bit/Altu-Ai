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
        pass

def test_search():
    url = "https://yargimcp.surucu.dev/mcp"
    headers = {
        "Accept": "text/event-stream",
        "User-Agent": "Mozilla/5.0",
    }
    
    print("Getting session ID...")
    r1 = requests.get(url, headers=headers, verify=False, timeout=10)
    session_id = r1.headers.get("Mcp-Session-Id")
    
    if not session_id:
        return
        
    t = threading.Thread(target=keep_sse_alive, args=(url, session_id), daemon=True)
    t.start()
    time.sleep(1)
    
    post_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Mcp-Session-Id": session_id,
        "User-Agent": "Mozilla/5.0"
    }
    
    # 1. Initialize
    init_payload = {
        "jsonrpc": "2.0",
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "altu-client", "version": "1.0.0"}
        },
        "id": 1
    }
    requests.post(url, json=init_payload, headers=post_headers, verify=False, timeout=15)
    
    # 2. Initialized Notif
    requests.post(url, json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=post_headers, verify=False, timeout=10)
    
    # 3. Call tool
    print("\nCalling 'search_bedesten_unified' for 'tazminat'...")
    call_payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "search_bedesten_unified",
            "arguments": {
                "phrase": "tazminat",
                "court_types": ["YARGITAYKARARI"],
                "pageNumber": 1
            }
        },
        "id": 2
    }
    
    r_call = requests.post(url, json=call_payload, headers=post_headers, verify=False, timeout=30)
    print(f"Tool call status: {r_call.status_code}")
    
    lines = r_call.text.split('\n')
    for line in lines:
        if line.startswith("data:"):
            data_json = json.loads(line[5:].strip())
            print("\nResponse Data:")
            print(json.dumps(data_json, indent=2, ensure_ascii=False))
            break

if __name__ == "__main__":
    test_search()
