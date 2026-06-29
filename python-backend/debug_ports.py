import subprocess
import sys
import re

def check_ports():
    ports = [8025, 8026, 8027, 8028, 8029]
    print("=" * 60)
    print("PORT ANALYSIS (Checking ports 8025-8029)")
    print("=" * 60)
    
    try:
        # Run netstat to find listening ports
        output = subprocess.check_output("netstat -ano", shell=True).decode('utf-8', errors='ignore')
        
        found_any = False
        for port in ports:
            pattern = re.compile(r"TCP\s+(?:\[::\]|0\.0\.0\.0|127\.0\.0\.1):" + str(port) + r"\s+.*\s+LISTENING\s+(\d+)")
            matches = pattern.findall(output)
            if matches:
                found_any = True
                for pid in matches:
                    print(f"🟢 Port {port} is being held by PID: {pid}")
                    # Try to get process name on Windows
                    try:
                        task_out = subprocess.check_output(f"tasklist /FI \"PID eq {pid}\"", shell=True).decode('utf-8', errors='ignore')
                        print(task_out.strip())
                    except Exception as te:
                        print(f"   Could not get task info: {te}")
            else:
                print(f"⚪ Port {port} is FREE.")
                
        if not found_any:
            print("\nAll target ports are free!")
            
    except Exception as e:
        print(f"Error running netstat: {e}")

if __name__ == "__main__":
    check_ports()
