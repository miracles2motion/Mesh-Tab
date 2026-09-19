"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, BellRing, Bell } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";

interface RosterMember {
  name: string;
  balance: number; // in cents
  type: 'debtor' | 'creditor' | 'settled';
}

interface RosterCarouselProps {
  members: RosterMember[];
  grossVolume: number; // in cents
  currentUserName?: string;
}

export function RosterCarousel({ members, grossVolume, currentUserName }: RosterCarouselProps) {
  const [isAllPinged, setIsAllPinged] = useState(false);
  const [pingedSingle, setPingedSingle] = useState<Record<string, boolean>>({});

  // Filter members who still owe money (debtors who have not settled)
  const unsettledDebtors = members.filter(
    m => (m.balance ?? 0) < 0 && m.type !== "settled"
  );

  // If current user is logged in, prioritize pinging other debtors; if user is not in the debtor list, ping all debtors
  const otherUnsettledDebtors = unsettledDebtors.filter(
    m => m.name.toLowerCase() !== (currentUserName || "").toLowerCase()
  );

  const debtorsToPing = otherUnsettledDebtors.length > 0 ? otherUnsettledDebtors : unsettledDebtors;
  const totalUnsettledAmount = debtorsToPing.reduce((sum, d) => sum + Math.abs(d.balance ?? 0), 0);

  const handlePingAll = () => {
    if (debtorsToPing.length === 0 || isAllPinged) return;
    
    sounds.playPing();
    setIsAllPinged(true);

    const namesList = debtorsToPing.map(d => d.name).join(debtorsToPing.length === 2 ? " & " : ", ");
    toast.success(`Ping Sent to ${namesList}!`, {
      description: `Payment notification dispatched to settle outstanding ${formatCurrency(totalUnsettledAmount)}.`
    });

    setTimeout(() => {
      setIsAllPinged(false);
    }, 2800);
  };

  const handlePingSingle = (name: string, amount: number) => {
    sounds.playPing();
    setPingedSingle(prev => ({ ...prev, [name]: true }));

    toast.success(`Pinged ${name}!`, {
      description: `Reminder sent to settle ${formatCurrency(Math.abs(amount))}.`
    });

    setTimeout(() => {
      setPingedSingle(prev => ({ ...prev, [name]: false }));
    }, 2800);
  };

  return (
    <div className="space-y-4">
      {/* Group Roster Header Row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white/80">Group Roster</h3>

          {/* Ping Button: Available ONLY when a debt is not yet settled by one or more members */}
          {debtorsToPing.length > 0 ? (
            <button
              onClick={handlePingAll}
              disabled={isAllPinged}
              className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isAllPinged
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:scale-105 active:scale-95"
              }`}
              title={`Send payment ping to ${debtorsToPing.map(d => d.name).join(", ")}`}
            >
              {isAllPinged ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Pinged!</span>
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5 animate-pulse" />
                  <span>
                    Ping {debtorsToPing.length > 1 ? `Unsettled (${debtorsToPing.length})` : debtorsToPing[0].name}
                  </span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[2.5]" /> All Settled
            </span>
          )}
        </div>

        <span className="text-xs text-slate-500 dark:text-white/40 font-mono">Gross Vol: {formatCurrency(grossVolume)}</span>
      </div>
      
      {/* Roster Cards Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
        {members.map((member, i) => {
          const isSettled = member.balance === 0 || member.type === 'settled';
          const isCreditor = member.type === 'creditor';

          return (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={member.name}
              className="flex-shrink-0 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 w-[140px] flex flex-col justify-between h-[100px] shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="font-semibold text-slate-900 dark:text-white/90 text-sm truncate max-w-[80px]">{member.name}</span>
                {isSettled ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0" title="Settled ($0.00)">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  </div>
                ) : isCreditor ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0" title="Creditor (Paid for group)">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePingSingle(member.name, member.balance);
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                      pingedSingle[member.name]
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    }`}
                    title={`Ping ${member.name} to settle ${formatCurrency(member.balance)}`}
                  >
                    {pingedSingle[member.name] ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
              <div className={`text-xl font-bold tracking-tight tabular-nums ${isSettled ? 'text-emerald-600 dark:text-emerald-400 text-base' : isCreditor ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isSettled ? "Settled" : formatCurrency(member.balance)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
