"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { ExpenseCategory } from "../../lib/user";

interface ExpenseItem {
  id: string;
  payer: string;
  amount: number;
  desc: string;
  time?: string;
  category?: ExpenseCategory;
}

interface CategoryAnalyticsProps {
  expenses: ExpenseItem[];
  currentUserName: string;
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { icon: string; label: string; color: string; bgLight: string; bgDark: string }> = {
  dining:     { icon: "🍽️", label: "Dining",    color: "#f97316", bgLight: "bg-orange-50",  bgDark: "dark:bg-orange-500/10" },
  stay:       { icon: "🏨", label: "Stay",      color: "#6366f1", bgLight: "bg-indigo-50",  bgDark: "dark:bg-indigo-500/10" },
  transit:    { icon: "🚕", label: "Rides",     color: "#06b6d4", bgLight: "bg-cyan-50",    bgDark: "dark:bg-cyan-500/10" },
  activities: { icon: "🎟️", label: "Events",    color: "#a855f7", bgLight: "bg-purple-50",  bgDark: "dark:bg-purple-500/10" },
  groceries:  { icon: "🛒", label: "Supplies",  color: "#22c55e", bgLight: "bg-emerald-50", bgDark: "dark:bg-emerald-500/10" },
  other:      { icon: "⚡", label: "Other",     color: "#64748b", bgLight: "bg-slate-50",   bgDark: "dark:bg-slate-500/10" },
};

function inferCategory(desc: string): ExpenseCategory {
  const lower = desc.toLowerCase();
  if (lower.includes("villa") || lower.includes("hotel") || lower.includes("airbnb") || lower.includes("stay") || lower.includes("room")) return "stay";
  if (lower.includes("dinner") || lower.includes("food") || lower.includes("wine") || lower.includes("coffee") || lower.includes("cafe") || lower.includes("lunch") || lower.includes("meal") || lower.includes("pizza") || lower.includes("seafood")) return "dining";
  if (lower.includes("taxi") || lower.includes("uber") || lower.includes("cab") || lower.includes("van") || lower.includes("flight") || lower.includes("gas") || lower.includes("transfer")) return "transit";
  if (lower.includes("excursion") || lower.includes("event") || lower.includes("ticket") || lower.includes("tour") || lower.includes("party") || lower.includes("show")) return "activities";
  if (lower.includes("grocery") || lower.includes("market") || lower.includes("supplies") || lower.includes("store") || lower.includes("provisions")) return "groceries";
  return "other";
}

export function CategoryAnalytics({ expenses, currentUserName }: CategoryAnalyticsProps) {
  const [expanded, setExpanded] = useState(true);

  // Filter out settlements and compute per-category totals
  const analytics = useMemo(() => {
    const groupExpenses = expenses.filter(e => !e.id.startsWith("settle-") && !e.desc.toLowerCase().includes("settled") && !e.desc.toLowerCase().includes("cleared"));
    const totals: Record<ExpenseCategory, number> = {
      dining: 0, stay: 0, transit: 0, activities: 0, groceries: 0, other: 0
    };
    
    groupExpenses.forEach(exp => {
      const cat = exp.category || inferCategory(exp.desc);
      totals[cat] += exp.amount;
    });

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    
    // Sort categories by amount descending, filter out zeros
    const sorted = (Object.entries(totals) as [ExpenseCategory, number][])
      .filter(([, amt]) => amt > 0)
      .sort(([, a], [, b]) => b - a);

    // Find biggest spender
    const payerTotals: Record<string, number> = {};
    groupExpenses.forEach(exp => {
      payerTotals[exp.payer] = (payerTotals[exp.payer] || 0) + exp.amount;
    });
    const topSpender = Object.entries(payerTotals).sort(([,a],[,b]) => b - a)[0];

    return { totals, grandTotal, sorted, topSpender, expenseCount: groupExpenses.length };
  }, [expenses]);

  if (analytics.expenseCount === 0) {
    return null; // Don't render if no expenses yet
  }

  // SVG donut chart computation
  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let cumulativeOffset = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Spending Breakdown</h3>
            <p className="text-[11px] text-slate-500 dark:text-white/50">
              {analytics.expenseCount} expense{analytics.expenseCount !== 1 ? "s" : ""} • {formatCurrency(analytics.grandTotal)} total
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {/* Donut + Summary Row */}
              <div className="flex items-center gap-5 mb-5">
                {/* SVG Donut */}
                <div className="relative w-[108px] h-[108px] shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {analytics.sorted.map(([cat, amt]) => {
                      const percentage = amt / analytics.grandTotal;
                      const dashLength = percentage * donutCircumference;
                      const gapLength = donutCircumference - dashLength;
                      const offset = cumulativeOffset;
                      cumulativeOffset += dashLength;

                      return (
                        <motion.circle
                          key={cat}
                          cx="50" cy="50" r={donutRadius}
                          fill="none"
                          stroke={CATEGORY_CONFIG[cat].color}
                          strokeWidth="10"
                          strokeDasharray={`${dashLength} ${gapLength}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                          initial={{ strokeDasharray: `0 ${donutCircumference}` }}
                          animate={{ strokeDasharray: `${dashLength} ${gapLength}` }}
                          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                        />
                      );
                    })}
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 dark:text-white/40 font-medium">Total</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(analytics.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex-1 space-y-2.5">
                  {analytics.topSpender && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/8 border border-amber-100 dark:border-amber-500/15">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs text-amber-800 dark:text-amber-300">
                        <span className="font-bold">{analytics.topSpender[0]}</span> contributed the most ({formatCurrency(analytics.topSpender[1])})
                      </span>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 dark:text-white/40">
                    {analytics.sorted.length} categor{analytics.sorted.length !== 1 ? "ies" : "y"} tracked
                  </div>
                </div>
              </div>

              {/* Category Bars */}
              <div className="space-y-2">
                {analytics.sorted.map(([cat, amt], i) => {
                  const config = CATEGORY_CONFIG[cat];
                  const pct = Math.round((amt / analytics.grandTotal) * 100);
                  return (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl ${config.bgLight} ${config.bgDark} border border-transparent`}
                    >
                      <span className="text-base shrink-0">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700 dark:text-white/80">{config.label}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(amt)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: config.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.2 + i * 0.06, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 tabular-nums shrink-0 w-8 text-right">{pct}%</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
