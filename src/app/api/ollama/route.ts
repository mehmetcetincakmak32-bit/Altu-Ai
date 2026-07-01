import { NextResponse } from "next/server";

export async function GET() {
  try {
    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";
    const res = await fetch(`${pythonUrl}/health`);
    const data = await res.json();
    return NextResponse.json({ durum: data.status || "ok" });
  } catch {
    return NextResponse.json({ durum: "baglanti-kurulamadi" }, { status: 503 });
  }
}
