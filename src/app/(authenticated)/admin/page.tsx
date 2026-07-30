"use client";
import { useSession } from "next-auth/react";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

export default function AdminDashboard() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Welcome back, {session?.user?.name || "User"}.
        </p>
      </div>

      <AnalyticsDashboard isSuperAdmin={role === "superadmin"} />
    </div>
  );
}
