import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logKaydet } from "@/lib/logger";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const faturalar = await prisma.fatura.findMany({
    where: { userId: session.id },
    orderBy: { tarih: "desc" },
    include: { dava: { select: { ad: true, dosyaNo: true } } },
  });
  return NextResponse.json(faturalar);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const data = await req.json();
  const kdvOran = data.kdvOrani || 20;
  const araToplam = data.araToplam || 0;
  const kdvTutar = araToplam * (kdvOran / 100);
  const genelToplam = araToplam + kdvTutar;

  const son = await prisma.fatura.findFirst({
    where: { userId: session.id },
    orderBy: { faturaNo: "desc" },
    select: { faturaNo: true },
  });
  const sira = son ? parseInt(son.faturaNo.split("-").pop() || "0") + 1 : 1;
  const faturaNo = `FTR-${new Date().getFullYear()}-${String(sira).padStart(4, "0")}`;

  const fatura = await prisma.fatura.create({
    data: {
      ...data,
      faturaNo,
      kdvOrani: kdvOran,
      kdvTutari: kdvTutar,
      genelToplam,
      userId: session.id,
    },
  });

  await logKaydet("Fatura oluşturuldu", faturaNo, `Tutar: ${genelToplam} TL`, "basari", session.id);
  return NextResponse.json(fatura, { status: 201 });
}
