"use client"
 
import { FileText, Copy, Download, Sparkles, BookOpen, Printer } from "lucide-react"
import { useState, useEffect } from "react"
 
const BELGE_TURU = [
  { value: "dilekce", label: "Dilekçe" },
  { value: "sozlesme", label: "Sözleşme" },
  { value: "ihbarname", label: "İhbarname" },
]
 
const DILEKCE_FIELDS = [
  { key: "musteriAdi", label: "Müşteri Adı", type: "text" },
  { key: "karsiTaraf", label: "Karşı Taraf", type: "text" },
  { key: "mahkeme", label: "Mahkeme", type: "text" },
  { key: "davaAdi", label: "Dava Adı", type: "text" },
  { key: "aciklama", label: "Açıklama (Olaylar)", type: "textarea" },
  { key: "hukukiSebep", label: "Hukuki Sebep (Maddeler)", type: "textarea" },
  { key: "deliller", label: "Deliller", type: "textarea" },
]
 
const SOZLESME_FIELDS = [
  { key: "tur", label: "Sözleşme Türü", type: "text" },
  { key: "taraf1", label: "Taraf 1", type: "text" },
  { key: "taraf2", label: "Taraf 2", type: "text" },
  { key: "konu", label: "Konu", type: "text" },
  { key: "tanimlar", label: "Tanımlar", type: "textarea" },
  { key: "hakVeYukumlulukler", label: "Hak ve Yükümlülükler", type: "textarea" },
  { key: "bedel", label: "Bedel", type: "text" },
  { key: "sure", label: "Süre", type: "text" },
  { key: "fesih", label: "Fesih", type: "textarea" },
]
 
const IHBARNAME_FIELDS = [
  { key: "gonderen", label: "Gönderen", type: "text" },
  { key: "alici", label: "Alıcı", type: "text" },
  { key: "konu", label: "Konu", type: "text" },
  { key: "icerik", label: "İçerik", type: "textarea" },
]
 
