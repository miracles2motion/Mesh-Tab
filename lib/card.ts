"use client";

import { storageKey, safeSetItem, WorkspaceMode } from "./storage-keys";
import { 
  getStoredUser, 
  DEFAULT_USER_NAME, 
  getSettledPayoutBalance, 
  deductCashBalance, 
  saveStoredExpense, 
  getWorkspaceMode,
  getTotalOutstandingDebt,
  getWithdrawableAmount
} from "./user";

export interface VirtualCard {
  id: string;
  cardNumber: string; // "4242 •••• •••• 9812"
  fullNumber: string; // "4242 8419 2039 9812"
  cardholderName: string;
  expDate: string; // "08/29"
  cvv: string; // "834"
  isIssued: boolean;
  issuedAt?: number;
  isFrozen: boolean;
  dailyLimitCents: number; // in cents, -1 = unlimited
  spentTodayCents: number;
  lastSpendAt?: number;
  brand: "visa";
}

const DEFAULT_CARD: Omit<VirtualCard, "cardholderName"> = {
  id: "card-primary",
  cardNumber: "4242 •••• •••• 9812",
  fullNumber: "4242 8921 4018 9812",
  expDate: "08/29",
  cvv: "834",
  isIssued: false,
  isFrozen: false,
  dailyLimitCents: -1, // Unlimited by default
  spentTodayCents: 0,
  brand: "visa",
};

export function getVirtualCard(mode: WorkspaceMode, customName?: string): VirtualCard {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_CARD,
      cardholderName: customName || DEFAULT_USER_NAME,
    };
  }

  const key = storageKey("virtualCard", mode);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.cardNumber) {
        return parsed;
      }
    }
  } catch (e) {}

  const activeName = customName || getStoredUser().name || DEFAULT_USER_NAME;
  const initialCard: VirtualCard = {
    ...DEFAULT_CARD,
    cardholderName: activeName.toUpperCase(),
  };

  safeSetItem(key, JSON.stringify(initialCard));
  return initialCard;
}

export function saveVirtualCard(mode: WorkspaceMode, card: VirtualCard): void {
  if (typeof window === "undefined") return;
  const key = storageKey("virtualCard", mode);
  safeSetItem(key, JSON.stringify(card));
  window.dispatchEvent(new Event("meshTab-card-update"));
}

export function issueVirtualCard(
  mode: WorkspaceMode,
  params?: { cardholderName?: string; dailyLimitCents?: number }
): VirtualCard {
  const current = getVirtualCard(mode, params?.cardholderName);
  const activeName = (params?.cardholderName || current.cardholderName || getStoredUser().name || DEFAULT_USER_NAME).toUpperCase();
  const issuedCard: VirtualCard = {
    ...current,
    cardholderName: activeName,
    dailyLimitCents: params?.dailyLimitCents !== undefined ? params.dailyLimitCents : -1,
    isIssued: true,
    issuedAt: Date.now(),
  };
  saveVirtualCard(mode, issuedCard);
  return issuedCard;
}

export function resetVirtualCard(mode: WorkspaceMode): void {
  if (typeof window === "undefined") return;
  const key = storageKey("virtualCard", mode);
  localStorage.removeItem(key);
  window.dispatchEvent(new Event("meshTab-card-update"));
}

export function toggleCardFreeze(mode: WorkspaceMode): boolean {
  const card = getVirtualCard(mode);
  card.isFrozen = !card.isFrozen;
  saveVirtualCard(mode, card);
  return card.isFrozen;
}

export function updateCardLimit(mode: WorkspaceMode, limitCents: number): void {
  const card = getVirtualCard(mode);
  card.dailyLimitCents = limitCents;
  saveVirtualCard(mode, card);
}

export interface CardPaymentParams {
  tabId: string;
  tabName?: string;
  amountCents: number;
  merchantName: string;
  payerName: string;
  mode: WorkspaceMode;
  onchainTransfer?: () => Promise<string>; // optional onchain transfer function in testnet
}

export interface CardPaymentResult {
  success: boolean;
  error?: string;
  expenseId?: string;
  txHash?: string;
}

export async function executeCardPayment({
  tabId,
  tabName,
  amountCents,
  merchantName,
  payerName,
  mode,
  onchainTransfer
}: CardPaymentParams): Promise<CardPaymentResult> {
  const card = getVirtualCard(mode, payerName);

  // 1. Guard against unissued card
  if (!card.isIssued) {
    return {
      success: false,
      error: "Your personal virtual card has not been issued yet. Please activate it first.",
    };
  }

  // 2. Guard against frozen card
  if (card.isFrozen) {
    return {
      success: false,
      error: "This card is frozen. Unfreeze it in card settings to authorize transactions.",
    };
  }

  // 3. Daily spending limit check (only if not unlimited)
  if (card.dailyLimitCents > 0 && card.spentTodayCents + amountCents > card.dailyLimitCents) {
    return {
      success: false,
      error: `Transaction exceeds your daily limit of $${(card.dailyLimitCents / 100).toFixed(2)}.`,
    };
  }

  // 3. Balance verification and deduction
  if (mode !== "testnet") {
    // Demo Mode (Sample & Blank): Symmetrical dual-balance deduction
    const currentBalance = getSettledPayoutBalance();
    const totalDebt = getTotalOutstandingDebt(payerName);
    const availableSpendable = getWithdrawableAmount(currentBalance, totalDebt);

    if (availableSpendable < amountCents) {
      return {
        success: false,
        error: `Insufficient available card balance ($${(availableSpendable / 100).toFixed(2)} available). Funds are reserved for outstanding tab debts.`,
      };
    }

    const deducted = deductCashBalance(amountCents);
    if (!deducted) {
      return {
        success: false,
        error: "Could not deduct payment from available cash reserves.",
      };
    }
  } else {
    // Testnet Mode: Execute on-chain transfer to MeshTabLedger if provided
    let txHash: string | undefined;
    if (onchainTransfer) {
      try {
        txHash = await onchainTransfer();
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || "Failed to execute on-chain card clearing transaction.",
        };
      }
    }
  }

  // 4. Record expense in the active tab (triggers equal split & debt netting)
  const expenseId = `card-${Date.now()}`;
  saveStoredExpense(tabId, {
    id: expenseId,
    payer: payerName,
    amount: amountCents,
    desc: `${merchantName} (Visa Card)`,
    category: "dining",
    splitType: "equal",
    createdAt: Date.now(),
  });

  // 5. Update card's daily spend tracker
  card.spentTodayCents += amountCents;
  card.lastSpendAt = Date.now();
  saveVirtualCard(mode, card);

  return {
    success: true,
    expenseId,
  };
}
