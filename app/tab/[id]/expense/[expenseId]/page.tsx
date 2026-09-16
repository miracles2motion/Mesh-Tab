"use client";

import { ExpenseDetails } from "@/components/tab/expense-details-modal";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function ExpenseDetailsFallbackPage({ params }: { params: { expenseId: string } }) {
  const router = useRouter();
  const routeParams = useParams();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center p-6 md:p-12 pt-24">
      <Link href={`/tab/${routeParams.id}`} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 self-start max-w-lg mx-auto w-full">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Link>
      
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden h-[800px] max-h-[85vh]">
        <ExpenseDetails expenseId={params.expenseId} />
      </div>
    </div>
  );
}
