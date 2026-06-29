import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const ayarlar = await prisma.uetsAyarlari.findUnique({
    where: { userId: session.id },
  });

  const tebligatlar = await prisma.tebligat.findMany({
    where: { userId: session.id },
    orderBy: { gonderimTarihi: "desc" },
    take: 100,
  });

  return NextResponse.json({ ayarlar: !!ayarlar, tebligatlar, adet: tebligatlar.length });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "setup") {
    const { kurumKodu, kurumSifre, kullaniciAdi, sifre, testModu } = body;
    const mevcut = await prisma.uetsAyarlari.findUnique({ where: { userId: session.id } });
    if (mevcut) {
      await prisma.uetsAyarlari.update({
        where: { userId: session.id },
        data: { kurumKodu, kurumSifre, kullaniciAdi, sifre, testModu: testModu ?? true, aktif: true },
      });
    } else {
      await prisma.uetsAyarlari.create({
        data: { kurumKodu, kurumSifre, kullaniciAdi, sifre, testModu: testModu ?? true, aktif: true, userId: session.id },
      });
    }

    try {
      const res = await fetch(`${PYTHON_URL}/api/uets/kurulum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kurumKodu, kurumSifre, kullaniciAdi, sifre, testModu: testModu ?? true }),
      });
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ success: true, mesaj: "Ayarlar kaydedildi (Python backend baglanamadi)" });
    }
  }

  if (action === "check") {
    try {
      const res = await fetch(`${PYTHON_URL}/api/uets/kontrol?user_id=${session.id}`);
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ durum: "hata", mesaj: "Python backend baglanamadi" });
    }
  }

  if (action === "mark-read") {
    const { id } = body;
    await prisma.tebligat.updateMany({
      where: { id, userId: session.id },
      data: { durum: "okundu", okunduTarihi: new Date() },
    });
    return NextResponse.json({ basarili: true });
  }

  return NextResponse.json({ hata: "Bilinmeyen action" }, { status: 400 });
}
