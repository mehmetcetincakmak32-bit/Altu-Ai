import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const masraflar = await prisma.masraf.findMany({
    where: { userId: session.id },
    orderBy: { tarih: "desc" },
    include: { dava: { select: { ad: true } } },
  });
  return NextResponse.json(masraflar);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const data = await req.json();
  const m = await prisma.masraf.create({ data: { ...data, userId: session.id } });
  return NextResponse.json(m, { status: 201 });
}
