import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const { metin, kaynakDil, hedefDil } = await req.json();
    if (!metin || !kaynakDil || !hedefDil) {
      return NextResponse.json({ hata: "Eksik parametreler" }, { status: 400 });
    }

    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    const res = await fetch(`${pythonUrl}/api/hukuki-ceviri`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metin, kaynak_dil: kaynakDil, hedef_dil: hedefDil }),
    });

    if (!res.ok) {
      throw new Error("Python backend hukuki çeviri hatası");
    }

    const data = await res.json();

    // HukukiCeviri tablosuna kaydet
    const ceviri = await prisma.hukukiCeviri.create({
      data: {
        kaynakDil,
        hedefDil,
        asil: metin,
        ceviri: data.ceviri || "",
        userId: session.id,
      },
    });

    return NextResponse.json(ceviri);
  } catch (error: any) {
    console.error("Next.js Çeviri API Hatası:", error);
    return NextResponse.json({ hata: error.message || "İşlem sırasında hata oluştu" }, { status: 500 });
  }
}

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const ceviriler = await prisma.hukukiCeviri.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(ceviriler);
  } catch (error: any) {
    return NextResponse.json({ hata: error.message }, { status: 500 });
  }
}
