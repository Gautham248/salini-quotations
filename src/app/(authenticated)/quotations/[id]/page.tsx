"use client";
import { useState, useEffect } from "react";
import { use } from "react";
import { useSession } from "next-auth/react";
import { QuotationLineItems } from "@/components/quotations/quotation-line-items";
import { QuotationTotals } from "@/components/quotations/quotation-totals";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDown, Pencil, Copy, ArrowLeft, Loader2, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { computeTotals } from "@/lib/calculations";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScaledPreview } from "@/components/quotations/scaled-preview";
import { cn } from "@/lib/utils";

export default function ViewQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role?.toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
  const [q, setQ] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/quotations/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setQ(d);
        setLoading(false);
      });
  }, [id]);

  async function duplicate() {
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

  async function downloadPdf() {
    window.open(`/api/quotations/${id}/finalize`, "_blank");
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  if (!q)
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Quotation not found.
      </div>
    );

  const lineItems = (
    (q.lineItems as Array<Record<string, unknown>>) || []
  ).map((item: Record<string, unknown>) => ({
    key: crypto.randomUUID(),
    id: item.id as number,
    lineNo: item.lineNo as number,
    masterItemId: (item.masterItemId as number) || null,
    description: item.description as string,
    unit: item.unit as string,
    rate: item.rate as number,
    gstPercent: item.gstPercent as number,
    qty: item.qty as number,
    netValue: item.netValue as number,
    quoteMode: (item.quoteMode as string) || "quantity",
    weightKg: (item.weightKg as number) || null,
    weightPerUnit: null,
    pieceCount: (item.pieceCount as number) || null,
    piecesPerUnit: null,
    isLocked: Boolean(item.isLocked),
  }));

  const totals =
    q.status === "finalized"
      ? {
          subTotal: q.subTotal as number,
          cgst: q.cgst as number,
          sgst: q.sgst as number,
          roundOff: q.roundOff as number,
          netAmount: q.netAmount as number,
          totalGst: (q.cgst as number) + (q.sgst as number),
        }
      : computeTotals(lineItems);

  const header = {
    customerName: q.customerName as string,
    customerAddress: (q.customerAddress as string) || "",
    customerPlace: (q.customerPlace as string) || "",
    customerGstin: (q.customerGstin as string) || "",
    quotDate: new Date(q.quotDate as string).toISOString().slice(0, 10),
    refNo: q.refNo as string,
    deliveryTerms: (q.deliveryTerms as string) || "",
    gstNote: (q.gstNote as string) || "",
    validity: q.validity as string,
    paymentTerms: q.paymentTerms as string,
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 sm:px-4 sm:py-3 rounded-lg border shadow-sm">
            <div className="flex items-center gap-3">
              <Link href="/quotations">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight">
                    {q.quotNo as string}
                  </h1>
                  <Badge
                    variant={
                      q.status === "finalized" ? "default" : "secondary"
                    }
                    className="capitalize text-[11px]"
                  >
                    {q.status as string}
                  </Badge>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {new Date(q.quotDate as string).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              {(isAdmin || q.status === "draft") && (
                <Link href={`/quotations/${id}/edit`} className="w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto h-9 text-xs sm:text-sm">
                    <Pencil className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                    Edit
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={duplicate}
                className={cn(
                  "h-9 text-xs sm:text-sm w-full sm:w-auto",
                  !(isAdmin || q.status === "draft") && "col-span-1"
                )}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <span>Duplicate</span>
              </Button>
              {/* Mobile: Preview & Download — opens sheet then downloads */}
              <Button
                size="sm"
                className={cn(
                  "h-9 text-xs sm:text-sm lg:hidden w-full sm:w-auto",
                  (isAdmin || q.status === "draft") ? "col-span-2 sm:col-span-1" : "col-span-1"
                )}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <span>Preview &amp; Download</span>
              </Button>
              {/* Desktop: direct download */}
              <Button
                size="sm"
                className="hidden lg:flex h-9"
                onClick={downloadPdf}
              >
                <FileDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Customer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-[12px] text-muted-foreground mb-0.5">Name</dt>
                  <dd className="font-medium">{header.customerName}</dd>
                </div>
                {header.customerAddress && (
                  <div>
                    <dt className="text-[12px] text-muted-foreground mb-0.5">Address</dt>
                    <dd>{header.customerAddress}</dd>
                  </div>
                )}
                {header.customerPlace && (
                  <div>
                    <dt className="text-[12px] text-muted-foreground mb-0.5">Place</dt>
                    <dd>{header.customerPlace}</dd>
                  </div>
                )}
                {header.customerGstin && (
                  <div>
                    <dt className="text-[12px] text-muted-foreground mb-0.5">GSTIN</dt>
                    <dd className="font-mono text-[13px]">{header.customerGstin}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Line Items</h3>
              <span className="text-[12px] text-muted-foreground">
                {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            <QuotationLineItems
              lineItems={lineItems}
              onAdd={() => {}}
              onUpdate={() => {}}
              onRemove={() => {}}
              onMove={() => {}}
              readOnly
            />
            <div className="mt-5 pt-4 border-t">
              <QuotationTotals totals={totals} />
            </div>
          </Card>
        </div>

        {/* Right: PDF Preview — desktop only */}
        <div className="hidden lg:block w-[460px] xl:w-[500px] shrink-0 sticky top-6 self-start">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            PDF Preview
          </h2>
          <div className="shadow-lg rounded-lg overflow-hidden border">
            <QuotationPreview
              header={header}
              lineItems={lineItems}
              totals={totals}
              quotNo={q.quotNo as string}
            />
          </div>
        </div>
      </div>

      {/* Mobile Preview & Download Sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="p-0 max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="!p-0 px-6 pt-5 pb-4 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-base font-semibold shrink-0">
                PDF Preview
              </SheetTitle>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={downloadPdf} className="h-9 px-3.5 text-xs font-medium">
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)} className="h-9 px-3.5 text-xs font-medium">
                  Close
                </Button>
              </div>
            </div>
          </SheetHeader>
          <div className="p-4 pb-12">
            <ScaledPreview
              header={header}
              lineItems={lineItems}
              totals={totals}
              quotNo={q.quotNo as string}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
