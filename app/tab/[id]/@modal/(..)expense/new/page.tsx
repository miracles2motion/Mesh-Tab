"use client";

import { Modal } from "@/components/ui/modal";
import { AddExpenseForm } from "@/components/tab/add-expense-form";
import { useRouter } from "next/navigation";

const mockMembers = [
  { name: "Aisha", balance: 30000, type: "creditor" as const },
  { name: "Kemi", balance: -4000, type: "debtor" as const },
  { name: "Ben", balance: -8000, type: "debtor" as const },
  { name: "Sarah", balance: -18000, type: "debtor" as const }
];

export default function InterceptedAddExpense() {
  const router = useRouter();
  
  return (
    <Modal>
      <AddExpenseForm members={mockMembers.map(m => m.name)} onSuccess={() => router.back()} />
    </Modal>
  );
}
