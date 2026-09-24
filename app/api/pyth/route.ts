import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const feedId = searchParams.get("feedId");
  const currency = searchParams.get("currency") || "EUR";

  if (!feedId) {
    return NextResponse.json({ error: "Missing feedId" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}`, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
      next: { revalidate: 60 } // Next.js server cache for 60s
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Pyth Hermes non-200" }, { status: 502 });
    }

    const data = await res.json();
    const parsed = data?.parsed?.[0]?.price;
    if (parsed && typeof parsed.price === "string" && typeof parsed.expo === "number") {
      const rawPrice = parseFloat(parsed.price) * Math.pow(10, parsed.expo);
      const rate = currency === "JPY" && rawPrice > 50 ? 1 / rawPrice : rawPrice;
      return NextResponse.json({ rate, isLive: true });
    }

    return NextResponse.json({ error: "Invalid price format" }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch Pyth oracle price" }, { status: 500 });
  }
}
