"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Eye, Pencil, Copy, Trash2, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface QS {
  id: number;
  quotNo: string;
  quotDate: string;
  customerName: string;
  status: string;
  isLocked?: boolean;
  netAmount: number | null;
}

export default function StaffQuotationsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role?.toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
  const [q, setQ] = useState<QS[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchQ = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    const r = await fetch(`/api/quotations?${p}`);
    if (r.ok) {
      setQ(await r.json());
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchQ();
  }, [fetchQ]);

  async function duplicate(id: number) {
    const r = await fetch(`/api/quotations/${id}/duplicate`, {
      method: "POST",
    });
    if (r.ok) {
      toast.success("Quotation duplicated");
      fetchQ();
    } else {
      toast.error("Failed to duplicate");
    }
  }

  async function del(id: number) {
    const r = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Quotation deleted");
      fetchQ();
    } else {
      toast.error("Failed to delete");
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatAmount(n: number | null) {
    return n != null
      ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
      : "—";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            My Quotations
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {q.length} quotation{q.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/quotations/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden xs:inline">New Quotation</span>
            <span className="xs:hidden">New</span>
          </Button>
        </Link>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 w-full"
        />
      </div>

      {/* ── Mobile card list (hidden on sm+) ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <p className="text-center py-12 text-sm text-muted-foreground">Loading...</p>
        ) : q.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No quotations yet.</p>
            <Link href="/quotations/new" className="text-[13px] text-primary hover:underline mt-1 inline-block">
              Create your first quotation
            </Link>
          </div>
        ) : (
          q.map((qi) => (
            <Card key={qi.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{qi.quotNo}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{formatDate(qi.quotDate)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant={qi.status === "finalized" ? "default" : "secondary"} className="capitalize text-[11px]">
                    {qi.status}
                  </Badge>
                  {qi.isLocked && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px] flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{qi.customerName}</p>
                  <p className="text-[13px] text-muted-foreground tabular-nums">{formatAmount(qi.netAmount)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/quotations/${qi.id}`}>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {(isAdmin || qi.status === "draft") && (
                    <Link href={`/quotations/${qi.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => duplicate(qi.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:text-destructive" onClick={() => setDeleteId(qi.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quote #
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                Date
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Customer
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                Amount
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                Status
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : q.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No quotations yet.</p>
                  <Link href="/quotations/new" className="text-[13px] text-primary hover:underline mt-1 inline-block">
                    Create your first quotation
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              q.map((qi) => (
                <TableRow key={qi.id} className="group">
                  <TableCell className="font-semibold text-sm">
                    <div className="flex flex-col">
                      <span>{qi.quotNo}</span>
                      <span className="sm:hidden text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(qi.quotDate)}
                        {qi.netAmount != null ? ` · ₹${qi.netAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm hidden sm:table-cell">
                    {formatDate(qi.quotDate)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{qi.customerName}</TableCell>
                  <TableCell className="text-sm tabular-nums hidden sm:table-cell">
                    {formatAmount(qi.netAmount)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={qi.status === "finalized" ? "default" : "secondary"} className="capitalize text-[11px]">
                        {qi.status}
                      </Badge>
                      {qi.isLocked && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px] flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Link href={`/quotations/${qi.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {(isAdmin || qi.status === "draft") && (
                        <Link href={`/quotations/${qi.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicate(qi.id)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteId(qi.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
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
