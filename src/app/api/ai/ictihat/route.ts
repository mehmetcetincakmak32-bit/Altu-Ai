import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

const ICTIHATLAR = [
  { id: 1, mahkeme: "Yargıtay Hukuk Genel Kurulu", esas: "2023/1-245", karar: "2024/156", tarih: "15.03.2024", konu: "Kira sözleşmesinin feshi", ozet: "Kiracının kira bedelini ödememesi halinde kiralayanın sözleşmeyi fesih hakkı bulunmaktadır. İhtara rağmen ödeme yapılmazsa tahliye davası açılabilir." },
  { id: 2, mahkeme: "Yargıtay 9. Hukuk Dairesi", esas: "2023/4567", karar: "2024/1234", tarih: "02.02.2024", konu: "İşçinin kıdem tazminatı", ozet: "İş sözleşmesinin işveren tarafından haksız feshi halinde işçi kıdem ve ihbar tazminatına hak kazanır. Kıdem tazminatı her tam yıl için 30 günlük brüt ücrettir." },
  { id: 3, mahkeme: "Yargıtay 4. Hukuk Dairesi", esas: "2023/8910", karar: "2024/567", tarih: "10.01.2024", konu: "Trafik kazası tazminatı", ozet: "Trafik kazasında yaralanan kişi maddi ve manevi tazminat talep edebilir. Maddi tazminat kalemleri arasında tedavi giderleri, kazanç kaybı ve bakıcı giderleri bulunur." },
  { id: 4, mahkeme: "Yargıtay 2. Hukuk Dairesi", esas: "2023/3344", karar: "2024/789", tarih: "05.03.2024", konu: "Boşanmada velayet", ozet: "Çocuğun velayeti düzenlenirken çocuğun üstün yararı gözetilir. Çocuğun yaşı, cinsiyeti, anne-babanın maddi ve manevi durumu gibi kriterler dikkate alınır." },
  { id: 5, mahkeme: "Yargıtay 11. Hukuk Dairesi", esas: "2023/5566", karar: "2024/234", tarih: "20.12.2023", konu: "Limited şirket ortaklığından çıkarma", ozet: "Limited şirket ortağının haklı sebeple çıkarılması mümkündür. Ortağın şirkete olan borçlarını ödememesi veya rekabet yasağına aykırı davranması haklı sebep sayılır." },
  { id: 6, mahkeme: "Danıştay 4. Daire", esas: "2023/1122", karar: "2024/88", tarih: "08.02.2024", konu: "Vergi cezasının iptali", ozet: "Vergi ziyaı cezası kesilmeden önce mükellefe savunma hakkı verilmelidir. Aksi halde ceza iptal edilebilir." },
  { id: 7, mahkeme: "Yargıtay 12. Hukuk Dairesi", esas: "2022/12345", karar: "2023/6789", tarih: "15.11.2023", konu: "İlamsız icra takibine itiraz", ozet: "Borçlu, ödeme emrine 7 gün içinde itiraz edebilir. İtiraz halinde takip durur ve alacaklının itirazın kaldırılması veya iptali davası açması gerekir." },
  { id: 8, mahkeme: "Yargıtay 1. Hukuk Dairesi", esas: "2023/7788", karar: "2024/345", tarih: "12.01.2024", konu: "Tapu iptali ve tescil", ozet: "Tapu kaydındaki yolsuz tescilin düzeltilmesi için tapu iptali ve tescil davası açılır. TMK madde 1023'e göre iyiniyetli üçüncü kişinin kazanımı korunur." },
];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { sorgu, kategori } = await req.json();
  if (!sorgu || !sorgu.trim()) {
    return NextResponse.json({ sonuclar: [] });
  }

  try {
    // Python backend'deki canlı arama API'sini tetikle
    const url = `${PYTHON_URL}/api/remote/tumu?sorgu=${encodeURIComponent(sorgu)}&limit=15${kategori ? `&kategori=${encodeURIComponent(kategori)}` : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (response.ok) {
      const data = await response.json();
      const parsedResults: any[] = [];

      if (data.sonuclar) {
        // Yargıtay
        if (Array.isArray(data.sonuclar.yargitay)) {
          data.sonuclar.yargitay.forEach((k: any) => {
            parsedResults.push({
              mahkeme: k.mahkeme || "Yargıtay Hukuk Dairesi",
              esasNo: k.esas || k.esasNo || "-",
              kararNo: k.karar || k.kararNo || "-",
              tarih: k.tarih || "-",
              konu: k.konu || sorgu,
              ozet: k.ozet || ""
            });
          });
        }
        
        // Danıştay
        if (Array.isArray(data.sonuclar.danistay)) {
          data.sonuclar.danistay.forEach((k: any) => {
            parsedResults.push({
              mahkeme: k.mahkeme || "Danıştay Dairesi",
              esasNo: k.esas || k.esasNo || "-",
              kararNo: k.karar || k.kararNo || "-",
              tarih: k.tarih || "-",
              konu: k.konu || sorgu,
              ozet: k.ozet || ""
            });
          });
        }

        // Anayasa Mahkemesi
        if (Array.isArray(data.sonuclar.aym)) {
          data.sonuclar.aym.forEach((k: any) => {
            parsedResults.push({
              mahkeme: "Anayasa Mahkemesi",
              esasNo: k.basvuruNo || "-",
              kararNo: k.karar || "-",
              tarih: k.tarih || "-",
              konu: k.konu || sorgu,
              ozet: k.sonuc || ""
            });
          });
        }

        // Kanun ve Mevzuat
        if (Array.isArray(data.sonuclar.mevzuat)) {
          data.sonuclar.mevzuat.forEach((k: any) => {
            parsedResults.push({
              mahkeme: k.tur || "Kanun/Mevzuat",
              esasNo: k.sayi || "-",
              kararNo: "-",
              tarih: k.tarih || "-",
              konu: k.baslik || sorgu,
              ozet: k.madde || ""
            });
          });
        }
      }

      if (parsedResults.length > 0) {
        return NextResponse.json({ sonuclar: parsedResults });
      }
    }
  } catch (error) {
    console.error("FastAPI search failed, falling back to local mock data:", error);
  }

  // Fallback: Yerel mock verilere dön
  const sorguAlt = sorgu.toLowerCase();
  const fallbackResults = ICTIHATLAR.filter(i =>
    i.konu.toLowerCase().includes(sorguAlt) ||
    i.ozet.toLowerCase().includes(sorguAlt) ||
    i.mahkeme.toLowerCase().includes(sorguAlt) ||
    i.esas.toLowerCase().includes(sorguAlt) ||
    i.karar.toLowerCase().includes(sorguAlt)
  ).map(i => ({
    mahkeme: i.mahkeme,
    esasNo: i.esas,
    kararNo: i.karar,
    tarih: i.tarih,
    konu: i.konu,
    ozet: i.ozet
  }));

  return NextResponse.json({ sonuclar: fallbackResults });
}
