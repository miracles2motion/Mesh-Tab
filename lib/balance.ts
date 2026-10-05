import { useState, useEffect } from "react";
import { getStoredTabs, getStoredTabMembers, getWorkspaceMode, useSettledPayoutBalance, getStoredExpenses, StoredExpense } from "./user";
import { useRealAusdBalance } from "./onchain";

export function computeCrossTabPosition(userName: string): { totalOwe: number, totalOwedToYou: number } {
  if (typeof window === "undefined" || !userName) return { totalOwe: 0, totalOwedToYou: 0 };
  
  const mode = getWorkspaceMode();
  let archived: string[] = [];
  try {
    const raw = localStorage.getItem("meshTab_archived");
    if (raw) archived = JSON.parse(raw);
  } catch {}

  const activeTabs = getStoredTabs().filter(t => !archived.includes(t.id));
  
  let totalOwe = 0;
  let totalOwedToYou = 0;
  
  for (const tab of activeTabs) {
    const members = getStoredTabMembers(tab.id, userName);
    const userMember = members.find(m => m.name.toLowerCase() === userName.toLowerCase());
    
    // Fallback to tab.balance if user not found, but it should be userMember.balance
    let bal = userMember !== undefined ? userMember.balance : tab.balance;
    
    // Pending local changes (rule #25)
    // We need to apply any pending expenses that haven't been synced to the server
    const pendingExpenses = getStoredExpenses(tab.id).filter(e => e.syncStatus === "pending");
    for (const exp of pendingExpenses) {
      if (exp.splitType === "equal") {
        const splitAmount = Math.round(exp.amount / (exp.participants?.length || 1));
        if (exp.payer.toLowerCase() === userName.toLowerCase()) {
          bal += (exp.amount - splitAmount);
        } else if (exp.participants?.some(p => p.toLowerCase() === userName.toLowerCase())) {
          bal -= splitAmount;
        }
      } else if (exp.splits) {
        // exact split
        const mySplit = exp.splits[userName] || 0;
        if (exp.payer.toLowerCase() === userName.toLowerCase()) {
          bal += (exp.amount - mySplit);
        } else {
          bal -= mySplit;
        }
      }
    }

    if (bal < 0) totalOwe += Math.abs(bal);
    if (bal > 0) totalOwedToYou += bal;
  }
  
  return { totalOwe, totalOwedToYou };
}

export function useAvailableBalance(currentUserName: string) {
  const mode = getWorkspaceMode();
  const onchain = useRealAusdBalance(mode);
  
  // existing local payout logic for sample/blank modes
  const { settledBalance } = useSettledPayoutBalance();

  const [crossTab, setCrossTab] = useState({ totalOwe: 0, totalOwedToYou: 0 });

  useEffect(() => {
    const update = () => setCrossTab(computeCrossTabPosition(currentUserName));
    update();
    window.addEventListener("meshTab-expenses-update", update);
    window.addEventListener("meshTab-tabs-update", update);
    window.addEventListener("meshTab-members-update", update);
    return () => {
      window.removeEventListener("meshTab-expenses-update", update);
      window.removeEventListener("meshTab-tabs-update", update);
      window.removeEventListener("meshTab-members-update", update);
    };
  }, [currentUserName]);

  let totalCents = 0;
  let isLoading = false;
  let isStale = false;
  let asOf = Date.now();

  if (mode === "testnet") {
    totalCents = onchain.cents;
    isLoading = onchain.isLoading;
    isStale = onchain.isStale;
    asOf = onchain.at;
  } else {
    totalCents = settledBalance; // from useSettledPayoutBalance
  }

  const heldCents = crossTab.totalOwe;
  const availableCents = Math.max(0, totalCents - heldCents);

  return {
    totalCents,
    heldCents,
    availableCents,
    isStale,
    asOf,
    isLoading,
    mode
  };
}
