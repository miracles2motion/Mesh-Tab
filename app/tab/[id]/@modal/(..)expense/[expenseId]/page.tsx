"use client";

import { use } from "react";
import { Modal } from "@/components/ui/modal";
import { ExpenseDetails } from "@/components/tab/expense-details-modal";
import { useRouter } from "next/navigation";

export default function InterceptedExpenseDetails({ 
  params 
}: { 
  params: Promise<{ id?: string; expenseId: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  return (
    <Modal>
      <ExpenseDetails expenseId={resolvedParams.expenseId} tabId={resolvedParams.id || "lisbon-24"} onClose={() => router.back()} />
    </Modal>
  );
}

