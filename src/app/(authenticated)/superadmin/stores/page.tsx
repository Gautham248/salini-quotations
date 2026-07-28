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
import { Separator } from "@/components/ui/separator";
import { Plus, Store, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StoreInfo {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

interface StoreDetail extends StoreInfo {
  settings?: {
    companyName: string; subheading: string; phone: string; mobile: string;
    email: string; gstin: string; bankDetails: string; disclaimerText: string;
    loadingNote: string;
  } | null;
}

interface EditForm {
  name: string; slug: string;
  companyName: string; subheading: string; phone: string; mobile: string;
  email: string; gstin: string; bankDetails: string;
  disclaimerText: string; loadingNote: string;
}

const EMPTY_EDIT: EditForm = {
  name: "", slug: "", companyName: "", subheading: "", phone: "", mobile: "",
  email: "", gstin: "", bankDetails: "", disclaimerText: "", loadingNote: "",
};

export default function StoresPage() {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Create form state
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

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);
  const [editFetching, setEditFetching] = useState(false);

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

  async function openEdit(store: StoreInfo) {
    setEditId(store.id);
    setEditForm(EMPTY_EDIT);
    setEditFetching(true);
    setEditOpen(true);

    try {
      const r = await fetch(`/api/stores/${store.id}`);
      if (!r.ok) throw new Error("Failed to load store details");
      const detail: StoreDetail = await r.json();
      setEditForm({
        name: detail.name,
        slug: detail.slug,
        companyName: detail.settings?.companyName || "",
        subheading: detail.settings?.subheading || "",
        phone: detail.settings?.phone || "",
        mobile: detail.settings?.mobile || "",
        email: detail.settings?.email || "",
        gstin: detail.settings?.gstin || "",
        bankDetails: detail.settings?.bankDetails || "",
        disclaimerText: detail.settings?.disclaimerText || "",
        loadingNote: detail.settings?.loadingNote || "",
      });
    } catch {
      toast.error("Failed to load store details");
      setEditOpen(false);
    }
    setEditFetching(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editForm.name.trim() || !editForm.slug.trim()) return;
    setSaving(true);

    // Update store name/slug
    await fetch(`/api/stores/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name.trim(), slug: editForm.slug.trim() }),
    });

    // Update company settings — use ?storeId= to target the correct store
    const settingsR = await fetch(`/api/settings?storeId=${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    if (settingsR.ok) {
      toast.success("Store updated");
      setEditOpen(false);
      fetchStores();
    } else {
      toast.error("Failed to update settings");
    }
    setSaving(false);
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
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggle(s)}>
                      {s.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create Store Dialog */}
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

      {/* Edit Store Dialog — full settings */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Store</DialogTitle></DialogHeader>
          {editFetching ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading store details...</div>
          ) : (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Store Name *</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
                <div className="space-y-1"><Label>Slug *</Label><Input value={editForm.slug} onChange={e => setEditForm({ ...editForm, slug: e.target.value })} required /></div>
              </div>

              <Separator />
              <p className="text-sm font-semibold">Company Settings</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Company Name</Label><Input value={editForm.companyName} onChange={e => setEditForm({ ...editForm, companyName: e.target.value })} /></div>
                <div className="space-y-1"><Label>Address</Label><Input value={editForm.subheading} onChange={e => setEditForm({ ...editForm, subheading: e.target.value })} /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label>Mobile</Label><Input value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} /></div>
                <div className="space-y-1"><Label>Email</Label><Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div className="space-y-1"><Label>GSTIN</Label><Input value={editForm.gstin} onChange={e => setEditForm({ ...editForm, gstin: e.target.value })} /></div>
                <div className="space-y-1 col-span-2"><Label>Bank Details</Label><Input value={editForm.bankDetails} onChange={e => setEditForm({ ...editForm, bankDetails: e.target.value })} /></div>
                <div className="space-y-1"><Label>Disclaimer</Label><Input value={editForm.disclaimerText} onChange={e => setEditForm({ ...editForm, disclaimerText: e.target.value })} /></div>
                <div className="space-y-1"><Label>Loading Note</Label><Input value={editForm.loadingNote} onChange={e => setEditForm({ ...editForm, loadingNote: e.target.value })} /></div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
