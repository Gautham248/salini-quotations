import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotationPDFDocument } from "./quotation-template";
import type { QuotationData, CompanySettingsData } from "./quotation-template";

function mapToQuotationData(q: Record<string, unknown>): QuotationData {
  return {
    quotNo: (q.quotNo as string) || "",
    refNo: (q.refNo as string) || "",
    quotDate: (q.quotDate as string) || "",
    customerName: (q.customerName as string) || "",
    customerAddress: (q.customerAddress as string) || null,
    customerPlace: (q.customerPlace as string) || null,
    customerGstin: (q.customerGstin as string) || null,
    deliveryTerms: (q.deliveryTerms as string) || null,
    gstNote: (q.gstNote as string) || null,
    validity: (q.validity as string) || "LIMITED",
    paymentTerms: (q.paymentTerms as string) || "READY PAYMENT",
    lineItems: ((q.lineItems as Array<Record<string, unknown>>) || []).map(
      (item) => ({
        description: (item.description as string) || "",
        gstPercent: (item.gstPercent as number) || 0,
        qty: (item.qty as number) || 0,
        unit: (item.unit as string) || "",
        weightKg: (item.weightKg as number) ?? null,
        rate: (item.rate as number) || 0,
        netValue: (item.netValue as number) || 0,
      })
    ),
    subTotal: (q.subTotal as number) || 0,
    cgst: (q.cgst as number) || 0,
    sgst: (q.sgst as number) || 0,
    roundOff: (q.roundOff as number) || 0,
    netAmount: (q.netAmount as number) || 0,
    amountInWords: (q.amountInWords as string) || "",
  };
}

function mapToCompanySettings(
  s: Record<string, unknown> | null
): CompanySettingsData {
  const cs = (s || {}) as Record<string, string>;
  return {
    companyName: cs.companyName || "SALINI TRADERS",
    subheading:
      cs.subheading ||
      "Pala - Thodupuzha Road, Kanattupura, Pala, Kottayam",
    phone: cs.phone || "+91 9539066366",
    mobile: cs.mobile || "+91 9539088488",
    email: cs.email || "",
    gstin: cs.gstin || "32AESFS0236G1Z3",
    bankDetails:
      cs.bankDetails ||
      "State Bank of India, SME Branch Pala - A/C: 42459778328 - IFSC: SBIN0063661",
    disclaimerText:
      cs.disclaimerText ||
      "Certified that the particulars given above are true and correct.",
    loadingNote:
      cs.loadingNote ||
      "LOADING CHARGE AND TRANSPORTATION CHARGES EXTRA",
  };
}

export async function generatePdf(
  q: Record<string, unknown>,
  s: Record<string, unknown> | null
): Promise<Buffer> {
  const data = mapToQuotationData(q);
  const settings = mapToCompanySettings(s);

  const doc = React.createElement(QuotationPDFDocument, {
    q: data,
    cs: settings,
  }) as React.ReactElement;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await renderToBuffer(doc as any)) as Buffer;
}
