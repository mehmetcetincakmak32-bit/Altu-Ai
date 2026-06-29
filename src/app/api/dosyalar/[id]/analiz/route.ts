import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  if (dava.aiAnaliz) {
    return NextResponse.json({ analiz: dava.aiAnaliz });
  }

  return generateAnalysis(id, dava, session.id);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { id } = await params;
  const dava = await prisma.dava.findFirst({
    where: { id, userId: session.id }
  });

  if (!dava) return NextResponse.json({ hata: "Dosya bulunamadı" }, { status: 404 });

  return generateAnalysis(id, dava, session.id);
}

async function generateAnalysis(davaId: string, dava: any, userId: string) {
  // Construct context
  let emsalContext = "";
  if (dava.emsalKararlar && dava.emsalKararlar.length > 0) {
    emsalContext = "\nEmsal Kararlar:\n" + dava.emsalKararlar.map((e: any, index: number) => {
      return `${index + 1}. [${e.kaynak}] - ${e.mahkeme} (${e.esasNo} - ${e.kararNo})\nÖzet: ${e.ozet}\n`;
    }).join("\n");
  }

  const prompt = `Sen ALTU Hukuk AI asistanısın. Bu dava dosyasının detaylarını "uyanık, son derece profesyonel, pratik ve tecrübeli bir Türk avukat" rolüyle analiz et. Karşı tarafın hamlelerini önceden sezen, açık arayan, müvekkili en iyi koruyacak stratejik çözümler sunan bir dil kullan.

DAVA BİLGİLERİ:
- Dosya No: ${dava.dosyaNo}
- Adı: ${dava.ad}
- Konu: ${dava.konu || "Belirtilmemiş"}
- Mahkeme: ${dava.mahkeme || "Belirtilmemiş"}
- Esas No: ${dava.esasNo || "Belirtilmemiş"}
- Karar No: ${dava.kararNo || "Belirtilmemiş"}
- Açıklama: ${dava.aciklama || "Belirtilmemiş"}
${emsalContext}

Lütfen tam olarak şu yapıda ve başlıklar altında Türkçe bir hukuki analiz, strateji ve yol haritası (Markdown formatında) sun:

### ⚖️ Hukuki Teşhis ve Stratejik Değerlendirme
(Davanın genel gidişatı, hukuki nitelendirmesi, müvekkilin avantajlı ve dezavantajlı olduğu noktalar.)

### 📚 İlgili Kanun Maddeleri ve Savunma Taktikleri
(İlgili kanun maddeleri (TBK, TMK, HMK, İşK, TCK vb.) ile karşı tarafın tezlerini çürütmek için kullanılabilecek avukatlık taktikleri. Dikkat edilmesi gereken hukuki tuzaklar.)

### 🧠 Emsal Karar Değerlendirmesi
(Yukarıda verilen emsal kararların davaya nasıl entegre edilebileceği ve dilekçede nasıl kullanılacağı.)

### 🛠️ Eylem Planı ve Somut Çözüm Yolu (Yol Haritası)
(Davanın kazanılması veya en az zararla kapatılması için atılması gereken adım adım pratik eylemler, toplanması gereken deliller.)`;

  try {
    const res = await fetch(`${PYTHON_URL}/api/ollama/sor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      return NextResponse.json({ hata: "Yapay zeka analiz motoruna bağlanılamadı" }, { status: 502 });
    }

    const data = await res.json();
    const analizMetni = data.response || "Analiz oluşturulamadı.";

    // Save to DB
    await prisma.dava.updateMany({
      where: { id: davaId, userId: userId },
      data: { aiAnaliz: analizMetni }
    });

    // Autonomously trigger dataset training to index this analysis
    try {
      fetch(`${PYTHON_URL}/api/dataset/egit`, { method: "POST" }).catch(() => {});
    } catch {}

    await logKaydet("Yapay zeka davası analizi", "Otonom Rapor", `Dava No: ${dava.dosyaNo}`, "bilgi", userId);

    return NextResponse.json({ analiz: analizMetni });
  } catch (error) {
    console.error("AI Analysis error:", error);
    return NextResponse.json({ hata: "Analiz oluşturulurken hata oluştu" }, { status: 500 });
  }
}
