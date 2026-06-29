"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ ad: "", soyad: "", email: "", sifre: "", baro: "", sicilNo: "" });
  const [hata, setHata] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setHata(data.hata || "Kayıt başarısız");
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 p-2.5 rounded-xl">
            <Scale className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ALTU</h1>
            <p className="text-xs text-slate-500">Hukuk Büro Yönetimi</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-1">Kayıt Ol</h2>
        <p className="text-sm text-slate-500 mb-6">Yeni hesap oluşturun</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ad</label>
              <input value={form.ad} onChange={set("ad")} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Soyad</label>
              <input value={form.soyad} onChange={set("soyad")} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={set("email")} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
            <input type="password" value={form.sifre} onChange={set("sifre")} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Baro</label>
              <input value={form.baro} onChange={set("baro")} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="İstanbul Barosu" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sicil No</label>
              <input value={form.sicilNo} onChange={set("sicilNo")} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {hata && <p className="text-red-500 text-sm">{hata}</p>}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors">
            Kayıt Ol
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Zaten hesabınız var mı? <Link href="/login" className="text-blue-600 hover:underline font-medium">Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}
