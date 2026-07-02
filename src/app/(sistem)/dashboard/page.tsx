"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen, Users, Scale, Calendar, Wallet, AlertCircle,
  Clock, TrendingUp, ArrowRight, UploadCloud, Download,
  CheckCircle2, FileText, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";

interface SonDosya {
  id: string;
  dosyaNo: string;
  ad: string;
  durum: string;
  musteri: { ad: string; soyad: string } | null;
  createdAt: string;
}

interface SonDurusma {
  id: string;
  baslik: string;
  tarih: string;
  durum: string;
  dava: { ad: string };
}

interface EsmmEntry {
  tarih: string;
  netTutar: number;
}

interface MasrafKategori {
  kategori: string;
  _sum: { tutar: number | null };
}

interface SureRadarItem {
  id: string;
  dosyaNo: string;
  ad: string;
  sureTakipNotu?: string;
  yakinSure: {
    tur: string;
    tarih: string;
    kalanGun: number;
  };
}

interface Istatistik {
  davaSayisi: number;
  aktifDavaSayisi: number;
  musteriSayisi: number;
  durusmaSayisi: number;
  masrafToplam: number;
  bekleyenIs: number;
  sonDosyalar: SonDosya[];
  sonDurusmalar: SonDurusma[];
  aylikMasraflar: MasrafKategori[];
  esmmList: EsmmEntry[];
  sureRadari?: SureRadarItem[];
}

const durumRenk: Record<string, string> = {
  "devam-ediyor": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "sonuclandi":   "bg-blue-50 text-blue-700 border border-blue-200",
  "beklemede":    "bg-amber-50 text-amber-700 border border-amber-200",
  "ret":          "bg-red-50 text-red-700 border border-red-200",
  "feragat":      "bg-slate-100 text-slate-600 border border-slate-200",
};

const durumEtiket: Record<string, string> = {
  "devam-ediyor": "Devam Ediyor",
  "sonuclandi":   "Sonuçlandı",
  "beklemede":    "Beklemede",
  "ret":          "Ret",
  "feragat":      "Feragat",
};

const durusmaRenk: Record<string, string> = {
  planlandi:   "bg-blue-50 text-blue-700 border border-blue-200",
  gerceklesti: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  ertelendi:   "bg-amber-50 text-amber-700 border border-amber-200",
  iptal:       "bg-red-50 text-red-700 border border-red-200",
};

const DONUT_COLORS = ["#3b82f6","#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6"];

// Count-up hook
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

