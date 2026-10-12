"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, ShieldCheck, Activity, ChevronRight, CheckCircle2, Search, X, CloudUpload } from "lucide-react";
import { formatCurrency, formatDistanceToNow } from "../../lib/utils";
import Image from "next/image";
import { MonadLogo } from "../ui/partner-logo";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExpenseCategory, useDeveloperMode, resolveExpenseTimestamp } from "../../lib/user";
import { LiveTime } from "../ui/live-time";

export interface ExpenseItem {
  id: string;
  payer: string;
  amount: number; // in cents
  desc: string;
  time?: string;
  category?: ExpenseCategory;
  originalCurrency?: string;
  originalAmount?: number;
  createdAt?: number;
  syncStatus?: "synced" | "pending" | "failed";
  isSettlement?: boolean;
  txHash?: string;
}

interface FeedListProps {
  expenses: ExpenseItem[];
  currentUserName?: string;
  isLoading?: boolean;
}

const CATEGORY_MAP: Record<ExpenseCategory, { icon: string; label: string }> = {
  dining: { icon: "🍽️", label: "Dining" },
  stay: { icon: "🏨", label: "Stay" },
  transit: { icon: "🚕", label: "Rides" },
  activities: { icon: "🎟️", label: "Events" },
  groceries: { icon: "🛒", label: "Supplies" },
  other: { icon: "⚡", label: "Other" }
};

function inferCategory(desc: string): ExpenseCategory {
  const lower = desc.toLowerCase();
  if (lower.includes("villa") || lower.includes("hotel") || lower.includes("airbnb") || lower.includes("stay") || lower.includes("room")) {
    return "stay";
  }
  if (lower.includes("dinner") || lower.includes("food") || lower.includes("wine") || lower.includes("coffee") || lower.includes("cafe") || lower.includes("lunch") || lower.includes("meal") || lower.includes("pizza") || lower.includes("seafood")) {
    return "dining";
  }
  if (lower.includes("taxi") || lower.includes("uber") || lower.includes("cab") || lower.includes("van") || lower.includes("flight") || lower.includes("gas") || lower.includes("transfer")) {
    return "transit";
  }
  if (lower.includes("excursion") || lower.includes("event") || lower.includes("ticket") || lower.includes("tour") || lower.includes("party") || lower.includes("show")) {
    return "activities";
  }
  if (lower.includes("grocery") || lower.includes("market") || lower.includes("supplies") || lower.includes("store") || lower.includes("provisions")) {
    return "groceries";
  }
  return "other";
}

