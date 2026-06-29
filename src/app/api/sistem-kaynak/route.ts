import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import os from "os";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : "";
  const cpuCores = cpus.length;
  const uptime = os.uptime();

  const cpuLoad =
    cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpuCores;

  return NextResponse.json({
    totalMem,
    freeMem,
    usedMem,
    memKullanimYuzde: Math.round((usedMem / totalMem) * 100),
    cpuModel,
    cpuCores,
    cpuKullanimYuzde: Math.round(cpuLoad),
    uptime: Math.floor(uptime),
    platform: os.platform(),
    hostname: os.hostname(),
    nodeVersion: process.version,
  });
}
