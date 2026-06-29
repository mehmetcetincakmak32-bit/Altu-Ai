import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, ad: true, soyad: true, email: true,
      baro: true, sicilNo: true, unvan: true,
      telefon: true, adres: true, rol: true,
      uyapSifre: true, uyapEImza: true, tcNo: true,
      subdomain: true,
    },
  });

  if (!user) return NextResponse.json({ hata: "Kullanıcı bulunamadı" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const { ad, soyad, baro, sicilNo, unvan, telefon, adres, uyapSifre, uyapEImza, tcNo, subdomain } = body;

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: {
      ad:      ad      || undefined,
      soyad:   soyad   || undefined,
      baro:    baro    || undefined,
      sicilNo: sicilNo || undefined,
      unvan:   unvan   || undefined,
      telefon: telefon || undefined,
      adres:   adres   || undefined,
      uyapSifre: uyapSifre !== undefined ? uyapSifre : undefined,
      uyapEImza: uyapEImza !== undefined ? uyapEImza : undefined,
      tcNo: tcNo !== undefined ? tcNo : undefined,
      subdomain: subdomain !== undefined ? subdomain : undefined,
    },
    select: {
      id: true, ad: true, soyad: true, email: true,
      baro: true, sicilNo: true, unvan: true,
      telefon: true, adres: true,
      uyapSifre: true, uyapEImza: true, tcNo: true,
      subdomain: true,
    },
  });

  return NextResponse.json(updated);
}
