import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    const pythonFormData = new FormData();
    if (file) {
      // Convert Web File to Blob for forwarding
      pythonFormData.append("file", file);
    }
    if (text) {
      pythonFormData.append("text", text);
    }

    const response = await fetch(`${PYTHON_URL}/api/uyap/belge-oku`, {
      method: "POST",
      body: pythonFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ hata: "Ayrıştırma servisi hatası", detay: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("UYAP parsing API failed:", error);
    return NextResponse.json({ hata: "UYAP dosyası ayrıştırılamadı", detay: error.message }, { status: 500 });
  }
}
