"use client";

import { useState, useEffect } from "react";
import { ManageMembers } from "@/components/tab/manage-members";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { useUserProfile, useStoredTabMembers, useStoredTabs } from "@/lib/user";

export default function MembersFallbackPage() {
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  const profile = useUserProfile();
  const currentUserName = profile.name || "David";
  const tabId = typeof params?.id === "string" ? params.id : "lisbon-24";
  const { members: membersList } = useStoredTabMembers(tabId, currentUserName);
  const { tabs: storedTabs } = useStoredTabs();
  const currentTab = storedTabs.find(t => t.id === tabId);
  const tabName = currentTab ? currentTab.name : tabId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!params?.id || !mounted) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Loading Members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-black/40 flex flex-col items-center justify-start pb-12 overflow-y-auto text-slate-900 dark:text-white">
      <div className="w-full max-w-full mb-4 mt-8 px-4 md:px-12 flex items-center justify-between">
        <Link 
          href={`/tab/${params.id}`} 
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tab
        </Link>
      </div>
      <div className="w-full max-w-full px-4 md:px-12 mx-auto mb-12 flex-1 flex flex-col">
        <div className="w-full flex-1 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <ManageMembers tabId={params.id as string} tabName={tabName} members={membersList} currentUser={currentUserName} />
        </div>
      </div>
    </div>
  );
}
