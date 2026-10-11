"use client";

import { safeSetItem } from "./storage-keys";

export interface ClaimRecord {
  id: string;
  txHash?: string;
  amount: number; // e.g. 10000 for $10,000.00
  currency: string; // e.g. "Agora AUSD"
  network: string; // "Monad Testnet"
  timestamp: number;
  walletAddress?: string;
  explorerUrl: string;
}

export function getClaimStorageKey(walletAddress?: string, mode: string = "testnet"): string {
  const cleanWallet = (walletAddress || "default").toLowerCase();
  return `meshtab:${mode}:claims:${cleanWallet}`;
}

export function getStoredClaimHistory(walletAddress?: string, mode: string = "testnet"): ClaimRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getClaimStorageKey(walletAddress, mode);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addClaimRecord(
  claim: {
    txHash?: string;
    amount: number;
    currency?: string;
    network?: string;
    timestamp?: number;
    walletAddress?: string;
    explorerUrl?: string;
  },
  mode: string = "testnet"
): ClaimRecord {
  const timestamp = claim.timestamp || Date.now();
  const txHash = claim.txHash;
  const explorerUrl = claim.explorerUrl || (
    txHash 
      ? `https://testnet.monadexplorer.com/tx/${txHash}` 
      : claim.walletAddress 
        ? `https://testnet.monadexplorer.com/address/${claim.walletAddress}`
        : "https://testnet.monadexplorer.com"
  );

  const newRecord: ClaimRecord = {
    id: txHash ? `claim-${txHash}` : `claim-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    txHash,
    amount: claim.amount,
    currency: claim.currency || "Agora AUSD",
    network: claim.network || (mode === "testnet" ? "Monad Testnet" : "Demo Sandbox"),
    timestamp,
    walletAddress: claim.walletAddress,
    explorerUrl
  };

  if (typeof window !== "undefined") {
    const key = getClaimStorageKey(claim.walletAddress, mode);
    const existing = getStoredClaimHistory(claim.walletAddress, mode);
    
    // Deduplicate by txHash or close timestamp
    const filtered = existing.filter(e => {
      if (txHash && e.txHash) return e.txHash.toLowerCase() !== txHash.toLowerCase();
      return Math.abs(e.timestamp - timestamp) > 2000;
    });

    const next = [newRecord, ...filtered];
    safeSetItem(key, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("meshtab:claims:updated", { detail: newRecord }));
  }

  return newRecord;
}
