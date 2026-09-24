"use client";

import { useState, useEffect } from "react";

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  fallbackRate: number; // Fallback units of USD per 1 unit of foreign currency
  pythFeedId?: string; // Official Pyth Price Feed ID (Hex)
}

/**
 * 10 Curated Major Global Travel & Hub Currencies for MeshTab
 * Base: USD (1 AUSD = $1.00 USD)
 */
export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    flag: "🇺🇸",
    fallbackRate: 1.0,
  },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    flag: "🇪🇺",
    fallbackRate: 1.09,
    pythFeedId: "a995d6480b85a305ee8d58c18f3a3f5f3e9d89280d90d8a5770c0c66dbb7654a", // EUR/USD
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    flag: "🇬🇧",
    fallbackRate: 1.28,
    pythFeedId: "84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1", // GBP/USD
  },
  {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    flag: "🇯🇵",
    fallbackRate: 0.0065, // ~153 JPY per USD
    pythFeedId: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", // USD/JPY
  },
  {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    flag: "🇨🇦",
    fallbackRate: 0.73,
    pythFeedId: "160756e01a88b57b5fb95d5eeec5b8495a81e9f16ef06f6580f4f780824b2382", // CAD/USD
  },
  {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    flag: "🇦🇺",
    fallbackRate: 0.65,
    pythFeedId: "65103a45dfc0ee10ad9b2e2d09ff9e69315eb0c5040ff42dbd8d3f18b3ebaa95", // AUD/USD
  },
  {
    code: "CHF",
    symbol: "CHF",
    name: "Swiss Franc",
    flag: "🇨🇭",
    fallbackRate: 1.14,
    pythFeedId: "87a2a4ee60a6a42203e911244099557451965f7c32729a8a7db30aa8ef53d4eb", // CHF/USD
  },
  {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    flag: "🇸🇬",
    fallbackRate: 0.76,
  },
  {
    code: "AED",
    symbol: "AED",
    name: "UAE Dirham",
    flag: "🇦🇪",
    fallbackRate: 0.272, // 3.67 AED = 1 USD
  },
  {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    flag: "🇳🇬",
    fallbackRate: 0.00067, // ~1,490 NGN = 1 USD
  },
];

// In-memory cache for live Pyth rates (TTL: 60 seconds)
const CACHE_TTL_MS = 60 * 1000;
const memoryCache: Record<string, { rate: number; timestamp: number }> = {};

/**
 * Fetch live rate from Pyth Hermes API with timeout and cached fallback
 */
export async function getLivePythRate(currencyCode: string): Promise<{ rate: number; isLive: boolean }> {
  const config = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  if (!config || config.code === "USD") {
    return { rate: 1.0, isLive: true };
  }

  // Check cache
  const cached = memoryCache[currencyCode];
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return { rate: cached.rate, isLive: true };
  }

  // If no Pyth feed ID is registered, use configured benchmark rate
  if (!config.pythFeedId) {
    return { rate: config.fallbackRate, isLive: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s safe timeout

    const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${config.pythFeedId}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Pyth Hermes responded with status ${response.status}`);
    }

    const data = await response.json();
    const parsed = data?.parsed?.[0]?.price;
    if (parsed && typeof parsed.price === "string" && typeof parsed.expo === "number") {
      const rawPrice = parseFloat(parsed.price) * Math.pow(10, parsed.expo);
      
      // Invert USD/JPY to get JPY/USD rate if needed
      const rate = config.code === "JPY" && rawPrice > 50 ? 1 / rawPrice : rawPrice;

      // Update cache
      memoryCache[currencyCode] = { rate, timestamp: now };
      return { rate, isLive: true };
    }
  } catch (err) {
    // Fail silently to cached fallback so demo never breaks
  }

  return { rate: cached ? cached.rate : config.fallbackRate, isLive: false };
}

/**
 * Reactive hook to get the active rate for a currency
 */
export function usePythRate(currencyCode: string) {
  const config = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  const [rate, setRate] = useState<number>(config.fallbackRate);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (currencyCode === "USD") {
      setRate(1.0);
      setIsLive(true);
      return;
    }

    setIsLoading(true);
    getLivePythRate(currencyCode).then((res) => {
      if (isMounted) {
        setRate(res.rate);
        setIsLive(res.isLive);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currencyCode]);

  return { rate, isLive, isLoading, config };
}
