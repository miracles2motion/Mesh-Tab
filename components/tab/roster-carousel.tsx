"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "../../lib/utils";

interface RosterMember {
  name: string;
  balance: number; // in cents
  type: 'debtor' | 'creditor' | 'settled';
}

interface RosterCarouselProps {
  members: RosterMember[];
  grossVolume: number; // in cents
}

export function RosterCarousel({ members, grossVolume }: RosterCarouselProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white/80">Group Roster</h3>
        <span className="text-xs text-slate-500 dark:text-white/40 font-mono">Gross Vol: {formatCurrency(grossVolume)}</span>
      </div>
      
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
                  <div className="bg-emerald-500/10 p-1 rounded-full">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓</span>
                  </div>
                ) : isCreditor ? (
                  <div className="bg-emerald-500/10 p-1 rounded-full">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : (
                  <div className="bg-rose-500/10 p-1 rounded-full">
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  </div>
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
