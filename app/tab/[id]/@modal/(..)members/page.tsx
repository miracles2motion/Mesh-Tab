"use client";

import { Modal } from "@/components/ui/modal";
import { ManageMembers } from "@/components/tab/manage-members";
import { useParams } from "next/navigation";
import { useUserProfile, useStoredTabMembers } from "@/lib/user";

export default function InterceptedManageMembers() {
  const params = useParams();
  const profile = useUserProfile();
  const currentUserName = profile.name || "David";
  const id = typeof params?.id === "string" ? params.id : "lisbon-24";
  const { members: membersList } = useStoredTabMembers(id, currentUserName);

  return (
    <Modal>
      <ManageMembers tabId={id} members={membersList} currentUser={currentUserName} />
    </Modal>
  );
}

