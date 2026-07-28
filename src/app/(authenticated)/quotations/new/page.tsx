"use client";
import { useRouter } from "next/navigation";
import { useQuotation } from "@/hooks/use-quotation";
import { QuotationHeaderForm } from "@/components/quotations/quotation-header-form";
import { QuotationLineItems } from "@/components/quotations/quotation-line-items";
import { QuotationTotals } from "@/components/quotations/quotation-totals";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, FileDown, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { StorePreviewSettings } from "@/components/quotations/quotation-preview";

export default function NewQuotationPage() {
  const router = useRouter();
  const [finalizing, setFinalizing] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StorePreviewSettings | null>(null);
  const quote = useQuotation();

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setStoreSettings(data);
      })
      .catch(() => {});
  }, []);

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
            <Button size="sm" onClick={finalize} disabled={finalizing}>
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

      {/* Right Pane: Preview */}
      <div className="w-full lg:w-[460px] xl:w-[500px] shrink-0 lg:sticky lg:top-6 self-start space-y-2">
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
  );
}
