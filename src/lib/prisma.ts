import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { AsyncLocalStorage } from "async_hooks";

const globalForPrisma = globalThis as typeof globalThis & { realPrisma?: PrismaClient };
export const realPrisma = globalForPrisma.realPrisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
if (process.env.NODE_ENV !== "production") globalForPrisma.realPrisma = realPrisma;

export const tenantContext = new AsyncLocalStorage<{ subdomain?: string }>();

export function runWithTenant<T>(subdomain: string, fn: () => Promise<T>): Promise<T> {
  return tenantContext.run({ subdomain }, fn);
}

function toISO(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return v;
}

function toISOOrEmpty(v: Date | string | null | undefined): string {
  return toISO(v) ?? "";
}

function parseJson(v: string | null | undefined): any {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return v; }
}

function fmtUser(u: any): any {
  if (!u) return null;
  return { ...u, createdAt: toISOOrEmpty(u.createdAt) };
}

function fmtMusteri(m: any): any {
  if (!m) return null;
  return { ...m, createdAt: toISOOrEmpty(m.createdAt), dosyalar: undefined };
}

function fmtDurusma(d: any): any {
  if (!d) return null;
  return {
    ...d,
    tarih: toISOOrEmpty(d.tarih),
    createdAt: toISOOrEmpty(d.createdAt),
    gonderimTarihi: toISO(d.gonderimTarihi),
    okunduTarihi: toISO(d.okunduTarihi),
  };
}

function fmtDava(d: any): any {
  if (!d) return null;
  return {
    ...d,
    createdAt: toISOOrEmpty(d.createdAt),
    updatedAt: toISOOrEmpty(d.updatedAt),
    zamanasimiTarihi: toISO(d.zamanasimiTarihi),
    temyizSonTarihi: toISO(d.temyizSonTarihi),
    emsalKararlar: parseJson(d.emsalKararlar),
    mahkemeModuDosyalar: parseJson(d.mahkemeModuDosyalar),
    musteri: d.musteri ? fmtMusteri(d.musteri) : null,
    durusmalar: (d.durusmalar || []).map(fmtDurusma),
    masraflar: (d.masraflar || []).map((m: any) => ({ ...m, createdAt: toISOOrEmpty(m.createdAt), tarih: toISOOrEmpty(m.tarih) })),
    belgeler: (d.belgeler || []).map((b: any) => ({ ...b, createdAt: toISOOrEmpty(b.createdAt) })),
    hareketler: (d.hareketler || []).map((h: any) => ({ ...h, tarih: toISOOrEmpty(h.tarih), createdAt: toISOOrEmpty(h.createdAt) })),
    tebligatlar: (d.tebligatlar || []).map((t: any) => ({ ...t, createdAt: toISOOrEmpty(t.createdAt), gonderimTarihi: toISO(t.gonderimTarihi), okunduTarihi: toISO(t.okunduTarihi) })),
    dosyalar: (d.dosyalar || []).map((df: any) => ({ ...df, createdAt: toISOOrEmpty(df.createdAt) })),
    tahsilatlar: (d.tahsilatlar || []).map((t: any) => ({ ...t, createdAt: toISOOrEmpty(t.createdAt), vadeTarihi: toISOOrEmpty(t.vadeTarihi), odemeTarihi: toISO(t.odemeTarihi) })),
    isler: (d.isler || []).map((i: any) => ({ ...i, createdAt: toISOOrEmpty(i.createdAt), sonTarih: toISO(i.sonTarih) })),
  };
}

function fmtDavaList(d: any): any {
  if (!d) return null;
  return {
    ...d,
    createdAt: toISOOrEmpty(d.createdAt),
    updatedAt: toISOOrEmpty(d.updatedAt),
    zamanasimiTarihi: toISO(d.zamanasimiTarihi),
    temyizSonTarihi: toISO(d.temyizSonTarihi),
    emsalKararlar: parseJson(d.emsalKararlar),
    mahkemeModuDosyalar: parseJson(d.mahkemeModuDosyalar),
    musteri: d.musteri ? fmtMusteri(d.musteri) : null,
    durusmalar: (d.durusmalar || []).map(fmtDurusma),
    kategori: d.kategori,
  };
}

const cuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

function buildWhere(args: any): any {
  const w: any = {};
  if (args?.where) {
    for (const [k, v] of Object.entries(args.where)) {
      const val = v as any;
      if (k === "OR") continue;
      if (k === "userId" || k === "davaId" || k === "musteriId") {
        w[k] = val;
      } else if (val && typeof val === "object" && "contains" in val) {
        w[k] = { contains: val.contains, mode: "insensitive" };
      } else if (k === "durum") {
        w.durum = val;
      } else if (k === "tamamlandi") {
        w.tamamlandi = val;
      } else if (k === "dava" && val?.userId) {
        w.dava = { userId: val.userId };
      } else if (k === "tarih" && val?.gte && val?.lte) {
        w.tarih = { gte: new Date(val.gte), lte: new Date(val.lte) };
      } else if (k === "id") {
        w.id = val;
      } else if (k === "dosyaNo") {
        w.dosyaNo = val;
      } else if (k === "email") {
        w.email = val;
      } else if (k === "subdomain") {
        w.subdomain = val;
      } else if (k === "tcKimlik") {
        w.tcKimlik = val;
      } else {
        w[k] = val;
      }
    }
  }
  if (args?.where?.OR) {
    w.OR = args.where.OR.map((cond: any) =>
      Object.fromEntries(
        Object.entries(cond).map(([k, v]: [string, any]) => [
          k,
          v && typeof v === "object" && "contains" in v
            ? { contains: v.contains, mode: "insensitive" }
            : v,
        ])
      )
    );
  }
  return w;
}

function buildOrderBy(args: any, fieldMap?: Record<string, string>): any {
  if (!args?.orderBy) return undefined;
  const ob: any = {};
  for (const [k, v] of Object.entries(args.orderBy)) {
    ob[fieldMap?.[k] || k] = v;
  }
  return ob;
}

export interface EmsalKarar {
  id: string;
  mahkeme: string;
  esasNo: string;
  kararNo: string;
  tarih: string;
  konu: string;
  ozet: string;
  kaynak: string;
}

export interface User {
  id: string;
  email: string;
  sifre: string;
  ad: string;
  soyad: string;
  baro?: string | null;
  sicilNo?: string | null;
  unvan?: string | null;
  adres?: string | null;
  telefon?: string | null;
  imza?: string | null;
  uyapSifre?: string | null;
  uyapEImza?: string | null;
  tcNo?: string | null;
  subdomain?: string | null;
  rol: string;
  createdAt: string;
}

