import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logKaydet } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const durum = searchParams.get("durum");
  const davaId = searchParams.get("davaId");

  const where: any = { userId: session.id };
  if (durum) where.durum = durum;
  if (davaId) where.davaId = davaId;

  const isler = await prisma.is.findMany({
    where,
    orderBy: [{ tamamlandi: "asc" }, { sonTarih: "asc" }],
    include: { dava: { select: { id: true, ad: true, dosyaNo: true } } },
  });
  return NextResponse.json(isler);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const data = await req.json();
  const is = await prisma.is.create({ data: { ...data, userId: session.id } });
  await logKaydet("İş oluşturuldu", data.baslik, JSON.stringify(data), "bilgi", session.id);
  return NextResponse.json(is, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id, ...data } = await req.json();
  const is = await prisma.is.updateMany({ where: { id, userId: session.id }, data });
  return NextResponse.json({ basarili: true });
}
