import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const userId = session.id;
  const [davaSayisi, aktifDavaSayisi, musteriSayisi, durusmaSayisi, masrafToplam, bekleyenIs] = await Promise.all([
    prisma.dava.count({ where: { userId } }),
    prisma.dava.count({ where: { userId, durum: "devam-ediyor" } }),
    prisma.musteri.count({ where: { userId } }),
    prisma.durusma.count({ where: { dava: { userId } } }),
    prisma.masraf.aggregate({ where: { userId }, _sum: { tutar: true } }),
    prisma.is.count({ where: { userId, tamamlandi: false } }),
  ]);

  const sonDosyalar = await prisma.dava.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { musteri: { select: { ad: true, soyad: true } } },
  });

  const sonDurusmalar = await prisma.durusma.findMany({
    where: { dava: { userId } },
    orderBy: { tarih: "asc" },
    take: 5,
    include: { dava: { select: { ad: true } } },
  });

  const aylikMasraflar = await prisma.masraf.groupBy({
    by: ["kategori"],
    where: { userId },
    _sum: { tutar: true },
  });

  // Yaklaşan duruşmalar (7 gün içinde) for notifications
  const simdi = new Date();
  const yediGunSonra = new Date(simdi.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yaklasanDurusmalar = await prisma.durusma.findMany({
    where: {
      dava: { userId },
      tarih: { gte: simdi, lte: yediGunSonra },
    },
    orderBy: { tarih: "asc" },
    take: 10,
    include: { dava: { select: { ad: true } } },
  });

  // Aylık e-SMM gelirleri
  const esmmList = await prisma.eSMM.findMany({
    where: { userId },
    orderBy: { tarih: "asc" },
    select: { tarih: true, netTutar: true },
  });

  // Zamanaşımı Radarı & Süre Takip Sistemi
  const allDavas = await prisma.dava.findMany({ where: { userId } });
  const sureRadari = allDavas
    .filter((d: any) => d.zamanasimiTarihi || d.temyizSonTarihi)
    .map((d: any) => {
      const dates = [];
      const simdiMs = new Date().setHours(0, 0, 0, 0);
      if (d.zamanasimiTarihi) {
        const targetMs = new Date(d.zamanasimiTarihi).setHours(0, 0, 0, 0);
        dates.push({
          tur: "Zamanaşımı",
          tarih: d.zamanasimiTarihi,
          kalanGun: Math.ceil((targetMs - simdiMs) / (1000 * 60 * 60 * 24)),
        });
      }
      if (d.temyizSonTarihi) {
        const targetMs = new Date(d.temyizSonTarihi).setHours(0, 0, 0, 0);
        dates.push({
          tur: "Temyiz / İtiraz",
          tarih: d.temyizSonTarihi,
          kalanGun: Math.ceil((targetMs - simdiMs) / (1000 * 60 * 60 * 24)),
        });
      }
      dates.sort((a, b) => a.kalanGun - b.kalanGun);
      
      return {
        id: d.id,
        dosyaNo: d.dosyaNo,
        ad: d.ad,
        kategori: d.kategori || "diger",
        yakinSure: dates[0] || null,
        sureTakipNotu: d.sureTakipNotu || ""
      };
    })
    .filter((x: any) => x.yakinSure !== null)
    .sort((a: any, b: any) => a.yakinSure.kalanGun - b.yakinSure.kalanGun);

  return NextResponse.json({
    davaSayisi,
    aktifDavaSayisi,
    musteriSayisi,
    durusmaSayisi,
    masrafToplam: masrafToplam._sum.tutar || 0,
    bekleyenIs,
    sonDosyalar,
    sonDurusmalar,
    aylikMasraflar,
    yaklasanDurusmalar,
    esmmList,
    sureRadari,
  });
}
