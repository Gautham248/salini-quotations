"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Store, Pencil, CheckCircle2, Ban, Trash2, AlertTriangle, QrCode, Upload } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

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
    loadingNote: string; paymentQrCode?: string | null;
    pan?: string | null; declarationText?: string | null; jurisdiction?: string | null;
  } | null;
}

interface EditForm {
  name: string; slug: string;
  companyName: string; subheading: string; phone: string; mobile: string;
  email: string; gstin: string; bankDetails: string;
  disclaimerText: string; loadingNote: string;
  paymentQrCode: string | null;
  pan: string; declarationText: string; jurisdiction: string;
}

const EMPTY_EDIT: EditForm = {
  name: "", slug: "", companyName: "", subheading: "", phone: "", mobile: "",
  email: "", gstin: "", bankDetails: "", disclaimerText: "", loadingNote: "",
  paymentQrCode: null,
  pan: "", declarationText: "", jurisdiction: "",
};

export default function StoresPage() {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Toggle store confirm state
  const [confirmStore, setConfirmStore] = useState<StoreInfo | null>(null);

  // Delete Store state & options
  const [deleteTarget, setDeleteTarget] = useState<StoreInfo | null>(null);
  const [deleteStaff, setDeleteStaff] = useState(false);
  const [deleteQuotations, setDeleteQuotations] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteStore() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/stores/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteStaff, deleteQuotations }),
      });
      if (r.ok) {
        toast.success(`Store "${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
        fetchStores();
      } else {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error || "Failed to delete store");
      }
    } catch {
      toast.error("Failed to delete store");
    } finally {
      setDeleting(false);
    }
  }

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
  const editQrInputRef = useRef<HTMLInputElement>(null);

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

  async function handleToggleConfirm() {
    if (!confirmStore) return;
    const isDeactivating = confirmStore.isActive;
    const r = await fetch(`/api/stores/${confirmStore.id}`, { method: "PATCH" });
    if (r.ok) {
      toast.success(
        isDeactivating
          ? `Store "${confirmStore.name}" deactivated. Staff access has been suspended.`
          : `Store "${confirmStore.name}" reactivated. All staff, managers, and data have been restored.`
      );
      setConfirmStore(null);
      fetchStores();
    } else {
      toast.error("Failed to update store status");
    }
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
        paymentQrCode: detail.settings?.paymentQrCode ?? null,
        pan: detail.settings?.pan || "",
        declarationText: detail.settings?.declarationText || "",
        jurisdiction: detail.settings?.jurisdiction || "",
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

  function handleEditQrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast.error("QR image must be under 512 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditForm((prev) => ({ ...prev, paymentQrCode: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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

      {/* ── Mobile card list (hidden on sm+) ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <p className="text-center py-12 text-sm text-muted-foreground">Loading...</p>
        ) : stores.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">No stores yet.</p>
        ) : stores.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-[12px] text-muted-foreground">{s.slug}</p>
                </div>
              </div>
              {s.isActive ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[11px] flex items-center gap-1.5 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px] flex items-center gap-1.5 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Inactive
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button variant="ghost" size="sm" className="flex-1 h-9" onClick={() => openEdit(s)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              {s.isActive ? (
                <Button variant="outline" size="sm" onClick={() => setConfirmStore(s)}
                  className="flex-1 h-9 text-[12px] font-medium border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors">
                  <Ban className="h-3.5 w-3.5 mr-1" /> Deactivate
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmStore(s)}
                  className="flex-1 h-9 text-[12px] font-medium border-emerald-600/40 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDeleteTarget(s); setDeleteStaff(false); setDeleteQuotations(false); }}
                className="h-9 px-2.5 text-[12px] font-medium border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                title="Delete Store"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden sm:block overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider hidden sm:table-cell">Slug</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : stores.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No stores yet.</TableCell></TableRow>
            ) : stores.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-sm flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  {s.name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{s.slug}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {s.isActive ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium flex items-center gap-1.5 w-fit"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium flex items-center gap-1.5 w-fit"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {s.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmStore(s)}
                        className="h-8 text-[12px] font-medium border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" /> Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmStore(s)}
                        className="h-8 text-[12px] font-medium border-emerald-600/40 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950/50 shadow-2xs transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setDeleteTarget(s); setDeleteStaff(false); setDeleteQuotations(false); }}
                      className="h-8 px-2.5 text-[12px] font-medium border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                      title="Delete Store"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
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
        <DialogContent className="flex flex-col p-0 gap-0 max-w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[85vh] overflow-hidden">
          <DialogHeader className="px-5 sm:px-6 py-4 border-b shrink-0 bg-background rounded-t-xl pr-12">
            <DialogTitle className="text-base sm:text-lg font-semibold">Create New Store</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-5 sm:p-6 flex-1">
            <form onSubmit={createStore} className="space-y-5">
              {/* Section 1: Store Identity */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Store Identity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Store Name *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Salini Neendoor" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">URL Slug *</Label>
                    <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="salini-neendoor" required />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 2: Company Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Company &amp; Contact Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Company Name</Label>
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. SALINI NEENDOOR" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Address / Subheading</Label>
                    <Input value={subheading} onChange={e => setSubheading(e.target.value)} placeholder="Street address, city, state" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Phone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Mobile</Label>
                    <Input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="store@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">GSTIN</Label>
                    <Input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="GST Number" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 3: Bank & Notices */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bank &amp; Document Notices
                </h3>
                <div className="grid grid-cols-1 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Bank Details (Supports multiple lines)</Label>
                    <Textarea
                      rows={3}
                      value={bankDetails}
                      onChange={e => setBankDetails(e.target.value)}
                      placeholder="Bank name, account no, branch, IFSC"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 4: Initial Admin User */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  First Admin User (Optional)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Username</Label>
                    <Input value={adminUsername} onChange={e => setAdminUsername(e.target.value)} placeholder="admin username" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Password</Label>
                    <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Creating Store..." : "Create Store"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Store Dialog — full settings */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex flex-col p-0 gap-0 max-w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[85vh] overflow-hidden">
          <DialogHeader className="px-5 sm:px-6 py-4 border-b shrink-0 bg-background rounded-t-xl pr-12">
            <DialogTitle className="text-base sm:text-lg font-semibold">Edit Store</DialogTitle>
          </DialogHeader>
          {editFetching ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading store details...</div>
          ) : (
            <div className="overflow-y-auto p-5 sm:p-6 flex-1">
              <form onSubmit={saveEdit} className="space-y-5">
                {/* Section 1: Store Identity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Store Identity
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Store Name *</Label>
                      <Input
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">URL Slug *</Label>
                      <Input
                        value={editForm.slug}
                        onChange={e => setEditForm({ ...editForm, slug: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 2: Company Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Company &amp; Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-medium">Company Name</Label>
                      <Input
                        value={editForm.companyName}
                        onChange={e => setEditForm({ ...editForm, companyName: e.target.value })}
                        placeholder="e.g. SALINI NEENDOOR"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-medium">Address / Subheading</Label>
                      <Input
                        value={editForm.subheading}
                        onChange={e => setEditForm({ ...editForm, subheading: e.target.value })}
                        placeholder="Street address, city, state"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Phone</Label>
                      <Input
                        value={editForm.phone}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Mobile</Label>
                      <Input
                        value={editForm.mobile}
                        onChange={e => setEditForm({ ...editForm, mobile: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Email</Label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">GSTIN</Label>
                      <Input
                        value={editForm.gstin}
                        onChange={e => setEditForm({ ...editForm, gstin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Company PAN</Label>
                      <Input
                        value={editForm.pan}
                        onChange={e => setEditForm({ ...editForm, pan: e.target.value })}
                        placeholder="e.g. ABCDE1234F"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 3: Quotation Notices & Bank Info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Bank &amp; Document Notices
                  </h3>
                  <div className="grid grid-cols-1 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Bank Details (Supports multiple lines)</Label>
                      <Textarea
                        rows={3}
                        value={editForm.bankDetails}
                        onChange={e => setEditForm({ ...editForm, bankDetails: e.target.value })}
                        placeholder="State Bank of India, SME Branch Pala&#10;A/C: 42459778328&#10;IFSC: SBIN0063661"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Declaration Statement</Label>
                      <Input
                        value={editForm.declarationText}
                        onChange={e => setEditForm({ ...editForm, declarationText: e.target.value })}
                        placeholder="We declare that this invoice shows the actual price..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Jurisdiction Clause</Label>
                      <Input
                        value={editForm.jurisdiction}
                        onChange={e => setEditForm({ ...editForm, jurisdiction: e.target.value })}
                        placeholder="e.g. Subject to Pala Jurisdiction"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Disclaimer / Terms</Label>
                      <Input
                        value={editForm.disclaimerText}
                        onChange={e => setEditForm({ ...editForm, disclaimerText: e.target.value })}
                        placeholder="e.g. Certified ISO / terms"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Loading / Freight Note</Label>
                      <Input
                        value={editForm.loadingNote}
                        onChange={e => setEditForm({ ...editForm, loadingNote: e.target.value })}
                        placeholder="e.g. LOADING CHARGE EXTRA"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 4: Payment QR Code */}
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
                  {editForm.paymentQrCode ? (
                    <div className="flex items-start gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editForm.paymentQrCode}
                        alt="Payment QR Code"
                        className="w-20 h-20 object-contain border rounded-md bg-white p-1"
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => editQrInputRef.current?.click()}
                          className="gap-1.5"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Replace QR
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditForm({ ...editForm, paymentQrCode: null })}
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
                      onClick={() => editQrInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload QR Image
                    </Button>
                  )}
                  <input
                    ref={editQrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditQrFile}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmStore)}
        onOpenChange={(open) => {
          if (!open) setConfirmStore(null);
        }}
        title={
          confirmStore
            ? confirmStore.isActive
              ? `Deactivate "${confirmStore.name}"?`
              : `Reactivate "${confirmStore.name}"?`
            : ""
        }
        description={
          confirmStore
            ? confirmStore.isActive
              ? `Deactivating "${confirmStore.name}" will temporarily suspend login access for all associated staff, managers, and admins. All user accounts, roles, settings, and historical quotations will be fully retained and restored upon reactivation.`
              : `Reactivating "${confirmStore.name}" will immediately restore system access for all staff, managers, and users assigned to this store.`
            : ""
        }
        confirmLabel={confirmStore?.isActive ? "Deactivate Store" : "Reactivate Store"}
        destructive={Boolean(confirmStore?.isActive)}
        onConfirm={handleToggleConfirm}
      />

      {/* Store Deletion Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <DialogTitle className="text-lg font-semibold">Delete &quot;{deleteTarget?.name}&quot;?</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deleting this store will remove the store record, custom settings, and sequences. Please select options for associated staff and quotation data:
            </p>

            <div className="space-y-3 bg-muted/40 p-3.5 rounded-lg border text-xs">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="deleteStaffOpt"
                  checked={deleteStaff}
                  onChange={(e) => setDeleteStaff(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="deleteStaffOpt" className="cursor-pointer select-none">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">
                    {deleteStaff ? "Permanently Delete Staff Accounts" : "Deactivate & Unassign Staff (Recommended)"}
                  </span>
                  <span className="text-muted-foreground text-[11px] block mt-0.5">
                    {deleteStaff
                      ? "Associated staff accounts will be permanently deleted from the database."
                      : "Staff will be unassigned and deactivated to strictly block login access while preserving account logs."}
                  </span>
                </label>
              </div>

              <Separator />

              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="deleteQuotationsOpt"
                  checked={deleteQuotations}
                  onChange={(e) => setDeleteQuotations(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="deleteQuotationsOpt" className="cursor-pointer select-none">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">
                    {deleteQuotations ? "Permanently Delete Quotations" : "Archive Quotations as Templates (Recommended)"}
                  </span>
                  <span className="text-muted-foreground text-[11px] block mt-0.5">
                    {deleteQuotations
                      ? "All quotation documents and line items will be permanently erased."
                      : "Quotations will be detached (unassigned) and preserved in archived template state without breaking historical records."}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteStore}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {deleting ? "Deleting Store..." : "Delete Store"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
