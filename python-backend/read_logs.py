import json
import os
from pathlib import Path

def consolidate_logs():
    log_dir = Path(__file__).parent / "logs"
    output_file = log_dir / "all_logs.json"
    
    consolidated = {}
    
    if log_dir.exists():
        for file in log_dir.iterdir():
            if file.suffix == ".log":
                try:
                    with open(file, "r", encoding="utf-8", errors="ignore") as f:
                        consolidated[file.name] = f.read()
                except Exception as e:
                    consolidated[file.name] = f"Error reading file: {e}"
                    
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(consolidated, f, indent=2, ensure_ascii=False)
        print(f"Consolidated logs successfully written to {output_file}")
    except Exception as e:
        print(f"Error writing consolidated logs: {e}")

if __name__ == "__main__":
    consolidate_logs()
