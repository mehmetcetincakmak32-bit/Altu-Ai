import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const where = session.rol === "admin" ? {} : { userId: session.id };
  const loglar = await prisma.log.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(loglar);
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  if (session.rol === "admin") {
    await prisma.log.deleteMany();
  } else {
    await prisma.log.deleteMany({ where: { userId: session.id } });
  }
  return NextResponse.json({ basarili: true });
}
