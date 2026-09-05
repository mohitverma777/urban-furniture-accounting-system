import { notFound } from "next/navigation";
import { getPurchaseOrderById } from "@/services/purchases";
import { PurchaseDetailClient } from "@/components/purchases/purchase-detail-client";

export const dynamic = "force-dynamic";

interface PurchaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseDetailPage({ params }: PurchaseDetailPageProps) {
  const resolvedParams = await params;
  const detail = await getPurchaseOrderById(resolvedParams.id);

  if (!detail) {
    notFound();
  }

  return <PurchaseDetailClient detail={detail} />;
}
