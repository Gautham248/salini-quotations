"use client";
import { useState, useEffect, useRef } from "react";
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
import { Settings2, QrCode, Trash2, Upload } from "lucide-react";

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
    paymentQrCode: null as string | null,
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const qrInputRef = useRef<HTMLInputElement>(null);

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

  function handleQrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast.error("QR image must be under 512 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setS((prev) => ({ ...prev, paymentQrCode: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = "";
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

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Payment QR Code
                      </h3>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      Shown on the left side of the invoice footer alongside delivery &amp; payment terms.
                    </p>
                    {s.paymentQrCode ? (
                      <div className="flex items-start gap-4">
                        <img
                          src={s.paymentQrCode}
                          alt="Payment QR Code"
                          className="w-24 h-24 object-contain border rounded-md bg-white p-1"
                        />
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => qrInputRef.current?.click()}
                            className="gap-1.5"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Replace QR
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setS({ ...s, paymentQrCode: null })}
                            className="gap-1.5 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove QR
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => qrInputRef.current?.click()}
                        className="gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload QR Image
                      </Button>
                    )}
                    <input
                      ref={qrInputRef}
                      id="qr-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleQrFile}
                    />
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
