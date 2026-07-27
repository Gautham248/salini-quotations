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
  return <div className="flex gap-6 h-[calc(100vh-4rem)]">
    <div className="w-3/5 flex flex-col gap-4 overflow-auto pr-2">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">New Quotation</h1>{quote.dirty && <span className="text-xs text-muted-foreground">Unsaved</span>}{quote.saving && <span className="text-xs text-muted-foreground ml-2">Saving...</span>}</div><div className="flex gap-2"><Button variant="outline" onClick={quote.manualSave} disabled={quote.saving}><Save className="h-4 w-4 mr-2"/>Save Draft</Button><Button onClick={finalize} disabled={finalizing}>{finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <FileDown className="h-4 w-4 mr-2"/>}Generate</Button></div></div>
      <QuotationHeaderForm header={quote.header} onChange={quote.updateHeader}/>
      <Card className="p-4"><h3 className="font-medium mb-3">Line Items</h3><QuotationLineItems lineItems={quote.lineItems} onAdd={quote.addLineItem} onUpdate={quote.updateLineItem} onRemove={quote.removeLineItem} onMove={quote.moveLineItem} onSaveDraft={quote.manualSave} onClearDraft={() => {}}/><div className="mt-4"><QuotationTotals totals={quote.totals}/></div></Card>
    </div>
    <div className="w-2/5 sticky top-0"><h2 className="font-semibold text-sm text-muted-foreground mb-2">Live Preview</h2><QuotationPreview header={quote.header} lineItems={quote.lineItems} totals={quote.totals}/></div>
  </div>;
}
