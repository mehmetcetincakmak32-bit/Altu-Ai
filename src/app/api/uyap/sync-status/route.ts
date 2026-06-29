import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const response = await fetch(`${PYTHON_URL}/api/uyap/sync-status`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ hata: "UYAP durum servisi hatası", detay: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("UYAP sync-status API failed:", error);
    return NextResponse.json({ hata: "UYAP senkronizasyon durumu alınamadı", detay: error.message }, { status: 500 });
  }
}
