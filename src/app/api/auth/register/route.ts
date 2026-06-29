import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth";
import { createTenantForUser } from "@/lib/tenant";

export async function POST(req: Request) {
  try {
    const { email, sifre, ad, soyad, baro, sicilNo } = await req.json();
    
    if (!email || !sifre || !ad || !soyad) {
      return NextResponse.json(
        { hata: "Email, şifre, ad ve soyad zorunludur" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    if (existing) {
      return NextResponse.json(
        { hata: "Bu email zaten kayıtlı" },
        { status: 400 }
      );
    }

    const sifreHash = await hashPassword(sifre);

    const subdomain = await createTenantForUser("", ad, soyad);

    const user = await prisma.user.create({
      data: {
        email,
        sifre: sifreHash,
        ad,
        soyad,
        baro: baro || null,
        sicilNo: sicilNo || null,
        subdomain,
        rol: "avukat",
      },
    });

    if (user) {
      await import("@/lib/tenant").then(({ ensureTenantDir, writeTenantJson }) => {
        ensureTenantDir(subdomain);
        writeTenantJson(subdomain, "users.json", { users: [user] });
      });
    }

    const token = createToken({ id: user.id, email: user.email, rol: user.rol });
    
    const res = NextResponse.json({
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      email: user.email,
      rol: user.rol,
      subdomain,
      panelUrl: process.env.NODE_ENV === "development"
        ? `http://${subdomain}.localhost:3001`
        : `https://${subdomain}.${process.env.NEXT_PUBLIC_DOMAIN || "altuai.com"}`,
    });
    
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    
    return res;
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json(
      { hata: "Kayıt başarısız: " + (e instanceof Error ? e.message : "Bilinmeyen hata") },
      { status: 500 }
    );
  }
}