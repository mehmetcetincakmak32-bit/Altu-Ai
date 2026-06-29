import { prisma } from "./prisma";
import { readTenantJson } from "./tenant";

export interface RagContext {
  davalar: string;
  musteriler: string;
  durusmalar: string;
  belgeler: string;
  emsalKararlar: string;
  bilgiBankasi: string;
}

const LEGAL_PROMPT = `Sen "ALTU AI" adında, Türk hukuk sisteminde uzmanlaşmış bir yapay zeka hukuk danışmanısın.

KURALLAR:
1. Yalnızca SİSTEMDEKİ VERİLER ve Türk hukuk mevzuatına dayanarak yanıt ver.
2. Emin olmadığın konularda "Bu konuda kesin bilgim yok, lütfen bir avukata danışın" de.
3. ASLA uydurma kanun maddesi, içtihat veya dava bilgisi verme.
4. Veritabanında olmayan dava veya müvekkil bilgisi varsayma.
5. Yanıtlarını kısa, öz ve profesyonel tut.
6. Hukuki yorumlarında somut kanun maddelerine atıf yap.

KAYNAK GÖSTERME ZORUNLULUĞU:
- Cevabındaki HER iddia için === SİSTEM VERİLERİ === bölümünde bir kaynak göstermek ZORUNDASIN.
- "Kanun maddesi X uyarınca" gibi bir ifade kullanıyorsan, o madde === SİSTEM VERİLERİ === içinde olmalı.
- Eğer iddianı destekleyen bir kaynak SİSTEM VERİLERİ'nde YOKSA, "Bu konuda veritabanımda yeterli bilgi yok" diyerek uyar.
- EMSAL KARARLAR bölümü varsa, her karara mahkeme adı + esas/karar no ile atıf yap.

HALÜSİNASYON ÖNLEME:
- Kullanıcı kendi davası hakkında soru soruyorsa, yalnızca KAYITLI DAVALAR listesindeki bilgileri kullan.
- KAYITLI DAVALAR listesinde olmayan bir dava hakkında ASLA varsayımda bulunma.
- Eğer kullanıcının sorusuyla ilgili hiçbir sistem verisi yoksa, doğrudan "Bu konuda sistemimde kayıtlı bilgi bulunmamaktadır" de.
- Hiçbir zaman "genel olarak", "çoğu durumda" gibi muğlak ifadelerle uydurma bilgi verme.`;

function koselibileMetin(s: string): boolean {
  const alt = s.toLowerCase();
  const hukukKelimeler = [
    "dava", "mahkeme", "kanun", "madde", "yargıtay", "danıştay",
    "icra", "boşanma", "kira", "tazminat", "miras", "iş",
    "ticaret", "ceza", "vergi", "aile", "hukuk", "avukat",
    "müvekkil", "duruşma", "dilekçe", "karar", "temyiz",
    "istinaf", "itiraz", "haciz", "ipotek", "sözleşme",
    "alacak", "borç", "şirket", "limited", "anonim",
    "tapu", "sicil", "tescil", "vekâlet", "ücret",
  ];
  return hukukKelimeler.some((k) => alt.includes(k)) || alt.length > 10;
}

function metindeArama(soru: string, kaynak: string): number {
  const soruKelimeler = soru.toLowerCase().split(/\s+/).filter((k) => k.length > 2);
  const kaynakAlt = kaynak.toLowerCase();
  let puan = 0;
  for (const kelime of soruKelimeler) {
    if (kaynakAlt.includes(kelime)) {
      puan += 1;
    }
  }
  return puan;
}

