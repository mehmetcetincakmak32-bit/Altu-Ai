import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Yetkisiz", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("file");
    if (!filename) {
      return new Response("Dosya adı eksik", { status: 400 });
    }

    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    const res = await fetch(`${pythonUrl}/api/belge/indir/${filename}`);

    if (!res.ok) {
      return new Response("Dosya bulunamadı", { status: 404 });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const fileBuffer = await res.arrayBuffer();

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Next.js Belge İndirme Hatası:", error);
    return new Response("İndirme sırasında bir hata oluştu", { status: 500 });
  }
}
