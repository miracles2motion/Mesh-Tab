import { Modal } from "@/components/ui/modal";
import { ManageMembers } from "@/components/tab/manage-members";

// Mock data to match the dashboard
const mockMembers = [
  { name: "Aisha", balance: 30000, type: "creditor" as const },
  { name: "Kemi", balance: -4000, type: "debtor" as const },
  { name: "Ben", balance: -8000, type: "debtor" as const },
  { name: "Sarah", balance: -18000, type: "debtor" as const }
];

export default async function InterceptedManageMembers({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  return (
    <Modal>
      <ManageMembers tabId={id} members={mockMembers} />
    </Modal>
  );
}
