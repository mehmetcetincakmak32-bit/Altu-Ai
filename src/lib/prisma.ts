import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";

const DATA_DIR = path.join(process.cwd(), "storage", "data");

// AsyncLocalStorage to hold tenant context dynamically per-request
export const tenantContext = new AsyncLocalStorage<{ subdomain?: string }>();

// Helper to find the subdomain of a user from global users.json
function getSubdomainForUser(userId: string): string | null {
  if (!userId) return null;
  const p = path.join(DATA_DIR, "users.json");
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    const user = data.users.find((u: any) => u.id === userId);
    return user?.subdomain || null;
  } catch {
    return null;
  }
}

// Helper to find the subdomain associated with a dava
function getSubdomainForDava(davaId: string): string | null {
  if (!davaId) return null;
  // 1. Check global davas.json
  const globalDavasPath = path.join(DATA_DIR, "davas.json");
  if (fs.existsSync(globalDavasPath)) {
    try {
      const davas = JSON.parse(fs.readFileSync(globalDavasPath, "utf8")).davas;
      const d = davas.find((x: any) => x.id === davaId);
      if (d) return getSubdomainForUser(d.userId);
    } catch {}
  }
  // 2. Search in tenants folders
  const tenantsDir = path.join(DATA_DIR, "tenants");
  if (fs.existsSync(tenantsDir)) {
    try {
      const tenants = fs.readdirSync(tenantsDir);
      for (const t of tenants) {
        const davaPath = path.join(tenantsDir, t, "davas.json");
        if (fs.existsSync(davaPath)) {
          const davas = JSON.parse(fs.readFileSync(davaPath, "utf8")).davas;
          if (davas.some((x: any) => x.id === davaId)) {
            return t;
          }
        }
      }
    } catch {}
  }
  return null;
}

// Read JSON with automatic tenant subdomain routing
function readJson<T>(filename: string, def: T, contextId?: { userId?: string; davaId?: string }): T {
  const storeSubdomain = tenantContext.getStore()?.subdomain;
  let subdomain = storeSubdomain;
  
  if (!subdomain && contextId) {
    if (contextId.userId) {
      subdomain = getSubdomainForUser(contextId.userId) || undefined;
    } else if (contextId.davaId) {
      subdomain = getSubdomainForDava(contextId.davaId) || undefined;
    }
  }

  // Users and global legal data are shared across all tenants
  const isGlobalFile = filename === "users.json" || filename === "emsal_karar.json";
  
  let p: string;
  if (subdomain && subdomain !== "www" && !isGlobalFile) {
    p = path.join(DATA_DIR, "tenants", subdomain, filename);
  } else {
    p = path.join(DATA_DIR, filename);
  }
  
  if (!fs.existsSync(p)) return def;
  try {
    const raw = fs.readFileSync(p, "utf8");
    if (!raw) return def;
    return JSON.parse(raw);
  } catch (e) {
    return def;
  }
}

// Write JSON with automatic tenant subdomain routing
function writeJson<T>(filename: string, data: T, contextId?: { userId?: string; davaId?: string }): void {
  const storeSubdomain = tenantContext.getStore()?.subdomain;
  let subdomain = storeSubdomain;
  
  if (!subdomain && contextId) {
    if (contextId.userId) {
      subdomain = getSubdomainForUser(contextId.userId) || undefined;
    } else if (contextId.davaId) {
      subdomain = getSubdomainForDava(contextId.davaId) || undefined;
    }
  }

  const isGlobalFile = filename === "users.json" || filename === "emsal_karar.json";
  
  let p: string;
  if (subdomain && subdomain !== "www" && !isGlobalFile) {
    p = path.join(DATA_DIR, "tenants", subdomain, filename);
  } else {
    p = path.join(DATA_DIR, filename);
  }

  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("JSON Write Error:", filename, e);
  }
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

