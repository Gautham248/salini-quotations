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
import { Eye, Copy, Pencil, Trash2, Plus, Lock } from "lucide-react";
import { toast } from "sonner";

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
    const r = await fetch(`/api/quotations/${id}/duplicate`, { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      toast.success("Quotation duplicated successfully");
      router.push(`/quotations/${d.id}/edit`);
    } else {
      toast.error("Failed to duplicate quotation");
    }
  }

  async function del(id: number) {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    const r = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Quotation deleted");
      fetchQuotations();
    } else {
      toast.error("Failed to delete quotation");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">All Quotations</h1>
        <Link href="/quotations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Input
          placeholder="Search by customer name or quote no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quot No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading quotations...
                </TableCell>
              </TableRow>
            ) : quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No quotations found.
                </TableCell>
              </TableRow>
            ) : (
              quotations.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-semibold">{q.quotNo}</TableCell>
                  <TableCell>{new Date(q.quotDate).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{q.customerName}</TableCell>
                  <TableCell>
                    {q.netAmount != null ? `₹${q.netAmount.toFixed(0)}` : "-"}
                  </TableCell>
                  <TableCell>{q.createdBy?.username || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={q.status === "finalized" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {q.status}
                      </Badge>
                      {q.isLocked && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 border-amber-500/30 flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/quotations/${q.id}`}>
                        <Button variant="ghost" size="icon" title="View Quotation">
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </Link>
                      <Link href={`/quotations/${q.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit Quotation">
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicate(q.id)}
                        title="Duplicate Quotation"
                      >
                        <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => del(q.id)}
                        title="Delete Quotation"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
