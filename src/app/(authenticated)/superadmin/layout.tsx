import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const s = await auth() as unknown as { user?: { role?: string } } | null;
  const allowed = new Set(["superadmin", "manager"]);
  if (!s?.user || !allowed.has(s.user.role as string)) redirect("/quotations");
  return <>{children}</>;
}
