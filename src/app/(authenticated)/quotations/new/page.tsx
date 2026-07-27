"use client"; import { useRouter } from "next/navigation"; import { useQuotation } from "@/hooks/use-quotation";
import { QuotationHeaderForm } from "@/components/quotations/quotation-header-form"; import { QuotationLineItems } from "@/components/quotations/quotation-line-items";
import { QuotationTotals } from "@/components/quotations/quotation-totals"; import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { Button } from "@/components/ui/button"; import { Card } from "@/components/ui/card"; import { Save, FileDown, Loader2 } from "lucide-react"; import { toast } from "sonner"; import { useState } from "react";
export default function NewQuotationPage() {
  const router = useRouter(); const [finalizing, setFinalizing] = useState(false); const quote = useQuotation();
  async function finalize() { if (!quote.header.customerName.trim()) { toast.error("Customer name required"); return; } if (quote.lineItems.length === 0) { toast.error("Add at least one line item"); return; } setFinalizing(true); await quote.manualSave();
    const r = await fetch(`/api/quotations/${quote.id}/finalize`, { method:"POST" }); if (!r.ok) { toast.error((await r.json()).error); setFinalizing(false); return; }
    const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `Quotation_${quote.id}.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); toast.success("Finalized"); router.push("/quotations"); }
  if (quote.loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>;
  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-screen pb-16">
      {/* Left Pane: Form Controls */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div>
            <h1 className="text-xl font-bold tracking-tight">New Quotation</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {quote.dirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
              {quote.saving && <span className="text-xs text-muted-foreground ml-2">Saving...</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={quote.manualSave} disabled={quote.saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button size="sm" onClick={finalize} disabled={finalizing}>
              {finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Generate PDF
            </Button>
          </div>
        </div>

        <QuotationHeaderForm header={quote.header} onChange={quote.updateHeader} />

        <Card className="p-5 shadow-sm overflow-visible">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h3 className="font-semibold text-base">Line Items</h3>
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
          <div className="mt-6 border-t pt-4">
            <QuotationTotals totals={quote.totals} />
          </div>
        </Card>
      </div>

      {/* Right Pane: Live Preview */}
      <div className="w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 lg:sticky lg:top-6 self-start space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Live Preview</h2>
        </div>
        <div className="shadow-lg rounded-xl overflow-hidden border">
          <QuotationPreview header={quote.header} lineItems={quote.lineItems} totals={quote.totals} />
        </div>
      </div>
    </div>
  );
}
