"use client";

import { useState } from "react";
import { 
  FileSearch, AlertTriangle, CheckCircle, HelpCircle, 
  BookOpen, Sparkles, Send, ShieldAlert, FileText 
} from "lucide-react";

export default function SozlesmeAnaliziPage() {
  const [tip, setTip] = useState("kira");
  const [baslik, setBaslik] = useState("");
  const [icerik, setIcerik] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState<any>(null);
  const [hata, setHata] = useState<string | null>(null);

  const sozlesmeTurleri = [
    { value: "kira", label: "Kira Sözleşmesi" },
    { value: "is", label: "İş Sözleşmesi" },
    { value: "satis", label: "Satış Sözleşmesi" },
    { value: "vekalet", label: "Vekalet Sözleşmesi" },
    { value: "ortaklik", label: "Ortaklık/Şirket Sözleşmesi" },
    { value: "hizmet", label: "Hizmet Sözleşmesi" },
    { value: "nda", label: "Gizlilik Sözleşmesi (NDA)" },
    { value: "lisans", label: "Lisans/Fikri Mülkiyet" },
    { value: "kredi", label: "Kredi/Tüketici Sözleşmesi" },
    { value: "franchise", label: "Franchise Sözleşmesi" },
  ];

  const handleAnalizEt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baslik || !icerik) {
      setHata("Lütfen başlık ve sözleşme içeriğini doldurun.");
      return;
    }

    setYukleniyor(true);
    setHata(null);
    setSonuc(null);

    try {
      const res = await fetch("/api/sozlesme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tip, baslik, icerik }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.hata || "Analiz sırasında bir hata oluştu.");
      }

      const data = await res.json();
      setSonuc(JSON.parse(data.sonuc));
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
          <div className="flex items-center gap-2 text-blue-400 font-semibold mb-1">
            <Sparkles size={18} />
            <span>ALTU AI Yapay Zeka Servisi</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sözleşme Risk Analiz Paneli</h1>
          <p className="text-slate-400 text-sm mt-1">Sözleşmenizi yükleyin, yapay zeka riskli maddeleri, hak kayıplarını ve yasal dayanakları listelesin.</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 flex items-center gap-2 text-sm font-medium self-start md:self-center">
          <FileSearch size={18} />
          <span>10 Farklı Sözleşme Türü Desteklenir</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left - Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              Sözleşme Detayları
            </h2>
            <form onSubmit={handleAnalizEt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sözleşme Türü</label>
                <select
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                >
                  {sozlesmeTurleri.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sözleşme Başlığı</label>
                <input
                  type="text"
                  value={baslik}
                  onChange={(e) => setBaslik(e.target.value)}
                  placeholder="Örn: Kadıköy Daire Kira Sözleşmesi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sözleşme Metni</label>
                <textarea
                  value={icerik}
                  onChange={(e) => setIcerik(e.target.value)}
                  placeholder="Sözleşmenin maddelerini buraya yapıştırın..."
                  rows={12}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-mono resize-y"
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {yukleniyor ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analiz Ediliyor...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Analizi Başlat</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right - Analysis Results */}
        <div className="lg:col-span-7 space-y-6">
          {yukleniyor && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-md flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <h3 className="font-semibold text-slate-200 text-lg">Yapay Zeka Analiz Ediyor</h3>
              <p className="text-slate-400 text-sm max-w-sm">Metin taranıyor, yasal mevzuatlar karşılaştırılıyor ve potansiyel risk haritası çıkarılıyor.</p>
            </div>
          )}

          {!yukleniyor && !sonuc && (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[400px]">
              <FileSearch size={48} className="text-slate-600" />
              <h3 className="font-semibold text-slate-400">Analiz Sonucu Bekleniyor</h3>
              <p className="text-slate-500 text-xs max-w-xs">Sol taraftan sözleşme metnini ve türünü girerek analizi başlatabilirsiniz.</p>
            </div>
          )}

          {sonuc && (
            <div className="space-y-6">
              {/* Score and General Evaluation */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4 flex flex-col items-center text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Risk Skoru</span>
                  <div className="relative flex items-center justify-center">
                    <span className={`text-4xl font-extrabold ${sonuc.riskPuani > 70 ? 'text-red-500' : sonuc.riskPuani > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {sonuc.riskPuani}
                    </span>
                    <span className="text-slate-500 text-lg font-bold">/100</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-3 ${sonuc.riskPuani > 70 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : sonuc.riskPuani > 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {sonuc.riskPuani > 70 ? 'YÜKSEK RİSK' : sonuc.riskPuani > 40 ? 'ORTA RİSK' : 'DÜŞÜK RİSK'}
                  </span>
                </div>
                <div className="md:col-span-8 space-y-2">
                  <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-blue-400 animate-pulse" />
                    Genel Hukuki Değerlendirme
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{sonuc.genel_degerlendirme}</p>
                </div>
              </div>

              {/* Tabs / Accordions for clauses */}
              <div className="space-y-4">
                {/* Riskli Maddeler */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                  <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <ShieldAlert size={18} className="text-red-500" />
                    Riskli Maddeler ({sonuc.riskli_maddeler?.length || 0})
                  </h3>
                  {sonuc.riskli_maddeler?.length > 0 ? (
                    <div className="space-y-4">
                      {sonuc.riskli_maddeler.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-300 text-sm">Madde: {item.madde}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.risk === 'yüksek' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : item.risk === 'orta' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                              {item.risk?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs leading-relaxed">{item.aciklama}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Belirgin bir riskli madde tespit edilmedi.</p>
                  )}
                </div>

                {/* Eksik Maddeler */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                  <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    Eksik ve Eklenmesi Önerilen Maddeler ({sonuc.eksik_maddeler?.length || 0})
                  </h3>
                  {sonuc.eksik_maddeler?.length > 0 ? (
                    <ul className="space-y-2.5">
                      {sonuc.eksik_maddeler.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 text-slate-300 text-sm">
                          <HelpCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm font-medium">Kritik bir madde eksikliği tespit edilmedi.</p>
                  )}
                </div>

                {/* Avantajli Maddeler */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                  <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-500" />
                    Lehe/Avantajlı Maddeler ({sonuc.avantajli_maddeler?.length || 0})
                  </h3>
                  {sonuc.avantajli_maddeler?.length > 0 ? (
                    <ul className="space-y-2.5">
                      {sonuc.avantajli_maddeler.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 text-slate-300 text-sm">
                          <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">Sözleşmede belirgin bir lehe madde bulunamadı.</p>
                  )}
                </div>

                {/* Yasal Dayanaklar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                  <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-500" />
                    İlgili Hukuki Dayanaklar (Mevzuat)
                  </h3>
                  {sonuc.kanun_dayanaklari?.length > 0 ? (
                    <ul className="space-y-2">
                      {sonuc.kanun_dayanaklari.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2.5 text-slate-300 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">Özel yasal dayanak listesi oluşturulamadı.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
