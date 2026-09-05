"use client";

import React, { useState } from "react";
import { FileCheck, CreditCard } from "lucide-react";
import { convertOrderToInvoiceAction } from "@/actions/sales";
import { PaymentModal } from "./payment-modal";
import { useToast } from "@/components/ui/toast";

export interface SalesInvoiceActionsProps {
  orderId: string;
  orderNumber: string;
  status: "DRAFT" | "BILLED" | "PARTIAL" | "PAID";
  outstandingAmount: number; // in Paise
}

export function SalesInvoiceActions({
  orderId,
  orderNumber,
  status,
  outstandingAmount,
}: SalesInvoiceActionsProps) {
  const { toast } = useToast();

  const [isConverting, setIsConverting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleConvert = async () => {
    setIsConverting(true);
    const result = await convertOrderToInvoiceAction(orderId);
    setIsConverting(false);

    if (result.success) {
      toast({
        title: "Converted to Customer Invoice",
        description: `Order ${orderNumber} posted to double-entry accounting ledger & stock updated.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Conversion Failed",
        description: result.error,
        variant: "error",
      });
    }
  };

  return (
    <div className="flex items-center gap-3">
      {status === "DRAFT" && (
        <button
          onClick={handleConvert}
          disabled={isConverting}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4" />
          <span>{isConverting ? "Posting..." : "Convert to Invoice"}</span>
        </button>
      )}

      {(status === "BILLED" || status === "PARTIAL") && (
        <button
          onClick={() => setPaymentModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md"
        >
          <CreditCard className="w-4 h-4" />
          <span>Register Payment</span>
        </button>
      )}

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        orderId={orderId}
        orderNumber={orderNumber}
        outstandingAmount={outstandingAmount}
      />
    </div>
  );
}