export function FeedList({ expenses, currentUserName, isLoading = false }: FeedListProps) {
  const params = useParams();
  const tabId = params?.id || "default";
  const { isDeveloperMode } = useDeveloperMode();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | ExpenseCategory | "settlements">("all");

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(item => {
        const isSettlement = 
          item.id.startsWith("settle") || 
          item.desc.toLowerCase().includes("settle") || 
          item.desc.toLowerCase().includes("cleared") ||
          item.desc.toLowerCase().includes("repaid");

        if (selectedFilter === "settlements") {
          if (!isSettlement) return false;
        } else if (selectedFilter !== "all") {
          if (isSettlement) return false;
          const cat = item.category || inferCategory(item.desc);
          if (cat !== selectedFilter) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = item.desc.toLowerCase().includes(q);
          const matchPayer = item.payer.toLowerCase().includes(q);
          if (!matchDesc && !matchPayer) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const tsB = resolveExpenseTimestamp(b);
        const tsA = resolveExpenseTimestamp(a);
        if (tsB !== tsA) return tsB - tsA;
        return String(b.id || "").localeCompare(String(a.id || ""));
      });
  }, [expenses, selectedFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header with Live Sync Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Live Ledger</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/20 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Fee Sync
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {expenses.length > 0 && (
        <div className="space-y-3 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search expenses, notes, or friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2">
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              All ({expenses.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("dining")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedFilter === "dining"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>🍽️</span>
              <span>Dining</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("stay")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedFilter === "stay"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>🏨</span>
              <span>Stay</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("transit")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedFilter === "transit"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>🚕</span>
              <span>Rides</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("activities")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedFilter === "activities"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>🎟️</span>
              <span>Events</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("groceries")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedFilter === "groceries"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>🛒</span>
              <span>Supplies</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("settlements")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedFilter === "settlements"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
              }`}
            >
              <span>⚡</span>
              <span>Settlements</span>
            </button>
          </div>
        </div>
      )}

      {/* Expenses Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200/70 dark:border-white/10 rounded-2xl p-4 flex gap-4 items-center animate-pulse"
            >
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex justify-between items-center">
                  <div className="w-32 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                  <div className="w-16 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="w-24 h-3 bg-slate-200 dark:bg-white/10 rounded" />
                  <div className="w-16 h-3 bg-slate-200 dark:bg-white/10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl border-dashed">
          <Receipt className="w-12 h-12 text-slate-300 dark:text-white/20 mb-4" />
          <h4 className="text-slate-800 dark:text-white/70 font-semibold">
            {searchQuery || selectedFilter !== "all" ? "No matching expenses" : "No expenses yet"}
          </h4>
          <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
            {searchQuery || selectedFilter !== "all"
              ? "Try adjusting your search or category filter."
              : "Be the first to buy a round."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredExpenses.map((item) => {
              const isSettlement = 
                item.id.startsWith("settle") || 
                item.desc.toLowerCase().includes("settle") || 
                item.desc.toLowerCase().includes("cleared") ||
                item.desc.toLowerCase().includes("repaid");

              const category = item.category || inferCategory(item.desc);
              const catMeta = CATEGORY_MAP[category] || CATEGORY_MAP.other;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  key={item.id}
                >
                  <Link
                    href={`/tab/${tabId}/expense/${item.id}`}
                    className={`backdrop-blur-md rounded-2xl p-4 flex gap-4 items-center cursor-pointer transition-all group shadow-sm ${
                      isSettlement
                        ? "bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]"
                        : "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
                      isSettlement
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/20"
                        : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 group-hover:text-indigo-600 dark:group-hover:text-white/80"
                    }`}>
                      {isSettlement ? (
                        <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                      ) : (
                        <span className="text-xl select-none">{catMeta.icon}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <div className="flex items-center gap-2 truncate">
                          <p className={`font-bold truncate text-base ${isSettlement ? "text-emerald-950 dark:text-emerald-200" : "text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white"}`}>
                            {item.desc}
                          </p>
                          {isSettlement ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> Settled
                              {item.txHash && (
                                <span className="text-[9px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
                                  • {isDeveloperMode ? "Monad Tx" : "Instant Clearing"}
                                </span>
                              )}
                            </span>
                          ) : (
                            item.originalCurrency && item.originalCurrency !== "USD" && (
                              <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
                                {item.originalCurrency} {item.originalAmount?.toFixed(0)}
                              </span>
                            )
                          )}
                        </div>
                        <span className={`font-extrabold text-base sm:text-lg tabular-nums ml-2 shrink-0 ${isSettlement ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                          {isSettlement ? `+${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className={isSettlement ? "text-emerald-700/80 dark:text-emerald-300/70 font-medium" : "text-slate-500 dark:text-white/50"}>
                          {isSettlement ? "Settled by" : "Paid by"}{" "}
                          <span className={`font-bold ${isSettlement ? "text-emerald-900 dark:text-emerald-200" : "text-slate-700 dark:text-white/80"}`}>
                            {currentUserName && item.payer.toLowerCase() === currentUserName.toLowerCase() ? `You (${item.payer})` : item.payer}
                          </span>
                        </span>
                        <span className={`flex items-center gap-1 ${isSettlement ? "text-emerald-600/70 dark:text-emerald-400/60 font-semibold" : "text-slate-400 dark:text-white/40"}`}>
                          {item.syncStatus === "pending" && (
                            <span className="flex items-center gap-0.5 text-amber-500" title="Saved to Local Vault (Offline)">
                              <CloudUpload className="w-3 h-3" />
                            </span>
                          )}
                          <LiveTime ts={resolveExpenseTimestamp(item) || item.createdAt} kind={isSettlement ? "settled" : "expense"} variant="activity" fallback={item.time} />
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-colors hidden sm:block ${isSettlement ? "text-emerald-500/60 group-hover:text-emerald-500" : "text-slate-300 dark:text-white/20 group-hover:text-slate-600 dark:group-hover:text-white/50"}`} />
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Bottom attribution strip */}
          <div className="pt-2 flex items-center justify-end text-[11px] text-slate-400 dark:text-white/40 px-2">
            {isDeveloperMode ? (
              <div className="flex items-center gap-1.5">
                <span>Ledger on</span>
                <div className="opacity-80 hover:opacity-100 transition-all text-slate-700 dark:text-white/80">
                  <MonadLogo className="h-3.5 w-auto" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-white/40">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Zero-Fee Netting Ledger</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
