import requests
import urllib3
import json
from urllib.parse import urljoin, urlparse

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_remote_tools():
    base_url = "https://yargimcp.surucu.dev/mcp"
    headers = {
        "Accept": "text/event-stream",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    print(f"Connecting to SSE endpoint: {base_url} ...")
    r_sse = None
    try:
        r_sse = requests.get(base_url, headers=headers, stream=True, verify=False, timeout=10)
        print(f"Connection Status: {r_sse.status_code}")
        endpoint_path = None
        current_event = None
        
        for line in r_sse.iter_lines():
            if not line:
                continue
            line_str = line.decode('utf-8').strip()
            
            if line_str.startswith("event:"):
                current_event = line_str[6:].strip()
            elif line_str.startswith("data:") and current_event == "endpoint":
                endpoint_path = line_str[5:].strip()
                print(f"Found post endpoint path: {endpoint_path}")
                
                parsed_base = urlparse(base_url)
                origin = f"{parsed_base.scheme}://{parsed_base.netloc}"
                post_url = urljoin(origin, endpoint_path)
                print(f"Constructed POST URL: {post_url}")
                
                # Payload to list tools
                payload = {
                    "jsonrpc": "2.0",
                    "method": "tools/list",
                    "params": {},
                    "id": 1
                }
                
                print("Requesting tools/list...")
                r_post = requests.post(post_url, json=payload, headers={"Content-Type": "application/json"}, verify=False, timeout=15)
                print(f"POST Status Code: {r_post.status_code}")
                res_json = r_post.json()
                
                print("\nResponse:")
                tools = res_json.get("result", {}).get("tools", [])
                print(f"Found {len(tools)} tools:")
                for t in tools:
                    print(f"- {t.get('name')}: {t.get('description')}")
                break
                
        if not endpoint_path:
            print("Could not retrieve endpoint path from EventStream.")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        if r_sse:
            r_sse.close()

if __name__ == "__main__":
    get_remote_tools()
