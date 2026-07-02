"use client";

import { useState } from "react";
import { 
  Gauge, Send, CheckCircle2, AlertOctagon, 
  Lightbulb, Sparkles, FileText, ChevronRight
} from "lucide-react";

export default function DilekcePuanPage() {
  const [baslik, setBaslik] = useState("");
  const [icerik, setIcerik] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState<any>(null);
  const [hata, setHata] = useState<string | null>(null);

  const handlePuanla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icerik) {
      setHata("Lütfen dilekçe içeriğini doldurun.");
      return;
    }

    setYukleniyor(true);
    setHata(null);
    setSonuc(null);

    try {
      const res = await fetch("/api/dilekce-puan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baslik, icerik }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.hata || "Puanlama sırasında bir hata oluştu.");
      }

      const data = await res.json();
      
      const parsedOneriler = JSON.parse(data.oneriler);
      const parsedDetay = JSON.parse(data.detay);

      setSonuc({
        puan: data.puan,
        kriterler: parsedDetay,
        guclu_yonler: parsedOneriler.guclu_yonler,
        zayif_yonler: parsedOneriler.zayif_yonler,
        oneriler: parsedOneriler.oneriler,
        genel_yorum: parsedOneriler.genel_yorum,
      });
    } catch (err: any) {
      setHata(err.message || "Bir bağlantı hatası oluştu.");
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
            <Sparkles size={18} />
            <span>ALTU AI Dilekçe Kalite Servisi</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hukuki Dilekçe Puanlama Paneli</h1>
          <p className="text-slate-400 text-sm mt-1">Dilekçenizin kalitesini ölçün, güçlü ve zayıf yönlerini görün, iyileştirme önerileri alın.</p>
        </div>
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 flex items-center gap-2 text-sm font-medium self-start md:self-center">
          <Gauge size={18} />
          <span>0-100 Kalite Değerlendirmesi</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left - Editor */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-indigo-500" />
              Dilekçe Girişi
            </h2>
            <form onSubmit={handlePuanla} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Başlık (Opsiyonel)</label>
                <input
                  type="text"
                  value={baslik}
                  onChange={(e) => setBaslik(e.target.value)}
                  placeholder="Örn: Asliye Hukuk Mahkemesi Tazminat Dilekçesi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dilekçe İçeriği</label>
                <textarea
                  value={icerik}
                  onChange={(e) => setIcerik(e.target.value)}
                  placeholder="Dilekçe metnini buraya yazın veya yapıştırın..."
                  rows={14}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-sans resize-y leading-relaxed"
                />
              </div>

              {hata && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {hata}
                </div>
              )}

              <button
                type="submit"
                disabled={yukleniyor}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {yukleniyor ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Değerlendiriliyor...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Dilekçeyi Puanla</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right - Score Dashboard */}
        <div className="lg:col-span-7 space-y-6">
          {yukleniyor && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-md flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <h3 className="font-semibold text-slate-200 text-lg">Yapay Zeka Analiz Ediyor</h3>
              <p className="text-slate-400 text-sm max-w-sm">Dilekçenin hukuki tutarlılığı, dayanakları, usulü ve imlası detaylıca analiz ediliyor.</p>
            </div>
          )}

          {!yukleniyor && !sonuc && (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[400px]">
              <Gauge size={48} className="text-slate-600" />
              <h3 className="font-semibold text-slate-400">Puan Raporu Bekleniyor</h3>
              <p className="text-slate-500 text-xs max-w-xs">Sol taraftan dilekçe metnini girerek analizi başlatabilirsiniz.</p>
            </div>
          )}

          {sonuc && (
            <div className="space-y-6 animate-fadeIn">
              {/* Score Circular gauge & overall */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 flex flex-col items-center text-center p-4 bg-slate-800/40 border border-slate-700 rounded-xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Hukuki Kalite Skoru</span>
                  
                  {/* Custom SVG gauge with clean animation */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        className="stroke-slate-800"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        className="stroke-indigo-500 transition-all duration-1000 ease-out"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 60}
                        strokeDashoffset={2 * Math.PI * 60 * (1 - sonuc.puan / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-4xl font-extrabold text-white">{sonuc.puan}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">PUAN</span>
                    </div>
                  </div>

                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-3 ${sonuc.puan > 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : sonuc.puan > 60 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {sonuc.puan > 80 ? 'MÜKEMMEL' : sonuc.puan > 60 ? 'YETERLİ' : 'GELİŞTİRİLMELİ'}
                  </span>
                </div>
                <div className="md:col-span-7 space-y-2">
                  <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-indigo-400" />
                    Uzman Değerlendirme
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{sonuc.genel_yorum}</p>
                </div>
              </div>

              {/* Quality Criteria breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <ChevronRight size={18} className="text-indigo-500" />
                  Kriter Dağılımı
                </h3>
                <div className="space-y-4">
                  {Object.entries(sonuc.kriterler || {}).map(([key, value]: any) => {
                    const labelMap: any = {
                      hukuki_dayanak: "Hukuki Dayanak ve Atıflar",
                      dil_uslup: "Dil, İmla ve Hukuki Üslup",
                      delil_gosterme: "Delillerin Sunumu",
                      mantiksal_yapi: "Mantıksal ve Kronolojik Yapı",
                      talep_acikligi: "Netlik ve Netice-i Talep",
                    };
                    const maxScores: any = {
                      hukuki_dayanak: 25,
                      dil_uslup: 20,
                      delil_gosterme: 20,
                      mantiksal_yapi: 20,
                      talep_acikligi: 15,
                    };
                    const percentage = (value.puan / maxScores[key]) * 100;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-300">{labelMap[key] || key}</span>
                          <span className="text-slate-400 font-semibold">{value.puan} / {maxScores[key]}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">{value.aciklama}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strong & Weak Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-3">
                  <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    Güçlü Yönler
                  </h3>
                  {sonuc.guclu_yonler?.length > 0 ? (
                    <ul className="space-y-2">
                      {sonuc.guclu_yonler.map((item: string, idx: number) => (
                        <li key={idx} className="text-slate-300 text-xs flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-xs">Belirgin bir güçlü yön listelenemedi.</p>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-3">
                  <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                    <AlertOctagon size={18} className="text-red-500" />
                    Zayıf Yönler / Riskler
                  </h3>
                  {sonuc.zayif_yonler?.length > 0 ? (
                    <ul className="space-y-2">
                      {sonuc.zayif_yonler.map((item: string, idx: number) => (
                        <li key={idx} className="text-slate-300 text-xs flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-xs font-medium">Riskli veya zayıf bir yön bulunamadı.</p>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <Lightbulb size={18} className="text-amber-500" />
                  Geliştirme Önerileri
                </h3>
                {sonuc.oneriler?.length > 0 ? (
                  <ul className="space-y-3">
                    {sonuc.oneriler.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-slate-300 text-sm">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm">Öneri listesi oluşturulamadı.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
