"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Share2, Search, Sparkles, AlertCircle, 
  HelpCircle, Plus, Eye, History, BookOpen 
} from "lucide-react";

export default function KararHaritaPage() {
  const [sorgu, setSorgu] = useState("");
  const [baslik, setBaslik] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [harita, setHarita] = useState<any>(null);
  const [gecmis, setGecmis] = useState<any[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [seciliDugum, setSeciliDugum] = useState<any>(null);

  // SVG Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetchGecmis();
    // Default load first graph or mock graph
    handleGenelHarita();
  }, []);

  const fetchGecmis = async () => {
    try {
      const res = await fetch("/api/karar-harita");
      if (res.ok) {
        const data = await res.json();
        setGecmis(data);
      }
    } catch {}
  };

  const handleGenelHarita = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/karar-harita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baslik: "Kira Tahliye Uyuşmazlıkları Genel Karar Ağı",
          sorgu: "kira tahliye"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setHarita({
          id: data.id,
          baslik: data.baslik,
          dugumler: JSON.parse(data.dugumler),
          kenarlar: JSON.parse(data.kenarlar)
        });
      }
    } catch (err: any) {
      setHata("Bağlantı hatası oluştu.");
    } finally {
      setYukleniyor(false);
    }
  };

  const handleYeniHarita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baslik || !sorgu) {
      setHata("Lütfen bir başlık ve arama sorgusu girin.");
      return;
    }

    setYukleniyor(true);
    setHata(null);
    setSeciliDugum(null);

    try {
      const res = await fetch("/api/karar-harita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baslik, sorgu }),
      });

      if (!res.ok) {
        throw new Error("Graf oluşturulamadı");
      }

      const data = await res.json();
      setHarita({
        id: data.id,
        baslik: data.baslik,
        dugumler: JSON.parse(data.dugumler),
        kenarlar: JSON.parse(data.kenarlar)
      });
      fetchGecmis();
    } catch (err: any) {
      setHata(err.message || "Bağlantı hatası");
    } finally {
      setYukleniyor(false);
    }
  };

  // SVG Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const handleZoomIn = () => setZoom(z => Math.min(2, z + 0.1));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Node position calculation helper (force-directed style layout)
  const getLayoutPositions = (dugumler: any[]) => {
    const radius = 180;
    const center = { x: 300, y: 250 };
    return dugumler.map((node, index) => {
      if (index === 0) {
        // Center node
        return { ...node, x: center.x, y: center.y };
      }
      const angle = (2 * Math.PI * (index - 1)) / (dugumler.length - 1 || 1);
      return {
        ...node,
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      };
    });
  };

  const getDugumRengi = (tur: string) => {
    switch (tur?.toLowerCase()) {
      case "yargitay": return "#3b82f6"; // blue
      case "danistay": return "#10b981"; // emerald
      case "aym": return "#ec4899"; // pink
      case "kanun": return "#eab308"; // yellow
      default: return "#6366f1"; // indigo
    }
  };

  const renderedDugumler = harita ? getLayoutPositions(harita.dugumler) : [];

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
            <Sparkles size={18} />
            <span>ALTU AI Karar Haritalama İlişki Ağı</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Emsal Karar Haritası</h1>
          <p className="text-slate-400 text-sm mt-1">Emsal kararları, kanun maddelerini ve mahkeme içtihatlarını görsel ilişkilerle haritalandırın.</p>
        </div>
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 flex items-center gap-2 text-sm font-medium self-start md:self-center">
          <Share2 size={18} />
          <span>İnteraktif Graf İlişki Modelleme</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left - Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-indigo-500" />
              Yeni Karar Ağı Oluştur
            </h2>
            <form onSubmit={handleYeniHarita} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Harita Başlığı</label>
                <input
                  type="text"
                  value={baslik}
                  onChange={(e) => setBaslik(e.target.value)}
                  placeholder="Örn: İşçi Alacaklarında Zaman Aşımı"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Anahtar Kelime / Konu Ara</label>
                <div className="relative">
                  <input
                    type="text"
                    value={sorgu}
                    onChange={(e) => setSorgu(e.target.value)}
                    placeholder="Örn: ihbar tazminatı haklı fesih"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                  />
                  <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                </div>
              </div>

              {hata && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {hata}
                </div>
              )}

              <button
                type="submit"
                disabled={yukleniyor}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {yukleniyor ? "Haritalanıyor..." : "İlişki Ağını Çıkar"}
              </button>
            </form>
          </div>

          {/* Saved Maps */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <History size={18} className="text-indigo-500" />
              Kayıtlı Karar Ağları
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              <div 
                onClick={handleGenelHarita}
                className="p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-semibold truncate">Kira Tahliye Uyuşmazlıkları</p>
                  <p className="text-[10px] text-slate-500">Sistem Genel Haritası</p>
                </div>
                <Eye size={14} className="text-slate-400" />
              </div>

              {gecmis.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setHarita({
                    id: item.id,
                    baslik: item.baslik,
                    dugumler: JSON.parse(item.dugumler),
                    kenarlar: JSON.parse(item.kenarlar)
                  })}
                  className="p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl cursor-pointer transition flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-semibold truncate">{item.baslik}</p>
                    <p className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <Eye size={14} className="text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - SVG Canvas & Details */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden flex flex-col h-[520px]">
            {/* Top Toolbar */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">{harita?.baslik || "Karar İlişki Ağı Canvası"}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleZoomIn} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white font-semibold text-xs">+</button>
                <button onClick={handleZoomOut} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white font-semibold text-xs">-</button>
                <button onClick={handleZoomReset} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white text-xs">Reset</button>
              </div>
            </div>

            {/* Interactive SVG Render Area */}
            <div 
              className="flex-1 relative bg-slate-950/40 overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            >
              {yukleniyor ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 z-10 space-y-3">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">İlişkiler haritalanıyor, lütfen bekleyin...</span>
                </div>
              ) : null}

              {harita && (
                <svg className="w-full h-full">
                  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* Render Relationship Edges */}
                    {harita.kenarlar?.map((edge: any, idx: number) => {
                      const sourceNode = renderedDugumler.find(d => d.id === edge.kaynak);
                      const targetNode = renderedDugumler.find(d => d.id === edge.hedef);
                      if (!sourceNode || !targetNode) return null;

                      // Midpoint for relationship label
                      const midX = (sourceNode.x + targetNode.x) / 2;
                      const midY = (sourceNode.y + targetNode.y) / 2;

                      return (
                        <g key={idx}>
                          {/* Line */}
                          <line
                            x1={sourceNode.x}
                            y1={sourceNode.y}
                            x2={targetNode.x}
                            y2={targetNode.y}
                            className="stroke-slate-700"
                            strokeWidth={edge.agirlik || 1.5}
                            strokeDasharray={edge.iliski === 'aykırı' ? '4 4' : '0'}
                          />
                          {/* Label Badge */}
                          <rect
                            x={midX - 35}
                            y={midY - 8}
                            width="70"
                            height="16"
                            rx="4"
                            className="fill-slate-900 stroke-slate-800"
                            strokeWidth="1"
                          />
                          <text
                            x={midX}
                            y={midY + 4}
                            textAnchor="middle"
                            className="fill-slate-400 font-semibold uppercase text-[8px]"
                          >
                            {edge.iliski}
                          </text>
                        </g>
                      );
                    })}

                    {/* Render Interactive Nodes */}
                    {renderedDugumler.map((node: any) => {
                      const color = getDugumRengi(node.tur);
                      const isSelected = seciliDugum?.id === node.id;
                      return (
                        <g 
                          key={node.id} 
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSeciliDugum(node);
                          }}
                        >
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.id === "1" ? "32" : "24"}
                            fill={color}
                            className={`transition opacity-90 hover:opacity-100 ${isSelected ? 'stroke-white stroke-[3px]' : 'stroke-slate-900 stroke-2'}`}
                          />
                          {/* Node Icon/Label Initial */}
                          <text
                            x={node.x}
                            y={node.y + 4}
                            textAnchor="middle"
                            className="fill-white font-extrabold text-[10px]"
                          >
                            {node.tur?.slice(0, 3).toUpperCase()}
                          </text>
                          {/* Floating Text under node */}
                          <text
                            x={node.x}
                            y={node.y + (node.id === "1" ? 44 : 36)}
                            textAnchor="middle"
                            className="fill-slate-300 font-bold text-[9px] drop-shadow-md"
                          >
                            {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              )}
            </div>
          </div>

          {/* Node details panel */}
          {seciliDugum && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4 animate-slideUp">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3.5 h-3.5 rounded-full" 
                    style={{ backgroundColor: getDugumRengi(seciliDugum.tur) }} 
                  />
                  <h3 className="font-bold text-slate-100">{seciliDugum.label}</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full uppercase">
                  {seciliDugum.tur}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Tarih / Önem Derecesi</span>
                  <p className="text-slate-300 font-medium">Karar Tarihi: {seciliDugum.tarih || "Belirtilmemiş"}</p>
                  <p className="text-slate-300 font-medium">Önem: {seciliDugum.onem || 3} / 5</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl flex items-center gap-3">
                  <BookOpen size={20} className="text-indigo-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">İlişkili Kararlar</span>
                    <p className="text-slate-300 text-xs">Bu düğüm merkez ağa ve emsallere bağlıdır.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
