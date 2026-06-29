import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, EmsalKarar } from "@/lib/prisma";
import { logKaydet } from "@/lib/logger";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  
  const { id } = await params;
  const dava = await prisma.dava.findFirst({
    where: { id, userId: session.id }
  });
  
  if (!dava) return NextResponse.json({ hata: "Dosya bulunamadı" }, { status: 404 });
  
  // Return cached decisions if they exist
  if (dava.emsalKararlar && dava.emsalKararlar.length > 0) {
    return NextResponse.json({
      emsalKararlar: dava.emsalKararlar,
      kaynak: "Veritabanı Önbelleği"
    });
  }
  
  return triggerScraping(id, dava, session.id);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  
  const { id } = await params;
  const dava = await prisma.dava.findFirst({
    where: { id, userId: session.id }
  });
  
  if (!dava) return NextResponse.json({ hata: "Dosya bulunamadı" }, { status: 404 });
  
  return triggerScraping(id, dava, session.id);
}

async function triggerScraping(davaId: string, dava: any, userId: string) {
  // Query based on case konu, fallback to name or generic term
  const query = dava.konu || dava.ad.split("-")[1]?.trim() || dava.ad || "kira sözleşmesi";
  
  try {
    const response = await fetch(`${PYTHON_URL}/api/remote/tumu?sorgu=${encodeURIComponent(query)}&limit=5`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    
    if (!response.ok) {
      return NextResponse.json({ hata: "Python backend'den kararlar çekilemedi" }, { status: 502 });
    }
    
    const data = await response.json();
    const parsedDecisions: EmsalKarar[] = [];
    
    if (data.sonuclar) {
      // Yargıtay
      if (Array.isArray(data.sonuclar.yargitay)) {
        data.sonuclar.yargitay.forEach((k: any) => {
          parsedDecisions.push({
            id: "yrg_" + Math.random().toString(36).substring(2, 9),
            mahkeme: k.mahkeme || "Yargıtay Hukuk Dairesi",
            esasNo: k.esas || k.esasNo || "-",
            kararNo: k.karar || k.kararNo || "-",
            tarih: k.tarih || "-",
            konu: k.konu || query,
            ozet: k.ozet || "",
            kaynak: "Yargıtay"
          });
        });
      }
      
      // Danıştay
      if (Array.isArray(data.sonuclar.danistay)) {
        data.sonuclar.danistay.forEach((k: any) => {
          parsedDecisions.push({
            id: "dan_" + Math.random().toString(36).substring(2, 9),
            mahkeme: k.mahkeme || "Danıştay Dairesi",
            esasNo: k.esas || k.esasNo || "-",
            kararNo: k.karar || k.kararNo || "-",
            tarih: k.tarih || "-",
            konu: k.konu || query,
            ozet: k.ozet || "",
            kaynak: "Danıştay"
          });
        });
      }
      
      // AYM (Anayasa Mahkemesi)
      if (Array.isArray(data.sonuclar.aym)) {
        data.sonuclar.aym.forEach((k: any) => {
          parsedDecisions.push({
            id: "aym_" + Math.random().toString(36).substring(2, 9),
            mahkeme: "Anayasa Mahkemesi",
            esasNo: k.basvuruNo || "-",
            kararNo: k.karar || "-",
            tarih: k.tarih || "-",
            konu: k.konu || query,
            ozet: k.sonuc || "",
            kaynak: "Anayasa Mahkemesi"
          });
        });
      }
      
      // Mevzuat
      if (Array.isArray(data.sonuclar.mevzuat)) {
        data.sonuclar.mevzuat.forEach((k: any) => {
          parsedDecisions.push({
            id: "mev_" + Math.random().toString(36).substring(2, 9),
            mahkeme: k.tur || "Mevzuat",
            esasNo: k.sayi || "-",
            kararNo: "-",
            tarih: k.tarih || "-",
            konu: k.baslik || query,
            ozet: k.madde || "",
            kaynak: "Kanun/Mevzuat"
          });
        });
      }
    }
    
    // Save to the flat-file database
    await prisma.dava.updateMany({
      where: { id: davaId, userId: userId },
      data: { emsalKararlar: parsedDecisions }
    });
    
    await logKaydet("Emsal karar tarandı", `${parsedDecisions.length} karar`, `Dava No: ${dava.dosyaNo}`, "bilgi", userId);
    
    return NextResponse.json({
      emsalKararlar: parsedDecisions,
      kaynak: data.kaynak || "Canlı Tarama"
    });
  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ hata: "Canlı tarama sırasında bir hata oluştu" }, { status: 500 });
  }
}
