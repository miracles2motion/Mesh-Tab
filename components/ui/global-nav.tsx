"use client";

import Link from "next/link";
import { ThemeToggle } from "../theme-toggle";
import { Settings } from "lucide-react";
import { useUserProfile } from "../../lib/user";
import { useAvailableBalance } from "../../lib/balance";
import { useEffect, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { CashOutDrawer } from "../tab/cash-out-drawer";
import { sounds } from "../../lib/sounds";
import { formatCurrency } from "../../lib/utils";

export function GlobalNav() {
  const profile = useUserProfile();
  const { totalCents: settledBalance, availableCents: withdrawableAmount, heldCents: totalOutstandingDebt } = useAvailableBalance(profile.name || "David");
  const [mounted, setMounted] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  
  useEffect(() => setMounted(true), []);

  const currentUserName = mounted ? profile.name : "David";
  const avatarColor = mounted ? profile.avatarColor : "bg-indigo-600";

  return (
    <div className="w-full border-b border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/home" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/brand/logo/logo-light.svg" alt="MeshTab Logo" className="h-[22px] w-auto dark:hidden" />
            <img src="/brand/logo/logo-dark.svg" alt="MeshTab Logo" className="h-[22px] w-auto hidden dark:block" />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {mounted && settledBalance > 0 && withdrawableAmount > 0 && (
            <>
              <button 
                onClick={() => {
                  sounds.playClick();
                  setShowCashOutModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer mr-1"
                title={`Withdraw ${formatCurrency(withdrawableAmount)} settled funds`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> 
                <span className="hidden sm:inline">Withdraw </span>
                {formatCurrency(withdrawableAmount)}
              </button>
              <CashOutDrawer 
                isOpen={showCashOutModal}
                onClose={() => setShowCashOutModal(false)}
              />
            </>
          )}

          {mounted && settledBalance > 0 && withdrawableAmount === 0 && (
            <button 
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 text-[11px] sm:text-xs font-bold cursor-not-allowed mr-1 border border-slate-200 dark:border-white/5"
              title={`Cannot withdraw ${formatCurrency(settledBalance)} while you have ${formatCurrency(totalOutstandingDebt)} in outstanding debt across other tabs.`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5 opacity-50" /> 
              <span className="hidden sm:inline">Locked </span>
              {formatCurrency(settledBalance)}
            </button>
          )}


          <ThemeToggle />
          
          <Link 
            href="/settings"
            className="p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-colors shadow-sm"
            title="Global Settings"
            aria-label="Global Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          
          <Link 
            href="/settings"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-transform`}
            title={`Profile (${currentUserName})`}
          >
            {currentUserName ? currentUserName[0].toUpperCase() : "U"}
          </Link>
        </div>
      </div>
    </div>
  );
}
