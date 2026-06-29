import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const durusmalar = await prisma.durusma.findMany({
    where: { dava: { userId: session.id } },
    orderBy: { tarih: "asc" },
    include: { dava: { select: { ad: true, dosyaNo: true } } },
  });
  return NextResponse.json(durusmalar);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const data = await req.json();
  const dava = await prisma.dava.findFirst({ where: { id: data.davaId, userId: session.id } });
  if (!dava) return NextResponse.json({ hata: "Dava bulunamadı" }, { status: 404 });
  const durusma = await prisma.durusma.create({ data });
  return NextResponse.json(durusma, { status: 201 });
}
