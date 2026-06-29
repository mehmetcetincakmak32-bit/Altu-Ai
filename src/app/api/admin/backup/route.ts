import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const dbPath = path.join(process.cwd(), "prisma/dev.db");
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ hata: "Veritabanı dosyası bulunamadı" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=altu-ai-backup-${Date.now()}.db`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ hata: "Yedek alınamadı" }, { status: 500 });
  }
}
