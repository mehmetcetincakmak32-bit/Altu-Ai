"use client"

import { Wallet, Plus } from "lucide-react"
import { useState, useEffect } from "react"

type Masraf = {
  id: string
  baslik: string
  tutar: number
  kategori: string
  tarih: string
  davaId?: string
  davaAdi?: string
  aciklama?: string
}

const KATEGORILER = [
  { value: "", label: "Tümü" },
  { value: "dosya-harci", label: "Dosya Harcı" },
  { value: "keşif", label: "Keşif" },
  { value: "bilirkişi", label: "Bilirkişi" },
  { value: "yol", label: "Yol" },
  { value: "kırtasiye", label: "Kırtasiye" },
  { value: "diger", label: "Diğer" },
]

function formatTL(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount)
}

export default function MasraflarPage() {
  const [masraflar, setMasraflar] = useState<Masraf[]>([])
  const [filterKategori, setFilterKategori] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [dosyalar, setDosyalar] = useState<{ id: string; davaAdi: string }[]>([])
  const [form, setForm] = useState({
    baslik: "",
    tutar: "",
    tarih: new Date().toISOString().split("T")[0],
    kategori: "diger",
    davaId: "",
    aciklama: "",
  })

  const fetchMasraflar = async () => {
    try {
      const res = await fetch("/api/masraflar")
      const data = await res.json()
      setMasraflar(data)
    } catch {
      console.error("Failed to fetch masraflar")
    }
  }

  const fetchDosyalar = async () => {
    try {
      const res = await fetch("/api/dosyalar")
      const data = await res.json()
      setDosyalar(data)
    } catch {
      console.error("Failed to fetch dosyalar")
    }
  }

  useEffect(() => {
    fetchMasraflar()
    fetchDosyalar()
  }, [])

  const filtered = filterKategori
    ? masraflar.filter((m) => m.kategori === filterKategori)
    : masraflar

  const toplam = masraflar.reduce((sum, m) => sum + m.tutar, 0)
  const simdi = new Date()
  const buAy = masraflar
    .filter((m) => {
      const d = new Date(m.tarih)
      return d.getMonth() === simdi.getMonth() && d.getFullYear() === simdi.getFullYear()
    })
    .reduce((s, m) => s + m.tutar, 0)
  const buYil = masraflar
    .filter((m) => new Date(m.tarih).getFullYear() === simdi.getFullYear())
    .reduce((s, m) => s + m.tutar, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/masraflar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tutar: parseFloat(form.tutar),
        }),
      })
      if (res.ok) {
        setModalOpen(false)
        setForm({
          baslik: "",
          tutar: "",
          tarih: new Date().toISOString().split("T")[0],
          kategori: "diger",
          davaId: "",
          aciklama: "",
        })
        fetchMasraflar()
      }
    } catch {
      console.error("Failed to create masraf")
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Masraflar</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          <Plus className="h-4 w-4" />
          Yeni Masraf
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Wallet className="h-5 w-5" />
            <span>Toplam</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatTL(toplam)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">Bu Ay</div>
          <p className="mt-2 text-2xl font-bold">{formatTL(buAy)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">Bu Yıl</div>
          <p className="mt-2 text-2xl font-bold">{formatTL(buYil)}</p>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          {KATEGORILER.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 font-medium">Başlık</th>
              <th className="p-3 font-medium">Tutar</th>
              <th className="p-3 font-medium">Kategori</th>
              <th className="p-3 font-medium">Tarih</th>
              <th className="p-3 font-medium">Dava</th>
              <th className="p-3 font-medium">Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b">
                <td className="p-3">{m.baslik}</td>
                <td className="p-3 font-medium">{formatTL(m.tutar)}</td>
                <td className="p-3">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                    {KATEGORILER.find((k) => k.value === m.kategori)?.label || m.kategori}
                  </span>
                </td>
                <td className="p-3">{new Date(m.tarih).toLocaleDateString("tr-TR")}</td>
                <td className="p-3">
                  {m.davaAdi ? (
                    <a href="#" className="text-blue-600 hover:underline">
                      {m.davaAdi}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3 text-gray-500">{m.aciklama || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Yeni Masraf</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                placeholder="Başlık"
                value={form.baslik}
                onChange={(e) => setForm({ ...form, baslik: e.target.value })}
                required
                className="rounded-lg border px-3 py-2"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Tutar (TL)"
                value={form.tutar}
                onChange={(e) => setForm({ ...form, tutar: e.target.value })}
                required
                className="rounded-lg border px-3 py-2"
              />
              <input
                type="date"
                value={form.tarih}
                onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                required
                className="rounded-lg border px-3 py-2"
              />
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="rounded-lg border px-3 py-2"
              >
                {KATEGORILER.filter((k) => k.value).map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <select
                value={form.davaId}
                onChange={(e) => setForm({ ...form, davaId: e.target.value })}
                className="rounded-lg border px-3 py-2"
              >
                <option value="">Dava seçin (isteğe bağlı)</option>
                {dosyalar.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.davaAdi}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Açıklama"
                value={form.aciklama}
                onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                className="rounded-lg border px-3 py-2"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border px-4 py-2"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
