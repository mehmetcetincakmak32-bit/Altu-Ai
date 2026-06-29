"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, X, Save, RefreshCw, Key } from "lucide-react";

interface User {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  rol: string;
  baro?: string | null;
  sicilNo?: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form states
  const [form, setForm] = useState({
    ad: "", soyad: "", email: "", sifre: "", rol: "avukat", baro: "", sicilNo: ""
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setForm({
      ad: "", soyad: "", email: "", sifre: "", rol: "avukat", baro: "", sicilNo: ""
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setForm({
      ad: user.ad,
      soyad: user.soyad,
      email: user.email,
      sifre: "", // Leave blank unless changing
      rol: user.rol,
      baro: user.baro || "",
      sicilNo: user.sicilNo || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" adlı kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.hata || "Silme işlemi başarısız");
      }
    } catch {
      alert("Bağlantı hatası");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const isEdit = !!editingUser;
    const url = "/api/admin/users";
    const method = isEdit ? "PUT" : "POST";
    const payload = isEdit ? { ...form, id: editingUser.id } : form;

    if (!isEdit && !form.sifre) {
      setFormError("Yeni kullanıcı için şifre zorunludur.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        fetchUsers();
      } else {
        setFormError(data.hata || "İşlem sırasında bir hata oluştu.");
      }
    } catch {
      setFormError("Bağlantı hatası.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors text-slate-100 placeholder-slate-600";

  return (
    <div className="space-y-6 text-slate-100 animate-fade-in">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Kullanıcı Yönetimi</h1>
            <p className="text-xs text-slate-400 mt-0.5">Sistemdeki tüm avukat ve yönetici hesapları</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"
            title="Yenile"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={13} />
            <span>Kullanıcı Ekle</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Kullanıcılar yükleniyor...
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p>Sistemde henüz kayıtlı kullanıcı bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Ad Soyad</th>
                  <th className="px-6 py-4">E-posta</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Baro / Sicil</th>
                  <th className="px-6 py-4">Kayıt Tarihi</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-200">{u.ad} {u.soyad}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        u.rol === "admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-450">
                      {u.baro ? `${u.baro} / No: ${u.sicilNo || "-"}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, `${u.ad} ${u.soyad}`)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <h2 className="font-bold text-sm text-slate-200">
                {editingUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Ad *</label>
                  <input
                    type="text"
                    required
                    value={form.ad}
                    onChange={(e) => setForm({ ...form, ad: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Soyad *</label>
                  <input
                    type="text"
                    required
                    value={form.soyad}
                    onChange={(e) => setForm({ ...form, soyad: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">E-posta adresi *</label>
                <input
                  type="text"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ornek@altu.ai"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Şifre {editingUser ? "(Değiştirmek istemiyorsanız boş bırakın)" : "*"}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 text-slate-600" size={12} />
                  <input
                    type="password"
                    value={form.sifre}
                    onChange={(e) => setForm({ ...form, sifre: e.target.value })}
                    placeholder="••••••••"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Kullanıcı Rolü *</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value })}
                    className={inputCls}
                  >
                    <option value="avukat">Avukat</option>
                    <option value="admin">Yönetici (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Baro</label>
                  <input
                    type="text"
                    value={form.baro}
                    onChange={(e) => setForm({ ...form, baro: e.target.value })}
                    placeholder="İstanbul Barosu"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Sicil Numarası</label>
                <input
                  type="text"
                  value={form.sicilNo}
                  onChange={(e) => setForm({ ...form, sicilNo: e.target.value })}
                  placeholder="12345"
                  className={inputCls}
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mt-2"
              >
                <Save size={13} />
                <span>{submitting ? "Kaydediliyor..." : "Kaydet"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