export async function buildRagContext(
  userId: string,
  soru: string,
  subdomain?: string,
): Promise<RagContext> {
  const ctx: RagContext = {
    davalar: "",
    musteriler: "",
    durusmalar: "",
    belgeler: "",
    emsalKararlar: "",
    bilgiBankasi: "",
  };

  try {
    const [davas, musteris, durusmas, belgelerArr] = await Promise.all([
      prisma.dava.findMany({ where: { userId } }),
      prisma.musteri.findMany({ where: { userId } }),
      prisma.durusma.findMany({ where: { dava: { userId } } }),
      prisma.belge.findMany({ where: { userId } }).catch(() => []),
    ]);

    let enIyiPuani = 0;
    if (davas.length > 0) {
      const davaMetinleri = davas.map(
        (d) =>
          `Dosya No: ${d.dosyaNo}, Ad: ${d.ad}, Konu: ${d.konu || "-"}, Mahkeme: ${d.mahkeme || "-"}, Durum: ${d.durum}, Açıklama: ${d.aciklama || "-"}`
      );
      const ilgiliDavalar = davaMetinleri
        .map((m) => ({ metin: m, puan: metindeArama(soru, m) }))
        .filter((m) => m.puan > 0)
        .sort((a, b) => b.puan - a.puan)
        .slice(0, 5);
      if (ilgiliDavalar.length > 0) {
        ctx.davalar = ilgiliDavalar.map((m) => m.metin).join("\n");
        enIyiPuani = ilgiliDavalar[0].puan;
      }
      if (soru.includes("dava") || soru.includes("dosya") || enIyiPuani === 0) {
        ctx.davalar = davaMetinleri.slice(0, 10).join("\n");
      }
    }

    if (musteris.length > 0) {
      const musteriMetinleri = musteris.map(
        (m) => `${m.ad} ${m.soyad} | TC: ${m.tcKimlik || "-"} | Tel: ${m.telefon || "-"}`
      );
      const ilgiliMusteriler = musteriMetinleri
        .map((m) => ({ metin: m, puan: metindeArama(soru, m) }))
        .filter((m) => m.puan > 0)
        .slice(0, 5);
      if (ilgiliMusteriler.length > 0) {
        ctx.musteriler = ilgiliMusteriler.map((m) => m.metin).join("\n");
      } else if (soru.includes("müvekkil") || soru.includes("müşteri") || soru.includes("musteri")) {
        ctx.musteriler = musteriMetinleri.slice(0, 10).join("\n");
      }
    }

    if (durusmas.length > 0) {
      const durusmaMetinleri = durusmas.map(
        (dur) =>
          `Başlık: ${dur.baslik} | Tarih: ${new Date(dur.tarih).toLocaleDateString("tr-TR")} ${new Date(dur.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} | Açıklama: ${dur.aciklama || "-"}`
      );
      const ilgiliDurusmalar = durusmaMetinleri
        .map((m) => ({ metin: m, puan: metindeArama(soru, m) }))
        .filter((m) => m.puan > 0)
        .slice(0, 5);
      if (ilgiliDurusmalar.length > 0) {
        ctx.durusmalar = ilgiliDurusmalar.map((m) => m.metin).join("\n");
      } else if (soru.includes("duruşma") || soru.includes("durusma") || soru.includes("takvim")) {
        ctx.durusmalar = durusmaMetinleri.slice(0, 10).join("\n");
      }
    }

    if (belgelerArr.length > 0) {
      const belgeMetinleri = belgelerArr.map(
        (b) => `Belge: ${(b as any).orijinalAd || (b as any).ad || "-"} | Tür: ${(b as any).tur || (b as any).dosyaTuru || "-"}`
      );
      const ilgiliBelgeler = belgeMetinleri
        .map((m) => ({ metin: m, puan: metindeArama(soru, m) }))
        .filter((m) => m.puan > 0)
        .slice(0, 5);
      if (ilgiliBelgeler.length > 0) {
        ctx.belgeler = ilgiliBelgeler.map((m) => m.metin).join("\n");
      }
    }

    const emsalKararlar = await prisma.emsalKarar
      .findMany({ take: 5 })
      .catch(() => []);
    if (emsalKararlar.length > 0) {
      const emsalMetinleri = emsalKararlar.map(
        (k) => `${k.mahkeme} | ${k.esasNo}/${k.kararNo} | ${k.konu}: ${k.ozet}`
      );
      ctx.emsalKararlar = emsalMetinleri.join("\n");
    }

    if (subdomain) {
      try {
        const kb = readTenantJson<{ knowledge: any[] }>(subdomain, "ai_knowledge.json", { knowledge: [] });
        if (kb.knowledge?.length > 0) {
          const ilgiliBilgiler = kb.knowledge
            .map((k: any) => ({
              metin: `[${k.tur}] ${k.baslik}: ${k.icerik.slice(0, 500)}`,
              puan: metindeArama(soru, k.baslik + " " + k.icerik),
            }))
            .filter((k) => k.puan > 0)
            .sort((a: any, b: any) => b.puan - a.puan)
            .slice(0, 5);
          if (ilgiliBilgiler.length > 0) {
            ctx.bilgiBankasi = ilgiliBilgiler.map((k: any) => k.metin).join("\n");
          }
        }
      } catch {}
    }
  } catch (e) {
    console.error("RAG context build error:", e);
  }

  return ctx;
}

export function buildRagPrompt(soru: string, ctx: RagContext): string {
  const sistemVerisi = [];
  if (ctx.davalar) sistemVerisi.push(`KAYITLI DAVALAR:\n${ctx.davalar}`);
  if (ctx.musteriler) sistemVerisi.push(`MÜVEKKİLLER:\n${ctx.musteriler}`);
  if (ctx.durusmalar) sistemVerisi.push(`YAKLAŞAN DURUŞMALAR:\n${ctx.durusmalar}`);
  if (ctx.belgeler) sistemVerisi.push(`BELGELER:\n${ctx.belgeler}`);
  if (ctx.emsalKararlar) sistemVerisi.push(`EMSAL KARARLAR:\n${ctx.emsalKararlar}`);

  const veriBolumu =
    sistemVerisi.length > 0
      ? `\n\n=== SİSTEM VERİLERİ (YALNIZCA GERÇEK VERİLER) ===\n${sistemVerisi.join("\n\n")}`
      : "\n\nNOT: Kullanıcının sorusuyla ilgili sistemimde kayıtlı veri bulunmamaktadır. Bu durumda yalnızca genel hukuk bilgisi verebilir veya kullanıcıyı bir avukata yönlendirebilirsin. ASLA uydurma veri kullanma.";

  return `${LEGAL_PROMPT}${veriBolumu}\n\nKullanıcı sorusu: ${soru}\n\nYanıt:`;
}

export function hukukiKontrol(soru: string): boolean {
  return koselibileMetin(soru);
}