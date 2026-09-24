import { NextRequest, NextResponse } from "next/server";

const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  EUR: 1.09,
  GBP: 1.28,
  JPY: 0.0065,
  CAD: 0.73,
  AUD: 0.65,
  CHF: 1.14,
  SGD: 0.75,
  AED: 0.27,
  NGN: 0.00067,
  BRL: 0.18,
  USD: 1.0,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const feedId = searchParams.get("feedId");
  const currency = (searchParams.get("currency") || "EUR").toUpperCase();
  const fallback = DEFAULT_FALLBACK_RATES[currency] || 1.0;

  if (!feedId) {
    return NextResponse.json({ rate: fallback, isLive: false, fallback: true }, { status: 200 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2800);

    const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${encodeURIComponent(feedId)}&parsed=true`, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
      next: { revalidate: 60 } // Next.js server cache for 60s
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const parsed = data?.parsed?.[0]?.price;
      if (parsed && typeof parsed.price === "string" && typeof parsed.expo === "number") {
        const rawPrice = parseFloat(parsed.price) * Math.pow(10, parsed.expo);
        const rate = currency === "JPY" && rawPrice > 50 ? 1 / rawPrice : rawPrice;
        return NextResponse.json({ rate, isLive: true }, { status: 200 });
      }
    }
  } catch {
    // Failover silently to benchmark rate so the demo never throws 502
  }

  // Graceful failover: always return status 200 with standard fallback rate
  return NextResponse.json({ rate: fallback, isLive: false, fallback: true }, { status: 200 });
}