const TEMPLATE_PRESETS = [
  {
    id: "kira_tahliye",
    label: "Kira Tahliye Dilekçesi",
    tur: "dilekce",
    baslik: "Kira Sözleşmesinin Sona Ermesi Nedeniyle Tahliye Dilekçesi",
    fields: {
      mahkeme: "Nöbetçi Sulh Hukuk Mahkemesi Hakimliği'ne",
      davaAdi: "Kira Sözleşmesinin Feshi ve Tahliye Talebi",
      hukukiSebep: "6098 Sayılı Türk Borçlar Kanunu Madde 347, 350 ve Hukuk Muhakemeleri Kanunu.",
      deliller: "Kira Sözleşmesi, Noter İhtarnamesi, Tebliğ Şerhi, Tapu Kayıtları, Tanık Beyanları.",
      aciklama: "Müvekkil ile davalı kiracı arasındaki kira sözleşmesinin süresi dolmuştur. Yasal süreler içinde noter kanalıyla ihtarname gönderilmiş olmasına rağmen davalı kiracı taşınmazı boşaltmamış ve müvekkile teslim etmemiştir."
    }
  },
  {
    id: "kira_tahliye_ihtar",
    label: "Kira Tahliye İhtarnamesi",
    tur: "ihbarname",
    baslik: "Kira Tahliye Talepli Noter İhtarnamesi",
    fields: {
      gonderen: "Kiralayan (Ev Sahibi)",
      alici: "Kiracı (Muhatap)",
      konu: "Kira sözleşmesinin yenilenmeyeceği ve dönem sonunda taşınmazın boşaltılması ihtarı",
      icerik: "Sayın Muhatap, aramızda düzenlenen kira sözleşmesinin süresi dolacağından, sözleşmenin yenilenmeyeceğini bildirir; kira dönemi sonunda taşınmazı boşaltarak anahtarları müvekkile teslim etmenizi, aksi takdirde yasal yollara başvurulacağını ihtar ederiz."
    }
  },
  {
    id: "bosanma_protokolu",
    label: "Anlaşmalı Boşanma Protokolü",
    tur: "sozlesme",
    baslik: "Anlaşmalı Boşanma ve Protokol Taslağı",
    fields: {
      tur: "Anlaşmalı Boşanma Protokolü",
      taraf1: "Eş A",
      taraf2: "Eş B",
      konu: "Velayet, nafaka ve mal paylaşımı şartlarının belirlenmesi",
      tanimlar: "Taraflar, evlilik birliğini karşılıklı anlaşma yoluyla sonlandırmayı kabul ederler.",
      hakVeYukumlulukler: "Müşterek çocukların velayeti anneye verilecek, baba çocukların eğitimi ve bakımı için nafaka ödeyecektir. Taraflar karşılıklı olarak birbirlerinden tazminat ve yoksulluk nafakası talep etmemektedir.",
      bedel: "Aylık 5.000 TL İştirak Nafakası",
      sure: "Çocuklar 18 yaşını doldurana kadar",
      fesih: "Protokol, Aile Mahkemesi tarafından onaylanıp kesinleştikten sonra geçerlilik kazanır."
    }
  },
  {
    id: "vekaletname",
    label: "Genel Vekaletname",
    tur: "sozlesme",
    baslik: "Genel Avukatlık Vekaletnamesi",
    fields: {
      tur: "Avukatlık Vekaletnamesi",
      taraf1: "Müvekkil",
      taraf2: "Avukat (Vekil)",
      konu: "Avukatın müvekkili tüm adli ve idari mercilerde temsil etmesi",
      tanimlar: "Vekil, müvekkil adına dava açmaya, icra takibi başlatmaya ve sulh olmaya yetkilidir.",
      hakVeYukumlulukler: "Vekil, müvekkilin haklarını en iyi şekilde savunacaktır. Ahzu kabz, feragat ve kabul yetkilerini barındırır.",
      bedel: "Avukatlık Asgari Ücret Tarifesi (AAÜT) uyarınca belirlenecek ücret",
      sure: "Vekaletten azil veya istifaya kadar süresiz geçerlidir.",
      fesih: "Yazılı azilname veya istifa beyanı ile sözleşme sona erer."
    }
  },
  {
    id: "is_alacagi_dilekce",
    label: "İşçi Alacağı Dava Dilekçesi",
    tur: "dilekce",
    baslik: "İşçi Alacakları ve Kıdem Tazminatı Talepli Dava Dilekçesi",
    fields: {
      mahkeme: "Nöbetçi İş Mahkemesi Hakimliği'ne",
      davaAdi: "İşçi Alacakları Davası",
      hukukiSebep: "4857 Sayılı İş Kanunu, 6100 Sayılı HMK ve ilgili mevzuat.",
      deliller: "SGK Hizmet Dökümü, İş Yeri Şahsi Dosyası, Banka Dekontları, Tanık Beyanları, Arabuluculuk Son Tutanağı.",
      aciklama: "Müvekkil, davalı iş yerinde çalışırken iş sözleşmesi haklı ve geçerli bir neden gösterilmeksizin feshedilmiştir. Arabuluculuk görüşmelerinde anlaşma sağlanamamış olup, kıdem, ihbar ve fazla çalışma ücretlerimizin tahsili için dava açma zarureti doğmuştur."
    }
  },
  {
    id: "icra_takip_talebi",
    label: "İcra Takip Talebi",
    tur: "dilekce",
    baslik: "İlamsız İcra Takibi Takip Talebi (Örnek No: 7)",
    fields: {
      mahkeme: "İcra Dairesi Müdürlüğü'ne",
      davaAdi: "İlamsız İcra Takibi",
      hukukiSebep: "2004 Sayılı İcra ve İflas Kanunu Madde 58 ve devamı.",
      deliller: "Fatura, Cari Hesap Ekstresi, İhtarname, Banka Dekontları.",
      aciklama: "Borçlunun müvekkile olan fatura borcunu vadesinde ödememesi üzerine, alacağın faiziyle birlikte tahsili amacıyla ilamsız takip başlatılması talebidir."
    }
  }
]
 
