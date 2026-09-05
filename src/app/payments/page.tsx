import { PageHeader } from "@/components/common/page-header";
import { getPaymentsList, getUnpaidDocuments } from "@/services/payments";
import { PaymentsClientShell } from "@/components/payments/payments-client-shell";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const initialPayments = await getPaymentsList();
  const unpaidDocs = await getUnpaidDocuments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments Register"
        description="Track inbound customer receipts (AR), outbound vendor disbursements (AP), and post payments to General Ledger."
        actions={<RecordPaymentDialog initialUnpaidDocs={unpaidDocs} />}
      />

      <PaymentsClientShell
        initialPayments={initialPayments}
      />
    </div>
  );
}
