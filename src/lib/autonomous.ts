import { prisma, EmsalKarar } from "@/lib/prisma";
import { logKaydet } from "@/lib/logger";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function otonomDavaIsle(davaId: string, userId: string) {
  try {
    let subdomain = "";
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      subdomain = user?.subdomain || "";
    } catch (err) {
      console.error("[Otonom] Subdomain fetch error:", err);
    }

    const dava = await prisma.dava.findFirst({
      where: { id: davaId, userId }
    });
    if (!dava) return;

    // 0. Akıllı Hukuk Alanı (Kategori) Belirleme
    let kategori = "diger";
    try {
      const catResponse = await fetch(`${PYTHON_URL}/api/kategori/belirle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konu: dava.konu || dava.ad, aciklama: dava.aciklama || "" })
      });
      if (catResponse.ok) {
        const catData = await catResponse.json();
        if (catData.kategori) {
          kategori = catData.kategori;
          console.log(`[Otonom] Dava '${dava.dosyaNo}' için belirlenen kategori: ${kategori}`);
        }
      }
    } catch (catErr) {
      console.error("[Otonom] Kategori belirleme servisi hatası:", catErr);
    }

    // 0.5. Akıllı Süre ve Zamanaşımı Hesaplama (Zamanaşımı Radar)
    let zamanasimiTarihi: string | null = null;
    let temyizSonTarihi: string | null = null;
    let sureTakipNotu: string | null = null;

    try {
      const datePrompt = `Sen bir Türk Hukuku uzmanı yapay zeka asistanısın. Aşağıdaki davanın konusu, açılış tarihi ve detaylarına dayanarak Türk Borçlar Kanunu (TBK), Hukuk Muhakemeleri Kanunu (HMK) ve diğer ilgili mevzuat uyarınca:
1. Zamanaşımı süresini/tarihini
2. Temyiz/İtiraz son süresini/tarihini
3. Süre takibi ile ilgili kritik notları tespit et.

DAVA BİLGİLERİ:
- Dosya No: ${dava.dosyaNo}
- Adı: ${dava.ad}
- Konu: ${dava.konu || "Belirtilmemiş"}
- Mahkeme: ${dava.mahkeme || "Belirtilmemiş"}
- Esas No: ${dava.esasNo || "Belirtilmemiş"}
- Oluşturulma/Başlama Tarihi: ${new Date(dava.createdAt).toLocaleDateString("tr-TR")}
- Açıklama: ${dava.aciklama || "Belirtilmemiş"}

Yanıtını sadece ve sadece aşağıdaki gibi temiz bir JSON formatında ver, başka hiçbir açıklama veya markdown kodu (örn: \`\`\`json) yazma:
{
  "zamanasimiTarihi": "YYYY-MM-DD" (Tarih formatında veya tespit edilemezse null),
  "temyizSonTarihi": "YYYY-MM-DD" (Tarih formatında veya tespit edilemezse null),
  "sureTakipNotu": "Tespit edilen süre kuralları (örn: HMK md. 345 uyarınca 2 hafta, TBK md. 146 uyarınca 10 yıl vb.) hakkında kısa bir açıklama"
}`;

      const dateRes = await fetch(`${PYTHON_URL}/api/ollama/sor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: datePrompt, subdomain })
      });

      if (dateRes.ok) {
        const dateData = await dateRes.json();
        const jsonMatch = dateData.response.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          zamanasimiTarihi = parsed.zamanasimiTarihi || null;
          temyizSonTarihi = parsed.temyizSonTarihi || null;
          sureTakipNotu = parsed.sureTakipNotu || null;
          console.log(`[Otonom] Süre hesaplandı: Zamanaşımı: ${zamanasimiTarihi}, Temyiz: ${temyizSonTarihi}`);
        }
      }
    } catch (dateErr) {
      console.error("[Otonom] Süre hesaplama hatası:", dateErr);
    }

    // 1. Otomatik Emsal Karar Çekme
    const query = dava.konu || dava.ad.split("-")[1]?.trim() || dava.ad || "kira sözleşmesi";
    console.log(`[Otonom] Dava '${dava.dosyaNo}' için emsal kararlar sorgulanıyor: '${query}'`);
    
    let parsedDecisions: EmsalKarar[] = [];
    try {
      const response = await fetch(`${PYTHON_URL}/api/remote/tumu?sorgu=${encodeURIComponent(query)}&limit=5&subdomain=${subdomain}`);
      if (response.ok) {
        const data = await response.json();
        if (data.sonuclar) {
          // Parse Yargıtay
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
          // Parse Danıştay
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
          // Parse AYM
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
          // Parse Mevzuat
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
      }
    } catch (e) {
      console.error("[Otonom] Scraper hatası:", e);
    }

    // Save decisions, kategori, and calculated dates
    await prisma.dava.updateMany({
      where: { id: davaId, userId },
      data: {
        emsalKararlar: parsedDecisions,
        kategori,
        zamanasimiTarihi,
        temyizSonTarihi,
        sureTakipNotu
      }
    });

    // 2. Otomatik İş Görevleri Oluşturma
    const isler = [];
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes("kira") || lowerQuery.includes("tahliye")) {
      isler.push({
        baslik: "Kira Kontratı ve İhtarname İncelemesi",
        aciklama: "Tahliye şartlarının oluşup oluşmadığının tespiti için kontratı ve çekilen ihtarnameleri inceleyin.",
        oncelik: "yuksek",
        durum: "yapilacak",
        tamamlandi: false,
        davaId,
        userId,
      });
    } else if (lowerQuery.includes("tazminat") || lowerQuery.includes("iş") || lowerQuery.includes("işçi")) {
      isler.push({
        baslik: "Hizmet Dökümü ve Bordro Analizi",
        aciklama: "Kıdem/ihbar hesabı için müvekkilden SGK hizmet dökümü ve son bordroları talep edin.",
        oncelik: "yuksek",
        durum: "yapilacak",
        tamamlandi: false,
        davaId,
        userId,
      });
    }

    isler.push({
      baslik: "Dava Dilekçesi ve Delil Listesi Hazırlığı",
      aciklama: "Emsal kararlar doğrultusunda dava dilekçesini kaleme alın ve delilleri toplayın.",
      oncelik: "orta",
      durum: "yapilacak",
      tamamlandi: false,
      davaId,
      userId,
    });

    for (const task of isler) {
      await prisma.is.create({ data: task });
    }

    // 3. Otomatik Yapay Zeka Analizi Oluşturma
    let emsalContext = "";
    if (parsedDecisions.length > 0) {
      emsalContext = "\nEmsal Kararlar:\n" + parsedDecisions.map((e: any, idx: number) => {
        return `${idx + 1}. [${e.kaynak}] - ${e.mahkeme} (${e.esasNo} - ${e.kararNo})\nÖzet: ${e.ozet}\n`;
      }).join("\n");
    }

    const aiPrompt = `Sen ALTU Hukuk AI asistanısın. Bu dava dosyasını "uyanık, tecrübeli ve pratik bir Türk avukat" rolüyle analiz et. Karşı tarafın hamlelerini önceden sezen, savunma taktikleri veren ve dilekçede kullanılabilecek stratejik çözümler sunan bir dil kullan.

DAVA BİLGİLERİ:
- Dosya No: ${dava.dosyaNo}
- Adı: ${dava.ad}
- Konu: ${dava.konu || "Belirtilmemiş"}
- Mahkeme: ${dava.mahkeme || "Belirtilmemiş"}
- Esas No: ${dava.esasNo || "Belirtilmemiş"}
- Açıklama: ${dava.aciklama || "Belirtilmemiş"}
${emsalContext}

Lütfen tam olarak şu yapıda ve başlıklar altında Türkçe bir hukuki analiz (Markdown formatında) sun:

### ⚖️ Hukuki Teşhis ve Stratejik Değerlendirme
(Davanın hukuki niteliği, güçlü ve zayıf yanlarımız.)

### 📚 İlgili Kanun Maddeleri ve Savunma Taktikleri
(TBK, HMK vb. kanun maddeleri ve karşı savunma planı.)

### 🧠 Emsal Karar Değerlendirmesi
(Emsal kararların davada nasıl kullanılacağı.)

### 🛠️ Eylem Planı ve Somut Çözüm Yolu (Yol Haritası)
(Atılması gereken pratik adımlar, toplanacak deliller.)`;

    try {
      const aiRes = await fetch(`${PYTHON_URL}/api/ollama/sor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, subdomain })
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        if (aiData.response) {
          await prisma.dava.updateMany({
            where: { id: davaId, userId },
            data: { aiAnaliz: aiData.response }
          });
        }
      }
    } catch (e) {
      console.error("[Otonom] AI analiz hatası:", e);
    }

    // 4. Otomatik Eğitim ve RAG tetikleme
    try {
      await fetch(`${PYTHON_URL}/api/dataset/egit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain })
      });
    } catch (e) {
      console.error("[Otonom] RAG eğitim hatası:", e);
    }

    await logKaydet("Otonom dava eşitlemesi", `${parsedDecisions.length} karar, AI analiz, görevler`, `Dava: ${dava.dosyaNo}`, "basari", userId);

  } catch (error) {
    console.error("[Otonom] Genel süreç hatası:", error);
  }
}
