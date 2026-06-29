import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BELGE_KALIPLARI: Record<string, (data: any) => string> = {
  "dilekce": (d) => `${d.musteriAdi || "[Müvekkil Adı]"} tarafından ${d.karsiTaraf || "[Karşı Taraf]"} aleyhine ${d.mahkeme || "[Yetkili Mahkeme]"}'de açılan ${d.davaAdi || "[Dava Adı]"} davasında;

DAVA DİLEKÇESİ

AÇIKLAMALAR:
${d.aciklama || "[Olayların açıklaması buraya yazılacak]"}

HUKUKİ SEBEPLER:
${d.hukukiSebep || "[İlgili kanun maddeleri]"}

DELİLLER:
${d.deliller || "[Tüm deliller listelenecek]"}

SONUÇ VE İSTEM:
Yukarıda açıklanan nedenlerle davanın kabulüne karar verilmesini saygıyla talep ederim.

${d.tarih || "[Tarih]"}
${d.avukat || "[Avukat Adı]"}`,

  "sozlesme": (d) => `${d.tur || "[SÖZLEŞME TÜRÜ]"} SÖZLEŞMESİ

Taraflar: ${d.taraf1 || "[Taraf 1]"} - ${d.taraf2 || "[Taraf 2]"}

KONU: ${d.konu || "[Sözleşmenin konusu]"}

MADDE 1 - TANIMLAR
${d.tanimlar || "[Tanımlar]"}

MADDE 2 - TARAFLARIN HAK VE YÜKÜMLÜLÜKLERİ
${d.hakVeYukumlulukler || "[Hak ve yükümlülükler]"}

MADDE 3 - BEDEL VE ÖDEME
${d.bedel || "[Bedel ve ödeme koşulları]"}

MADDE 4 - SÜRE
${d.sure || "[Sözleşme süresi]"}

MADDE 5 - FESİH
${d.fesih || "[Fesih koşulları]"}

${d.tarih || "[Tarih]"}
${d.taraf1 || "[Taraf 1]"}                          ${d.taraf2 || "[Taraf 2]"}`,

  "ihbarname": (d) => `İHTARNAME

GÖNDEREN: ${d.gonderen || "[Gönderen]"}
ALICI: ${d.alici || "[Alıcı]"}

KONU: ${d.konu || "[İhtar konusu]"}

İHTAR EDİLEN HUSUS:
${d.icerik || "[İhtar metni]"}

${d.tarih || "[Tarih]"}
${d.gonderen || "[Gönderen]"}`,
};

