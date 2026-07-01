"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderOpen, Users, Wallet, Calendar, Bot,
  Scale, FileText, BarChart3, LogOut, ChevronLeft, ChevronRight,
  ListTodo, FileUp, Settings, Globe, Menu, X,
  Calculator, Share2, Languages, FileSearch, Gauge,
} from "lucide-react";
import { useState, useEffect } from "react";

const menuItems = [
  { href: "/dashboard",      label: "Ana Sayfa",      icon: LayoutDashboard, group: "main" },
  { href: "/dosyalar",       label: "Dosyalar",        icon: FolderOpen,       group: "main" },
  { href: "/musteri",        label: "Müvekkiller",     icon: Users,            group: "main" },
  { href: "/isler",          label: "İş Listesi",      icon: ListTodo,         group: "main" },
  { href: "/takvim",         label: "Takvim",          icon: Calendar,         group: "main" },
  
  { href: "/sozlesme-analizi",label: "Sözleşme Analizi", icon: FileSearch,      group: "araclar" },
  { href: "/dilekce-puan",   label: "Dilekçe Puan",    icon: Gauge,            group: "araclar" },
  { href: "/karar-harita",   label: "Karar Haritası",  icon: Share2,           group: "araclar" },
  { href: "/hukuki-ceviri",  label: "Hukuki Çeviri",   icon: Languages,        group: "araclar" },
  { href: "/belge-isle",     label: "Belge İşle",      icon: ClipboardCheck,   group: "araclar" },
  
  { href: "/dosya-goruntule",label: "Dosya Görüntüle", icon: FileUp,           group: "araclar" },
  { href: "/ai-asistan",     label: "Yapay Zeka",      icon: Bot,              group: "araclar" },
  { href: "/ictihat",        label: "İçtihat Ara",     icon: Scale,            group: "araclar" },

  { href: "/belge-olustur",  label: "Belge Oluştur",   icon: FileText,         group: "araclar" },
  { href: "/scraper",        label: "Site Tarayıcı",   icon: Globe,            group: "araclar" },
  { href: "/hesaplamalar",   label: "Hukuki Hesaplama", icon: Calculator,      group: "araclar" },
  { href: "/raporlar",       label: "Raporlar",        icon: BarChart3,        group: "araclar" },
  { href: "/ayarlar",        label: "Ayarlar",         icon: Settings,         group: "sistem" },
];

const groupLabels: Record<string, string> = {
  main:    "GENEL",
  araclar: "ARAÇLAR",
  sistem:  "SİSTEM",
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("A");

  useEffect(() => {
    fetch("/api/auth/profil")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.ad) setUserInitial(d.ad[0].toUpperCase()); })
      .catch(() => {});
  }, []);

  // Group menu items
  const groups = ["main", "araclar", "sistem"];

  const sidebarContent = (
    <>
      {/* Logo & Branding */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
          }}
        >
          A
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-white tracking-wide">ALTU</h1>
            <p className="text-[10px] text-slate-400 truncate">Hukuk Büro Yönetimi</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all hidden lg:flex items-center justify-center"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {groups.map((group) => {
          const items = menuItems.filter(i => i.group === group);
          return (
            <div key={group} className="mb-1">
              {!collapsed && (
                <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-slate-500">
                  {groupLabels[group]}
                </p>
              )}
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 my-0.5
                      ${isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                        : "text-slate-400 hover:bg-white/8 hover:text-white"
                      }
                    `}
                    style={isActive ? {
                      background: "linear-gradient(90deg, #1d4ed8, #2563eb)",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.35)",
                    } : {}}
                  >
                    <item.icon size={16} className="flex-shrink-0" />
                    {!collapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${collapsed ? "justify-center" : ""}`}>
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
          >
            {userInitial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 font-medium">Hesabım</p>
            </div>
          )}
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Çıkış"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-xl text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, #1e40af, #4f46e5)" }}
      >
        <Menu size={18} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative w-64 h-screen flex flex-col animate-slide-in"
            style={{
              background: "linear-gradient(160deg, #0f172a 0%, #111827 50%, #0f1629 100%)",
            }}
          >
            <div className="flex justify-end p-2">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-60"} transition-all duration-300 flex flex-col flex-shrink-0 hidden lg:flex`}
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #111827 50%, #0f1629 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
