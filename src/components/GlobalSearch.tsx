"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FolderOpen, Users, FileText, X, Command } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  label: string;
  sub?: string;
  href: string;
  type: "dosya" | "musteri" | "belge";
}

const typeIcon = {
  dosya:   <FolderOpen size={14} className="text-blue-500" />,
  musteri: <Users size={14} className="text-purple-500" />,
  belge:   <FileText size={14} className="text-green-500" />,
};

const typeLabel = {
  dosya:   "Dosya",
  musteri: "Müvekkil",
  belge:   "Belge",
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/arama?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults(d.results || []);
      setSelected(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 280);
    return () => clearTimeout(timer);
  }, [query, search]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  // Keyboard navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected].href);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-sm hover:border-slate-300 hover:text-slate-600 transition-all bg-white"
        style={{ minWidth: 180 }}
      >
        <Search size={13} />
        <span className="flex-1 text-left">Ara...</span>
        <span className="flex items-center gap-0.5 text-[10px] bg-slate-100 rounded px-1.5 py-0.5 text-slate-400">
          <Command size={10} />K
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        style={{ border: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={17} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Dosya, müvekkil veya belge ara..."
            className="flex-1 text-sm text-slate-800 outline-none placeholder-slate-400"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length < 2 && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              En az 2 karakter yazın...
            </div>
          )}

          {query.length >= 2 && results.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              <Search size={28} className="mx-auto mb-2 opacity-30" />
              <p>Sonuç bulunamadı</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-1">
              {results.map((r, i) => (
                <button
                  key={r.id + r.type}
                  onClick={() => navigate(r.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="flex-shrink-0">{typeIcon[r.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
                    {r.sub && (
                      <p className="text-xs text-slate-500 truncate">{r.sub}</p>
                    )}
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: r.type === "dosya" ? "#eff6ff" : r.type === "musteri" ? "#f5f3ff" : "#f0fdf4",
                      color: r.type === "dosya" ? "#3b82f6" : r.type === "musteri" ? "#7c3aed" : "#16a34a",
                    }}
                  >
                    {typeLabel[r.type]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-400">
          <span>↑↓ Gezin</span>
          <span>↵ Aç</span>
          <span>Esc Kapat</span>
        </div>
      </div>
    </div>
  );
}
