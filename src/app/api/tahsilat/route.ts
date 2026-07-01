import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logKaydet } from "@/lib/logger";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const list = await prisma.tahsilat.findMany({
    where: { userId: session.id },
    orderBy: { vadeTarihi: "asc" }
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const data = await req.json();
  const tahsilat = await prisma.tahsilat.create({
    data: {
      ...data,
      userId: session.id,
      durum: data.durum || "bekliyor"
    }
  });

  await logKaydet("Yeni tahsilat planı eklendi", data.musteriUnvan, `Tutar: ${data.tutar} TL`, "basari", session.id);
  return NextResponse.json(tahsilat, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { id, durum, odemeTarihi } = await req.json();
  
  // Find current collection to check details
  const list = await prisma.tahsilat.findMany({ where: { userId: session.id } });
  const item = list.find(x => x.id === id);
  if (!item) return NextResponse.json({ hata: "Kayıt bulunamadı" }, { status: 404 });

  await prisma.tahsilat.updateMany({
    where: { id, userId: session.id },
    data: {
      durum,
      odemeTarihi: odemeTarihi || (durum === "odendi" ? new Date().toISOString().split("T")[0] : null)
    }
  });

  await logKaydet("Tahsilat güncellendi", id, `Yeni durum: ${durum}`, "basari", session.id);

  return NextResponse.json({ basarili: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { id } = await req.json();
  await prisma.tahsilat.deleteMany({
    where: { id, userId: session.id }
  });
  return NextResponse.json({ basarili: true });
}
