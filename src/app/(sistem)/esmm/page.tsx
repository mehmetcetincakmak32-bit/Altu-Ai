"use client"

import { useState, useEffect } from "react"
import { Printer, Download } from "lucide-react"

function formatDate(d: string) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("tr-TR")
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n || 0)
}

export default function EsmmPage() {
  const [list, setList] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    musteriUnvan: "",
    hizmetAciklamasi: "",
    birimFiyat: 0,
    miktar: 1,
    kdvOrani: 20,
    odemeSekli: "havale",
    davaId: "",
  })

  useEffect(() => {
    fetch("/api/esmm").then((r) => r.json()).then(setList).catch(() => {})
  }, [])

  const handlePrintEsmm = (item: any) => {
    const title = `Serbest Meslek Makbuzu - ${item.seriNo || "Taslak"}`;
    let content = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 45px; line-height: 1.5; color: #000; }
            .receipt-box { border: 2px solid #000; padding: 25px; max-width: 700px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px double #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { font-size: 20px; margin: 0 0 5px 0; text-transform: uppercase; }
            .header p { font-size: 12px; margin: 0; }
            .meta-section { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
            .meta-section div { width: 48%; }
            .label { font-weight: bold; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            .details-table th, .details-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .details-table th { background-color: #f2f2f2; }
            .summary-section { width: 250px; margin-left: auto; margin-top: 20px; font-size: 13px; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
            .summary-row.total { border-top: 1px solid #000; font-weight: bold; margin-top: 5px; padding-top: 5px; }
            .footer-note { text-align: center; font-size: 11px; margin-top: 40px; border-top: 1px dashed #000; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <h1>Serbest Meslek Makbuzu</h1>
              <p>ALTU Hukuk Bürosu Serbest Meslek Faaliyeti Raporu</p>
            </div>
            <div class="meta-section">
              <div>
                <span class="label">Müşteri / Ünvan:</span><br/>
                ${item.musteriUnvan || "-"}
              </div>
              <div style="text-align: right;">
                <span class="label">Seri/Sıra No:</span> ${item.seriNo || "-"}<br/>
                <span class="label">Tarih:</span> ${new Date(item.tarih).toLocaleDateString("tr-TR")}<br/>
                <span class="label">Ödeme Türü:</span> ${item.odemeSekli.toUpperCase() || "-"}
              </div>
            </div>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Yapılan Hizmet / Açıklama</th>
                  <th style="text-align: right; width: 15%">Miktar</th>
                  <th style="text-align: right; width: 20%">Birim Fiyat</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${item.hizmetAciklamasi || "-"}</td>
                  <td style="text-align: right;">${item.miktar || 1}</td>
                  <td style="text-align: right;">${item.birimFiyat.toLocaleString("tr-TR")} TL</td>
                </tr>
              </tbody>
            </table>
            
            <div class="summary-section">
              <div class="summary-row">
                <span>Brüt Tutar:</span>
                <span>${item.tutar.toLocaleString("tr-TR")} TL</span>
              </div>
              <div class="summary-row">
                <span>KDV (${item.kdvOrani}%):</span>
                <span>${item.kdvTutari.toLocaleString("tr-TR")} TL</span>
              </div>
              <div class="summary-row total">
                <span>Net Alınan Toplam:</span>
                <span>${item.netTutar.toLocaleString("tr-TR")} TL</span>
              </div>
            </div>
            
            <div class="footer-note">
              Bu belge ALTU Hukuk Büro Yönetim Sistemi üzerinden otomatik olarak üretilmiştir.
            </div>
          </div>
        </body>
      </html>
    `;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(content);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  };

  const handleDownloadEsmm = (item: any) => {
    let output = `==================================================\n`;
    output += `SERBEST MESLEK MAKBUZU\n`;
    output += `==================================================\n\n`;
    output += `Seri No: ${item.seriNo || "-"}\n`;
    output += `Tarih: ${new Date(item.tarih).toLocaleDateString("tr-TR")}\n`;
    output += `Müşteri Ünvan: ${item.musteriUnvan || "-"}\n`;
    output += `Ödeme Şekli: ${item.odemeSekli || "-"}\n`;
    output += `--------------------------------------------------\n`;
    output += `Hizmet Açıklaması: ${item.hizmetAciklamasi || "-"}\n`;
    output += `Miktar: ${item.miktar || 1}\n`;
    output += `Birim Fiyat: ${item.birimFiyat.toLocaleString("tr-TR")} TL\n`;
    output += `--------------------------------------------------\n`;
    output += `Brüt Tutar: ${item.tutar.toLocaleString("tr-TR")} TL\n`;
    output += `KDV (${item.kdvOrani}%): ${item.kdvTutari.toLocaleString("tr-TR")} TL\n`;
    output += `Net Alınan Tutar: ${item.netTutar.toLocaleString("tr-TR")} TL\n`;
    output += `==================================================\n`;

    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Makbuz_${item.seriNo || "taslak"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tutar = form.birimFiyat * form.miktar
  const kdvTutari = tutar * (form.kdvOrani / 100)
  const netTutar = tutar + kdvTutari

  const thisMonth = list.filter((i) => {
    if (!i.tarih) return false
    const d = new Date(i.tarih)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisYear = list.filter((i) => {
    if (!i.tarih) return false
    return new Date(i.tarih).getFullYear() === new Date().getFullYear()
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch("/api/esmm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tutar,
          kdvTutari,
          netTutar,
        }),
      })
      if (res.ok) {
        setShowModal(false)
        setForm({ musteriUnvan: "", hizmetAciklamasi: "", birimFiyat: 0, miktar: 1, kdvOrani: 20, odemeSekli: "havale", davaId: "" })
        const updated = await fetch("/api/esmm").then((r) => r.json())
        setList(updated)
      }
    } catch {}
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Bu Ay Toplam</p>
          <p className="text-xl font-bold">{formatMoney(thisMonth.reduce((s, i) => s + (i.netTutar || 0), 0))}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Bu Yıl Toplam</p>
          <p className="text-xl font-bold">{formatMoney(thisYear.reduce((s, i) => s + (i.netTutar || 0), 0))}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Adet</p>
          <p className="text-xl font-bold">{list.length}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          onClick={() => setShowModal(true)}
        >
          Yeni e-SMM
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Seri No</th>
              <th className="pb-2 font-medium">Tarih</th>
              <th className="pb-2 font-medium">Müşteri</th>
              <th className="pb-2 font-medium">Hizmet</th>
              <th className="pb-2 font-medium">Brüt Tutar</th>
              <th className="pb-2 font-medium">KDV</th>
              <th className="pb-2 font-medium">Net Tutar</th>
              <th className="pb-2 font-medium">Ödeme Şekli</th>
              <th className="pb-2 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i: any) => (
              <tr key={i.id} className="border-b hover:bg-gray-50">
                <td className="py-3">{i.seriNo || "-"}</td>
                <td className="py-3">{formatDate(i.tarih)}</td>
                <td className="py-3">{i.musteriUnvan || "-"}</td>
                <td className="py-3">{i.hizmetAciklamasi || "-"}</td>
                <td className="py-3">{formatMoney(i.tutar)}</td>
                <td className="py-3">{formatMoney(i.kdvTutari)}</td>
                <td className="py-3 font-medium">{formatMoney(i.netTutar)}</td>
                <td className="py-3">{i.odemeSekli || "-"}</td>
                <td className="py-3 flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadEsmm(i)}
                    className="text-blue-500 hover:text-blue-750 cursor-pointer"
                    title="Makbuzu İndir"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePrintEsmm(i)}
                    className="text-purple-500 hover:text-purple-750 cursor-pointer"
                    title="Makbuzu Yazdır"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-gray-400">Henüz e-SMM bulunmuyor</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Yeni e-SMM</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Müşteri Ünvan</label>
                <input
                  className="border rounded w-full px-3 py-2 text-sm"
                  value={form.musteriUnvan}
                  onChange={(e) => setForm({ ...form, musteriUnvan: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hizmet Açıklaması</label>
                <input
                  className="border rounded w-full px-3 py-2 text-sm"
                  value={form.hizmetAciklamasi}
                  onChange={(e) => setForm({ ...form, hizmetAciklamasi: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Birim Fiyat</label>
                  <input
                    type="number"
                    className="border rounded w-full px-3 py-2 text-sm"
                    value={form.birimFiyat}
                    onChange={(e) => setForm({ ...form, birimFiyat: Number(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Miktar</label>
                  <input
                    type="number"
                    className="border rounded w-full px-3 py-2 text-sm"
                    value={form.miktar}
                    onChange={(e) => setForm({ ...form, miktar: Number(e.target.value) })}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">KDV Oranı</label>
                  <select
                    className="border rounded w-full px-3 py-2 text-sm"
                    value={form.kdvOrani}
                    onChange={(e) => setForm({ ...form, kdvOrani: Number(e.target.value) })}
                  >
                    <option value={0}>%0</option>
                    <option value={10}>%10</option>
                    <option value={20}>%20</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ödeme Şekli</label>
                  <select
                    className="border rounded w-full px-3 py-2 text-sm"
                    value={form.odemeSekli}
                    onChange={(e) => setForm({ ...form, odemeSekli: e.target.value })}
                  >
                    <option value="nakit">Nakit</option>
                    <option value="kredi-karti">Kredi Kartı</option>
                    <option value="havale">Havale</option>
                    <option value="çek">Çek</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
                <p className="flex justify-between"><span>Tutar:</span><span>{formatMoney(tutar)}</span></p>
                <p className="flex justify-between"><span>KDV ({form.kdvOrani}%):</span><span>{formatMoney(kdvTutari)}</span></p>
                <p className="flex justify-between font-bold"><span>Net Tutar:</span><span>{formatMoney(netTutar)}</span></p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 border rounded text-sm" onClick={() => setShowModal(false)}>İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
