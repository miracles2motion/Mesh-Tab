"use client";

import { ManageMembers } from "@/components/tab/manage-members";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";

// Mock data to match the dashboard
const mockMembers = [
  { name: "Aisha", balance: 30000, type: "creditor" as const },
  { name: "Kemi", balance: -4000, type: "debtor" as const },
  { name: "Ben", balance: -8000, type: "debtor" as const },
  { name: "Sarah", balance: -18000, type: "debtor" as const }
];

export default function MembersFallbackPage() {
  const params = useParams();
  if (!params?.id) return null;

  return (
    <div className="min-h-screen bg-black/40 flex flex-col p-6 items-center justify-center relative">
      <Link href={`/tab/${params.id}`} className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Link>
      
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <ManageMembers tabId={params.id as string} members={mockMembers} />
      </div>
    </div>
  );
}
