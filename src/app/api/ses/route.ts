import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otonomDavaIsle } from "@/lib/autonomous";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { komut } = await req.json();
  const userId = session.id;
  const commandLower = komut.toLowerCase().trim();

  // Python backend URL
  const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

  let actionResponse = "";
  let actionFound = false;

  // Let's build a smart agent logic
  try {
    // 1. UYAP Portal Eşitleme: "uyap eşitle", "dosyaları senkronize et"
    if (commandLower.includes("uyap eşitle") || commandLower.includes("uyap esitle") || commandLower.includes("dosyaları senkronize et") || commandLower.includes("dosyalari senkronize et")) {
      const baseUrl = req.url.split("/api/")[0];
      const res = await fetch(`${baseUrl}/api/uyap`, { headers: { cookie: req.headers.get("cookie") || "" } });
      if (res.ok) {
        const data = await res.json();
        actionResponse = `İşlem Başarılı. UYAP portalı üzerinden dosyalarınız senkronize edildi. ${data.aktarilan} dosya ve duruşma güncellendi.`;
      } else {
        const data = await res.json().catch(() => ({}));
        actionResponse = `UYAP eşitlemesi başarısız oldu: ${data.hata || "Bilinmeyen hata"}`;
      }
      actionFound = true;
    }
    // 2. Logları Temizleme: "logları temizle", "günlükleri sil"
    else if (commandLower.includes("logları temizle") || commandLower.includes("loglari temizle") || commandLower.includes("günlükleri sil") || commandLower.includes("gunlukleri sil")) {
      await prisma.log.deleteMany({ where: { userId } });
      actionResponse = `İşlem Başarılı. Sistem yöneticisi yetkisiyle tüm işlem günlükleri ve loglar temizlendi.`;
      actionFound = true;
    }
    // 3. Yedek Alma: "yedek al", "verileri yedekle"
    else if (commandLower.includes("yedek al") || commandLower.includes("verileri yedekle") || commandLower.includes("sistemi yedekle")) {
      actionResponse = `indir:/api/admin/backup`;
      actionFound = true;
    }
    // 4. Hukuki Analiz Tetikleme: "analiz et", "analiz yap"
    else if (commandLower.includes("analiz et") || commandLower.includes("analiz yap") || commandLower.includes("yol haritası çıkar")) {
      const lastDava = await prisma.dava.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      if (lastDava) {
        const baseUrl = req.url.split("/api/")[0];
        const res = await fetch(`${baseUrl}/api/dosyalar/${lastDava.id}/analiz`, {
          method: "POST",
          headers: { cookie: req.headers.get("cookie") || "" }
        });
        if (res.ok) {
          actionResponse = `İşlem Başarılı. Son davanız olan "${lastDava.ad}" için otonom yapay zeka analizi ve stratejik yol haritası oluşturuldu.`;
        } else {
          actionResponse = `Yapay zeka analizi başlatılamadı. Lütfen model ayarlarını kontrol edin.`;
        }
      } else {
        actionResponse = `Sistemde analiz edilecek dava dosyası bulunamadı.`;
      }
      actionFound = true;
    }
    // 5. Site Tarayıcı Tetikleme: "siteyi tara", "içtihatları güncelle"
    else if (commandLower.includes("siteyi tara") || commandLower.includes("içtihatları güncelle") || commandLower.includes("emsalleri tara")) {
      const res = await fetch(`${pythonUrl}/api/scraper/tara`, { method: "POST" });
      if (res.ok) {
        actionResponse = `İşlem Başarılı. Resmi Gazete ve Yargıtay emsal kararları tarayıcısı otonom olarak başlatıldı.`;
      } else {
        actionResponse = `Tarayıcılar başlatılamadı. Python backend bağlantısını kontrol edin.`;
      }
      actionFound = true;
    }
    // 6. Dava/Dosya Ekleme Sorgusu: "dosya ekle başlık [Dava Adı] no [Dosya No]"
    else if (commandLower.includes("dosya ekle") || commandLower.includes("dava ekle")) {
      const parts = commandLower.split(/dosya ekle|dava ekle/);
      const content = parts[1] || "";
      let ad = "Sesle Eklenen Dava";
      let dosyaNo = `DS-${Math.floor(1000 + Math.random() * 9000)}`;

      const adMatch = content.match(/ad[ı]?\s+([^\s]+)/);
      const noMatch = content.match(/no[s]?[u]?[m]?\s+([^\s]+)/);

      if (adMatch && adMatch[1]) ad = adMatch[1].toUpperCase();
      if (noMatch && noMatch[1]) dosyaNo = noMatch[1].toUpperCase();

      const newDava = await prisma.dava.create({
        data: {
          dosyaNo,
          ad,
          durum: "devam-ediyor",
          userId,
        },
      });
      // Otonom arka plan iş akışını tetikle
      otonomDavaIsle(newDava.id, userId).catch(console.error);

      actionResponse = `İşlem Başarılı. Yeni dava dosyası oluşturuldu: ${newDava.ad} (Dosya No: ${newDava.dosyaNo})`;
      actionFound = true;
    }
    // 7. Müvekkil Ekleme: "müvekkil ekle ad [Ad] soyad [Soyad]"
    else if (commandLower.includes("müvekkil ekle")) {
      const content = commandLower.split("müvekkil ekle")[1] || "";
      const adMatch = content.match(/ad\s+([^\s]+)/);
      const soyadMatch = content.match(/soyad\s+([^\s]+)/);

      const ad = adMatch ? adMatch[1].toUpperCase() : "SESLE";
      const soyad = soyadMatch ? soyadMatch[1].toUpperCase() : "EKLENEN";

      const newMusteri = await prisma.musteri.create({
        data: {
          ad,
          soyad,
          userId,
        },
      });
      actionResponse = `İşlem Başarılı. Yeni müvekkil kaydedildi: ${newMusteri.ad} ${newMusteri.soyad}`;
      actionFound = true;
    }
    // 8. Dosya Arama: "dosyaları listele" veya "dosya ara [anahtar]"
    else if (commandLower.includes("dosya listele") || commandLower.includes("dava listele")) {
      const davas = await prisma.dava.findMany({ where: { userId }, take: 5 });
      actionResponse = davas.length > 0 
        ? `Aktif davalarınız listeleniyor: ` + davas.map(d => `${d.ad} (${d.dosyaNo})`).join(", ")
        : "Sisteme kayıtlı davanız bulunmamaktadır.";
      actionFound = true;
    }
    // 9. Müvekkilleri Listeleme
    else if (commandLower.includes("müvekkil listele") || commandLower.includes("müvekkilleri listele")) {
      const musteriler = await prisma.musteri.findMany({ where: { userId }, take: 5 });
      actionResponse = musteriler.length > 0
        ? `Kayıtlı müvekkilleriniz: ` + musteriler.map(m => `${m.ad} ${m.soyad}`).join(", ")
        : "Kayıtlı müvekkiliniz bulunmamaktadır.";
      actionFound = true;
    }
    // 10. İş Ekleme: "iş ekle [başlık]"
    else if (commandLower.includes("iş ekle") || commandLower.includes("görev ekle")) {
      const baslik = commandLower.split(/iş ekle|görev ekle/)[1]?.trim() || "Sesli Görev";
      const newIs = await prisma.is.create({
        data: {
          baslik,
          durum: "bekliyor",
          oncelik: "orta",
          userId,
        },
      });
      actionResponse = `İşlem Başarılı. İş listenize yeni görev eklendi: "${newIs.baslik}"`;
      actionFound = true;
    }
    // 11. Masraf Ekleme: "masraf ekle [tutar] tl"
    else if (commandLower.includes("masraf ekle")) {
      const content = commandLower.split("masraf ekle")[1] || "";
      const tutarMatch = content.match(/(\d+)/);
      const tutar = tutarMatch ? parseFloat(tutarMatch[1]) : 0;
      if (tutar > 0) {
        const newMasraf = await prisma.masraf.create({
          data: {
            baslik: "Sesli Masraf Kaydı",
            tutar,
            kategori: "diger",
            userId,
          },
        });
        actionResponse = `İşlem Başarılı. ${newMasraf.tutar} TL tutarında masraf kaydı oluşturuldu.`;
      } else {
        actionResponse = `Masraf tutarını anlayamadım. Lütfen 'masraf ekle 500 tl' şeklinde söyleyin.`;
      }
      actionFound = true;
    }
  } catch (dbErr: any) {
    actionResponse = `Veritabanı işlem hatası: ${dbErr.message}`;
    actionFound = true;
  }

  // If a system action was processed, return it
  if (actionFound) {
    return NextResponse.json({ yanit: actionResponse });
  }

  // Navigation commands fallback
  let yonlendirme = "";
  if (commandLower.includes("dashboard") || commandLower.includes("anasayfa")) {
    yonlendirme = "yönlendirme:dashboard";
  } else if (commandLower.includes("dosya") || commandLower.includes("dava")) {
    yonlendirme = "yönlendirme:dosyalar";
  } else if (commandLower.includes("müvekkil") || commandLower.includes("musteri")) {
    yonlendirme = "yönlendirme:musteri";
  } else if (commandLower.includes("takvim") || commandLower.includes("duruşma")) {
    yonlendirme = "yönlendirme:takvim";
  } else if (commandLower.includes("asistan") || commandLower.includes("yapay zeka")) {
    yonlendirme = "yönlendirme:ai-asistan";
  } else if (commandLower.includes("iş") || commandLower.includes("is listesi")) {
    yonlendirme = "yönlendirme:isler";
  } else if (commandLower.includes("içtihat") || commandLower.includes("karar ara")) {
    yonlendirme = "yönlendirme:ictihat";
  } else if (commandLower.includes("belge") || commandLower.includes("oluştur")) {
    yonlendirme = "yönlendirme:belge-olustur";
  } else if (commandLower.includes("masraf") || commandLower.includes("gider")) {
    yonlendirme = "yönlendirme:masraflar";
  } else if (commandLower.includes("esmm") || commandLower.includes("serbest meslek")) {
    yonlendirme = "yönlendirme:esmm";
  } else if (commandLower.includes("fatura")) {
    yonlendirme = "yönlendirme:fatura";
  } else if (commandLower.includes("çıkış") || commandLower.includes("logout")) {
    yonlendirme = "cikis";
  }

  if (yonlendirme) {
    return NextResponse.json({ yanit: yonlendirme });
  }

  // AI Agent fallback: ask Ollama on local backend
  try {
    const [davas, musteris] = await Promise.all([
      prisma.dava.findMany({ where: { userId } }),
      prisma.musteri.findMany({ where: { userId } }),
    ]);

    let voiceContext = "";
    if (davas.length > 0) {
      voiceContext += `\nKayıtlı Davalarınız: ` + davas.map(d => `${d.ad} (${d.dosyaNo})`).join(", ");
    }
    if (musteris.length > 0) {
      voiceContext += `\nMüvekkilleriniz: ` + musteris.map(m => `${m.ad} ${m.soyad}`).join(", ");
    }

    const res = await fetch(`${pythonUrl}/api/ollama/sor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "apilex-hukuk",
        prompt: `Sen ALTU AI "Sistem Uzmanı" ve akıllı ses asistanısın. Görevin, kullanıcının söylediği her şeyi karşılıklı konuşarak yerine getirmektir. 
        Kritik sistem ayarlarını/yapılandırmalarını değiştirmek dışındaki tüm talepleri, sorguları ve yönetimsel görevleri doğrudan yanıtla ve yönlendir.
        
        Kullanıcı avukatın sistemindeki mevcut veriler:
        ${voiceContext || "Kayıtlı veri bulunmuyor."}
        
        Kullanıcının söylediği sesli komut/soru: "${komut}"
        
        KURALLAR:
        1. Sıcak, cana yakın, profesyonel bir sistem uzmanı gibi konuş.
        2. Yanıtın kısa, net ve doğrudan konuşma diline uygun olmalıdır (ses sentezleme ile okunacaktır).
        3. Kullanıcının talebini yerine getirmek için gerekirse ona karşılıklı konuşarak yönlendirmeler yap veya bilgi ver.
        4. Kritik sistem ayarlarını değiştirme talebi gelirse, bunun güvenlik sebebiyle sadece yönetim paneli üzerinden manuel yapılabileceğini kibarca belirt.
        
        SESLİ YANIT:`,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.response) {
        return NextResponse.json({ yanit: data.response });
      }
    }
  } catch {
    // If Python/Ollama fails, fall back to default response
  }

  return NextResponse.json({
    yanit: `Komutu tam olarak anlayamadım: "${komut}". İşlem yapabilmek için 'dosya ekle', 'müvekkil ekle', 'iş ekle', 'dosyaları listele' veya yönlendirme kelimelerini kullanabilirsiniz.`
  });
}

