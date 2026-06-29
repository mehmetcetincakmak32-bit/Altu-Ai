import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "apilex-thos-gizli-anahtar-2026";

export async function hashPassword(sifre: string) {
  return bcrypt.hash(sifre, 12);
}

export async function verifyPassword(sifre: string, hash: string) {
  return bcrypt.compare(sifre, hash);
}

export function createToken(payload: { id: string; email: string; rol: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string; rol: string };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Yetkilendirme gerekli");
  return session;
}
