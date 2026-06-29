import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const m = await prisma.musteri.findFirst({ where: { id, userId: session.id }, include: { dosyalar: true } });
  if (!m) return NextResponse.json({ hata: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(m);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  await prisma.musteri.updateMany({ where: { id, userId: session.id }, data });
  return NextResponse.json({ basarili: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  await prisma.musteri.deleteMany({ where: { id, userId: session.id } });
  return NextResponse.json({ basarili: true });
}
