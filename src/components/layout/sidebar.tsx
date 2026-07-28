"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  Package,
  Settings,
  Users,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Menu,
  Ruler,
  Store,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";

interface StoreInfo { id: number; name: string; slug: string; }

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/items", label: "Master Items", icon: Package },
  { href: "/admin/units", label: "Units", icon: Ruler },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/quotations", label: "All Quotations", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const superAdminLinks = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/stores", label: "Stores", icon: Store },
  { href: "/superadmin/users", label: "All Users", icon: Users },
  { href: "/superadmin/quotations", label: "All Quotations", icon: FileText },
  { href: "/admin/items", label: "Master Items", icon: Package },
  { href: "/admin/units", label: "Units", icon: Ruler },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const staffLinks = [
  { href: "/quotations", label: "My Quotations", icon: FileText },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [stores, setStores] = useState<StoreInfo[]>([]);

  const role = session?.user?.role;
  const storeId = (session?.user as { storeId?: number | null })?.storeId;

  useEffect(() => {
    if (role === "superadmin") {
      fetch("/api/stores")
        .then(r => r.json())
        .then(setStores)
        .catch(() => {});
    }
  }, [role]);

  const links =
    role === "superadmin" ? superAdminLinks :
    role === "admin" || role === "manager" ? adminLinks :
    staffLinks;

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 shrink-0 z-30 border-r border-sidebar-border",
        collapsed ? "w-[56px]" : "w-[232px]"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center h-14 shrink-0 border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "px-4 justify-between"
        )}
      >
        {!collapsed && (
          <Link
            href="/"
            className="font-semibold text-[15px] tracking-tight text-sidebar-foreground hover:text-sidebar-primary-foreground transition-colors"
          >
            Salini Traders
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <Menu className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Superadmin store selector */}
      {role === "superadmin" && !collapsed && stores.length > 0 && (
        <div className="px-2 pt-2 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2.5 py-1">
            Stores
          </p>
          <div className="space-y-0.5">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`?storeId=${store.id}`}
                className="block px-2.5 py-1.5 text-[12px] rounded-md text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              >
                {store.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                collapsed && "justify-center px-0 py-2"
              )}
            >
              <l.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{l.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && (
          <div className="px-2 py-1.5">
            <p className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
              {session?.user?.name || "Staff Member"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 capitalize leading-tight">
              {session?.user?.role || "staff"}
            </p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/55 hover:text-red-400 hover:bg-red-400/10 transition-colors text-left",
            collapsed && "justify-center px-0"
          )}
          title="Sign Out"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
