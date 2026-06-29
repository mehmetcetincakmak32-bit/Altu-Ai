import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, User } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "storage", "data");

function readUsers(): User[] {
  const p = path.join(DATA_DIR, "users.json");
  if (!fs.existsSync(p)) return [];
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw).users || [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  const p = path.join(DATA_DIR, "users.json");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ users }, null, 2), "utf8");
}

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const users = readUsers().map(u => {
    const { sifre, ...rest } = u;
    return rest;
  });

  return NextResponse.json(users);
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

    const users = readUsers();
    if (users.some(u => u.email === email)) {
      return NextResponse.json({ hata: "Bu email zaten kayıtlı" }, { status: 400 });
    }

    const hash = await hashPassword(sifre);
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      ad,
      soyad,
      email,
      sifre: hash,
      rol,
      baro: baro || null,
      sicilNo: sicilNo || null,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

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

    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      return NextResponse.json({ hata: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    if (email && users.some((u, i) => u.email === email && i !== idx)) {
      return NextResponse.json({ hata: "Bu email başka bir kullanıcı tarafından kullanılıyor" }, { status: 400 });
    }

    const updatedUser = { ...users[idx] };
    if (ad !== undefined) updatedUser.ad = ad;
    if (soyad !== undefined) updatedUser.soyad = soyad;
    if (email !== undefined) updatedUser.email = email;
    if (rol !== undefined) updatedUser.rol = rol;
    if (baro !== undefined) updatedUser.baro = baro;
    if (sicilNo !== undefined) updatedUser.sicilNo = sicilNo;

    if (sifre) {
      updatedUser.sifre = await hashPassword(sifre);
    }

    users[idx] = updatedUser;
    writeUsers(users);

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

    const users = readUsers();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) {
      return NextResponse.json({ hata: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    writeUsers(filtered);
    return NextResponse.json({ basarili: true });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}
