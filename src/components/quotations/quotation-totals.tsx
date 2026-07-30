import { amountInWords, type LineTotals } from "@/lib/calculations";

export function QuotationTotals({ totals }: { totals?: Partial<LineTotals> | null }) {
  const subTotal = totals?.subTotal ?? 0;
  const cgst = totals?.cgst ?? 0;
  const sgst = totals?.sgst ?? 0;
  const roundOff = totals?.roundOff ?? 0;
  const netAmount = totals?.netAmount ?? 0;

  return (
    <div className="border rounded-md p-4 space-y-1 bg-muted/20">
      <div className="flex justify-between text-sm">
        <span>Sub Total</span>
        <span>{subTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>CGST</span>
        <span>{cgst.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>SGST</span>
        <span>{sgst.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Round Off</span>
        <span>
          {roundOff >= 0 ? "+" : ""}
          {roundOff.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
        <span>Net Amount</span>
        <span>₹{netAmount.toFixed(0)}</span>
      </div>
      <div className="text-xs text-muted-foreground pt-1">
        {amountInWords(netAmount)}
      </div>
    </div>
  );
}
