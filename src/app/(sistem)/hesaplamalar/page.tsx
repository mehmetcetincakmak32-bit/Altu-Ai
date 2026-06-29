"use client";

import { useState } from "react";
import { Calculator, Wallet, Scale, Clock, Coins, Receipt, Percent, FileText, ArrowRight } from "lucide-react";

export default function HesaplamalarPage() {
  const [activeCalc, setActiveCalc] = useState<"kidem" | "faiz" | "aaut">("kidem");

  // KIDEM & DETAYLI İŞÇİ ALACAKLARI STATE
  const [kidemBaslangic, setKidemBaslangic] = useState("");
  const [kidemBitis, setKidemBitis] = useState("");
  const [brutUcret, setBrutUcret] = useState(0);
  const [ekYardim, setEkYardim] = useState(0);
  const [fazlaMesaiSaat, setFazlaMesaiSaat] = useState(0);
  const [yillikIzinGun, setYillikIzinGun] = useState(0);
  const [kidemResult, setKidemResult] = useState<any>(null);

  // FAİZ STATE
  const [anaPara, setAnaPara] = useState(0);
  const [faizBaslangic, setFaizBaslangic] = useState("");
  const [faizBitis, setFaizBitis] = useState("");
  const [faizTuru, setFaizTuru] = useState("yasal"); // yasal (%9), ticari (%19), avans (%45)
  const [faizResult, setFaizResult] = useState<any>(null);

  // AAÜT STATE
  const [mahkemeTuru, setMahkemeTuru] = useState("asliye");
  const [davaTuru, setDavaTuru] = useState("nisbi"); // nisbi veya maktu
  const [davaDegeri, setDavaDegeri] = useState(0);
  const [hesaplaKdv, setHesaplaKdv] = useState(true);
  const [aautResult, setAautResult] = useState<any>(null);

  // Kıdem, İhbar ve Detaylı İşçi Alacakları Hesaplama Fonksiyonu
  const hesaplaKidem = () => {
    if (!kidemBaslangic || !kidemBitis || brutUcret <= 0) return;
    const bas = new Date(kidemBaslangic);
    const bit = new Date(kidemBitis);
    const diffTime = Math.abs(bit.getTime() - bas.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const yillar = Math.floor(diffDays / 365.25);
    const aylar = Math.floor((diffDays % 365.25) / 30.43);
    const gunler = Math.floor((diffDays % 365.25) % 30.43);

    // Kıdem tavanı (2026 yılı güncel varsayılan tavanı)
    const KIDEM_TAVANI = 41828.42; 
    const giydirilmisUcret = brutUcret + ekYardim;
    const kidemeEsasUcret = Math.min(giydirilmisUcret, KIDEM_TAVANI);

    const kidemTazminatiBrut = (kidemeEsasUcret * diffDays) / 365.25;
    const kidemDamgaVergisi = kidemTazminatiBrut * 0.00759;
    const kidemTazminatiNet = kidemTazminatiBrut - kidemDamgaVergisi;

    // İhbar tazminatı süresi hesaplama
    let ihbarHafta = 2;
    if (diffDays >= 180 && diffDays < 540) ihbarHafta = 4;
    else if (diffDays >= 540 && diffDays < 1080) ihbarHafta = 6;
    else if (diffDays >= 1080) ihbarHafta = 8;

    const ihbarGun = ihbarHafta * 7;
    const ihbarTazminatiBrut = (brutUcret / 30) * ihbarGun;
    const ihbarGelirVergisi = ihbarTazminatiBrut * 0.15; // Başlangıç dilimi %15
    const ihbarDamgaVergisi = ihbarTazminatiBrut * 0.00759;
    const ihbarTazminatiNet = ihbarTazminatiBrut - ihbarGelirVergisi - ihbarDamgaVergisi;

    // Fazla Çalışma Hesaplama (Alimc48/isci-haklari-asistani formülleri)
    // Fazla çalışma saat ücreti = normal saat ücreti * 1.5
    const saatUcreti = brutUcret / 225;
    const fazlaMesaiBrut = fazlaMesaiSaat * saatUcreti * 1.5;
    const fazlaMesaiGelirVergisi = fazlaMesaiBrut * 0.15;
    const fazlaMesaiDamgaVergisi = fazlaMesaiBrut * 0.00759;
    const fazlaMesaiNet = fazlaMesaiBrut - fazlaMesaiGelirVergisi - fazlaMesaiDamgaVergisi;

    // Yıllık İzin Ücreti Hesaplama
    // Kullanılmayan izin günü * günlük brüt ücret
    const gunlukBrut = brutUcret / 30;
    const yillikIzinBrut = yillikIzinGun * gunlukBrut;
    const yillikIzinGelirVergisi = yillikIzinBrut * 0.15;
    const yillikIzinDamgaVergisi = yillikIzinBrut * 0.00759;
    const yillikIzinNet = yillikIzinBrut - yillikIzinGelirVergisi - yillikIzinDamgaVergisi;

    setKidemResult({
      yillar, aylar, gunler, toplamGun: diffDays,
      kidemeEsasUcret,
      kidemTazminatiBrut, kidemDamgaVergisi, kidemTazminatiNet,
      ihbarHafta, ihbarTazminatiBrut, ihbarGelirVergisi, ihbarDamgaVergisi, ihbarTazminatiNet,
      fazlaMesaiBrut, fazlaMesaiNet, fazlaMesaiSaat,
      yillikIzinBrut, yillikIzinNet, yillikIzinGun,
      toplamNet: kidemTazminatiNet + ihbarTazminatiNet + fazlaMesaiNet + yillikIzinNet
    });
  };

  // Faiz Hesaplama Fonksiyonu
  const hesaplaFaiz = () => {
    if (anaPara <= 0 || !faizBaslangic || !faizBitis) return;
    const bas = new Date(faizBaslangic);
    const bit = new Date(faizBitis);
    const diffTime = Math.abs(bit.getTime() - bas.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let oran = 0.09; // Yasal faiz varsayılan %9
    if (faizTuru === "ticari") oran = 0.19; 
    else if (faizTuru === "avans") oran = 0.45; 

    // Faiz formülü: F = (A * G * Oran) / 365
    const faizTutari = (anaPara * diffDays * oran) / 365;
    const toplamAlacak = anaPara + faizTutari;

    setFaizResult({
      gunSayisi: diffDays,
      faizOrani: oran * 100,
      faizTutari,
      toplamAlacak
    });
  };

  // AAÜT Hesaplama Fonksiyonu (KDV Dahil/Hariç ve Stopaj Detaylı)
  const hesaplaAaut = () => {
    let vekaletUcreti = 0;
    let aciklama = "";

    // 2026 Maktu tarifeler
    const maktuTarife: Record<string, number> = {
      icra: 4600,
      sulh: 10700,
      asliye: 17900,
      agir_ceza: 29800,
    };

    if (davaTuru === "maktu") {
      vekaletUcreti = maktuTarife[mahkemeTuru] || 17900;
      aciklama = `AAÜT gereğince ${mahkemeTuru.toUpperCase()} için belirlenen maktu vekalet ücretidir.`;
    } else {
      // Nisbi vekalet ücreti hesaplama (AAÜT Artan Oranlı Basamak Sistemi)
      const basamaklar = [
        { limit: 200000, oran: 0.16 },
        { limit: 200000, oran: 0.15 },
        { limit: 400000, oran: 0.14 },
        { limit: 800000, oran: 0.11 },
        { limit: 1600000, oran: 0.08 },
        { limit: 3200000, oran: 0.05 },
        { limit: 6400000, oran: 0.03 },
        { limit: Infinity, oran: 0.01 }
      ];

      let kalanDeger = davaDegeri;
      let toplamNisbi = 0;

      for (const b of basamaklar) {
        if (kalanDeger <= 0) break;
        const dilim = Math.min(kalanDeger, b.limit);
        toplamNisbi += dilim * b.oran;
        kalanDeger -= dilim;
      }

      const asgariMaktu = maktuTarife[mahkemeTuru] || 17900;
      vekaletUcreti = Math.max(toplamNisbi, asgariMaktu);
      aciklama = toplamNisbi < asgariMaktu 
        ? `Nispi oran hesaplaması (${toplamNisbi.toLocaleString("tr-TR")} TL) asgari maktu limitin altında kaldığı için maktu tutar uygulanmıştır.`
        : `AAÜT Artan Oranlı Nisbi tarife uyarınca hesaplanmıştır.`;
    }

    // KDV hesaplamaları (%20 KDV oranı)
    const kdvOrani = 0.20;
    const kdvTutari = hesaplaKdv ? vekaletUcreti * kdvOrani : 0;
    const toplamUcret = vekaletUcreti + kdvTutari;

    setAautResult({
      vekaletUcreti,
      kdvTutari,
      toplamUcret,
      aciklama
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <Calculator className="h-7 w-7 text-blue-600 animate-pulse" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans">Hukuki Hesaplama Modülleri</h1>
          <p className="text-xs text-slate-500 mt-0.5">Avukat ve hukukçular için güncel iş hukuku, vekalet ücretleri ve faiz hesaplama motorları.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveCalc("kidem")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-200 ${activeCalc === "kidem" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Clock className="w-4 h-4" />
          Kıdem, İhbar & İşçi Alacakları
        </button>
        <button
          onClick={() => setActiveCalc("faiz")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-200 ${activeCalc === "faiz" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Coins className="w-4 h-4" />
          Yasal / Ticari Faiz
        </button>
        <button
          onClick={() => setActiveCalc("aaut")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-200 ${activeCalc === "aaut" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Scale className="w-4 h-4" />
          Asgari Vekalet Ücreti (AAÜT)
        </button>
      </div>

      {/* KIDEM CALCULATOR */}
      {activeCalc === "kidem" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2"><Clock className="text-blue-600 w-4 h-4" /> Çalışma ve Alacak Bilgileri</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">İşe Başlama Tarihi</label>
                <input
                  type="date"
                  value={kidemBaslangic}
                  onChange={(e) => setKidemBaslangic(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">İşten Çıkış Tarihi</label>
                <input
                  type="date"
                  value={kidemBitis}
                  onChange={(e) => setKidemBitis(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Son Brüt Ücret (Aylık TL)</label>
              <input
                type="number"
                value={brutUcret || ""}
                onChange={(e) => setBrutUcret(Number(e.target.value))}
                placeholder="Örn: 35000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ek Düzenli Sosyal Yardımlar (Yol, Yemek vb. Nakdi Aylık TL)</label>
              <input
                type="number"
                value={ekYardim || ""}
                onChange={(e) => setEkYardim(Number(e.target.value))}
                placeholder="Örn: 5000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fazla Mesai Süresi (Toplam Saat)</label>
                <input
                  type="number"
                  value={fazlaMesaiSaat || ""}
                  onChange={(e) => setFazlaMesaiSaat(Number(e.target.value))}
                  placeholder="Örn: 150"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Kullanılmayan İzin Süresi (Gün)</label>
                <input
                  type="number"
                  value={yillikIzinGun || ""}
                  onChange={(e) => setYillikIzinGun(Number(e.target.value))}
                  placeholder="Örn: 14"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              onClick={hesaplaKidem}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm cursor-pointer shadow-md"
            >
              Alacakları Hesapla
            </button>
          </div>

          {/* Kidem Result */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2"><Wallet className="text-emerald-600 w-4 h-4" /> Hesaplama Sonuçları</h2>
            {kidemResult ? (
              <div className="space-y-4 text-sm">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500 text-xs block mb-1">Toplam Çalışma Süresi</span>
                  <span className="font-bold text-slate-800">{kidemResult.yillar} Yıl, {kidemResult.aylar} Ay, {kidemResult.gunler} Gün ({kidemResult.toplamGun} Gün)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-xs block mb-1">Kıdeme Esas Brüt Ücret</span>
                    <span className="font-bold text-slate-800">{kidemResult.kidemeEsasUcret.toLocaleString("tr-TR")} TL</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-xs block mb-1">İhbar Öneli Süresi</span>
                    <span className="font-bold text-slate-800">{kidemResult.ihbarHafta} Hafta</span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Net Kıdem Tazminatı:</span>
                    <span className="text-emerald-700">{kidemResult.kidemTazminatiNet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Net İhbar Tazminatı:</span>
                    <span className="text-emerald-700">{kidemResult.ihbarTazminatiNet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</span>
                  </div>
                  {kidemResult.fazlaMesaiSaat > 0 && (
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-600">Net Fazla Mesai Alacağı:</span>
                      <span className="text-emerald-700">{kidemResult.fazlaMesaiNet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</span>
                    </div>
                  )}
                  {kidemResult.yillikIzinGun > 0 && (
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-600">Net Yıllık İzin Alacağı:</span>
                      <span className="text-emerald-700">{kidemResult.yillikIzinNet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</span>
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-slate-350 pt-3 flex justify-between font-bold text-slate-900 text-lg bg-blue-50/70 p-3 rounded-lg shadow-sm border border-blue-100">
                  <span>Net Toplam Alacak:</span>
                  <span className="text-blue-750">{kidemResult.toplamNet.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Hesaplama sonuçlarını görmek için soldaki alanları doldurup "Alacakları Hesapla" butonuna basın.
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAİZ CALCULATOR */}
      {activeCalc === "faiz" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2"><Coins className="text-blue-600 w-4 h-4" /> Alacak ve Faiz Bilgileri</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ana Para Tutarı (TL)</label>
              <input
                type="number"
                value={anaPara || ""}
                onChange={(e) => setAnaPara(Number(e.target.value))}
                placeholder="Örn: 100000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Faiz Başlangıç</label>
                <input
                  type="date"
                  value={faizBaslangic}
                  onChange={(e) => setFaizBaslangic(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Faiz Bitiş</label>
                <input
                  type="date"
                  value={faizBitis}
                  onChange={(e) => setFaizBitis(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Faiz Oranı Türü</label>
              <select
                value={faizTuru}
                onChange={(e) => setFaizTuru(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all text-slate-700"
              >
                <option value="yasal">Yasal Temerrüt Faizi (%9)</option>
                <option value="ticari">Değişken Ticari Faiz (%19)</option>
                <option value="avans">TCMB Avans Faizi (%45)</option>
              </select>
            </div>

            <button
              onClick={hesaplaFaiz}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm cursor-pointer shadow-md"
            >
              Faiz Hesapla
            </button>
          </div>

          {/* Faiz Result */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2"><Wallet className="text-emerald-600 w-4 h-4" /> Faiz Raporu</h2>
            {faizResult ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-slate-500 text-xs block mb-1">Hesaplanan Gün Sayısı</span>
                    <span className="font-bold text-slate-800">{faizResult.gunSayisi} Gün</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-slate-500 text-xs block mb-1">Uygulanan Yıllık Faiz</span>
                    <span className="font-bold text-slate-800">%{faizResult.faizOrani}</span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Ana Para Tutarı:</span>
                    <span className="font-semibold text-slate-800">{anaPara.toLocaleString("tr-TR")} TL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Birikmiş Faiz Tutarı:</span>
                    <span className="font-bold text-red-650">+ {faizResult.faizTutari.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</span>
                  </div>
                  <div className="border-t-2 border-slate-350 pt-3 flex justify-between font-bold text-slate-900 text-lg bg-blue-50/70 p-3 rounded-lg shadow-sm border border-blue-100">
                    <span>Toplam Alacak Tutarı:</span>
                    <span className="text-blue-750">{faizResult.toplamAlacak.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Faiz hesaplama sonuçlarını görmek için soldaki alanları doldurup "Faiz Hesapla" butonuna basın.
              </div>
            )}
          </div>
        </div>
      )}

      {/* AAÜT CALCULATOR */}
      {activeCalc === "aaut" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2"><Scale className="text-blue-600 w-4 h-4" /> Tarife ve Konu Bilgileri</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Mahkeme veya Takip Türü</label>
              <select
                value={mahkemeTuru}
                onChange={(e) => setMahkemeTuru(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all text-slate-700"
              >
                <option value="icra">İcra Dairelerinde Yapılan Takip (Maktu: 4.600 TL)</option>
                <option value="sulh">Sulh Hukuk Mahkemeleri (Maktu: 10.700 TL)</option>
                <option value="asliye">Asliye Hukuk Mahkemeleri (Maktu: 17.900 TL)</option>
                <option value="agir_ceza">Ağır Ceza Mahkemeleri (Maktu: 29.800 TL)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hesaplama Yöntemi</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-sans">
                  <input
                    type="radio"
                    name="davaTuru"
                    value="nisbi"
                    checked={davaTuru === "nisbi"}
                    onChange={() => setDavaTuru("nisbi")}
                    className="text-blue-600"
                  />
                  Nisbi (Dava Konusu Değeri Üzerinden %)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-sans">
                  <input
                    type="radio"
                    name="davaTuru"
                    value="maktu"
                    checked={davaTuru === "maktu"}
                    onChange={() => setDavaTuru("maktu")}
                    className="text-blue-600"
                  />
                  Maktu (Sabit Tarife)
                </label>
              </div>
            </div>

            {davaTuru === "nisbi" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Dava veya İcra Konu Değeri (TL)</label>
                <input
                  type="number"
                  value={davaDegeri || ""}
                  onChange={(e) => setDavaDegeri(Number(e.target.value))}
                  placeholder="Örn: 750000"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            )}

            <div className="flex items-center gap-2 border-t pt-3">
              <input
                type="checkbox"
                id="kdvCheck"
                checked={hesaplaKdv}
                onChange={(e) => setHesaplaKdv(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="kdvCheck" className="text-xs font-semibold text-slate-600 cursor-pointer font-sans">
                %20 Katma Değer Vergisi (KDV) Dahil Et
              </label>
            </div>

            <button
              onClick={hesaplaAaut}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm cursor-pointer shadow-md"
            >
              Ücret Hesapla
            </button>
          </div>

          {/* AAÜT Result */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2"><Receipt className="text-emerald-600 w-4 h-4" /> Vekalet Ücreti Raporu</h2>
            {aautResult ? (
              <div className="space-y-4 text-sm">
                <div className="bg-white p-4 rounded-lg border border-slate-200 text-center space-y-1 shadow-sm">
                  <span className="text-slate-500 text-xs block">AAÜT Asgari Vekalet Ücreti (Brüt)</span>
                  <span className="font-extrabold text-blue-700 text-xl">{aautResult.vekaletUcreti.toLocaleString("tr-TR")} TL</span>
                </div>

                {hesaplaKdv && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 text-slate-700">
                    <div className="flex justify-between text-xs">
                      <span>Vekalet Ücreti (Matrah):</span>
                      <span>{aautResult.vekaletUcreti.toLocaleString("tr-TR")} TL</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Hesaplanan KDV (%20):</span>
                      <span className="text-red-500">+ {aautResult.kdvTutari.toLocaleString("tr-TR")} TL</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1.5 text-sm text-slate-900">
                      <span>Toplam Vekalet Ücreti (KDV Dahil):</span>
                      <span className="text-blue-750">{aautResult.toplamUcret.toLocaleString("tr-TR")} TL</span>
                    </div>
                  </div>
                )}

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-xs block mb-1">Açıklama / Yasal Gerekçe</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">{aautResult.aciklama}</p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Vekalet ücreti hesaplama sonuçlarını görmek için soldaki alanları doldurup "Ücret Hesapla" butonuna basın.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
