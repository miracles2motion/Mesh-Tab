"use client";

import { use } from "react";
import { ExpenseDetails } from "@/components/tab/expense-details-modal";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function ExpenseDetailsFallbackPage({ 
  params 
}: { 
  params: Promise<{ id?: string; expenseId: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const routeParams = useParams();

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] flex flex-col items-center p-6 md:p-12 pt-24 text-slate-900 dark:text-white">
      <Link href={`/tab/${routeParams.id || resolvedParams.id}`} className="flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors mb-8 self-start max-w-lg mx-auto w-full font-medium">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Link>
      
      <div className="w-full max-w-lg bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden h-[800px] max-h-[85vh]">
        <ExpenseDetails expenseId={resolvedParams.expenseId} />
      </div>
    </div>
  );
}
