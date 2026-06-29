"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle, Download, RefreshCw, Settings, AlertCircle, FileText, ExternalLink } from "lucide-react";

interface Tebligat {
  id: string;
  tebligatNo: string;
  konu?: string;
  gonderen?: string;
  tur?: string;
  durum: string;
  gonderimTarihi?: string;
  icerik?: string;
  davaId?: string;
}

export default function UETSPage() {
  const [tebligatlar, setTebligatlar] = useState<Tebligat[]>([]);
  const [kurulu, setKurulu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const [kurumKodu, setKurumKodu] = useState("");
  const [kurumSifre, setKurumSifre] = useState("");
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [sifre, setSifre] = useState("");
  const [testModu, setTestModu] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/uets");
      if (res.ok) {
        const data = await res.json();
        setTebligatlar(data.tebligatlar || []);
        setKurulu(data.ayarlar || false);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleSetup() {
    setSetupLoading(true);
    try {
      const res = await fetch("/api/uets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", kurumKodu, kurumSifre, kullaniciAdi, sifre, testModu }),
      });
      if (res.ok) {
        const data = await res.json();
        setKurulu(true);
        setShowSetup(false);
      }
    } catch (e) { console.error(e); }
    setSetupLoading(false);
  }

  async function checkNew() {
    setChecking(true);
    try {
      await fetch("/api/uets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      setTimeout(loadData, 3000);
    } catch (e) { console.error(e); }
    setChecking(false);
  }

  async function markRead(id: string) {
    await fetch("/api/uets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-read", id }),
    });
    setTebligatlar(prev => prev.map(t => t.id === id ? { ...t, durum: "okundu" } : t));
  }

  const yeniSayisi = tebligatlar.filter(t => t.durum === "alindi").length;

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={24} /> UETS Tebligat
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Ulusal Elektronik Tebligat Sistemi entegrasyonu
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {kurulu && (
            <button onClick={checkNew} disabled={checking} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={14} className={checking ? "spin" : ""} />
              {checking ? "Kontrol Ediliyor..." : "Yeni Tebligatları Kontrol Et"}
            </button>
          )}
          <button onClick={() => setShowSetup(!showSetup)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Settings size={14} />
            {kurulu ? "Ayarlar" : "Kurulum Yap"}
          </button>
        </div>
      </div>

      {yeniSayisi > 0 && (
        <div style={{ padding: "16px", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 600, color: "var(--accent)" }}>
          <AlertCircle size={20} />
          {yeniSayisi} adet okunmamış tebligatınız bulunuyor
        </div>
      )}

      {showSetup && (
        <div style={{ padding: "24px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600 }}>UETS Bağlantı Ayarları</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>Kurum Kodu</label>
              <input value={kurumKodu} onChange={e => setKurumKodu(e.target.value)} className="input-field" placeholder="Kurum kodunuz" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>Kurum Şifre</label>
              <input type="password" value={kurumSifre} onChange={e => setKurumSifre(e.target.value)} className="input-field" placeholder="Kurum şifreniz" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>Kullanıcı Adı</label>
              <input value={kullaniciAdi} onChange={e => setKullaniciAdi(e.target.value)} className="input-field" placeholder="Kullanıcı adı" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>Şifre</label>
              <input type="password" value={sifre} onChange={e => setSifre(e.target.value)} className="input-field" placeholder="Şifre" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" id="testModu" checked={testModu} onChange={e => setTestModu(e.target.checked)} />
            <label htmlFor="testModu" style={{ fontSize: "12px" }}>Test modu (API Test)</label>
          </div>
          <button onClick={handleSetup} disabled={setupLoading} className="btn-primary" style={{ width: "fit-content" }}>
            {setupLoading ? "Bağlanıyor..." : "Bağlantıyı Test Et & Kaydet"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <div style={{ padding: "20px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>TOPLAM TEBLİGAT</div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "8px" }}>{tebligatlar.length}</div>
        </div>
        <div style={{ padding: "20px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>OKUNMAMIŞ</div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "8px", color: "var(--accent)" }}>{yeniSayisi}</div>
        </div>
        <div style={{ padding: "20px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>UETS DURUMU</div>
          <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "8px", color: kurulu ? "var(--emerald)" : "var(--rose)" }}>
            {kurulu ? "Bağlı" : "Kurulum Gerekli"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Tebligat Listesi</h3>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Yükleniyor...</div>
        ) : tebligatlar.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            {kurulu ? "Henüz tebligat bulunmuyor." : "Lütfen önce UETS kurulumu yapın."}
          </div>
        ) : (
          tebligatlar.map(tb => (
            <div key={tb.id} style={{
              padding: "16px", backgroundColor: "var(--bg-secondary)", borderRadius: "10px",
              border: tb.durum === "alindi" ? "1px solid var(--accent)" : "1px solid var(--border-light)",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px"
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={16} style={{ color: tb.durum === "alindi" ? "var(--accent)" : "var(--text-muted)" }} />
                  <strong style={{ fontSize: "14px" }}>{tb.konu || `Tebligat #${tb.tebligatNo}`}</strong>
                  {tb.durum === "alindi" && (
                    <span style={{ fontSize: "10px", backgroundColor: "var(--accent-light)", color: "var(--accent)", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>YENİ</span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", display: "flex", gap: "16px" }}>
                  <span>Gönderen: {tb.gonderen || "Bilinmiyor"}</span>
                  <span>No: {tb.tebligatNo}</span>
                  {tb.gonderimTarihi && <span>Tarih: {new Date(tb.gonderimTarihi).toLocaleDateString("tr-TR")}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {tb.durum === "alindi" && (
                  <button onClick={() => markRead(tb.id)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "11px" }}>
                    <CheckCircle size={14} /> Okundu
                  </button>
                )}
                <button className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", fontSize: "11px" }}>
                  <Download size={14} /> İndir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
