"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Users, FileText, Package } from "lucide-react";

const links = [
  { href: "/superadmin/stores", label: "Stores", icon: Store, desc: "Create and manage store accounts" },
  { href: "/superadmin/users", label: "All Users", icon: Users, desc: "Manage users across all stores" },
  { href: "/superadmin/quotations", label: "All Quotations", icon: FileText, desc: "View quotations from all stores" },
  { href: "/admin/items", label: "Master Items", icon: Package, desc: "Manage shared product catalog" },
];

export default function SuperAdminPage() {
  const { data: session } = useSession();
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Welcome, {session?.user?.name}. You have access to all stores.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="group hover:border-primary/30 hover:shadow-md transition-all duration-150 cursor-pointer h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <l.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{l.label}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{l.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
