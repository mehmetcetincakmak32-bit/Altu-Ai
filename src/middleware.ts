import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";

  // Exclude static assets, public files, and api routes
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/favicon.ico") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Parse subdomain
  const hostname = host.split(":")[0];

  // IP adresi veya localhost ise subdomain kontrolünü atla
  const isLocal = hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  if (isLocal) {
    return NextResponse.next();
  }

  const parts = hostname.split(".");
  
  let subdomain = "";
  if (parts.length > 1) {
    if (hostname.endsWith("localhost")) {
      if (parts[0] !== "localhost") {
        subdomain = parts[0];
      }
    } else {
      if (parts.length > 2) {
        subdomain = parts[0];
      }
    }
  }

  // If subdomain is present and not 'www'
  if (subdomain && subdomain.toLowerCase() !== "www") {
    try {
      const port = process.env.PORT || "10000";
      const checkUrl = `http://localhost:${port}/api/auth/check-subdomain?subdomain=${subdomain}`;
      
      const res = await fetch(checkUrl, {
        headers: {
          // Forward the cookies (especially the token)
          "Cookie": request.headers.get("cookie") || "",
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (!data.allowed) {
          // Redirect base on reason
          if (data.reason === "subdomain_mismatch" && data.correctSubdomain) {
            // Redirect to correct subdomain
            const portPart = host.includes(":") ? `:${host.split(":")[1]}` : "";
            const baseDomain = host.replace(`${subdomain}.`, "").split(":")[0];
            const newHost = `${data.correctSubdomain}.${baseDomain}${portPart}`;
            // Güvenli URL oluşturma: request.nextUrl.origin kullanıyoruz
            const targetUrl = new URL(url.pathname + url.search, request.nextUrl.origin.replace(host, newHost));
            return NextResponse.redirect(targetUrl);
          } else {
            // For other invalid subdomains, redirect to main portal login
            const portPart = host.includes(":") ? `:${host.split(":")[1]}` : "";
            const baseDomain = host.replace(`${subdomain}.`, "").split(":")[0];
            const targetUrl = new URL("/login", request.nextUrl.origin.replace(host, `${baseDomain}${portPart}`));
            
            const response = NextResponse.redirect(targetUrl);
            response.cookies.delete("token");
            return response;
          }
        }
        
        // Pass subdomain in headers to routes/pages
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-tenant-subdomain", subdomain);
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          }
        });
      }
    } catch (e) {
      console.error("Middleware check-subdomain fetch error:", e);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
