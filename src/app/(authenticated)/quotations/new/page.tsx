"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useQuotation } from "@/hooks/use-quotation";
import { QuotationHeaderForm } from "@/components/quotations/quotation-header-form";
import { QuotationLineItems } from "@/components/quotations/quotation-line-items";
import { QuotationTotals } from "@/components/quotations/quotation-totals";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { StorePicker } from "@/components/ui/store-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, FileDown, Loader2, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { StorePreviewSettings } from "@/components/quotations/quotation-preview";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function NewQuotationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    }>
      <NewQuotationContent />
    </Suspense>
  );
}

function NewQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [finalizing, setFinalizing] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StorePreviewSettings | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isSuperadmin = session?.user?.role === "superadmin";
  const storeIdParam = searchParams.get("storeId");
  const storeIdToUse = storeIdParam ? parseInt(storeIdParam) : undefined;

  const quote = useQuotation(undefined, storeIdToUse);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setStoreSettings(data);
      })
      .catch(() => {});
  }, []);

  if (isSuperadmin && !storeIdParam) {
    return (
      <StorePicker
        onSelect={(storeId) => router.push(`/quotations/new?storeId=${storeId}`)}
      />
    );
  }

  async function finalize() {
    if (!quote.header.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (quote.lineItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    setFinalizing(true);
    await quote.manualSave();
    const r = await fetch(`/api/quotations/${quote.id}/finalize`, {
      method: "POST",
    });
    if (!r.ok) {
      toast.error((await r.json()).error);
      setFinalizing(false);
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quotation_${quote.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Quotation finalized");
    router.push("/quotations");
  }

  if (quote.loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-6 pb-16">
      {/* Left Pane */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-card px-4 py-3 rounded-lg border shadow-sm">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              New Quotation
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {quote.dirty && (
                <span className="text-[12px] text-amber-600 font-medium">
                  Unsaved changes
                </span>
              )}
              {quote.saving && (
                <span className="text-[12px] text-muted-foreground">
                  Saving...
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={quote.manualSave}
              disabled={quote.saving}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Draft
            </Button>
            {/* Mobile Preview & Download */}
            <Button
              size="sm"
              className="lg:hidden"
              onClick={() => setPreviewOpen(true)}
              disabled={finalizing}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Preview &amp; Download
            </Button>
            {/* Desktop Generate PDF */}
            <Button size="sm" className="hidden lg:flex" onClick={finalize} disabled={finalizing}>
              {finalizing ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
              )}
              Generate PDF
            </Button>
          </div>
        </div>

        <QuotationHeaderForm
          header={quote.header}
          onChange={quote.updateHeader}
        />

        <Card className="p-5 shadow-sm overflow-visible">
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <h3 className="text-sm font-semibold">Line Items</h3>
            <span className="text-[12px] text-muted-foreground">
              {quote.lineItems.length} item
              {quote.lineItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          <QuotationLineItems
            lineItems={quote.lineItems}
            onAdd={quote.addLineItem}
            onUpdate={quote.updateLineItem}
            onRemove={quote.removeLineItem}
            onMove={quote.moveLineItem}
            onSyncCatalogItems={quote.syncCatalogItems}
            onSaveDraft={quote.manualSave}
            onClearDraft={() => {}}
          />
          <div className="mt-6 pt-4 border-t">
            <QuotationTotals totals={quote.totals} />
          </div>
        </Card>
      </div>

      {/* Right Pane: Preview — desktop only */}
      <div className="hidden lg:block w-[460px] xl:w-[500px] shrink-0 lg:sticky lg:top-6 self-start space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Live Preview
          </h2>
        </div>
        <div className="shadow-lg rounded-lg overflow-hidden border">
          <QuotationPreview
            header={quote.header}
            lineItems={quote.lineItems}
            totals={quote.totals}
            storeSettings={storeSettings}
            quotNo={quote.quotNo}
          />
        </div>
      </div>
    </div>

      {/* Mobile Preview & Download Sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="p-0 max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="!p-0 px-4 pt-4 pb-3 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">PDF Preview</SheetTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => { setPreviewOpen(false); finalize(); }}
                  disabled={finalizing}
                >
                  {finalizing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
                  Generate PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
              </div>
            </div>
          </SheetHeader>
          <div className="overflow-x-auto">
            <div className="min-w-[595px] p-2">
              <QuotationPreview
                header={quote.header}
                lineItems={quote.lineItems}
                totals={quote.totals}
                storeSettings={storeSettings}
                quotNo={quote.quotNo}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
