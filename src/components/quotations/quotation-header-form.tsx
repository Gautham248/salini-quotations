"use client"; import { Input } from "@/components/ui/input"; import { Label } from "@/components/ui/label"; import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export interface QH { customerName: string; customerAddress: string; customerPlace: string; customerGstin: string; quotDate: string; refNo: string; deliveryTerms: string; gstNote: string; validity: string; paymentTerms: string; }
export function QuotationHeaderForm({ header, onChange, quotNo }: { header: QH; onChange: (f: keyof QH, v: string) => void; quotNo?: string }) {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-base">Customer & Quotation Details</CardTitle></CardHeader><CardContent className="space-y-4">
    <div><Label>Customer Name *</Label><Input value={header.customerName} onChange={e => onChange("customerName", e.target.value)} /></div>
    <div className="grid grid-cols-2 gap-4"><div><Label>Address</Label><Input value={header.customerAddress} onChange={e => onChange("customerAddress", e.target.value)} /></div><div><Label>Place</Label><Input value={header.customerPlace} onChange={e => onChange("customerPlace", e.target.value)} /></div></div>
    <div><Label>Customer GSTIN</Label><Input value={header.customerGstin} onChange={e => onChange("customerGstin", e.target.value)} /></div>
    <div className="grid grid-cols-3 gap-4"><div><Label>Date</Label><Input type="date" value={header.quotDate} onChange={e => onChange("quotDate", e.target.value)} /></div><div><Label>Quot No</Label><Input value={quotNo || ""} disabled className="bg-muted"/></div><div><Label>Ref No</Label><Input value={header.refNo} onChange={e => onChange("refNo", e.target.value)} /></div></div>
    <div className="grid grid-cols-2 gap-4"><div><Label>Delivery</Label><Input value={header.deliveryTerms} onChange={e => onChange("deliveryTerms", e.target.value)} /></div><div><Label>GST Note</Label><Input value={header.gstNote} onChange={e => onChange("gstNote", e.target.value)} /></div></div>
    <div className="grid grid-cols-2 gap-4"><div><Label>Validity</Label><Input value={header.validity} onChange={e => onChange("validity", e.target.value)} /></div><div><Label>Payment</Label><Input value={header.paymentTerms} onChange={e => onChange("paymentTerms", e.target.value)} /></div></div>
  </CardContent></Card>;
}
