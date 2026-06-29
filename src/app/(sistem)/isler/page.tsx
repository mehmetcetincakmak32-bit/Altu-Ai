"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

interface Dava {
  id: string;
  ad: string;
  dosyaNo: string;
}

interface Is {
  id: string;
  baslik: string;
  oncelik: string;
  durum: string;
  sonTarih: string | null;
  tamamlandi: boolean;
  dava: { id: string; ad: string; dosyaNo: string } | null;
}

const oncelikRenk: Record<string, string> = {
  yuksek: "bg-red-100 text-red-800",
  orta: "bg-yellow-100 text-yellow-800",
  dusuk: "bg-green-100 text-green-800",
};

const durumRenk: Record<string, string> = {
  bekliyor: "bg-gray-100 text-gray-800",
  "devam-ediyor": "bg-blue-100 text-blue-800",
  tamamlandi: "bg-green-100 text-green-800",
};

export default function IslerPage() {
  const [isler, setIsler] = useState<Is[]>([]);
  const [dosyalar, setDosyalar] = useState<Dava[]>([]);
  const [durumFilter, setDurumFilter] = useState("all");
  const [oncelikFilter, setOncelikFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ baslik: "", aciklama: "", oncelik: "orta", sonTarih: "", davaId: "" });

  const fetchIsler = () => {
    const params = new URLSearchParams();
    if (durumFilter !== "all") params.set("durum", durumFilter);
    fetch(`/api/isler?${params}`)
      .then((r) => r.json())
      .then(setIsler);
  };

  useEffect(() => {
    fetchIsler();
    fetch("/api/dosyalar")
      .then((r) => r.json())
      .then(setDosyalar);
  }, [durumFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/isler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baslik: form.baslik,
        aciklama: form.aciklama,
        oncelik: form.oncelik,
        sonTarih: form.sonTarih ? new Date(form.sonTarih).toISOString() : null,
        davaId: form.davaId || null,
      }),
    });
    setModalOpen(false);
    setForm({ baslik: "", aciklama: "", oncelik: "orta", sonTarih: "", davaId: "" });
    fetchIsler();
  };

  const toggleTamamlandi = async (is: Is) => {
    await fetch("/api/isler", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: is.id, tamamlandi: !is.tamamlandi }),
    });
    fetchIsler();
  };

  const filtered = isler.filter((is) => {
    if (oncelikFilter !== "all" && is.oncelik !== oncelikFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">İşler</h1>
        <button onClick={() => setModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
          <Plus size={16} /> Yeni İş
        </button>
      </div>

      <div className="flex gap-3">
        <select value={durumFilter} onChange={(e) => setDurumFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Tüm Durum</option>
          <option value="bekliyor">Bekliyor</option>
          <option value="devam-ediyor">Devam Ediyor</option>
          <option value="tamamlandi">Tamamlandı</option>
        </select>
        <select value={oncelikFilter} onChange={(e) => setOncelikFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Tüm Öncelik</option>
          <option value="yuksek">Yüksek</option>
          <option value="orta">Orta</option>
          <option value="dusuk">Düşük</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b bg-slate-50">
              <th className="p-3">Başlık</th>
              <th className="p-3">Öncelik</th>
              <th className="p-3">Durum</th>
              <th className="p-3">Son Tarih</th>
              <th className="p-3">Dava</th>
              <th className="p-3">Tamamlandı</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((is) => (
              <tr key={is.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="p-3">{is.baslik}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${oncelikRenk[is.oncelik] || "bg-gray-100 text-gray-800"}`}>
                    {is.oncelik}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${durumRenk[is.durum] || "bg-gray-100 text-gray-800"}`}>
                    {is.durum}
                  </span>
                </td>
                <td className="p-3">{is.sonTarih ? new Date(is.sonTarih).toLocaleDateString("tr-TR") : "-"}</td>
                <td className="p-3">{is.dava ? `${is.dava.dosyaNo} - ${is.dava.ad}` : "-"}</td>
                <td className="p-3">
                  <input type="checkbox" checked={is.tamamlandi} onChange={() => toggleTamamlandi(is)} className="w-4 h-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Yeni İş</h2>
              <button onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Başlık</label>
                <input type="text" value={form.baslik} onChange={(e) => setForm({ ...form, baslik: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Açıklama</label>
                <textarea value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Öncelik</label>
                <select value={form.oncelik} onChange={(e) => setForm({ ...form, oncelik: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="yuksek">Yüksek</option>
                  <option value="orta">Orta</option>
                  <option value="dusuk">Düşük</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Son Tarih</label>
                <input type="date" value={form.sonTarih} onChange={(e) => setForm({ ...form, sonTarih: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dava</label>
                <select value={form.davaId} onChange={(e) => setForm({ ...form, davaId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seçiniz</option>
                  {dosyalar.map((d) => (
                    <option key={d.id} value={d.id}>{d.dosyaNo} - {d.ad}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Kaydet</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
