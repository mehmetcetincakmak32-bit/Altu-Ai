import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  try {
    const { tcNo, uyapSifre, girisYontemi } = await req.json();

    const response = await fetch(`${PYTHON_URL}/api/uyap/sync-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tc_no: tcNo || "",
        uyap_sifre: uyapSifre || "",
        giris_yontemi: girisYontemi || "edevlet",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ hata: "UYAP başlatma servisi hatası", detay: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("UYAP sync-start API failed:", error);
    return NextResponse.json({ hata: "UYAP senkronizasyonu başlatılamadı", detay: error.message }, { status: 500 });
  }
}