export default function BelgeOlusturPage() {
  const [tur, setTur] = useState("dilekce")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [baslik, setBaslik] = useState("")
  const [davaId, setDavaId] = useState("")
  const [yontem, setYontem] = useState("klasik")
  const [dilekceTuru, setDilekceTuru] = useState("dava")
  const [dosyalar, setDosyalar] = useState<{ id: string; davaAdi: string }[]>([])
  const [sonuc, setSonuc] = useState("")
  const [loading, setLoading] = useState(false)
 
  useEffect(() => {
    fetch("/api/dosyalar")
      .then((r) => r.json())
      .then(setDosyalar)
      .catch(() => {})
  }, [])
 
  const getFields = () => {
    if (tur === "dilekce") return DILEKCE_FIELDS
    if (tur === "sozlesme") return SOZLESME_FIELDS
    return IHBARNAME_FIELDS
  }
 
  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }
 
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    if (!templateId) {
      setFormData({})
      setBaslik("")
      return
    }
    const template = TEMPLATE_PRESETS.find((t) => t.id === templateId)
    if (template) {
      setTur(template.tur)
      setBaslik(template.baslik)
      setFormData({ ...template.fields })
    }
  }
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSonuc("")
    try {
      const res = await fetch("/api/ai/belge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tur,
          data: { ...formData, davaId, baslik, yontem, dilekceTuru },
        }),
      })
      const data = await res.json()
      setSonuc(data.icerik || "")
      if (data.generatedByAi) {
        alert("Hukuki taslak yerel yapay zeka (Mistral-Nemo) tarafından başarıyla üretildi!")
      }
    } catch {
      setSonuc("Bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }
 
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sonuc)
      alert("Belge panoya kopyalandı!")
    } catch {
      console.error("Kopyalama başarısız")
    }
  }
 
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <FileText className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Belge & Taslak Oluşturucu</h1>
          <p className="text-xs text-slate-500 mt-0.5">Yapay zeka (AI) ve hazır şablonlar ile profesyonel hukuki belgeler hazırlayın.</p>
        </div>
      </div>
 
      {/* Şablon Kütüphanesi Dropdown */}
      <div className="bg-slate-50 border rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-blue-600" /> Hazır Şablon Kütüphanesi (Tek Tıkla Doldur)
        </h3>
        <select
          value={selectedTemplate}
          onChange={(e) => handleTemplateSelect(e.target.value)}
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Boş Belge Taslağı / Şablon Seçin</option>
          {TEMPLATE_PRESETS.map((t) => (
            <option key={t.id} value={t.id}>
              [{t.tur.toUpperCase()}] {t.label}
            </option>
          ))}
        </select>
      </div>
 
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white border p-6 rounded-xl shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Belge Türü</label>
            <select
              value={tur}
              onChange={(e) => {
                setTur(e.target.value)
                setFormData({})
                setSelectedTemplate("")
              }}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {BELGE_TURU.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Başlık</label>
            <input
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="Örn: Kira Tahliye Talepli İhtarname"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
 
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Dava Dosyası Bağla (AI için veri toplar)</label>
          <select
            value={davaId}
            onChange={(e) => setDavaId(e.target.value)}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">İlişkili dava dosyası seçin (Opsiyonel)</option>
            {dosyalar.map((d) => (
              <option key={d.id} value={d.id}>
                {d.davaAdi}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">Dava seçildiğinde, yapay zeka davanın taraflarını ve mahkeme bilgilerini otomatik okuyarak dilekçeyi doldurur.</p>
        </div>

        {tur === "dilekce" && (
          <div className="grid grid-cols-2 gap-4 border-t pt-4 bg-slate-50 p-4 rounded-xl border">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 font-sans">Dilekçe Türü</label>
              <select
                value={dilekceTuru}
                onChange={(e) => setDilekceTuru(e.target.value)}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                <option value="dava">Dava Dilekçesi (Süreci Başlatır)</option>
                <option value="cevap">Cevap Dilekçesi (İlk İtirazlar Öncelikli)</option>
                <option value="replik">Replik (Cevaba Cevap - 1. Tur)</option>
                <option value="duplik">Düplik (İkinci Cevap - 2. Tur)</option>
                <option value="savunma">Savunma Dilekçesi (Mütalaaya/Karara Karşı)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 font-sans">Argümantasyon Yöntemi (Çerçeve)</label>
              <select
                value={yontem}
                onChange={(e) => setYontem(e.target.value)}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                <option value="klasik">Klasik Hukuk Dilekçe Şeması</option>
                <option value="mirat">MIRAT (Maddi Vakıalar → Mesele → Kural → Uygulama → Geçici Sonuç)</option>
                <option value="irac">IRAC (Mesele → Kural → Uygulama → Sonuç)</option>
                <option value="toulmin">Toulmin (İddia → Dayanak → Gerekçe → Destek → Çürütme)</option>
                <option value="retorik">Klasik Retorik (Exordium → Narratio → Kanıtlar → Kapanış)</option>
              </select>
            </div>
          </div>
        )}
 
        <div className="border-t pt-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-700">Şablon Parametreleri</h3>
          {getFields().map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{field.label}</label>
              {field.type === "textarea" ? (
                <textarea
                  value={formData[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={`İlgili ${field.label.toLowerCase()} metnini girin veya AI'a bırakın`}
                />
              ) : (
                <input
                  type="text"
                  value={formData[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Örn: ${field.label}`}
                />
              )}
            </div>
          ))}
        </div>
 
        <button
          type="submit"
          disabled={loading}
          className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-white text-sm font-semibold transition-colors disabled:opacity-50 mt-2 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 animate-spin-slow" />
          {loading ? "AI Taslak Üretiyor..." : "AI ile Taslak Üret"}
        </button>
      </form>
 
      {sonuc && (
        <div className="mt-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="font-bold text-sm text-white">Hazırlanan Hukuki Taslak</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Yapay Zeka (LLM) tarafından üretilen tam metin dilekçe.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-white cursor-pointer transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Kopyala
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([sonuc], { type: "text/plain;charset=utf-8" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `${baslik || "hukuki_belge_taslagi"}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-white cursor-pointer transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                İndir
              </button>
              <button
                onClick={() => {
                  const iframe = document.createElement("iframe")
                  iframe.style.display = "none"
                  document.body.appendChild(iframe)
                  const doc = iframe.contentWindow?.document
                  if (doc) {
                    doc.write(`
                      <html>
                        <head>
                          <title>${baslik || "Hukuki Belge Taslağı"}</title>
                          <style>
                            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; color: #000; }
                            h1 { text-align: center; font-size: 16px; margin-bottom: 30px; text-transform: uppercase; }
                            pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; text-align: justify; }
                          </style>
                        </head>
                        <body>
                          <h1>${baslik || "HUKUKİ BELGE TASLAĞI"}</h1>
                          <pre>${sonuc}</pre>
                        </body>
                      </html>
                    `)
                    doc.close()
                    iframe.contentWindow?.focus()
                    iframe.contentWindow?.print()
                  }
                  setTimeout(() => { document.body.removeChild(iframe) }, 1000)
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-white cursor-pointer transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                Yazdır
              </button>
            </div>
          </div>
          <textarea
            value={sonuc}
            readOnly
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none"
            rows={18}
          />
        </div>
      )}
    </div>
  )
}
