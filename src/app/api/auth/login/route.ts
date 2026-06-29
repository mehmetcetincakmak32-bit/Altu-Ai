import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, sifre, rememberMe } = await req.json();

    if (!email || !sifre) {
      return NextResponse.json(
        { hata: "Email ve şifre gereklidir" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { hata: "Email veya şifre hatalı" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await verifyPassword(sifre, user.sifre);
    
    if (!valid) {
      return NextResponse.json(
        { hata: "Email veya şifre hatalı" },
        { status: 401 }
      );
    }

    // Create token
    const token = createToken({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    // Response with token
    const res = NextResponse.json({
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      email: user.email,
      rol: user.rol,
      token: token,
    });

    // 30 days if rememberMe, otherwise 1 day
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: cookieMaxAge,
    });

    return res;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json(
      { hata: "Giriş başarısız: " + (e instanceof Error ? e.message : "Bilinmeyen hata") },
      { status: 500 }
    );
  }
}
