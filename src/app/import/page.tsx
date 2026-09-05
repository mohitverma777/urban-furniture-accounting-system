import { requireRole } from "@/auth/permissions";
import { ImportClientShell } from "@/components/import/import-client-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Import | Urban Furniture Accounting",
  description: "Bulk import customers and products with validation and duplicate prevention.",
};

interface ImportPageProps {
  searchParams?: Promise<{
    type?: string;
  }>;
}

export default async function ImportPage(props: ImportPageProps) {
  // Enforce server-side authorization: ADMIN or ACCOUNTANT only
  await requireRole("ADMIN", "ACCOUNTANT");

  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const initialType = searchParams?.type === "product" ? "product" : "customer";

  return <ImportClientShell initialType={initialType} />;
}
