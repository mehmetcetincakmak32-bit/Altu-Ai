import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) return NextResponse.json({ results: [] });

  const userId = session.id;

  const [dosyalar, musteriler, belgeler] = await Promise.all([
    prisma.dava.findMany({
      where: {
        userId,
        OR: [
          { dosyaNo: { contains: q } },
          { ad: { contains: q } },
          { mahkeme: { contains: q } },
          { esasNo: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.musteri.findMany({
      where: {
        userId,
        OR: [
          { ad: { contains: q } },
          { soyad: { contains: q } },
          { tcKimlik: { contains: q } },
          { telefon: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.belge.findMany({
      where: {
        userId,
        OR: [
          { baslik: { contains: q } },
          { icerik: { contains: q } },
        ],
      },
      take: 3,
    }),
  ]);

  const results = [
    ...dosyalar.map((d) => ({
      id: d.id,
      type: "dosya" as const,
      label: `${d.dosyaNo} — ${d.ad}`,
      sub: d.musteri ? `${d.musteri.ad} ${d.musteri.soyad}` : d.durum,
      href: `/dosyalar/${d.id}`,
    })),
    ...musteriler.map((m) => ({
      id: m.id,
      type: "musteri" as const,
      label: `${m.ad} ${m.soyad}`,
      sub: m.telefon || undefined,
      href: `/musteri/${m.id}`,
    })),
    ...belgeler.map((b) => ({
      id: b.id,
      type: "belge" as const,
      label: b.baslik,
      sub: b.tur,
      href: `/belge-olustur`,
    })),
  ];

  return NextResponse.json({ results });
}
