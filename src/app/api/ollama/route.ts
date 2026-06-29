import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logKaydet } from "@/lib/logger";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { islem, model, prompt, mesaj } = await req.json();

  try {
    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

    if (islem === "test") {
      const res = await fetch(`${pythonUrl}/health`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    const res = await fetch(`${pythonUrl}/api/ollama/sor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "apilex-hukuk",
        prompt: prompt || mesaj,
      }),
    });

    const data = await res.json();
    await logKaydet("AI sorgusu", prompt?.slice(0, 100), "", "bilgi", session.id);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { hata: "AI bağlantı hatası", detay: e.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    const res = await fetch(`${pythonUrl}/health`);
    const data = await res.json();
    return NextResponse.json({ durum: data.status, ollama_url: data.ollama_url });
  } catch {
    return NextResponse.json({ durum: "baglanti-kurulamadi" }, { status: 503 });
  }
}
