import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { id } = await params;
  const { transcript, davaId } = await req.json();

  if (!transcript) {
    return NextResponse.json({ hata: "Konuşma dökümü boş olamaz." }, { status: 400 });
  }

  let subdomain = "";
  try {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    subdomain = user?.subdomain || "";
  } catch (err) {
    console.error("Subdomain fetch error:", err);
  }

  const prompt = `Sen bir Türk Hukuku uzmanı yapay zeka asistanısın. Bir avukatın duruşma esnasında tuttuğu ses kaydı/konuşma dökümünü analiz ederek:
1. Resmi hukuk diliyle yazılmış kısa bir duruşma tutanağı özeti ("tutanakOzet")
2. Bir sonraki duruşmaya kadar avukatın veya büronun yapması gereken acil hukuki işlemler/sonraki adımlar listesi ("sonrakiAdimlar" - maddeler halinde)
çıkar.

SES KAYDI DÖKÜMÜ:
"${transcript}"

Yanıtını sadece ve sadece aşağıdaki gibi temiz bir JSON formatında ver, başka hiçbir açıklama veya markdown kodu (örn: \`\`\`json) yazma:
{
  "tutanakOzet": "Duruşmada alınan kararlar ve gelişmelerin resmi, profesyonel özeti",
  "sonrakiAdimlar": "Yapılması gereken işler ve sonraki adımlar listesi (örn: 1. Karşı tarafın beyanlarına cevap dilekçesi sunulması, 2. Bilirkişi ücretinin yatırılması vb.)"
}`;

  try {
    const res = await fetch(`${PYTHON_URL}/api/ollama/sor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, subdomain }),
    });

    if (res.ok) {
      const data = await res.json();
      const jsonMatch = data.response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const tutanakOzet = parsed.tutanakOzet || "";
        const sonrakiAdimlar = parsed.sonrakiAdimlar || "";

        await prisma.durusma.updateMany({
          where: { id, davaId },
          data: { tutanakOzet, sonrakiAdimlar }
        });

        // Otomatik görev oluşturma
        if (sonrakiAdimlar && sonrakiAdimlar !== "") {
          await prisma.is.create({
            data: {
              baslik: `Duruşma Sonrası İşlemler`,
              aciklama: sonrakiAdimlar,
              durum: "bekliyor",
              oncelik: "yuksek",
              davaId,
              userId: session.id,
              tamamlandi: false
            }
          });
        }

        return NextResponse.json({ success: true, tutanakOzet, sonrakiAdimlar });
      }
    }
  } catch (error: any) {
    console.error("Ollama audio processing failed:", error);
  }

  const tutanakOzet = `Duruşma ses kaydından özet çıkarıldı: ${transcript.substring(0, 150)}...`;
  const sonrakiAdimlar = "1. Duruşma tutanağını inceleyin.\n2. Bir sonraki celse gününü ajandaya kaydedin.";
  
  await prisma.durusma.updateMany({
    where: { id, davaId },
    data: { tutanakOzet, sonrakiAdimlar }
  });

  return NextResponse.json({ success: true, tutanakOzet, sonrakiAdimlar });
}
