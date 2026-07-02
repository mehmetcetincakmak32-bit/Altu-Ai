import { NextResponse } from "next/server";
import { getSession, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logKaydet } from "@/lib/logger";
import { otonomDavaIsle } from "@/lib/autonomous";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
  });

  if (!user || (!user.uyapSifre && !user.uyapEImza)) {
    return NextResponse.json({ hata: "UYAP giriş bilgileri ayarlanmamış. Lütfen ayarlardan e-imza veya UYAP şifrenizi tanımlayın." }, { status: 400 });
  }

  return NextResponse.json({
    hata: "Güvenlik önlemleri ve e-imza mimarisi gereği doğrudan sunucu üzerinden canlı UYAP eşitlemesi yapılamaz. Lütfen dosyalarınızı UYAP portalından aktarmak için altu Ai Chrome Eklentisini kullanın."
  }, { status: 400 });
}

export async function POST(req: Request) {
  let session = await getSession();
  if (!session) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        session = verifyToken(token);
      } catch (_err) {}
    }
  }
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { data } = await req.json();

  if (!data || !data.dosyalar) {
    return NextResponse.json({ hata: "Geçersiz UYAP verisi" }, { status: 400 });
  }

  let aktarilan = 0;
  for (const d of data.dosyalar) {
    const musteri = await prisma.musteri.findFirst({
      where: { userId: session.id, tcKimlik: d.tcKimlik || undefined },
    });

    const dava = await prisma.dava.upsert({
      where: { dosyaNo: d.dosyaNo },
      update: {
        ad: d.ad, konu: d.konu, mahkeme: d.mahkeme,
        esasNo: d.esasNo, durum: d.durum || "devam-ediyor",
      },
      create: {
        dosyaNo: d.dosyaNo, ad: d.ad, konu: d.konu,
        mahkeme: d.mahkeme, esasNo: d.esasNo,
        musteriId: musteri?.id || null,
        durum: d.durum || "devam-ediyor",
        userId: session.id,
      },
    });
    aktarilan++;

    if (d.durusmalar) {
      for (const dur of d.durusmalar) {
        await prisma.durusma.create({
          data: {
            baslik: dur.baslik || "Duruşma",
            tarih: new Date(dur.tarih).toISOString(),
            aciklama: dur.aciklama,
            davaId: dava.id,
          },
        });
      }
    }

    if (d.tebligatlar) {
      for (const teb of d.tebligatlar) {
        await prisma.tebligat.create({
          data: {
            baslik: teb.baslik || "UYAP Tebligatı",
            icerik: teb.icerik || "",
            tarih: teb.tarih ? new Date(teb.tarih).toISOString() : new Date().toISOString(),
            okundu: false,
            davaId: dava.id,
            userId: session.id,
          },
        });
      }
    }

    if (d.hareketler) {
      for (const har of d.hareketler) {
        await prisma.davaHareketi.create({
          data: {
            islem: har.islem || "İşlem Yapıldı",
            tarih: har.tarih ? new Date(har.tarih).toISOString() : new Date().toISOString(),
            evrak: har.evrak || null,
            davaId: dava.id,
            userId: session.id,
          },
        });
      }
    }

    // Otonom arka plan iş akışını tetikle
    otonomDavaIsle(dava.id, session.id).catch(console.error);
  }

  await logKaydet("UYAP verisi aktarıldı", `${aktarilan} dosya`, JSON.stringify(data), "basari", session.id);
  return NextResponse.json({ basarili: true, aktarilan });
}
