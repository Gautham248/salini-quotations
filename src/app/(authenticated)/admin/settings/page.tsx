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
import Link from "next/link";
import { Settings2 } from "lucide-react";

export default function SettingsPage() {
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

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage your company details and document preferences.
          </p>
        </div>
      </div>

      {role === "superadmin" ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Company Settings</CardTitle>
            <CardDescription className="text-[13px]">
              As superadmin, you manage each store&apos;s settings individually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Go to{" "}
              <Link href="/superadmin/stores" className="underline text-primary">
                Store Management
              </Link>{" "}
              and click <strong>Edit</strong> on a store to modify its company details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Company & Contact */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Company &amp; Contact Details</CardTitle>
              <CardDescription className="text-[13px]">
                These details appear on the header of every printed quotation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fetchLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading settings...</p>
              ) : (
                <form onSubmit={save} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[13px]">Company Name</Label>
                      <Input
                        value={s.companyName}
                        onChange={(e) => setS({ ...s, companyName: e.target.value })}
                        placeholder="e.g. SALINI NEENDOOR"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[13px]">Address / Subheading</Label>
                      <Input
                        value={s.subheading}
                        onChange={(e) => setS({ ...s, subheading: e.target.value })}
                        placeholder="Street address, city, state"
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
                        type="email"
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

                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Bank &amp; Document Notices
                    </h3>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Bank Details</Label>
                      <Input
                        value={s.bankDetails}
                        onChange={(e) => setS({ ...s, bankDetails: e.target.value })}
                        placeholder="Bank name, branch, account details"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Disclaimer Text</Label>
                      <Input
                        value={s.disclaimerText}
                        onChange={(e) => setS({ ...s, disclaimerText: e.target.value })}
                        placeholder="e.g. Certified ISO / terms"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Loading Note</Label>
                      <Input
                        value={s.loadingNote}
                        onChange={(e) => setS({ ...s, loadingNote: e.target.value })}
                        placeholder="e.g. LOADING CHARGE EXTRA"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} size="sm">
                    {loading ? "Saving..." : "Save Settings"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
