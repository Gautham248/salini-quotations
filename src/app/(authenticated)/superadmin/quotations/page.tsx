"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, Copy, Pencil, Trash2, Plus, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface QS {
  id: number; quotNo: string; quotDate: string; customerName: string;
  status: string; isLocked?: boolean; netAmount: number | null;
  store?: { name: string };
  createdBy: { username: string };
  updatedBy?: { username: string } | null;
}

interface StoreInfo { id: number; name: string; }

function QuotationsContent() {
  const searchParams = useSearchParams();
  const urlStoreId = searchParams.get("storeId");
  const urlStatus = searchParams.get("status");
  const urlPeriod = searchParams.get("period");

  const [quotations, setQuotations] = useState<QS[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStoreId, setFilterStoreId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (urlStoreId) setFilterStoreId(urlStoreId);
    else setFilterStoreId("all");

    if (urlStatus) setFilterStatus(urlStatus);
    else setFilterStatus("all");

    if (urlPeriod) setFilterPeriod(urlPeriod);
    else setFilterPeriod("all");
  }, [urlStoreId, urlStatus, urlPeriod]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (filterStoreId !== "all") p.set("storeId", filterStoreId);
    if (filterStatus !== "all") p.set("status", filterStatus);
    if (filterPeriod !== "all") p.set("period", filterPeriod);

    const r = await fetch(`/api/quotations?${p}`);
    if (r.ok) setQuotations(await r.json());
    setLoading(false);
  }, [search, filterStoreId, filterStatus, filterPeriod]);

  const fetchStores = async () => {
    const r = await fetch("/api/stores");
    if (r.ok) setStores(await r.json());
  };

  useEffect(() => { fetchQuotations(); fetchStores(); }, [fetchQuotations]);

  async function duplicate(id: number) {
    const r = await fetch(`/api/quotations/${id}/duplicate`, { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      toast.success("Quotation duplicated");
      router.push(`/quotations/${d.id}/edit`);
    } else { toast.error("Failed to duplicate"); }
  }

  async function del(id: number) {
    const r = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Quotation deleted"); fetchQuotations(); }
    else { toast.error("Failed to delete"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">All Quotations</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{quotations.length} quotation{quotations.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/quotations/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden xs:inline">New Quotation</span>
            <span className="xs:hidden">New</span>
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by customer or quote number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select
          value={filterStoreId}
          onValueChange={v => setFilterStoreId(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-auto min-w-[150px]">
            <span className="text-muted-foreground font-medium mr-1">Store:</span>
            <SelectValue>
              {filterStoreId === "all"
                ? "All Stores"
                : stores.find(s => String(s.id) === filterStoreId)?.name || "All Stores"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={v => setFilterStatus(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-auto min-w-[150px]">
            <span className="text-muted-foreground font-medium mr-1">Status:</span>
            <SelectValue>
              {filterStatus === "all"
                ? "All Statuses"
                : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterPeriod}
          onValueChange={v => setFilterPeriod(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-auto min-w-[150px]">
            <span className="text-muted-foreground font-medium mr-1">Period:</span>
            <SelectValue>
              {filterPeriod === "all"
                ? "All Time"
                : filterPeriod === "24h"
                ? "Last 24 Hours"
                : filterPeriod === "7d"
                ? "Last 7 Days"
                : filterPeriod === "30d"
                ? "Last 30 Days"
                : "All Time"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Mobile card list (hidden on sm+) ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <p className="text-center py-12 text-sm text-muted-foreground">Loading quotations...</p>
        ) : quotations.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">No quotations found.</p>
        ) : (
          quotations.map(q => (
            <Card key={q.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{q.quotNo}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {new Date(q.quotDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {q.store?.name ? ` · ${q.store.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                  <Badge variant={q.status === "finalized" ? "default" : "secondary"} className="capitalize text-[11px]">{q.status}</Badge>
                  {q.isLocked && <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px] flex items-center gap-1"><Lock className="h-3 w-3" /></Badge>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{q.customerName}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {q.netAmount != null ? `₹${q.netAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                    {q.createdBy?.username ? ` · ${q.createdBy.username}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/quotations/${q.id}`}><Button variant="ghost" size="icon" className="h-9 w-9"><Eye className="h-4 w-4" /></Button></Link>
                  <Link href={`/quotations/${q.id}/edit`}><Button variant="ghost" size="icon" className="h-9 w-9"><Pencil className="h-4 w-4" /></Button></Link>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => duplicate(q.id)}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:text-destructive" onClick={() => setDeleteId(q.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ── Desktop table (hidden below sm) ── */}
      <Card className="hidden sm:block overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Quote #</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider hidden md:table-cell">Date</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider">Customer</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider hidden md:table-cell">Store</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider hidden md:table-cell">Amount</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider hidden md:table-cell">Created By</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider hidden md:table-cell">Last Edited</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider hidden md:table-cell">Status</TableHead>
              <TableHead className="text-[12px] font-semibold uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Loading quotations...</TableCell></TableRow>
            ) : quotations.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12"><p className="text-sm text-muted-foreground">No quotations found.</p></TableCell></TableRow>
            ) : quotations.map(q => (
              <TableRow key={q.id} className="group">
                <TableCell className="font-semibold text-sm">
                  <div className="flex flex-col">
                    <span>{q.quotNo}</span>
                    <span className="md:hidden text-[11px] text-muted-foreground mt-0.5">
                      {q.store?.name || "—"} · {q.status === "finalized" ? "Finalized" : "Draft"}
                      {q.netAmount != null ? ` · ₹${q.netAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : ""}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm hidden md:table-cell">{new Date(q.quotDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                <TableCell className="text-sm font-medium">{q.customerName}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{q.store?.name || "—"}</TableCell>
                <TableCell className="text-sm tabular-nums hidden md:table-cell">{q.netAmount != null ? `₹${q.netAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{q.createdBy?.username || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{q.updatedBy?.username || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={q.status === "finalized" ? "default" : "secondary"} className="capitalize text-[11px]">{q.status}</Badge>
                    {q.isLocked && <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px] flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Link href={`/quotations/${q.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button></Link>
                    <Link href={`/quotations/${q.id}/edit`}><Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicate(q.id)}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteId(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Quotation"
        description="This quotation will be permanently deleted. This action cannot be undone."
        onConfirm={() => { if (deleteId !== null) del(deleteId); }}
      />
    </div>
  );
}

export default function SuperAdminQuotationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Loading quotations...</div>}>
      <QuotationsContent />
    </Suspense>
  );
}
