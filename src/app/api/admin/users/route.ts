import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const users = await prisma.user.findMany({ where: {} });
  return NextResponse.json(users.map((u: any) => {
    const { sifre: _sifre, ...rest } = u;
    return rest;
  }));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ad, soyad, email, sifre, rol, baro, sicilNo } = body;

    if (!ad || !soyad || !email || !sifre || !rol) {
      return NextResponse.json({ hata: "Zorunlu alanlar eksik" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ hata: "Bu email zaten kayıtlı" }, { status: 400 });
    }

    const hash = await hashPassword(sifre);
    const newUser = await prisma.user.create({
      data: { ad, soyad, email, sifre: hash, rol, baro: baro || null, sicilNo: sicilNo || null },
    });

    const { sifre: _, ...responseUser } = newUser;
    return NextResponse.json(responseUser, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ad, soyad, email, rol, baro, sicilNo, sifre } = body;

    if (!id) {
      return NextResponse.json({ hata: "Kullanıcı ID'si eksik" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ hata: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    if (email && email !== user.email) {
      const dup = await prisma.user.findUnique({ where: { email } });
      if (dup) {
        return NextResponse.json({ hata: "Bu email başka bir kullanıcı tarafından kullanılıyor" }, { status: 400 });
      }
    }

    const data: any = {};
    if (ad !== undefined) data.ad = ad;
    if (soyad !== undefined) data.soyad = soyad;
    if (email !== undefined) data.email = email;
    if (rol !== undefined) data.rol = rol;
    if (baro !== undefined) data.baro = baro;
    if (sicilNo !== undefined) data.sicilNo = sicilNo;
    if (sifre) data.sifre = await hashPassword(sifre);

    const updatedUser = await prisma.user.update({ where: { id }, data });
    const { sifre: _, ...responseUser } = updatedUser;
    return NextResponse.json(responseUser);
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ hata: "Kullanıcı ID'si eksik" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ hata: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    await prisma.user.deleteMany({ where: { id } });
    return NextResponse.json({ basarili: true });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}
