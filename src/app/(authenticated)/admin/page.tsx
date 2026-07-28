"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Package, FileText, Users, Settings2 } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [s, setS] = useState({
    companyName: "",
    subheading: "",
    phone: "",
    mobile: "",
    email: "",
    gstin: "",
    bankDetails: "",
    disclaimerText: "",
    loadingNote: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = session?.user?.role;

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && !data.error) setS(data);
        setFetchLoading(false);
      })
      .catch(() => setFetchLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    toast[r.ok ? "success" : "error"](r.ok ? "Settings saved" : "Save failed");
    setLoading(false);
  }

  const links = [
    {
      href: "/admin/items",
      label: "Master Items",
      icon: Package,
      desc: "Manage product catalog, rates, and categories",
    },
    {
      href: "/admin/units",
      label: "Units & Conversions",
      icon: Settings2,
      desc: "Manage units and conversion factors",
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      desc: "Add, remove, and manage staff accounts",
    },
    {
      href: "/admin/quotations",
      label: "All Quotations",
      icon: FileText,
      desc: "View and manage all quotations",
    },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Welcome back, {session?.user?.name}.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="group hover:border-primary/30 hover:shadow-md transition-all duration-150 cursor-pointer h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <l.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {l.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    {l.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Company Settings — store-admin only; superadmin manages per-store from the Stores page */}
      {role === "superadmin" ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Company Settings</CardTitle>
            <CardDescription className="text-[13px]">
              As superadmin, you manage each store's settings individually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Go to <Link href="/superadmin/stores" className="underline text-primary">Store Management</Link>{" "}
              and click <strong>Edit</strong> on a store to modify its company details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              Company Settings
            </CardTitle>
            <CardDescription className="text-[13px]">
              These details appear on every printed quotation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fetchLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading settings...</p>
            ) : (
              <form onSubmit={save} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Company Name</Label>
                <Input
                  value={s.companyName}
                  onChange={(e) =>
                    setS({ ...s, companyName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Subheading / Address</Label>
                <Input
                  value={s.subheading}
                  onChange={(e) =>
                    setS({ ...s, subheading: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Phone</Label>
                <Input
                  value={s.phone}
                  onChange={(e) => setS({ ...s, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Mobile</Label>
                <Input
                  value={s.mobile}
                  onChange={(e) => setS({ ...s, mobile: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Email</Label>
                <Input
                  value={s.email}
                  onChange={(e) => setS({ ...s, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">GSTIN</Label>
                <Input
                  value={s.gstin}
                  onChange={(e) => setS({ ...s, gstin: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-[13px]">Bank Details</Label>
              <Input
                value={s.bankDetails}
                onChange={(e) =>
                  setS({ ...s, bankDetails: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Disclaimer Text</Label>
              <Input
                value={s.disclaimerText}
                onChange={(e) =>
                  setS({ ...s, disclaimerText: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Loading Note</Label>
              <Input
                value={s.loadingNote}
                onChange={(e) =>
                  setS({ ...s, loadingNote: e.target.value })
                }
              />
            </div>

            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
