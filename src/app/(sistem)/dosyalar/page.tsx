"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Plus, Search, Filter, Printer, Download } from "lucide-react";
import Link from "next/link";

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

const kategoriRenk: Record<string, string> = {
  "is": "bg-purple-50 text-purple-700 border border-purple-200",
  "bosanma": "bg-pink-50 text-pink-700 border border-pink-200",
  "aile": "bg-rose-50 text-rose-700 border border-rose-200",
  "miras": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "kira": "bg-amber-50 text-amber-700 border border-amber-200",
  "tazminat": "bg-orange-50 text-orange-700 border border-orange-200",
  "ceza": "bg-red-50 text-red-700 border border-red-200",
  "ticaret": "bg-indigo-50 text-indigo-700 border border-indigo-200",
  "icra": "bg-cyan-50 text-cyan-700 border border-cyan-200",
  "diger": "bg-slate-50 text-slate-700 border border-slate-200",
};

const kategoriEtiket: Record<string, string> = {
  "is": "İş Hukuku",
  "bosanma": "Boşanma",
  "aile": "Aile Hukuku",
  "miras": "Miras Hukuku",
  "kira": "Kira Hukuku",
  "tazminat": "Tazminat",
  "ceza": "Ceza Hukuku",
  "ticaret": "Ticaret Hukuku",
  "icra": "İcra Hukuku",
  "diger": "Diğer / Genel",
};

