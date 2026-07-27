"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, FileText } from "lucide-react";

export interface QH {
  customerName: string;
  customerAddress: string;
  customerPlace: string;
  customerGstin: string;
  quotDate: string;
  refNo: string;
  deliveryTerms: string;
  gstNote: string;
  validity: string;
  paymentTerms: string;
}

export function QuotationHeaderForm({
  header,
  onChange,
  quotNo,
  readOnly = false,
}: {
  header: QH;
  onChange: (f: keyof QH, v: string) => void;
  quotNo?: string;
  readOnly?: boolean;
}) {
  return (
    <Card className="shadow-sm overflow-visible">
      <CardHeader className="pb-3 border-b bg-card rounded-t-xl">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Customer &amp; Quotation Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Customer Information Sub-section */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Customer Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Customer Name *</Label>
              <Input
                placeholder="Enter customer / company name"
                value={header.customerName}
                onChange={e => onChange("customerName", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Customer GSTIN</Label>
              <Input
                placeholder="e.g. 32AAACS12341Z"
                value={header.customerGstin}
                onChange={e => onChange("customerGstin", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Address</Label>
              <Input
                placeholder="Street address or building"
                value={header.customerAddress}
                onChange={e => onChange("customerAddress", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Place / City</Label>
              <Input
                placeholder="e.g. Monipally, Kottayam"
                value={header.customerPlace}
                onChange={e => onChange("customerPlace", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Quotation Details & Terms Sub-section */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Quotation Details &amp; Terms
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Date</Label>
              <Input
                type="date"
                value={header.quotDate}
                onChange={e => onChange("quotDate", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Quot No</Label>
              <Input
                value={quotNo || "Auto-generated"}
                disabled
                className="h-9 text-sm bg-muted/60 text-muted-foreground font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Ref No</Label>
              <Input
                placeholder="Reference #"
                value={header.refNo}
                onChange={e => onChange("refNo", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Delivery Terms</Label>
              <Input
                placeholder="e.g. EXTRA / INCLUDED"
                value={header.deliveryTerms}
                onChange={e => onChange("deliveryTerms", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">GST Note</Label>
              <Input
                placeholder="e.g. 18% EXTRA"
                value={header.gstNote}
                onChange={e => onChange("gstNote", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Validity</Label>
              <Input
                placeholder="e.g. 15 DAYS / LIMITED"
                value={header.validity}
                onChange={e => onChange("validity", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Payment Terms</Label>
              <Input
                placeholder="e.g. READY PAYMENT / 50% ADVANCE"
                value={header.paymentTerms}
                onChange={e => onChange("paymentTerms", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
