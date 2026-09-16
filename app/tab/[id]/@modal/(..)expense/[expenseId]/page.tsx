"use client";

import { Modal } from "@/components/ui/modal";
import { ExpenseDetails } from "@/components/tab/expense-details-modal";
import { useRouter } from "next/navigation";

export default function InterceptedExpenseDetails({ params }: { params: { expenseId: string } }) {
  const router = useRouter();
  
  return (
    <Modal>
      <ExpenseDetails expenseId={params.expenseId} onClose={() => router.back()} />
    </Modal>
  );
}
