import { PageHeader } from "@/components/common/page-header";
import { getProductStockSummaries, getStockMovementHistory } from "@/services/stock";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { StockClientShell } from "@/components/stock/stock-client-shell";
import { StockAdjustmentDialog } from "@/components/stock/stock-adjustment-dialog";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const summaries = await getProductStockSummaries();
  const history = await getStockMovementHistory();

  // Fetch active stockable products (GOODS and COMBO) for manual adjustments
  const stockableProducts = await db
    .select()
    .from(products)
    .where(and(eq(products.isArchived, false), ne(products.type, "SERVICE")));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & Inventory"
        description="Perpetual stock ledger derived dynamically from purchase receipts, sales dispatches, and audit adjustments."
        actions={<StockAdjustmentDialog stockableProducts={stockableProducts} />}
      />

      <StockClientShell
        initialSummaries={summaries}
        initialHistory={history}
      />
    </div>
  );
}
