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
    const allRecords: ClaimRecord[] = [];
    const prefix = `meshtab:${mode}:claims:`;

    // 1. Scan all local storage keys for this mode's claims
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              allRecords.push(...parsed);
            }
          }
        } catch {}
      }
    }

    // 2. Deduplicate by txHash or close timestamp + amount
    const seenTx = new Set<string>();
    const deduplicated: ClaimRecord[] = [];

    for (const record of allRecords) {
      if (!record || typeof record.amount !== "number") continue;
      
      const txKey = record.txHash ? record.txHash.toLowerCase() : null;
      if (txKey) {
        if (seenTx.has(txKey)) continue;
        seenTx.add(txKey);
      } else {
        const timeKey = `${Math.floor(record.timestamp / 5000)}_${record.amount}`;
        if (seenTx.has(timeKey)) continue;
        seenTx.add(timeKey);
      }

      // Ensure explorerUrl points to MonadVision tx
      if (record.txHash && (!record.explorerUrl || !record.explorerUrl.includes("/tx/"))) {
        record.explorerUrl = `https://testnet.monadvision.com/tx/${record.txHash}`;
      }

      deduplicated.push(record);
    }

    // 3. Sort newest first
    deduplicated.sort((a, b) => b.timestamp - a.timestamp);
    return deduplicated;
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
      ? `https://testnet.monadvision.com/tx/${txHash}` 
      : mode === "testnet"
        ? "https://testnet.monadvision.com/address/0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C"
        : "https://testnet.monadvision.com"
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
    const defaultKey = `meshtab:${mode}:claims:default`;
    const existing = getStoredClaimHistory(claim.walletAddress, mode);
    
    // Deduplicate by txHash or close timestamp
    const filtered = existing.filter(e => {
      if (txHash && e.txHash) return e.txHash.toLowerCase() !== txHash.toLowerCase();
      return Math.abs(e.timestamp - timestamp) > 2000;
    });

    const next = [newRecord, ...filtered];
    safeSetItem(key, JSON.stringify(next));
    if (key !== defaultKey) {
      safeSetItem(defaultKey, JSON.stringify(next));
    }
    window.dispatchEvent(new CustomEvent("meshtab:claims:updated", { detail: newRecord }));
  }

  return newRecord;
}
