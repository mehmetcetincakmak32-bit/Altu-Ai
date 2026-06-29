import { NextResponse } from "next/server";

const PYTHON_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8765";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "10";
    const difficulty = searchParams.get("difficulty") || "all";

    const res = await fetch(`${PYTHON_URL}/api/admin/benchmark/run?limit=${limit}&difficulty=${difficulty}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
