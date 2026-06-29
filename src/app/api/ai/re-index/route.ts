import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
  const key = process.env.REINDEX_SECRET || "altu-reindex-key";

  try {
    const res = await fetch(`${pythonUrl}/api/ai/re-index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reindex-Key": key,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json(
      { hata: "Python backend re-index hatası" },
      { status: 500 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { hata: "Re-index başarısız", detay: e.message },
      { status: 500 }
    );
  }
}