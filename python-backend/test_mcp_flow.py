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

def test_mcp_flow():
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
    
    post_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Mcp-Session-Id": session_id,
        "User-Agent": "Mozilla/5.0"
    }
    
    # 1. Send initialize
    print("\nStep 2: Sending 'initialize' request...")
    init_payload = {
        "jsonrpc": "2.0",
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "altu-client",
                "version": "1.0.0"
            }
        },
        "id": 1
    }
    r_init = requests.post(url, json=init_payload, headers=post_headers, verify=False, timeout=15)
    print(f"Initialize status: {r_init.status_code}")
    print(f"Initialize response: {r_init.text}")
    
    # 2. Send initialized notification
    print("\nStep 3: Sending 'notifications/initialized' notification...")
    initialized_payload = {
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    }
    r_notif = requests.post(url, json=initialized_payload, headers=post_headers, verify=False, timeout=15)
    print(f"Notification status: {r_notif.status_code}")
    
    # 3. Send tools/list
    print("\nStep 4: Sending 'tools/list' request...")
    list_payload = {
        "jsonrpc": "2.0",
        "method": "tools/list",
        "params": {},
        "id": 2
    }
    r_list = requests.post(url, json=list_payload, headers=post_headers, verify=False, timeout=15)
    print(f"Tools list status: {r_list.status_code}")
    print(f"Tools list response: {r_list.text}")

if __name__ == "__main__":
    test_mcp_flow()
