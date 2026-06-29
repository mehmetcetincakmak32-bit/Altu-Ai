"use client"

import { useState, useEffect } from "react"

function formatDate(d: string) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("tr-TR")
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n || 0)
}

const durumLabels: Record<string, { label: string; cls: string }> = {
  odendi: { label: "Ödendi", cls: "bg-green-100 text-green-800" },
  odenmedi: { label: "Ödenmedi", cls: "bg-red-100 text-red-800" },
  kismi: { label: "Kısmi", cls: "bg-yellow-100 text-yellow-800" },
}

export default function FaturaPage() {
  const [list, setList] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    musteriUnvan: "",
    kalemler: "",
    araToplam: 0,
    kdvOrani: 20,
    odemeSekli: "havale",
    odemeDurumu: "odenmedi",
    davaId: "",
  })

  useEffect(() => {
    fetch("/api/fatura").then((r) => r.json()).then(setList).catch(() => {})
  }, [])

  const kdvTutari = form.araToplam * (form.kdvOrani / 100)
  const genelToplam = form.araToplam + kdvTutari

  const toplam = list.reduce((s, i) => s + (i.genelToplam || 0), 0)
  const odenen = list.filter((i) => i.odemeDurumu === "odendi").reduce((s, i) => s + (i.genelToplam || 0), 0)
  const bekleyen = list.filter((i) => i.odemeDurumu !== "odendi").reduce((s, i) => s + (i.genelToplam || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch("/api/fatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, kdvTutari, genelToplam }),
      })
      if (res.ok) {
        setShowModal(false)
        setForm({ musteriUnvan: "", kalemler: "", araToplam: 0, kdvOrani: 20, odemeSekli: "havale", odemeDurumu: "odenmedi", davaId: "" })
        const updated = await fetch("/api/fatura").then((r) => r.json())
        setList(updated)
      }
    } catch {}
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Toplam Fatura</p>
          <p className="text-xl font-bold">{formatMoney(toplam)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Ödenen</p>
          <p className="text-xl font-bold text-green-700">{formatMoney(odenen)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Bekleyen</p>
          <p className="text-xl font-bold text-red-700">{formatMoney(bekleyen)}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          onClick={() => setShowModal(true)}
        >
          Yeni Fatura
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Fatura No</th>
              <th className="pb-2 font-medium">Tarih</th>
              <th className="pb-2 font-medium">Müşteri</th>
              <th className="pb-2 font-medium">Ara Toplam</th>
              <th className="pb-2 font-medium">KDV</th>
              <th className="pb-2 font-medium">Genel Toplam</th>
              <th className="pb-2 font-medium">Ödeme Durumu</th>
              <th className="pb-2 font-medium">Ödeme Şekli</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i: any) => {
              const d = durumLabels[i.odemeDurumu] || { label: i.odemeDurumu, cls: "bg-gray-100" }
              return (
                <tr key={i.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">{i.faturaNo || "-"}</td>
                  <td className="py-3">{formatDate(i.tarih)}</td>
                  <td className="py-3">{i.musteriUnvan || "-"}</td>
                  <td className="py-3">{formatMoney(i.araToplam)}</td>
                  <td className="py-3">{formatMoney(i.kdvTutari)}</td>
                  <td className="py-3 font-medium">{formatMoney(i.genelToplam)}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${d.cls}`}>{d.label}</span>
                  </td>
                  <td className="py-3">{i.odemeSekli || "-"}</td>
                </tr>
              )
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">Henüz fatura bulunmuyor</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Yeni Fatura</h3>
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
                <label className="block text-sm font-medium text-gray-700">Hizmet Kalemleri</label>
                <textarea
                  className="border rounded w-full px-3 py-2 text-sm"
                  rows={3}
                  value={form.kalemler}
                  onChange={(e) => setForm({ ...form, kalemler: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ara Toplam</label>
                  <input
                    type="number"
                    className="border rounded w-full px-3 py-2 text-sm"
                    value={form.araToplam}
                    onChange={(e) => setForm({ ...form, araToplam: Number(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
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
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ödeme Durumu</label>
                  <select
                    className="border rounded w-full px-3 py-2 text-sm"
                    value={form.odemeDurumu}
                    onChange={(e) => setForm({ ...form, odemeDurumu: e.target.value })}
                  >
                    <option value="odendi">Ödendi</option>
                    <option value="odenmedi">Ödenmedi</option>
                    <option value="kismi">Kısmi</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3 text-sm">
                <p className="flex justify-between"><span>KDV ({form.kdvOrani}%):</span><span>{formatMoney(kdvTutari)}</span></p>
                <p className="flex justify-between font-bold"><span>Genel Toplam:</span><span>{formatMoney(genelToplam)}</span></p>
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
