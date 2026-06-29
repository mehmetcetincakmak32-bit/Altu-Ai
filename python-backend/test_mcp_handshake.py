import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_handshake():
    url = "https://yargimcp.surucu.dev/mcp"
    headers = {
        "Accept": "text/event-stream",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    print("Step 1: Getting session ID...")
    try:
        r1 = requests.get(url, headers=headers, verify=False, timeout=10)
        session_id = r1.headers.get("Mcp-Session-Id")
        print(f"R1 Status: {r1.status_code}")
        print(f"R1 Mcp-Session-Id: {session_id}")
        
        if not session_id:
            print("No session ID returned in headers.")
            return
            
        print("\nStep 2: Connecting with Mcp-Session-Id header...")
        headers["Mcp-Session-Id"] = session_id
        
        r2 = requests.get(url, headers=headers, stream=True, verify=False, timeout=10)
        print(f"R2 Status: {r2.status_code}")
        print(f"R2 Headers: {dict(r2.headers)}")
        
        # Read first few lines of event stream
        print("\nReading stream:")
        count = 0
        for line in r2.iter_lines():
            if line:
                print(line.decode('utf-8'))
                count += 1
                if count > 5:
                    break
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_handshake()
