"use client";

import { useState, useEffect } from "react";
import { Plus, X, Calendar, Download } from "lucide-react";

interface Dava {
  id: string;
  ad: string;
  dosyaNo: string;
}

interface Durusma {
  id: string;
  baslik: string;
  tarih: string;
  aciklama: string | null;
  durum: string;
  dava: { ad: string; dosyaNo: string };
}

const durumRenk: Record<string, string> = {
  planlandi: "bg-blue-100 text-blue-800",
  gerceklesti: "bg-green-100 text-green-800",
  ertelendi: "bg-yellow-100 text-yellow-800",
  iptal: "bg-red-100 text-red-800",
};

export default function TakvimPage() {
  const [durusmalar, setDurusmalar] = useState<Durusma[]>([]);
  const [dosyalar, setDosyalar] = useState<Dava[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ baslik: "", tarih: "", aciklama: "", davaId: "" });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toLocaleDateString("tr-TR"));

  const fetchDurusmalar = () => {
    fetch("/api/durusmalar")
      .then((r) => r.json())
      .then(setDurusmalar);
  };

  useEffect(() => {
    fetchDurusmalar();
    fetch("/api/dosyalar")
      .then((r) => r.json())
      .then(setDosyalar);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/durusmalar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baslik: form.baslik,
        tarih: new Date(form.tarih).toISOString(),
        aciklama: form.aciklama || null,
        davaId: form.davaId,
      }),
    });
    setModalOpen(false);
    setForm({ baslik: "", tarih: "", aciklama: "", davaId: "" });
    fetchDurusmalar();
  };

  // Group events by local date
  const eventsByDate = durusmalar.reduce<Record<string, Durusma[]>>((acc, d) => {
    const dateKey = new Date(d.tarih).toLocaleDateString("tr-TR");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(d);
    return acc;
  }, {});

  // Generate calendar days for current month
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust to start week on Monday
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const prevMonthDays = getDaysInMonth(year, month - 1);
  const calendarDays = [];

  // Previous month fallback padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next month padding days to complete grid (multiples of 7)
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const changeMonth = (val: number) => {
    setCurrentDate(new Date(year, month + val, 1));
  };

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-white text-slate-700 hover:bg-slate-50";
    if (count <= 1) return "bg-blue-50 text-blue-800 font-semibold border border-blue-200 hover:bg-blue-100";
    if (count <= 3) return "bg-blue-200 text-blue-900 font-bold border border-blue-300 hover:bg-blue-300";
    return "bg-indigo-600 text-white font-extrabold shadow-sm hover:bg-indigo-700";
  };

  const selectedList = eventsByDate[selectedDateStr] || [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Duruşma ve İş Takvimi</h1>
          <p className="text-sm text-slate-500">Günlük yoğunluk analizi ve iş takibi</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/durusmalar/ical"
            download="durusma_takvimi.ics"
            className="border border-slate-200 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <Download size={14} /> Takvimi Dışa Aktar (.ICS)
          </a>
          <button onClick={() => setModalOpen(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm">
            <Plus size={16} /> Yeni Duruşma Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Aylık Takvim Görünümü */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">
              {currentDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold">Önceki</button>
              <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold">Sonraki</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-400">
            <div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((item, idx) => {
              const dStr = item.date.toLocaleDateString("tr-TR");
              const count = eventsByDate[dStr]?.length || 0;
              const isSelected = selectedDateStr === dStr;
              
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDateStr(dStr)}
                  className={`aspect-square p-1 rounded-xl text-xs flex flex-col justify-between items-center transition-all ${
                    item.isCurrentMonth ? "" : "opacity-35"
                  } ${getIntensityClass(count)} ${
                    isSelected ? "ring-2 ring-blue-600 ring-offset-2 scale-95" : ""
                  }`}
                >
                  <span className="self-start m-1">{item.day}</span>
                  {count > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/5 text-[10px] scale-90">
                      {count} İş
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Yoğunluk Lejantı */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            <span className="font-semibold">Yoğunluk:</span>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-100 rounded"></span> Boş</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-100 rounded"></span> 1 Duruşma</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-300 rounded"></span> 2-3 Duruşma</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-600 rounded"></span> 4+ Duruşma</div>
          </div>
        </div>

        {/* Seçilen Günün Detayları ve Yapılacak İşler */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-800">Günlük Detay</h2>
            <p className="text-xs text-slate-500">{selectedDateStr} günündeki yapılacak işler</p>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {selectedList.map((d) => (
              <div key={d.id} className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl space-y-2 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-xs text-slate-800 leading-tight">{d.baslik}</h3>
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                    {new Date(d.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{d.dava.ad} ({d.dava.dosyaNo})</p>
                {d.aciklama && (
                  <p className="text-[10px] text-slate-400 bg-white p-2 rounded border border-slate-100 italic">
                    {d.aciklama}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${durumRenk[d.durum] || "bg-gray-100 text-gray-800"}`}>
                    {d.durum}
                  </span>
                </div>
              </div>
            ))}
            {selectedList.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-medium">Bu tarihe kayıtlı duruşma veya yapılacak iş bulunmamaktadır.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Yeni Duruşma Ekle</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Başlık</label>
                <input type="text" value={form.baslik} onChange={(e) => setForm({ ...form, baslik: e.target.value })} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tarih ve Saat</label>
                <input type="datetime-local" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Duruşma / İş Açıklaması</label>
                <textarea value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">İlişkili Dava Dosyası</label>
                <select value={form.davaId} onChange={(e) => setForm({ ...form, davaId: e.target.value })} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seçiniz</option>
                  {dosyalar.map((d) => (
                    <option key={d.id} value={d.id}>{d.dosyaNo} - {d.ad}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-sm">Duruşmayı Kaydet</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
