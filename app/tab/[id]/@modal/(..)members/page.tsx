"use client";

import { Modal } from "@/components/ui/modal";
import { ManageMembers } from "@/components/tab/manage-members";
import { useParams } from "next/navigation";
import { useUserProfile } from "@/lib/user";

export default function InterceptedManageMembers() {
  const params = useParams();
  const profile = useUserProfile();
  const currentUserName = profile.name || "David";
  const id = typeof params?.id === "string" ? params.id : "lisbon-24";

  const membersList = [
    { name: "Aisha", balance: 30000, type: "creditor" as const },
    { name: "Kemi", balance: -4000, type: "debtor" as const },
    { name: "Ben", balance: -8000, type: "debtor" as const },
    { name: currentUserName, balance: -18000, type: "debtor" as const }
  ];

  return (
    <Modal>
      <ManageMembers tabId={id} members={membersList} currentUser={currentUserName} />
    </Modal>
  );
}

