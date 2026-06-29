"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, Wallet, DollarSign, Printer, Filter, CheckCircle2, ChevronRight, TrendingUp } from "lucide-react";

function formatMoney(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n || 0);
}

export default function RaporlarPage() {
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [istatistik, setIstatistik] = useState<any>({});
  const [esmmList, setEsmmList] = useState<any[]>([]);
  const [masraflar, setMasraflar] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/istatistik").then((r) => r.json()).then(setIstatistik).catch(() => {});
    fetch("/api/esmm").then((r) => r.json()).then(setEsmmList).catch(() => {});
    fetch("/api/masraflar").then((r) => r.json()).then(setMasraflar).catch(() => {});
  }, []);

  const filteredEsmm = esmmList.filter((i) => {
    if (!baslangic && !bitis) return true;
    if (!i.tarih) return false;
    const d = new Date(i.tarih);
    if (baslangic && d < new Date(baslangic)) return false;
    if (bitis && d > new Date(bitis + "T23:59:59")) return false;
    return true;
  });

  const filteredMasraflar = masraflar.filter((i) => {
    if (!baslangic && !bitis) return true;
    if (!i.tarih) return false;
    const d = new Date(i.tarih);
    if (baslangic && d < new Date(baslangic)) return false;
    if (bitis && d > new Date(bitis + "T23:59:59")) return false;
    return true;
  });

  const aylikDagilim: Record<string, number> = {};
  filteredEsmm.forEach((i) => {
    if (!i.tarih) return;
    const key = new Date(i.tarih).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    aylikDagilim[key] = (aylikDagilim[key] || 0) + (i.netTutar || 0);
  });

  const kategoriDagilim: Record<string, number> = {};
  filteredMasraflar.forEach((i) => {
    const kat = i.kategori || "Diğer";
    kategoriDagilim[kat] = (kategoriDagilim[kat] || 0) + (i.tutar || 0);
  });

  // Calculate totals
  const totalIncome = filteredEsmm.reduce((sum, item) => sum + (item.netTutar || 0), 0);
  const totalExpense = filteredMasraflar.reduce((sum, item) => sum + (item.tutar || 0), 0);
  const netProfit = totalIncome - totalExpense;

  function printCard(id: string, title: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const clone = el.cloneNode(true) as HTMLElement;
    
    // Remove print button from output
    const btn = clone.querySelector(".print-btn");
    if (btn) btn.remove();

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
          </style>
        </head>
        <body class="p-10 bg-white text-slate-900">
          <div class="max-w-3xl mx-auto border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div class="flex items-center justify-between border-b pb-6 mb-6">
              <div>
                <h1 class="text-2xl font-bold text-slate-800">ALTU Hukuk Yönetim Raporu</h1>
                <p class="text-xs text-slate-400 mt-1">${title}</p>
              </div>
              <p class="text-xs text-slate-400">${new Date().toLocaleDateString("tr-TR")}</p>
            </div>
            ${clone.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  }

  const headerInputCls = "px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all";

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 animate-fade-in">
      {/* Page Title & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-blue-600 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Finansal Raporlama</h1>
            <p className="text-xs text-slate-500 mt-0.5">Detaylı muhasebe ve durum analizleri</p>
          </div>
        </div>

        {/* Filter inputs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Dönem Filtresi:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={headerInputCls}
              value={baslangic}
              onChange={(e) => setBaslangic(e.target.value)}
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              className={headerInputCls}
              value={bitis}
              onChange={(e) => setBitis(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        {/* Income Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Toplam Gelir (e-SMM)</span>
            <DollarSign size={16} className="text-emerald-100" />
          </div>
          <h2 className="text-2xl font-bold">{formatMoney(totalIncome)}</h2>
          <p className="text-[11px] text-emerald-100 mt-2 flex items-center gap-1">
            <CheckCircle2 size={11} /> {filteredEsmm.length} kesilen serbest meslek makbuzu
          </p>
        </div>

        {/* Expense Card */}
        <div className="bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-rose-100 uppercase tracking-wider">Toplam Gider (Masraflar)</span>
            <Wallet size={16} className="text-rose-100" />
          </div>
          <h2 className="text-2xl font-bold">{formatMoney(totalExpense)}</h2>
          <p className="text-[11px] text-rose-100 mt-2 flex items-center gap-1">
            <CheckCircle2 size={11} /> {filteredMasraflar.length} girilen masraf kalemi
          </p>
        </div>

        {/* Profit Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-blue-100 uppercase tracking-wider">Net Kâr / Durum</span>
            <TrendingUp size={16} className="text-blue-100" />
          </div>
          <h2 className="text-2xl font-bold">{formatMoney(netProfit)}</h2>
          <p className="text-[11px] text-blue-100 mt-2 flex items-center gap-1">
            <CheckCircle2 size={11} /> Dönem kâr oranı: %{totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0}
          </p>
        </div>
      </div>

      {/* Detailed Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dosya Raporu */}
        <div id="dosya-raporu" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 relative group">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Dava Dosyası Özeti</h3>
            </div>
            <button
              onClick={() => printCard("dosya-raporu", "Dava Dosyası Raporu")}
              className="print-btn flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Printer size={12} /> Yazdır
            </button>
          </div>
          
          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Toplam Aktif Dava Dosyası</span>
            <span className="text-sm font-bold text-blue-600">{istatistik.davaSayisi ?? 0} Adet</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Durum Dağılımı</p>
            <div className="divide-y divide-slate-50">
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Devam Eden
                </span>
                <span className="font-bold text-slate-800">{istatistik.aktifDavaSayisi ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Sonuçlanan
                </span>
                <span className="font-bold text-slate-800">{(istatistik.davaSayisi - istatistik.aktifDavaSayisi) || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Masraf Raporu */}
        <div id="masraf-raporu" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-rose-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Masraf Detayları</h3>
            </div>
            <button
              onClick={() => printCard("masraf-raporu", "Detaylı Masraf Raporu")}
              className="print-btn flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <Printer size={12} /> Yazdır
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Dönem Toplam Masrafı</span>
            <span className="text-sm font-bold text-rose-600">{formatMoney(totalExpense)}</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kategorilere Göre</p>
            {Object.keys(kategoriDagilim).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Bu dönemde masraf kaydı bulunmuyor.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {Object.entries(kategoriDagilim).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2 text-xs">
                    <span className="text-slate-600 flex items-center gap-1.5 capitalize">
                      <ChevronRight size={11} className="text-slate-400" />
                      {k}
                    </span>
                    <span className="font-bold text-slate-800">{formatMoney(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* e-SMM Raporu */}
        <div id="esmm-raporu" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Gelir Dağılımı (e-SMM)</h3>
            </div>
            <button
              onClick={() => printCard("esmm-raporu", "Gelir ve e-SMM Raporu")}
              className="print-btn flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Printer size={12} /> Yazdır
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Dönem Toplam Geliri</span>
            <span className="text-sm font-bold text-emerald-600">{formatMoney(totalIncome)}</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Aylık Makbuz Gelirleri</p>
            {Object.keys(aylikDagilim).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Bu dönemde makbuz kaydı bulunmuyor.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {Object.entries(aylikDagilim).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2 text-xs">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <ChevronRight size={11} className="text-slate-400" />
                      {k}
                    </span>
                    <span className="font-bold text-slate-800">{formatMoney(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Duruşma Raporu */}
        <div id="durusma-raporu" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-purple-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Duruşma ve Takvim Analizi</h3>
            </div>
            <button
              onClick={() => printCard("durusma-raporu", "Duruşma Raporu")}
              className="print-btn flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-semibold px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <Printer size={12} /> Yazdır
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Toplam Duruşma Sayısı</span>
            <span className="text-sm font-bold text-purple-600">{istatistik.durusmaSayisi ?? 0} Duruşma</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Yaklaşan Zaman Yönetimi</p>
            <div className="divide-y divide-slate-50">
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Gelecek Duruşmalar
                </span>
                <span className="font-bold text-slate-800">{(istatistik.yaklasanDurusmalar?.length || 0)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Bekleyen Görevler
                </span>
                <span className="font-bold text-slate-800">{istatistik.bekleyenIs ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
