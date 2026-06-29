"use client";

import { useState, useEffect } from "react";
import {
  Users, FolderOpen, ShieldAlert, Cpu, HardDrive, Server,
  Activity, ArrowRight, RefreshCw, Layers
} from "lucide-react";
import Link from "next/link";

interface SystemStats {
  totalMem: number;
  freeMem: number;
  usedMem: number;
  memKullanimYuzde: number;
  cpuModel: string;
  cpuCores: number;
  cpuKullanimYuzde: number;
  uptime: number;
  platform: string;
  hostname: string;
  nodeVersion: string;
}

interface DBStats {
  usersCount: number;
  davasCount: number;
  logsCount: number;
  musterilerCount: number;
}

export default function AdminDashboard() {
  const [sys, setSys] = useState<SystemStats | null>(null);
  const [db, setDb] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pythonStatus, setPythonStatus] = useState("checking");

  const fetchData = async () => {
    try {
      const sysRes = await fetch("/api/sistem-kaynak");
      const sysData = await sysRes.json();
      setSys(sysData);

      const logsRes = await fetch("/api/log");
      const logsData = await logsRes.json();

      const usersRes = await fetch("/api/admin/users");
      const usersData = await usersRes.json();

      const davasRes = await fetch("/api/dosyalar");
      const davasData = await davasRes.json();

      const musterilerRes = await fetch("/api/musteri");
      const musterilerData = await musterilerRes.json();

      setDb({
        usersCount: Array.isArray(usersData) ? usersData.length : 0,
        davasCount: Array.isArray(davasData) ? davasData.length : 0,
        logsCount: Array.isArray(logsData) ? logsData.length : 0,
        musterilerCount: Array.isArray(musterilerData) ? musterilerData.length : 0,
      });

      // Python check
      const pyRes = await fetch("http://localhost:8765/health").catch(() => null);
      setPythonStatus(pyRes && pyRes.ok ? "active" : "offline");

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / (3600 * 24));
    const h = Math.floor((sec % (3600 * 24)) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d} gün, ${h} saat`;
    return `${h} saat, ${m} dakika`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sistem Komuta Paneli</h1>
          <p className="text-xs text-slate-400 mt-1">ALTU AI altyapı ve yönetim kontrol merkezi</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-xl transition-colors text-slate-300"
          title="Yenile"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-400">Kayıtlı Avukatlar</p>
              <h3 className="text-3xl font-extrabold mt-2 text-white">{db?.usersCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users size={18} />
            </div>
          </div>
          <Link href="/admin/users" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2">
            Yönet <ArrowRight size={12} />
          </Link>
        </div>

        {/* Davas */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-400">Toplam Dava Dosyası</p>
              <h3 className="text-3xl font-extrabold mt-2 text-white">{db?.davasCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FolderOpen size={18} />
            </div>
          </div>
          <span className="text-xs text-slate-500 mt-2">{db?.musterilerCount} aktif müvekkil kaydı</span>
        </div>

        {/* Logs */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-400">Sistem Logları</p>
              <h3 className="text-3xl font-extrabold mt-2 text-white">{db?.logsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert size={18} />
            </div>
          </div>
          <Link href="/admin/logs" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-2">
            Günlükleri İncele <ArrowRight size={12} />
          </Link>
        </div>

        {/* Python status */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-400">Otonom Python Servisi</p>
              <h3 className={`text-xl font-extrabold mt-4 capitalize ${pythonStatus === "active" ? "text-emerald-400" : "text-red-400"}`}>
                {pythonStatus === "active" ? "Aktif / Bağlı" : "Çevrimdışı"}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Activity size={18} />
            </div>
          </div>
          <span className="text-xs text-slate-500 mt-2">Port: 8765</span>
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RAM Status */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-350">
            <HardDrive size={16} className="text-indigo-400" />
            <span>Bellek (RAM) Kullanımı</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-white">{sys?.memKullanimYuzde}%</span>
            <span className="text-xs text-slate-400">
              {sys ? `${(sys.usedMem / (1024 * 1024 * 1024)).toFixed(1)} GB / ${(sys.totalMem / (1024 * 1024 * 1024)).toFixed(1)} GB` : ""}
            </span>
          </div>
          {sys && (
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  sys.memKullanimYuzde > 80 ? "bg-red-500" : sys.memKullanimYuzde > 50 ? "bg-yellow-500" : "bg-indigo-500"
                }`}
                style={{ width: `${sys.memKullanimYuzde}%` }}
              />
            </div>
          )}
        </div>

        {/* CPU Status */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-350">
            <Cpu size={16} className="text-blue-400" />
            <span>İşlemci (CPU) Yükü</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-white">{sys?.cpuKullanimYuzde}%</span>
            <span className="text-xs text-slate-400 font-medium truncate max-w-[150px]" title={sys?.cpuModel}>
              {sys?.cpuModel.split("@")[0]}
            </span>
          </div>
          {sys && (
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  sys.cpuKullanimYuzde > 80 ? "bg-red-500" : sys.cpuKullanimYuzde > 50 ? "bg-yellow-500" : "bg-blue-500"
                }`}
                style={{ width: `${sys.cpuKullanimYuzde}%` }}
              />
            </div>
          )}
        </div>

        {/* Server Info */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-350">
            <Server size={16} className="text-teal-400" />
            <span>Sunucu Detayları</span>
          </div>
          <div className="divide-y divide-slate-800 text-xs">
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Hostname</span>
              <span className="font-semibold text-slate-200">{sys?.hostname}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Platform</span>
              <span className="font-semibold text-slate-200 uppercase">{sys?.platform}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Uptime</span>
              <span className="font-semibold text-slate-200">{sys ? formatUptime(sys.uptime) : "-"}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Node Sürümü</span>
              <span className="font-mono text-slate-200">{sys?.nodeVersion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flat-File DB Files Size Check */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2 text-sm">
          <Layers size={16} className="text-purple-400" />
          <span>JSON Veritabanı Boyutları</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {[
            { name: "users.json", desc: "Kullanıcı Kayıtları" },
            { name: "davas.json", desc: "Dava Verileri" },
            { name: "logs.json", desc: "İşlem Günlükleri" },
            { name: "musteriler.json", desc: "Müvekkil Listesi" }
          ].map((file) => (
            <div key={file.name} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">{file.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{file.desc}</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-850 px-2 py-0.5 rounded text-slate-400">
                JSON DB
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
