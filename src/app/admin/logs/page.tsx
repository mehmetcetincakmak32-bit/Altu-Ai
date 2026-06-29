"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Trash2, Search, Filter, Calendar, RefreshCw } from "lucide-react";

interface Log {
  id: string;
  islem: string;
  aciklama?: string | null;
  detay?: string | null;
  seviye: string;
  userId?: string | null;
  createdAt: string;
}

const seviyeRenk: Record<string, string> = {
  hata: "bg-red-500/10 text-red-400 border border-red-500/20",
  uyari: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  bilgi: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  basari: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

const seviyeEtiket: Record<string, string> = {
  hata: "Hata",
  uyari: "Uyarı",
  bilgi: "Bilgi",
  basari: "Başarı",
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSeviye, setFilterSeviye] = useState("hepsi");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/log");
      if (res.ok) {
        const data = await res.ok ? await res.json() : [];
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Tüm sistem loglarını ve hata kayıtlarını kalıcı olarak silmek istediğinizden emin misiniz?")) return;
    try {
      const res = await fetch("/api/log", { method: "DELETE" });
      if (res.ok) {
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.islem.toLowerCase().includes(search.toLowerCase()) ||
      (log.aciklama || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.detay || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterSeviye === "hepsi" || log.seviye === filterSeviye;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 text-slate-100 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Hata & Sistem Logları</h1>
            <p className="text-xs text-slate-400 mt-0.5">Sistemdeki tüm otonom işlemler ve hata raporları</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
            title="Yenile"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={13} />
            <span>Günlükleri Temizle</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 border border-slate-800/80 p-4 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
          <input
            type="text"
            placeholder="İşlem veya açıklama ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
          <Filter size={13} className="text-slate-500 hidden sm:block" />
          <select
            value={filterSeviye}
            onChange={(e) => setFilterSeviye(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors text-slate-350"
          >
            <option value="hepsi">Tüm Seviyeler</option>
            <option value="bilgi">Bilgi</option>
            <option value="basari">Başarı</option>
            <option value="uyari">Uyarı</option>
            <option value="hata">Hata</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loglar yükleniyor...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            <ShieldAlert size={28} className="mx-auto mb-2 opacity-30" />
            <p>Aradığınız kriterlere uygun sistem günlüğü bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-850/30 transition-colors flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                {/* Level Badge */}
                <div className="flex-shrink-0">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${seviyeRenk[log.seviye] || "bg-slate-850 text-slate-400"}`}>
                    {seviyeEtiket[log.seviye] || log.seviye}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{log.islem}</p>
                  {log.aciklama && (
                    <p className="text-xs text-slate-400 mt-1">{log.aciklama}</p>
                  )}
                  {log.detay && (
                    <pre className="text-[10px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-850 mt-2 text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                      {log.detay}
                    </pre>
                  )}
                </div>

                {/* Date */}
                <div className="flex-shrink-0 flex items-center gap-1 text-[10px] text-slate-500 sm:mt-0.5">
                  <Calendar size={11} />
                  <span>
                    {new Date(log.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
