"use client";

import { useSession } from "next-auth/react";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

export default function SuperAdminPage() {
  const { data: session } = useSession();

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Welcome, {session?.user?.name || "Admin"}. System overview and multi-store performance.
        </p>
      </div>

      <AnalyticsDashboard isSuperAdmin={true} />
    </div>
  );
}
