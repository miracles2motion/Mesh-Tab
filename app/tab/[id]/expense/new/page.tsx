"use client";

import { AddExpenseForm } from "@/components/tab/add-expense-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const mockMembers = [
  { name: "Aisha", balance: 30000, type: "creditor" as const },
  { name: "Kemi", balance: -4000, type: "debtor" as const },
  { name: "Ben", balance: -8000, type: "debtor" as const },
  { name: "Sarah", balance: -18000, type: "debtor" as const }
];
import { useRouter, useParams } from "next/navigation";

export default function AddExpenseFallbackPage() {
  const router = useRouter();
  const params = useParams();
  
  if (!params?.id) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black/40 flex flex-col p-6 items-center justify-center relative text-slate-900 dark:text-white">
      <Link href={`/tab/${params.id}`} className="absolute top-8 left-8 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors font-medium">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Link>
      
      <div className="w-full max-w-lg bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <AddExpenseForm members={mockMembers.map(m => m.name)} onSuccess={() => router.push(`/tab/${params.id}`)} />
      </div>
    </div>
  );
}
