import fs from "fs";
import path from "path";
import { prisma } from "./prisma";

const DATA_DIR = path.join(process.cwd(), "storage", "data");
const TENANTS_DIR = path.join(DATA_DIR, "tenants");

export function ensureTenantDir(subdomain: string): void {
  const dir = path.join(TENANTS_DIR, subdomain);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function generateSubdomain(ad: string, soyad: string): string {
  const base = (ad + soyad)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  const randomSuffix = Math.random().toString(36).substring(2, 5);
  return `${base}${randomSuffix}`;
}

export async function createTenantForUser(
  userId: string,
  ad: string,
  soyad: string,
): Promise<string> {
  let subdomain = generateSubdomain(ad, soyad);
  let retries = 0;
  while (retries < 10) {
    const existing = await prisma.user.findUnique({ where: { subdomain } });
    if (!existing) break;
    subdomain = generateSubdomain(ad, soyad) + retries;
    retries++;
  }

  ensureTenantDir(subdomain);

  const emptyFiles = ["davas.json", "durusmalar.json", "musteriler.json", "isler.json", "masraflar.json", "faturas.json", "esmm.json", "belgeler.json", "emsal_karar.json", "ai_knowledge.json"];
  for (const file of emptyFiles) {
    const filePath = path.join(TENANTS_DIR, subdomain, file);
    if (!fs.existsSync(filePath)) {
      let defaultData: any = [];
      if (file === "davas.json") defaultData = { davas: [] };
      else if (file === "durusmalar.json") defaultData = { durusmalar: [] };
      else if (file === "musteriler.json") defaultData = { musteriler: [] };
      else if (file === "isler.json") defaultData = { isler: [] };
      else if (file === "masraflar.json") defaultData = { masraflar: [] };
      else if (file === "faturas.json") defaultData = { faturas: [] };
      else if (file === "esmm.json") defaultData = { esmm: [] };
      else if (file === "belgeler.json") defaultData = { belgeler: [] };
      else if (file === "emsal_karar.json") defaultData = [];
      else if (file === "ai_knowledge.json") defaultData = { knowledge: [] };
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf8");
    }
  }

  return subdomain;
}

export function getTenantDataDir(subdomain: string): string {
  return path.join(TENANTS_DIR, subdomain);
}

export function tenantFileExists(subdomain: string, filename: string): boolean {
  return fs.existsSync(path.join(TENANTS_DIR, subdomain, filename));
}

export function readTenantJson<T>(subdomain: string, filename: string, defaultValue: T): T {
  const filePath = path.join(TENANTS_DIR, subdomain, filename);
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function writeTenantJson<T>(subdomain: string, filename: string, data: T): void {
  const dir = path.join(TENANTS_DIR, subdomain);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2), "utf8");
}

export function getAllTenants(): string[] {
  if (!fs.existsSync(TENANTS_DIR)) return [];
  return fs.readdirSync(TENANTS_DIR).filter((d) => {
    const stat = fs.statSync(path.join(TENANTS_DIR, d));
    return stat.isDirectory();
  });
}