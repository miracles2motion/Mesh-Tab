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
