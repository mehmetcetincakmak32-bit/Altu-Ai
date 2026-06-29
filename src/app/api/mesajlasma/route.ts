import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { smsGonder, emailGonder, whatsappGonder } from "@/lib/messaging";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const { tur, konu, icerik, alicilar } = await req.json();
    if (!tur || !konu || !icerik || !alicilar || !Array.isArray(alicilar)) {
      return NextResponse.json({ hata: "Eksik parametreler" }, { status: 400 });
    }

    const ayarlar = await prisma.mesajlasmaAyarlari.findUnique({ where: { userId: session.id } });

    const mesaj = await prisma.bulkMesaj.create({
      data: {
        tur, konu, icerik,
        alicilar: JSON.stringify(alicilar),
        durum: "gonderiliyor",
        gonderilenSayi: 0,
        userId: session.id,
      },
    });

    let sonuc: { basarili: boolean; hata?: string; gonderilenSayi: number };

    if (tur === "sms") {
      sonuc = await smsGonder(alicilar, icerik, {
        apiKey: ayarlar?.smsApiKey,
        apiSifre: ayarlar?.smsApiSifre,
        baslik: ayarlar?.smsBaslik || "ALTU AI",
      });
    } else if (tur === "email") {
      sonuc = await emailGonder(alicilar, konu, icerik, {
        host: ayarlar?.smtpHost,
        port: ayarlar?.smtpPort,
        kullanici: ayarlar?.smtpKullanici,
        sifre: ayarlar?.smtpSifre,
        guvenlik: ayarlar?.smtpGuvenlik,
      });
    } else if (tur === "whatsapp") {
      sonuc = await whatsappGonder(alicilar, icerik, {
        apiKey: ayarlar?.whatsappApiKey,
        telNo: ayarlar?.whatsappTelNo,
      });
    } else {
      sonuc = { basarili: false, hata: "Bilinmeyen kanal", gonderilenSayi: 0 };
    }

    await prisma.bulkMesaj.update({
      where: { id: mesaj.id },
      data: {
        durum: sonuc.basarili ? "gonderildi" : "hata",
        gonderilenSayi: sonuc.gonderilenSayi,
        hataMesaj: sonuc.hata,
      },
    });

    return NextResponse.json({
      success: sonuc.basarili,
      mesajId: mesaj.id,
      durum: sonuc.basarili ? "gonderildi" : "hata",
      hata: sonuc.hata,
      mesaj: sonuc.basarili
        ? `Mesaj ${sonuc.gonderilenSayi} kişiye gönderildi.`
        : `Gönderim başarısız: ${sonuc.hata}`,
    });
  } catch (error: any) {
    console.error("Mesajlaşma API Hatası:", error);
    return NextResponse.json({ hata: error.message || "İşlem sırasında hata oluştu" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const geçmiş = await prisma.bulkMesaj.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(geçmiş);
  } catch (error: any) {
    return NextResponse.json({ hata: error.message }, { status: 500 });
  }
}
