import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const s = await auth() as unknown as { user?: { role?: string } } | null;
  if (!s?.user || s.user.role !== "superadmin") redirect("/quotations");
  return <>{children}</>;
}
