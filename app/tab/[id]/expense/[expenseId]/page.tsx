"use client";

import { use } from "react";
import { ExpenseDetails } from "@/components/tab/expense-details-modal";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { GlobalNav } from "@/components/ui/global-nav";

export default function ExpenseDetailsFallbackPage({ 
  params 
}: { 
  params: Promise<{ id?: string; expenseId: string }> 
}) {
  const resolvedParams = use(params);
  const routeParams = useParams();
  const router = useRouter();
  const currentTabId = (routeParams.id as string) || resolvedParams.id || "lisbon-24";

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300 flex flex-col">
      <GlobalNav />
      
      <div className="sticky top-16 z-30 bg-[#f5f5f7]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 w-full">
        <header className="px-6 md:px-12 py-3 md:py-4 max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              replace
              href={`/tab/${currentTabId}`} 
              className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80 shrink-0"
              title="Back to Tab"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">Expense Ledger</h1>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-0.5 truncate max-w-xs sm:max-w-md md:max-w-xl">
                Detailed breakdown and verifiable cryptographic proof
              </p>
            </div>
          </div>
        </header>
      </div>
      
      <main className="flex-1 w-full max-w-5xl mx-auto py-8 flex flex-col">
        <ExpenseDetails 
          expenseId={resolvedParams.expenseId} 
          tabId={currentTabId} 
          onClose={() => router.replace(`/tab/${currentTabId}`)}
        />
      </main>
    </div>
  );
}
