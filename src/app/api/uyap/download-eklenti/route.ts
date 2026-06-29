import { NextResponse } from "next/server";

export async function GET() {
  const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
  try {
    const res = await fetch(`${pythonUrl}/api/uyap/download-extension`);
    if (!res.ok) {
      return new NextResponse("Eklenti dosyası alınamadı", { status: 500 });
    }
    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=altu-ai-uyap-eklentisi.zip",
      },
    });
  } catch (error) {
    console.error("Extension download proxy error:", error);
    return new NextResponse("Eklenti dosyası alınamadı", { status: 500 });
  }
}
