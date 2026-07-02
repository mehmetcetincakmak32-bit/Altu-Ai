"use client";

import { useState } from "react";
import { 
  ClipboardCheck, Upload, FileText, Sparkles, CheckCircle2, 
  ShieldCheck, Edit3, Eye, FileDown
} from "lucide-react";

export default function BelgeIslePage() {
  // Read document state
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [readResult, setReadResult] = useState<any>(null);
  const [readError, setReadError] = useState<string | null>(null);

  // Generate document state
  const [genFormat, setGenFormat] = useState("docx"); // docx, pdf
  const [genBaslik, setGenBaslik] = useState("");
  const [genIcerik, setGenIcerik] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setReadResult(null);
      setReadError(null);
    }
  };

  const handleUploadAndProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setReadError("Lütfen bir dosya seçin.");
      return;
    }

    setReading(true);
    setReadError(null);
    setReadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/belge-isle", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.hata || "Dosya işleme hatası.");
      }

      const data = await res.json();
      setReadResult(data);
    } catch (err: any) {
      setReadError(err.message || "Bağlantı hatası");
    } finally {
      setReading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genBaslik || !genIcerik) {
      setGenError("Lütfen başlık ve içerik alanlarını doldurun.");
      return;
    }

    setGenerating(true);
    setGenError(null);
    setGenResult(null);

    try {
      const res = await fetch("/api/belge-isle/olustur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: genFormat,
          baslik: genBaslik,
          icerik: genIcerik
        }),
      });

      if (!res.ok) {
        throw new Error("Dosya oluşturulamadı");
      }

      const data = await res.json();
      setGenResult(data);
    } catch (err: any) {
      setGenError(err.message || "Bağlantı hatası");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
            <Sparkles size={18} />
            <span>ALTU AI Evrak ve Belge İşleme Servisi</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hukuki Belge Yönetim Merkezi</h1>
          <p className="text-slate-400 text-sm mt-1">Word, PDF, TIF ve UYAP UDF dosyalarını okuyun, e-imzaları doğrulayın, yasal dilekçe/karar oluşturun.</p>
        </div>
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 flex items-center gap-2 text-sm font-medium self-start md:self-center">
          <ClipboardCheck size={18} />
          <span>UDF, TIF, Word & PDF Okuma/Yazma</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Read & Process Documents */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Upload size={18} className="text-indigo-500" />
              Evrak Yükle ve Ayrıştır
            </h2>
            <form onSubmit={handleUploadAndProcess} className="space-y-4">
              <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800/10 transition cursor-pointer relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.udf,.tif,.tiff,.jpg,.jpeg,.png"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload size={32} className="mx-auto text-slate-500 mb-2" />
                <p className="text-xs text-slate-300 font-medium">Dosyayı buraya sürükleyin veya tıklayarak seçin</p>
                <p className="text-[10px] text-slate-500 mt-1">Desteklenen: PDF, DOCX, UDF, TIF (Maks: 15MB)</p>
                {file && (
                  <div className="mt-3 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 font-semibold text-xs inline-flex items-center gap-1.5">
                    <FileText size={12} />
                    <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              {readError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  {readError}
                </div>
              )}

              <button
                type="submit"
                disabled={reading || !file}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reading ? "Ayrıştırılıyor..." : "Evrak İçeriğini Oku"}
              </button>
            </form>
          </div>

          {/* Process Result Display */}
          {readResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <CheckCircle2 size={18} className="text-emerald-500" />
                Ayrıştırma Raporu
              </h3>

              {/* Signature status */}
              {readResult.imza && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  readResult.imza.imza_durumu === "imzali_gecerli"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-slate-800/40 border-slate-800 text-slate-400"
                }`}>
                  <ShieldCheck size={24} className="flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase block">Elektronik İmza Doğrulama</span>
                    <p className="text-sm font-semibold text-slate-200">
                      {readResult.imza.imza_durumu === "imzali_gecerli" 
                        ? `E-İmza GEÇERLİ: ${readResult.imza.imzalayan || "İmza Sahibi"}`
                        : "Elektronik İmza Bulunamadı (İmzasız)"}
                    </p>
                  </div>
                </div>
              )}

              {/* Extracted Metadata */}
              {readResult.metadata && (
                <div className="space-y-2 bg-slate-950 p-4 rounded-xl text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Tespit Edilen Dava Üst Verileri</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <p><span className="font-semibold text-slate-500">Esas No:</span> {readResult.metadata.esas_no || "Tespit Edilemedi"}</p>
                    <p><span className="font-semibold text-slate-500">Karar No:</span> {readResult.metadata.karar_no || "Tespit Edilemedi"}</p>
                    <p className="col-span-2"><span className="font-semibold text-slate-500">Mahkeme/Kurum:</span> {readResult.metadata.mahkeme || "Tespit Edilemedi"}</p>
                  </div>
                  {readResult.metadata.taraflar?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-850">
                      <span className="font-semibold text-slate-500 block mb-1">Taraflar:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                        {readResult.metadata.taraflar.map((t: string, idx: number) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Extracted Text Area */}
              <div className="space-y-1.5">
                <span className="text-slate-400 font-semibold text-xs flex items-center gap-1.5">
                  <Eye size={14} />
                  Belge Metni
                </span>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-xs font-mono max-h-[220px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {readResult.text || "(Belgeden okunabilir metin çıkarılamadı)"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Generate Word/PDF Documents */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Edit3 size={18} className="text-indigo-500" />
              Yeni Hukuki Belge Oluştur
            </h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Çıktı Formatı</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "docx", label: "Word (.docx)" },
                    { id: "pdf", label: "PDF Belgesi (.pdf)" }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setGenFormat(fmt.id)}
                      className={`py-2.5 px-4 rounded-xl border text-center font-bold text-xs transition-all ${
                        genFormat === fmt.id 
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" 
                          : "bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Evrak/Dilekçe Başlığı</label>
                <input
                  type="text"
                  value={genBaslik}
                  onChange={(e) => setGenBaslik(e.target.value)}
                  placeholder="Örn: Ankara Asliye Hukuk Mahkemesi Cevap Dilekçesi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Metin İçeriği</label>
                <textarea
                  value={genIcerik}
                  onChange={(e) => setGenIcerik(e.target.value)}
                  placeholder="Oluşturulacak evrak içeriğini girin..."
                  rows={9}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm leading-relaxed"
                />
              </div>

              {genError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  {genError}
                </div>
              )}

              <button
                type="submit"
                disabled={generating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "Oluşturuluyor..." : "Belgeyi Hazırla"}
              </button>
            </form>
          </div>

          {/* Document Generation Result */}
          {genResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-center space-y-4 animate-fadeIn">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
              <h3 className="font-semibold text-slate-200 text-sm">Hukuki Belge Başarıyla Oluşturuldu</h3>
              <p className="text-xs text-slate-400">Yapay zeka şablonları kullanılarak dosyanız sunucuda paketlendi.</p>
              <div className="pt-2">
                <a
                  href={genResult.download_url}
                  download
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 px-6 font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30"
                >
                  <FileDown size={16} />
                  <span>{genFormat.toUpperCase()} Belgesini İndir</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