const YONTEM_YONERGELERI: Record<string, string> = {
  "klasik": "Klasik Türk dilekçe düzenini takip et: Açıklamalar, Hukuki Nedenler, Hukuki Deliller ve Netice-i Talep sırasıyla yaz.",
  "mirat": "MIRAT (Maddi Vakıalar -> Mesele -> Kural -> Uygulama -> Geçici Sonuç) yöntemini uygula:\n1. Maddi Vakıalar (M): Olay örgüsünden sadece hukuken ilgili olanları süzerek GİRİŞ/AÇIKLAMA kısmında sun.\n2. Mesele (I): Çözülecek hukuki soruyu net bir soru cümlesi veya alt başlık olarak koy (örn: 'Davalının temerrüde düşüp düşmediği sorunu').\n3. Kural (R): Uygulanacak kanun maddesini/içtihadı belirt.\n4. Uygulama (A): Kuralı süzülmüş maddi vakıaya tatbik ederek ilişkilendir.\n5. Geçici Sonuç (T): Kesin dayatmadan ziyade mahkemenin takdirine açık bir öneri sonucu olarak ifade et (örn: '...kanaatindeyiz', '...karar verilmesi gerektiği düşünülmektedir').",
  "irac": "IRAC (Mesele -> Kural -> Uygulama -> Sonuç) yöntemini uygula:\n1. Mesele: Hukuki soruyu tanımla.\n2. Kural: Uygulanacak kanun maddesi ve ilkeleri listele.\n3. Uygulama: Kuralı doğrudan somut olaya ve olaydaki vakıalara bağlayarak açıkla.\n4. Sonuç: Vardığın net hukuki sonucu belirt.",
  "toulmin": "Toulmin argümantasyon modelini uygula:\n1. İddia (Claim): Avukatın asıl talebini net bir şekilde ortaya koy.\n2. Dayanak (Data): Talebi destekleyen maddi vakıaları sun.\n3. Gerekçe/Köprü (Warrant): Maddi vakıalarla iddia arasındaki hukuki bağı ve mantığı açıkla.\n4. Destek (Backing): Gerekçeyi kuvvetlendiren kanun maddelerini, içtihatları ve doktrin görüşlerini ekle.\n5. Çekince/Nitelendirici (Qualifier): Talebin kapsamını ve sınırlarını belirle.\n6. Çürütme (Rebuttal): Karşı tarafın sunabileceği olası iddiaları öngör ve hukuken geçersiz kıl.",
  "retorik": "Klasik Retorik (Cicero/Quintilian) düzenini uygula:\n1. Exordium (Giriş): Mahkemenin dikkatini çek ve davaya saygılı bir giriş yap.\n2. Narratio (Olaylar): Olayların gelişimini net ve tarafsız gibi görünen profesyonel bir dille anlat.\n3. Partitio (Bölümleme): Hukuki uyuşmazlığın ana hatlarını ve iddia noktalarını ayır.\n4. Confirmatio (Kanıtlar): Kendi argümanlarını, delillerini ve kanun maddelerini detaylandır.\n5. Refutatio (Çürütme): Karşı tarafın savunmalarını tek tek çürüt.\n6. Peroratio (Sonuç): Hukuki argümanları toparla, duygusal/hukuki kapanış ve neticeyi talep et."
};

