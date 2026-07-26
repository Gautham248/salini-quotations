import { amountInWords, type LineTotals } from "@/lib/calculations";
export function QuotationTotals({ totals }: { totals: LineTotals }) {
  return <div className="border rounded-md p-4 space-y-1 bg-muted/20">
    <div className="flex justify-between text-sm"><span>Sub Total</span><span>{totals.subTotal.toFixed(2)}</span></div>
    <div className="flex justify-between text-sm"><span>CGST</span><span>{totals.cgst.toFixed(2)}</span></div>
    <div className="flex justify-between text-sm"><span>SGST</span><span>{totals.sgst.toFixed(2)}</span></div>
    <div className="flex justify-between text-sm"><span>Round Off</span><span>{totals.roundOff >= 0 ? "+" : ""}{totals.roundOff.toFixed(2)}</span></div>
    <div className="flex justify-between font-bold text-base border-t pt-1 mt-1"><span>Net Amount</span><span>₹{totals.netAmount.toFixed(0)}</span></div>
    <div className="text-xs text-muted-foreground pt-1">{amountInWords(totals.netAmount)}</div>
  </div>;
}
