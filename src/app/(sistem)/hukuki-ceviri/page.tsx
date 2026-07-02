"use client";

import { useState, useEffect } from "react";
import { 
  Languages, Send, Copy, Check, Sparkles, 
  ArrowRightLeft, History 
} from "lucide-react";

export default function HukukiCeviriPage() {
  const [metin, setMetin] = useState("");
  const [kaynakDil, setKaynakDil] = useState("tr");
  const [hedefDil, setHedefDil] = useState("en");
  const [ceviri, setCeviri] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [panikCeviri, setPanikCeviri] = useState<string | null>(null);
  const [gecmis, setGecmis] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchGecmis();
  }, []);

  const fetchGecmis = async () => {
    try {
      const res = await fetch("/api/ceviri");
      if (res.ok) {
        const data = await res.json();
        setGecmis(data);
      }
    } catch {}
  };

  const handleCevir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metin.trim()) return;

    setYukleniyor(true);
    setPanikCeviri(null);

    try {
      const res = await fetch("/api/ceviri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metin, kaynakDil, hedefDil }),
      });

      if (!res.ok) {
        throw new Error("Çeviri işlemi başarısız");
      }

      const data = await res.json();
      setCeviri(data.ceviri);
      fetchGecmis();
    } catch (_err: any) {
      setPanikCeviri("Çeviri servisi şu anda meşgul, lütfen tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  };

  const swapLanguages = () => {
    const temp = kaynakDil;
    setKaynakDil(hedefDil);
    setHedefDil(temp);
    
    const tempText = metin;
    setMetin(ceviri);
    setCeviri(tempText);
  };

  const copyToClipboard = () => {
    if (!ceviri) return;
    navigator.clipboard.writeText(ceviri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const diller = [
    { code: "tr", label: "Türkçe" },
    { code: "en", label: "İngilizce" },
    { code: "de", label: "Almanca" },
    { code: "ar", label: "Arapça" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <Sparkles size={18} />
            <span>ALTU AI Hukuki Tercüme Servisi</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hukuki Çeviri Paneli</h1>
          <p className="text-slate-400 text-sm mt-1">Hukuki terminolojiye uyumlu, hatasız ve kanun maddelerine entegre çeviri hizmeti.</p>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 flex items-center gap-2 text-sm font-medium self-start md:self-center">
          <Languages size={18} />
          <span>Hukuki Terminoloji Bütünlüğü</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main translation panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
            {/* Lang selector header */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <select
                  value={kaynakDil}
                  onChange={(e) => setKaynakDil(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {diller.map((d) => (
                    <option key={d.code} value={d.code} disabled={d.code === hedefDil}>
                      {d.label}
                    </option>
                  ))}
                </select>

                <button 
                  onClick={swapLanguages}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Dilleri Değiştir"
                >
                  <ArrowRightLeft size={14} />
                </button>

                <select
                  value={hedefDil}
                  onChange={(e) => setHedefDil(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {diller.map((d) => (
                    <option key={d.code} value={d.code} disabled={d.code === kaynakDil}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Çift Yönlü</span>
              </div>
            </div>

            {/* Translation Textareas */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Left - Source */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Kaynak Metin</span>
                  <span>{metin.length} / 3000 Karakter</span>
                </div>
                <textarea
                  value={metin}
                  onChange={(e) => setMetin(e.target.value.slice(0, 3000))}
                  placeholder="Çevirmek istediğiniz hukuki metni buraya yazın..."
                  rows={12}
                  className="w-full bg-transparent border-0 resize-none text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-0 text-sm leading-relaxed"
                />
                <button
                  onClick={handleCevir}
                  disabled={yukleniyor || !metin.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {yukleniyor ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Çeviriliyor...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Metni Çevir</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right - Output */}
              <div className="p-6 bg-slate-950/20 flex flex-col justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Hukuki Çeviri</span>
                    {ceviri && (
                      <button
                        onClick={copyToClipboard}
                        className="text-slate-400 hover:text-white flex items-center gap-1.5 transition text-xs"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copied ? "Kopyalandı!" : "Kopyala"}</span>
                      </button>
                    )}
                  </div>
                  {yukleniyor ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-4 bg-slate-800 rounded w-5/6" />
                      <div className="h-4 bg-slate-800 rounded w-2/3" />
                    </div>
                  ) : (
                    <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap min-h-[220px]">
                      {ceviri || (
                        <span className="text-slate-600 italic">Çeviri sonucu burada gösterilecektir.</span>
                      )}
                    </div>
                  )}
                </div>

                {panikCeviri && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                    {panikCeviri}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right - Translation History */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <History size={18} className="text-emerald-500" />
              Çeviri Geçmişi
            </h2>
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {gecmis.length > 0 ? (
                gecmis.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setKaynakDil(item.kaynakDil);
                      setHedefDil(item.hedefDil);
                      setMetin(item.asil);
                      setCeviri(item.ceviri);
                    }}
                    className="p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl space-y-2 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span className="uppercase">{item.kaynakDil} ➔ {item.hedefDil}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString("tr-TR")}</span>
                    </div>
                    <p className="text-slate-300 text-xs truncate font-medium">{item.asil}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs text-center py-6">Henüz yapılmış bir çeviri yok.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
