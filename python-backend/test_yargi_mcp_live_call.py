import requests
import urllib3
import json
import sys
from urllib.parse import urljoin, urlparse

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def run_live_call():
    base_url = "https://yargimcp.surucu.dev/mcp"
    headers = {
        "Accept": "text/event-stream",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    print("Step 1: Getting session ID...")
    try:
        r1 = requests.get(base_url, headers=headers, verify=False, timeout=10)
        session_id = r1.headers.get("Mcp-Session-Id")
        print(f"Session ID received: {session_id}")
        
        if not session_id:
            print("Failed to get session ID.")
            return
            
        print("\nStep 2: Connecting to EventStream...")
        headers["Mcp-Session-Id"] = session_id
        
        r_sse = requests.get(base_url, headers=headers, stream=True, verify=False, timeout=15)
        print(f"EventStream connection status: {r_sse.status_code}")
        
        endpoint_path = None
        current_event = None
        
        print("Reading stream for endpoint (with chunk_size=1)...")
        # Reading line-by-line with chunk_size=1 to prevent buffer hanging
        buffer = []
        for chunk in r_sse.iter_content(chunk_size=1):
            if not chunk:
                continue
            char = chunk.decode('utf-8', errors='ignore')
            sys.stdout.write(char)
            sys.stdout.flush()
            
            if char == '\n':
                line_str = "".join(buffer).strip()
                buffer = []
                if line_str.startswith("event:"):
                    current_event = line_str[6:].strip()
                elif line_str.startswith("data:") and current_event == "endpoint":
                    endpoint_path = line_str[5:].strip()
                    print(f"\nFound POST endpoint path: {endpoint_path}")
                    break
            else:
                buffer.append(char)
                
        if not endpoint_path:
            print("\nCould not find POST endpoint path in EventStream.")
            r_sse.close()
            return
            
        # Construct the POST URL
        parsed_base = urlparse(base_url)
        origin = f"{parsed_base.scheme}://{parsed_base.netloc}"
        post_url = urljoin(origin, endpoint_path)
        print(f"POST URL: {post_url}")
        
        # Step 3: Get tools list
        print("\nStep 3: Fetching tools list from remote MCP...")
        list_payload = {
            "jsonrpc": "2.0",
            "method": "tools/list",
            "params": {},
            "id": 1
        }
        
        post_headers = {
            "Content-Type": "application/json",
            "Mcp-Session-Id": session_id
        }
        
        r_list = requests.post(post_url, json=list_payload, headers=post_headers, verify=False, timeout=15)
        print(f"Tools list response status: {r_list.status_code}")
        list_data = r_list.json()
        
        tools = list_data.get("result", {}).get("tools", [])
        print(f"Available tools count: {len(tools)}")
        tool_names = [t.get("name") for t in tools]
        print(f"Tools: {tool_names}")
        
        # Let's find the correct Yargitay search tool name
        yargitay_tool = None
        for name in tool_names:
            if "yargitay" in name and "search" in name:
                yargitay_tool = name
                break
        
        if not yargitay_tool:
            yargitay_tool = "yargitay/search" if "yargitay/search" in tool_names else tool_names[0]
            
        print(f"\nStep 4: Calling tool '{yargitay_tool}' with query 'tazminat'...")
        
        tool_args = {"query": "tazminat"}
        selected_tool = next((t for t in tools if t.get("name") == yargitay_tool), None)
        if selected_tool:
            props = selected_tool.get("inputSchema", {}).get("properties", {})
            print(f"Tool properties: {list(props.keys())}")
            if "sorgu" in props:
                tool_args = {"sorgu": "tazminat", "limit": 2}
            elif "query" in props:
                tool_args = {"query": "tazminat", "limit": 2}
        
        call_payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": yargitay_tool,
                "arguments": tool_args
            },
            "id": 2
        }
        
        print(f"Payload: {call_payload}")
        r_call = requests.post(post_url, json=call_payload, headers=post_headers, verify=False, timeout=30)
        print(f"Tool call response status: {r_call.status_code}")
        
        call_data = r_call.json()
        result = call_data.get("result", {})
        content = result.get("content", [])
        if content:
            print("\nTool Call Result Content (First 1000 characters):")
            print(content[0].get("text", "")[:1000])
        else:
            print("No content returned.")
            print(call_data)
            
        r_sse.close()
            
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_live_call()
