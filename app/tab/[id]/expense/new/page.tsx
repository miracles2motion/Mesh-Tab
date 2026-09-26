"use client";

import { useState, useEffect } from "react";
import { AddExpenseForm } from "@/components/tab/add-expense-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GlobalNav } from "@/components/ui/global-nav";
import { useRouter, useParams } from "next/navigation";
import { useUserProfile, useStoredTabMembers } from "@/lib/user";

export default function AddExpenseFallbackPage() {
  const router = useRouter();
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  const profile = useUserProfile();
  const currentUserName = profile.name || "David";
  const tabId = typeof params?.id === "string" ? params.id : "lisbon-24";

  useEffect(() => {
    setMounted(true);
  }, []);

  const { members: tabMembers } = useStoredTabMembers(tabId, currentUserName);
  const memberNames = tabMembers.map(m => m.name);
  
  if (!params?.id) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-black/40 flex flex-col items-center justify-start pb-12 overflow-y-auto text-slate-900 dark:text-white">
      <GlobalNav />
      <div className="w-full max-w-2xl mb-4 mt-8 px-4 flex items-center justify-between">
        <Link 
          href={`/tab/${params.id}`} 
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tab
        </Link>
      </div>
      <div className="w-full max-w-4xl px-4 mx-auto mb-12">
        <div className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <AddExpenseForm 
            tabId={tabId}
            members={memberNames} 
          currentUser={mounted ? currentUserName : "David"}
          onSuccess={() => router.push(`/tab/${params.id}`)} 
        />
        </div>
      </div>
    </div>
  );
}
