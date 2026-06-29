import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { otonomDavaIsle } from "@/lib/autonomous";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kategori = searchParams.get("kategori") || undefined;

  const dosyalar = await prisma.dava.findMany({
    where: { userId: session.id, kategori },
    orderBy: { createdAt: "desc" },
    include: { musteri: { select: { id: true, ad: true, soyad: true } }, durusmalar: { take: 1, orderBy: { tarih: "desc" } } },
  });
  return NextResponse.json(dosyalar);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  if (session.rol === "stajyer") {
    return NextResponse.json({ hata: "Yetkisiz işlem: Stajyer yetkisiyle yeni dava dosyası oluşturulamaz." }, { status: 403 });
  }

  const data = await req.json();
  const dava = await prisma.dava.create({
    data: { ...data, userId: session.id },
  });
  
  // Otonom arka plan iş akışını tetikle
  otonomDavaIsle(dava.id, session.id).catch(console.error);
  
  return NextResponse.json(dava, { status: 201 });
}
