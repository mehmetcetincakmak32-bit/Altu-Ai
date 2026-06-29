"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Search } from "lucide-react";
import Link from "next/link";

export default function MusteriPage() {
  const [musteriler, setMusteriler] = useState<any[]>([]);
  const [dosyaSayilari, setDosyaSayilari] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ad: "", soyad: "", tcKimlik: "", telefon: "", email: "", adres: "", notlar: "" });

  useEffect(() => {
    fetch("/api/musteri")
      .then((r) => r.json())
      .then((data) => {
        setMusteriler(data);
        const ids = data.map((m: any) => m.id);
        if (ids.length > 0) {
          fetch("/api/dosyalar")
            .then((r) => r.json())
            .then((dosyalar) => {
              const sayac: Record<string, number> = {};
              dosyalar.forEach((d: any) => {
                if (d.musteriId) sayac[d.musteriId] = (sayac[d.musteriId] || 0) + 1;
              });
              setDosyaSayilari(sayac);
            });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = musteriler.filter((m) => {
    const q = search.toLowerCase();
    return m.ad.toLowerCase().includes(q) || m.soyad.toLowerCase().includes(q) || (m.tcKimlik || "").includes(q);
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/musteri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const yeni = await res.json();
      setMusteriler((prev) => [yeni, ...prev]);
      setModal(false);
      setForm({ ad: "", soyad: "", tcKimlik: "", telefon: "", email: "", adres: "", notlar: "" });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="text-blue-600" size={24} />
          <h1 className="text-xl font-bold text-slate-900">Müvekkiller</h1>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Yeni Müvekkil
        </button>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, soyad veya TC ile ara..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Müvekkil bulunamadı.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 font-medium">
                <th className="px-4 py-3">Ad Soyad</th>
                <th className="px-4 py-3">TC Kimlik</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Dosya Sayısı</th>
                <th className="px-4 py-3">Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/musteri/${m.id}`} className="text-blue-600 hover:underline font-medium">{m.ad} {m.soyad}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.tcKimlik || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{m.telefon || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{m.email || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      {dosyaSayilari[m.id] || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(m.createdAt).toLocaleDateString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Yeni Müvekkil</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ad *</label>
                  <input type="text" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Soyad *</label>
                  <input type="text" value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">TC Kimlik</label>
                <input type="text" value={form.tcKimlik} onChange={(e) => setForm({ ...form, tcKimlik: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                  <input type="text" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                <textarea value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notlar</label>
                <textarea value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">Kaydet</button>
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
