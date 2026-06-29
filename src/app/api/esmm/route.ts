import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logKaydet } from "@/lib/logger";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const esmmList = await prisma.eSMM.findMany({
    where: { userId: session.id },
    orderBy: { tarih: "desc" },
    include: { dava: { select: { ad: true, dosyaNo: true } } },
  });
  return NextResponse.json(esmmList);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const data = await req.json();
  const kdvOran = data.kdvOrani || 20;
  const tutar = data.birimFiyat * (data.miktar || 1);
  const kdvTutar = tutar * (kdvOran / 100);
  const netTutar = tutar + kdvTutar;

  const son = await prisma.eSMM.findFirst({
    where: { userId: session.id },
    orderBy: { seriNo: "desc" },
    select: { seriNo: true },
  });
  const sira = son ? parseInt(son.seriNo.split("-").pop() || "0") + 1 : 1;
  const seriNo = `SMM-${session.id.slice(0, 4).toUpperCase()}-${String(sira).padStart(4, "0")}`;

  const esmm = await prisma.eSMM.create({
    data: {
      ...data,
      seriNo,
      tutar,
      kdvOrani: kdvOran,
      kdvTutari: kdvTutar,
      netTutar,
      userId: session.id,
    },
  });

  await logKaydet("e-SMM oluşturuldu", seriNo, `Tutar: ${netTutar} TL`, "basari", session.id);
  return NextResponse.json(esmm, { status: 201 });
}
