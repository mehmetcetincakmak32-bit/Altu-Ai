import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const musteri = await prisma.musteri.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(musteri);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const data = await req.json();
  const m = await prisma.musteri.create({ data: { ...data, userId: session.id } });
  return NextResponse.json(m, { status: 201 });
}