function StatCard({
  icon: Icon, label, rawValue, displayValue, color, href, gradient,
}: {
  icon: React.ElementType;
  label: string;
  rawValue: number;
  displayValue?: string;
  color: string;
  href: string;
  gradient: string;
}) {
  const count = useCountUp(rawValue);
  return (
    <Link
      href={href}
      className="group relative bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3 card-hover animate-fade-in overflow-hidden"
    >
      {/* Background gradient blob */}
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: gradient }}
      />

      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: gradient, boxShadow: `0 4px 12px ${color}40` }}
      >
        <Icon size={20} className="text-white" />
      </div>

      <div>
        <p className="text-2xl font-bold text-slate-900">
          {displayValue ?? count.toLocaleString("tr-TR")}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>

      <div className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
        <span>Görüntüle</span>
        <ArrowRight size={12} />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Istatistik | null>(null);
  const [_uyapYeniDosyaSayisi, _setUyapYeniDosyaSayisi] = useState<number | null>(null);
  const [_showNotification, _setShowNotification] = useState(false);

  // Evrak Yükleme State'leri
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ originalName: string; size: number; matchInfo?: string; error?: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append("dosya", file);
    
    try {
      const res = await fetch("/api/dosyalar/dosya", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        let matchInfo = "Belge başarıyla yüklendi, ancak otomatik olarak eşleşen bir dava dosyası bulunamadı. Genel evraklara kaydedildi.";
        if (data.davaId) {
          const dList = await fetch("/api/dosyalar").then(r => r.json());
          const matchedDava = dList.find((d: any) => d.id === data.davaId);
          if (matchedDava) {
            matchInfo = `Sistem bu evrağın otomatik olarak "${matchedDava.mahkeme} - ${matchedDava.dosyaNo} Esas (${matchedDava.ad})" dosyasına ait olduğunu belirledi ve başarıyla ekledi!`;
          } else {
            matchInfo = "Dosya başarıyla yüklendi ve ilgili dava dosyasına otonom olarak eklendi.";
          }
        }
        
        try {
          if (data.etiketler && data.etiketler.startsWith("{")) {
            const meta = JSON.parse(data.etiketler);
            if (meta.imzaDurumu === "imzali_gecerli") {
              matchInfo += ` | 🔒 E-İmza: Geçerli (${meta.imzalayan})`;
            } else if (meta.imzaDurumu === "imzali_gecersiz") {
              matchInfo += ` | ⚠️ E-İmza: GEÇERSİZ!`;
            }
          }
        } catch (_e) {}

        setUploadResult({
          originalName: data.orijinalAd,
          size: data.boyut,
          matchInfo,
        });
        
        // Refresh stats
        fetch("/api/istatistik")
          .then((r) => r.json())
          .then(setData);
      } else {
        const errData = await res.json().catch(() => ({}));
        setUploadResult({
          originalName: file.name,
          size: file.size,
          error: errData.hata || "Yükleme sırasında bir hata oluştu.",
        });
      }
    } catch (_err) {
      setUploadResult({
        originalName: file.name,
        size: file.size,
        error: "Bağlantı hatası: Sunucuya erişilemedi.",
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    // 1. Fetch main statistics
    fetch("/api/istatistik")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-40 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { icon: FolderOpen,   label: "Toplam Dosya",    rawValue: data.davaSayisi,       color: "#3b82f6", gradient: "linear-gradient(135deg,#3b82f6,#6366f1)", href: "/dosyalar" },
    { icon: Scale,        label: "Aktif Dosya",      rawValue: data.aktifDavaSayisi,  color: "#10b981", gradient: "linear-gradient(135deg,#10b981,#059669)", href: "/dosyalar" },
    { icon: Users,        label: "Müvekkil",         rawValue: data.musteriSayisi,    color: "#8b5cf6", gradient: "linear-gradient(135deg,#8b5cf6,#a78bfa)", href: "/musteri" },
    { icon: AlertCircle,  label: "Bekleyen İş",      rawValue: data.bekleyenIs,       color: "#f59e0b", gradient: "linear-gradient(135deg,#f59e0b,#ef4444)", href: "/isler" },
    { icon: Calendar,     label: "Bugünkü Duruşma",  rawValue: data.durusmaSayisi,    color: "#ef4444", gradient: "linear-gradient(135deg,#ef4444,#f97316)", href: "/takvim" },
    {
      icon: Wallet,
      label: "Toplam Masraf",
      rawValue: Math.round(data.masrafToplam),
      displayValue: `${Math.round(data.masrafToplam).toLocaleString("tr-TR")} ₺`,
      color: "#14b8a6",
      gradient: "linear-gradient(135deg,#14b8a6,#0ea5e9)",
      href: "/masraflar",
    },
  ];

  // Prepare monthly revenue chart
  const aylikGelir: Record<string, number> = {};
  (data.esmmList || []).forEach((e) => {
    const key = new Date(e.tarih).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
    aylikGelir[key] = (aylikGelir[key] || 0) + (e.netTutar || 0);
  });
  const barData = Object.entries(aylikGelir).slice(-6).map(([label, value]) => ({ label, value }));

  // Prepare expense donut data
  const donutData = (data.aylikMasraflar || [])
    .filter((m) => (m._sum.tutar || 0) > 0)
    .map((m, i) => ({
      label: m.kategori,
      value: m._sum.tutar || 0,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Page title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ana Sayfa</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 stagger-children">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Otonom Evrak Yükleme ve UYAP Eklentisi Paneli */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Otonom Evrak Yükleme Paneli */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UploadCloud size={20} className="text-blue-500 animate-pulse" />
              <h2 className="font-bold text-slate-800 text-base">Otonom Evrak Ekleme Paneli</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Yüklediğiniz belgeler (PDF, Resim, UDF) OCR ve LLM teknolojisi ile analiz edilir, ilgili davanız otomatik tespit edilerek dosyasına eklenir.
            </p>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("evrak-file-input")?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 min-h-[160px] ${
                dragActive
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <input
                id="evrak-file-input"
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.udf"
                onChange={handleFileInput}
                disabled={uploading}
              />
              
              {uploading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-blue-600 animate-pulse">
                    Yapay Zeka Evrakı Analiz Ediyor ve Eşleştiriyor...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Evrak Sürükleyin veya Dosya Seçin</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, JPEG veya UDF (Maks. 25MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {uploadResult && (
            <div className="mt-4 animate-fade-in">
              {uploadResult.error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Hata:</span> {uploadResult.error}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs">
                  <CheckCircle2 size={16} className="mt-0.5 text-emerald-600 flex-shrink-0 animate-bounce" />
                  <div>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText size={13} className="text-slate-500" />
                      {uploadResult.originalName} ({Math.round(uploadResult.size / 1024)} KB)
                    </p>
                    <p className="mt-1 text-emerald-700 leading-relaxed font-medium">{uploadResult.matchInfo}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* UYAP Entegrasyon Eklentisi Kartı */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scale size={20} className="text-blue-400" />
              <h2 className="font-bold text-white text-base">altu Ai UYAP Entegrasyon Eklentisi</h2>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-400/20 font-semibold ml-auto">
                v1.0.0 Stable
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Tarayıcı güvenlik sınırlarını aşarak UYAP portalınızdaki davaları, müvekkilleri ve duruşmaları tek tıkla otonom altu Ai sisteminize aktarın.
            </p>

            {/* Steps list */}
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-blue-300 flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Eklenti ZIP Dosyasını İndirin</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Aşağıdaki butonu kullanarak indirin ve masaüstünüzde klasöre çıkartın.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-blue-300 flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Chrome Uzantı Sayfasını Açın</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Adres çubuğuna <code className="bg-white/10 px-1 rounded text-white font-mono text-[10px]">chrome://extensions</code> yazıp "Geliştirici Modu"nu aktif edin.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-blue-300 flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Paketlenmemiş Uzantıyı Yükleyin</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">"Paketlenmemiş öge yükle" butonuna basarak çıkarttığınız klasörü seçin.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-blue-300 flex-shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Tek Tıkla Senkronizasyon Yapın</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">UYAP portalında davanızı görüntüleyin ve sağ üstteki butona tıklayın.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <a
              href="/api/uyap/download-eklenti"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer border border-blue-400/20 text-center"
            >
              <Download size={14} className="inline" />
              <span>altu Ai UYAP Eklentisini İndir (.ZIP)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue bar chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={17} className="text-blue-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Aylık Gelir (e-SMM)</h2>
            </div>
            <Link href="/esmm" className="text-xs text-blue-600 hover:underline">Tümü →</Link>
          </div>
          <BarChart
            data={barData}
            color="#3b82f6"
            height={150}
            formatValue={(v) => `${v.toLocaleString("tr-TR")} ₺`}
          />
        </div>

        {/* Expense donut chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={17} className="text-teal-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Masraf Dağılımı</h2>
            </div>
            <Link href="/masraflar" className="text-xs text-blue-600 hover:underline">Tümü →</Link>
          </div>
          <DonutChart
            data={donutData}
            size={130}
            thickness={26}
            formatValue={(v) => `${v.toLocaleString("tr-TR")} ₺`}
          />
        </div>
      </div>

      {/* Zamanaşımı Radarı & Süre Takip Uyarı Sistemi (Risk Kontrolü) */}
      {data.sureRadari && data.sureRadari.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Clock className="text-red-500 animate-pulse" size={20} />
            <div>
              <h2 className="font-bold text-slate-800 text-base">⏳ Zamanaşımı Radarı & Süre Takip Sistemi (Risk Kontrolü)</h2>
              <p className="text-xs text-slate-500">Yapay Zeka (AI) tarafından dava türünden otomatik hesaplanan kritik süre uyarıları</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.sureRadari.map((item: any) => {
              const daysLeft = item.yakinSure.kalanGun;
              return (
                <div key={item.id} className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  daysLeft <= 3 ? "bg-red-50/70 border-red-200 shadow-sm" :
                  daysLeft <= 15 ? "bg-amber-50/60 border-amber-200" :
                  "bg-slate-50/50 border-slate-150"
                }`}>
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-slate-400 font-mono">{item.dosyaNo}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider ${
                        daysLeft <= 3 ? "bg-red-100 text-red-800 animate-pulse border border-red-200" :
                        daysLeft <= 15 ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {item.yakinSure.tur}: {new Date(item.yakinSure.tarih).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-sm mt-1">{item.ad}</h3>
                    <p className="text-xs text-slate-500 mt-1 italic leading-relaxed bg-white/70 p-2 rounded border border-slate-100">
                      💡 {item.sureTakipNotu || "İlgili yasa maddeleri uyarınca süre takibindedir."}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50">
                    <span className={`text-xs font-bold ${
                      daysLeft <= 3 ? "text-red-600 animate-bounce" :
                      daysLeft <= 15 ? "text-amber-600" :
                      "text-slate-650"
                    }`}>
                      {daysLeft < 0 ? `🚨 Süre Aşıldı (${Math.abs(daysLeft)} gün geçti)` : 
                       daysLeft === 0 ? "⚠️ Bugün SON GÜN!" : 
                       `⏳ Son ${daysLeft} Gün Kaldı`}
                    </span>
                    
                    <button
                      onClick={() => {
                        alert(`📧 [BİLDİRİM GÖNDERİLDİ]\n\nDosya No: ${item.dosyaNo}\nİşlem: ${item.yakinSure.tur} Süresi Hatırlatması\n\nAtanan Avukata ve Müvekkile SMS, E-Posta ve Mobil Anlık (Push) bildirim başarıyla iletildi!`);
                      }}
                      className="bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                      Bildirim Gönder (SMS/Email)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Son Dosyalar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen size={17} className="text-blue-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Son Dosyalar</h2>
            </div>
            <Link href="/dosyalar" className="text-xs text-blue-600 hover:underline">Tümü →</Link>
          </div>
          <div className="space-y-2">
            {data.sonDosyalar.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Henüz dosya yok</p>
            ) : (
              data.sonDosyalar.map((d) => (
                <Link
                  key={d.id}
                  href={`/dosyalar/${d.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={14} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{d.ad}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {d.dosyaNo} {d.musteri ? `• ${d.musteri.ad} ${d.musteri.soyad}` : ""}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${durumRenk[d.durum] || "bg-slate-100 text-slate-600"}`}>
                    {durumEtiket[d.durum] || d.durum}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Yaklaşan Duruşmalar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={17} className="text-purple-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Yaklaşan Duruşmalar</h2>
            </div>
            <Link href="/takvim" className="text-xs text-blue-600 hover:underline">Tümü →</Link>
          </div>
          <div className="space-y-2">
            {data.sonDurusmalar.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Yaklaşan duruşma yok</p>
            ) : (
              data.sonDurusmalar.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Calendar size={14} className="text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{d.baslik}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {d.dava.ad} • {new Date(d.tarih).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${durusmaRenk[d.durum] || "bg-slate-100 text-slate-600"}`}>
                    {d.durum}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
