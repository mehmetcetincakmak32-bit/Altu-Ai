"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [beniHatirla, setBeniHatirla] = useState(false);
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setYukleniyor(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sifre, rememberMe: beniHatirla }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.rol === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setHata(data.hata || "Giriş başarısız");
      }
    } catch (err) {
      setHata("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  };

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

        <h2 className="text-lg font-semibold mb-1">Giriş Yap</h2>
        <p className="text-sm text-slate-500 mb-6">Hesabınıza giriş yapın</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı Adı / Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin"
              required
              disabled={yukleniyor}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
            <input
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
              disabled={yukleniyor}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={beniHatirla}
                onChange={(e) => setBeniHatirla(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-slate-600 font-medium">Beni Hatırla</span>
            </label>
          </div>

          {hata && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-red-600 text-sm font-medium">{hata}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {yukleniyor ? (
              <><Loader2 size={16} className="animate-spin" /> Giriş yapılıyor...</>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        {/* Demo bilgi kutusu */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 font-medium">Admin Giriş Bilgileri</p>
          <p className="text-xs text-blue-600">Kullanıcı: <strong>admin</strong> | Şifre: <strong>admin</strong></p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Hesabınız yok mu? <Link href="/register" className="text-blue-600 hover:underline font-medium">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
}
