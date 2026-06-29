import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ hata: "Lütfen bir dosya yükleyin" }, { status: 400 });
    }

    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    
    // Python backend'e iletmek için yeni bir FormData oluştur
    const forwardData = new FormData();
    forwardData.append("file", file);

    const res = await fetch(`${pythonUrl}/api/belge-isle`, {
      method: "POST",
      body: forwardData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Python backend belge işleme hatası");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Next.js Belge İşleme API Hatası:", error);
    return NextResponse.json({ hata: error.message || "Dosya okuma başarısız oldu" }, { status: 500 });
  }
}