export interface Mesteri {
  id: string;
  ad: string;
  soyad: string;
  tcKimlik?: string | null;
  telefon?: string | null;
  email?: string | null;
  adres?: string | null;
  notlar?: string | null;
  userId: string;
  createdAt: string;
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

export interface HukukiCeviri {
  id: string;
  kaynakDil: string;
  hedefDil: string;
  asil: string;
  ceviri: string;
  userId: string;
  createdAt: string;
}

export interface SozlesmeAnalizi {
  id: string;
  tip: string;
  baslik: string;
  icerik: string;
  sonuc: string;
  riskPuani: number;
  maddeler?: string | null;
  userId: string;
  createdAt: string;
}

export interface DilekecePuanlama {
  id: string;
  baslik?: string | null;
  icerik: string;
  puan: number;
  detay?: string | null;
  oneriler?: string | null;
  userId: string;
  createdAt: string;
}

export interface BulkMesaj {
  id: string;
  tur: string;
  konu: string;
  icerik: string;
  alicilar: string;
  durum: string;
  gonderilenSayi: number;
  hataMesaj?: string | null;
  userId: string;
  createdAt: string;
}

export interface MesajlasmaAyarlari {
  id: string;
  userId: string;
  smsProvider: string;
  smsApiKey?: string | null;
  smsApiSifre?: string | null;
  smsBaslik: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpKullanici?: string | null;
  smtpSifre?: string | null;
  smtpGuvenlik: string;
  whatsappApiKey?: string | null;
  whatsappTelNo?: string | null;
  whatsappProvider: string;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KararHarita {
  id: string;
  baslik: string;
  dugumler: string;
  kenarlar: string;
  userId: string;
  createdAt: string;
}

export interface UetsAyarlari {
  id: string;
  kurumKodu: string;
  kurumSifre: string;
  kullaniciAdi: string;
  sifre: string;
  testModu: boolean;
  sonGiris?: string | null;
  aktif: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dava {
  id: string;
  dosyaNo: string;
  ad: string;
  konu?: string | null;
  durum: string;
  mahkeme?: string | null;
  esasNo?: string | null;
  kararNo?: string | null;
  aciklama?: string | null;
  musteriId?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  emsalKararlar?: EmsalKarar[] | null;
  aiAnaliz?: string | null;
  mahkemeModuDosyalar?: string[] | null;
  kategori?: string | null;
  atananAvukatId?: string | null;
  zamanasimiTarihi?: string | null;
  temyizSonTarihi?: string | null;
  sureTakipNotu?: string | null;
  hareketler?: DavaHareketi[] | null;
}

export interface Durusma {
  id: string;
  baslik: string;
  aciklama?: string | null;
  tarih: string;
  durum: string;
  davaId: string;
  createdAt: string;
  tutanakOzet?: string | null;
  sonrakiAdimlar?: string | null;
  sesDosyasi?: string | null;
}

export interface Is {
  id: string;
  baslik: string;
  aciklama?: string | null;
  oncelik: string;
  durum: string;
  sonTarih?: string | null;
  tamamlandi: boolean;
  davaId?: string | null;
  userId: string;
  createdAt: string;
}

export interface Masraf {
  id: string;
  baslik: string;
  tutar: number;
  tarih: string;
  kategori: string;
  aciklama?: string | null;
  davaId?: string | null;
  userId: string;
  createdAt: string;
}

export interface Belge {
  id: string;
  baslik: string;
  icerik: string;
  tur: string;
  davaId?: string | null;
  userId: string;
  createdAt: string;
}

export interface DosyaDosyasi {
  id: string;
  orijinalAd: string;
  kayitliAd: string;
  tur: string;
  boyut?: number | null;
  etiketler?: string | null;
  davaId?: string | null;
  userId: string;
  createdAt: string;
}

export interface ESMM {
  id: string;
  seriNo: string;
  tarih: string;
  musteriUnvan?: string | null;
  hizmetAciklamasi: string;
  birimFiyat: number;
  miktar: number;
  tutar: number;
  kdvOrani: number;
  kdvTutari: number;
  netTutar: number;
  odemeSekli: string;
  davaId?: string | null;
  userId: string;
  createdAt: string;
}

export interface Fatura {
  id: string;
  faturaNo: string;
  tur: string;
  tarih: string;
  musteriUnvan?: string | null;
  kalemler: string;
  araToplam: number;
  kdvOrani: number;
  kdvTutari: number;
  genelToplam: number;
  odemeSekli: string;
  odemeDurumu: string;
  davaId?: string | null;
  userId: string;
  createdAt: string;
}

export interface Log {
  id: string;
  islem: string;
  aciklama?: string | null;
  detay?: string | null;
  seviye: string;
  userId?: string | null;
  createdAt: string;
}

export interface Tebligat {
  id: string;
  tebligatNo: string;
  konu?: string | null;
  gonderen?: string | null;
  alici?: string | null;
  tur: string;
  durum: string;
  icerik?: string | null;
  dosyaUrl?: string | null;
  dosyaTuru?: string | null;
  gonderimTarihi?: string | null;
  okunduTarihi?: string | null;
  davaId?: string | null;
  uetsId: string;
  userId: string;
  createdAt: string;
}

export interface DavaHareketi {
  id: string;
  islem: string;
  tarih: string;
  evrak?: string | null;
  davaId: string;
  userId: string;
  createdAt: string;
}

export interface Tahsilat {
  id: string;
  musteriUnvan: string;
  tutar: number;
  vadeTarihi: string;
  odemeTarihi?: string | null;
  durum: "odendi" | "bekliyor" | "gecikti";
  aciklama: string;
  davaId?: string | null;
  userId: string;
  createdAt: string;
}

const cuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Wrap helper function to run queries with tenant context manually
export function runWithTenant<T>(subdomain: string, fn: () => Promise<T>): Promise<T> {
  return tenantContext.run({ subdomain }, fn);
}

export const prisma = {
  user: {
    findUnique: async (args: any) => {
      const data = readJson<{ users: User[] }>("users.json", { users: [] });
      if (args.where.email) {
        return data.users.find((u) => u.email === args.where.email) || null;
      }
      if (args.where.id) {
        return data.users.find((u) => u.id === args.where.id) || null;
      }
      if (args.where.subdomain) {
        return data.users.find((u) => u.subdomain === args.where.subdomain) || null;
      }
      return null;
    },
    create: async (args: any) => {
      const data = readJson<{ users: User[] }>("users.json", { users: [] });
      const newUser: User = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.users.push(newUser);
      writeJson("users.json", data);
      return newUser;
    },
    update: async (args: any) => {
      const data = readJson<{ users: User[] }>("users.json", { users: [] });
      const idx = data.users.findIndex((u) => u.id === args.where.id);
      if (idx === -1) throw new Error("User not found");
      data.users[idx] = { ...data.users[idx], ...args.data };
      writeJson("users.json", data);
      return data.users[idx];
    },
    deleteMany: async (args: any) => {
      const data = readJson<{ users: User[] }>("users.json", { users: [] });
      const initialLength = data.users.length;
      data.users = data.users.filter((u) => u.email !== args.where.email);
      writeJson("users.json", data);
      return { count: initialLength - data.users.length };
    }
  },
  dava: {
    count: async (args: any) => {
      const data = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
      return data.davas.filter((d) => !args.where.durum || d.durum === args.where.durum).length;
    },
    findMany: async (args: any) => {
      const data = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
      let list = data.davas.filter((d) => {
        if (args.where.kategori && args.where.kategori !== "all" && d.kategori !== args.where.kategori) return false;
        if (args.where.atananAvukatId && d.atananAvukatId !== args.where.atananAvukatId) return false;
        return true;
      });
      
      if (args.where.OR) {
        list = list.filter((d) => {
          return args.where.OR!.some((cond: any) => {
            return Object.entries(cond).some(([key, val]: [string, any]) => {
              if (val && typeof val === "object" && "contains" in val) {
                const searchStr = val.contains.toLowerCase();
                const dVal = (d[key as keyof Dava] || "").toString().toLowerCase();
                return dVal.includes(searchStr);
              }
              return false;
            });
          });
        });
      }

      if (args.orderBy && args.orderBy.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (args.take) {
        list = list.slice(0, args.take);
      }
      // Populate musteri and durusmalar
      const musteriler = readJson<{ musteriler: Mesteri[] }>("musteriler.json", { musteriler: [] }, { userId: args.where.userId });
      const durusmalar = readJson<{ durusmalar: Durusma[] }>("durusmalar.json", { durusmalar: [] }, { userId: args.where.userId });
      return list.map((d) => ({
        ...d,
        musteri: musteriler.musteriler.find((m) => m.id === d.musteriId) || null,
        durusmalar: durusmalar.durusmalar.filter((dur) => dur.davaId === d.id).sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime()),
      }));
    },
    findFirst: async (args: any) => {
      const data = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
      const d = data.davas.find((d) => args.where.id ? d.id === args.where.id : d.dosyaNo === args.where.dosyaNo);
      if (!d) return null;
      const musteriler = readJson<{ musteriler: Mesteri[] }>("musteriler.json", { musteriler: [] }, { userId: args.where.userId });
      const durusmalar = readJson<{ durusmalar: Durusma[] }>("durusmalar.json", { durusmalar: [] }, { userId: args.where.userId });
      const masraflar = readJson<{ masraflar: Masraf[] }>("masraflar.json", { masraflar: [] }, { userId: args.where.userId });
      const belgeler = readJson<{ belgeler: Belge[] }>("belgeler.json", { belgeler: [] }, { userId: args.where.userId });
      const hareketler = readJson<{ hareketler: DavaHareketi[] }>("dava_hareketleri.json", { hareketler: [] }, { userId: args.where.userId });
      const tebligatlar = readJson<{ tebligatlar: Tebligat[] }>("tebligatlar.json", { tebligatlar: [] }, { userId: args.where.userId });
      return {
        ...d,
        musteri: musteriler.musteriler.find((m) => m.id === d.musteriId) || null,
        durusmalar: durusmalar.durusmalar.filter((dur) => dur.davaId === d.id),
        masraflar: masraflar.masraflar.filter((m) => m.davaId === d.id),
        belgeler: belgeler.belgeler.filter((b) => b.davaId === d.id),
        hareketler: hareketler.hareketler.filter((h) => h.davaId === d.id).sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime()),
        tebligatlar: tebligatlar.tebligatlar.filter((t) => t.davaId === d.id).sort((a, b) => new Date(b.gonderimTarihi || "").getTime() - new Date(a.gonderimTarihi || "").getTime()),
      };
    },
    findUnique: async (args: any) => {
      // Find dava globally (or search through tenants folders)
      const globalDavas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] });
      let dava = globalDavas.davas.find((d) => d.dosyaNo === args.where.dosyaNo);
      if (dava) return dava;

