import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const { tip, baslik, icerik } = await req.json();
    if (!tip || !baslik || !icerik) {
      return NextResponse.json({ hata: "Eksik parametreler" }, { status: 400 });
    }

    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    const res = await fetch(`${pythonUrl}/api/sozlesme-analizi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tip, metin: icerik }),
    });

    if (!res.ok) {
      throw new Error("Python backend sözleşme analiz hatası");
    }

    const data = await res.json();

    // Prisma'ya kaydet
    const analiz = await prisma.sozlesmeAnalizi.create({
      data: {
        tip,
        baslik,
        icerik,
        sonuc: JSON.stringify(data),
        riskPuani: data.riskPuani || 0,
        maddeler: JSON.stringify(data.riskli_maddeler || []),
        userId: session.id,
      },
    });

    return NextResponse.json(analiz);
  } catch (error: any) {
    console.error("Next.js Sozlesme Analiz API Hatası:", error);
    return NextResponse.json({ hata: error.message || "İşlem sırasında hata oluştu" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const analizler = await prisma.sozlesmeAnalizi.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(analizler);
  } catch (error: any) {
    return NextResponse.json({ hata: error.message }, { status: 500 });
  }
}