const DILEKCE_TURU_ACIKLAMALARI: Record<string, string> = {
  "dava": "Dava Dilekçesi: Süreci siz başlatıyorsunuz. 'DAVA DEĞERİ' alanı ekleyin (varsa) ve 'DAVA DİLEKÇESİ' başlığı altında yazın.",
  "cevap": "Cevap Dilekçesi: Karşı tarafın davasına yanıt veriyorsunuz. Usuli ilk itirazları (yetki, görev, zamanaşımı, derdestlik) öncelikle belirtin. 'CEVAP DİLEKÇESİ' başlığı kullanın.",
  "replik": "Replik (Cevaba Cevap): Davacının, davalının cevap dilekçesine yanıtıdır. İddiayı genişletme yasağına dikkat ederek cevapları çürütün.",
  "duplik": "Düplik (İkinci Cevap): Davalının, davacının repliğine yanıtıdır. Teati sürecini kapatan savunmaları ekleyin.",
  "savunma": "Savunma Dilekçesi: Ceza davasında mütalaaya veya idari uyuşmazlığa karşı savunmadır. Beraat veya lehe karar taleplerini vurgulayın."
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { tur, data } = await req.json();
  const kalip = BELGE_KALIPLARI[tur] || BELGE_KALIPLARI["dilekce"];

  let icerik = "";
  let generatedByAi = false;

  // 1. Fetch Dava details if davaId is provided
  let davaContext = "";
  if (data?.davaId) {
    try {
      const dava = await prisma.dava.findFirst({
        where: { id: data.davaId, userId: session.id }
      });
      if (dava) {
        davaContext = `\nİlişkili Dava Dosyası Bilgileri:\n- Dosya No: ${dava.dosyaNo}\n- Dava Adı: ${dava.ad}\n- Mahkeme: ${dava.mahkeme || "Belirtilmemiş"}\n- Dava Konusu: ${dava.konu || "Belirtilmemiş"}\n- Açıklama: ${dava.aciklama || ""}\n`;
      }
    } catch (e) {
      console.error("Dava fetch error in belge generation:", e);
    }
  }

  // Get user subdomain for context
  let subdomain = "";
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });
    subdomain = user?.subdomain || "";
  } catch (err) {}

  // 2. Call Python Backend AI (Mistral-Nemo) for document generation
  const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
  try {
    const yontem = data.yontem || "klasik";
    const dilekceTuru = data.dilekceTuru || "dava";
    const yontemYonergesi = YONTEM_YONERGELERI[yontem] || YONTEM_YONERGELERI["klasik"];
    const turYonergesi = tur === "dilekce" ? (DILEKCE_TURU_ACIKLAMALARI[dilekceTuru] || "") : "";

    const prompt = `Sen ALTU Hukuk yapay zekasısın. Avukat kullanıcının sağladığı bilgilere dayanarak resmi, kurallara uygun ve profesyonel bir Türkçe hukuki belge (dilekçe, sözleşme veya ihbarname) taslağı oluştur.
    
    METİN VE BİÇİM STANDARTLARI (Kritik Kurallar):
    1. Metin kesinlikle resmî yazı formatına, Türk yargı sistemi dilekçe usulüne uygun olmalıdır.
    2. Mahkeme başlığından sonra dosya no, davacı, davalı, vekili, konu alanlarını "iki nokta hizalı" olacak şekilde düzenle (Örn: DAVACI      : [Ad Soyad]).
    3. TDK yazım kurallarına kesinlikle uy: "hâkim", "hâkimliğine", "vekâleten", "müdafi" gibi kelimeleri doğru şapkalı harflerle yaz.
    4. Kapanış cümlelerini vekâleten çoğul veya tekil yapısına uygun kur: "... karar verilmesini saygılarımızla vekaleten arz ve talep ederiz." veya "... saygılarımla vekâleten arz ve talep ederim."
    5. Delil saklısı cümlesi ekle: "Karşı tarafın sunacağı delillere karşı delil sunma ve beyanda bulunma hakkımız saklıdır."
    6. Belirsiz alacak davası ise ekle: "(HMK m. 107 uyarınca, fazlaya ilişkin her türlü talep ve dava hakkımız saklı kalmak kaydıyla)"
    7. KVKK kurallarına uy; hassas kişisel verileri ifşa etme, sadece gerekli bilgileri kullan.
    
    ARGÜMANTASYON ÇERÇEVESİ YÖNERGESİ:
    ${yontemYonergesi}
    
    ${tur === "dilekce" ? `DİLEKÇE TÜRÜ YÖNERGESİ:\n${turYonergesi}` : ""}
    
    BELGE TÜRÜ: ${tur}
    BELGE BAŞLIĞI: ${data.baslik || "Taslak Belge"}
    ${davaContext}
    
    AVUKATIN GİRDİĞİ PARAMETRELER:
    ${Object.entries(data || {})
      .filter(([k]) => k !== "davaId" && k !== "baslik" && k !== "yontem" && k !== "dilekceTuru")
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n")}
    
    Yalnızca resmi belgenin tam metnini (Markdown formatında başlıklar kullanarak) yaz. Başka hiçbir giriş, açıklama, not veya selamlaşma metni ekleme.
    
    HUKUKİ TASLAK METNİ:`;

    const aiRes = await fetch(`${pythonUrl}/api/ollama/sor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, subdomain })
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      if (aiData.response) {
        icerik = aiData.response;
        generatedByAi = true;
      }
    }
  } catch (err) {
    console.error("AI belge generation failed, falling back to template:", err);
  }

  // Fallback to static template if AI failed
  if (!generatedByAi) {
    icerik = kalip(data || {});
  }

  if (data?.davaId) {
    await prisma.belge.create({
      data: {
        baslik: data.baslik || `${tur.toUpperCase()} - ${new Date().toLocaleDateString("tr-TR")}`,
        icerik,
        tur,
        davaId: data.davaId,
        userId: session.id,
      },
    });
  }

  return NextResponse.json({ icerik, generatedByAi });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const belgeler = await prisma.belge.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    include: { dava: { select: { ad: true } } },
  });
  return NextResponse.json(belgeler);
}
