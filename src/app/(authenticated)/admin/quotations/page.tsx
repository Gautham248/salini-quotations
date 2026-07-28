"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Eye, Copy, Pencil, Trash2, Plus, Lock, Search } from "lucide-react";
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
  createdBy: { username: string };
}

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<QS[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const router = useRouter();

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    const r = await fetch(`/api/quotations?${p}`);
    if (r.ok) {
      setQuotations(await r.json());
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  async function duplicate(id: number) {
    const r = await fetch(`/api/quotations/${id}/duplicate`, {
      method: "POST",
    });
    if (r.ok) {
      const d = await r.json();
      toast.success("Quotation duplicated");
      router.push(`/quotations/${d.id}/edit`);
    } else {
      toast.error("Failed to duplicate");
    }
  }

  async function del(id: number) {
    const r = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Quotation deleted");
      fetchQuotations();
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            All Quotations
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {quotations.length} quotation
            {quotations.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/quotations/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Quotation
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by customer or quote number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quote #
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Date
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Customer
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Amount
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Created By
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  Loading quotations...
                </TableCell>
              </TableRow>
            ) : quotations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12"
                >
                  <p className="text-sm text-muted-foreground">
                    No quotations found.
                  </p>
                  <Link
                    href="/quotations/new"
                    className="text-[13px] text-primary hover:underline mt-1 inline-block"
                  >
                    Create your first quotation
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((q) => (
                <TableRow key={q.id} className="group">
                  <TableCell className="font-semibold text-sm">
                    {q.quotNo}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(q.quotDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {q.customerName}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {q.netAmount != null
                      ? `\u20B9${q.netAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {q.createdBy?.username || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={
                          q.status === "finalized" ? "default" : "secondary"
                        }
                        className="capitalize text-[11px]"
                      >
                        {q.status}
                      </Badge>
                      {q.isLocked && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px] flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Link href={`/quotations/${q.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/quotations/${q.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => duplicate(q.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => setDeleteId(q.id)}
                      >
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
