import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ hata: "Giriş yapılmamış" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, ad: true, soyad: true, email: true, baro: true, sicilNo: true, rol: true },
  });
  if (!user) {
    return NextResponse.json({ hata: "Kullanıcı bulunamadı" }, { status: 404 });
  }
  return NextResponse.json(user);
}