export const prisma = {
  user: {
    findUnique: async (args: any) => {
      const u = await realPrisma.user.findUnique({ where: buildWhere(args) });
      return u ? fmtUser(u) : null;
    },
    findMany: async (args: any) => {
      const list = await realPrisma.user.findMany({ where: buildWhere(args) });
      return list.map(fmtUser);
    },
    create: async (args: any) => {
      const u = await realPrisma.user.create({
        data: { ...args.data, id: args.data.id || cuid() },
      });
      return fmtUser(u);
    },
    update: async (args: any) => {
      const u = await realPrisma.user.update({
        where: { id: args.where.id },
        data: args.data,
      });
      return fmtUser(u);
    },
    deleteMany: async (args: any) => {
      const r = await realPrisma.user.deleteMany({ where: buildWhere(args) });
      return r;
    },
  },

  dava: {
    count: async (args: any) => {
      const w = buildWhere(args);
      const filter: any = {};
      if (w.userId) filter.userId = w.userId;
      if (w.durum) filter.durum = w.durum;
      return realPrisma.dava.count({ where: filter });
    },
    findMany: async (args: any) => {
      const w = buildWhere(args);
      if (w.userId) w.userId = w.userId;
      const list = await realPrisma.dava.findMany({
        where: w,
        include: { musteri: true, durusmalar: true },
        orderBy: buildOrderBy(args),
        take: args?.take,
      });
      return list.map(fmtDavaList);
    },
    findFirst: async (args: any) => {
      const w = buildWhere(args);
      const d = await realPrisma.dava.findFirst({
        where: w,
        include: {
          musteri: true, durusmalar: true, masraflar: true,
          belgeler: true, hareketler: { orderBy: { tarih: "desc" } },
          tebligatlar: { orderBy: { gonderimTarihi: "desc" } },
          dosyalar: { orderBy: { createdAt: "desc" } },
        },
        orderBy: buildOrderBy(args),
      });
      return d ? fmtDava(d) : null;
    },
    findUnique: async (args: any) => {
      const d = await realPrisma.dava.findUnique({
        where: args.where,
        include: { musteri: true, durusmalar: true },
      });
      return d ? fmtDavaList(d) : null;
    },
    create: async (args: any) => {
      const now = new Date();
      const d = await realPrisma.dava.create({
        data: {
          ...args.data,
          id: args.data.id || cuid(),
          createdAt: now,
          updatedAt: now,
        },
        include: { musteri: true, durusmalar: true },
      });
      return fmtDava(d);
    },
    upsert: async (args: any) => {
      const d = await realPrisma.dava.upsert({
        where: args.where,
        create: { ...args.create, id: cuid() },
        update: args.update,
        include: { musteri: true, durusmalar: true },
      });
      return fmtDava(d);
    },
    updateMany: async (args: any) => {
      const data = { ...args.data };
      if (data.emsalKararlar) data.emsalKararlar = JSON.stringify(data.emsalKararlar);
      if (data.mahkemeModuDosyalar) data.mahkemeModuDosyalar = JSON.stringify(data.mahkemeModuDosyalar);
      const r = await realPrisma.dava.updateMany({
        where: buildWhere(args),
        data,
      });
      return r;
    },
    deleteMany: async (args: any) => {
      const r = await realPrisma.dava.deleteMany({ where: buildWhere(args) });
      return r;
    },
  },

  musteri: {
    count: async (args: any) => {
      return realPrisma.musteri.count({ where: buildWhere(args) });
    },
    findMany: async (args: any) => {
      const list = await realPrisma.musteri.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
        take: args?.take,
      });
      return list.map(fmtMusteri);
    },
    findFirst: async (args: any) => {
      const m = await realPrisma.musteri.findFirst({
        where: buildWhere(args),
        include: { dosyalar: true },
      });
      if (!m) return null;
      return {
        ...fmtMusteri(m),
        dosyalar: (m.dosyalar || []).map(fmtDavaList),
      };
    },
    create: async (args: any) => {
      const m = await realPrisma.musteri.create({
        data: { ...args.data, id: cuid() },
      });
      return fmtMusteri(m);
    },
    updateMany: async (args: any) => {
      const r = await realPrisma.musteri.updateMany({
        where: buildWhere(args),
        data: args.data,
      });
      return r;
    },
    deleteMany: async (args: any) => {
      const r = await realPrisma.musteri.deleteMany({ where: buildWhere(args) });
      return r;
    },
  },

  durusma: {
    count: async (args: any) => {
      const w = buildWhere(args);
      if (w.dava?.userId) {
        const davas = await realPrisma.dava.findMany({
          where: { userId: w.dava.userId },
          select: { id: true },
        });
        return realPrisma.durusma.count({
          where: { davaId: { in: davas.map((d) => d.id) } },
        });
      }
      return realPrisma.durusma.count({ where: w });
    },
    findMany: async (args: any) => {
      const w = buildWhere(args);
      if (w.dava?.userId) {
        const davas = await realPrisma.dava.findMany({
          where: { userId: w.dava.userId },
          select: { id: true, ad: true },
        });
        delete w.dava;
        w.davaId = { in: davas.map((d) => d.id) };
        const list = await realPrisma.durusma.findMany({
          where: w,
          include: { dava: { select: { id: true, ad: true } } },
          orderBy: buildOrderBy(args),
          take: args?.take,
        });
        return list.map((dur: any) => ({ ...fmtDurusma(dur), dava: dur.dava || { ad: "Bilinmeyen Dava" } }));
      }
      const list = await realPrisma.durusma.findMany({
        where: w,
        include: { dava: { select: { id: true, ad: true } } },
        orderBy: buildOrderBy(args),
        take: args?.take,
      });
      return list.map((dur: any) => ({ ...fmtDurusma(dur), dava: dur.dava || { ad: "Bilinmeyen Dava" } }));
    },
    create: async (args: any) => {
      const dur = await realPrisma.durusma.create({
        data: { ...args.data, id: cuid() },
      });
      return fmtDurusma(dur);
    },
    updateMany: async (args: any) => {
      const data = { ...args.data };
      const r = await realPrisma.durusma.updateMany({
        where: buildWhere(args),
        data,
      });
      return r;
    },
  },

  is: {
    count: async (args: any) => {
      return realPrisma.is.count({ where: buildWhere(args) });
    },
    findMany: async (args: any) => {
      const list = await realPrisma.is.findMany({
        where: buildWhere(args),
        orderBy: [{ tamamlandi: "asc" }, { sonTarih: "asc" }],
        include: args?.include?.dava ? { dava: true } : undefined,
      });
      return list.map((i: any) => ({
        ...i,
        createdAt: toISOOrEmpty(i.createdAt),
        sonTarih: toISO(i.sonTarih),
        dava: i.dava ? { ...i.dava, createdAt: toISOOrEmpty(i.dava.createdAt), updatedAt: toISOOrEmpty(i.dava.updatedAt) } : null,
      }));
    },
    create: async (args: any) => {
      const i = await realPrisma.is.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...i, createdAt: toISOOrEmpty(i.createdAt), sonTarih: toISO(i.sonTarih) };
    },
    updateMany: async (args: any) => {
      const r = await realPrisma.is.updateMany({ where: buildWhere(args), data: args.data });
      return r;
    },
  },

  masraf: {
    aggregate: async (args: any) => {
      const agg = await realPrisma.masraf.aggregate({
        where: buildWhere(args),
        _sum: { tutar: true },
      });
      return { _sum: { tutar: agg._sum.tutar || 0 } };
    },
    groupBy: async (args: any) => {
      const groups = await realPrisma.masraf.groupBy({
        by: ["kategori"],
        where: buildWhere(args),
        _sum: { tutar: true },
      });
      return groups.map((g) => ({ kategori: g.kategori, _sum: { tutar: g._sum.tutar || 0 } }));
    },
    findMany: async (args: any) => {
      const list = await realPrisma.masraf.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
        include: args?.include?.dava ? { dava: true } : undefined,
      });
      return list.map((m: any) => ({
        ...m,
        createdAt: toISOOrEmpty(m.createdAt),
        tarih: toISOOrEmpty(m.tarih),
        dava: m.dava ? fmtDavaList(m.dava) : null,
      }));
    },
    create: async (args: any) => {
      const m = await realPrisma.masraf.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...m, createdAt: toISOOrEmpty(m.createdAt), tarih: toISOOrEmpty(m.tarih) };
    },
  },

  belge: {
    findMany: async (args: any) => {
      const list = await realPrisma.belge.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
        take: args?.take,
        include: args?.include?.dava ? { dava: true } : undefined,
      });
      return list.map((b: any) => ({
        ...b,
        createdAt: toISOOrEmpty(b.createdAt),
        dava: b.dava ? fmtDavaList(b.dava) : null,
      }));
    },
    create: async (args: any) => {
      const b = await realPrisma.belge.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...b, createdAt: toISOOrEmpty(b.createdAt) };
    },
  },

  dosyaDosyasi: {
    findFirst: async (args: any) => {
      const d = await realPrisma.dosyaDosyasi.findFirst({ where: buildWhere(args) });
      return d ? { ...d, createdAt: toISOOrEmpty(d.createdAt) } : null;
    },
    findMany: async (args: any) => {
      const list = await realPrisma.dosyaDosyasi.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
        include: args?.include?.dava ? { dava: true } : undefined,
      });
      return list.map((d: any) => ({
        ...d,
        createdAt: toISOOrEmpty(d.createdAt),
        dava: d.dava ? fmtDavaList(d.dava) : null,
      }));
    },
    create: async (args: any) => {
      const d = await realPrisma.dosyaDosyasi.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...d, createdAt: toISOOrEmpty(d.createdAt) };
    },
    delete: async (args: any) => {
      try {
        await realPrisma.dosyaDosyasi.delete({ where: { id: args.where.id } });
        return { success: true };
      } catch {
        return { success: false };
      }
    },
  },

  eSMM: {
    findMany: async (args: any) => {
      const list = await realPrisma.eSMM.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
        include: args?.include?.dava ? { dava: true } : undefined,
      });
      return list.map((e: any) => ({
        ...e,
        createdAt: toISOOrEmpty(e.createdAt),
        tarih: toISOOrEmpty(e.tarih),
        dava: e.dava ? fmtDavaList(e.dava) : null,
      }));
    },
    findFirst: async (args: any) => {
      const list = await realPrisma.eSMM.findMany({
        where: buildWhere(args),
        orderBy: { seriNo: "desc" },
        take: 1,
      });
      return list[0] ? { ...list[0], createdAt: toISOOrEmpty(list[0].createdAt), tarih: toISOOrEmpty(list[0].tarih) } : null;
    },
    create: async (args: any) => {
      const e = await realPrisma.eSMM.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...e, createdAt: toISOOrEmpty(e.createdAt), tarih: toISOOrEmpty(e.tarih) };
    },
  },

  fatura: {
    findMany: async (args: any) => {
      const list = await realPrisma.fatura.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
        include: args?.include?.dava ? { dava: true } : undefined,
      });
      return list.map((f: any) => ({
        ...f,
        createdAt: toISOOrEmpty(f.createdAt),
        tarih: toISOOrEmpty(f.tarih),
        dava: f.dava ? fmtDavaList(f.dava) : null,
      }));
    },
    findFirst: async (args: any) => {
      const list = await realPrisma.fatura.findMany({
        where: buildWhere(args),
        orderBy: { faturaNo: "desc" },
        take: 1,
      });
      return list[0] ? { ...list[0], createdAt: toISOOrEmpty(list[0].createdAt), tarih: toISOOrEmpty(list[0].tarih) } : null;
    },
    create: async (args: any) => {
      const f = await realPrisma.fatura.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...f, createdAt: toISOOrEmpty(f.createdAt), tarih: toISOOrEmpty(f.tarih) };
    },
  },

  log: {
    findMany: async (args: any) => {
      const list = await realPrisma.log.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
        take: args?.take,
      });
      return list.map((l: any) => ({ ...l, createdAt: toISOOrEmpty(l.createdAt) }));
    },
    create: async (args: any) => {
      const l = await realPrisma.log.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...l, createdAt: toISOOrEmpty(l.createdAt) };
    },
    deleteMany: async (args?: any) => {
      const w = args?.where ? buildWhere(args) : {};
      const r = await realPrisma.log.deleteMany({ where: w });
      return r;
    },
  },

  tebligat: {
    findMany: async (args: any) => {
      const list = await realPrisma.tebligat.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
        take: args?.take,
      });
      return list.map((t: any) => ({
        ...t,
        createdAt: toISOOrEmpty(t.createdAt),
        gonderimTarihi: toISO(t.gonderimTarihi),
        okunduTarihi: toISO(t.okunduTarihi),
      }));
    },
    create: async (args: any) => {
      const t = await realPrisma.tebligat.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...t, createdAt: toISOOrEmpty(t.createdAt), gonderimTarihi: toISO(t.gonderimTarihi), okunduTarihi: toISO(t.okunduTarihi) };
    },
    updateMany: async (args: any) => {
      const r = await realPrisma.tebligat.updateMany({ where: buildWhere(args), data: args.data });
      return r;
    },
  },

  davaHareketi: {
    findMany: async (args: any) => {
      const list = await realPrisma.davaHareketi.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
      });
      return list.map((h: any) => ({ ...h, tarih: toISOOrEmpty(h.tarih), createdAt: toISOOrEmpty(h.createdAt) }));
    },
    create: async (args: any) => {
      const h = await realPrisma.davaHareketi.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...h, tarih: toISOOrEmpty(h.tarih), createdAt: toISOOrEmpty(h.createdAt) };
    },
  },

  tahsilat: {
    findMany: async (args: any) => {
      const list = await realPrisma.tahsilat.findMany({
        where: buildWhere(args),
        orderBy: buildOrderBy(args),
      });
      return list.map((t: any) => ({
        ...t,
        createdAt: toISOOrEmpty(t.createdAt),
        vadeTarihi: toISOOrEmpty(t.vadeTarihi),
        odemeTarihi: toISO(t.odemeTarihi),
      }));
    },
    create: async (args: any) => {
      const t = await realPrisma.tahsilat.create({
        data: { ...args.data, id: cuid() },
      });
      return { ...t, createdAt: toISOOrEmpty(t.createdAt), vadeTarihi: toISOOrEmpty(t.vadeTarihi), odemeTarihi: toISO(t.odemeTarihi) };
    },
    updateMany: async (args: any) => {
      const r = await realPrisma.tahsilat.updateMany({ where: buildWhere(args), data: args.data });
      return r;
    },
    deleteMany: async (args: any) => {
      const r = await realPrisma.tahsilat.deleteMany({ where: buildWhere(args) });
      return r;
    },
  },

  emsalKarar: {
    findMany: async (args?: any) => {
      const davas = await realPrisma.dava.findMany({
        where: args?.where?.OR ? { OR: args.where.OR.map((cond: any) =>
          Object.fromEntries(Object.entries(cond).map(([k, v]: [string, any]) => [
            k, v && typeof v === "object" && "contains" in v
              ? { contains: v.contains, mode: "insensitive" }
              : v,
          ]))
        )} : undefined,
        select: { emsalKararlar: true },
        take: args?.take || 50,
      });
      const kararlar: any[] = [];
      for (const d of davas) {
        if (d.emsalKararlar) {
          try {
            const parsed = JSON.parse(d.emsalKararlar);
            if (Array.isArray(parsed)) kararlar.push(...parsed);
          } catch {}
        }
      }
      return kararlar;
    },
  },

  hukukiCeviri: {
    create: async (args: any) => {
      const c = await realPrisma.hukukiCeviri.create({ data: { ...args.data, id: cuid() } });
      return { ...c, createdAt: toISOOrEmpty(c.createdAt) };
    },
    findMany: async (args: any) => {
      const list = await realPrisma.hukukiCeviri.findMany({ where: buildWhere(args), orderBy: buildOrderBy(args) });
      return list.map((c: any) => ({ ...c, createdAt: toISOOrEmpty(c.createdAt) }));
    },
  },

  sozlesmeAnalizi: {
    create: async (args: any) => {
      const s = await realPrisma.sozlesmeAnalizi.create({ data: { ...args.data, id: cuid() } });
      return { ...s, createdAt: toISOOrEmpty(s.createdAt) };
    },
    findMany: async (args: any) => {
      const list = await realPrisma.sozlesmeAnalizi.findMany({ where: buildWhere(args), orderBy: buildOrderBy(args) });
      return list.map((s: any) => ({ ...s, createdAt: toISOOrEmpty(s.createdAt) }));
    },
  },

  dilekecePuanlama: {
    create: async (args: any) => {
      const p = await realPrisma.dilekecePuanlama.create({ data: { ...args.data, id: cuid() } });
      return { ...p, createdAt: toISOOrEmpty(p.createdAt) };
    },
    findMany: async (args: any) => {
      const list = await realPrisma.dilekecePuanlama.findMany({ where: buildWhere(args), orderBy: buildOrderBy(args) });
      return list.map((p: any) => ({ ...p, createdAt: toISOOrEmpty(p.createdAt) }));
    },
  },

  bulkMesaj: {
    create: async (args: any) => {
      const m = await realPrisma.bulkMesaj.create({ data: { ...args.data, id: cuid() } });
      return { ...m, createdAt: toISOOrEmpty(m.createdAt) };
    },
    update: async (args: any) => {
      const m = await realPrisma.bulkMesaj.update({ where: { id: args.where.id }, data: args.data });
      return { ...m, createdAt: toISOOrEmpty(m.createdAt) };
    },
    findMany: async (args: any) => {
      const list = await realPrisma.bulkMesaj.findMany({ where: buildWhere(args), orderBy: buildOrderBy(args) });
      return list.map((m: any) => ({ ...m, createdAt: toISOOrEmpty(m.createdAt) }));
    },
  },

  mesajlasmaAyarlari: {
    findUnique: async (args: any) => {
      const a = await realPrisma.mesajlasmaAyarlari.findUnique({ where: args.where });
      return a ? { ...a, createdAt: toISOOrEmpty(a.createdAt), updatedAt: toISOOrEmpty(a.updatedAt) } : null;
    },
    upsert: async (args: any) => {
      const a = await realPrisma.mesajlasmaAyarlari.upsert({
        where: args.where,
        create: { ...args.create, id: cuid() },
        update: args.update,
      });
      return { ...a, createdAt: toISOOrEmpty(a.createdAt), updatedAt: toISOOrEmpty(a.updatedAt) };
    },
  },

  kararHarita: {
    create: async (args: any) => {
      const h = await realPrisma.kararHarita.create({ data: { ...args.data, id: cuid() } });
      return { ...h, createdAt: toISOOrEmpty(h.createdAt) };
    },
    findMany: async (args: any) => {
      const list = await realPrisma.kararHarita.findMany({ where: buildWhere(args), orderBy: buildOrderBy(args) });
      return list.map((h: any) => ({ ...h, createdAt: toISOOrEmpty(h.createdAt) }));
    },
  },

  uetsAyarlari: {
    findUnique: async (args: any) => {
      const a = await realPrisma.uetsAyarlari.findUnique({ where: args.where });
      return a ? { ...a, createdAt: toISOOrEmpty(a.createdAt), updatedAt: toISOOrEmpty(a.updatedAt), sonGiris: toISO(a.sonGiris) } : null;
    },
    create: async (args: any) => {
      const a = await realPrisma.uetsAyarlari.create({ data: { ...args.data, id: cuid() } });
      return { ...a, createdAt: toISOOrEmpty(a.createdAt), updatedAt: toISOOrEmpty(a.updatedAt), sonGiris: toISO(a.sonGiris) };
    },
    update: async (args: any) => {
      const a = await realPrisma.uetsAyarlari.update({ where: args.where, data: args.data });
      return { ...a, createdAt: toISOOrEmpty(a.createdAt), updatedAt: toISOOrEmpty(a.updatedAt), sonGiris: toISO(a.sonGiris) };
    },
  },
};
