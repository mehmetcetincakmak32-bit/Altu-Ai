import sys
import os
import json
from pathlib import Path

# Add python-backend directory to system path
sys.path.append(str(Path(__file__).parent))

try:
    from remote_sources import call_mcp_tool, LOCAL_MCP_ENDPOINTS
except ImportError as e:
    print(f"Import error: {e}")
    # Define fallback if imports fail
    LOCAL_MCP_ENDPOINTS = {
        "danistay": "http://localhost:8025/sse",
        "yargitay": "http://localhost:8026/sse",
        "mevzuat": "http://localhost:8027/sse",
        "resmigazete": "http://localhost:8028/sse",
        "aym": "http://localhost:8029/sse",
    }
    def call_mcp_tool(base_url, tool_name, arguments):
        import requests
        r_sse = None
        try:
            headers = {"Accept": "text/event-stream"}
            r_sse = requests.get(base_url, headers=headers, stream=True, timeout=10)
            endpoint_path = None
            current_event = None
            for line in r_sse.iter_lines():
                if not line: continue
                line_str = line.decode('utf-8').strip()
                if line_str.startswith("event:"):
                    current_event = line_str[6:].strip()
                elif line_str.startswith("data:") and current_event == "endpoint":
                    endpoint_path = line_str[5:].strip()
                    
                    from urllib.parse import urljoin, urlparse
                    parsed_base = urlparse(base_url)
                    origin = f"{parsed_base.scheme}://{parsed_base.netloc}"
                    post_url = urljoin(origin, endpoint_path)
                    payload = {
                        "jsonrpc": "2.0",
                        "method": "tools/call",
                        "params": {"name": tool_name, "arguments": arguments},
                        "id": 1
                    }
                    r_post = requests.post(post_url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
                    res_json = r_post.json()
                    result = res_json.get("result", {})
                    content = result.get("content", [])
                    if not content: return None
                    first_item = content[0]
                    if first_item.get("type") == "text":
                        text_val = first_item.get("text", "")
                        try:
                            return json.loads(text_val)
                        except json.JSONDecodeError:
                            return {"text": text_val}
                    return {"result": content}
            return None
        finally:
            if r_sse:
                try:
                    r_sse.close()
                except:
                    pass

def test_endpoints():
    print("=" * 60)
    print("MCP SERVERS CONNECTIVITY AND DATA INTEGRITY TEST")
    print("=" * 60)
    
    test_cases = {
        "aym": {
            "tool": "aym_karar_ara",
            "args": {"sorgu": "mülkiyet hakkı", "limit": 3}
        },
        "danistay": {
            "tool": "danistay_karar_ara",
            "args": {"sorgu": "ihale", "limit": 3}
        },
        "yargitay": {
            "tool": "yargitay_karar_ara",
            "args": {"sorgu": "tazminat", "limit": 3}
        },
        "mevzuat": {
            "tool": "mevzuat_ara",
            "args": {"sorgu": "kira", "limit": 3}
        },
        "resmigazete": {
            "tool": "resmigazete_ara",
            "args": {"sorgu": "yönetmelik", "limit": 3}
        }
    }
    
    for name, endpoint in LOCAL_MCP_ENDPOINTS.items():
        print(f"\n[TESTING] {name} MCP Server at {endpoint}...")
        case = test_cases.get(name)
        if not case:
            print(f"No test case defined for {name}")
            continue
            
        try:
            res = call_mcp_tool(endpoint, case["tool"], case["args"])
            if res:
                print(f"🟢 SUCCESS: {name} returned data successfully.")
                if "results" in res:
                    results = res["results"]
                    print(f"   Found {len(results)} results.")
                    for idx, r in enumerate(results[:2]):
                        print(f"   Result {idx+1}: {r.get('baslik', r.get('esas', r.get('konu', 'No title')))}")
                elif "success" in res:
                    print(f"   Success response: {res.get('success')}")
                    if "results" in res:
                        print(f"   Found {len(res['results'])} results.")
                else:
                    print(f"   Response keys: {list(res.keys())}")
            else:
                print(f"🔴 FAILED: {name} returned empty or None.")
        except Exception as e:
            print(f"🔴 EXCEPTION: Failed to call {name} - {e}")
            
if __name__ == "__main__":
    test_endpoints()