export default function DosyalarPage() {
  const [dosyalar, setDosyalar] = useState<any[]>([]);
  const [musteriler, setMusteriler] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [durumFilter, setDurumFilter] = useState("all");
  const [kategoriFilter, setKategoriFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ dosyaNo: "", ad: "", konu: "", durum: "devam-ediyor", mahkeme: "", esasNo: "", musteriId: "", kategori: "otomatik" });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dosyalar").then(r => r.json()).then(setDosyalar).finally(() => setLoading(false));
    fetch("/api/musteri").then(r => r.json()).then(setMusteriler);
  }, []);

  const handlePrintCaseList = () => {
    const title = "Aktif Dava Dosyaları Listesi";
    const content = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; }
            h2 { text-align: center; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <p>Oluşturulma Tarihi: ${new Date().toLocaleDateString("tr-TR")}</p>
          <table>
            <thead>
              <tr>
                <th>Dosya No</th>
                <th>Dava Adı</th>
                <th>Kategori</th>
                <th>Müvekkil</th>
                <th>Mahkeme</th>
                <th>Esas No</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((_d: any) => `
                <tr>
                  <td><strong>${_d.dosyaNo}</strong></td>
                  <td>${_d.ad}</td>
                  <td>${kategoriEtiket[_d.kategori || "diger"]}</td>
                  <td>${_d.musteri ? _d.musteri.ad + " " + _d.musteri.soyad : "-"}</td>
                  <td>${_d.mahkeme || "-"}</td>
                  <td>${_d.esasNo || "-"}</td>
                  <td>${durumEtiket[_d.durum] || _d.durum}</td>
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

  const handleDownloadCaseList = () => {
    let output = `DAVA DOSYALARI LİSTESİ\n`;
    output += `Rapor Tarihi: \${new Date().toLocaleDateString("tr-TR")}\n`;
    output += `==================================================\n\n`;
    
    filtered.forEach((_d: any, _idx: number) => {
      output += `\${_idx + 1}. Dosya No: \${_d.dosyaNo}\n`;
      output += `   Adı: \${_d.ad}\n`;
      output += `   Kategori: \${kategoriEtiket[_d.kategori || "diger"]}\n`;
      output += `   Müvekkil: \${_d.musteri ? \`\${_d.musteri.ad} \${_d.musteri.soyad}\` : "-"}\n`;
      output += `   Mahkeme: \${_d.mahkeme || "-"}\n`;
      output += `   Esas No: \${_d.esasNo || "-"}\n`;
      output += `   Durum: \${durumEtiket[_d.durum] || _d.durum}\n\n`;
    });

    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Dava_Dosyalari_Listesi.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadStatus("Evrak analiz ediliyor ve dava eşleştiriliyor...");
    
    const formData = new FormData();
    formData.append("dosya", file);
    formData.append("davaId", ""); 
    formData.append("etiketler", "otomatik-islenen, evrak");

    try {
      const res = await fetch("/api/dosyalar/dosya", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const refreshDavas = await fetch("/api/dosyalar").then(r => r.json());
        setDosyalar(refreshDavas);
        
        let message = `"${file.name}" yüklendi.`;
        if (data.davaId) {
          const eslesen = refreshDavas.find((d: any) => d.id === data.davaId);
          const davaAd = eslesen ? eslesen.ad : "ilgili dava";
          message = `"${file.name}" başarıyla analiz edildi ve "${davaAd}" dosyası ile otomatik eşleştirildi!`;
          if (file.type.startsWith("image/")) {
            message += " (Resim aratılabilir PDF'e dönüştürüldü)";
          }
        } else {
          message = `"${file.name}" yüklendi fakat herhangi bir dava ile eşleştirilemedi (Genel evrak olarak kaydedildi).`;
        }
        setUploadStatus(message);
        setTimeout(() => setUploadStatus(null), 6000);
      } else {
        setUploadStatus("Dosya yüklenirken hata oluştu.");
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch (_err) {
      setUploadStatus("Sunucu bağlantı hatası.");
      setTimeout(() => setUploadStatus(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  const filtered = dosyalar.filter(d => {
    const q = search.toLowerCase();
    const matchesSearch = d.ad.toLowerCase().includes(q) || d.dosyaNo.toLowerCase().includes(q);
    const matchesDurum = durumFilter === "all" || d.durum === durumFilter;
    const matchesKategori = kategoriFilter === "all" || d.kategori === kategoriFilter;
    return matchesSearch && matchesDurum && matchesKategori;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/dosyalar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const yeni = await res.json();
      setDosyalar(prev => [yeni, ...prev]);
      setModal(false);
      setForm({ dosyaNo: "", ad: "", konu: "", durum: "devam-ediyor", mahkeme: "", esasNo: "", musteriId: "", kategori: "otomatik" });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="text-blue-600" size={24} />
          <h1 className="text-xl font-bold text-slate-900">Dosyalar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintCaseList}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors border border-slate-300 cursor-pointer"
            title="Listeyi yazdır"
          >
            <Printer size={16} /> Listeyi Yazdır
          </button>
          <button
            onClick={handleDownloadCaseList}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors border border-slate-300 cursor-pointer"
            title="Listeyi indir"
          >
            <Download size={16} /> Listeyi İndir
          </button>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Yeni Dosya Ekle
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dosya no veya ad ile ara..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={durumFilter} onChange={(e) => setDurumFilter(e.target.value)} className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none">
            <option value="all">Tüm Durumlar</option>
            <option value="devam-ediyor">Devam Ediyor</option>
            <option value="sonuclandi">Sonuçlandı</option>
            <option value="ret">Ret</option>
            <option value="feragat">Feragat</option>
          </select>
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)} className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none">
            <option value="all">Tüm Hukuk Alanları</option>
            <option value="is">İş Hukuku</option>
            <option value="bosanma">Boşanma</option>
            <option value="aile">Aile Hukuku</option>
            <option value="miras">Miras Hukuku</option>
            <option value="kira">Kira Hukuku</option>
            <option value="tazminat">Tazminat</option>
            <option value="ceza">Ceza Hukuku</option>
            <option value="ticaret">Ticaret Hukuku</option>
            <option value="icra">İcra Hukuku</option>
            <option value="diger">Diğer / Genel</option>
          </select>
        </div>
      </div>

      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="mb-6 p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/20 text-center cursor-pointer transition-all duration-200 relative group overflow-hidden"
      >
        <input 
          type="file" 
          onChange={handleFileChange} 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          disabled={uploading}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform duration-200">
            <FolderOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Akıllı Evrak Tarayıcı & Otomatik Dava Eşleme</p>
            <p className="text-xs text-slate-500 mt-1">Buraya PDF, UDF veya resim sürükleyin ya da tıklayıp seçin. Sistem davayı otomatik tespit eder ve resimleri PDF'e dönüştürür.</p>
          </div>
        </div>
        
        {uploadStatus && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center px-6">
            <div className="flex items-center gap-3">
              {uploading && (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              <p className="text-sm font-medium text-slate-800">{uploadStatus}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Dosya bulunamadı.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 font-medium">
                <th className="px-4 py-3">Dosya No</th>
                <th className="px-4 py-3">Ad</th>
                <th className="px-4 py-3">Hukuk Alanı</th>
                <th className="px-4 py-3">Müvekkil</th>
                <th className="px-4 py-3">Mahkeme</th>
                <th className="px-4 py-3">Esas No</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dosyalar/${d.id}`} className="text-blue-600 hover:underline font-medium">{d.dosyaNo}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{d.ad}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${kategoriRenk[d.kategori || "diger"]}`}>
                      {kategoriEtiket[d.kategori || "diger"]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.musteri ? `${d.musteri.ad} ${d.musteri.soyad}` : "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{d.mahkeme || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{d.esasNo || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${durumRenk[d.durum] || "bg-slate-100 text-slate-800"}`}>
                      {durumEtiket[d.durum] || d.durum}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(d.createdAt).toLocaleDateString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Yeni Dosya Ekle</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dosya No *</label>
                <input type="text" value={form.dosyaNo} onChange={(e) => setForm({ ...form, dosyaNo: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ad *</label>
                <input type="text" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Konu</label>
                <input type="text" value={form.konu} onChange={(e) => setForm({ ...form, konu: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                <select value={form.durum} onChange={(e) => setForm({ ...form, durum: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="devam-ediyor">Devam Ediyor</option>
                  <option value="sonuclandi">Sonuçlandı</option>
                  <option value="ret">Ret</option>
                  <option value="feragat">Feragat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hukuk Alanı (Kategori)</label>
                <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="otomatik">Otomatik Belirle (Yapay Zeka)</option>
                  <option value="is">İş Hukuku</option>
                  <option value="bosanma">Boşanma</option>
                  <option value="aile">Aile Hukuku</option>
                  <option value="miras">Miras Hukuku</option>
                  <option value="kira">Kira Hukuku</option>
                  <option value="tazminat">Tazminat</option>
                  <option value="ceza">Ceza Hukuku</option>
                  <option value="ticaret">Ticaret Hukuku</option>
                  <option value="icra">İcra Hukuku</option>
                  <option value="diger">Diğer / Genel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mahkeme</label>
                <input type="text" value={form.mahkeme} onChange={(e) => setForm({ ...form, mahkeme: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Esas No</label>
                <input type="text" value={form.esasNo} onChange={(e) => setForm({ ...form, esasNo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Müvekkil</label>
                <select value={form.musteriId} onChange={(e) => setForm({ ...form, musteriId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Seçiniz</option>
                  {musteriler.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.ad} {m.soyad}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">Kaydet</button>
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
