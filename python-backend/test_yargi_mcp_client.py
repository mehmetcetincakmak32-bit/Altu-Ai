import asyncio
import sys
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    url = "https://yargimcp.surucu.dev/mcp"
    print(f"Connecting to {url}...")
    try:
        async with sse_client(url) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                
                # List tools
                tools_response = await session.list_tools()
                print("Successfully connected! Available Tools:")
                for tool in tools_response.tools:
                    print(f"- {tool.name}: {tool.description}")
                
                # Test query
                print("\nTesting yargitay_karar_ara tool...")
                result = await session.call_tool("yargitay_karar_ara", {"sorgu": "tazminat", "limit": 2})
                print("Result:")
                print(result.content)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(main())
