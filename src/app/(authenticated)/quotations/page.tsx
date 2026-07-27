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
import { Plus, Eye, Pencil, Copy, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";

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
  const isAdmin = session?.user?.role === "admin";
  const [q, setQ] = useState<QS[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
    const r = await fetch(`/api/quotations/${id}/duplicate`, { method: "POST" });
    if (r.ok) {
      toast.success("Quotation duplicated");
      fetchQ();
    } else {
      toast.error("Failed to duplicate quotation");
    }
  }

  async function del(id: number) {
    if (!confirm("Delete quotation?")) return;
    const r = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Quotation deleted");
      fetchQ();
    } else {
      toast.error("Failed to delete quotation");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Quotations</h1>
        <Link href="/quotations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </div>
      <div className="relative max-w-sm">
        <Input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quot No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : q.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No quotations yet.
                </TableCell>
              </TableRow>
            ) : (
              q.map(qi => (
                <TableRow key={qi.id}>
                  <TableCell className="font-medium">{qi.quotNo}</TableCell>
                  <TableCell>{new Date(qi.quotDate).toLocaleDateString()}</TableCell>
                  <TableCell>{qi.customerName}</TableCell>
                  <TableCell>
                    {qi.netAmount != null ? `₹${qi.netAmount.toFixed(0)}` : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={qi.status === "finalized" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {qi.status}
                      </Badge>
                      {qi.isLocked && (
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
                    <div className="flex justify-end gap-1">
                      <Link href={`/quotations/${qi.id}`}>
                        <Button variant="ghost" size="icon" title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {(isAdmin || qi.status === "draft") && (
                        <Link href={`/quotations/${qi.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicate(qi.id)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => del(qi.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
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
