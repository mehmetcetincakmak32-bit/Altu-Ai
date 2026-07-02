"use client";

import { useState, useEffect } from "react";
import { Search, Globe, RefreshCw, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function ScraperPage() {
  const [durum, setDurum] = useState<any>(null);
  const [taraniyor, setTaraniyor] = useState(false);
  const [sonuc, setSonuc] = useState("");
  const [araSorgu, setAraSorgu] = useState("");
  const [araSonuc, setAraSonuc] = useState<any[]>([]);
  const [araKaynak, setAraKaynak] = useState("tumu");

  useEffect(() => { durumGetir(); }, []);

  const durumGetir = async () => {
    const res = await fetch("/api/scraper?islem=durum");
    if (res.ok) setDurum(await res.json());
  };

  const tara = async (hedef: string) => {
    setTaraniyor(true);
    setSonuc(`${hedef === "tumu" ? "Tüm kaynaklar" : hedef} taranıyor...`);
    const res = await fetch("/api/scraper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hedef }),
    });
    void res.json();
    setSonuc(`Tarama tamamlandı`);
    setTaraniyor(false);
    durumGetir();
  };

  const ara = async () => {
    if (!araSorgu.trim()) return;
    const res = await fetch(`/api/scraper?islem=ara&sorgu=${encodeURIComponent(araSorgu)}&kaynak=${araKaynak}`);
    if (res.ok) {
      const data = await res.json();
      setAraSonuc(data.sonuc || []);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Globe size={24} className="text-blue-600" />
        <h1 className="text-xl sm:text-2xl font-bold">Adli Kaynak Tarayıcı</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: "yargitay", label: "Yargıtay", url: "karararama.yargitay.gov.tr" },
          { key: "danistay", label: "Danıştay", url: "karararama.danistay.gov.tr" },
          { key: "mevzuat", label: "Mevzuat", url: "mevzuat.gov.tr" },
        ].map((site) => (
          <div key={site.key} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{site.label}</h3>
              {durum?.[site.key]?.adet > 0 ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <AlertCircle size={18} className="text-yellow-500" />
              )}
            </div>
            <p className="text-xs text-slate-500 mb-1">{site.url}</p>
            <p className="text-sm">
              <span className="font-bold">{durum?.[site.key]?.adet || 0}</span> kayıt
            </p>
            {durum?.[site.key]?.guncelleme && (
              <p className="text-[10px] text-slate-400">Son güncelleme: {durum[site.key].guncelleme.slice(0, 10)}</p>
            )}
            <button
              onClick={() => tara(site.key)}
              disabled={taraniyor}
              className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Tara
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold">Toplu Tarama</h2>
            <p className="text-sm text-slate-500">Tüm kaynakları aynı anda tara</p>
          </div>
          <button
            onClick={() => tara("tumu")}
            disabled={taraniyor}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={taraniyor ? "animate-spin" : ""} />
            {taraniyor ? "Taranıyor..." : "Tümünü Tara"}
          </button>
        </div>
        {sonuc && (
          <div className="mt-3 p-3 bg-slate-50 rounded text-sm text-slate-700 border">
            {sonuc}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Search size={16} /> Taranmış Kayıtlarda Ara
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={araKaynak}
            onChange={(e) => setAraKaynak(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="tumu">Tümü</option>
            <option value="yargitay">Yargıtay</option>
            <option value="danistay">Danıştay</option>
            <option value="mevzuat">Mevzuat</option>
          </select>
          <input
            value={araSorgu}
            onChange={(e) => setAraSorgu(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ara()}
            placeholder="Arama kelimesi (kira, işçi, boşanma...)"
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <button onClick={ara} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap">
            Ara
          </button>
        </div>

        {araSonuc.length > 0 && (
          <div className="space-y-2 mt-2">
            <p className="text-sm text-slate-500">{araSonuc.length} sonuç bulundu</p>
            {araSonuc.slice(0, 20).map((item, i) => (
              <div key={i} className="p-3 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <FileText size={14} className="text-blue-600" />
                  <span className="font-medium text-sm">{item.kaynak?.toUpperCase()}</span>
                  {item.esas && <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">{item.esas}</span>}
                  {item.karar && <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">K: {item.karar}</span>}
                </div>
                <p className="text-sm font-medium">{item.konu || item.baslik}</p>
                <p className="text-xs text-slate-500 mt-1">{(item.ozet || item.madde || "").slice(0, 300)}</p>
              </div>
            ))}
          </div>
        )}
        {araSonuc.length === 0 && araSorgu && (
          <p className="text-sm text-slate-400 text-center py-4">Sonuç bulunamadı. Önce tarama yapmayı deneyin.</p>
        )}
      </div>
    </div>
  );
}
