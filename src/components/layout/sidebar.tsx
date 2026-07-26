"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Package, Settings, Users, LayoutDashboard, LogOut, ChevronLeft, Menu, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/items", label: "Master Items", icon: Package },
  { href: "/admin/units", label: "Units", icon: Ruler },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/quotations", label: "All Quotations", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
const staffLinks = [{ href: "/quotations", label: "My Quotations", icon: FileText }];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const links = session?.user?.role === "admin" ? adminLinks : staffLinks;

  return (
    <aside className={cn("flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200", collapsed ? "w-16" : "w-60")}>
      <div className="flex items-center justify-between p-4 h-14">
        {!collapsed && <Link href="/" className="font-semibold text-sm truncate">Salini</Link>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="shrink-0">
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <Separator />
      <nav className="flex-1 p-2 space-y-1">
        {links.map(l => (
          <Link key={l.href} href={l.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors", pathname === l.href && "bg-sidebar-accent font-medium")}>
            <l.icon className="h-4 w-4 shrink-0" />{!collapsed && <span>{l.label}</span>}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        {!collapsed && <p className="px-3 py-2 text-xs text-muted-foreground truncate">{session?.user?.name} ({session?.user?.role})</p>}
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors text-left">
          <LogOut className="h-4 w-4 shrink-0" />{!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
