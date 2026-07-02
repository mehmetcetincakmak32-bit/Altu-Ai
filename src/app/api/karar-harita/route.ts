import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const { baslik, sorgu, kararlar: customKararlar } = await req.json();
    if (!baslik) {
      return NextResponse.json({ hata: "Başlık gereklidir." }, { status: 400 });
    }

    let kararlar: any[] = [];

    if (customKararlar && Array.isArray(customKararlar) && customKararlar.length > 0) {
      kararlar = customKararlar;
    } else if (sorgu) {
      // EmsalKarar tablosundan arama yapalım
      const dbKararlar = await prisma.emsalKarar.findMany({
        where: {
          OR: [
            { konu: { contains: sorgu } },
            { ozet: { contains: sorgu } },
          ]
        },
        take: 10
      });
      kararlar = dbKararlar.map((k: any) => ({
        esas: k.esasNo || "",
        karar: k.kararNo || "",
        tarih: k.tarih || "",
        mahkeme: k.mahkeme || "Yargıtay",
        konu: k.konu || "",
        ozet: k.ozet || ""
      }));
    }

    if (kararlar.length === 0) {
      // Varsayılan boş veri setini engellemek için mock veri veya veritabanından son 5 kararı çekelim
      const dbKararlar = await prisma.emsalKarar.findMany({ take: 5 });
      kararlar = dbKararlar.map((k: any) => ({
        esas: k.esasNo || "",
        karar: k.kararNo || "",
        tarih: k.tarih || "",
        mahkeme: k.mahkeme || "Yargıtay",
        konu: k.konu || "",
        ozet: k.ozet || ""
      }));
    }

    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    const res = await fetch(`${pythonUrl}/api/karar-harita`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kararlar }),
    });

    if (!res.ok) {
      throw new Error("Python backend karar haritası oluşturma hatası");
    }

    const data = await res.json();

    // Veritabanına kaydet
    const harita = await prisma.kararHarita.create({
      data: {
        baslik,
        dugumler: JSON.stringify(data.dugumler || []),
        kenarlar: JSON.stringify(data.kenarlar || []),
        userId: session.id,
      },
    });

    return NextResponse.json(harita);
  } catch (error: any) {
    console.error("Next.js Karar Haritası API Hatası:", error);
    return NextResponse.json({ hata: error.message || "İşlem sırasında hata oluştu" }, { status: 500 });
  }
}

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const haritalar = await prisma.kararHarita.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(haritalar);
  } catch (error: any) {
    return NextResponse.json({ hata: error.message }, { status: 500 });
  }
}
