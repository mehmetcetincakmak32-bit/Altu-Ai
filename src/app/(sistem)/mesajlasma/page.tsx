"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, Send, Mail, Phone, Sparkles, 
  History, Users, CheckCircle2, AlertCircle, Info 
} from "lucide-react";

export default function MesajlasmaPage() {
  const [tur, setTur] = useState("whatsapp"); // sms, email, whatsapp
  const [konu, setKonu] = useState("");
  const [icerik, setIcerik] = useState("");
  const [seciliMusteriler, setSeciliMusteriler] = useState<string[]>([]);
  const [musteriListesi, setMusteriListesi] = useState<any[]>([]);
  const [gecmis, setGecmis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMusteriler();
    fetchGecmis();
  }, []);

  const fetchMusteriler = async () => {
    try {
      const res = await fetch("/api/musteri");
      if (res.ok) {
        const data = await res.json();
        setMusteriListesi(data);
      }
    } catch {}
  };

  const fetchGecmis = async () => {
    try {
      const res = await fetch("/api/mesajlasma");
      if (res.ok) {
        const data = await res.json();
        setGecmis(data);
      }
    } catch {}
  };

  const handleGonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seciliMusteriler.length === 0) {
      setErrorMsg("Lütfen en az bir müvekkil seçin.");
      return;
    }
    if (!icerik || (tur === "email" && !konu)) {
      setErrorMsg("Lütfen mesaj içeriğini (ve email ise konusunu) doldurun.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Seçilen müvekkillerin iletişim bilgisini çıkaralım (e-posta veya telefon)
    const alicilar = seciliMusteriler.map(id => {
      const m = musteriListesi.find(x => x.id === id);
      return tur === "email" ? m?.eposta : m?.telefon;
    }).filter(Boolean);

    try {
      const res = await fetch("/api/mesajlasma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tur,
          konu: konu || "Bilgilendirme",
          icerik,
          alicilar
        }),
      });

      if (!res.ok) {
        throw new Error("Gönderim başarısız oldu.");
      }

      setSuccessMsg("Toplu mesaj gönderim işlemi başarıyla başlatıldı.");
      setIcerik("");
      setKonu("");
      setSeciliMusteriler([]);
      fetchGecmis();
    } catch (err: any) {
      setErrorMsg(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMusteri = (id: string) => {
    setSeciliMusteriler(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSeciliMusteriler(musteriListesi.map(m => m.id));
  };

  const selectNone = () => {
    setSeciliMusteriler([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold mb-1">
            <Sparkles size={18} />
            <span>ALTU AI Müvekkil İletişim Servisi</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Toplu Mesajlaşma Paneli</h1>
          <p className="text-slate-400 text-sm mt-1">Müvekkillerinize SMS, E-posta ve WhatsApp üzerinden toplu bilgilendirme ve tebligat bildirimleri gönderin.</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 flex items-center gap-2 text-sm font-medium self-start md:self-center">
          <MessageSquare size={18} />
          <span>WhatsApp, SMS & E-Posta Entegrasyonu</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left - Form & Channels */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <form onSubmit={handleGonder} className="space-y-6">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Gönderim Kanalı</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, desc: "Anlık WhatsApp mesajı" },
                    { id: "sms", label: "SMS", icon: Phone, desc: "Normal Hücresel SMS" },
                    { id: "email", label: "E-Posta", icon: Mail, desc: "Hukuki E-posta bildirimi" }
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => { setTur(ch.id); setErrorMsg(null); }}
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        tur === ch.id 
                          ? "bg-blue-600/10 border-blue-500 text-blue-400" 
                          : "bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                      }`}
                    >
                      <ch.icon size={22} className={tur === ch.id ? "text-blue-400" : "text-slate-500"} />
                      <div className="mt-3">
                        <p className="font-bold text-sm text-slate-200">{ch.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{ch.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Receivers Selector */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Alıcı Müvekkiller ({seciliMusteriler.length} Seçili)
                  </label>
                  <div className="space-x-2 text-xs">
                    <button type="button" onClick={selectAll} className="text-blue-400 hover:text-blue-300 font-semibold">Tümünü Seç</button>
                    <span className="text-slate-600">•</span>
                    <button type="button" onClick={selectNone} className="text-blue-400 hover:text-blue-300 font-semibold">Seçimi Kaldır</button>
                  </div>
                </div>
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/20 max-h-[160px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {musteriListesi.length > 0 ? (
                    musteriListesi.map((m) => (
                      <div 
                        key={m.id}
                        onClick={() => toggleMusteri(m.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between text-xs ${
                          seciliMusteriler.includes(m.id)
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400 font-semibold"
                            : "bg-slate-800/30 border-slate-800 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-500" />
                          <span>{m.ad} {m.soyad}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {tur === "email" ? m.eposta : m.telefon}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-6 text-slate-500 text-xs">
                      Sistemde kayıtlı müvekkil bulunamadı.
                    </div>
                  )}
                </div>
              </div>

              {/* Subject (for email) */}
              {tur === "email" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">E-posta Konusu</label>
                  <input
                    type="text"
                    value={konu}
                    onChange={(e) => setKonu(e.target.value)}
                    placeholder="E-posta konu başlığı..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                  />
                </div>
              )}

              {/* Message Content */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mesaj İçeriği</label>
                <textarea
                  value={icerik}
                  onChange={(e) => setIcerik(e.target.value)}
                  placeholder="Gönderilecek mesaj veya bilgilendirme metnini yazın..."
                  rows={8}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm leading-relaxed"
                />
              </div>

              {/* Feedback messages */}
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Gönderiliyor..." : "Mesajları Gönder"}
              </button>
            </form>
          </div>
        </div>

        {/* Right - History / Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <History size={18} className="text-blue-500" />
              Gönderim Raporları
            </h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {gecmis.length > 0 ? (
                gecmis.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.durum === 'gonderildi' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.durum === 'gonderildi' ? 'GÖNDERİLDİ' : 'BEKLİYOR'}
                      </span>
                      <span className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-200">{item.konu}</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-3">{item.icerik}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 mt-2">
                      <span className="capitalize font-semibold text-slate-400">{item.tur}</span>
                      <span>Kişi Sayısı: {item.gonderilenSayi || JSON.parse(item.alicilar).length}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <Info size={24} className="text-slate-600" />
                  <span>Geçmiş gönderim bulunamadı.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
