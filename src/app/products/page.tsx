import { PageHeader } from "@/components/common/page-header";
import { getProducts } from "@/services/products";
import { ProductTable } from "@/components/products/product-table";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const initialActive = await getProducts({ isArchived: false });
  const initialArchived = await getProducts({ isArchived: true });
  const allProducts = [...initialActive, ...initialArchived];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Services"
        description="Master catalog for furniture items, services, and combo bundles."
      />

      <ProductTable initialProducts={allProducts} />
    </div>
  );
}
