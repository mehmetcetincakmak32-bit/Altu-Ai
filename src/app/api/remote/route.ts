import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

async function proxyToPython(path: string, req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const url = new URL(req.url);
  const params = url.searchParams.toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${PYTHON_URL}${path}${params ? `?${params}` : ""}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return NextResponse.json({ hata: "Python backend hatası" }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    clearTimeout(timeoutId);
    return NextResponse.json({ hata: "Python backend'e ulaşılamadı" }, { status: 503 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kaynak = url.searchParams.get("kaynak") || "tumu";
  const sorgu = url.searchParams.get("sorgu") || "";
  const limit = url.searchParams.get("limit") || "5";
  const no = url.searchParams.get("no") || "";

  const pathMap: Record<string, string> = {
    yargitay: `/api/remote/yargitay?sorgu=${encodeURIComponent(sorgu)}&limit=${limit}`,
    danistay: `/api/remote/danistay?sorgu=${encodeURIComponent(sorgu)}&limit=${limit}`,
    aym: `/api/remote/aym?sorgu=${encodeURIComponent(sorgu)}&limit=${limit}`,
    mevzuat: `/api/remote/mevzuat?sorgu=${encodeURIComponent(sorgu)}&limit=${limit}`,
    kanun: `/api/remote/kanun?no=${encodeURIComponent(no)}`,
    tumu: `/api/remote/tumu?sorgu=${encodeURIComponent(sorgu)}&limit=${limit}`,
    mcp: `/api/remote/mcp-sunucular`,
    istatistik: `/api/dataset/istatistik`,
    "karar-ara": `/api/dataset/karar-ara?sorgu=${encodeURIComponent(sorgu)}`,
  };

  const path = pathMap[kaynak] || pathMap.tumu;
  return proxyToPython(path, req);
}
