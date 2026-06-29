import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const { format, baslik, icerik } = await req.json();
    if (!format || !baslik || !icerik) {
      return NextResponse.json({ hata: "Eksik parametreler" }, { status: 400 });
    }

    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    const res = await fetch(`${pythonUrl}/api/belge-olustur`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, baslik, icerik }),
    });

    if (!res.ok) {
      throw new Error("Python backend belge oluşturma hatası");
    }

    const data = await res.json();
    
    // Python backend URL'ini Next.js üzerinden proxy etmek için download_url'i düzenleyelim
    return NextResponse.json({
      success: true,
      download_url: `/api/belge-isle/indir?file=${data.filename}`,
      filename: data.filename
    });
  } catch (error: any) {
    console.error("Next.js Belge Oluşturma API Hatası:", error);
    return NextResponse.json({ hata: error.message || "Belge oluşturulamadı" }, { status: 500 });
  }
}
