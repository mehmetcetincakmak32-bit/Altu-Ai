import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logKaydet } from "@/lib/logger";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("dosya") as File;
  let davaId = formData.get("davaId") as string;
  const etiketler = formData.get("etiketler") as string;

  if (!file) return NextResponse.json({ hata: "Dosya gerekli" }, { status: 400 });

  let buffer = Buffer.from(await file.arrayBuffer());
  let ext = file.name.split(".").pop()?.toLowerCase() || "bilinmiyor";
  let orijinalAd = file.name;
  let kayitliAd = `${Date.now()}_${file.name}`;
  let finalSize = file.size;

  const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

  let imzaDurumu = "imzasiz";
  let imzalayan = "";
  let imzaTarihi = "";

  // Her durumda dosyayı python-backend'e göndererek otonom özellikleri ve e-imza doğrulamayı çalıştır
  try {
    const davas = await prisma.dava.findMany({ where: { userId: session.id } });
    
    const backendForm = new FormData();
    const blob = new Blob([buffer], { type: file.type });
    backendForm.append("file", blob, file.name);
    backendForm.append("davas_json", JSON.stringify(davas));

    const backendRes = await fetch(`${pythonUrl}/api/evrak/isle`, {
      method: "POST",
      body: backendForm
    });

    if (backendRes.ok) {
      const matchedDava = backendRes.headers.get("x-matched-dava-id");
      // Kullanıcı davaId vermediyse otonom eşleşen davaId'yi kullan
      if (!davaId && matchedDava) {
        davaId = matchedDava;
      }

      imzaDurumu = backendRes.headers.get("x-imza-durumu") || "imzasiz";
      const rawImzalayan = backendRes.headers.get("x-imzalayan") || "";
      // Latin-1 formatındaki header'ı tekrar UTF-8 olarak çöz
      imzalayan = Buffer.from(rawImzalayan, "binary").toString("utf-8");
      imzaTarihi = backendRes.headers.get("x-imza-tarihi") || "";

      const arrayBuffer = await backendRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      const gorselUzantilari = ["jpg", "jpeg", "png"];
      if (gorselUzantilari.includes(ext)) {
        ext = "pdf";
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        orijinalAd = `${baseName}.pdf`;
        kayitliAd = `${Date.now()}_${orijinalAd}`;
      }
      finalSize = buffer.length;
    }
  } catch (err) {
    console.error("[Dosya Eşleme & İmza Doğrulama] Hata:", err);
  }

  const uploadDir = "public/uploads";
  const fs = require("fs");
  const path = require("path");
  const zlib = require("zlib");

  const gorselUzantilari = ["jpg", "jpeg", "png"];

  if (!fs.existsSync(path.join(process.cwd(), uploadDir))) {
    fs.mkdirSync(path.join(process.cwd(), uploadDir), { recursive: true });
  }

  // PDF, Metin ve UDF dosyalarını sunucuda gzip/deflate ile sıkıştırarak kaydet
  if (ext === "pdf" || ext === "txt" || ext === "doc" || ext === "docx" || ext === "udf") {
    buffer = zlib.gzipSync(buffer);
    kayitliAd = `${kayitliAd}.gz`;
    finalSize = buffer.length;
  } 
  // Görseller için temel veri optimizasyonu
  else if (gorselUzantilari.includes(ext)) {
    buffer = zlib.deflateSync(buffer);
    kayitliAd = `${kayitliAd}.compressed`;
    finalSize = buffer.length;
  }

  fs.writeFileSync(path.join(process.cwd(), uploadDir, kayitliAd), buffer);

  // İmza bilgilerini etiketler alanında JSON string olarak sakla
  let savedEtiketler = etiketler || "";
  if (imzaDurumu && imzaDurumu !== "imzasiz") {
    try {
      const meta = {
        userTags: etiketler || "",
        imzaDurumu,
        imzalayan,
        imzaTarihi
      };
      savedEtiketler = JSON.stringify(meta);
    } catch(e) {}
  }

  const dosya = await prisma.dosyaDosyasi.create({
    data: {
      orijinalAd,
      kayitliAd,
      tur: ext,
      boyut: finalSize,
      etiketler: savedEtiketler,
      davaId: davaId || null,
      userId: session.id,
    },
  });

  // Eşleşen dava adını logda göster
  let logMesaji = `Orijinal Boyut: ${file.size} -> Sıkıştırılmış Boyut: ${finalSize}`;
  if (davaId) {
    const eslesenDava = await prisma.dava.findFirst({ where: { id: davaId, userId: session.id } });
    if (eslesenDava) {
      logMesaji += ` (Eşleşen Dava: ${eslesenDava.dosyaNo} - ${eslesenDava.ad})`;
    }
  }

  await logKaydet("Dosya sıkıştırılarak yüklendi", orijinalAd, logMesaji, "bilgi", session.id);
  return NextResponse.json(dosya, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const davaId = searchParams.get("davaId");
  const ara = searchParams.get("ara");

  const where: any = { userId: session.id };
  if (davaId) where.davaId = davaId;
  if (ara) where.orijinalAd = { contains: ara };

  const dosyalar = await prisma.dosyaDosyasi.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { dava: { select: { ad: true, dosyaNo: true } } },
  });
  return NextResponse.json(dosyalar);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { id } = await req.json();
  const dosya = await prisma.dosyaDosyasi.findFirst({ where: { id, userId: session.id } });
  if (!dosya) return NextResponse.json({ hata: "Bulunamadı" }, { status: 404 });

  const fs = require("fs");
  const path = require("path");
  const dosyaYolu = path.join(process.cwd(), "public/uploads", dosya.kayitliAd);
  if (fs.existsSync(dosyaYolu)) fs.unlinkSync(dosyaYolu);

  await prisma.dosyaDosyasi.delete({ where: { id } });
  await logKaydet("Dosya silindi", dosya.orijinalAd, "", "uyari", session.id);
  return NextResponse.json({ basarili: true });
}
