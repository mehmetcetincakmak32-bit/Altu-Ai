import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { otonomDavaIsle } from "@/lib/autonomous";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const dava = await prisma.dava.findFirst({ where: { id, userId: session.id }, include: { musteri: true, durusmalar: true, masraflar: true, belgeler: true } });
  if (!dava) return NextResponse.json({ hata: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(dava);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  
  if (session.rol === "stajyer") {
    return NextResponse.json({ hata: "Yetkisiz işlem: Stajyer yetkisiyle dava dosyası düzenlenemez." }, { status: 403 });
  }

  const { id } = await params;
  const data = await req.json();
  await prisma.dava.updateMany({ where: { id, userId: session.id }, data });
  
  // Otonom arka plan iş akışını tetikle
  otonomDavaIsle(id, session.id).catch(console.error);
  
  return NextResponse.json({ basarili: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  if (session.rol === "stajyer") {
    return NextResponse.json({ hata: "Yetkisiz işlem: Stajyer yetkisiyle dava dosyası silinemez." }, { status: 403 });
  }

  const { id } = await params;
  await prisma.dava.deleteMany({ where: { id, userId: session.id } });
  return NextResponse.json({ basarili: true });
}
