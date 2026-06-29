from mcp.server.fastmcp import FastMCP
import inspect
import json

def inspect_signatures():
    mcp = FastMCP("Test")
    
    info = {
        "run_signature": str(inspect.signature(mcp.run)),
        "init_signature": str(inspect.signature(FastMCP.__init__)),
        "init_doc": FastMCP.__init__.__doc__,
        "run_doc": mcp.run.__doc__
    }
    
    output_file = "logs/signature_info.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(info, f, indent=2)
        
    print(f"Signature info written to {output_file}")

if __name__ == "__main__":
    inspect_signatures()
