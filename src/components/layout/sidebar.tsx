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
  Plus,
  MoreHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  { href: "/quotations/new", label: "New Quotation", icon: Plus },
  { href: "/admin/items", label: "Master Items", icon: Package },
  { href: "/admin/units", label: "Units", icon: Ruler },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const staffLinks = [
  { href: "/quotations", label: "My Quotations", icon: FileText },
  { href: "/admin/items", label: "Master Items", icon: Package },
];

// First N links shown in the mobile bottom bar; the rest go in the "More" sheet
const BOTTOM_BAR_COUNT = 4;

function isActive(href: string, pathname: string) {
  return href === "/superadmin" || href === "/admin" || href === "/quotations"
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);

  const role = session?.user?.role;

  const links =
    role === "superadmin"
      ? superAdminLinks
      : role === "admin" || role === "manager"
      ? adminLinks
      : staffLinks;

  const bottomLinks = links.slice(0, BOTTOM_BAR_COUNT);
  const moreLinks = links.slice(BOTTOM_BAR_COUNT);

  return (
    <>
      {/* ─── Desktop Sidebar (hidden on mobile) ─── */}
      <aside
        className={cn(
          "hidden md:flex sticky top-0 h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 shrink-0 z-30 border-r border-sidebar-border",
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {links.map((l) => {
            const active = isActive(l.href, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                prefetch
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
            onClick={() => setConfirmSignOutOpen(true)}
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

      {/* ─── Mobile Bottom Navigation Bar ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border flex items-stretch h-16 safe-area-inset-bottom">
        {bottomLinks.map((l) => {
          const active = isActive(l.href, pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              prefetch
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors py-2",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/55"
              )}
            >
              <l.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active && "text-primary"
                )}
              />
              <span className="truncate max-w-[56px] text-center leading-tight">
                {l.label}
              </span>
            </Link>
          );
        })}

        {/* "More" tab — always shown */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors py-2",
            moreOpen
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-foreground/55"
          )}
        >
          <MoreHorizontal className="h-5 w-5 shrink-0" />
          <span>More</span>
        </button>
      </nav>

      {/* ─── Mobile "More" Sheet ─── */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="bg-sidebar text-sidebar-foreground border-sidebar-border rounded-t-3xl max-h-[85vh] overflow-y-auto p-0 shadow-2xl">
          {/* Top handle pill */}
          <div className="pt-2 pb-0.5 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-sidebar-border/80" />
          </div>

          <SheetHeader className="px-5 pt-1 pb-3 border-b border-sidebar-border space-y-0 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30 shrink-0">
                  {(session?.user?.name?.[0] || "S").toUpperCase()}
                </div>
                <div>
                  <SheetTitle className="text-sidebar-foreground text-base font-semibold tracking-tight leading-none">
                    Salini Traders
                  </SheetTitle>
                  <p className="text-[13px] text-sidebar-foreground/60 leading-normal mt-1 flex items-center gap-1.5">
                    <span className="font-medium text-sidebar-foreground/80">{session?.user?.name || "Staff"}</span>
                    <span>·</span>
                    <span className="text-primary font-semibold capitalize">{session?.user?.role || "staff"}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors border border-sidebar-border/60 shrink-0"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </SheetHeader>

          <nav className="p-4 space-y-1.5">
            {/* All links in the sheet for full access */}
            {links.map((l) => {
              const active = isActive(l.href, pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium transition-all",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs border border-sidebar-border/50"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <l.icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-sidebar-foreground/60")} />
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4 pb-12">
            <button
              onClick={() => setConfirmSignOutOpen(true)}
              className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors text-left border border-red-500/20"
            >
              <LogOut className="h-5 w-5 shrink-0 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Sign Out Confirmation Dialog ─── */}
      <Dialog open={confirmSignOutOpen} onOpenChange={setConfirmSignOutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Sign Out</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmSignOutOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmSignOutOpen(false);
                setMoreOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
            >
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
