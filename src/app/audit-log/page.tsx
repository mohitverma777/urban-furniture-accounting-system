import { redirect } from "next/navigation";

export default function AuditLogRedirectPage() {
  redirect("/admin/users?tab=audit");
}
