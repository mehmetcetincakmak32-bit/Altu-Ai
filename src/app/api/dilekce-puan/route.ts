import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const { baslik, icerik } = await req.json();
    if (!icerik) {
      return NextResponse.json({ hata: "Eksik parametreler" }, { status: 400 });
    }

    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    const res = await fetch(`${pythonUrl}/api/dilekce-puanla`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metin: icerik }),
    });

    if (!res.ok) {
      throw new Error("Python backend dilekçe puanlama hatası");
    }

    const data = await res.json();

    // DilekecePuanlama tablosuna kaydet
    const puanlama = await prisma.dilekecePuanlama.create({
      data: {
        baslik: baslik || "Dilekçe Değerlendirmesi",
        icerik,
        puan: data.puan || 0,
        detay: JSON.stringify(data.kriterler || {}),
        oneriler: JSON.stringify({
          guclu_yonler: data.guclu_yonler || [],
          zayif_yonler: data.zayif_yonler || [],
          oneriler: data.oneriler || [],
          genel_yorum: data.genel_yorum || "",
        }),
        userId: session.id,
      },
    });

    return NextResponse.json(puanlama);
  } catch (error: any) {
    console.error("Next.js Dilekçe Puanlama API Hatası:", error);
    return NextResponse.json({ hata: error.message || "İşlem sırasında hata oluştu" }, { status: 500 });
  }
}

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const puanlamalar = await prisma.dilekecePuanlama.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(puanlamalar);
  } catch (error: any) {
    return NextResponse.json({ hata: error.message }, { status: 500 });
  }
}
