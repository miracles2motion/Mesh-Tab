import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (cents: number) => {
  const dollars = Math.abs(cents) / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const formatCompactCurrency = (cents: number) => {
  const dollars = Math.abs(cents) / 100;
  if (dollars >= 1_000_000_000) {
    return `$${(dollars / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}B`;
  }
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  }
  if (dollars >= 100_000) {
    return `$${(dollars / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  }
  return formatCurrency(cents);
};

export function formatDistanceToNow(timestamp?: number): string {
  if (!timestamp) return "Just now";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const CURRENCY_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.28,
  CAD: 0.73,
  AUD: 0.65,
  CHF: 1.14,
  SGD: 0.76,
  AED: 0.272,
  JPY: 0.0065,
  NGN: 0.00067,
};

/**
 * Dynamically formats foreign currency amounts for pills and detail modals.
 * Handles currencies like EUR, CAD, GBP, JPY, NGN, etc.
 * Supports both cents-stored values (e.g. 62675 -> 626.75) and unit-stored values (e.g. 550.00 -> 550.00).
 * If the saved originalAmount was accidentally stored as the USD converted amount, it accurately
 * reconstructs the true foreign currency amount using the Pyth mid-market rate.
 */
export function formatOriginalCurrency(
  currency?: string,
  originalAmount?: number,
  totalCents?: number
): string {
  const code = (currency || "USD").trim().toUpperCase();
  const rate = CURRENCY_USD_RATES[code] || 1.0;
  const usdAmount = typeof totalCents === "number" && totalCents > 0 ? totalCents / 100 : undefined;

  let val: number | undefined = originalAmount;

  // Case 1: No originalAmount provided at all
  if (val === undefined || val === null || isNaN(val) || val <= 0) {
    if (usdAmount !== undefined) {
      val = code !== "USD" && rate > 0 ? usdAmount / rate : usdAmount;
    } else {
      return code;
    }
  } else {
    // Case 2: originalAmount was accidentally saved as the USD amount (either in cents e.g. 62675 or dollars e.g. 626.75)
    // When code !== "USD", 626 EUR is NOT 626 USD. We convert the USD total back to the original currency using Pyth rate.
    if (code !== "USD" && usdAmount !== undefined && rate > 0) {
      const isExactlyUsdCents = totalCents !== undefined && Math.abs(val - totalCents) <= 1;
      const isExactlyUsdDollars = Math.abs(val - usdAmount) < 0.02;

      if (isExactlyUsdCents || isExactlyUsdDollars) {
        // Recover the exact foreign amount the user typed in the form
        val = usdAmount / rate;
      } else {
        // Check if val was stored in foreign cents (e.g. 55000 cents -> 550.00)
        if (Number.isInteger(val) && val >= 100) {
          const impliedRate = totalCents ? totalCents / val : 1.0;
          // If impliedRate is close to the expected exchange rate, val is in cents
          if (Math.abs(impliedRate - rate) < rate * 0.3) {
            val = val / 100;
          }
        }
      }
    } else if (Number.isInteger(val) && val >= 1000) {
      // Fallback if no USD comparison available
      val = val / 100;
    }
  }

  // Format with standard 2 decimal places (or 0 for JPY)
  const isZeroDecimal = code === "JPY";
  const formattedNum = val.toLocaleString("en-US", {
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  });

  return `${code} ${formattedNum}`;
}
