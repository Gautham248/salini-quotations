import { auth } from "@/lib/auth"; import { redirect } from "next/navigation";
export default async function Home() {
  const s = await auth() as unknown as { user?: { role?: string } } | null;
  if (!s?.user) redirect("/login");
  if (s.user.role === "superadmin" || s.user.role === "manager") redirect("/superadmin");
  redirect(s.user.role === "admin" ? "/admin" : "/quotations");
}
