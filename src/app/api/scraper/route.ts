import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logKaydet } from "@/lib/logger";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { hedef } = await req.json();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    const res = await fetch(`${PYTHON_URL}/api/scraper/tara`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hedef: hedef || "tumu" }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    await logKaydet("Site tarandı", `${hedef || "tümü"}`, JSON.stringify(data), "bilgi", session.id);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { hata: "Tarama başlatılamadı", detay: e.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const islem = searchParams.get("islem") || "durum";
  const sorgu = searchParams.get("sorgu") || "";
  const kaynak = searchParams.get("kaynak") || "tumu";

  try {
    if (islem === "ara") {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 60000);
      const res = await fetch(`${PYTHON_URL}/api/scraper/karar-ara?sorgu=${encodeURIComponent(sorgu)}&kaynak=${kaynak}`, { signal: c.signal });
      clearTimeout(t);
      return NextResponse.json(await res.json());
    }
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 10000);
    const res = await fetch(`${PYTHON_URL}/api/scraper/durum`, { signal: c.signal });
    clearTimeout(t);
    return NextResponse.json(await res.json());
  } catch (e: any) {
    return NextResponse.json(
      { hata: "Scraper bağlantı hatası", detay: e.message },
      { status: 500 }
    );
  }
}
