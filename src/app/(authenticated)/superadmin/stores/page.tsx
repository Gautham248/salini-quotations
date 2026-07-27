"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Store } from "lucide-react";
import { toast } from "sonner";

interface StoreInfo {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [subheading, setSubheading] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/stores");
    if (r.ok) setStores(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  async function createStore(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, slug, companyName, subheading, phone, mobile, email, gstin, bankDetails,
        adminUsername, adminPassword,
      }),
    });
    if (r.ok) {
      toast.success("Store created");
      setFormOpen(false);
      setName(""); setSlug(""); setCompanyName(""); setSubheading("");
      setPhone(""); setMobile(""); setEmail(""); setGstin(""); setBankDetails("");
      setAdminUsername(""); setAdminPassword("");
      fetchStores();
    } else {
      toast.error("Failed to create store");
    }
    setSaving(false);
  }

  async function toggle(store: StoreInfo) {
    await fetch(`/api/stores/${store.id}`, { method: "PATCH" });
    toast.success(store.isActive ? "Store deactivated" : "Store activated");
    fetchStores();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Stores</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{stores.length} store{stores.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Store
        </Button>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Slug</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : stores.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No stores yet.</TableCell></TableRow>
            ) : stores.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-sm flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  {s.name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.slug}</TableCell>
                <TableCell>
                  <Badge variant={s.isActive ? "default" : "secondary"} className="text-[11px]">
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggle(s)}>
                    {s.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create New Store</DialogTitle></DialogHeader>
          <form onSubmit={createStore} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Store Name *</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Slug *</Label><Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="url-friendly" required /></div>
              <div className="space-y-1"><Label>Company Name</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
              <div className="space-y-1"><Label>Address</Label><Input value={subheading} onChange={e => setSubheading(e.target.value)} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div className="space-y-1"><Label>Mobile</Label><Input value={mobile} onChange={e => setMobile(e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="space-y-1"><Label>GSTIN</Label><Input value={gstin} onChange={e => setGstin(e.target.value)} /></div>
              <div className="space-y-1 col-span-2"><Label>Bank Details</Label><Input value={bankDetails} onChange={e => setBankDetails(e.target.value)} /></div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-2">First Admin User (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Username</Label><Input value={adminUsername} onChange={e => setAdminUsername(e.target.value)} /></div>
                <div className="space-y-1"><Label>Password</Label><Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} /></div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Creating..." : "Create Store"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
