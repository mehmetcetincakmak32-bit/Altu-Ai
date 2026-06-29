from mcp.server.fastmcp import FastMCP
import inspect

mcp = FastMCP("Test")

# Let's inspect the Starlette app created by FastMCP
app = mcp.settings # or does it have an app property?
print("FastMCP attributes:")
for name, attr in inspect.getmembers(mcp):
    if not name.startswith("_"):
        print(f"  {name}: {type(attr)}")

# Try to get the ASGI app
try:
    asgi_app = mcp.asgi_app
    print(f"\nasgi_app: {asgi_app}")
    # Let's inspect routes if it's a Starlette app
    if hasattr(asgi_app, "routes"):
        print("\nRoutes:")
        for route in asgi_app.routes:
            print(f"  Path: {route.path}, Name: {route.name}, Methods: {getattr(route, 'methods', None)}")
except Exception as e:
    print(f"Could not get asgi_app: {e}")
