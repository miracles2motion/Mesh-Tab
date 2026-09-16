import { Modal } from "@/components/ui/modal";
import { ManageMembers } from "@/components/tab/manage-members";

// Mock data to match the dashboard
const mockMembers = [
  { name: "Aisha", balance: 30000, type: "creditor" as const },
  { name: "Kemi", balance: -4000, type: "debtor" as const },
  { name: "Ben", balance: -8000, type: "debtor" as const },
  { name: "Sarah", balance: -18000, type: "debtor" as const }
];

export default function InterceptedManageMembers({ params }: { params: { id: string } }) {
  return (
    <Modal>
      <ManageMembers tabId={params.id} members={mockMembers} />
    </Modal>
  );
}
