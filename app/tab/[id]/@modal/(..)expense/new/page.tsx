"use client";

import { Modal } from "@/components/ui/modal";
import { AddExpenseForm } from "@/components/tab/add-expense-form";
import { useRouter, useParams } from "next/navigation";
import { useUserProfile } from "@/lib/user";

export default function InterceptedAddExpense() {
  const router = useRouter();
  const params = useParams();
  const profile = useUserProfile();
  const activeUser = profile.name || "David";
  const tabId = typeof params?.id === "string" ? params.id : "lisbon-24";

  const memberNames = ["Aisha", "Kemi", "Ben", activeUser];

  return (
    <Modal>
      <AddExpenseForm 
        tabId={tabId}
        members={memberNames} 
        currentUser={activeUser}
        onSuccess={() => router.back()} 
      />
    </Modal>
  );
}

