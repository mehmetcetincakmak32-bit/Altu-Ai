import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRagContext, buildRagPrompt, hukukiKontrol } from "@/lib/rag";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  if (!body.mesaj || typeof body.mesaj !== "string") {
    return NextResponse.json({ hata: "Geçersiz mesaj" }, { status: 400 });
  }
  const soru = body.mesaj;

  if (!hukukiKontrol(soru)) {
    return NextResponse.json({
      cevap: "Ben bir hukuk asistanıyım ve yalnızca hukuki konularda yardımcı olabiliyorum. Lütfen Türk hukuk sistemiyle ilgili bir soru yöneltin.",
      kaynak: "ALTU",
    });
  }

  let subdomain = "";
  try {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    subdomain = user?.subdomain || "";
  } catch {}

  const ctx = await buildRagContext(session.id, soru, subdomain);
  const fullPrompt = buildRagPrompt(soru, ctx);

  const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

  try {
    const res = await fetch(`${pythonUrl}/api/ollama/sor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "apilex-hukuk",
        subdomain,
        prompt: fullPrompt,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.response) {
        return NextResponse.json({ cevap: data.response, kaynak: "ALTU AI" });
      }
    }
  } catch {}

  try {
    const fallbackRes = await fetch(`${pythonUrl}/api/ollama/sor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "apilex-hukuk",
        subdomain,
        prompt: `${soru}\n\nYanıt:`,
      }),
    });
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      if (data.response) {
        return NextResponse.json({ cevap: data.response, kaynak: "ALTU AI" });
      }
    }
  } catch {}

  return NextResponse.json(
    {
      cevap: "Şu anda AI servisine bağlanılamadı. Lütfen Python backend'in çalıştığından emin olun veya daha sonra tekrar deneyin.",
      kaynak: "ALTU",
    },
    { status: 503 }
  );
}