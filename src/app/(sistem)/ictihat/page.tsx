"use client"

import { Scale, Search as SearchIcon } from "lucide-react"
import { useState } from "react"

type IctihatResult = {
  mahkeme: string
  esasNo: string
  kararNo: string
  tarih: string
  konu: string
  ozet: string
}

export default function IctihatPage() {
  const [sorgu, setSorgu] = useState("")
  const [kategori, setKategori] = useState("")
  const [results, setResults] = useState<IctihatResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = async () => {
    if (!sorgu.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch("/api/ai/ictihat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sorgu, kategori }),
      })
      const data = await res.json()
      setResults(data.sonuclar || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-2">
        <Scale className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">İçtihat ve Emsal Karar Ara</h1>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <input
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="İçtihat sorgunuzu girin (Örn: Kıdem tazminatı hesabı, kira sözleşmesi fesihi...)"
          className="flex-1 rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          className="rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px] text-gray-700"
        >
          <option value="">Tüm Kategoriler</option>
          <option value="is">💼 İş Hukuku</option>
          <option value="bosanma">💔 Boşanma</option>
          <option value="aile">👨‍👩‍👧‍👦 Aile Hukuku</option>
          <option value="miras">📜 Miras Hukuku</option>
          <option value="kira">🏠 Kira Hukuku</option>
          <option value="tazminat">⚖️ Tazminat</option>
          <option value="ceza">🚨 Ceza Hukuku</option>
          <option value="ticaret">📈 Ticaret Hukuku</option>
          <option value="icra">⛓️ İcra Hukuku</option>
        </select>

        <button
          onClick={search}
          disabled={loading || !sorgu.trim()}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          <SearchIcon className="h-4 w-4" />
          Ara
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
          Kriterlere uygun sonuç bulunamadı.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-gray-500 px-1">
            Toplam {results.length} sonuç listelendi.
          </div>
          {results.map((r, i) => (
            <div key={i} className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-gray-800">{r.mahkeme}</span>
                </div>
                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">
                  {r.tarih}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-500 font-medium">Esas No:</span> <span className="font-mono text-gray-700">{r.esasNo}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Karar No:</span> <span className="font-mono text-gray-700">{r.kararNo}</span>
                </div>
              </div>
              <div className="mb-2 text-sm">
                <span className="text-gray-500 font-medium">Konu:</span> <span className="text-gray-800 font-medium">{r.konu}</span>
              </div>
              <p className="text-sm text-gray-600 border-t pt-3 mt-3 leading-relaxed whitespace-pre-line">{r.ozet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
