
import Link from "next/link";
import { Scale, Shield, Zap, Search, ChevronRight, Calendar, Award, Database, Volume2 } from "lucide-react";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ALTU AI — Modern Hukuk Büroları İçin Yapay Zeka Destekli Yönetim Sistemi",
  description: "UYAP entegrasyonu, otomatik UETS takibi ve yapay zeka destekli hukuki araştırma ile hukuk büronuzun verimliliğini 3 kat artırın. Güvenli, otonom ve akıllı hukuk asistanı.",
  keywords: ["hukuk otomasyonu", "yapay zeka", "UYAP", "UETS", "hukuk bürosu yönetimi", "avukat asistanı"],
};

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ALTU AI",
    "applicationCategory": "BusinessApplication",
    "description": "Yapay zeka destekli hukuk bürosu yönetim sistemi.",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "TRY"
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Scale size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ALTU AI
            </span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400 font-medium">
              <a href="#ozellikler" className="hover:text-white transition-colors">Özellikler</a>
              <a href="#hizmetler" className="hover:text-white transition-colors">Hizmetlerimiz</a>
            </nav>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 transition-all text-white shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              Avukat Girişi
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/50 text-xs text-indigo-400 font-semibold mb-2">
          <Shield size={12} /> Hukuk Büroları İçin Geliştirilmiş En Gelişmiş Otonom Hukuki Zeka
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
          ALTU AI — Modern Hukuk Büroları İçin <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
            Yapay Zeka Destekli Yönetim Sistemi
          </span>
        </h1>
        
        <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          UYAP entegrasyonu, otomatik UETS takibi ve yapay zeka destekli hukuki araştırma ile hukuk büronuzun verimliliğini 3 kat artırın.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-750 hover:to-purple-750 transition-all text-white flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            Sisteme Giriş Yap <ChevronRight size={16} />
          </Link>
          <a
            href="#ozellikler"
            className="px-6 py-3 rounded-xl text-sm font-semibold border border-slate-800 hover:border-slate-700 hover:bg-slate-900/30 transition-all text-slate-300"
          >
            Sistemi Keşfet
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="ozellikler" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">ALTU AI Üst Düzey Özellikleri</h2>
          <p className="text-sm text-slate-500">Avukatların günlük iş yükünü sıfıra indirmek üzere tasarlanan akıllı modüller.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950/40 backdrop-blur-sm space-y-4 hover:border-indigo-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-lg">Güvenli UYAP Entegrasyonu</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              T.C. Kimlik numaranız, UYAP/e-Devlet şifreniz ve e-imza PIN kodunuzu kullanarak sistem tüm dosyalarınızı, duruşmalarınızı ve evraklarınızı tek tıkla otomatik olarak sisteme aktarır.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950/40 backdrop-blur-sm space-y-4 hover:border-purple-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Search size={20} />
            </div>
            <h3 className="font-bold text-lg">Yüksek Mahkeme Arama Ağı</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Yargıtay, Danıştay, Anayasa Mahkemesi ve Resmi Gazete arşivlerini eşzamanlı olarak tarar. Kararları mükerrer kayıt oluşturmadan doğrudan yapay zeka analizine dahil eder.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950/40 backdrop-blur-sm space-y-4 hover:border-pink-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
              <Scale size={20} />
            </div>
            <h3 className="font-bold text-lg">Sadeleştirilmiş Mahkeme Modu</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Duruşma esnasında hakime sadece önceden işaretlediğiniz önemli evrakları, dekontları ve delilleri yansıtır. Tüm özel panel menülerini tek tuşla tamamen gizleyerek güvenlik sağlar.
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="hizmetler" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">ALTU AI Hukuk Hizmetleri</h2>
          <p className="text-sm text-slate-500">Hukuk bürolarını tamamen otonom hale getiren kurumsal servislerimiz.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/20 border border-slate-900">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Database size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">%100 Yerel ve Güvenli Veri Depolama</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Dosyalarınız, müvekkil kayıtlarınız ve UYAP verileriniz tamamen size özel, yüksek güvenlikli yerel sunucularımızda şifreli olarak barındırılır. Verileriniz asla üçüncü şahıslarla, bulut sağlayıcılarıyla veya dış kurumlarla paylaşılmaz; veri gizliliğiniz mutlak koruma altındadır.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/20 border border-slate-900">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
              <Calendar size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Akıllı Yoğunluk Haritalı Takvim</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                İş ve duruşma tarihleriniz, takvim üzerinde yoğunluk derecelerine göre renklenir. Günlük iş takibi ve duruşma saatleri tek bir ekranda toplanarak operasyonel hata payı sıfırlanır.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/20 border border-slate-900">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 flex-shrink-0">
              <Volume2 size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Sesli Komut & Asistan Desteği</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Dosyalar, takvim, finansal raporlar ve arama işlemleri arasında sesli komutlarla eller serbest şekilde gezinebilir, sistem asistanına sesli olarak sorular yöneltebilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/20 border border-slate-900">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Award size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Otonom Hukuk Müşaviri & Duygusal Yapay Zeka</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Türk hukuk terimleri, insansı duygular ve **10 milyon üzeri zengin içtihat ile mevzuat verisetiyle** özel olarak eğitilmiş, avukat-müvekkil ilişkilerinde yüksek empati yeteneğine sahip yapay zeka modeli. Şablon yanıtlar yerine, Resmi Gazete ve mahkeme içtihatlarını dinamik analiz ederek tıpkı uzman bir hukuk müşaviri gibi mütalaalar ve duyarlı çözüm önerileri üretir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600">
        <p>&copy; {new Date().getFullYear()} ALTU AI Hukuk Otomasyon Portalı. Tüm Hakları Saklıdır.</p>
      </footer>
    </div>
  );
}
