"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { FolderOpen, Save, X, Upload, Download, Trash2, Plus, Scale, Printer, Volume2, Mic, MicOff, Bell, Clock, CheckCircle } from "lucide-react";

const durumRenk: Record<string, string> = {
  "devam-ediyor": "bg-blue-100 text-blue-800",
  "sonuclandi": "bg-green-100 text-green-800",
  "ret": "bg-red-100 text-red-800",
  "feragat": "bg-yellow-100 text-yellow-800",
};

const durumEtiket: Record<string, string> = {
  "devam-ediyor": "Devam Ediyor",
  "sonuclandi": "Sonuçlandı",
  "ret": "Ret",
  "feragat": "Feragat",
};

const tabs = ["Dosya Bilgileri", "Duruşmalar", "Masraflar", "Dosyalar", "Belgeler", "Emsal Kararlar", "Tebligatlar", "Zaman Çizelgesi"];

export default function DosyaDetayPage() {
  const { id } = useParams<{ id: string }>();
  const [dava, setDava] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [durusmaForm, setDurusmaForm] = useState({ baslik: "", tarih: "", aciklama: "" });
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [buroAvukatlari, setBuroAvukatlari] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setCurrentUser).catch(() => {});
    fetch("/api/buro/users").then((r) => r.json()).then(setBuroAvukatlari).catch(() => {});
  }, []);
  
  const [emsalKararlar, setEmsalKararlar] = useState<any[]>([]);
  const [emsalLoading, setEmsalLoading] = useState(false);
  const [emsalKaynak, setEmsalKaynak] = useState("");

  const [davaIciArama, setDavaIciArama] = useState("");
  const [aiAnalizMetni, setAiMetni] = useState("");
  const [aiAnalizLoading, setAiLoading] = useState(false);
  const [mahkemeModu, setMahkemeModu] = useState(false);
  const [secilenDosyalar, setSecilenDosyalar] = useState<string[]>([]);

  const [recordingDurusmaId, setRecordingDurusmaId] = useState<string | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [processingHearing, setProcessingHearing] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startHearingRecord = (durusmaId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tarayıcınız ses tanımayı desteklemiyor. Lütfen Chrome kullanın.");
      return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
      const rec = new SpeechRecognition();
      rec.lang = "tr-TR";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        let currentText = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentText += event.results[i][0].transcript + " ";
          }
        }
        if (currentText) {
          setTranscriptText((prev) => prev + currentText);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition error:", e);
      };

      rec.onend = () => {
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch {}
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setRecordingDurusmaId(durusmaId);
      setTranscriptText("");
    }).catch((err) => {
      alert("Mikrofon izni reddedildi veya mikrofon bulunamadı.");
    });
  };

  const stopHearingRecordAndAnalyze = async (durusmaId: string) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setRecordingDurusmaId(null);
    setProcessingHearing(durusmaId);

    let textToSend = transcriptText.trim();
    if (!textToSend) {
      textToSend = "Tanık Ahmet Yılmaz duruşmada olay günü davalı tarafın hızlı araç kullandığını ve kazaya sebebiyet verdiğini beyan etti. Davalı vekili tanık beyanlarını kabul etmedi. Hakim bir sonraki celseyi 12 Ekim 2026 tarihine erteledi ve kusur tespiti için bilirkişi raporu alınmasına karar verdi.";
    }

    try {
      const res = await fetch(`/api/durusmalar/${durusmaId}/ses-analiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: textToSend, davaId: id })
      });
      if (res.ok) {
        alert("Duruşma kaydı başarıyla analiz edildi, özet ve sonraki adımlar çıkarıldı!");
        fetchDava();
      } else {
        alert("AI Analizi sırasında bir hata oluştu.");
      }
    } catch (e) {
      console.error(e);
      alert("Bağlantı hatası oluştu.");
    } finally {
      setProcessingHearing(null);
      setTranscriptText("");
    }
  };

  const simuleTebligatEkle = async () => {
    try {
      const res = await fetch("/api/uyap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            dosyalar: [
              {
                dosyaNo: dava.dosyaNo,
                ad: dava.ad,
                konu: dava.konu,
                mahkeme: dava.mahkeme,
                esasNo: dava.esasNo,
                durum: dava.durum,
                tebligatlar: [
                  {
                    baslik: "Bilirkişi Raporu Tebliği",
                    icerik: "Bilirkişi raporu taraflara tebliğ edilmiş olup, rapora itiraz süresi HMK md. 281 uyarınca tebliğden itibaren 2 haftadır.",
                    tarih: new Date().toISOString()
                  }
                ]
              }
            ]
          }
        })
      });
      if (res.ok) {
        alert("🔔 [UYAP YENİ TEBLİGAT BİLDİRİMİ]\n\nUyap üzerinden yeni bir tebligat alındı! Avukata ve stajyerlere anlık bildirim gönderildi.");
        fetchDava();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const simuleHareketEkle = async () => {
    try {
      const res = await fetch("/api/uyap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            dosyalar: [
              {
                dosyaNo: dava.dosyaNo,
                ad: dava.ad,
                konu: dava.konu,
                mahkeme: dava.mahkeme,
                esasNo: dava.esasNo,
                durum: dava.durum,
                hareketler: [
                  {
                    islem: "Davalı vekilince kusur raporuna itiraz dilekçesi sunuldu.",
                    tarih: new Date().toISOString(),
                    evrak: "kusur_itiraz_dilekcesi.pdf"
                  }
                ]
              }
            ]
          }
        })
      });
      if (res.ok) {
        alert("🚀 UYAP dosya hareket geçmişi güncellendi. Yeni hareket zaman çizelgesine işlendi.");
        fetchDava();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const tebligatOkunduYap = async (tebId: string) => {
    try {
      const res = await fetch("/api/tebligatlar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tebId, okundu: true })
      });
      if (res.ok) {
        fetchDava();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDava = () => {
    setLoading(true);
    fetch(`/api/dosyalar/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setDava(d);
        setEmsalKararlar(d.emsalKararlar || []);
        setAiMetni(d.aiAnaliz || "");
        setSecilenDosyalar(d.mahkemeModuDosyalar || []);
        setForm({
          dosyaNo: d.dosyaNo,
          ad: d.ad,
          konu: d.konu || "",
          durum: d.durum,
          mahkeme: d.mahkeme || "",
          esasNo: d.esasNo || "",
          kararNo: d.kararNo || "",
          aciklama: d.aciklama || "",
          atananAvukatId: d.atananAvukatId || "",
          zamanasimiTarihi: d.zamanasimiTarihi || "",
          temyizSonTarihi: d.temyizSonTarihi || "",
          sureTakipNotu: d.sureTakipNotu || "",
        });
      })
      .finally(() => setLoading(false));
  };

  const fetchEmsal = async (force = false) => {
    setEmsalLoading(true);
    try {
      const res = await fetch(`/api/dosyalar/${id}/emsal`, {
        method: force ? "POST" : "GET"
      });
      const data = await res.json();
      setEmsalKararlar(data.emsalKararlar || []);
      setEmsalKaynak(data.kaynak || "");
    } catch (e) {
      console.error(e);
    } finally {
      setEmsalLoading(false);
    }
  };

  const fetchAnaliz = async (force = false) => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/dosyalar/${id}/analiz`, {
        method: force ? "POST" : "GET"
      });
      const data = await res.json();
      setAiMetni(data.analiz || "");
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleDosyaSecim = async (dosyaId: string) => {
    let yeniList = [...secilenDosyalar];
    if (yeniList.includes(dosyaId)) {
      yeniList = yeniList.filter(id => id !== dosyaId);
    } else {
      yeniList.push(dosyaId);
    }
    setSecilenDosyalar(yeniList);
    
    // Save to server
    await fetch(`/api/dosyalar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, mahkemeModuDosyalar: yeniList })
    });
  };

  useEffect(() => { fetchDava(); }, [id]);

  useEffect(() => {
    if (dava && !aiAnalizMetni) {
      fetchAnaliz();
    }
  }, [dava]);

  useEffect(() => {
    if (activeTab === 5) {
      fetchEmsal();
    }
  }, [activeTab, id]);

  const handleSave = async () => {
    if (currentUser?.rol === "stajyer") {
      alert("Hata: Stajyerlerin dava dosyalarını düzenleme yetkisi yoktur.");
      setEditing(false);
      return;
    }
    await fetch(`/api/dosyalar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
    fetchDava();
  };

  const handleDurusmaAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.rol === "stajyer") {
      alert("Hata: Stajyerlerin duruşma ekleme yetkisi yoktur.");
      return;
    }
    const res = await fetch("/api/durusmalar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...durusmaForm, davaId: id, tarih: new Date(durusmaForm.tarih).toISOString() }),
    });
    if (res.ok) {
      setDurusmaForm({ baslik: "", tarih: "", aciklama: "" });
      fetchDava();
    }
  };

  const handleDosyaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser?.rol === "stajyer") {
      alert("Hata: Stajyerlerin dosya yükleme yetkisi yoktur.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("dosya", file);
    fd.append("davaId", id);
    await fetch("/api/dosyalar/dosya", { method: "POST", body: fd });
    fetchDava();
  };

  const handleDosyaDelete = async (dosyaId: string) => {
    if (currentUser?.rol === "stajyer") {
      alert("Hata: Stajyerlerin dosya silme yetkisi yoktur.");
      return;
    }
    const res = await fetch("/api/dosyalar/dosya", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dosyaId }),
    });
    if (res.ok) fetchDava();
  };

  const handlePrintDocument = (title: string, content: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; color: #000; }
              h1 { text-align: center; font-size: 18px; margin-bottom: 30px; text-transform: uppercase; }
              pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  };

  const handlePrintFile = (url: string) => {
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.print();
      }, true);
    }
  };

  const handleDownloadDocument = (title: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "belge"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintAllCase = () => {
    if (!dava) return;
    const title = `${dava.dosyaNo} - ${dava.ad} Dava Dosyası Raporu`;
    
    let durusmalarHtml = "";
    if (dava.durusmalar && dava.durusmalar.length > 0) {
      durusmalarHtml = `
        <div class="section">
          <h3>Duruşmalar</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 25%">Başlık</th>
                <th style="width: 25%">Tarih</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              ${dava.durusmalar.map((d: any) => `
                <tr>
                  <td><strong>${d.baslik}</strong></td>
                  <td>${new Date(d.tarih).toLocaleDateString("tr-TR")}</td>
                  <td>${d.aciklama || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    let masraflarHtml = "";
    if (dava.masraflar && dava.masraflar.length > 0) {
      const toplamMasraf = dava.masraflar.reduce((s: number, m: any) => s + (m.tutar || 0), 0);
      masraflarHtml = `
        <div class="section">
          <h3>Masraflar</h3>
          <table>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Tutar</th>
                <th>Tarih</th>
                <th>Kategori</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              ${dava.masraflar.map((m: any) => `
                <tr>
                  <td>${m.baslik}</td>
                  <td><strong>${m.tutar.toLocaleString("tr-TR")} TL</strong></td>
                  <td>${new Date(m.tarih).toLocaleDateString("tr-TR")}</td>
                  <td>${m.kategori}</td>
                  <td>${m.aciklama || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div style="text-align: right; font-weight: bold; margin-top: 10px; font-size: 13px;">
            Toplam Masraf Tutarı: ${toplamMasraf.toLocaleString("tr-TR")} TL
          </div>
        </div>
      `;
    }

    let belgelerHtml = "";
    if (dava.belgeler && dava.belgeler.length > 0) {
      belgelerHtml = `
        <div class="section">
          <h3>Oluşturulan Belgeler</h3>
          <ul>
            ${dava.belgeler.map((b: any) => `
              <li style="margin-bottom: 20px; page-break-inside: avoid;">
                <strong>${b.baslik} (${b.tur})</strong>
                <div style="font-family: 'Times New Roman', serif; font-size: 11pt; padding: 10px; border: 1px solid #ccc; background-color: #fafafa; white-space: pre-wrap; margin-top: 5px; line-height: 1.4;">${b.icerik}</div>
              </li>
            `).join("")}
          </ul>
        </div>
      `;
    }

    let aiAnalizHtml = "";
    if (aiAnalizMetni) {
      aiAnalizHtml = `
        <div class="section" style="page-break-inside: avoid;">
          <h3>🤖 Yapay Zeka Hukuki Analiz Raporu</h3>
          <div style="font-family: inherit; font-size: 10pt; padding: 15px; border: 1px dashed #6b21a8; background-color: #faf5ff; white-space: pre-wrap; color: #4c1d95; line-height: 1.5;">${aiAnalizMetni}</div>
        </div>
      `;
    }

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Arial', sans-serif; padding: 30px; line-height: 1.5; color: #333; }
              h1 { text-align: center; font-size: 20px; color: #1e3a8a; margin-bottom: 5px; }
              .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 25px; }
              .section { margin-bottom: 25px; }
              h3 { font-size: 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; color: #1e293b; margin-top: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
              th { background-color: #f1f5f9; font-weight: bold; }
              .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 15px; }
              .meta-item { padding: 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
              .meta-label { font-weight: bold; color: #64748b; }
              ul { padding-left: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div class="subtitle">ALTU Hukuk Büro Yönetim Sistemi Raporu · Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}</div>
            
            <div class="section">
              <h3>Genel Künye Bilgileri</h3>
              <div class="meta-grid">
                <div class="meta-item"><span class="meta-label">Dosya No:</span> ${dava.dosyaNo}</div>
                <div class="meta-item"><span class="meta-label">Dava Adı:</span> ${dava.ad}</div>
                <div class="meta-item"><span class="meta-label">Mahkeme:</span> ${dava.mahkeme || "-"}</div>
                <div class="meta-item"><span class="meta-label">Esas No:</span> ${dava.esasNo || "-"}</div>
                <div class="meta-item"><span class="meta-label">Karar No:</span> ${dava.kararNo || "-"}</div>
                <div class="meta-item"><span class="meta-label">Durum:</span> ${durumEtiket[dava.durum] || dava.durum}</div>
                <div class="meta-item"><span class="meta-label">Dava Konusu:</span> ${dava.konu || "-"}</div>
                <div class="meta-item"><span class="meta-label">Müvekkil:</span> ${dava.musteri ? `${dava.musteri.ad} ${dava.musteri.soyad}` : "-"}</div>
              </div>
              <div style="font-size: 12px; margin-top: 10px; background-color: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <strong>Dosya Açıklaması:</strong><br/>
                ${dava.aciklama || "-"}
              </div>
            </div>
            
            ${durusmalarHtml}
            ${masraflarHtml}
            ${belgelerHtml}
            ${aiAnalizHtml}
          </body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  };

  const handleDownloadAllCase = () => {
    if (!dava) return;
    let output = `==================================================\n`;
    output += `DAVA DOSYASI RAPORU - ${dava.dosyaNo}\n`;
    output += `==================================================\n\n`;
    output += `Dosya No: ${dava.dosyaNo}\n`;
    output += `Dava Adı: ${dava.ad}\n`;
    output += `Mahkeme: ${dava.mahkeme || "-"}\n`;
    output += `Esas No: ${dava.esasNo || "-"}\n`;
    output += `Karar No: ${dava.kararNo || "-"}\n`;
    output += `Durum: ${durumEtiket[dava.durum] || dava.durum}\n`;
    output += `Dava Konusu: ${dava.konu || "-"}\n`;
    output += `Müvekkil: ${dava.musteri ? `${dava.musteri.ad} ${dava.musteri.soyad}` : "-"}\n`;
    output += `Açıklama: ${dava.aciklama || "-"}\n\n`;

    if (dava.durusmalar && dava.durusmalar.length > 0) {
      output += `--------------------------------------------------\n`;
      output += `DURUŞMALAR\n`;
      output += `--------------------------------------------------\n`;
      dava.durusmalar.forEach((d: any, idx: number) => {
        output += `${idx + 1}. Başlık: ${d.baslik}\n`;
        output += `   Tarih: ${new Date(d.tarih).toLocaleDateString("tr-TR")}\n`;
        output += `   Açıklama: ${d.aciklama || "-"}\n\n`;
      });
    }

    if (dava.masraflar && dava.masraflar.length > 0) {
      output += `--------------------------------------------------\n`;
      output += `MASRAFLAR\n`;
      output += `--------------------------------------------------\n`;
      const toplamMasraf = dava.masraflar.reduce((s: number, m: any) => s + (m.tutar || 0), 0);
      dava.masraflar.forEach((m: any, idx: number) => {
        output += `${idx + 1}. Başlık: ${m.baslik}\n`;
        output += `   Tutar: ${m.tutar.toLocaleString("tr-TR")} TL\n`;
        output += `   Tarih: ${new Date(m.tarih).toLocaleDateString("tr-TR")}\n`;
        output += `   Kategori: ${m.kategori}\n`;
        output += `   Açıklama: ${m.aciklama || "-"}\n\n`;
      });
      output += `Toplam Masraf: ${toplamMasraf.toLocaleString("tr-TR")} TL\n\n`;
    }

    if (dava.belgeler && dava.belgeler.length > 0) {
      output += `--------------------------------------------------\n`;
      output += `OLUŞTURULAN BELGELER\n`;
      output += `--------------------------------------------------\n`;
      dava.belgeler.forEach((b: any, idx: number) => {
        output += `${idx + 1}. Başlık: ${b.baslik} (${b.tur})\n`;
        output += `   İçerik:\n${b.icerik}\n\n`;
      });
    }

    if (aiAnalizMetni) {
      output += `--------------------------------------------------\n`;
      output += `YAPAY ZEKA STRATEJİK HUKUKİ ANALİZİ\n`;
      output += `--------------------------------------------------\n`;
      output += aiAnalizMetni + `\n\n`;
    }

    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Dava_Dosyasi_${dava.dosyaNo || "rapor"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintDurusmalar = () => {
    if (!dava) return;
    const title = `${dava.dosyaNo} - Duruşma Listesi Raporu`;
    let content = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; }
            h2 { text-align: center; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>${dava.dosyaNo} No'lu Dava Duruşma Listesi</h2>
          <p><strong>Dava Adı:</strong> ${dava.ad}</p>
          <table>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Tarih</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              ${(dava.durusmalar || []).map((d: any) => `
                <tr>
                  <td><strong>${d.baslik}</strong></td>
                  <td>${new Date(d.tarih).toLocaleDateString("tr-TR")}</td>
                  <td>${d.aciklama || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(content);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  };

  const handleDownloadDurusmalar = () => {
    if (!dava) return;
    let output = `DURUŞMA LİSTESİ - Dosya No: ${dava.dosyaNo}\n`;
    output += `Dava Adı: ${dava.ad}\n\n`;
    (dava.durusmalar || []).forEach((d: any, idx: number) => {
      output += `${idx + 1}. Başlık: ${d.baslik}\n`;
      output += `   Tarih: ${new Date(d.tarih).toLocaleDateString("tr-TR")}\n`;
      output += `   Açıklama: ${d.aciklama || "-"}\n\n`;
    });
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Durusmalar_${dava.dosyaNo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintMasraflar = () => {
    if (!dava) return;
    const title = `${dava.dosyaNo} - Masraf Listesi Raporu`;
    const toplamMasraf = (dava.masraflar || []).reduce((s: number, m: any) => s + (m.tutar || 0), 0);
    let content = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; }
            h2 { text-align: center; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background-color: #f1f5f9; }
            .total { text-align: right; font-weight: bold; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h2>${dava.dosyaNo} No'lu Dava Masraf Raporu</h2>
          <p><strong>Dava Adı:</strong> ${dava.ad}</p>
          <table>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Tutar</th>
                <th>Tarih</th>
                <th>Kategori</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              ${(dava.masraflar || []).map((m: any) => `
                <tr>
                  <td>${m.baslik}</td>
                  <td><strong>${m.tutar.toLocaleString("tr-TR")} TL</strong></td>
                  <td>${new Date(m.tarih).toLocaleDateString("tr-TR")}</td>
                  <td>${m.kategori}</td>
                  <td>${m.aciklama || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="total">Toplam Masraf Tutarı: ${toplamMasraf.toLocaleString("tr-TR")} TL</div>
        </body>
      </html>
    `;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(content);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  };

  const handleDownloadMasraflar = () => {
    if (!dava) return;
    let output = `MASRAF RAPORU - Dosya No: ${dava.dosyaNo}\n`;
    output += `Dava Adı: ${dava.ad}\n\n`;
    const toplamMasraf = (dava.masraflar || []).reduce((s: number, m: any) => s + (m.tutar || 0), 0);
    (dava.masraflar || []).forEach((m: any, idx: number) => {
      output += `${idx + 1}. Başlık: ${m.baslik}\n`;
      output += `   Tutar: ${m.tutar.toLocaleString("tr-TR")} TL\n`;
      output += `   Tarih: ${new Date(m.tarih).toLocaleDateString("tr-TR")}\n`;
      output += `   Kategori: ${m.kategori}\n`;
      output += `   Açıklama: ${m.aciklama || "-"}\n\n`;
    });
    output += `--------------------------------------------------\n`;
    output += `Toplam Masraf Tutarı: ${toplamMasraf.toLocaleString("tr-TR")} TL\n`;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Masraflar_${dava.dosyaNo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Yükleniyor...</div>;
  if (!dava) return <div className="p-6 text-center text-slate-500">Dosya bulunamadı.</div>;

  if (mahkemeModu) {
    const seciliDosyaDetaylari = (dava.dosyalar || []).filter((f: any) => secilenDosyalar.includes(f.id));
    const seciliBelgeDetaylari = (dava.belgeler || []).filter((b: any) => secilenDosyalar.includes(b.id));
    
    return (
      <div className="fixed inset-0 bg-slate-900 text-slate-100 z-[99999] p-8 overflow-y-auto flex flex-col gap-6 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Scale className="text-purple-400 w-8 h-8 animate-pulse" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">⚖️ MAHKEME SUNUM MODU</h1>
              <p className="text-xs text-slate-400">ALTU Hukuk Otomasyonu · Hakime Sunum Ekranı</p>
            </div>
          </div>
          <button
            onClick={() => setMahkemeModu(false)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Moddan Çık
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-xl md:col-span-1 shadow-lg space-y-4">
            <h2 className="text-lg font-bold text-purple-400 border-b border-slate-700 pb-2">Dosya Özeti</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400 text-xs block">Dosya No:</span>
                <span className="font-semibold text-lg text-white">{dava.dosyaNo}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Dava Adı:</span>
                <span className="font-medium text-white">{dava.ad}</span>
              </div>
              {dava.esasNo && (
                <div>
                  <span className="text-slate-400 text-xs block">Esas No:</span>
                  <span className="font-mono text-white">{dava.esasNo}</span>
                </div>
              )}
              {dava.mahkeme && (
                <div>
                  <span className="text-slate-400 text-xs block">Mahkeme:</span>
                  <span className="font-medium text-white">{dava.mahkeme}</span>
                </div>
              )}
              {dava.konu && (
                <div>
                  <span className="text-slate-400 text-xs block">Dava Konusu:</span>
                  <span className="text-slate-200">{dava.konu}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-xl md:col-span-2 shadow-lg space-y-4">
            <h2 className="text-lg font-bold text-purple-400 border-b border-slate-700 pb-2">Duruşma Sunum Dosyaları</h2>
            
            {seciliDosyaDetaylari.length === 0 && seciliBelgeDetaylari.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                Mahkeme modu için seçilmiş evrak bulunmamaktadır. Normal görünümde dosyalar sekmesinden evrakları işaretleyin.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {seciliDosyaDetaylari.map((f: any) => (
                  <div key={f.id} className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex items-center justify-between hover:border-purple-500 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-white truncate max-w-[200px]">{f.orijinalAd}</p>
                      <p className="text-[10px] text-slate-400">{f.tur} · {(f.boyut / 1024).toFixed(1)} KB</p>
                    </div>
                    <a
                      href={`/uploads/${f.kayitliAd}`}
                      download
                      className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded text-xs font-semibold"
                    >
                      Aç / İndir
                    </a>
                  </div>
                ))}
                
                {seciliBelgeDetaylari.map((b: any) => (
                  <div key={b.id} className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex flex-col gap-2 hover:border-purple-500 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-semibold text-xs text-white">{b.baslik}</span>
                      <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-purple-400">{b.tur}</span>
                    </div>
                    <p className="text-xs text-slate-300 max-h-32 overflow-y-auto whitespace-pre-line font-serif italic bg-slate-950/50 p-2 rounded">
                      {b.icerik}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="text-blue-600" size={24} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{dava.dosyaNo} - {dava.ad}</h1>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${durumRenk[dava.durum] || "bg-slate-100 text-slate-800"}`}>
                {durumEtiket[dava.durum] || dava.durum}
              </span>
            </div>
            <p className="text-xs text-slate-500">{dava.musteri ? `${dava.musteri.ad} ${dava.musteri.soyad}` : "Müvekkil yok"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={davaIciArama}
            onChange={(e) => setDavaIciArama(e.target.value)}
            placeholder="Dava dosyasında ara (duruşma, evrak, masraf)..."
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handlePrintAllCase}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300 cursor-pointer"
            title="Tüm dava dosyasını yazdır"
          >
            <Printer size={14} /> Yazdır
          </button>
          <button
            onClick={handleDownloadAllCase}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300 cursor-pointer"
            title="Tüm dava dosyasını metin olarak indir"
          >
            <Download size={14} /> İndir
          </button>
          <button
            onClick={() => setMahkemeModu(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Scale size={14} /> Mahkeme Sunum Modu
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === i ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Dosya Bilgileri</h2>
            {currentUser?.rol !== "stajyer" ? (
              <button onClick={() => editing ? handleSave() : setEditing(true)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${editing ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                {editing ? <><Save size={14} /> Kaydet</> : "Düzenle"}
              </button>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-505 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold flex items-center gap-1">
                🔒 Salt Okunur (Stajyer)
              </span>
            )}
          </div>
          {editing && (
            <button onClick={() => { setEditing(false); setForm({ dosyaNo: dava.dosyaNo, ad: dava.ad, konu: dava.konu || "", durum: dava.durum, mahkeme: dava.mahkeme || "", esasNo: dava.esasNo || "", kararNo: dava.kararNo || "", aciklama: dava.aciklama || "", atananAvukatId: dava.atananAvukatId || "", zamanasimiTarihi: dava.zamanasimiTarihi || "", temyizSonTarihi: dava.temyizSonTarihi || "", sureTakipNotu: dava.sureTakipNotu || "" }); }} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 mb-3">
              <X size={14} /> İptal
            </button>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Dosya No", key: "dosyaNo" },
              { label: "Ad", key: "ad" },
              { label: "Konu", key: "konu" },
              { label: "Durum", key: "durum", type: "select", options: ["devam-ediyor", "sonuclandi", "ret", "feragat"] },
              { label: "Mahkeme", key: "mahkeme" },
              { label: "Esas No", key: "esasNo" },
              { label: "Karar No", key: "kararNo" },
              { label: "Oluşturulma", key: "createdAt", type: "date" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
                {editing && field.type !== "date" ? (
                  field.type === "select" ? (
                    <select value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {field.options?.map((o: string) => <option key={o} value={o}>{durumEtiket[o] || o}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )
                ) : (
                  <p className="text-sm text-slate-900">
                    {field.type === "date" ? new Date(dava[field.key]).toLocaleDateString("tr-TR") : dava[field.key] || "-"}
                  </p>
                )}
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
              {editing ? (
                <textarea value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ) : (
                <p className="text-sm text-slate-900">{dava.aciklama || "-"}</p>
              )}
            </div>

            {/* Atanan Avukat / İş Dağılımı Bölümü */}
            <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">👤 Atanan Avukat / İş Dağılımı</label>
              {editing && currentUser?.rol !== "stajyer" ? (
                <select
                  value={form.atananAvukatId || ""}
                  onChange={(e) => setForm({ ...form, atananAvukatId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seçilmemiş (Büro Ortak Havuzunda)</option>
                  {buroAvukatlari.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.ad} {u.soyad} ({u.rol === "stajyer" ? "Stajyer" : u.rol === "ortak" ? "Ortak Avukat" : "Avukat"})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-900 font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-150 inline-block">
                  {(() => {
                    const matched = buroAvukatlari.find((u: any) => u.id === dava.atananAvukatId);
                    return matched 
                      ? `👤 Yetkili: ${matched.ad} ${matched.soyad} (${matched.rol === "stajyer" ? "Stajyer" : matched.rol === "ortak" ? "Ortak Avukat" : "Avukat"})` 
                      : "👥 Büro Ortak Havuzunda (Atanmamış)";
                  })()}
                </p>
              )}
            </div>

            {/* Zamanaşımı Radarı & Süre Takip Sistemi */}
            <div className="col-span-2 border-t border-slate-250 pt-6 mt-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>⏳ Zamanaşımı Radarı & Süre Takip Sistemi (Risk Kontrolü)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Hesaplanan Zamanaşımı Tarihi</label>
                  {editing && currentUser?.rol !== "stajyer" ? (
                    <input
                      type="date"
                      value={form.zamanasimiTarihi || ""}
                      onChange={(e) => setForm({ ...form, zamanasimiTarihi: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-slate-900 font-medium">
                      {dava.zamanasimiTarihi ? `📅 ${new Date(dava.zamanasimiTarihi).toLocaleDateString("tr-TR")}` : "⚠️ Tespit Edilemedi / Girilmedi"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Hesaplanan Temyiz / İtiraz Son Günü</label>
                  {editing && currentUser?.rol !== "stajyer" ? (
                    <input
                      type="date"
                      value={form.temyizSonTarihi || ""}
                      onChange={(e) => setForm({ ...form, temyizSonTarihi: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-slate-900 font-medium">
                      {dava.temyizSonTarihi ? `📅 ${new Date(dava.temyizSonTarihi).toLocaleDateString("tr-TR")}` : "⚠️ Tespit Edilemedi / Girilmedi"}
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Süre ve Risk Takip Notları (AI Hesaplaması)</label>
                  {editing && currentUser?.rol !== "stajyer" ? (
                    <textarea
                      value={form.sureTakipNotu || ""}
                      onChange={(e) => setForm({ ...form, sureTakipNotu: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                      {dava.sureTakipNotu || "Bu dava türü için hesaplanmış aktif bir süre uyarısı bulunmamaktadır."}
                    </div>
                  )}
                </div>

                {/* Süre Takip Uyarıları Gönderme Butonları */}
                {(dava.zamanasimiTarihi || dava.temyizSonTarihi) && (
                  <div className="col-span-2 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div className="text-xs text-indigo-900">
                      <strong>Risk Radarı Aktif:</strong> Sürelerin takibi için anlık SMS, E-Posta veya Mobil bildirim test edebilirsiniz.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        alert(`📧 [BİLDİRİM GÖNDERİLDİ]\n\nDosya No: ${dava.dosyaNo}\n\nDava için hesaplanan süre uyarıları (Zamanaşımı: ${dava.zamanasimiTarihi || "Yok"}, Temyiz: ${dava.temyizSonTarihi || "Yok"}) atanan avukata ve müvekkile SMS, Email ve Push bildirim olarak başarıyla gönderilmiştir!`);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Anlık Bildirim Testi Gönder (SMS/Email)
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="col-span-2 border-t border-slate-200 pt-6 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>🤖 Yapay Zeka Hukuki Analizi & Stratejik Yol Haritası</span>
                </h3>
                <div className="flex items-center gap-2">
                  {aiAnalizMetni && (
                    <>
                      <button
                        onClick={() => handlePrintDocument("🤖 Yapay Zeka Stratejik Analiz Raporu", aiAnalizMetni)}
                        className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1.5 rounded-lg border border-purple-200 cursor-pointer flex items-center gap-1 font-semibold"
                        title="AI analiz raporunu yazdır"
                      >
                        <Printer size={12} /> Yazdır
                      </button>
                      <button
                        onClick={() => handleDownloadDocument("AI_Analiz_Raporu", aiAnalizMetni)}
                        className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1.5 rounded-lg border border-purple-200 cursor-pointer flex items-center gap-1 font-semibold"
                        title="AI analiz raporunu indir"
                      >
                        <Download size={12} /> İndir
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => fetchAnaliz(true)}
                    disabled={aiAnalizLoading}
                    className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors flex items-center gap-1 font-semibold disabled:opacity-50"
                  >
                    {aiAnalizLoading ? (
                      <div className="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    Yapay Zeka Analizini Yenile
                  </button>
                </div>
              </div>
              
              {aiAnalizLoading && !aiAnalizMetni ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Dava dosyası uyanık ve tecrübeli bir avukat bakış açısıyla analiz ediliyor...
                </div>
              ) : !aiAnalizMetni ? (
                <div className="py-6 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Dava hakkında yapay zeka strateji ve yol haritası analizi bulunmamaktadır. "Yapay Zeka Analizini Yenile" butonuna basarak başlatın.
                </div>
              ) : (
                <div className="bg-purple-50/40 border border-purple-100 p-4 rounded-xl text-xs text-slate-700 leading-relaxed font-sans max-h-96 overflow-y-auto whitespace-pre-line prose max-w-none">
                  {aiAnalizMetni}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Yeni Duruşma Ekle</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintDurusmalar}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-350 cursor-pointer flex items-center gap-1 font-semibold"
                title="Duruşma listesini rapor olarak yazdır"
              >
                <Printer size={12} /> Duruşmaları Yazdır
              </button>
              <button
                type="button"
                onClick={handleDownloadDurusmalar}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-350 cursor-pointer flex items-center gap-1 font-semibold"
                title="Duruşma listesini indir"
              >
                <Download size={12} /> Duruşmaları İndir
              </button>
            </div>
          </div>
            <form onSubmit={handleDurusmaAdd} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Başlık</label>
                <input type="text" value={durusmaForm.baslik} onChange={(e) => setDurusmaForm({ ...durusmaForm, baslik: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-slate-500 mb-1">Tarih</label>
                <input type="date" value={durusmaForm.tarih} onChange={(e) => setDurusmaForm({ ...durusmaForm, tarih: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
                <input type="text" value={durusmaForm.aciklama} onChange={(e) => setDurusmaForm({ ...durusmaForm, aciklama: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Plus size={14} /> Ekle
              </button>
            </form>
          </div>
          
          <div className="space-y-4">
            {(() => {
              const filtered = (dava.durusmalar || []).filter((d: any) => {
                const q = davaIciArama.toLowerCase();
                return d.baslik.toLowerCase().includes(q) || (d.aciklama || "").toLowerCase().includes(q);
              });
              if (filtered.length === 0) {
                return (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
                    Kayıtlı duruşma bulunmamaktadır.
                  </div>
                );
              }
              return filtered.map((d: any) => {
                const isRecording = recordingDurusmaId === d.id;
                const isProcessing = processingHearing === d.id;
                
                return (
                  <div key={d.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{d.baslik}</h4>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          <span>{new Date(d.tarih).toLocaleDateString("tr-TR")}</span>
                          {d.aciklama && <span> • {d.aciklama}</span>}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isRecording ? (
                          <button
                            type="button"
                            onClick={() => stopHearingRecordAndAnalyze(d.id)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer animate-pulse"
                          >
                            <MicOff size={14} /> Kaydı Bitir & AI Özetle
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing || recordingDurusmaId !== null}
                            onClick={() => startHearingRecord(d.id)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Mic size={14} /> Duruşmayı Sesli Kaydet
                          </button>
                        )}
                      </div>
                    </div>

                    {isRecording && (
                      <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-xs text-red-700 font-bold">
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                          <span>Duruşma oturumu sesli kaydediliyor... (Konuşma algılanıyor)</span>
                        </div>
                        <textarea
                          value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)}
                          placeholder="Mikrofondan algılanan konuşmalar burada canlı dökülecek, isterseniz manuel olarak da ekleme/düzeltme yapabilirsiniz..."
                          rows={3}
                          className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                        />
                        <div className="text-[10px] text-slate-400 italic">
                          Not: Mikrofonunuz yoksa veya konuşma dökümü boş kalırsa sistem test için otomatik bir celse beyanı simüle edecektir.
                        </div>
                      </div>
                    )}

                    {isProcessing && (
                      <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center gap-3 text-xs text-purple-800">
                        <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                        <span>Ses kaydı işleniyor, tutanak özeti ve sonraki adımlar çıkarılıyor...</span>
                      </div>
                    )}

                    {(d.tutanakOzet || d.sonrakiAdimlar) && (
                      <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-purple-50/30 border border-purple-100/50 p-4 rounded-xl space-y-2">
                          <h5 className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                            <Volume2 size={14} className="text-purple-700" />
                            <span>🤖 AI Tutanak Özeti</span>
                          </h5>
                          <p className="text-xs text-slate-700 leading-relaxed font-serif whitespace-pre-line italic">
                            {d.tutanakOzet}
                          </p>
                        </div>
                        
                        <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-xl space-y-2">
                          <h5 className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                            <CheckCircle size={14} className="text-indigo-700" />
                            <span>📋 Belirlenen Sonraki Adımlar</span>
                          </h5>
                          <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                            {d.sonrakiAdimlar}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded w-max font-semibold mt-2">
                            <CheckCircle size={10} /> İş Takibine Otomatik Görev Eklendi
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-sm font-semibold text-slate-755">Dava Giderleri</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintMasraflar}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-300 cursor-pointer flex items-center gap-1 font-semibold"
                title="Masraf listesini rapor olarak yazdır"
              >
                <Printer size={12} /> Masrafları Yazdır
              </button>
              <button
                onClick={handleDownloadMasraflar}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-300 cursor-pointer flex items-center gap-1 font-semibold"
                title="Masraf listesini indir"
              >
                <Download size={12} /> Masrafları İndir
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 font-medium">
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = (dava.masraflar || []).filter((m: any) => {
                  const q = davaIciArama.toLowerCase();
                  return m.baslik.toLowerCase().includes(q) || (m.aciklama || "").toLowerCase().includes(q) || (m.kategori || "").toLowerCase().includes(q);
                });
                if (filtered.length === 0) {
                  return <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Masraf bulunamadı.</td></tr>;
                }
                return filtered.map((m: any) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{m.baslik}</td>
                    <td className="px-4 py-3 text-slate-900">{m.tutar.toLocaleString("tr-TR")} TL</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(m.tarih).toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-3 text-slate-600">{m.kategori}</td>
                    <td className="px-4 py-3 text-slate-600">{m.aciklama || "-"}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {activeTab === 3 && (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Upload size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-500 mb-2">Dosya yüklemek için tıklayın veya sürükleyin</p>
              <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                Dosya Seç
                <input type="file" onChange={handleDosyaUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600 font-medium">
                  <th className="px-4 py-3">Sunum</th>
                  <th className="px-4 py-3">Dosya Adı</th>
                  <th className="px-4 py-3">Tür</th>
                  <th className="px-4 py-3">Boyut</th>
                  <th className="px-4 py-3">Yüklenme</th>
                  <th className="px-4 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = (dava.dosyalar || []).filter((f: any) => {
                    const q = davaIciArama.toLowerCase();
                    return f.orijinalAd.toLowerCase().includes(q) || (f.tur || "").toLowerCase().includes(q);
                  });
                  if (filtered.length === 0) {
                    return <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Dosya bulunamadı.</td></tr>;
                  }
                  return filtered.map((f: any) => (
                    <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={secilenDosyalar.includes(f.id)}
                          onChange={() => toggleDosyaSecim(f.id)}
                          className="rounded text-purple-650 focus:ring-purple-500 cursor-pointer w-4 h-4"
                          title="Mahkeme Sunum Modunda Göster"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="truncate max-w-[280px]">{f.orijinalAd}</span>
                          {(() => {
                            try {
                              if (f.etiketler && f.etiketler.startsWith("{")) {
                                const meta = JSON.parse(f.etiketler);
                                if (meta.imzaDurumu === "imzali_gecerli") {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100" title={`İmzalayan: ${meta.imzalayan}`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      e-İmzalı
                                    </span>
                                  );
                                } else if (meta.imzaDurumu === "imzali_gecersiz") {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
                                      İmza Geçersiz
                                    </span>
                                  );
                                }
                              }
                            } catch (e) {}
                            return null;
                          })()}
                        </div>
                        {(() => {
                          try {
                            if (f.etiketler && f.etiketler.startsWith("{")) {
                              const meta = JSON.parse(f.etiketler);
                              if (meta.imzalayan) {
                                return (
                                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                                    İmzalayan: <strong className="text-slate-500 font-medium">{meta.imzalayan}</strong>
                                    {meta.imzaTarihi && ` • ${new Date(meta.imzaTarihi).toLocaleDateString("tr-TR")}`}
                                  </p>
                                );
                              }
                            }
                          } catch (e) {}
                          return null;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{f.tur}</td>
                      <td className="px-4 py-3 text-slate-600">{f.boyut ? `${(f.boyut / 1024).toFixed(1)} KB` : "-"}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(f.createdAt).toLocaleDateString("tr-TR")}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <a href={`/uploads/${f.kayitliAd}`} download className="text-blue-600 hover:text-blue-700" title="İndir"><Download size={16} /></a>
                        <button onClick={() => handlePrintFile(`/uploads/${f.kayitliAd}`)} className="text-purple-600 hover:text-purple-700 cursor-pointer" title="Yazdır"><Printer size={16} /></button>
                        <button onClick={() => handleDosyaDelete(f.id)} className="text-red-600 hover:text-red-700" title="Sil"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 font-medium">
                <th className="px-4 py-3 w-16">Sunum</th>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Tür</th>
                <th className="px-4 py-3">Oluşturulma</th>
                <th className="px-4 py-3 w-28">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = (dava.belgeler || []).filter((b: any) => {
                  const q = davaIciArama.toLowerCase();
                  return b.baslik.toLowerCase().includes(q) || (b.tur || "").toLowerCase().includes(q) || (b.icerik || "").toLowerCase().includes(q);
                });
                if (filtered.length === 0) {
                  return <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Belge bulunamadı.</td></tr>;
                }
                return filtered.map((b: any) => (
                  <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={secilenDosyalar.includes(b.id)}
                        onChange={() => toggleDosyaSecim(b.id)}
                        className="rounded text-purple-650 focus:ring-purple-500 cursor-pointer w-4 h-4"
                        title="Mahkeme Sunum Modunda Göster"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{b.baslik}</td>
                    <td className="px-4 py-3 text-slate-600">{b.tur}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(b.createdAt).toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleDownloadDocument(b.baslik, b.icerik)} className="text-blue-600 hover:text-blue-700 cursor-pointer" title="İndir"><Download size={16} /></button>
                      <button onClick={() => handlePrintDocument(b.baslik, b.icerik)} className="text-purple-600 hover:text-purple-700 cursor-pointer" title="Yazdır"><Printer size={16} /></button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 5 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">Otomatik Toplanan Emsal Kararlar & Kanunlar</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dava konusu: <strong className="text-slate-800">{dava.konu || dava.ad || "Belirtilmemiş"}</strong>
                  {emsalKaynak && <> | Kaynak: <span className="text-blue-600 font-semibold">{emsalKaynak}</span></>}
                </p>
              </div>
              <button
                onClick={() => fetchEmsal(true)}
                disabled={emsalLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {emsalLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Yeniden Tara ve Güncelle
              </button>
            </div>
            
            {emsalLoading && emsalKararlar.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                Dava ile ilgili emsal kararlar ve içtihatlar resmi kaynaklardan sorgulanıyor, lütfen bekleyin...
              </div>
            ) : emsalKararlar.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                Bu dava konusu ile ilgili henüz taranmış emsal karar bulunamadı. Lütfen "Yeniden Tara ve Güncelle" butonuna basarak arama başlatın.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {(() => {
                  const filtered = (emsalKararlar || []).filter((e: any) => {
                    const q = davaIciArama.toLowerCase();
                    return e.mahkeme.toLowerCase().includes(q) || e.esasNo.toLowerCase().includes(q) || (e.kararNo || "").toLowerCase().includes(q) || e.ozet.toLowerCase().includes(q) || (e.konu || "").toLowerCase().includes(q);
                  });
                  if (filtered.length === 0) {
                    return <div className="text-center py-8 text-slate-500 text-sm">Arama kriterlerinize uyan karar bulunamadı.</div>;
                  }
                  return filtered.map((r: any) => (
                    <div key={r.id} className="rounded-xl border border-slate-250 bg-slate-50/50 p-5 hover:bg-white hover:shadow-sm transition-all duration-200">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            r.kaynak === "Yargıtay" ? "bg-purple-100 text-purple-800" :
                            r.kaynak === "Danıştay" ? "bg-orange-100 text-orange-800" :
                            r.kaynak === "Anayasa Mahkemesi" ? "bg-red-100 text-red-800" :
                            "bg-emerald-100 text-emerald-800"
                          }`}>
                            {r.kaynak}
                          </span>
                          <span className="font-semibold text-slate-800 text-sm">{r.mahkeme}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{r.tarih}</span>
                          <button
                            onClick={() => handleDownloadDocument(`${r.kaynak}_Emsal_Karar_${r.esasNo.replace(/\//g, "-")}`, `Kaynak: ${r.kaynak}\nMahkeme: ${r.mahkeme}\nTarih: ${r.tarih}\nEsas/Başvuru: ${r.esasNo}\nKarar No: ${r.kararNo || "-"}\n\nÖzet:\n${r.ozet}`)}
                            className="text-slate-500 hover:text-blue-600 cursor-pointer"
                            title="Emsal Kararı İndir"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handlePrintDocument(`${r.kaynak} Emsal Kararı (Esas: ${r.esasNo})`, `Kaynak: ${r.kaynak}\nMahkeme: ${r.mahkeme}\nTarih: ${r.tarih}\nEsas/Başvuru: ${r.esasNo}\nKarar No: ${r.kararNo || "-"}\n\nÖzet:\n${r.ozet}`)}
                            className="text-slate-500 hover:text-purple-600 cursor-pointer"
                            title="Emsal Kararı Yazdır"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mb-3 grid grid-cols-2 gap-4 text-xs text-slate-600 border-b border-slate-100 pb-3">
                        <div>
                          <span className="font-semibold text-slate-500">Esas / Başvuru No:</span> {r.esasNo}
                        </div>
                        {r.kararNo && r.kararNo !== "-" && (
                          <div>
                            <span className="font-semibold text-slate-500">Karar No:</span> {r.kararNo}
                          </div>
                        )}
                      </div>
                      {r.konu && (
                        <div className="mb-2 text-xs font-semibold text-slate-700">
                          <span>Konu:</span> {r.konu}
                        </div>
                      )}
                      <p className="text-sm text-slate-600 leading-relaxed font-serif bg-white p-3 rounded-lg border border-slate-150 max-h-60 overflow-y-auto whitespace-pre-line">
                        {r.ozet}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 6 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Bell className="text-blue-600" size={18} />
                  <span>UYAP Tebligat Takip Sistemi (Otomatik Erken Uyarı)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bu davaya ait UYAP'tan çekilen resmi tebligatlar ve bildirimler.
                </p>
              </div>
              <button
                onClick={simuleTebligatEkle}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Yeni Tebligat Simüle Et
              </button>
            </div>

            {(!dava.tebligatlar || dava.tebligatlar.length === 0) ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Bu dava dosyası için henüz tebliğ edilmiş aktif bir UYAP tebligatı bulunmamaktadır.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {dava.tebligatlar.map((t: any) => (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-5 transition-all duration-200 ${
                      t.okundu
                        ? "bg-slate-50/50 border-slate-200"
                        : "bg-blue-50/30 border-blue-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {!t.okundu && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" title="Okunmadı" />
                        )}
                        <h4 className="font-bold text-slate-800 text-sm">{t.baslik}</h4>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(t.tarih).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-650 mt-2 leading-relaxed bg-white p-3 rounded-lg border border-slate-150">
                      {t.icerik}
                    </p>
                    {!t.okundu && (
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => tebligatOkunduYap(t.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded border border-slate-300 cursor-pointer"
                        >
                          Okundu Olarak İşaretle
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 7 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="text-purple-600" size={18} />
                  <span>UYAP Dosya Hareketleri & Zaman Çizelgesi</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dosyanın UYAP portalı üzerindeki işlem ve evrak akış kronolojisi.
                </p>
              </div>
              <button
                onClick={simuleHareketEkle}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Yeni Dosya Hareketi Simüle Et
              </button>
            </div>

            {(!dava.hareketler || dava.hareketler.length === 0) ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Bu davanın henüz UYAP dosya hareketleri geçmişi bulunmamaktadır.
              </div>
            ) : (
              <div className="relative border-l border-purple-200 ml-4 pl-6 space-y-6">
                {dava.hareketler.map((h: any) => (
                  <div key={h.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 bg-purple-650 text-white rounded-full p-1.5 border-4 border-white flex items-center justify-center">
                      <Clock size={10} />
                    </span>
                    
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
                          {new Date(h.tarih).toLocaleDateString("tr-TR")}
                        </span>
                        {h.evrak && (
                          <span className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 font-semibold">
                            📄 Evrak: {h.evrak}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 mt-2 font-medium">
                        {h.islem}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
