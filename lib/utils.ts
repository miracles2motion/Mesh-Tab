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
