"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Scale, ArrowRight, Sparkles, UserCircle } from "lucide-react";
import { formatCurrency } from "../../lib/utils";

interface MemberSummary {
  name: string;
  balance: number;
  type: "creditor" | "debtor" | "settled";
}

interface ExpenseItem {
  id: string;
  payer: string;
  amount: number;
  desc: string;
}

interface SmartRebalancerProps {
  members: MemberSummary[];
  expenses: ExpenseItem[];
  currentUserName: string;
}

/** Returns a suggestion for the next payer based on rebalancing logic */
function computeRebalanceSuggestion(
  members: MemberSummary[],
  expenses: ExpenseItem[]
): { suggestedPayer: string; reason: string; nextBestPayer: string | null } | null {
  if (members.length < 2) return null;

  // Filter out settlements from expense count
  const groupExpenses = expenses.filter(e => !e.id.startsWith("settle-") && !e.desc.toLowerCase().includes("settled"));

  // Count how many times each member paid
  const payerCounts: Record<string, number> = {};
  members.forEach(m => { payerCounts[m.name] = 0; });
  groupExpenses.forEach(e => {
    if (payerCounts[e.payer] !== undefined) {
      payerCounts[e.payer]++;
    }
  });

  // Primary signal: highest debtor (most negative balance) should pay next to rebalance
  const debtors = members
    .filter(m => m.balance < 0)
    .sort((a, b) => a.balance - b.balance); // most negative first

  if (debtors.length === 0) {
    // Everyone is settled or creditor — suggest fairness by payment count
    const leastActive = members
      .filter(m => m.name !== "")
      .sort((a, b) => (payerCounts[a.name] || 0) - (payerCounts[b.name] || 0));
    
    if (leastActive.length > 0) {
      return {
        suggestedPayer: leastActive[0].name,
        reason: `${leastActive[0].name} has paid for the fewest expenses (${payerCounts[leastActive[0].name] || 0}). Covering the next one keeps things fair.`,
        nextBestPayer: leastActive.length > 1 ? leastActive[1].name : null
      };
    }
    return null;
  }

  const topDebtor = debtors[0];
  const secondDebtor = debtors.length > 1 ? debtors[1] : null;

  return {
    suggestedPayer: topDebtor.name,
    reason: `${topDebtor.name} currently owes ${formatCurrency(Math.abs(topDebtor.balance))}. Covering the next expense helps rebalance the group.`,
    nextBestPayer: secondDebtor ? secondDebtor.name : null
  };
}

export function SmartRebalancer({ members, expenses, currentUserName }: SmartRebalancerProps) {
  const suggestion = useMemo(
    () => computeRebalanceSuggestion(members, expenses),
    [members, expenses]
  );

  if (!suggestion || members.length < 2) return null;

  const isCurrentUser = suggestion.suggestedPayer.toLowerCase() === currentUserName.toLowerCase();
  const displayName = isCurrentUser ? "You" : suggestion.suggestedPayer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-500/8 dark:via-white/3 dark:to-purple-500/5 p-5 relative overflow-hidden"
    >
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center">
          <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          Who Should Pay Next?
          <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
        </h3>
      </div>

      {/* Suggestion card */}
      <div className="relative z-10 flex items-center gap-3 bg-white dark:bg-white/5 rounded-xl p-3.5 border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 ${
          isCurrentUser ? "bg-indigo-600" : "bg-purple-600"
        }`}>
          {suggestion.suggestedPayer[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {displayName}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
              Next payer
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed">
            {suggestion.reason}
          </p>
        </div>
      </div>

      {/* Runner-up */}
      {suggestion.nextBestPayer && (
        <div className="mt-2.5 flex items-center gap-2 px-1 relative z-10">
          <UserCircle className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
          <span className="text-[11px] text-slate-400 dark:text-white/40">
            Runner-up: <span className="font-semibold text-slate-500 dark:text-white/50">{suggestion.nextBestPayer}</span>
          </span>
        </div>
      )}
    </motion.div>
  );
}
