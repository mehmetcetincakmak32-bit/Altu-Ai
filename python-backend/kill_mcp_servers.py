import subprocess
import sys
import os
import signal

def kill_mcp_servers():
    print("=" * 60)
    print("KILLING LINGERING MCP SERVERS")
    print("=" * 60)
    
    pids_to_kill = set()
    ports = [8025, 8026, 8027, 8028, 8029]
    
    try:
        # Get netstat output
        output = subprocess.check_output("netstat -ano", shell=True).decode('utf-8', errors='ignore')
        
        for line in output.splitlines():
            for port in ports:
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        try:
                            pids_to_kill.add(int(pid))
                        except ValueError:
                            pass
                            
        if not pids_to_kill:
            print("No active MCP server processes found on the target ports.")
            return
            
        print(f"Found PIDs to kill: {list(pids_to_kill)}")
        
        for pid in pids_to_kill:
            try:
                # On Windows, kill process using taskkill
                subprocess.check_call(f"taskkill /F /PID {pid}", shell=True)
                print(f"Successfully killed process with PID {pid}")
            except Exception as e:
                print(f"Failed to kill PID {pid}: {e}")
                
    except Exception as e:
        print(f"Error executing kill script: {e}")

if __name__ == "__main__":
    kill_mcp_servers()
