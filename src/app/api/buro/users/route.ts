import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "storage", "data");

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const p = path.join(DATA_DIR, "users.json");
  if (!fs.existsSync(p)) return NextResponse.json([]);
  
  try {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    const currentUser = data.users.find((u: any) => u.id === session.id);
    if (!currentUser) return NextResponse.json([]);
    
    // Filter office members by subdomain
    const buroUsers = data.users
      .filter((u: any) => u.subdomain === currentUser.subdomain)
      .map((u: any) => ({
        id: u.id,
        ad: u.ad,
        soyad: u.soyad,
        email: u.email,
        rol: u.rol || "avukat",
        unvan: u.unvan || ""
      }));
      
    return NextResponse.json(buroUsers);
  } catch (_e) {
    return NextResponse.json([]);
  }
}
