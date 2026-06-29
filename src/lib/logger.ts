import { prisma } from "./prisma";

type LogSeviye = "bilgi" | "uyari" | "hata" | "basari";

export async function logKaydet(
  islem: string,
  aciklama?: string,
  detay?: string,
  seviye: LogSeviye = "bilgi",
  userId?: string
) {
  try {
    await prisma.log.create({
      data: { islem, aciklama, detay, seviye, userId },
    });
  } catch (e) {
    console.error("Log kaydedilemedi:", e);
  }
}