      const tenantsDir = path.join(DATA_DIR, "tenants");
      if (fs.existsSync(tenantsDir)) {
        try {
          const tenants = fs.readdirSync(tenantsDir);
          for (const t of tenants) {
            const davasPath = path.join(tenantsDir, t, "davas.json");
            if (fs.existsSync(davasPath)) {
              const td = JSON.parse(fs.readFileSync(davasPath, "utf8")).davas;
              dava = td.find((d: any) => d.dosyaNo === args.where.dosyaNo);
              if (dava) return dava;
            }
          }
        } catch {}
      }
      return null;
    },
    create: async (args: any) => {
      const data = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.data.userId });
      const now = new Date().toISOString();
      const newDava: Dava = {
        kategori: "diger",
        ...args.data,
        id: cuid(),
        createdAt: now,
        updatedAt: now,
      };
      data.davas.push(newDava);
      writeJson("davas.json", data, { userId: args.data.userId });
      return newDava;
    },
    upsert: async (args: any) => {
      const userId = args.create.userId;
      const data = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId });
      const idx = data.davas.findIndex((d) => d.dosyaNo === args.where.dosyaNo);
      const now = new Date().toISOString();
      if (idx !== -1) {
        data.davas[idx] = { ...data.davas[idx], ...args.update, updatedAt: now };
        writeJson("davas.json", data, { userId });
        return data.davas[idx];
      } else {
        const newDava: Dava = {
          kategori: "diger",
          ...args.create,
          id: cuid(),
          createdAt: now,
          updatedAt: now,
        };
        data.davas.push(newDava);
        writeJson("davas.json", data, { userId });
        return newDava;
      }
    },
    updateMany: async (args: any) => {
      const data = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
      let count = 0;
      data.davas = data.davas.map((d) => {
        if (d.id === args.where.id) {
          count++;
          return { ...d, ...args.data, updatedAt: new Date().toISOString() };
        }
        return d;
      });
      writeJson("davas.json", data, { userId: args.where.userId });
      return { count };
    },
    deleteMany: async (args: any) => {
      const data = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
      const initialLength = data.davas.length;
      data.davas = data.davas.filter((d) => d.id !== args.where.id);
      writeJson("davas.json", data, { userId: args.where.userId });
      return { count: initialLength - data.davas.length };
    }
  },
  musteri: {
    count: async (args: { where: { userId: string } }) => {
      const data = readJson<{ musteriler: Mesteri[] }>("musteriler.json", { musteriler: [] }, { userId: args.where.userId });
      return data.musteriler.filter((m) => m.userId === args.where.userId).length;
    },
    findMany: async (args: { where: { userId: string; OR?: any[] }; orderBy?: { createdAt: "desc" }; take?: number }) => {
      const data = readJson<{ musteriler: Mesteri[] }>("musteriler.json", { musteriler: [] }, { userId: args.where.userId });
      let list = data.musteriler.filter((m) => m.userId === args.where.userId);
      
      if (args.where.OR) {
        list = list.filter((m) => {
          return args.where.OR!.some((cond) => {
            return Object.entries(cond).some(([key, val]: [string, any]) => {
              if (val && typeof val === "object" && "contains" in val) {
                const searchStr = val.contains.toLowerCase();
                const mVal = (m[key as keyof Mesteri] || "").toString().toLowerCase();
                return mVal.includes(searchStr);
              }
              return false;
            });
          });
        });
      }

      if (args.orderBy && args.orderBy.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (args.take) {
        list = list.slice(0, args.take);
      }
      return list;
    },
    findFirst: async (args: any) => {
      const data = readJson<{ musteriler: Mesteri[] }>("musteriler.json", { musteriler: [] }, { userId: args.where.userId });
      const m = data.musteriler.find((m) => m.userId === args.where.userId && (args.where.id ? m.id === args.where.id : m.tcKimlik === args.where.tcKimlik));
      if (!m) return null;
      const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
      return {
        ...m,
        dosyalar: davas.davas.filter((d) => d.musteriId === m.id),
      };
    },
    create: async (args: any) => {
      const data = readJson<{ musteriler: Mesteri[] }>("musteriler.json", { musteriler: [] }, { userId: args.data.userId });
      const newMusteri: Mesteri = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.musteriler.push(newMusteri);
      writeJson("musteriler.json", data, { userId: args.data.userId });
      return newMusteri;
    },
    updateMany: async (args: any) => {
      const data = readJson<{ musteriler: Mesteri[] }>("musteriler.json", { musteriler: [] }, { userId: args.where.userId });
      let count = 0;
      data.musteriler = data.musteriler.map((m) => {
        if (m.id === args.where.id && m.userId === args.where.userId) {
          count++;
          return { ...m, ...args.data };
        }
        return m;
      });
      writeJson("musteriler.json", data, { userId: args.where.userId });
      return { count };
    },
    deleteMany: async (args: any) => {
      const data = readJson<{ musteriler: Mesteri[] }>("musteriler.json", { musteriler: [] }, { userId: args.where.userId });
      const initialLength = data.musteriler.length;
      data.musteriler = data.musteriler.filter((m) => !(m.id === args.where.id && m.userId === args.where.userId));
      writeJson("musteriler.json", data, { userId: args.where.userId });
      return { count: initialLength - data.musteriler.length };
    }
  },
  durusma: {
    count: async (args: any) => {
      const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.dava.userId });
      const userDavaIds = davas.davas.filter((d) => d.userId === args.where.dava.userId).map((d) => d.id);
      const durusmalar = readJson<{ durusmalar: Durusma[] }>("durusmalar.json", { durusmalar: [] }, { userId: args.where.dava.userId });
      return durusmalar.durusmalar.filter((dur) => userDavaIds.includes(dur.davaId)).length;
    },
    findMany: async (args: any) => {
      const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.dava.userId });
      const userDavas = davas.davas.filter((d) => d.userId === args.where.dava.userId);
      const userDavaIds = userDavas.map((d) => d.id);
      const durusmalar = readJson<{ durusmalar: Durusma[] }>("durusmalar.json", { durusmalar: [] }, { userId: args.where.dava.userId });
      let list = durusmalar.durusmalar.filter((dur) => {
        const matchDava = userDavaIds.includes(dur.davaId);
        if (!matchDava) return false;
        if (args.where.tarih) {
          const t = new Date(dur.tarih);
          return t >= args.where.tarih.gte && t <= args.where.tarih.lte;
        }
        return true;
      });
      if (args.orderBy && args.orderBy.tarih === "asc") {
        list.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
      }
      if (args.take) {
        list = list.slice(0, args.take);
      }
      return list.map((dur) => ({
        ...dur,
        dava: userDavas.find((d) => d.id === dur.davaId) || { ad: "Bilinmeyen Dava" },
      }));
    },
    create: async (args: any) => {
      const data = readJson<{ durusmalar: Durusma[] }>("durusmalar.json", { durusmalar: [] }, { davaId: args.data.davaId });
      const newDurusma: Durusma = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.durusmalar.push(newDurusma);
      writeJson("durusmalar.json", data, { davaId: args.data.davaId });
      return newDurusma;
    },
    updateMany: async (args: any) => {
      const data = readJson<{ durusmalar: Durusma[] }>("durusmalar.json", { durusmalar: [] }, args.where.davaId ? { davaId: args.where.davaId } : undefined);
      let count = 0;
      data.durusmalar = data.durusmalar.map((dur) => {
        if (dur.id === args.where.id) {
          count++;
          return { ...dur, ...args.data };
        }
        return dur;
      });
      writeJson("durusmalar.json", data, args.where.davaId ? { davaId: args.where.davaId } : undefined);
      return { count };
    }
  },
  is: {
    count: async (args: any) => {
      const data = readJson<{ isler: Is[] }>("isler.json", { isler: [] }, { userId: args.where.userId });
      return data.isler.filter((i) => i.userId === args.where.userId && i.tamamlandi === args.where.tamamlandi).length;
    },
    findMany: async (args: any) => {
      const data = readJson<{ isler: Is[] }>("isler.json", { isler: [] }, { userId: args.where.userId });
      let list = data.isler.filter((i) => {
        if (args.where.durum && i.durum !== args.where.durum) return false;
        if (args.where.davaId && i.davaId !== args.where.davaId) return false;
        return true;
      });
      // Sort: tamamlandi asc, sonTarih asc
      list.sort((a, b) => {
        if (a.tamamlandi !== b.tamamlandi) return a.tamamlandi ? 1 : -1;
        if (!a.sonTarih) return 1;
        if (!b.sonTarih) return -1;
        return new Date(a.sonTarih).getTime() - new Date(b.sonTarih).getTime();
      });
      if (args.include && args.include.dava) {
        const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
        return list.map((i) => ({
          ...i,
          dava: davas.davas.find((d) => d.id === i.davaId) || null,
        }));
      }
      return list;
    },
    create: async (args: any) => {
      const data = readJson<{ isler: Is[] }>("isler.json", { isler: [] }, { userId: args.data.userId });
      const newIs: Is = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.isler.push(newIs);
      writeJson("isler.json", data, { userId: args.data.userId });
      return newIs;
    },
    updateMany: async (args: any) => {
      const data = readJson<{ isler: Is[] }>("isler.json", { isler: [] }, { userId: args.where.userId });
      let count = 0;
      data.isler = data.isler.map((i) => {
        if (i.id === args.where.id && i.userId === args.where.userId) {
          count++;
          return { ...i, ...args.data };
        }
        return i;
      });
      writeJson("isler.json", data, { userId: args.where.userId });
      return { count };
    }
  },
  masraf: {
    aggregate: async (args: any) => {
      const data = readJson<{ masraflar: Masraf[] }>("masraflar.json", { masraflar: [] }, { userId: args.where.userId });
      const total = data.masraflar.filter((m) => m.userId === args.where.userId).reduce((acc, m) => acc + m.tutar, 0);
      return { _sum: { tutar: total } };
    },
    groupBy: async (args: any) => {
      const data = readJson<{ masraflar: Masraf[] }>("masraflar.json", { masraflar: [] }, { userId: args.where.userId });
      const groups: Record<string, number> = {};
      data.masraflar.filter((m) => m.userId === args.where.userId).forEach((m) => {
        groups[m.kategori] = (groups[m.kategori] || 0) + m.tutar;
      });
      return Object.entries(groups).map(([kategori, total]) => ({
        kategori,
        _sum: { tutar: total },
      }));
    },
    findMany: async (args: any) => {
      const data = readJson<{ masraflar: Masraf[] }>("masraflar.json", { masraflar: [] }, { userId: args.where.userId });
      let list = data.masraflar.filter((m) => m.userId === args.where.userId);
      if (args.orderBy && args.orderBy.tarih === "desc") {
        list.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      }
      if (args.include && args.include.dava) {
        const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
        return list.map((m) => ({
          ...m,
          dava: davas.davas.find((d) => d.id === m.davaId) || null,
        }));
      }
      return list;
    },
    create: async (args: any) => {
      const data = readJson<{ masraflar: Masraf[] }>("masraflar.json", { masraflar: [] }, { userId: args.data.userId });
      const newMasraf: Masraf = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.masraflar.push(newMasraf);
      writeJson("masraflar.json", data, { userId: args.data.userId });
      return newMasraf;
    }
  },
  belge: {
    findMany: async (args: any) => {
      const data = readJson<{ belgeler: Belge[] }>("belgeler.json", { belgeler: [] }, { userId: args.where.userId });
      let list = data.belgeler.filter((b) => b.userId === args.where.userId);
      
      if (args.where.OR) {
        list = list.filter((b) => {
          return args.where.OR!.some((cond) => {
            return Object.entries(cond).some(([key, val]: [string, any]) => {
              if (val && typeof val === "object" && "contains" in val) {
                const searchStr = val.contains.toLowerCase();
                const bVal = (b[key as keyof Belge] || "").toString().toLowerCase();
                return bVal.includes(searchStr);
              }
              return false;
            });
          });
        });
      }

      if (args.orderBy && args.orderBy.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (args.take) {
        list = list.slice(0, args.take);
      }
      if (args.include && args.include.dava) {
        const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
        return list.map((b) => ({
          ...b,
          dava: davas.davas.find((d) => d.id === b.davaId) || null,
        }));
      }
      return list;
    },
    create: async (args: any) => {
      const data = readJson<{ belgeler: Belge[] }>("belgeler.json", { belgeler: [] }, { userId: args.data.userId });
      const newBelge: Belge = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.belgeler.push(newBelge);
      writeJson("belgeler.json", data, { userId: args.data.userId });
      return newBelge;
    }
  },
  dosyaDosyasi: {
    findFirst: async (args: any) => {
      const data = readJson<{ dosyalar: DosyaDosyasi[] }>("dosyalar.json", { dosyalar: [] }, { userId: args.where.userId });
      return data.dosyalar.find((d) => d.id === args.where.id && d.userId === args.where.userId) || null;
    },
    findMany: async (args: any) => {
      const data = readJson<{ dosyalar: DosyaDosyasi[] }>("dosyalar.json", { dosyalar: [] }, { userId: args.where.userId });
      let list = data.dosyalar.filter((d) => {
        if (d.userId !== args.where.userId) return false;
        if (args.where.davaId && d.davaId !== args.where.davaId) return false;
        if (args.where.orijinalAd && !d.orijinalAd.includes(args.where.orijinalAd.contains)) return false;
        return true;
      });
      if (args.orderBy && args.orderBy.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (args.include && args.include.dava) {
        const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
        return list.map((d) => ({
          ...d,
          dava: davas.davas.find((dav) => dav.id === d.davaId) || null,
        }));
      }
      return list;
    },
    create: async (args: any) => {
      const data = readJson<{ dosyalar: DosyaDosyasi[] }>("dosyalar.json", { dosyalar: [] }, { userId: args.data.userId });
      const newDosya: DosyaDosyasi = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.dosyalar.push(newDosya);
      writeJson("dosyalar.json", data, { userId: args.data.userId });
      return newDosya;
    },
    delete: async (args: any) => {
      // Find file globally or within tenants
      const globalDosyalar = readJson<{ dosyalar: DosyaDosyasi[] }>("dosyalar.json", { dosyalar: [] });
      const file = globalDosyalar.dosyalar.find((d) => d.id === args.where.id);
      if (file) {
        globalDosyalar.dosyalar = globalDosyalar.dosyalar.filter((d) => d.id !== args.where.id);
        writeJson("dosyalar.json", globalDosyalar);
        return { success: true };
      }

      const tenantsDir = path.join(DATA_DIR, "tenants");
      if (fs.existsSync(tenantsDir)) {
        try {
          const tenants = fs.readdirSync(tenantsDir);
          for (const t of tenants) {
            const dosPath = path.join(tenantsDir, t, "dosyalar.json");
            if (fs.existsSync(dosPath)) {
              const td = JSON.parse(fs.readFileSync(dosPath, "utf8"));
              if (td.dosyalar.some((x: any) => x.id === args.where.id)) {
                td.dosyalar = td.dosyalar.filter((x: any) => x.id !== args.where.id);
                fs.writeFileSync(dosPath, JSON.stringify(td, null, 2), "utf8");
                return { success: true };
              }
            }
          }
        } catch {}
      }
      return { success: false };
    }
  },
  eSMM: {
    findMany: async (args: any) => {
      const data = readJson<{ esmm: ESMM[] }>("esmm.json", { esmm: [] }, { userId: args.where.userId });
      let list = data.esmm.filter((e) => e.userId === args.where.userId);
      if (args.orderBy && args.orderBy.tarih) {
        list.sort((a, b) => {
          const tA = new Date(a.tarih).getTime();
          const tB = new Date(b.tarih).getTime();
          return args.orderBy.tarih === "asc" ? tA - tB : tB - tA;
        });
      }
      if (args.include && args.include.dava) {
        const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
        return list.map((e) => ({
          ...e,
          dava: davas.davas.find((d) => d.id === e.davaId) || null,
        }));
      }
      return list;
    },
    findFirst: async (args: any) => {
      const data = readJson<{ esmm: ESMM[] }>("esmm.json", { esmm: [] }, { userId: args.where.userId });
      const list = data.esmm.filter((e) => e.userId === args.where.userId);
      list.sort((a, b) => b.seriNo.localeCompare(a.seriNo));
      return list[0] || null;
    },
    create: async (args: any) => {
      const data = readJson<{ esmm: ESMM[] }>("esmm.json", { esmm: [] }, { userId: args.data.userId });
      const newESMM: ESMM = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.esmm.push(newESMM);
      writeJson("esmm.json", data, { userId: args.data.userId });
      return newESMM;
    }
  },
  fatura: {
    findMany: async (args: any) => {
      const data = readJson<{ faturas: Fatura[] }>("faturas.json", { faturas: [] }, { userId: args.where.userId });
      let list = data.faturas.filter((f) => f.userId === args.where.userId);
      if (args.orderBy && args.orderBy.tarih === "desc") {
        list.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      }
      if (args.include && args.include.dava) {
        const davas = readJson<{ davas: Dava[] }>("davas.json", { davas: [] }, { userId: args.where.userId });
        return list.map((f) => ({
          ...f,
          dava: davas.davas.find((d) => d.id === f.davaId) || null,
        }));
      }
      return list;
    },
    findFirst: async (args: any) => {
      const data = readJson<{ faturas: Fatura[] }>("faturas.json", { faturas: [] }, { userId: args.where.userId });
      const list = data.faturas.filter((f) => f.userId === args.where.userId);
      list.sort((a, b) => b.faturaNo.localeCompare(a.faturaNo));
      return list[0] || null;
    },
    create: async (args: any) => {
      const data = readJson<{ faturas: Fatura[] }>("faturas.json", { faturas: [] }, { userId: args.data.userId });
      const newFatura: Fatura = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.faturas.push(newFatura);
      writeJson("faturas.json", data, { userId: args.data.userId });
      return newFatura;
    }
  },
  log: {
    findMany: async (args: any) => {
      const data = readJson<{ logs: Log[] }>("logs.json", { logs: [] }, args.where?.userId ? { userId: args.where.userId } : undefined);
      let list = args.where?.userId
        ? data.logs.filter((l) => l.userId === args.where.userId)
        : data.logs;
      if (args.orderBy && args.orderBy.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (args.take) {
        list = list.slice(0, args.take);
      }
      return list;
    },
    create: async (args: any) => {
      const data = readJson<{ logs: Log[] }>("logs.json", { logs: [] }, args.data.userId ? { userId: args.data.userId } : undefined);
      const newLog: Log = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.logs.push(newLog);
      writeJson("logs.json", data, args.data.userId ? { userId: args.data.userId } : undefined);
      return newLog;
    },
    deleteMany: async (args?: any) => {
      const data = readJson<{ logs: Log[] }>("logs.json", { logs: [] }, args?.where?.userId ? { userId: args.where.userId } : undefined);
      const initialLength = data.logs.length;
      if (args?.where?.userId) {
        data.logs = data.logs.filter((l) => l.userId !== args.where.userId);
      } else {
        data.logs = [];
      }
      writeJson("logs.json", data, args?.where?.userId ? { userId: args.where.userId } : undefined);
      return { count: initialLength - data.logs.length };
    }
  },
  tebligat: {
    findMany: async (args: any) => {
      const data = readJson<{ tebligatlar: Tebligat[] }>("tebligatlar.json", { tebligatlar: [] }, { userId: args.where.userId });
      let list = data.tebligatlar.filter((t) => {
        if (t.userId !== args.where.userId) return false;
        if (args.where.durum !== undefined && t.durum !== args.where.durum) return false;
        return true;
      });
      if (args.orderBy && args.orderBy.gonderimTarihi) {
        const desc = args.orderBy.gonderimTarihi === "desc";
        list.sort((a, b) => {
           const timeA = new Date(a.gonderimTarihi || 0).getTime();
           const timeB = new Date(b.gonderimTarihi || 0).getTime();
           return desc ? timeB - timeA : timeA - timeB;
        });
      }
      if (args.take) {
        list = list.slice(0, args.take);
      }
      return list;
    },
    create: async (args: any) => {
      const data = readJson<{ tebligatlar: Tebligat[] }>("tebligatlar.json", { tebligatlar: [] }, { userId: args.data.userId });
      const newTebligat: Tebligat = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.tebligatlar.push(newTebligat);
      writeJson("tebligatlar.json", data, { userId: args.data.userId });
      return newTebligat;
    },
    updateMany: async (args: any) => {
      const data = readJson<{ tebligatlar: Tebligat[] }>("tebligatlar.json", { tebligatlar: [] }, { userId: args.where.userId });
      let count = 0;
      data.tebligatlar = data.tebligatlar.map((t) => {
        if (t.id === args.where.id && t.userId === args.where.userId) {
          count++;
          return { ...t, ...args.data };
        }
        return t;
      });
      writeJson("tebligatlar.json", data, { userId: args.where.userId });
      return { count };
    }
  },
  davaHareketi: {
    findMany: async (args: any) => {
      const data = readJson<{ hareketler: DavaHareketi[] }>("dava_hareketleri.json", { hareketler: [] }, { userId: args.where.userId });
      let list = data.hareketler.filter((h) => h.davaId === args.where.davaId);
      if (args.orderBy && args.orderBy.tarih === "desc") {
        list.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      }
      return list;
    },
    create: async (args: any) => {
      const data = readJson<{ hareketler: DavaHareketi[] }>("dava_hareketleri.json", { hareketler: [] }, { userId: args.data.userId });
      const newHareketi: DavaHareketi = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.hareketler.push(newHareketi);
      writeJson("dava_hareketleri.json", data, { userId: args.data.userId });
      return newHareketi;
    }
  },
  tahsilat: {
    findMany: async (args: any) => {
      const data = readJson<{ tahsilatlar: Tahsilat[] }>("tahsilatlar.json", { tahsilatlar: [] }, { userId: args.where.userId });
      let list = data.tahsilatlar.filter((t) => {
        if (t.userId !== args.where.userId) return false;
        if (args.where.davaId && t.davaId !== args.where.davaId) return false;
        return true;
      });
      const today = new Date().toISOString().split("T")[0];
      list = list.map((t) => {
        if (t.durum === "bekliyor" && t.vadeTarihi < today) {
          return { ...t, durum: "gecikti" };
        }
        return t;
      });
      if (args.orderBy && args.orderBy.vadeTarihi) {
        list.sort((a, b) => {
          const tA = new Date(a.vadeTarihi).getTime();
          const tB = new Date(b.vadeTarihi).getTime();
          return args.orderBy.vadeTarihi === "asc" ? tA - tB : tB - tA;
        });
      }
      return list;
    },
    create: async (args: any) => {
      const data = readJson<{ tahsilatlar: Tahsilat[] }>("tahsilatlar.json", { tahsilatlar: [] }, { userId: args.data.userId });
      const newTahsilat: Tahsilat = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.tahsilatlar.push(newTahsilat);
      writeJson("tahsilatlar.json", data, { userId: args.data.userId });
      return newTahsilat;
    },
    updateMany: async (args: any) => {
      const data = readJson<{ tahsilatlar: Tahsilat[] }>("tahsilatlar.json", { tahsilatlar: [] }, { userId: args.where.userId });
      let count = 0;
      data.tahsilatlar = data.tahsilatlar.map((t) => {
        if (t.id === args.where.id && t.userId === args.where.userId) {
          count++;
          return { ...t, ...args.data };
        }
        return t;
      });
      writeJson("tahsilatlar.json", data, { userId: args.where.userId });
      return { count };
    },
    deleteMany: async (args: any) => {
      const data = readJson<{ tahsilatlar: Tahsilat[] }>("tahsilatlar.json", { tahsilatlar: [] }, { userId: args.where.userId });
      const initialLength = data.tahsilatlar.length;
      data.tahsilatlar = data.tahsilatlar.filter((t) => !(t.id === args.where.id && t.userId === args.where.userId));
      writeJson("tahsilatlar.json", data, { userId: args.where.userId });
      return { count: initialLength - data.tahsilatlar.length };
    }
  },
  emsalKarar: {
    findMany: async (args?: { where?: { OR?: any[] }; take?: number }) => {
      const data = readJson<{ kararlar: EmsalKarar[] }>("emsal_karar.json", { kararlar: [] });
      let list = data.kararlar || [];
      if (args?.where?.OR) {
        list = list.filter((k) =>
          args.where!.OR!.some((cond: any) =>
            Object.entries(cond).some(([key, val]: [string, any]) => {
              if (val && typeof val === "object" && "contains" in val) {
                const searchStr = val.contains.toLowerCase();
                const kVal = (k[key as keyof EmsalKarar] || "").toString().toLowerCase();
                return kVal.includes(searchStr);
              }
              return false;
            })
          )
        );
      }
      if (args?.take) list = list.slice(0, args.take);
      return list;
    }
  },
  hukukiCeviri: {
    create: async (args: any) => {
      const data = readJson<{ ceviriler: HukukiCeviri[] }>("hukuki_ceviriler.json", { ceviriler: [] }, { userId: args.data.userId });
      const newCeviri: HukukiCeviri = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.ceviriler.push(newCeviri);
      writeJson("hukuki_ceviriler.json", data, { userId: args.data.userId });
      return newCeviri;
    },
    findMany: async (args: any) => {
      const data = readJson<{ ceviriler: HukukiCeviri[] }>("hukuki_ceviriler.json", { ceviriler: [] }, { userId: args.where.userId });
      let list = data.ceviriler.filter((c) => c.userId === args.where.userId);
      if (args.orderBy?.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return list;
    }
  },
  sozlesmeAnalizi: {
    create: async (args: any) => {
      const data = readJson<{ analizler: SozlesmeAnalizi[] }>("sozlesme_analizleri.json", { analizler: [] }, { userId: args.data.userId });
      const newAnaliz: SozlesmeAnalizi = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.analizler.push(newAnaliz);
      writeJson("sozlesme_analizleri.json", data, { userId: args.data.userId });
      return newAnaliz;
    },
    findMany: async (args: any) => {
      const data = readJson<{ analizler: SozlesmeAnalizi[] }>("sozlesme_analizleri.json", { analizler: [] }, { userId: args.where.userId });
      let list = data.analizler.filter((a) => a.userId === args.where.userId);
      if (args.orderBy?.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return list;
    }
  },
  dilekecePuanlama: {
    create: async (args: any) => {
      const data = readJson<{ puanlamalar: DilekecePuanlama[] }>("dilekce_puanlamalar.json", { puanlamalar: [] }, { userId: args.data.userId });
      const newPuanlama: DilekecePuanlama = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.puanlamalar.push(newPuanlama);
      writeJson("dilekce_puanlamalar.json", data, { userId: args.data.userId });
      return newPuanlama;
    },
    findMany: async (args: any) => {
      const data = readJson<{ puanlamalar: DilekecePuanlama[] }>("dilekce_puanlamalar.json", { puanlamalar: [] }, { userId: args.where.userId });
      let list = data.puanlamalar.filter((p) => p.userId === args.where.userId);
      if (args.orderBy?.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return list;
    }
  },
  bulkMesaj: {
    create: async (args: any) => {
      const data = readJson<{ mesajlar: BulkMesaj[] }>("bulk_mesajlar.json", { mesajlar: [] }, { userId: args.data.userId });
      const newMesaj: BulkMesaj = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.mesajlar.push(newMesaj);
      writeJson("bulk_mesajlar.json", data, { userId: args.data.userId });
      return newMesaj;
    },
    update: async (args: any) => {
      // Find the mesaj across all users
      const globalData = readJson<{ mesajlar: BulkMesaj[] }>("bulk_mesajlar.json", { mesajlar: [] });
      const idx = globalData.mesajlar.findIndex((m) => m.id === args.where.id);
      if (idx !== -1) {
        globalData.mesajlar[idx] = { ...globalData.mesajlar[idx], ...args.data };
        writeJson("bulk_mesajlar.json", globalData);
        return globalData.mesajlar[idx];
      }
      // Search in tenants
      const tenantsDir = path.join(DATA_DIR, "tenants");
      if (fs.existsSync(tenantsDir)) {
        const tenants = fs.readdirSync(tenantsDir);
        for (const t of tenants) {
          const mesajPath = path.join(tenantsDir, t, "bulk_mesajlar.json");
          if (fs.existsSync(mesajPath)) {
            const td = JSON.parse(fs.readFileSync(mesajPath, "utf8"));
            const i = td.mesajlar.findIndex((m: any) => m.id === args.where.id);
            if (i !== -1) {
              td.mesajlar[i] = { ...td.mesajlar[i], ...args.data };
              fs.writeFileSync(mesajPath, JSON.stringify(td, null, 2), "utf8");
              return td.mesajlar[i];
            }
          }
        }
      }
      throw new Error("BulkMesaj not found");
    },
    findMany: async (args: any) => {
      const data = readJson<{ mesajlar: BulkMesaj[] }>("bulk_mesajlar.json", { mesajlar: [] }, { userId: args.where.userId });
      let list = data.mesajlar.filter((m) => m.userId === args.where.userId);
      if (args.orderBy?.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return list;
    }
  },
  mesajlasmaAyarlari: {
    findUnique: async (args: any) => {
      const data = readJson<{ ayarlar: MesajlasmaAyarlari[] }>("mesajlasma_ayarlari.json", { ayarlar: [] }, { userId: args.where.userId });
      return data.ayarlar.find((a) => a.userId === args.where.userId) || null;
    },
    upsert: async (args: any) => {
      const data = readJson<{ ayarlar: MesajlasmaAyarlari[] }>("mesajlasma_ayarlari.json", { ayarlar: [] }, { userId: args.where.userId });
      const now = new Date().toISOString();
      const idx = data.ayarlar.findIndex((a) => a.userId === args.where.userId);
      if (idx !== -1) {
        data.ayarlar[idx] = { ...data.ayarlar[idx], ...args.update, updatedAt: now };
        writeJson("mesajlasma_ayarlari.json", data, { userId: args.where.userId });
        return data.ayarlar[idx];
      } else {
        const newAyar: MesajlasmaAyarlari = { ...args.create, id: cuid(), createdAt: now, updatedAt: now };
        data.ayarlar.push(newAyar);
        writeJson("mesajlasma_ayarlari.json", data, { userId: args.where.userId });
        return newAyar;
      }
    }
  },
  kararHarita: {
    create: async (args: any) => {
      const data = readJson<{ haritalar: KararHarita[] }>("karar_haritalari.json", { haritalar: [] }, { userId: args.data.userId });
      const newHarita: KararHarita = {
        ...args.data,
        id: cuid(),
        createdAt: new Date().toISOString(),
      };
      data.haritalar.push(newHarita);
      writeJson("karar_haritalari.json", data, { userId: args.data.userId });
      return newHarita;
    },
    findMany: async (args: any) => {
      const data = readJson<{ haritalar: KararHarita[] }>("karar_haritalari.json", { haritalar: [] }, { userId: args.where.userId });
      let list = data.haritalar.filter((h) => h.userId === args.where.userId);
      if (args.orderBy?.createdAt === "desc") {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return list;
    }
  },
  uetsAyarlari: {
    findUnique: async (args: any) => {
      const data = readJson<{ ayarlar: UetsAyarlari[] }>("uets_ayarlari.json", { ayarlar: [] }, { userId: args.where.userId });
      return data.ayarlar.find((a) => a.userId === args.where.userId) || null;
    },
    create: async (args: any) => {
      const data = readJson<{ ayarlar: UetsAyarlari[] }>("uets_ayarlari.json", { ayarlar: [] }, { userId: args.data.userId });
      const now = new Date().toISOString();
      const newAyar: UetsAyarlari = { ...args.data, id: cuid(), createdAt: now, updatedAt: now };
      data.ayarlar.push(newAyar);
      writeJson("uets_ayarlari.json", data, { userId: args.data.userId });
      return newAyar;
    },
    update: async (args: any) => {
      const data = readJson<{ ayarlar: UetsAyarlari[] }>("uets_ayarlari.json", { ayarlar: [] }, { userId: args.where.userId });
      const idx = data.ayarlar.findIndex((a) => a.userId === args.where.userId);
      if (idx === -1) throw new Error("UetsAyarlari not found");
      data.ayarlar[idx] = { ...data.ayarlar[idx], ...args.data, updatedAt: new Date().toISOString() };
      writeJson("uets_ayarlari.json", data, { userId: args.where.userId });
      return data.ayarlar[idx];
    }
  }
};
