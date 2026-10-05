"use client";

import { storageKey, safeSetItem, WorkspaceMode } from "./storage-keys";
import { addSettledPayout, topUpVirtualBalance, saveStoredExpense, getWorkspaceMode } from "./user";

export interface EarnSettings {
  enabled: boolean;
  apy: number; // e.g. 0.048 for 4.8%
  lastAccruedAt: number; // epoch ms
  accruedCents: number; // historical unharvested cents
  totalHarvestedCents: number;
  vaultName: string;
}

const DEFAULT_EARN_SETTINGS: EarnSettings = {
  enabled: true,
  apy: 0.048, // 4.8% APY
  lastAccruedAt: Date.now() - 86400000 * 2, // simulated 2 days of idle accrual
  accruedCents: 185, // starts with $1.85 accrued on the Lisbon benchmark
  totalHarvestedCents: 0,
  vaultName: "Privy Earn Agora Vault",
};

export function getEarnSettings(mode: WorkspaceMode): EarnSettings {
  if (typeof window === "undefined") return DEFAULT_EARN_SETTINGS;

  const key = storageKey("earnSettings", mode);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.apy === "number") {
        return parsed;
      }
    }
  } catch (e) {}

  safeSetItem(key, JSON.stringify(DEFAULT_EARN_SETTINGS));
  return DEFAULT_EARN_SETTINGS;
}

export function saveEarnSettings(mode: WorkspaceMode, settings: EarnSettings): void {
  if (typeof window === "undefined") return;
  const key = storageKey("earnSettings", mode);
  safeSetItem(key, JSON.stringify(settings));
  window.dispatchEvent(new Event("meshTab-earn-update"));
}

/**
 * Pure in-memory calculation of live yield (prevents localStorage I/O thrashing)
 * Formula: Idle Cents * APY * (elapsed ms / (365 * 24 * 3600 * 1000))
 */
export function calculateLiveYield(idleCents: number, settings: EarnSettings, now = Date.now()): {
  totalYieldCents: number;
  unharvestedCents: number;
  displayYieldUsd: string;
} {
  if (!settings.enabled || idleCents <= 0) {
    const total = settings.accruedCents;
    return {
      totalYieldCents: total,
      unharvestedCents: total,
      displayYieldUsd: (total / 100).toFixed(4),
    };
  }

  const elapsedMs = Math.max(0, now - settings.lastAccruedAt);
  const msInYear = 365 * 24 * 3600 * 1000;
  const accruedSinceCheckpoint = (idleCents * settings.apy * elapsedMs) / msInYear;
  
  const rawTotalCents = settings.accruedCents + accruedSinceCheckpoint;
  const integerCents = Math.floor(rawTotalCents);

  return {
    totalYieldCents: integerCents,
    unharvestedCents: integerCents,
    displayYieldUsd: (rawTotalCents / 100).toFixed(4),
  };
}

export function toggleEarnEnabled(mode: WorkspaceMode): boolean {
  const settings = getEarnSettings(mode);
  settings.enabled = !settings.enabled;
  settings.lastAccruedAt = Date.now();
  saveEarnSettings(mode, settings);
  return settings.enabled;
}

export function harvestEarnYield(
  tabId: string,
  mode: WorkspaceMode,
  idleCents: number
): { success: boolean; harvestedCents: number } {
  const settings = getEarnSettings(mode);
  const live = calculateLiveYield(idleCents, settings);
  const toHarvest = live.totalYieldCents;

  if (toHarvest <= 0) {
    return { success: false, harvestedCents: 0 };
  }

  // 1. Credit the harvested funds symmetrically to settled payout & virtual reserves
  addSettledPayout(toHarvest);
  topUpVirtualBalance(toHarvest);

  // 2. Reset checkpoint
  settings.accruedCents = 0;
  settings.lastAccruedAt = Date.now();
  settings.totalHarvestedCents += toHarvest;
  saveEarnSettings(mode, settings);

  return {
    success: true,
    harvestedCents: toHarvest,
  };
}
