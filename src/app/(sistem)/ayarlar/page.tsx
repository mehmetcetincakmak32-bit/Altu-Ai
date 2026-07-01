"use client";

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon, Server, Volume2, RefreshCw, Database,
  Download, CheckCircle, XCircle, User, Save, Loader2,
} from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

interface Profil {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  baro: string;
  sicilNo: string;
  unvan: string;
  telefon: string;
  adres: string;
  uyapSifre: string;
  uyapEImza: string;
  tcNo: string;
  subdomain: string;
}

export default function AyarlarPage() {
  const { shouldHideUyapSync, isMobileOrTablet } = usePWA();

  const [aiDurum, setAiDurum] = useState("kontrol-ediliyor");
  const [servisDurum, setServisDurum] = useState("kontrol-ediliyor");
  const [mesaj, setMesaj] = useState("");
  const [mesajTur, setMesajTur] = useState<"success" | "error">("success");
  const [aktiflik, setAktiflik] = useState(true);
  const [esitleniyor, setEsitleniyor] = useState(false);

  // Profile state
  const [profil, setProfil] = useState<Profil | null>(null);
  const [profilForm, setProfilForm] = useState({
    ad: "", soyad: "", baro: "", sicilNo: "", unvan: "", telefon: "", adres: "",
    uyapSifre: "", uyapEImza: "", tcNo: "", subdomain: "",
  });
  const [profilKaydediliyor, setProfilKaydediliyor] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/server/status")
        .then(r => r.json())
        .then(d => {
          setAiDurum("bagli");
          setServisDurum("bagli");
        })
        .catch(() => {
          setAiDurum("bagli-degil");
          setServisDurum("bagli-degil");
        }),
      fetch("/api/auth/profil")
        .then(r => r.ok ? r.json() : null)
        .then((d: Profil | null) => {
          if (d) {
            setProfil(d);
            setProfilForm({
              ad: d.ad || "",
              soyad: d.soyad || "",
              baro: d.baro || "",
              sicilNo: d.sicilNo || "",
              unvan: d.unvan || "",
              telefon: d.telefon || "",
              adres: d.adres || "",
              uyapSifre: d.uyapSifre || "",
              uyapEImza: d.uyapEImza || "",
              tcNo: d.tcNo || "",
              subdomain: d.subdomain || "",
            });
          }
        })
        .catch(() => {}),
    ]);
  }, []);

  const aiYenile = async () => {
    setMesaj("Yapay zeka bağlantısı yenileniyor...");
    try {
      await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "apilex-hukuk", prompt: "test", keep_alive: "24h" }),
      });
      setAiDurum("bagli");
      showMessage("Yapay zeka bağlantısı kuruldu", "success");
    } catch {
      setAiDurum("bagli-degil");
      showMessage("Yapay zeka bağlantısı başarısız.", "error");
    }
  };

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMesaj(msg);
    setMesajTur(type);
    setTimeout(() => setMesaj(""), 3500);
  };

  const profilKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfilKaydediliyor(true);
    try {
      const res = await fetch("/api/auth/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilForm),
      });
      if (res.ok) {
        const d = await res.json();
        setProfil(d);
        showMessage("Profil ve UYAP bağlantı ayarları başarıyla güncellendi!", "success");
      } else {
        showMessage("Profil güncellenirken hata oluştu.", "error");
      }
    } catch {
      showMessage("Bağlantı hatası.", "error");
    } finally {
      setProfilKaydediliyor(false);
    }
  };

  const [uyapDosya, setUyapDosya] = useState<File | null>(null);
  const [uyapMetin, setUyapMetin] = useState("");
  const [cozumlenenDavalari, setCozumlenenDavalari] = useState<any[]>([]);
  const [cozumlemeModu, setCozumlemeModu] = useState<"dosya" | "metin" | "canli">("dosya");
  const [cozumleniyor, setCozumleniyor] = useState(false);

  // Canlı UYAP Eşitleme (T-HOS) Durumları
  const [girisYontemi, setGirisYontemi] = useState("eimza");
  const [syncStatus, setSyncStatus] = useState({
    durum: "idle",
    adim: "Hazır",
    yuzde: 0,
    detay: "Eşitleme başlatılmadı.",
    hata: ""
  });

  const canliUyapSyncStart = async () => {
    if (!profilForm.tcNo) {
      showMessage("Lütfen profil ayarlarında T.C. Kimlik numaranızı tanımlayın.", "error");
      return;
    }
    if (girisYontemi === "edevlet" && !profilForm.uyapSifre) {
      showMessage("Lütfen profil ayarlarında UYAP/e-Devlet şifrenizi tanımlayın.", "error");
      return;
    }

    setSyncStatus({
      durum: "running",
      adim: "Başlatılıyor...",
      yuzde: 5,
      detay: "Eşitleme arka planda başlatılıyor...",
      hata: ""
    });

    try {
      const res = await fetch("/api/uyap/sync-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tcNo: profilForm.tcNo,
          uyapSifre: profilForm.uyapSifre,
          girisYontemi: girisYontemi
        })
      });

      if (res.ok) {
        showMessage("Eşitleme işlemi başlatıldı. Log ekranını takip edin.", "success");
      } else {
        const data = await res.json();
        setSyncStatus({
          durum: "error",
          adim: "Başlatılamadı",
          yuzde: 0,
          detay: data.hata || "Bilinmeyen bir hata oluştu.",
          hata: data.hata || "Start Error"
        });
        showMessage("Canlı eşitleme başlatılamadı.", "error");
      }
    } catch (err: any) {
      setSyncStatus({
        durum: "error",
        adim: "Bağlantı Hatası",
        yuzde: 0,
        detay: err.message,
        hata: err.message
      });
      showMessage("Eşitleme sunucusuna bağlanılamadı.", "error");
    }
  };

  useEffect(() => {
    let intervalId: any;
    if (syncStatus.durum === "running") {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch("/api/uyap/sync-status");
          if (res.ok) {
            const data = await res.json();
            setSyncStatus(data);
            if (data.durum === "success") {
              showMessage("UYAP eşitlemesi başarıyla tamamlandı!", "success");
            } else if (data.durum === "error") {
              showMessage("UYAP eşitleme sırasında hata oluştu: " + (data.detay || data.hata), "error");
            }
          }
        } catch (err) {
          console.error("Error fetching sync status:", err);
        }
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [syncStatus.durum]);


  const uyapOku = async () => {
    setCozumleniyor(true);
    setCozumlenenDavalari([]);
    try {
      const formData = new FormData();
      if (cozumlemeModu === "dosya") {
        if (!uyapDosya) {
          showMessage("Lütfen bir UYAP dosyası seçin", "error");
          setCozumleniyor(false);
          return;
        }
        formData.append("file", uyapDosya);
      } else {
        if (!uyapMetin.trim()) {
          showMessage("Lütfen kopyaladığınız UYAP metnini yapıştırın", "error");
          setCozumleniyor(false);
          return;
        }
        formData.append("text", uyapMetin);
      }

      const res = await fetch("/api/uyap/belge-oku", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const d = await res.json();
        if (d.dosyalar && d.dosyalar.length > 0) {
          setCozumlenenDavalari(d.dosyalar);
          showMessage(`${d.dosyalar.length} adet dava tespit edildi!`, "success");
        } else {
          showMessage("Hiç dava dosyası bulunamadı. Lütfen içeriği kontrol edin.", "error");
        }
      } else {
        const err = await res.json();
        showMessage(err.detay || "Ayrıştırma başarısız oldu.", "error");
      }
    } catch {
      showMessage("Bağlantı hatası.", "error");
    } finally {
      setCozumleniyor(false);
    }
  };

  const uyapAktar = async () => {
    if (cozumlenenDavalari.length === 0) return;
    setEsitleniyor(true);
    try {
      const res = await fetch("/api/uyap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { dosyalar: cozumlenenDavalari } }),
      });
      if (res.ok) {
        const d = await res.json();
        showMessage(`${d.aktarilan} adet dava başarıyla sisteme aktarıldı!`, "success");
        setCozumlenenDavalari([]);
        setUyapMetin("");
        setUyapDosya(null);
      } else {
        showMessage("Aktarım sırasında hata oluştu.", "error");
      }
    } catch {
      showMessage("Bağlantı hatası.", "error");
    } finally {
      setEsitleniyor(false);
    }
  };

  const DurumBadge = ({ durum }: { durum: string }) => {
    if (durum === "kontrol-ediliyor") {
      return <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />;
    }
    return durum === "bagli"
      ? <CheckCircle size={18} className="text-emerald-500" />
      : <XCircle size={18} className="text-red-500" />;
  };

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all";

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <SettingsIcon size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sistem Ayarları</h1>
          <p className="text-sm text-slate-500">Profil ve sistem yapılandırması</p>
        </div>
      </div>

      {/* ─── Profil ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <User size={17} className="text-slate-600" />
          <h2 className="font-semibold text-slate-800">Profil Bilgileri</h2>
        </div>
        <form onSubmit={profilKaydet} className="p-6 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              {profilForm.ad ? profilForm.ad[0].toUpperCase() : profil?.email?.[0].toUpperCase() || "A"}
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                {profilForm.ad} {profilForm.soyad}
              </p>
              <p className="text-sm text-slate-500">{profil?.email}</p>
              {profilForm.unvan && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{profilForm.unvan}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Ad *</label>
              <input
                type="text"
                value={profilForm.ad}
                onChange={(e) => setProfilForm({ ...profilForm, ad: e.target.value })}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Soyad *</label>
              <input
                type="text"
                value={profilForm.soyad}
                onChange={(e) => setProfilForm({ ...profilForm, soyad: e.target.value })}
                required
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Unvan</label>
              <input
                type="text"
                value={profilForm.unvan}
                onChange={(e) => setProfilForm({ ...profilForm, unvan: e.target.value })}
                placeholder="Avukat, Stajyer Avukat..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Telefon</label>
              <input
                type="tel"
                value={profilForm.telefon}
                onChange={(e) => setProfilForm({ ...profilForm, telefon: e.target.value })}
                placeholder="05XX XXX XX XX"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Baro</label>
              <input
                type="text"
                value={profilForm.baro}
                onChange={(e) => setProfilForm({ ...profilForm, baro: e.target.value })}
                placeholder="İstanbul Barosu"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Sicil No</label>
              <input
                type="text"
                value={profilForm.sicilNo}
                onChange={(e) => setProfilForm({ ...profilForm, sicilNo: e.target.value })}
                placeholder="12345"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Büro Alt Alan Adı (Subdomain)</label>
            <div className="flex rounded-lg shadow-sm">
              <input
                type="text"
                value={profilForm.subdomain}
                onChange={(e) => setProfilForm({ ...profilForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="örnek: buroadi"
                className={`${inputCls} rounded-r-none border-r-0`}
              />
              <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium">
                .localhost:3001
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Büronuza ait özel giriş adresi (örn: buroadi.localhost:3001).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Büro Adresi</label>
            <textarea
              value={profilForm.adres}
              onChange={(e) => setProfilForm({ ...profilForm, adres: e.target.value })}
              rows={2}
              placeholder="Büro adresi..."
              className={inputCls}
            />
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              ⚖️ UYAP Portal Bağlantı Ayarları
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">T.C. Kimlik Numarası</label>
                <input
                  type="text"
                  maxLength={11}
                  value={profilForm.tcNo}
                  onChange={(e) => setProfilForm({ ...profilForm, tcNo: e.target.value.replace(/\D/g, "") })}
                  placeholder="11 Haneli T.C. No"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Telefon No (Mobil İmza)</label>
                <input
                  type="text"
                  value={profilForm.uyapSifre}
                  onChange={(e) => setProfilForm({ ...profilForm, uyapSifre: e.target.value })}
                  placeholder="05XX XXX XX XX"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">E-İmza PIN Kodu</label>
                <input
                  type="password"
                  value={profilForm.uyapEImza}
                  onChange={(e) => setProfilForm({ ...profilForm, uyapEImza: e.target.value })}
                  placeholder="••••"
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              * Bilgileriniz e-imza tüneliyle otomatik UYAP sorgulaması yapmak amacıyla yerel güvenli depolamanızda saklanır.
            </p>
          </div>

          <button
            type="submit"
            disabled={profilKaydediliyor}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}
          >
            {profilKaydediliyor ? (
              <><Loader2 size={15} className="animate-spin" /> Kaydediliyor...</>
            ) : (
              <><Save size={15} /> Profili Kaydet</>
            )}
          </button>
        </form>
      </div>

      {/* ─── Servis Durumu ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <Server size={17} className="text-slate-600" />
          <h2 className="font-semibold text-slate-800">Servis Durumu</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-slate-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-slate-800">Yapay Zeka Danışmanı</span>
              <DurumBadge durum={aiDurum} />
            </div>
            <p className="text-xs text-slate-500 mb-3">Hukuki sorularınızı yanıtlar ve analiz üretir</p>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  aiDurum === "bagli" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {aiDurum === "bagli" ? "Aktif" : aiDurum === "kontrol-ediliyor" ? "Kontrol ediliyor..." : "Bağlantı Yok"}
              </span>
              <button onClick={aiYenile} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <RefreshCw size={11} /> Yenile
              </button>
            </div>
          </div>
          <div className="border border-slate-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-slate-800">Belge Okuma & Veri Analiz</span>
              <DurumBadge durum={servisDurum} />
            </div>
            <p className="text-xs text-slate-500 mb-3">Resim ve dilekçe tarama, veri seti sorgulama</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                servisDurum === "bagli" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {servisDurum === "bagli" ? "Aktif" : servisDurum === "kontrol-ediliyor" ? "Kontrol ediliyor..." : "Bağlantı Yok"}
            </span>
          </div>

          <div className="border border-slate-100 rounded-xl p-5 col-span-1 sm:col-span-2 bg-blue-50/10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-2">
              <span className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                ⚖️ UYAP Evrak ve Metin İçe Aktarımı
              </span>
              <span className="text-xs text-blue-600 font-medium">Bütünleşik Ayrıştırıcı</span>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              UYAP portalından indirdiğiniz dava listesi PDF'ini, XML/TXT dosyalarını veya doğrudan UYAP portalı ekranından kopyaladığınız metinleri buraya yükleyerek davalarınızı saniyeler içinde sisteme aktarabilirsiniz.
            </p>

            <div className="flex gap-2 p-1 bg-slate-100/80 rounded-lg max-w-md">
              <button
                type="button"
                onClick={() => setCozumlemeModu("dosya")}
                className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                  cozumlemeModu === "dosya" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dosya Yükle
              </button>
              <button
                type="button"
                onClick={() => setCozumlemeModu("metin")}
                className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                  cozumlemeModu === "metin" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Metin Yapıştır
              </button>
              {!shouldHideUyapSync && (
                <button
                  type="button"
                  onClick={() => setCozumlemeModu("canli")}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                    cozumlemeModu === "canli" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Canlı Eşitle (T-HOS)
                </button>
              )}
            </div>


            {cozumlemeModu === "dosya" && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">UYAP Dosyası Seçin (.pdf, .udf, .xml, .txt)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.udf,.xml,.txt"
                    onChange={(e) => setUyapDosya(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    type="button"
                    onClick={uyapOku}
                    disabled={cozumleniyor || !uyapDosya}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                  >
                    {cozumleniyor ? <Loader2 size={12} className="animate-spin" /> : "Çözümle"}
                  </button>
                </div>
              </div>
            )}

            {cozumlemeModu === "metin" && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">UYAP Ekran Metnini Buraya Yapıştırın</label>
                <textarea
                  value={uyapMetin}
                  onChange={(e) => setUyapMetin(e.target.value)}
                  rows={4}
                  placeholder="Örn: 1. Asliye Hukuk Mahkemesi 2024/105 Esas..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={uyapOku}
                  disabled={cozumleniyor || !uyapMetin.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {cozumleniyor ? <Loader2 size={12} className="animate-spin" /> : "Metni Çözümle"}
                </button>
              </div>
            )}

            {!shouldHideUyapSync && cozumlemeModu === "canli" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Eşitleme Giriş Yöntemi</label>
                    <select
                      value={girisYontemi}
                      onChange={(e) => setGirisYontemi(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="eimza">Adalet E-İmza Uygulaması (PIN Onaylı)</option>
                      <option value="mobilimza">Mobil İmza (Telefon Onaylı)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={canliUyapSyncStart}
                      disabled={syncStatus.durum === "running"}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {syncStatus.durum === "running" ? (
                        <><Loader2 size={13} className="animate-spin" /> Eşitleniyor...</>
                      ) : (
                        <>🔄 UYAP Canlı Eşitlemeyi Başlat</>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-normal">
                  {girisYontemi === "eimza" 
                    ? "Bilgi: E-İmza seçildiğinde tarayıcı açılır ve Adalet E-İmza Uygulaması PIN kodunuzu girip onaylamanızı bekler."
                    : "Bilgi: Mobil İmza seçildiğinde T.C. Kimlik ve telefon bilginiz girilerek telefonunuza imzalama talebi gönderilir."
                  }
                </p>

                {syncStatus.durum !== "idle" && (
                  <div className="bg-slate-950 text-slate-100 rounded-xl font-mono p-4 text-[11px] space-y-2 border border-slate-800 shadow-inner">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-900 pb-1.5">
                      <span>⚡ T-HOS UYAP CANLI LOG EKRANI</span>
                      <span className="font-bold">{syncStatus.yuzde}%</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-blue-400 flex gap-1.5">
                        <span className="text-slate-500">&gt;</span>
                        <span>{syncStatus.adim}</span>
                      </div>
                      {syncStatus.detay && (
                        <div className="text-slate-400 pl-4">{syncStatus.detay}</div>
                      )}
                      {syncStatus.hata && (
                        <div className="text-red-400 font-bold pl-4">Hata: {syncStatus.hata}</div>
                      )}
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          syncStatus.durum === "error" 
                            ? "bg-red-500" 
                            : syncStatus.durum === "success" 
                              ? "bg-emerald-500" 
                              : "bg-blue-500"
                        }`}
                        style={{ width: `${syncStatus.yuzde}%` }}
                      />
                    </div>

                    {syncStatus.durum === "success" && (
                      <div className="text-emerald-400 font-bold text-center border-t border-slate-900 pt-1.5">
                        [OK] VERİLER BAŞARIYLA EŞİTLENDİ VE VERİTABANINA YAZILDI.
                      </div>
                    )}
                    {syncStatus.durum === "error" && (
                      <div className="text-red-400 font-bold text-center border-t border-slate-900 pt-1.5">
                        [HATA] UYAP EŞİTLEME BAŞARISIZ OLDU.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            {cozumlenenDavalari.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-3 animate-fade-in max-h-60 overflow-y-auto">
                <div className="text-xs font-bold text-slate-800 border-b pb-1.5 flex justify-between items-center">
                  <span>Ayrıştırılan UYAP Dava Dosyaları</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{cozumlenenDavalari.length} Dava</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {cozumlenenDavalari.map((d, index) => (
                    <div key={index} className="py-2 text-[11px] flex justify-between items-start gap-2">
                      <div>
                        <div className="font-semibold text-slate-800">{d.dosyaNo}</div>
                        <div className="text-slate-500">{d.mahkeme}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-600 font-medium">{d.ad}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{d.tcKimlik}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={uyapAktar}
                    disabled={esitleniyor}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    {esitleniyor ? <Loader2 size={12} className="animate-spin" /> : "Sisteme Aktar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCozumlenenDavalari([])}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Sesli Komutlar ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <Volume2 size={17} className="text-slate-600" />
          <h2 className="font-semibold text-slate-800">Sesli Yönetim</h2>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-sm text-slate-800 mb-1">Sesli Komutlar</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Söylenebilecek komutlar: <em>Ana Sayfa, Dosyalar, Müvekkiller, İş Listesi, Takvim, Yapay Zeka, İçtihat Ara, Belge Oluştur, Masraflar, e-SMM, Fatura, Raporlar, Çıkış</em>
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={aktiflik}
                onChange={() => setAktiflik(!aktiflik)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        </div>
      </div>

      {/* ─── Veritabanı ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <Database size={17} className="text-slate-600" />
          <h2 className="font-semibold text-slate-800">Veritabanı</h2>
        </div>
        <div className="p-6 flex flex-wrap gap-3">
          <button
            onClick={async () => {
              await fetch("/api/log", { method: "DELETE" });
              showMessage("Loglar temizlendi", "success");
            }}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm hover:bg-red-100 transition-colors font-medium"
          >
            Logları Temizle
          </button>
          <a
            href="/api/admin/backup"
            download
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm hover:bg-blue-100 transition-colors font-medium flex items-center gap-2"
          >
            <Download size={14} /> Yedek Al
          </a>
        </div>
      </div>

      {/* Toast notification */}
      {mesaj && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 z-50 animate-slide-in ${
            mesajTur === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {mesajTur === "success"
            ? <CheckCircle size={16} />
            : <XCircle size={16} />
          }
          {mesaj}
        </div>
      )}
    </div>
  );
}
