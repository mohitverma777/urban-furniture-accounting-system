import { redirect } from "next/navigation";

export default function AuditRedirectPage() {
  redirect("/admin/users?tab=audit");
}
