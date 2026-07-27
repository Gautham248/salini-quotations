"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Package, Settings, Users, LayoutDashboard, LogOut, ChevronLeft, Menu, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 shrink-0 z-30",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b">
        {!collapsed && (
          <Link href="/" className="font-bold text-base truncate tracking-tight text-sidebar-primary">
            Salini Traders
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 h-8 w-8 hover:bg-sidebar-accent"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname === l.href && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
            )}
          >
            <l.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{l.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Pinned Bottom Footer (Sign Out) */}
      <div className="shrink-0 border-t p-3 bg-sidebar/50 flex flex-col gap-2">
        {!collapsed && (
          <div className="px-2 py-1">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">
              {session?.user?.name || "Staff Member"}
            </p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {session?.user?.role || "staff"}
            </p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left",
            collapsed && "justify-center px-0"
          )}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
