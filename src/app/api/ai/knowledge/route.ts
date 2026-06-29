import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readTenantJson, writeTenantJson, ensureTenantDir } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  const subdomain = user?.subdomain;
  if (!subdomain) return NextResponse.json({ hata: "Subdomain bulunamadı" }, { status: 400 });

  const data = readTenantJson<{ knowledge: any[] }>(subdomain, "ai_knowledge.json", { knowledge: [] });
  return NextResponse.json(data.knowledge);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  const subdomain = user?.subdomain;
  if (!subdomain) return NextResponse.json({ hata: "Subdomain bulunamadı" }, { status: 400 });

  const body = await req.json();
  const { baslik, icerik, tur, kaynak, davaId } = body;

  if (!baslik || !icerik) {
    return NextResponse.json({ hata: "Başlık ve içerik zorunludur" }, { status: 400 });
  }

  ensureTenantDir(subdomain);
  const data = readTenantJson<{ knowledge: any[] }>(subdomain, "ai_knowledge.json", { knowledge: [] });

  const entry = {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    baslik,
    icerik,
    tur: tur || "genel",
    kaynak: kaynak || "manuel",
    davaId: davaId || null,
    userId: session.id,
    createdAt: new Date().toISOString(),
  };

  data.knowledge.push(entry);
  writeTenantJson(subdomain, "ai_knowledge.json", data);

  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  const subdomain = user?.subdomain;
  if (!subdomain) return NextResponse.json({ hata: "Subdomain bulunamadı" }, { status: 400 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ hata: "ID gerekli" }, { status: 400 });

  const data = readTenantJson<{ knowledge: any[] }>(subdomain, "ai_knowledge.json", { knowledge: [] });
  data.knowledge = data.knowledge.filter((k: any) => k.id !== id);
  writeTenantJson(subdomain, "ai_knowledge.json", data);

  return NextResponse.json({ basarili: true });
}