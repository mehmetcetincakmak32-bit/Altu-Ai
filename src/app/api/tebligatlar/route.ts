import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const list = await prisma.tebligat.findMany({
    where: { userId: session.id },
    orderBy: { tarih: "desc" }
  });
  return NextResponse.json(list);
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id, okundu } = await req.json();
  await prisma.tebligat.updateMany({
    where: { id, userId: session.id },
    data: { okundu }
  });
  return NextResponse.json({ basarili: true });
}
