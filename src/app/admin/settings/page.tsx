"use client";

import { useState, useEffect } from "react";
import { Settings, Server, RefreshCw, Database, Download, CheckCircle, XCircle, Shield, Globe } from "lucide-react";

export default function AdminSettingsPage() {
  const [aiDurum, setAiDurum] = useState("kontrol-ediliyor");
  const [scraperDurum, setScraperDurum] = useState<any>({});
  const [pythonStatus, setPythonStatus] = useState("checking");
  const [mesaj, setMesaj] = useState("");
  const [mesajTur, setMesajTur] = useState<"success" | "error">("success");
  const [yedekleniyor, setYedekleniyor] = useState(false);
  const [taranıyor, setTaranıyor] = useState(false);

  const fetchStatus = async () => {
    try {
      // Check Python API
      const resPy = await fetch("http://localhost:8765/health").catch(() => null);
      if (resPy && resPy.ok) {
        setPythonStatus("active");
        const data = await resPy.json();
        setAiDurum(data.ollama_url ? "bagli" : "bagli-degil");
      } else {
        setPythonStatus("offline");
        setAiDurum("bagli-degil");
      }

      // Check Scraper Status
      const resScr = await fetch("http://localhost:8765/api/scraper/durum").catch(() => null);
      if (resScr && resScr.ok) {
        const data = await resScr.json();
        setScraperDurum(data);
      }
    } catch {
      setPythonStatus("offline");
      setAiDurum("bagli-degil");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMesaj(msg);
    setMesajTur(type);
    setTimeout(() => setMesaj(""), 3500);
  };

  const handleBackup = async () => {
    setYedekleniyor(true);
    try {
      window.location.href = "/api/admin/backup";
      showMessage("Veritabanı yedekleme dosyası başarıyla indirildi.", "success");
    } catch {
      showMessage("Yedek alınırken hata oluştu.", "error");
    } finally {
      setYedekleniyor(false);
    }
  };

  const handleScrape = async () => {
    setTaranıyor(true);
    showMessage("Otonom tarayıcılar (Yargıtay/Danıştay/Mevzuat) başlatıldı...", "success");
    try {
      const res = await fetch("http://localhost:8765/api/scraper/tara", { method: "POST" });
      if (res.ok) {
        showMessage("Tarama başarıyla tamamlandı ve emsal kararlar güncellendi!", "success");
        fetchStatus();
      } else {
        showMessage("Tarayıcılar çalışırken hata oluştu.", "error");
      }
    } catch {
      showMessage("Python otonom servisine bağlanılamadı.", "error");
    } finally {
      setTaranıyor(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors text-slate-100 placeholder-slate-650";

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-slate-100 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sistem Ayarları</h1>
          <p className="text-xs text-slate-400 mt-0.5">Global altyapı, servis ve yapay zeka parametreleri</p>
        </div>
      </div>

      {/* Yapay Zeka Servis Ayarları */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <Server size={17} className="text-indigo-400" />
          <h2 className="font-semibold text-sm text-slate-200">Yapay Zeka ve LLM Yapılandırması</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Ollama Servis URL</label>
              <input
                type="text"
                defaultValue="http://localhost:11434"
                disabled
                className={`${inputCls} opacity-60 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Kullanılan Model</label>
              <input
                type="text"
                defaultValue="apilex-hukuk"
                disabled
                className={`${inputCls} opacity-60 cursor-not-allowed`}
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-200">LLM Motoru Bağlantısı</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Sistem yerelindeki yapay zeka modelinin durum kontrolü</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                aiDurum === "bagli" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {aiDurum === "bagli" ? (
                  <><CheckCircle size={10} /> Aktif</>
                ) : (
                  <><XCircle size={10} /> Bağlantı Yok</>
                )}
              </span>
              <button
                onClick={fetchStatus}
                className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Durumu Yenile"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Otonom Tarayıcı Ayarları */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <Globe size={17} className="text-teal-400" />
          <h2 className="font-semibold text-sm text-slate-200">Otonom Site Tarayıcıları (Scrapers)</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="divide-y divide-slate-800 text-xs">
            {["yargitay", "danistay", "mevzuat", "resmi_gazete"].map((k) => {
              const status = scraperDurum[k] || { adet: 0, guncelleme: "" };
              return (
                <div key={k} className="flex justify-between py-3">
                  <div>
                    <span className="font-semibold text-slate-200 capitalize">{k.replace("_", " ")} Tarayıcısı</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Son güncelleme: {status.guncelleme || "Hiç taranmadı"}</p>
                  </div>
                  <span className="font-semibold text-slate-350">{status.adet} Karar</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleScrape}
            disabled={taranıyor}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-70 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors mt-2"
          >
            <RefreshCw size={13} className={taranıyor ? "animate-spin" : ""} />
            <span>{taranıyor ? "Tarama Yapılıyor..." : "Taramayı Şimdi Başlat"}</span>
          </button>
        </div>
      </div>

      {/* Güvenlik & Veritabanı Yönetimi */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <Database size={17} className="text-purple-400" />
          <h2 className="font-semibold text-sm text-slate-200">Güvenlik & Veritabanı</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
            <div className="space-y-1">
              <p className="font-semibold text-xs text-slate-200">Veritabanı Yedekleme</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Tüm şifreli ve şifresiz JSON verilerini sıkıştırarak şifreli bir ZIP arşivi halinde yedekler.
              </p>
            </div>
            <button
              onClick={handleBackup}
              disabled={yedekleniyor}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-75 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <Download size={13} />
              <span>{yedekleniyor ? "Yedekleniyor..." : "Yedek Al"}</span>
            </button>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/40 border border-slate-850">
            <Shield size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-xs text-slate-200">AES-256 Veri Gizliliği</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Sistem üzerindeki tüm kullanıcı, dava ve log dosyaları AES-256 algoritması kullanılarak yerel olarak şifrelenir. Güvenlik anahtarları size özel yerel sunucunuzda saklanır ve 3. şahıslarla asla paylaşılmaz.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {mesaj && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 z-50 animate-slide-in ${
          mesajTur === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {mesajTur === "success" ? <CheckCircle size={15} /> : <XCircle size={15} />}
          <span>{mesaj}</span>
        </div>
      )}
    </div>
  );
}
