"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Calendar, X } from "lucide-react";
import Link from "next/link";

interface Durusma {
  id: string;
  baslik: string;
  tarih: string;
  durum: string;
  dava: { ad: string };
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [durusmalar, setDurusmalar] = useState<Durusma[]>([]);
  const [okundu, setOkundu] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch coming hearings
    fetch("/api/istatistik")
      .then((r) => r.json())
      .then((d) => {
        if (d.yaklasanDurusmalar) {
          setDurusmalar(d.yaklasanDurusmalar);
        }
      })
      .catch(() => {});

    // Load read set from localStorage
    try {
      const saved = localStorage.getItem("altu-okundu-bildirimler");
      if (saved) setOkundu(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const okunmamis = durusmalar.filter((d) => !okundu.has(d.id));

  const markAllRead = () => {
    const yeni = new Set([...okundu, ...durusmalar.map((d) => d.id)]);
    setOkundu(yeni);
    try {
      localStorage.setItem("altu-okundu-bildirimler", JSON.stringify([...yeni]));
    } catch {}
  };

  const getDaysLeft = (tarih: string) => {
    const diff = new Date(tarih).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Bugün";
    if (days === 1) return "Yarın";
    if (days < 0) return `${Math.abs(days)} gün geçti`;
    return `${days} gün kaldı`;
  };

  const getUrgencyColor = (tarih: string) => {
    const diff = new Date(tarih).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 1) return "#ef4444";
    if (days <= 3) return "#f59e0b";
    return "#3b82f6";
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
        aria-label="Bildirimler"
      >
        <Bell size={19} />
        {okunmamis.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1"
            style={{ background: "#ef4444", boxShadow: "0 0 0 2px white" }}
          >
            {okunmamis.length > 9 ? "9+" : okunmamis.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-slide-down overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-blue-600" />
              <span className="font-semibold text-sm text-slate-800">Yaklaşan Duruşmalar</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {durusmalar.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                <p>Yaklaşan duruşma yok</p>
              </div>
            ) : (
              durusmalar.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: getUrgencyColor(d.tarih) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{d.baslik}</p>
                    <p className="text-xs text-slate-500 truncate">{d.dava?.ad}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-400">
                        {new Date(d.tarih).toLocaleDateString("tr-TR")}
                      </span>
                      <span
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: getUrgencyColor(d.tarih),
                          background: `${getUrgencyColor(d.tarih)}18`,
                        }}
                      >
                        {getDaysLeft(d.tarih)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100">
            <Link
              href="/takvim"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Takvime git →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
