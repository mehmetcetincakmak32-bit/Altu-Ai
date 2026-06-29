import nodemailer from "nodemailer";

interface GonderimSonuc {
  basarili: boolean;
  hata?: string;
  gonderilenSayi: number;
}

export async function smsGonder(
  alicilar: string[],
  mesaj: string,
  ayarlar: { apiKey?: string; apiSifre?: string; baslik: string }
): Promise<GonderimSonuc> {
  const apiKey = ayarlar.apiKey || process.env.NETGSM_API_KEY || "";
  const apiSifre = ayarlar.apiSifre || process.env.NETGSM_API_SIFRE || "";
  const baslik = ayarlar.baslik || "ALTU AI";

  if (!apiKey || !apiSifre) {
    return { basarili: false, hata: "SMS API anahtarları eksik", gonderilenSayi: 0 };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `https://api.netgsm.com.tr/sms/send/get?usercode=${apiKey}&password=${apiSifre}&gsmno=${alicilar.join(",")}&message=${encodeURIComponent(icerik)}&msgheader=${encodeURIComponent(baslik)}`,
      { method: "GET", signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`NetGSM hatası: ${res.status}`);
    const text = await res.text();
    if (text.startsWith("00") || text.startsWith("01")) {
      return { basarili: true, gonderilenSayi: alicilar.length };
    }
    return { basarili: false, hata: `NetGSM hata kodu: ${text}`, gonderilenSayi: 0 };
  } catch (e: any) {
    return { basarili: false, hata: e.message, gonderilenSayi: 0 };
  }
}

export async function emailGonder(
  alicilar: string[],
  konu: string,
  icerik: string,
  ayarlar: { host?: string; port?: number; kullanici?: string; sifre?: string; guvenlik?: string }
): Promise<GonderimSonuc> {
  const host = ayarlar.host || process.env.SMTP_HOST || "";
  const port = ayarlar.port || parseInt(process.env.SMTP_PORT || "587");
  const kullanici = ayarlar.kullanici || process.env.SMTP_KULLANICI || "";
  const sifre = ayarlar.sifre || process.env.SMTP_SIFRE || "";

  if (!host || !kullanici || !sifre) {
    return { basarili: false, hata: "SMTP ayarları eksik", gonderilenSayi: 0 };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: ayarlar.guvenlik === "ssl",
      auth: { user: kullanici, pass: sifre },
    });

    let basarili = 0;
    for (const alici of alicilar) {
      try {
        await transporter.sendMail({
          from: kullanici,
          to: alici,
          subject: konu,
          text: icerik,
        });
        basarili++;
      } catch { }
    }
    return { basarili: basarili > 0, gonderilenSayi: basarili };
  } catch (e: any) {
    return { basarili: false, hata: e.message, gonderilenSayi: 0 };
  }
}

export async function whatsappGonder(
  alicilar: string[],
  mesaj: string,
  ayarlar: { apiKey?: string; telNo?: string }
): Promise<GonderimSonuc> {
  const apiKey = ayarlar.apiKey || process.env.WHATSAPP_API_KEY || "";
  const telNo = ayarlar.telNo || process.env.WHATSAPP_TEL_NO || "905551234567";

  if (!apiKey) {
    return { basarili: false, hata: "WhatsApp API anahtarı eksik", gonderilenSayi: 0 };
  }

  try {
    let basarili = 0;
    for (const alici of alicilar) {
      try {
        const temizAlici = alici.replace(/[^0-9]/g, "");
        if (temizAlici.length < 10) continue;

        const res = await fetch(
          `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID || "DEFAULT"}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: temizAlici,
              type: "text",
              text: { body: mesaj },
            }),
          }
        );
        if (res.ok) basarili++;
      } catch { }
    }
    return { basarili: basarili > 0, gonderilenSayi: basarili };
  } catch (e: any) {
    return { basarili: false, hata: e.message, gonderilenSayi: 0 };
  }
}
