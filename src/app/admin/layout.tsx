"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, ShieldAlert, Settings, LogOut, Scale, Menu, X
} from "lucide-react";
import { useState, useEffect } from "react";

const adminMenuItems = [
  { href: "/admin",          label: "Admin Panel",     icon: LayoutDashboard },
  { href: "/admin/users",    label: "Kullanıcılar",    icon: Users },
  { href: "/admin/logs",     label: "Hata & Sistem Logları", icon: ShieldAlert },
  { href: "/admin/benchmark",label: "Hukuk AI Doğrulama", icon: Scale },
  { href: "/admin/settings", label: "Sistem Ayarları", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((u) => {
        if (u) {
          if (u.rol !== "admin") {
            router.push("/dashboard");
          } else {
            setAdminName(`${u.ad} ${u.soyad}`);
            setLoading(false);
          }
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Admin kimliği doğrulanıyor...</p>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Branding */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
          <Scale size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-wider">ALTU AI</h1>
          <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Admin Konsolu</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-6 px-4 space-y-1">
        {adminMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{adminName}</p>
            <p className="text-[10px] text-slate-500 font-medium">Sistem Yöneticisi</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
            title="Çıkış"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg"
      >
        <Menu size={18} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-screen flex flex-col animate-slide-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="w-64 h-full hidden lg:block flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 flex-shrink-0 z-30">
          <div className="hidden lg:block">
            <h2 className="text-sm font-semibold text-slate-400">Hoş geldiniz, Admin</h2>
          </div>
          <div className="lg:hidden w-8" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full">
              Süper Admin Modu
            </span>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
