"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, BellRing, Bell, Crown } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";

interface RosterMember {
  name: string;
  balance: number; // in cents
  type: 'debtor' | 'creditor' | 'settled';
  role?: 'admin' | 'member';
}

interface RosterCarouselProps {
  members: RosterMember[];
  grossVolume: number; // in cents
  currentUserName?: string;
  creatorName?: string;
  isLoading?: boolean;
  onSelectMember?: (member: RosterMember) => void;
  onRequestPayment?: (debtorName: string, amount: number) => void;
}

export function RosterCarousel({ 
  members, 
  grossVolume, 
  currentUserName, 
  creatorName,
  isLoading = false,
  onSelectMember,
  onRequestPayment
}: RosterCarouselProps) {
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white/80 flex items-center gap-2">
            Group Roster
            {isLoading ? (
              <span className="w-24 h-5 rounded-md bg-slate-200 dark:bg-white/10 animate-pulse shrink-0 inline-block" />
            ) : (
              <span className="text-xs text-slate-500 dark:text-white/40 font-mono font-normal bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">Gross Vol: {formatCurrency(grossVolume)}</span>
            )}
          </h3>

          {/* Ping Button / Status Pill */}
          {isLoading ? (
            <span className="w-20 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse shrink-0 inline-block" />
          ) : debtorsToPing.length > 0 ? (
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
      </div>
      
      {/* Roster Cards Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
        {isLoading ? (
          [1, 2].map((idx) => (
            <div
              key={idx}
              className="flex-shrink-0 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200/70 dark:border-white/10 rounded-2xl p-3.5 w-[150px] flex flex-col justify-between h-[112px] animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="w-16 h-3.5 bg-slate-200 dark:bg-white/10 rounded" />
                  <div className="w-8 h-3 bg-slate-200 dark:bg-white/10 rounded" />
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10" />
              </div>
              <div className="w-20 h-5 bg-slate-200 dark:bg-white/10 rounded" />
            </div>
          ))
        ) : (
          members.map((member, i) => {
            const isSettled = member.balance === 0 || member.type === 'settled';
            const isCreditor = member.type === 'creditor';
            const isUser = member.name.toLowerCase() === (currentUserName || "").toLowerCase();
            const isCreator = member.role === "admin" || (creatorName ? member.name.toLowerCase() === creatorName.toLowerCase() : false);

            return (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={member.name}
                onClick={() => {
                  sounds.playClick();
                  onSelectMember?.(member);
                }}
                className={`flex-shrink-0 bg-white dark:bg-white/5 backdrop-blur-md border rounded-2xl p-3.5 w-[150px] flex flex-col justify-between h-[112px] shadow-sm relative transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  isUser 
                    ? "border-indigo-400/60 dark:border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-500/[0.06] ring-1 ring-indigo-500/20 shadow-indigo-500/5" 
                    : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-bold text-sm truncate max-w-[84px] ${isUser ? "text-indigo-950 dark:text-white" : "text-slate-900 dark:text-white/90"}`}>
                      {member.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isUser && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                        You
                      </span>
                    )}
                    {isCreator && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0 flex items-center gap-0.5" title="Tab Creator / Host">
                        <Crown className="w-2.5 h-2.5" /> Host
                      </span>
                    )}
                  </div>
                </div>

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
                      if (onRequestPayment) {
                        onRequestPayment(member.name, Math.abs(member.balance));
                      } else {
                        handlePingSingle(member.name, member.balance);
                      }
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                      pingedSingle[member.name]
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    }`}
                    title={`Request payment from ${member.name} (${formatCurrency(member.balance)})`}
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
        })
      )}
      </div>
    </div>
  );
}
