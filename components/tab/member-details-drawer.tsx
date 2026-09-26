"use client";

import { useMemo } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import { StoredExpense } from "../../lib/user";
import { Check, ArrowUpRight, ArrowDownLeft, Receipt, Crown, Clock, X, BellRing, Sparkles } from "lucide-react";
import { MonadLogo, AgoraLogo } from "../ui/partner-logo";

interface MemberDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    name: string;
    balance: number; // in cents
    type: "debtor" | "creditor" | "settled";
    role?: "admin" | "member";
  } | null;
  tabId: string;
  tabName: string;
  currentUserName?: string;
  expenses: StoredExpense[];
  onRequestPayment?: (debtorName: string, amount: number) => void;
  onSettleSelf?: () => void;
  memberCount: number;
}

export function MemberDetailsDrawer({
  isOpen,
  onClose,
  member,
  tabId,
  tabName,
  currentUserName,
  expenses,
  onRequestPayment,
  onSettleSelf,
  memberCount
}: MemberDetailsDrawerProps) {
  if (!member) return null;

  const isUser = (currentUserName || "").toLowerCase() === member.name.toLowerCase();
  const isSettled = member.balance === 0 || member.type === "settled";
  const isCreditor = member.balance > 0;
  const isDebtor = member.balance < 0;

  // Calculate total paid across all expenses
  const { totalPaidCents, memberExpenses } = useMemo(() => {
    let totalPaid = 0;
    const involved: { expense: StoredExpense; memberShare: number; isPayer: boolean }[] = [];

    expenses.forEach(exp => {
      const isPayer = exp.payer.toLowerCase() === member.name.toLowerCase();
      if (isPayer) {
        totalPaid += exp.amount;
      }

      // Check member's share
      let memberShare = 0;
      if (exp.splitType === "exact" && exp.splits) {
        memberShare = exp.splits[member.name] || 0;
      } else {
        // Equal split estimation
        const splitCount = exp.splits ? Object.keys(exp.splits).length : memberCount;
        memberShare = Math.round(exp.amount / Math.max(1, splitCount));
      }

      if (isPayer || memberShare > 0) {
        involved.push({
          expense: exp,
          memberShare,
          isPayer
        });
      }
    });

    return { totalPaidCents: totalPaid, memberExpenses: involved };
  }, [expenses, member.name]);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} size="full">
      <div className="p-6 md:p-8 flex flex-col w-full bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* LEFT COLUMN */}
          <div className="flex flex-col">
            {/* Member Profile Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-2xl flex items-center justify-center shrink-0 border border-indigo-500/20">
                {member.name[0] || "M"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isUser ? `${member.name} (You)` : member.name}
                  </h2>
                  {member.role === "admin" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5" /> Host
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                  Member of <span className="font-semibold text-slate-700 dark:text-white/70">{tabName}</span>
                </p>
              </div>
            </div>

            {/* Net Balance Highlight Card */}
            <div className={`p-5 rounded-3xl border mb-6 flex items-center justify-between shadow-sm ${
              isSettled
                ? "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                : isCreditor
                ? "bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-500/20"
                : "bg-rose-50/70 dark:bg-rose-500/10 border-rose-500/20"
            }`}>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-white/50 block">
                  Net Balance
                </span>
                <span className={`text-3xl font-extrabold tracking-tight tabular-nums ${
                  isSettled
                    ? "text-slate-700 dark:text-white/80"
                    : isCreditor
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {isSettled ? "$0.00" : formatCurrency(member.balance)}
                </span>
              </div>

              <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isSettled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : isCreditor
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
              }`}>
                {isSettled ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>All Settled</span>
                  </>
                ) : isCreditor ? (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Owed by Group</span>
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Owes Group</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 md:mb-0">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <span className="text-[11px] text-slate-400 dark:text-white/40 font-medium block">
                  Total Paid Out
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                  {formatCurrency(totalPaidCents)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <span className="text-[11px] text-slate-400 dark:text-white/40 font-medium block">
                  Expenses Involved
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                  {memberExpenses.length} items
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col h-full">
            {/* Itemized Expenses List */}
            <div className="space-y-3 mb-6 flex-1">
              <span className="text-xs font-bold text-slate-700 dark:text-white/70 block px-1">
                Activity for {member.name}
              </span>
              {memberExpenses.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-white/40 text-center py-4">
                  No individual expenses logged yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {memberExpenses.map(({ expense, memberShare, isPayer }) => (
                    <div
                      key={expense.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {expense.desc}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-white/40">
                          {isPayer ? "Paid the full bill" : "Shared expense"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {isPayer ? formatCurrency(expense.amount) : formatCurrency(memberShare)}
                        </span>
                        <span className={`text-[10px] font-semibold ${isPayer ? "text-emerald-600" : "text-slate-400"}`}>
                          {isPayer ? "Payer" : "Share"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-white/10 mt-auto">
              {isDebtor && !isUser && onRequestPayment && (
                <Button
                  onClick={() => {
                    onClose();
                    onRequestPayment(member.name, Math.abs(member.balance));
                  }}
                  variant="primary"
                  size="lg"
                  className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Request {formatCurrency(Math.abs(member.balance))} from {member.name}</span>
                </Button>
              )}

              {isDebtor && isUser && onSettleSelf && (
                <Button
                  onClick={() => {
                    onClose();
                    onSettleSelf();
                  }}
                  variant="primary"
                  size="lg"
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Settle My Balance ({formatCurrency(Math.abs(member.balance))})</span>
                </Button>
              )}

              <Button
                onClick={onClose}
                variant="secondary"
                size="md"
                className="w-full h-11 font-semibold cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Partner Branding Strip */}
        <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/10 w-full flex items-center justify-between text-[11px] text-slate-400 dark:text-white/40">
          <span>Real-time balance ledger</span>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-all text-slate-700 dark:text-white/80">
              <MonadLogo className="h-3 w-auto" />
              <span>×</span>
              <AgoraLogo className="h-3 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
