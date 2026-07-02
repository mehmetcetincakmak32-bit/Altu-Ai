"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { User, Edit, Plus } from "lucide-react";
import Link from "next/link";

const durumRenk: Record<string, string> = {
  "devam-ediyor": "bg-blue-100 text-blue-800",
  "sonuclandi": "bg-green-100 text-green-800",
  "ret": "bg-red-100 text-red-800",
  "feragat": "bg-yellow-100 text-yellow-800",
};

const durumEtiket: Record<string, string> = {
  "devam-ediyor": "Devam Ediyor",
  "sonuclandi": "Sonuçlandı",
  "ret": "Ret",
  "feragat": "Feragat",
};

export default function MusteriDetayPage() {
  const { id } = useParams<{ id: string }>();
  const [musteri, setMusteri] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [davaModal, setDavaModal] = useState(false);
  const [form, setForm] = useState({ ad: "", soyad: "", tcKimlik: "", telefon: "", email: "", adres: "", notlar: "" });
  const [davaForm, setDavaForm] = useState({ dosyaNo: "", ad: "", konu: "", durum: "devam-ediyor", mahkeme: "", esasNo: "" });

  const fetchMusteri = () => {
    setLoading(true);
    fetch(`/api/musteri/${id}`)
      .then((r) => r.json())
      .then((m) => {
        setMusteri(m);
        setForm({ ad: m.ad, soyad: m.soyad, tcKimlik: m.tcKimlik || "", telefon: m.telefon || "", email: m.email || "", adres: m.adres || "", notlar: m.notlar || "" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMusteri(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/musteri/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setEditModal(false);
      fetchMusteri();
    }
  };

  const handleDavaAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/dosyalar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...davaForm, musteriId: id }),
    });
    if (res.ok) {
      setDavaModal(false);
      setDavaForm({ dosyaNo: "", ad: "", konu: "", durum: "devam-ediyor", mahkeme: "", esasNo: "" });
      fetchMusteri();
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Yükleniyor...</div>;
  if (!musteri) return <div className="p-6 text-center text-slate-500">Müvekkil bulunamadı.</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-full">
            <User className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{musteri.ad} {musteri.soyad}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {musteri.tcKimlik && <span>TC: {musteri.tcKimlik}</span>}
              {musteri.telefon && <span>Tel: {musteri.telefon}</span>}
              {musteri.email && <span>Email: {musteri.email}</span>}
            </div>
            {musteri.adres && <p className="text-xs text-slate-400 mt-0.5">{musteri.adres}</p>}
          </div>
        </div>
        <button onClick={() => setEditModal(true)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Edit size={14} /> Düzenle
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Bağlı Dosyalar</h2>
        <button onClick={() => setDavaModal(true)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> Yeni Dosya
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600 font-medium">
              <th className="px-4 py-3">Dosya No</th>
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">Mahkeme</th>
              <th className="px-4 py-3">Esas No</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {(musteri.dosyalar || []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Bu müvekkile ait dosya bulunmuyor.</td></tr>
            ) : (
              musteri.dosyalar.map((d: any) => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dosyalar/${d.id}`} className="text-blue-600 hover:underline font-medium">{d.dosyaNo}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{d.ad}</td>
                  <td className="px-4 py-3 text-slate-600">{d.mahkeme || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{d.esasNo || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${durumRenk[d.durum] || "bg-slate-100 text-slate-800"}`}>
                      {durumEtiket[d.durum] || d.durum}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(d.createdAt).toLocaleDateString("tr-TR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Müvekkil Düzenle</h2>
            <form onSubmit={handleEdit} className="space-y-3">
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
                <button type="button" onClick={() => setEditModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {davaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDavaModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Yeni Dosya Ekle</h2>
            <form onSubmit={handleDavaAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dosya No *</label>
                <input type="text" value={davaForm.dosyaNo} onChange={(e) => setDavaForm({ ...davaForm, dosyaNo: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ad *</label>
                <input type="text" value={davaForm.ad} onChange={(e) => setDavaForm({ ...davaForm, ad: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Konu</label>
                <input type="text" value={davaForm.konu} onChange={(e) => setDavaForm({ ...davaForm, konu: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                <select value={davaForm.durum} onChange={(e) => setDavaForm({ ...davaForm, durum: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="devam-ediyor">Devam Ediyor</option>
                  <option value="sonuclandi">Sonuçlandı</option>
                  <option value="ret">Ret</option>
                  <option value="feragat">Feragat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mahkeme</label>
                <input type="text" value={davaForm.mahkeme} onChange={(e) => setDavaForm({ ...davaForm, mahkeme: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Esas No</label>
                <input type="text" value={davaForm.esasNo} onChange={(e) => setDavaForm({ ...davaForm, esasNo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">Kaydet</button>
                <button type="button" onClick={() => setDavaModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
